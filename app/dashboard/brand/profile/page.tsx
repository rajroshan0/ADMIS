import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import BrandDashboard from './brand-dashboard'

export default async function BrandProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'brand' && role !== 'admin' && role !== 'owner' && role !== 'member') {
    if (role === 'creator') redirect('/dashboard/creator')
    if (role === 'agency')  redirect('/dashboard/agency')
    redirect('/')
  }

  // ── 1. Resolve brand — owner first (oldest), fall back to membership ─────────
  // All queries use admin client (bypasses RLS; user already verified via getUser)
  const [{ data: ownedBrands }, { data: membership }] = await Promise.all([
    admin
      .from('brands')
      .select('id, name, logo_url, website, company_size, budget_range')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true }),  // oldest first = real brand
    admin
      .from('brand_members')
      .select('brand_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // Resolve brand: owner wins (oldest); fall back to member's brand
  let brand: { id: string; name: string | null; logo_url: string | null; website: string | null; company_size: string | null; budget_range: string | null } | null
    = (ownedBrands ?? [])[0] ?? null
  if (!brand && membership?.brand_id) {
    const { data: memberBrand } = await admin
      .from('brands')
      .select('id, name, logo_url, website, company_size, budget_range')
      .eq('id', membership.brand_id)
      .maybeSingle()
    brand = memberBrand ?? null
  }

  if (!brand) {
    // ── 2a. No brand yet — show setup form ────────────────────────────────
    const { count: unreadNotifs } = await admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return (
      <BrandDashboard
        user={{ id: user.id, email: user.email ?? '' }}
        brand={null}
        profile={profile}
        campaigns={[]}
        applications={[]}
        deals={[]}
        conversations={[]}
        teamMembers={[]}
        unreadNotifs={unreadNotifs ?? 0}
        initials={(profile?.display_name ?? user.email ?? 'B')
          .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
      />
    )
  }

  // ── 2b. Fetch all brand data in one parallel batch ────────────────────────
  const [
    { data: campaigns },
    { data: conversations },
    { data: deals },
    { data: teamMembersRaw },
    { count: unreadNotifs },
    { data: applications },
  ] = await Promise.all([
    admin
      .from('campaigns')
      .select('id, title, status, platforms, budget_total, payout_amount, deadline, slots, created_at')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('conversations')
      .select('id, brand_id, creator_id, last_msg_at, created_at, creators(id, full_name, username, user_id)')
      .eq('brand_id', brand.id)
      .order('last_msg_at', { ascending: false, nullsFirst: false })
      .limit(30),
    admin
      .from('deals')
      .select('id, price, final_price, currency, status, deadline, delivery_type, deliverables_count, channel, channel_link, promo_code, created_at, updated_at, campaign_id, creator_id, application_id, assigned_to, campaigns(id, title), creators(id, full_name, username, platform)')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('brand_members')
      .select('id, user_id, role, joined_at, department')
      .eq('brand_id', brand.id)
      .order('joined_at', { ascending: true }),
    admin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    // Applications filtered via campaigns join — no longer depends on campaignIds
    admin
      .from('campaign_applications')
      .select('id, bid_amount, status, message, created_at, campaign_id, creator_id, assigned_to, campaigns!inner(id, title, platforms, brand_id), creators(id, full_name, username, platform, price_per_post, user_id)')
      .eq('campaigns.brand_id', brand.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  // ── 3. Member profiles (needs teamMembersRaw) ──────────────────────────────
  const [{ data: memberProfiles }] = await Promise.all([
    (teamMembersRaw ?? []).length > 0
      ? admin
          .from('profiles')
          .select('id, display_name, avatar_url, email')
          .in('id', (teamMembersRaw ?? []).map((m: any) => m.user_id).filter(Boolean))
      : Promise.resolve({ data: [] }),
  ])

  const teamMembers = (teamMembersRaw ?? []).map((m: any) => ({
    ...m,
    profiles: (memberProfiles ?? []).find((p: any) => p.id === m.user_id) ?? null,
  }))

  const initials = (brand.name ?? profile?.display_name ?? user.email ?? 'B')
    .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <BrandDashboard
      user={{ id: user.id, email: user.email ?? '' }}
      brand={brand}
      profile={profile}
      campaigns={(campaigns ?? []) as any[]}
      applications={(applications ?? []) as any[]}
      deals={(deals ?? []) as any[]}
      conversations={(conversations ?? []) as any[]}
      teamMembers={(teamMembers ?? []) as any[]}
      unreadNotifs={unreadNotifs ?? 0}
      initials={initials}
    />
  )
}
