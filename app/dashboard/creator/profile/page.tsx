import { redirect }    from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import CreatorProfileView from './profile-view'

export default async function CreatorProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'brand')  redirect('/dashboard/brand/profile')
  if (profile?.role === 'agency') redirect('/dashboard/agency')
  if (profile?.role !== 'creator' && profile?.role !== 'admin' && profile?.role !== 'owner') redirect('/')

  // Fetch creator record
  const { data: creator } = await supabase
    .from('creators')
    .select('id, full_name, platform, username, profile_url, verification_status, verification_code, price_per_post, rates, claimed_at')
    .eq('user_id', user.id)
    .maybeSingle()

  // Fetch all social handles (only if creator exists)
  const { data: handles } = creator
    ? await supabase
        .from('creator_social_handles')
        .select('id, platform, username, channel_url, followers, is_primary, verification_status, verification_code')
        .eq('creator_id', creator.id)
        .order('is_primary', { ascending: false })
    : { data: [] }

  // Fetch application history (stored in campaign_applications)
  const { data: bids } = creator
    ? await supabase
        .from('campaign_applications')
        .select('id, bid_amount, status, message, created_at, campaign_id, campaigns(id, title, status, platforms, brand_id, brands(id, name, logo_url))')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  // Fetch conversations (brand offers / inbox)
  const { data: conversations } = creator
    ? await supabase
        .from('conversations')
        .select('id, brand_id, creator_id, last_msg_at, created_at, brands(id, name, logo_url, owner_id)')
        .eq('creator_id', creator.id)
        .order('last_msg_at', { ascending: false, nullsFirst: false })
        .limit(30)
    : { data: [] }

  // Derive brand connections from application history
  const brandMap: Record<string, {
    id: string; name: string; deals: number; totalValue: number; lastDeal: string; campaigns: string[]
  }> = {}

  for (const bid of (bids ?? [])) {
    const camp  = (bid as any).campaigns
    const brand = camp?.brands
    if (!brand?.id) continue
    if (!brandMap[brand.id]) {
      brandMap[brand.id] = { id: brand.id, name: brand.name ?? 'Unknown', deals: 0, totalValue: 0, lastDeal: bid.created_at, campaigns: [] }
    }
    brandMap[brand.id].deals++
    brandMap[brand.id].totalValue += (bid as any).bid_amount ?? 0
    if (camp?.title && !brandMap[brand.id].campaigns.includes(camp.title)) {
      brandMap[brand.id].campaigns.push(camp.title)
    }
    if (bid.created_at > brandMap[brand.id].lastDeal) {
      brandMap[brand.id].lastDeal = bid.created_at
    }
  }

  const initials = (creator?.full_name ?? profile?.display_name ?? user.email ?? 'C')
    .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <CreatorProfileView
      user={{ id: user.id, email: user.email ?? '' }}
      creator={creator ?? null}
      handles={(handles ?? []) as any[]}
      bids={(bids ?? []) as any[]}
      connections={Object.values(brandMap)}
      conversations={(conversations ?? []) as any[]}
      initials={initials}
    />
  )
}
