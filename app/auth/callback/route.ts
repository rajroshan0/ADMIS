import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerNewCreator } from '@/lib/services/creator-service'
import { registerBrand }      from '@/lib/services/brand-service'
import { registerAgency }     from '@/lib/services/agency-service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type')

  const supabase = await createClient()
  let sessionOk  = false

  // ── OAuth / PKCE code exchange ──────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) sessionOk = true
  }

  // ── Email confirmation / magic-link (token_hash flow) ───────
  if (!sessionOk && tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email' | 'recovery' | 'invite' | 'email_change',
    })
    if (!error) sessionOk = true
  }

  // ── No code/token — check if session already exists ───────────
  // This happens when email confirmation is disabled: signUp() creates
  // a live session immediately, and the client redirects here directly.
  if (!sessionOk) {
    const { data: { user: existingUser } } = await supabase.auth.getUser()
    if (existingUser) sessionOk = true
  }

  if (!sessionOk) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  // ── Get session ───────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/`)

  // ── Check if onboarding already done ─────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .single()

  // If already onboarded, go straight to dashboard
  if (profile?.onboarding_completed) {
    return redirectByRole(origin, profile.role)
  }

  // ── Process onboarding from user_metadata (signup flow) ──────
  const meta = user.user_metadata as Record<string, unknown> | null
  const accountType = meta?.account_type as string | undefined

  if (accountType === 'creator') {
    try {
      // Support both old single-handle metadata and new multi-handle format
      const metaHandles = meta?.handles as Array<{ platform: string; channelUrl: string }> | undefined
      const handles = metaHandles?.length
        ? metaHandles
        : [{ platform: (meta?.platform as string ?? '').toLowerCase(), channelUrl: meta?.channel_url as string ?? '' }]

      // Filter out handles with empty platform or URL
      const validHandles = handles.filter(h => h.platform && h.channelUrl?.trim())
      if (!validHandles.length) throw new Error('No valid handles in metadata')

      await registerNewCreator({
        userId:   user.id,
        fullName: meta?.full_name as string ?? '',
        handles:  validHandles,
      })
      return NextResponse.redirect(`${origin}/dashboard/creator`)
    } catch (err) {
      console.error('[callback] creator onboarding failed:', err)
      return NextResponse.redirect(`${origin}/?error=setup_failed`)
    }
  }

  if (accountType === 'brand') {
    try {
      await registerBrand({
        userId:       user.id,
        companyName:  meta?.company_name as string ?? '',
        contactName:  meta?.full_name as string ?? '',
        email:        user.email ?? '',
        phone:        meta?.phone as string | undefined,
        companySize:  meta?.company_size as string ?? '',
        budgetRange:  meta?.budget_range as string ?? '',
      })
      return NextResponse.redirect(`${origin}/dashboard/brand`)
    } catch (err) {
      console.error('[callback] brand onboarding failed:', err)
      return NextResponse.redirect(`${origin}/?error=setup_failed`)
    }
  }

  if (accountType === 'agency') {
    try {
      const handles = meta?.social_handles as Array<{ platform: string; username: string }> | undefined
      // Normalize platform to lowercase
      const normalizedHandles = (handles ?? []).map(h => ({ ...h, platform: h.platform?.toLowerCase() ?? '' }))
      await registerAgency({
        userId:        user.id,
        name:          meta?.agency_name as string ?? '',
        contactName:   meta?.full_name as string ?? '',
        contactEmail:  user.email ?? '',
        contactPhone:  meta?.contact_phone as string | undefined,
        socialHandles: normalizedHandles,
      })
      return NextResponse.redirect(`${origin}/dashboard/agency`)
    } catch (err) {
      console.error('[callback] agency onboarding failed:', err)
      return NextResponse.redirect(`${origin}/?error=setup_failed`)
    }
  }

  // ── Google OAuth or unknown — go to onboarding page ──────────
  // (user signed in with Google and we have no metadata yet)
  if (profile?.role && profile.role !== 'creator' && profile.role !== 'brand' && profile.role !== 'agency') {
    return redirectByRole(origin, profile.role) // admin / owner
  }

  // Fall back: send to landing page
  return NextResponse.redirect(`${origin}/`)
}

function redirectByRole(origin: string, role: string | null | undefined) {
  if (role === 'brand')   return NextResponse.redirect(`${origin}/dashboard/brand`)
  if (role === 'creator') return NextResponse.redirect(`${origin}/dashboard/creator`)
  if (role === 'admin')   return NextResponse.redirect(`${origin}/dashboard/admin`)
  if (role === 'agency')  return NextResponse.redirect(`${origin}/dashboard/agency`)
  if (role === 'owner')   return NextResponse.redirect(`${origin}/dashboard/admin`)
  return NextResponse.redirect(`${origin}/onboarding`)
}
