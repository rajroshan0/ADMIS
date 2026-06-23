import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// rates shape: { youtube?: { video?: n, shorts?: n }, instagram?: { post?: n, story?: n, reel?: n }, ... }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { rates: Record<string, Record<string, number>> }
    const { rates } = body

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ error: 'rates object is required' }, { status: 400 })
    }

    // Derive legacy price_per_post as the highest single rate for backward compat
    let maxRate = 0
    for (const platform of Object.values(rates)) {
      for (const val of Object.values(platform)) {
        if (typeof val === 'number' && val > maxRate) maxRate = val
      }
    }

    const { error } = await supabase
      .from('creators')
      .update({ rates, price_per_post: maxRate || null })
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true, rates, price_per_post: maxRate || null })
  } catch (err: unknown) {
    console.error('[set-rate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update rates' },
      { status: 500 }
    )
  }
}
