import { redirect }    from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AgencyDashboard  from './agency-dashboard'

export default async function AgencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // ── 1. Auth check + agency lookup in parallel ─────────────────────────────
  const [{ data: profile }, { data: agency }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('agencies')
      .select('id, name, contact_name, contact_email, contact_phone, social_handles, verification_status, commission_pct')
      .eq('owner_id', user.id)
      .maybeSingle(),
  ])

  if (profile?.role !== 'agency' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/dashboard/creator/discover')
  }

  if (!agency) {
    // No agency yet — render empty state fast
    const initials = (profile?.display_name ?? user.email ?? 'AG')
      .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    return (
      <AgencyDashboard
        user={{ id: user.id, email: user.email ?? '' }}
        agency={null}
        managed={[]}
        campaigns={[]}
        applications={[]}
        deals={[]}
        initials={initials}
      />
    )
  }

  // ── 2. Fetch managed creators + open campaigns in parallel ────────────────
  const [{ data: managedRaw }, { data: campaigns }] = await Promise.all([
    supabase
      .from('agency_managed_channels')
      .select('commission_pct, status, creators(id, full_name, platform, username, verification_status, creator_social_handles(platform, followers, verification_status))')
      .eq('agency_id', agency.id)
      .eq('status', 'active'),
    supabase
      .from('campaigns')
      .select('id, title, brief, payout_amount, budget_total, platforms, deal_type, status, deadline, brand_id, brands(name, logo_url, is_verified)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const managedCreatorIds = (managedRaw ?? [])
    .map((m: any) => m.creators?.id)
    .filter(Boolean) as string[]

  // ── 3. Applications + deals in parallel (need managedCreatorIds) ──────────
  const [{ data: applications }, { data: deals }] = await Promise.all([
    managedCreatorIds.length
      ? supabase
          .from('campaign_applications')
          .select(`
            id, bid_amount, status, message, created_at, campaign_id, creator_id,
            campaigns(id, title, platforms, payout_amount, deadline, deal_type,
              brands(id, name, logo_url)),
            creators(id, full_name, username, platform)
          `)
          .in('creator_id', managedCreatorIds)
          .order('created_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
    managedCreatorIds.length
      ? supabase
          .from('deals')
          .select(`
            id, price, currency, status, deadline, delivery_type,
            deliverables_count, channel, created_at, campaign_id, creator_id,
            campaigns(id, title, platforms),
            brands(id, name, logo_url),
            creators(id, full_name, username, platform)
          `)
          .in('creator_id', managedCreatorIds)
          .order('created_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
  ])

  const initials = (agency.contact_name ?? profile?.display_name ?? user.email ?? 'AG')
    .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <AgencyDashboard
      user={{ id: user.id, email: user.email ?? '' }}
      agency={agency}
      managed={(managedRaw ?? []) as any[]}
      campaigns={(campaigns ?? []) as any[]}
      applications={(applications ?? []) as any[]}
      deals={(deals ?? []) as any[]}
      initials={initials}
    />
  )
}
