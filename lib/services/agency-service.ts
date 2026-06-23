/**
 * Agency service — create agencies, manage handled channels/brands.
 * Server-side only.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface SocialHandle { platform: string; username: string; url?: string }

/** Register a new agency during onboarding. */
export async function registerAgency(params: {
  userId: string
  name: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  socialHandles: SocialHandle[]
  initialChannels?: string[]  // channel URLs/handles they manage
}): Promise<{ agencyId: string }> {
  // Use admin client to bypass RLS — server-side registration must not depend on session state
  const supabase = createAdminClient()

  const { data: agency, error } = await supabase
    .from('agencies')
    .insert({
      name:                params.name,
      owner_id:            params.userId,
      contact_name:        params.contactName,
      contact_email:       params.contactEmail,
      contact_phone:       params.contactPhone ?? null,
      social_handles:      params.socialHandles,
      verification_status: 'unverified',
      commission_pct:      10,
    })
    .select('id')
    .single()

  if (error) throw error

  // Add owner as agency_member
  await supabase.from('agency_members').insert({
    agency_id:  agency.id,
    user_id:    params.userId,
    role:       'owner',
    invited_by: params.userId,
  })

  // Update profile — column is display_name (not full_name)
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      display_name:         params.contactName,
      role:                 'agency',
      entity_type:          'agency',
      onboarding_completed: true,
    })
    .eq('id', params.userId)

  if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`)

  return { agencyId: agency.id }
}

/**
 * Link a creator channel to an agency (agency claims management).
 * Creator remains owner — they can remove agency from their dashboard.
 */
export async function linkCreatorToAgency(
  agencyId: string,
  creatorId: string,
  commissionPct = 10
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('agency_managed_channels').upsert({
    agency_id:      agencyId,
    creator_id:     creatorId,
    commission_pct: commissionPct,
    status:         'active',
    removed_at:     null,
  }, { onConflict: 'agency_id,creator_id' })
}

/** Creator removes an agency from managing their channel. */
export async function removeAgencyFromCreator(
  agencyId: string,
  creatorId: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('agency_managed_channels')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('agency_id', agencyId)
    .eq('creator_id', creatorId)
}

/** Link a brand to an agency. */
export async function linkBrandToAgency(agencyId: string, brandId: string): Promise<void> {
  const supabase = await createClient()

  await supabase.from('agency_managed_brands').upsert({
    agency_id:  agencyId,
    brand_id:   brandId,
    status:     'active',
    removed_at: null,
  }, { onConflict: 'agency_id,brand_id' })
}

/** Invite a team member to an agency. */
export async function inviteAgencyMember(params: {
  agencyId: string
  invitedBy: string
  email: string
  role: 'admin' | 'member'
}): Promise<{ token: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      entity_type: 'agency',
      entity_id:   params.agencyId,
      email:       params.email,
      role:        params.role,
      invited_by:  params.invitedBy,
    })
    .select('token')
    .single()

  if (error) throw error
  return { token: data.token }
}
