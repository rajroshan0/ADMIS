import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import CreatorDealsView from './deals-view'

export default async function CreatorDealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'creator' && profile?.role !== 'admin' && profile?.role !== 'owner') redirect('/')

  const { data: creator } = await supabase
    .from('creators')
    .select('id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: deals } = creator
    ? await supabase
        .from('deals')
        .select(`
          id, price, currency, status, deadline, delivery_type,
          deliverables_count, channel, conditions, created_at, updated_at,
          campaign_id, brand_id,
          campaigns(id, title, platforms, deal_type),
          brands(id, name, logo_url, is_verified)
        `)
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  const initials = (creator?.full_name ?? user.email ?? 'C')
    .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <CreatorDealsView
      user={{ id: user.id, email: user.email ?? '' }}
      deals={(deals ?? []) as any[]}
      initials={initials}
    />
  )
}
