import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboardPage() {
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
    redirect('/')
  }

  const [
    { count: totalCreators },
    { count: totalBrands },
    { count: totalAgencies },
    { count: totalCampaigns },
    { count: totalDeals },
    { count: pendingVerifications },
    { count: openCampaigns },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('creators').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
    supabase.from('agencies').select('*', { count: 'exact', head: true }),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('profiles').select('id, display_name, role, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const adminName = profile.display_name ?? user.email ?? 'Admin'
  const initials = adminName.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const roleColors: Record<string, string> = {
    creator: '#6366f1',
    brand: '#0ea5e9',
    agency: '#8b5cf6',
    admin: '#ef4444',
    owner: '#f59e0b',
    member: '#10b981',
  }

  const stats = [
    { label: 'Creators',          value: totalCreators ?? 0,        color: '#6366f1', href: null },
    { label: 'Brands',            value: totalBrands ?? 0,          color: '#0ea5e9', href: null },
    { label: 'Agencies',          value: totalAgencies ?? 0,        color: '#8b5cf6', href: null },
    { label: 'Total Campaigns',   value: totalCampaigns ?? 0,       color: '#10b981', href: null },
    { label: 'Open Campaigns',    value: openCampaigns ?? 0,        color: '#f59e0b', href: null },
    { label: 'Total Deals',       value: totalDeals ?? 0,           color: '#ec4899', href: null },
    { label: 'Pending Verifs',    value: pendingVerifications ?? 0, color: pendingVerifications ? '#ef4444' : '#334155', href: '/dashboard/admin/verifications' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e2e', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>ADMIS Admin</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{adminName} · {profile.role}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(pendingVerifications ?? 0) > 0 && (
            <Link href="/dashboard/admin/verifications" style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              ⚠ {pendingVerifications} Pending Verifications
            </Link>
          )}
          <Link href="/dashboard/admin/verifications" style={{ padding: '8px 16px', background: '#1e1e2e', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
            Verifications
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Platform Overview</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>Real-time snapshot of ADMIS activity</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
          {stats.map(s => {
            const inner = (
              <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '20px 16px', borderLeft: `4px solid ${s.color}`, height: '100%' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{s.label}</div>
              </div>
            )
            return s.href
              ? <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>{inner}</Link>
              : <div key={s.label}>{inner}</div>
          })}
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24 }}>

          {/* Recent signups */}
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: '#f1f5f9' }}>Recent Signups</h2>
            {(recentUsers ?? []).length === 0 && (
              <p style={{ color: '#64748b', fontSize: 14 }}>No users yet.</p>
            )}
            {(recentUsers ?? []).map((u: any) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #0f0f1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: roleColors[u.role] ?? '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(u.display_name ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{u.display_name ?? '—'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: roleColors[u.role] ?? '#334155', color: '#fff', fontWeight: 600 }}>
                  {u.role ?? 'unknown'}
                </span>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, alignSelf: 'start' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#f1f5f9' }}>Admin Actions</h2>
            {[
              { label: '✅  Review Verifications', href: '/dashboard/admin/verifications' },
              { label: '🔍  Browse Creators',      href: '/dashboard/brand/discover' },
              { label: '📋  All Campaigns',        href: '/dashboard/brand/campaigns' },
              { label: '🏢  Brand Dashboard',      href: '/dashboard/brand/profile' },
              { label: '🎨  Creator Discover',     href: '/dashboard/creator/discover' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', padding: '11px 14px', background: '#0f0f1a', borderRadius: 8, marginBottom: 8, color: '#f1f5f9', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                {l.label}
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
