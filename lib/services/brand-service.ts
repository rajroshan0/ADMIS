/**
 * Brand service — create/manage brand records and team members.
 * Server-side only.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface BrandRecord {
  id: string
  name: string | null
  owner_id: string | null
  website: string | null
  phone: string | null
  company_size: string | null
  budget_range: string | null
  verification_status: string
}

/** Create a brand during onboarding. */
export async function registerBrand(params: {
  userId: string
  companyName: string
  contactName: string
  email: string
  phone?: string
  website?: string
  companySize: string
  budgetRange: string
}): Promise<{ brandId: string }> {
  // Use admin client to bypass RLS — this is called server-side (auth/callback or API route)
  // and the session cookies may not yet be readable by a fresh createClient() instance.
  const supabase = createAdminClient()

  // Generate a unique slug: name-base + random 4-char hex to avoid collisions
  const base = params.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(16).slice(2, 6)
  const slug = `${base}-${suffix}`

  const { data: brand, error } = await supabase
    .from('brands')
    .insert({
      name:                params.companyName,
      slug:                slug,
      owner_id:            params.userId,
      website:             params.website ?? null,
      phone:               params.phone ?? null,
      company_size:        params.companySize,
      budget_range:        params.budgetRange,
      verification_status: 'unverified',
    })
    .select('id')
    .single()

  if (error) throw error

  // Add owner as brand_member with role 'owner'
  await supabase.from('brand_members').insert({
    brand_id:   brand.id,
    user_id:    params.userId,
    role:       'owner',
    invited_by: params.userId,
  })

  // Update profile — profiles table has display_name (not full_name)
  const { data: updatedProfile, error: profileErr } = await supabase
    .from('profiles')
    .update({
      display_name:         params.contactName,
      role:                 'brand',
      entity_type:          'brand',
      onboarding_completed: true,
    })
    .eq('id', params.userId)
    .select('id')

  if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`)
  if (!updatedProfile || updatedProfile.length === 0) {
    // Profile row doesn't exist yet — insert it
    const { error: insertErr } = await supabase
      .from('profiles')
      .insert({
        id:                   params.userId,
        email:                params.email,
        display_name:         params.contactName,
        role:                 'brand',
        entity_type:          'brand',
        onboarding_completed: true,
      })
    if (insertErr) throw new Error(`Profile insert failed: ${insertErr.message}`)
  }

  return { brandId: brand.id }
}

/** Invite a team member to a brand by email. */
export async function inviteBrandMember(params: {
  brandId: string
  invitedBy: string
  email: string
  role: 'admin' | 'member'
}): Promise<{ token: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      entity_type: 'brand',
      entity_id:   params.brandId,
      email:       params.email,
      role:        params.role,
      invited_by:  params.invitedBy,
    })
    .select('token')
    .single()

  if (error) throw error
  return { token: data.token }
}

/** Accept a team invite (called after the invited user signs up / logs in). */
export async function acceptBrandInvite(token: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { data: invite, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('token', token)
    .eq('entity_type', 'brand')
    .is('accepted_at', null)
    .single()

  if (error || !invite) throw new Error('Invite not found or already used.')
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) throw new Error('Invite has expired.')

  await supabase.from('brand_members').upsert({
    brand_id:   invite.entity_id,
    user_id:    userId,
    role:       invite.role,
    invited_by: invite.invited_by,
  })

  await supabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  await supabase
    .from('profiles')
    .update({ role: 'brand', entity_type: 'brand', onboarding_completed: true })
    .eq('id', userId)
}
