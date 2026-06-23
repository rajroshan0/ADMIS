import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import CampaignDiscovery from './campaign-discovery'

export default async function CreatorDiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  // Only creators (and admins) can access this page
  if (profile?.role !== 'creator' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/dashboard/brand/discover')
  }

  // SSR first page of campaigns — instant first paint, no loading flash
  const { data: initialCampaigns, count } = await admin
    .from('campaigns')
    .select(
      'id,title,brief,payout_amount,budget_total,platforms,deal_type,payout_model,status,created_at,deadline,brand_id,brands(name,logo_url,is_verified)',
      { count: 'planned' }
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false, nullsFirst: false })
    .range(0, 24)

  const initials = (profile?.display_name ?? user.email ?? 'C')
    .slice(0, 2).toUpperCase()

  return (
    <CampaignDiscovery
      userInitials={initials}
      initialCampaigns={(initialCampaigns ?? []) as any[]}
      initialTotal={count ?? 0}
    />
  )
}
