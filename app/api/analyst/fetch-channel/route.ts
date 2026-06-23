import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const YT_KEY = process.env.YOUTUBE_API_KEY!

// ─── YouTube API helpers ──────────────────────────────────────────────────────

async function ytGet(path: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  url.searchParams.set('key', YT_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Resolve a channel URL / handle / ID to a YouTube channel ID */
async function resolveChannelId(input: string): Promise<string | null> {
  // Already a channel ID (UCxxxxxxxxxxxxxxxxxxxxxxxxx)
  if (/^UC[\w-]{22}$/.test(input)) return input

  // Extract channel ID directly from URL
  const cidMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/)
  if (cidMatch) return cidMatch[1]

  // Extract handle from URL  (youtube.com/@handle  or  youtube.com/c/handle)
  const handleMatch = input.match(/youtube\.com\/(?:@|c\/|user\/)?([\w.-]+)/)
  const raw = handleMatch ? handleMatch[1] : input.replace(/^@/, '')
  const handle = raw.startsWith('@') ? raw : `@${raw}`

  // Use channels?forHandle — no OAuth / search quota needed
  try {
    const data = await ytGet('channels', { part: 'id', forHandle: handle })
    if (data.items?.[0]?.id) return data.items[0].id
  } catch { /* fall through */ }

  // Fallback: legacy forUsername
  try {
    const data = await ytGet('channels', { part: 'id', forUsername: raw })
    if (data.items?.[0]?.id) return data.items[0].id
  } catch { /* fall through */ }

  return null
}

/** Fetch channel statistics */
async function fetchChannelStats(channelId: string) {
  const data = await ytGet('channels', {
    part: 'statistics,snippet,brandingSettings',
    id: channelId,
  })
  return data.items?.[0] ?? null
}

/** Fetch recent videos for a channel — uses uploads playlist, no search quota */
async function fetchRecentVideos(channelId: string, maxResults = 20) {
  // Get the uploads playlist ID from the channel's contentDetails
  const chanData = await ytGet('channels', { part: 'contentDetails', id: channelId })
  const uploadsPlaylistId: string | undefined =
    chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsPlaylistId) return []

  // List the playlist items (no search quota needed)
  const playlist = await ytGet('playlistItems', {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  })
  const items = playlist.items ?? []
  if (items.length === 0) return []

  const ids = items.map((i: any) => i.snippet.resourceId.videoId as string).join(',')
  const details = await ytGet('videos', {
    part: 'statistics,snippet,contentDetails',
    id: ids,
  })

  return (details.items ?? []).map((v: any) => {
    const dur = v.contentDetails?.duration ?? ''
    // ISO 8601 duration → seconds  (PT1M30S → 90)
    const seconds = parseIso8601Duration(dur)
    return {
      id:           v.id,
      title:        v.snippet?.title,
      publishedAt:  v.snippet?.publishedAt,
      views:        parseInt(v.statistics?.viewCount  ?? '0'),
      likes:        parseInt(v.statistics?.likeCount  ?? '0'),
      comments:     parseInt(v.statistics?.commentCount ?? '0'),
      durationSecs: seconds,
      isShort:      seconds > 0 && seconds <= 60,
    }
  })
}

function parseIso8601Duration(s: string): number {
  const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0')
}

// ─── Scoring logic ────────────────────────────────────────────────────────────

interface ChannelMetrics {
  subscribers:        number
  avgViewsL10:        number
  avgLikes:           number
  avgComments:        number
  avgViews90d:        number
  dayssinceUpload:    number
  videos90d:          number
  shortsPct:          number
  estMonthlyViews:    number
  engagementPct:      number
  viewSubPct:         number
  uploadsPerMonth:    number
  creatorPriceUsd:    number
}

function computeScore(m: ChannelMetrics): {
  score: number; tier: string; suspicious: boolean; reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  // 1. View/Subscriber ratio (max 25 pts)
  // Good channels: 5–30% view/sub ratio
  const vsr = m.viewSubPct
  if (vsr >= 20)      score += 25
  else if (vsr >= 10) score += 20
  else if (vsr >= 5)  score += 13
  else if (vsr >= 2)  score += 6
  else                score += 2

  // 2. Engagement rate (max 25 pts)
  const eng = m.engagementPct
  if (eng >= 8)       score += 25
  else if (eng >= 4)  score += 20
  else if (eng >= 2)  score += 13
  else if (eng >= 1)  score += 6
  else                score += 2

  // 3. Upload recency (max 15 pts)
  const days = m.dayssinceUpload
  if (days <= 7)       score += 15
  else if (days <= 14) score += 12
  else if (days <= 30) score += 8
  else if (days <= 60) score += 4
  else                 score += 0

  // 4. Upload frequency (max 15 pts)
  const upm = m.uploadsPerMonth
  if (upm >= 12)      score += 15
  else if (upm >= 8)  score += 12
  else if (upm >= 4)  score += 9
  else if (upm >= 2)  score += 5
  else                score += 1

  // 5. Subscriber scale (max 10 pts)
  const subs = m.subscribers
  if (subs >= 1_000_000)     score += 10
  else if (subs >= 500_000)  score += 8
  else if (subs >= 100_000)  score += 6
  else if (subs >= 50_000)   score += 4
  else if (subs >= 10_000)   score += 2
  else                       score += 0

  // 6. Content mix — penalise Shorts-heavy channels (max 10 pts)
  const sp = m.shortsPct
  if (sp <= 20)       score += 10
  else if (sp <= 40)  score += 7
  else if (sp <= 60)  score += 4
  else                score += 0

  // ─── Suspicious signals ────────────────────────────────────────
  let suspicious = false

  // View/sub ratio too high → possible view-buy
  if (vsr > 80) {
    suspicious = true
    reasons.push(`View/Sub ratio extremely high (${vsr.toFixed(1)}%) — possible purchased views`)
  }
  // Engagement suspiciously high
  if (eng > 25) {
    suspicious = true
    reasons.push(`Engagement rate unusually high (${eng.toFixed(1)}%) — possible fake engagement`)
  }
  // Inactive channel
  if (days > 90) {
    suspicious = true
    reasons.push(`No upload in ${days} days — channel may be inactive`)
  }
  // Very low upload frequency for the subscriber count
  if (subs > 100_000 && upm < 1) {
    reasons.push(`Low upload frequency (${upm.toFixed(1)}/mo) for a large channel`)
  }
  // Creator price >> CPM-based value
  const cpm3 = m.estMonthlyViews / 1000 * 3
  if (m.creatorPriceUsd > 0 && m.creatorPriceUsd > cpm3 * 3) {
    reasons.push(`Creator price ($${m.creatorPriceUsd}) is 3× above CPM=$3 value ($${cpm3.toFixed(0)})`)
  }

  // ─── Tier ─────────────────────────────────────────────────────
  const tier = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'

  return { score: Math.min(100, Math.round(score)), tier, suspicious, reasons }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      deal_id: string
      channel_url: string
      creator_price?: number
    }
    const { deal_id, channel_url, creator_price = 0 } = body
    if (!deal_id || !channel_url) {
      return NextResponse.json({ error: 'deal_id and channel_url are required' }, { status: 400 })
    }

    // Verify brand owns this deal
    const { data: brand } = await supabase.from('brands').select('id').eq('owner_id', user.id).maybeSingle()
    if (!brand) return NextResponse.json({ error: 'No brand found' }, { status: 403 })

    const { data: deal } = await supabase.from('deals').select('id, creator_id, campaign_id').eq('id', deal_id).eq('brand_id', brand.id).maybeSingle()
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // ── 1. Resolve channel ID ──────────────────────────────────────
    const channelId = await resolveChannelId(channel_url)
    if (!channelId) return NextResponse.json({ error: 'Could not resolve YouTube channel' }, { status: 400 })

    // ── 2. Fetch channel stats ─────────────────────────────────────
    const channelData = await fetchChannelStats(channelId)
    if (!channelData) return NextResponse.json({ error: 'Channel not found on YouTube' }, { status: 404 })

    const stats    = channelData.statistics ?? {}
    const snippet  = channelData.snippet ?? {}
    const subscribers = parseInt(stats.subscriberCount ?? '0')
    const country     = snippet.country ?? null

    // ── 3. Fetch recent videos ─────────────────────────────────────
    const videos = await fetchRecentVideos(channelId, 20)

    const now   = Date.now()
    const ms90d = 90 * 24 * 3600 * 1000
    type VidItem = { id: string; title: string; publishedAt: string; views: number; likes: number; comments: number; durationSecs: number; isShort: boolean }
    const typedVideos = videos as VidItem[]
    const videos90d = typedVideos.filter((v: VidItem) => {
      const pub = new Date(v.publishedAt).getTime()
      return (now - pub) <= ms90d
    })
    const last10 = typedVideos.slice(0, 10)

    // Last upload
    const lastUploadAt = typedVideos[0]?.publishedAt ? new Date(typedVideos[0].publishedAt) : null
    const daysSince    = lastUploadAt ? Math.floor((now - lastUploadAt.getTime()) / 86400000) : 999

    // Avg metrics — last 10
    const avgViewsL10 = last10.length ? last10.reduce((s: number, v: VidItem) => s + v.views, 0) / last10.length : 0
    const avgLikes    = last10.length ? last10.reduce((s: number, v: VidItem) => s + v.likes, 0) / last10.length : 0
    const avgComments = last10.length ? last10.reduce((s: number, v: VidItem) => s + v.comments, 0) / last10.length : 0

    // Avg views — 90d
    const avgViews90d = videos90d.length ? videos90d.reduce((s: number, v: VidItem) => s + v.views, 0) / videos90d.length : avgViewsL10

    // Shorts %
    const totalVideos = typedVideos.length
    const shortCount  = typedVideos.filter((v: VidItem) => v.isShort).length
    const shortsPct   = totalVideos > 0 ? (shortCount / totalVideos) * 100 : 0

    // Uploads/mo (based on 90d window)
    const uploadsPerMonth = videos90d.length / 3  // 90 days ≈ 3 months

    // Est monthly views
    const estMonthlyViews = avgViews90d * uploadsPerMonth

    // Derived ratios
    const engagementPct = avgViewsL10 > 0 ? ((avgLikes + avgComments) / avgViewsL10) * 100 : 0
    const viewSubPct    = subscribers > 0 ? (avgViewsL10 / subscribers) * 100 : 0

    // Est value (baseline)
    const cpm2Value = estMonthlyViews / 1000 * 2
    const cpm3Value = estMonthlyViews / 1000 * 3
    const estValueUsd = (cpm2Value + cpm3Value) / 2

    // Counter price
    const counterPrice = creator_price > 0 && creator_price > cpm3Value
      ? Math.round((cpm2Value + cpm3Value) / 2)
      : creator_price

    // ── 4. Scoring ─────────────────────────────────────────────────
    const metrics: ChannelMetrics = {
      subscribers, avgViewsL10, avgLikes, avgComments, avgViews90d,
      dayssinceUpload: daysSince, videos90d: videos90d.length,
      shortsPct, estMonthlyViews, engagementPct, viewSubPct,
      uploadsPerMonth, creatorPriceUsd: creator_price,
    }
    const { score, tier, suspicious, reasons } = computeScore(metrics)

    // ── 5. Upsert channel_analysis ─────────────────────────────────
    const row = {
      deal_id,
      brand_id:          brand.id,
      creator_id:        deal.creator_id,
      channel_name:      snippet.title ?? channel_url,
      channel_url,
      channel_id:        channelId,
      platform:          'youtube',
      country,
      subscribers,
      avg_views_l10:     Math.round(avgViewsL10),
      avg_likes:         Math.round(avgLikes),
      avg_comments:      Math.round(avgComments),
      avg_views_90d:     Math.round(avgViews90d),
      last_upload_at:    lastUploadAt?.toISOString() ?? null,
      days_since_upload: daysSince,
      videos_90d:        videos90d.length,
      shorts_pct:        Math.round(shortsPct * 10) / 10,
      est_monthly_views: Math.round(estMonthlyViews),
      est_value_usd:     Math.round(estValueUsd),
      engagement_pct:    Math.round(engagementPct * 100) / 100,
      view_sub_pct:      Math.round(viewSubPct * 100) / 100,
      uploads_per_month: Math.round(uploadsPerMonth * 10) / 10,
      lead_score:        score,
      lead_tier:         tier,
      is_suspicious:     suspicious,
      suspicious_reasons: reasons,
      creator_price_usd: creator_price,
      cpm2_value:        Math.round(cpm2Value),
      cpm3_value:        Math.round(cpm3Value),
      counter_price_usd: Math.round(counterPrice),
      final_decision:    'pending',
      raw_api_data:      { channelData, videoSample: typedVideos.slice(0, 5) },
      fetched_at:        new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }

    // Delete any existing analysis for this deal then insert fresh
    await supabase.from('channel_analysis').delete().eq('deal_id', deal_id)
    const { data: analysis, error: insErr } = await supabase.from('channel_analysis').insert(row).select('*').single()
    if (insErr) throw insErr

    return NextResponse.json({ success: true, analysis })
  } catch (err: unknown) {
    console.error('[analyst/fetch-channel]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

/** GET — return existing analysis for a deal */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dealId = req.nextUrl.searchParams.get('deal_id')
  if (!dealId) return NextResponse.json({ error: 'deal_id required' }, { status: 400 })

  const { data } = await supabase.from('channel_analysis').select('*').eq('deal_id', dealId).maybeSingle()
  return NextResponse.json({ analysis: data ?? null })
}
