import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import LandingPage      from './landing-page'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users go straight to their dashboard
  if (user) {
    // Use admin client to bypass RLS — identity already verified by getUser() above
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (role === 'brand')   redirect('/dashboard/brand')
    if (role === 'creator') redirect('/dashboard/creator')
    if (role === 'admin')   redirect('/dashboard/admin')
    if (role === 'agency')  redirect('/dashboard/agency')
    if (role === 'member')  redirect('/dashboard/member')
    // Unknown/missing role — fall through to show landing page
  }

  return <LandingPage />
}
