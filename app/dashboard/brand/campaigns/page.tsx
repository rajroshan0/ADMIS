import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import BrandCampaigns   from './brand-campaigns'

export default async function BrandCampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'brand' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/dashboard/creator/discover')
  }

  // Get brand linked to this user
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, is_verified')
    .eq('owner_id', user.id)
    .single()

  const initials = (profile?.display_name ?? user.email ?? 'B').slice(0, 2).toUpperCase()

  return <BrandCampaigns userInitials={initials} brand={brand} />
}
