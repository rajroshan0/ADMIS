import { redirect }    from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import MemberDashboard  from './member-dashboard'

export default async function MemberPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'member' && profile?.role !== 'admin' && profile?.role !== 'owner') {
    redirect('/')
  }

  // Brand membership
  const { data: membership } = await supabase
    .from('brand_members')
    .select('brand_id, role, department, brands(id, name, logo_url)')
    .eq('user_id', user.id)
    .maybeSingle()

  const brandId = (membership as any)?.brand_id ?? null

  // All brand deals (for deal selector in content submit form)
  const { data: deals } = brandId
    ? await supabase
        .from('deals')
        .select('id, price, currency, status, deadline, delivery_type, channel, created_at, assigned_to, campaign_id, creator_id, campaigns(id, title), creators(id, full_name, username, platform)')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  // Applications assigned to this member
  const { data: applications } = brandId
    ? await supabase
        .from('campaign_applications')
        .select('id, bid_amount, status, message, created_at, assigned_to, campaign_id, creator_id, campaigns(id, title), creators(id, full_name, username, platform)')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  // All brand tasks (members can create + see all, filter to "mine" in UI)
  const { data: tasks } = brandId
    ? await supabase
        .from('brand_tasks')
        .select('id, title, status, assigned_to, created_by, due_date, department, priority, description, created_at')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] }

  // Brand members (for task reassign + dept view)
  const { data: brandMembers } = brandId
    ? await supabase
        .from('brand_members')
        .select('user_id, role, department, profiles(display_name, email)')
        .eq('brand_id', brandId)
    : { data: [] }

  // Content submissions by this member
  const { data: contentSubmissions } = brandId
    ? await supabase
        .from('content_submissions')
        .select('id, brand_id, deal_id, submitted_by, file_url, file_name, content_type, price, channel_name, status, feedback, submitted_at')
        .eq('brand_id', brandId)
        .eq('submitted_by', user.id)
        .order('submitted_at', { ascending: false })
        .limit(100)
    : { data: [] }

  // Brand conversations (messages with creators)
  const { data: conversations } = brandId
    ? await supabase
        .from('conversations')
        .select('id, brand_id, creator_id, last_msg_at, created_at, creators(id, full_name, username, user_id)')
        .eq('brand_id', brandId)
        .order('last_msg_at', { ascending: false, nullsFirst: false })
        .limit(30)
    : { data: [] }

  return (
    <MemberDashboard
      user={{ id: user.id, email: user.email ?? '' }}
      profile={{ displayName: profile?.display_name ?? null, role: profile?.role ?? 'member' }}
      membership={membership as any}
      deals={(deals ?? []) as any[]}
      applications={(applications ?? []) as any[]}
      tasks={(tasks ?? []) as any[]}
      brandMembers={(brandMembers ?? []) as any[]}
      contentSubmissions={(contentSubmissions ?? []) as any[]}
      conversations={(conversations ?? []) as any[]}
    />
  )
}
