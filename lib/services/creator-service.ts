/**
 * Creator service — find/create creator records, handle channel claims,
 * manage social handles.
 * Server-side only.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateVerificationCode } from './verification-service'

export interface CreatorRecord {
  id: string
  user_id: string | null
  username: string | null
  full_name: string | null
  platform: string
  verification_status: string
  verification_code: string | null
  claimed_at: string | null
}

/**
 * Look up a creator by channel URL or username on a given platform.
 * Returns null if not in DB.
 */
export async function findCreatorByChannel(
  platform: string,
  channelUrl: string
): Promise<CreatorRecord | null> {
  const supabase = await createClient()

  // Try matching by username (extract from URL)
  const username = extractUsername(channelUrl)

  const { data } = await supabase
    .from('creators')
    .select('id, user_id, username, full_name, platform, verification_status, verification_code, claimed_at')
    .eq('platform', platform)
    .or(username ? `username.ilike.${username}` : 'username.is.null')
    .maybeSingle()

  return data ?? null
}

/** Extract @username from a channel URL */
function extractUsername(input: string): string | null {
  const clean = input.trim().replace(/\/$/, '')
  const patterns = [
    /youtube\.com\/@([\w.-]+)/,
    /youtube\.com\/user\/([\w.-]+)/,
    /instagram\.com\/([\w.-]+)/,
    /tiktok\.com\/@([\w.-]+)/,
    /@([\w.-]+)$/,
  ]
  for (const p of patterns) {
    const m = clean.match(p)
    if (m) return m[1]
  }
  return clean.replace(/^@/, '') || null
}

/**
 * Claim an existing creator record for a user.
 * Uses a SECURITY DEFINER RPC to bypass RLS on rows where user_id IS NULL.
 */
export async function claimCreator(
  creatorId: string,
  userId: string
): Promise<{ verificationCode: string }> {
  const supabase = await createClient()

  const code = generateVerificationCode()

  const { data, error } = await supabase.rpc('claim_creator_profile', {
    p_creator_id: creatorId,
    p_user_id:    userId,
    p_code:       code,
  })

  if (error) throw new Error(`Failed to claim creator: ${error.message}`)

  return { verificationCode: data ?? code }
}

export interface SocialHandleInput {
  platform:   string
  channelUrl: string
  followers?: number
}

/**
 * Register a brand-new creator from onboarding.
 * Uses a SECURITY DEFINER RPC to atomically:
 * - Create the creators row
 * - Insert all creator_social_handles rows
 * - Mark profile.onboarding_completed = true
 * This bypasses RLS entirely so no permissions issues block the flow.
 */
export async function registerNewCreator(params: {
  userId:   string
  fullName: string
  handles:  SocialHandleInput[]   // first element = primary
}): Promise<{ creatorId: string; verificationCodes: Record<string, string> }> {
  if (!params.handles.length) throw new Error('At least one social handle is required.')

  // Use admin client to bypass RLS — server-side registration must not depend on session state
  const supabase  = createAdminClient()
  const primary   = params.handles[0]
  const primUser  = extractUsername(primary.channelUrl)
  const primCode  = generateVerificationCode()

  const verificationCodes: Record<string, string> = {}

  // Build handles array with pre-generated codes
  const handlesPayload = params.handles.map((h, i) => {
    const code = i === 0 ? primCode : generateVerificationCode()
    verificationCodes[h.platform] = code
    return {
      platform:   h.platform,
      username:   extractUsername(h.channelUrl),
      channel_url: h.channelUrl,
      followers:  h.followers ?? null,
      is_primary: i === 0,
      code,
    }
  })

  const { data: creatorId, error } = await supabase.rpc('register_creator_profile', {
    p_user_id:   params.userId,
    p_full_name: params.fullName,
    p_platform:  primary.platform,
    p_username:  primUser ?? '',
    p_url:       primary.channelUrl,
    p_code:      primCode,
    p_handles:   handlesPayload,
  })

  if (error) throw new Error(`Creator registration failed: ${error.message}`)
  if (!creatorId) throw new Error('Creator registration returned no ID')

  return { creatorId, verificationCodes }
}

/** Add an additional social handle to an existing creator. */
export async function addSocialHandle(params: {
  creatorId: string
  platform: string
  channelUrl: string
  followers?: number
}): Promise<{ handleId: string; verificationCode: string }> {
  const supabase = await createClient()

  const code     = generateVerificationCode()
  const username = extractUsername(params.channelUrl)

  const { data, error } = await supabase
    .from('creator_social_handles')
    .insert({
      creator_id:          params.creatorId,
      platform:            params.platform,
      username:            username,
      channel_url:         params.channelUrl,
      followers:           params.followers ?? null,
      verification_code:   code,
      verification_status: 'unverified',
      is_primary:          false,
    })
    .select('id')
    .single()

  if (error) throw error

  return { handleId: data.id, verificationCode: code }
}
