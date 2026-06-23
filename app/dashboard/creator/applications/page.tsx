import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import CreatorApplicationsView from './applications-view'

export default async function CreatorApplicationsPage() {
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

  const { data: applications } = creator
    ? await supabase
        .from('campaign_applications')
        .select(`
          id, bid_amount, status, message, created_at, campaign_id,
          campaigns(id, title, platforms, payout_amount, deadline, deal_type,
            brands(id, name, logo_url, is_verified))
        `)
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  const initials = (creator?.full_name ?? user.email ?? 'C')
    .split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <CreatorApplicationsView
      user={{ id: user.id, email: user.email ?? '' }}
      applications={(applications ?? []) as any[]}
      initials={initials}
    />
  )
}
