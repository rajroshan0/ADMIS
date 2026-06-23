import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CampaignDetail from './campaign-detail'

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'brand' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/dashboard/creator/discover')
  }

  // Get brand linked to this user
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, logo_url, is_verified')
    .eq('owner_id', user.id)
    .maybeSingle()

  // Fetch the campaign — use maybeSingle() so 0 rows returns null (not an error)
  // Filter by brand_id directly when we have it, so we don't rely purely on RLS
  const campaignQuery = supabase
    .from('campaigns')
    .select('id,title,description,deal_type,payout_model,payout_amount,budget_total,platforms,status,deadline,created_at,slots,applicants_count,requirements,target_audience')
    .eq('id', params.id)

  if (brand && profile?.role !== 'admin' && profile?.role !== 'owner') {
    campaignQuery.eq('brand_id', brand.id)
  }

  const { data: campaign } = await campaignQuery.maybeSingle()
  if (!campaign) notFound()

  // Fetch applications with creator info
  const { data: applications } = await supabase
    .from('campaign_applications')
    .select('id, bid_amount, status, message, created_at, creator_id, assigned_to, creators(id, full_name, username, platform, profile_url, price_per_post, user_id, creator_social_handles(platform, username, followers, is_primary))')
    .eq('campaign_id', params.id)
    .order('created_at', { ascending: false })

  // Team members for assignment
  const { data: teamMembersRaw } = brand
    ? await supabase
        .from('brand_members')
        .select('id, user_id, role, department')
        .eq('brand_id', brand.id)
    : { data: [] }

  const memberUserIds = (teamMembersRaw ?? []).map((m: any) => m.user_id).filter(Boolean)
  const { data: memberProfiles } = memberUserIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', memberUserIds)
    : { data: [] }

  const teamMembers = (teamMembersRaw ?? []).map((m: any) => ({
    ...m,
    profiles: (memberProfiles ?? []).find((p: any) => p.id === m.user_id) ?? null
  }))

  const initials = (profile?.display_name ?? user.email ?? 'B').slice(0, 2).toUpperCase()

  return (
    <CampaignDetail
      campaign={campaign}
      applications={(applications ?? []) as any[]}
      brand={brand ?? null}
      userInitials={initials}
      userId={user.id}
      teamMembers={(teamMembers ?? []) as any[]}
    />
  )
}
