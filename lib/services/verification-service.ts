/**
 * Verification service — generate codes, create/read verification requests.
 * Server-side only.
 */
import { createClient } from '@/lib/supabase/server'

/** Generate a random uppercase verification code, e.g. ADMISDB-K7X2P9 */
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `ADMISDB-${code}`
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface VerificationRequest {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  platform: string | null
  verification_type: string
  verification_code: string | null
  channel_url: string | null
  screenshot_url: string | null
  id_proof_url: string | null
  status: VerificationStatus
  admin_notes: string | null
  resubmit_count: number
  created_at: string
  updated_at: string
}

/** Create or reopen a verification request. */
export async function createVerificationRequest(params: {
  userId: string
  entityType: 'creator' | 'brand' | 'agency'
  entityId: string
  platform?: string
  verificationType: 'api' | 'screenshot' | 'id_proof' | 'manual'
  verificationCode?: string
  channelUrl?: string
  screenshotUrl?: string
  idProofUrl?: string
}): Promise<VerificationRequest> {
  const supabase = await createClient()

  // Check for existing rejected/pending request — allow resubmit
  const { data: existing } = await supabase
    .from('verification_requests')
    .select('id, resubmit_count')
    .eq('user_id', params.userId)
    .eq('entity_id', params.entityId)
    .eq('platform', params.platform ?? null)
    .in('status', ['pending', 'rejected'])
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('verification_requests')
      .update({
        status:            'pending',
        screenshot_url:    params.screenshotUrl ?? null,
        id_proof_url:      params.idProofUrl ?? null,
        channel_url:       params.channelUrl ?? null,
        verification_code: params.verificationCode ?? null,
        admin_notes:       null,
        resubmit_count:    existing.resubmit_count + 1,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data as VerificationRequest
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .insert({
      user_id:           params.userId,
      entity_type:       params.entityType,
      entity_id:         params.entityId,
      platform:          params.platform ?? null,
      verification_type: params.verificationType,
      verification_code: params.verificationCode ?? null,
      channel_url:       params.channelUrl ?? null,
      screenshot_url:    params.screenshotUrl ?? null,
      id_proof_url:      params.idProofUrl ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as VerificationRequest
}

/** Mark a verification request approved and update the entity's status. */
export async function approveVerification(
  requestId: string,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient()

  const { data: req, error: fetchErr } = await supabase
    .from('verification_requests')
    .select('entity_type, entity_id, platform, verification_code')
    .eq('id', requestId)
    .single()

  if (fetchErr || !req) throw fetchErr ?? new Error('Request not found')

  // Update request status
  await supabase
    .from('verification_requests')
    .update({
      status:      'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes ?? null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', requestId)

  // Update the entity's verification_status
  if (req.entity_type === 'creator') {
    // Also mark the specific social handle verified if platform is known
    if (req.platform) {
      await supabase
        .from('creator_social_handles')
        .update({ verification_status: 'verified', verified_at: new Date().toISOString() })
        .eq('creator_id', req.entity_id)
        .eq('platform', req.platform)
    }
    // Mark creator verified overall if at least one handle is verified
    await supabase
      .from('creators')
      .update({ verification_status: 'verified' })
      .eq('id', req.entity_id)

    // Update profile
    const { data: creator } = await supabase
      .from('creators')
      .select('user_id')
      .eq('id', req.entity_id)
      .single()
    if (creator?.user_id) {
      await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', creator.user_id)
    }
  } else if (req.entity_type === 'brand') {
    await supabase
      .from('brands')
      .update({ verification_status: 'verified' })
      .eq('id', req.entity_id)

    const { data: brand } = await supabase
      .from('brands')
      .select('owner_id')
      .eq('id', req.entity_id)
      .single()
    if (brand?.owner_id) {
      await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', brand.owner_id)
    }
  } else if (req.entity_type === 'agency') {
    await supabase
      .from('agencies')
      .update({ verification_status: 'verified' })
      .eq('id', req.entity_id)

    const { data: agency } = await supabase
      .from('agencies')
      .select('owner_id')
      .eq('id', req.entity_id)
      .single()
    if (agency?.owner_id) {
      await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', agency.owner_id)
    }
  }
}

/** Reject a verification request with notes. */
export async function rejectVerification(
  requestId: string,
  reviewerId: string,
  notes: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('verification_requests')
    .update({
      status:      'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', requestId)
}
