'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg: '#090c12', side: '#0b0e16', card: '#10141e',
  elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  green: '#4ade80', amber: '#f5a623', red: '#f4574d',
  purple: '#5710fc', purpleL: '#7c3aed', teal: '#25e0d6',
}

const DEAL_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:           { label: 'Active',            color: '#60a5fa', bg: '#1e3a5f' },
  submitted:        { label: 'Submitted',          color: T.amber,   bg: '#3d2a0a' },
  approved:         { label: 'Approved',           color: T.green,   bg: '#0d3320' },
  completed:        { label: 'Completed',          color: T.teal,    bg: '#0c2f2d' },
  cancelled:        { label: 'Cancelled',          color: T.red,     bg: '#3b1313' },
  disputed:         { label: 'Disputed',           color: '#fb923c', bg: '#3d1f0a' },
  revision_requested:{ label: 'Revision Requested', color: '#c084fc', bg: '#2e1f4f' },
}

const DELIVERY_TYPE_LABELS: Record<string, string> = {
  paid_post: 'Paid Post', affiliate: 'Affiliate',
  gifting: 'Gifting', ambassador: 'Ambassador',
}

const PLAT_COLORS: Record<string, string> = {
  youtube: '#ff3b30', instagram: '#ec4899', tiktok: '#25e0d6',
  twitter: '#1d9bf0', facebook: '#1877f2',
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtAmt(n: number | null, cur = 'USD') {
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)
}
function daysLeft(d: string | null) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return { label: 'Overdue', color: T.red }
  if (diff === 0) return { label: 'Due today', color: T.amber }
  if (diff <= 3) return { label: `${diff}d left`, color: T.amber }
  return { label: `${diff}d left`, color: T.faint }
}

const FILTERS = ['all', 'active', 'submitted', 'approved', 'completed', 'cancelled']

interface Deal {
  id: string; price: number | null; currency: string | null
  status: string | null; deadline: string | null
  delivery_type: string | null; deliverables_count: number | null
  channel: string | null; conditions: string | null
  created_at: string | null; updated_at: string | null
  campaign_id: string | null; brand_id: string | null
  campaigns: { id: string; title: string | null; platforms: string[] | null; deal_type: string | null } | null
  brands: { id: string; name: string | null; logo_url: string | null; is_verified: boolean | null } | null
}

export default function CreatorDealsView({ user, deals: initialDeals, initials }: {
  user: { id: string; email: string }
  deals: Deal[]
  initials: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [filter, setFilter] = useState('all')
  const [deals]             = useState<Deal[]>(initialDeals)
  const [expanded, setExpanded] = useState<string | null>(null)

  const counts: Record<string, number> = { all: deals.length }
  for (const f of FILTERS.slice(1)) counts[f] = deals.filter(d => d.status === f).length

  const shown = filter === 'all' ? deals : deals.filter(d => d.status === filter)

  // Earnings summary
  const totalEarned  = deals.filter(d => d.status === 'completed').reduce((s, d) => s + (d.price ?? 0), 0)
  const totalPending = deals.filter(d => ['active','submitted','approved'].includes(d.status ?? '')).reduce((s, d) => s + (d.price ?? 0), 0)

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
        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#052e16', color: T.green, border: '1px solid #166534', padding: '2px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>Creator workspace</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>My Deals</h1>
          <div style={{ color: T.dim, fontSize: 14 }}>{deals.length} total deals</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total deals',      val: deals.length,                     color: T.dim,   isCount: true },
            { label: 'Active',           val: counts.active,                    color: '#60a5fa', isCount: true },
            { label: 'Completed',        val: counts.completed,                 color: T.teal,  isCount: true },
            { label: 'Total earned',     val: fmtAmt(totalEarned),             color: T.green,  isCount: false },
            { label: 'Pending earnings', val: fmtAmt(totalPending),            color: T.amber,  isCount: false },
          ].map(s => (
            <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 20px', minWidth: 120 }}>
              <div style={{ fontSize: s.isCount ? 22 : 18, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: filter === f ? T.purpleL : T.elev,
                color: filter === f ? '#fff' : T.dim }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {shown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: T.faint }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
              <div style={{ fontSize: 14 }}>No deals {filter !== 'all' ? `with status "${filter}"` : 'yet'}</div>
              {filter === 'all' && <button onClick={() => router.push('/dashboard/creator/discover')}
                style={{ marginTop: 16, padding: '8px 20px', background: T.purpleL, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Browse campaigns
              </button>}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Campaign', 'Brand', 'Platforms', 'Deal Price', 'Type', 'Status', 'Deadline', 'Deliverables'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: T.faint, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((deal, i) => {
                  const camp   = deal.campaigns
                  const brand  = deal.brands
                  const sm     = DEAL_STATUS_META[deal.status ?? 'active'] ?? DEAL_STATUS_META.active
                  const dl     = daysLeft(deal.deadline)
                  const isExp  = expanded === deal.id
                  return (
                    <>
                      <tr key={deal.id}
                        onClick={() => setExpanded(isExp ? null : deal.id)}
                        style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                          background: isExp ? T.elev : i % 2 === 0 ? 'transparent' : '#0d1019' }}>
                        {/* Campaign */}
                        <td style={{ padding: '14px 16px', maxWidth: 180 }}>
                          <div style={{ fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {camp?.title ?? '—'}
                          </div>
                        </td>
                        {/* Brand */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.elev, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: T.dim, flexShrink: 0 }}>
                              {(brand?.name ?? '?')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: T.text, fontSize: 12 }}>{brand?.name ?? '—'}</span>
                          </div>
                        </td>
                        {/* Platforms */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(camp?.platforms ?? []).map((p: string) => (
                              <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                                background: (PLAT_COLORS[p.toLowerCase()] ?? '#555') + '25',
                                color: PLAT_COLORS[p.toLowerCase()] ?? T.faint }}>
                                {p.slice(0, 2).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>
                        {/* Price */}
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: T.green, whiteSpace: 'nowrap' }}>
                          {fmtAmt(deal.price, deal.currency ?? 'USD')}
                        </td>
                        {/* Type */}
                        <td style={{ padding: '14px 16px', color: T.dim, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {DELIVERY_TYPE_LABELS[deal.delivery_type ?? ''] ?? (deal.delivery_type ?? '—')}
                        </td>
                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>
                            {sm.label}
                          </span>
                        </td>
                        {/* Deadline */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          {deal.deadline ? (
                            <div>
                              <div style={{ color: T.text, fontSize: 12 }}>{fmtDate(deal.deadline)}</div>
                              {dl && <div style={{ fontSize: 11, color: dl.color, marginTop: 2 }}>{dl.label}</div>}
                            </div>
                          ) : <span style={{ color: T.faint }}>—</span>}
                        </td>
                        {/* Deliverables */}
                        <td style={{ padding: '14px 16px', color: T.dim, whiteSpace: 'nowrap' }}>
                          {deal.deliverables_count ?? '—'}
                        </td>
                      </tr>
                      {/* Expanded row */}
                      {isExp && (
                        <tr key={deal.id + '-exp'} style={{ borderBottom: `1px solid ${T.border}`, background: T.elev }}>
                          <td colSpan={8} style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                              {deal.channel && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', marginBottom: 3 }}>Channel</div>
                                  <div style={{ fontSize: 13, color: T.text }}>{deal.channel}</div>
                                </div>
                              )}
                              {deal.conditions && (
                                <div style={{ maxWidth: 500 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', marginBottom: 3 }}>Conditions</div>
                                  <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5 }}>{deal.conditions}</div>
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', marginBottom: 3 }}>Deal Created</div>
                                <div style={{ fontSize: 13, color: T.dim }}>{fmtDate(deal.created_at)}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: T.faint, textAlign: 'center' }}>Click a row to see deal details</div>
      </main>
    </div>
  )
}
