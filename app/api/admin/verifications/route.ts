/**
 * GET  /api/admin/verifications  — list all pending (or filtered) verification requests
 * PATCH /api/admin/verifications  — approve or reject a request
 * Admin/owner only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveVerification, rejectVerification } from '@/lib/services/verification-service'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'owner'].includes(profile.role)) return null
  return user
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status      = searchParams.get('status') ?? 'pending'
  const entityType  = searchParams.get('entity_type')
  const page        = parseInt(searchParams.get('page') ?? '1')
  const pageSize    = 20
  const offset      = (page - 1) * pageSize

  let q = supabase
    .from('verification_requests')
    .select(`
      id, user_id, entity_type, entity_id, platform, verification_type,
      verification_code, channel_url, screenshot_url, id_proof_url,
      status, admin_notes, resubmit_count, created_at, updated_at,
      reviewed_by, reviewed_at
    `, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (entityType) q = q.eq('entity_type', entityType)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with user email
  const enriched = await Promise.all(
    (data ?? []).map(async (r) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', r.user_id)
        .single()

      // Get entity name
      let entityName = ''
      if (r.entity_type === 'creator') {
        const { data: c } = await supabase.from('creators').select('full_name, username').eq('id', r.entity_id).single()
        entityName = c?.full_name ?? c?.username ?? ''
      } else if (r.entity_type === 'brand') {
        const { data: b } = await supabase.from('brands').select('name').eq('id', r.entity_id).single()
        entityName = b?.name ?? ''
      } else if (r.entity_type === 'agency') {
        const { data: a } = await supabase.from('agencies').select('name').eq('id', r.entity_id).single()
        entityName = a?.name ?? ''
      }

      return { ...r, userName: profile?.full_name ?? '', entityName }
    })
  )

  return NextResponse.json({ data: enriched, total: count ?? 0, page, pageSize })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { requestId, action, notes } = body

  if (!requestId) return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })

  try {
    if (action === 'approve') {
      await approveVerification(requestId, admin.id, notes)
    } else {
      if (!notes?.trim()) return NextResponse.json({ error: 'Notes required when rejecting' }, { status: 400 })
      await rejectVerification(requestId, admin.id, notes)
    }

    return NextResponse.json({ success: true, action })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 500 }
    )
  }
}
