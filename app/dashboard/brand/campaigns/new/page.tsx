import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import CampaignForm     from './campaign-form'

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'brand' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/dashboard/creator/discover')
  }

  const { data: brand } = await admin
    .from('brands').select('id, name').eq('owner_id', user.id).single()

  // Fetch categories for the dropdown
  const { data: categories } = await admin
    .from('categories').select('id, name').order('name')

  return <CampaignForm brand={brand} categories={categories ?? []} />
}
