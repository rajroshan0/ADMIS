'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg: '#090c12', side: '#0b0e16', card: '#10141e', cardHov: '#141926',
  elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  green: '#4ade80', amber: '#f5a623', red: '#f4574d',
  purple: '#5710fc', purpleL: '#7c3aed', teal: '#25e0d6',
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  applied:     { label: 'Applied',     color: '#60a5fa', bg: '#1e3a5f' },
  pending:     { label: 'Pending',     color: T.amber,   bg: '#3d2a0a' },
  review:      { label: 'In Review',   color: '#a78bfa', bg: '#2d1f5e' },
  shortlisted: { label: 'Shortlisted', color: '#a78bfa', bg: '#2d1f5e' },
  accepted:    { label: 'Accepted',    color: T.green,   bg: '#0d3320' },
  success:     { label: 'Completed',   color: T.teal,    bg: '#0c2f2d' },
  rejected:    { label: 'Rejected',    color: T.red,     bg: '#3b1313' },
  withdrawn:   { label: 'Withdrawn',   color: T.faint,   bg: '#1a1d24' },
}

const DEAL_LABELS: Record<string, string> = {
  paid_post: 'Paid Post', affiliate: 'Affiliate', gifting: 'Gifting', ambassador: 'Ambassador',
}

const PLAT_COLORS: Record<string, string> = {
  youtube: '#ff3b30', instagram: '#ec4899', tiktok: '#25e0d6', twitter: '#1d9bf0', facebook: '#1877f2',
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtAmt(n: number | null) {
  if (!n) return 'Negotiable'
  return `$${n.toLocaleString()}`
}

const FILTERS = ['all', 'applied', 'review', 'accepted', 'rejected', 'withdrawn']

interface Application {
  id: string
  bid_amount: number | null
  status: string | null
  message: string | null
  created_at: string | null
  campaign_id: string | null
  campaigns: {
    id: string; title: string | null; platforms: string[] | null
    payout_amount: number | null; deadline: string | null; deal_type: string | null
    brands: { id: string; name: string | null; logo_url: string | null; is_verified: boolean | null } | null
  } | null
}

export default function CreatorApplicationsView({ user, applications, initials }: {
  user: { id: string; email: string }
  applications: Application[]
  initials: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(false)
  const [apps, setApps]       = useState<Application[]>(applications)

  const counts: Record<string, number> = { all: apps.length }
  for (const f of FILTERS.slice(1)) {
    counts[f] = apps.filter(a => {
      if (f === 'review') return a.status === 'review' || a.status === 'shortlisted'
      return a.status === f
    }).length
  }

  const shown = filter === 'all' ? apps : apps.filter(a => {
    if (filter === 'review') return a.status === 'review' || a.status === 'shortlisted'
    return a.status === filter
  })

  async function withdraw(id: string) {
    setLoading(true)
    await supabase.from('campaign_applications').update({ status: 'withdrawn' }).eq('id', id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: 'withdrawn' } : a))
    setLoading(false)
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  const NAV = [
    { label: 'Discovery',       href: '/dashboard/creator/discover' },
    { label: 'My Applications', href: '/dashboard/creator/applications' },
    { label: 'Deals',           href: '/dashboard/creator/deals' },
  ]

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Header */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.side, position: 'sticky', top: 0, zIndex: 20 }}>
        <a href="/dashboard/creator/discover" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>ADMIS</span>
        </a>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <span key={item.label} onClick={() => router.push(item.href)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: active ? T.text : T.dim, background: active ? T.elev : 'transparent' }}>
                {item.label}
              </span>
            )
          })}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#052e16', color: T.green, border: '1px solid #166534', padding: '3px 10px', borderRadius: 20 }}>Creator</span>
          <button onClick={signOut} style={{ fontSize: 12, color: T.dim, background: 'none', border: `1px solid ${T.border}`, cursor: 'pointer', padding: '5px 12px', borderRadius: 8 }}>Sign out</button>
          <div onClick={() => router.push('/dashboard/creator/profile')} title="View profile"
            style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${T.green},#22c55e)`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#000', fontSize: 13, cursor: 'pointer' }}>{initials}</div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#052e16', color: T.green, border: '1px solid #166534', padding: '2px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>Creator workspace</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>My Applications</h1>
          <div style={{ color: T.dim, fontSize: 14 }}>{apps.length} total applications across all campaigns</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       val: apps.length,                                                       color: T.dim },
            { label: 'Applied',     val: counts.applied,                                                    color: '#60a5fa' },
            { label: 'In Review',   val: counts.review,                                                     color: '#a78bfa' },
            { label: 'Accepted',    val: counts.accepted,                                                   color: T.green },
            { label: 'Rejected',    val: counts.rejected,                                                   color: T.red },
          ].map(s => (
            <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 20px', minWidth: 100 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filter === f ? T.purpleL : T.elev,
                color: filter === f ? '#fff' : T.dim }}>
              {f === 'all' ? 'All' : f === 'review' ? 'In Review' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {shown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: T.faint }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14 }}>No applications {filter !== 'all' ? `with status "${filter}"` : 'yet'}</div>
              {filter === 'all' && <button onClick={() => router.push('/dashboard/creator/discover')}
                style={{ marginTop: 16, padding: '8px 20px', background: T.purpleL, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Browse campaigns</button>}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Campaign', 'Brand', 'Platforms', 'Your Bid', 'Campaign Pays', 'Status', 'Applied', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: T.faint, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((app, i) => {
                  const camp  = app.campaigns
                  const brand = camp?.brands
                  const sm    = STATUS_META[app.status ?? 'applied'] ?? STATUS_META.applied
                  return (
                    <tr key={app.id} style={{ borderBottom: i < shown.length - 1 ? `1px solid ${T.border}` : 'none',
                      background: i % 2 === 0 ? 'transparent' : '#0d1019' }}>
                      {/* Campaign */}
                      <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, color: T.text, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {camp?.title ?? '—'}
                        </div>
                        {camp?.deal_type && (
                          <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{DEAL_LABELS[camp.deal_type] ?? camp.deal_type}</div>
                        )}
                      </td>
                      {/* Brand */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: T.elev, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: T.dim, flexShrink: 0 }}>
                            {(brand?.name ?? '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: T.text, fontSize: 12 }}>{brand?.name ?? '—'}</div>
                            {brand?.is_verified && <div style={{ fontSize: 10, color: T.green }}>✓ Verified</div>}
                          </div>
                        </div>
                      </td>
                      {/* Platforms */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(camp?.platforms ?? []).map((p: string) => (
                            <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                              background: PLAT_COLORS[p.toLowerCase()] + '25',
                              color: PLAT_COLORS[p.toLowerCase()] ?? T.faint }}>
                              {p.toUpperCase().slice(0, 2)}
                            </span>
                          ))}
                        </div>
                      </td>
                      {/* Bid */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: T.teal, whiteSpace: 'nowrap' }}>
                        {fmtAmt(app.bid_amount)}
                      </td>
                      {/* Campaign payout */}
                      <td style={{ padding: '14px 16px', color: T.dim, whiteSpace: 'nowrap' }}>
                        {fmtAmt(camp?.payout_amount ?? null)}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: sm.bg, color: sm.color }}>
                          {sm.label}
                        </span>
                      </td>
                      {/* Date */}
                      <td style={{ padding: '14px 16px', color: T.faint, fontSize: 12, whiteSpace: 'nowrap' }}>
                        {fmtDate(app.created_at)}
                      </td>
                      {/* Action */}
                      <td style={{ padding: '14px 16px' }}>
                        {(app.status === 'applied' || app.status === 'pending') && (
                          <button onClick={() => withdraw(app.id)} disabled={loading}
                            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                              background: '#3b1313', color: T.red, border: `1px solid #7f1d1d` }}>
                            Withdraw
                          </button>
                        )}
                        {app.status === 'accepted' && (
                          <button onClick={() => router.push('/dashboard/creator/deals')}
                            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                              background: '#0d3320', color: T.green, border: `1px solid #166534` }}>
                            View deal →
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
