/**
 * YouTube Data API v3 — channel verification helpers.
 * All calls are server-side only (uses YOUTUBE_API_KEY from env).
 */

const YT_API = 'https://www.googleapis.com/youtube/v3'

export interface YTChannel {
  id: string
  title: string
  description: string
  customUrl: string | null
  thumbnailUrl: string | null
  subscriberCount: number | null
}

/** Resolve a channel URL / handle / username to a YouTube channel ID. */
export async function resolveChannelId(input: string): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set in environment.')

  // Extract handle or ID from common URL formats:
  // https://www.youtube.com/@handle
  // https://www.youtube.com/channel/UCxxxx
  // https://www.youtube.com/user/username
  // plain @handle or channel ID
  const clean = input.trim()

  const channelIdMatch = clean.match(/youtube\.com\/channel\/(UC[\w-]{22})/)
  if (channelIdMatch) return channelIdMatch[1]

  const handleMatch = clean.match(/youtube\.com\/@([\w.-]+)/) || clean.match(/^@([\w.-]+)$/)
  const handle = handleMatch ? `@${handleMatch[1]}` : null

  const userMatch = clean.match(/youtube\.com\/user\/([\w.-]+)/)
  const username = userMatch ? userMatch[1] : null

  // Try forHandle (new-style @handle)
  if (handle) {
    const res = await fetch(
      `${YT_API}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`
    )
    const data = await res.json()
    if (data.items?.[0]?.id) return data.items[0].id
  }

  // Try forUsername (legacy)
  if (username) {
    const res = await fetch(
      `${YT_API}/channels?part=id&forUsername=${encodeURIComponent(username)}&key=${key}`
    )
    const data = await res.json()
    if (data.items?.[0]?.id) return data.items[0].id
  }

  // Fall back to search
  const query = handle ?? username ?? clean
  const res = await fetch(
    `${YT_API}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${key}`
  )
  const data = await res.json()
  return data.items?.[0]?.snippet?.channelId ?? null
}

/** Fetch full channel details by channel ID. */
export async function fetchChannel(channelId: string): Promise<YTChannel | null> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) throw new Error('YOUTUBE_API_KEY is not set in environment.')

  const res = await fetch(
    `${YT_API}/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${key}`
  )
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null

  return {
    id:              item.id,
    title:           item.snippet.title,
    description:     item.snippet.description ?? '',
    customUrl:       item.snippet.customUrl ?? null,
    thumbnailUrl:    item.snippet.thumbnails?.default?.url ?? null,
    subscriberCount: item.statistics?.subscriberCount
      ? parseInt(item.statistics.subscriberCount)
      : null,
  }
}

/**
 * Check whether the channel's description contains the verification code.
 * Returns true if found.
 */
export async function checkVerificationCode(
  channelId: string,
  code: string
): Promise<{ found: boolean; channel: YTChannel | null }> {
  const channel = await fetchChannel(channelId)
  if (!channel) return { found: false, channel: null }

  const found = channel.description.includes(code)
  return { found, channel }
}
