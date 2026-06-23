/**
 * POST /api/agency/add-creator
 * Agency invites a creator to their roster by searching for them.
 * Creates a pending agency_managed_channels record.
 * Creator appears in roster as "pending" until they accept (future feature).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify the caller is an agency
    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!agency) return NextResponse.json({ error: 'No agency profile found for your account' }, { status: 403 })

    const body = await req.json()
    const { query, commissionPct = 10 } = body as { query: string; commissionPct?: number }

    if (!query?.trim()) return NextResponse.json({ error: 'Enter a username or creator name to search' }, { status: 400 })

    // Search creators by username or full_name (case-insensitive)
    const { data: creators, error: searchErr } = await supabase
      .from('creators')
      .select('id, full_name, username, platform, verification_status, user_id')
      .or(`username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
      .limit(5)

    if (searchErr) throw searchErr
    if (!creators || creators.length === 0) {
      return NextResponse.json({ error: 'No creator found with that username or name' }, { status: 404 })
    }

    // For exact single match: proceed to add; if multiple, return list for client to pick
    if (creators.length > 1) {
      return NextResponse.json({ results: creators, requiresSelection: true })
    }

    const creator = creators[0]

    // Check if already managed
    const { data: existing } = await supabase
      .from('agency_managed_channels')
      .select('id, status')
      .eq('agency_id', agency.id)
      .eq('creator_id', creator.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') return NextResponse.json({ error: 'This creator is already in your roster' }, { status: 409 })
      if (existing.status === 'pending') return NextResponse.json({ error: 'An invite is already pending for this creator' }, { status: 409 })
      // If removed, re-activate
      await supabase
        .from('agency_managed_channels')
        .update({ status: 'pending', removed_at: null })
        .eq('id', existing.id)
    } else {
      await supabase.from('agency_managed_channels').insert({
        agency_id:      agency.id,
        creator_id:     creator.id,
        commission_pct: commissionPct,
        status:         'pending',
      })
    }

    return NextResponse.json({
      success: true,
      creator: { id: creator.id, full_name: creator.full_name, username: creator.username },
      message: `Invite sent to ${creator.full_name ?? creator.username ?? 'creator'}. They'll appear in your roster once they accept.`,
    })
  } catch (err: unknown) {
    console.error('[agency/add-creator]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 }
    )
  }
}

/** GET /api/agency/add-creator?q=query — search without adding */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = new URL(req.url).searchParams.get('q')?.trim()
    if (!q) return NextResponse.json({ results: [] })

    const { data } = await supabase
      .from('creators')
      .select('id, full_name, username, platform, verification_status')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(8)

    return NextResponse.json({ results: data ?? [] })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
