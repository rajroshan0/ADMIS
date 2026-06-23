import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const sp       = req.nextUrl.searchParams
  const page     = parseInt(sp.get('page')     ?? '0')
  const pageSize = parseInt(sp.get('pageSize') ?? '25')
  const sort     = sp.get('sort')     ?? 'followers'
  const search   = sp.get('search')   ?? ''
  const minF     = parseInt(sp.get('minF')  ?? '0')
  const maxF     = parseInt(sp.get('maxF')  ?? '0')
  const minE     = parseFloat(sp.get('minE') ?? '0')
  const platforms = sp.get('platforms')?.split(',').filter(Boolean) ?? []
  const categories = sp.get('categories')?.split('||').filter(Boolean) ?? []
  const countries  = sp.get('countries')?.split(',').filter(Boolean) ?? []

  let q = supabase
    .from('creators')
    .select(
      'id,username,full_name,picture_url,platform,is_verified,account_category,followers,subscribers,engagement_rate,avg_likes,views,reels_plays,geo_country,geo_city,profile_url,description,price_per_post',
      { count: 'exact' }
    )

  if (platforms.length > 0)  q = q.in('platform', platforms)
  if (minF > 0 && maxF > 0)  q = q.or(`and(followers.gte.${minF},followers.lte.${maxF}),and(subscribers.gte.${minF},subscribers.lte.${maxF})`)
  else if (minF > 0)          q = q.or(`followers.gte.${minF},subscribers.gte.${minF}`)
  else if (maxF > 0)          q = q.or(`followers.lte.${maxF},subscribers.lte.${maxF}`)
  if (minE > 0)               q = q.gte('engagement_rate', minE / 100)
  if (categories.length > 0)  q = q.or(categories.map(c => `account_category.ilike.%${c}%`).join(','))
  if (countries.length > 0) {
    const mapped = countries.map(c => c === 'UAE' ? 'United Arab Emirates' : c)
    q = q.in('geo_country', mapped)
  }
  if (search.trim()) q = q.or(`username.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`)

  const sortCol = sort === 'followers' ? 'followers' : sort
  const { data, count, error } = await q
    .order(sortCol, { ascending: false, nullsFirst: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)

  if (error) {
    console.error('[/api/creators] error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message, detail: error }, { status: 500 })
  }

  console.log(`[/api/creators] returned ${data?.length ?? 0} rows, total=${count}`)
  return NextResponse.json({ creators: data ?? [], total: count ?? 0 })
}
