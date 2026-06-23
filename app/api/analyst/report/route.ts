import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** POST — save / update analyst report for a deal */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: brand } = await supabase.from('brands').select('id').eq('owner_id', user.id).maybeSingle()
  if (!brand) return NextResponse.json({ error: 'No brand' }, { status: 403 })

  const body = await req.json()
  const {
    deal_id, channel_analysis_id, creator_id,
    channel_name, channel_url, platform, geo,
    deliveries, creator_price, creator_contact,
    score, approved, counter_price, notes,
  } = body

  if (!deal_id) return NextResponse.json({ error: 'deal_id required' }, { status: 400 })

  // Upsert: delete existing then insert
  await supabase.from('analyst_reports').delete().eq('deal_id', deal_id)

  const { data: report, error } = await supabase.from('analyst_reports').insert({
    deal_id,
    channel_analysis_id: channel_analysis_id ?? null,
    brand_id:            brand.id,
    creator_id:          creator_id ?? null,
    analyst_id:          user.id,
    channel_name,
    channel_url,
    platform,
    geo,
    deliveries:          deliveries ?? [],
    creator_price:       creator_price ?? null,
    creator_contact:     creator_contact ?? null,
    score:               score ?? null,
    approved:            approved ?? null,
    counter_price:       counter_price ?? null,
    notes:               notes ?? null,
    updated_at:          new Date().toISOString(),
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also update channel_analysis.final_decision
  if (channel_analysis_id) {
    await supabase.from('channel_analysis')
      .update({ final_decision: approved ? 'approve' : 'reject', updated_at: new Date().toISOString() })
      .eq('id', channel_analysis_id)
  }

  return NextResponse.json({ success: true, report })
}

/** GET — fetch analyst report for a deal */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dealId = req.nextUrl.searchParams.get('deal_id')
  if (!dealId) return NextResponse.json({ error: 'deal_id required' }, { status: 400 })

  const { data } = await supabase.from('analyst_reports').select('*').eq('deal_id', dealId).maybeSingle()
  return NextResponse.json({ report: data ?? null })
}
