import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import AdminVerifications from './admin-verifications'

export default async function AdminVerificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'owner'].includes(profile.role ?? '')) {
    redirect('/dashboard/brand/discover')
  }

  return <AdminVerifications userInitials={(profile.display_name ?? 'A').slice(0, 2).toUpperCase()} />
}
