'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter }    from 'next/navigation'
import { T, fmtMoney, fmtDate, daysLeft, daysColor, DEAL_LABELS, DEAL_COLORS, STATUS_COLORS } from '@/lib/utils'

interface Campaign {
  id: string
  title: string | null
  deal_type: string | null
  payout_model: string | null
  payout_amount: number | null
  budget_total: number | null
  platforms: string[] | null
  status: string | null
  deadline: string | null
  created_at: string | null
  slots: number | null
  applicants_count: number | null
}

interface Brand {
  id: string
  name: string | null
  is_verified: boolean | null
}

const STATUS_TABS = ['all', 'open', 'draft', 'paused', 'closed', 'filled'] as const
type StatusTab = typeof STATUS_TABS[number]

const PLAT_COLORS: Record<string, string> = {
  youtube: '#ff3b30', instagram: '#ec4899', tiktok: '#25e0d6',
}

export default function BrandCampaigns({
  userInitials,
  brand,
}: {
  userInitials?: string
  brand: Brand | null
}) {
  const router   = useRouter()
  const supabase = createClient()

  const [tab,       setTab]       = useState<StatusTab>('all')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)

  const fetchCampaigns = useCallback(async (statusTab: StatusTab) => {
    setLoading(true)
    try {
      let q = supabase
        .from('campaigns')
        .select('id,title,deal_type,payout_model,payout_amount,budget_total,platforms,status,deadline,created_at,slots,applicants_count', { count: 'exact' })

      if (brand) {
        q = q.eq('brand_id', brand.id)
      } else {
        // No brand profile — return empty
        setCampaigns([]); setTotal(0); setLoading(false); return
      }

      if (statusTab !== 'all') q = q.eq('status', statusTab)

      const { data, count, error } = await q.order('created_at', { ascending: false })
      if (!error) { setCampaigns((data as Campaign[]) ?? []); setTotal(count ?? 0) }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [brand, supabase])

  useEffect(() => { fetchCampaigns(tab) }, [tab])

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  const noBrand = !brand

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.side, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => router.push('/dashboard/brand/discover')}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>ADMIS</span>
        </div>

        <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {[
            { label: 'Discovery',  href: '/dashboard/brand/discover' },
            { label: 'Campaigns',  href: '/dashboard/brand/campaigns', active: true },
            { label: 'Deals',      href: '/dashboard/brand/deals' },
          ].map(item => (
            <span key={item.label} onClick={() => router.push(item.href)}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: item.active ? T.text : T.dim, background: item.active ? T.elev : 'transparent', cursor: 'pointer' }}>
              {item.label}
            </span>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#1d1145', color: '#a78bfa', border: '1px solid #3b1f8a', padding: '3px 10px', borderRadius: 20 }}>Brand</span>
          <button onClick={signOut} style={{ fontSize: 12, color: T.dim, background: 'none', border: `1px solid ${T.border}`, cursor: 'pointer', padding: '5px 12px', borderRadius: 8 }}>Sign out</button>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${T.purple},#a855f7)`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 13 }}>{userInitials ?? 'B'}</div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, background: '#1d1145', color: '#a78bfa', border: '1px solid #3b1f8a', padding: '2px 10px', borderRadius: 20, marginBottom: 8 }}>Brand workspace</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
              {brand ? `${brand.name}'s Campaigns` : 'My Campaigns'}
            </h1>
            <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
              {loading ? 'Loading…' : `${total} campaign${total !== 1 ? 's' : ''} total`}
            </p>
          </div>

          <button
            onClick={() => router.push('/dashboard/brand/campaigns/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Campaign
          </button>
        </div>

        {/* No brand profile warning */}
        {noBrand && (
          <div style={{ background: `${T.amber}11`, border: `1px solid ${T.amber}44`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: T.amber }}>Brand profile not set up</p>
            <p style={{ margin: 0, color: T.dim, fontSize: 14 }}>
              Your account doesn't have a brand profile yet. Contact support or go to Settings to create one before you can post campaigns.
            </p>
          </div>
        )}

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: T.side, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setTab(s)}
              style={{
                padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: tab === s ? T.elev : 'transparent',
                color: tab === s ? T.text : T.dim, fontWeight: tab === s ? 700 : 500, fontSize: 13,
                textTransform: 'capitalize',
              }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Campaign list */}
        {loading ? (
          <SkeletonList />
        ) : campaigns.length === 0 ? (
          <EmptyState tab={tab} onNew={() => router.push('/dashboard/brand/campaigns/new')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map(c => (
              <CampaignRow key={c.id} campaign={c} onView={() => router.push(`/dashboard/brand/campaigns/${c.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Campaign Row ─────────────────────────────────────────────
function CampaignRow({ campaign: c, onView }: { campaign: Campaign; onView: () => void }) {
  const [hov, setHov] = useState(false)
  const statusColor = STATUS_COLORS[c.status ?? ''] ?? T.dim
  const dealColor   = DEAL_COLORS[c.deal_type ?? ''] ?? T.dim
  const dl          = daysLeft(c.deadline)
  const dlColor     = daysColor(c.deadline)
  const payout      = c.payout_model === 'commission' ? 'Commission' : fmtMoney(c.payout_amount ?? c.budget_total)

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${statusColor}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'background .15s' }}
      onClick={onView}
    >
      {/* Title + meta */}
      <div style={{ flex: '1 1 250px', minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title ?? 'Untitled'}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Platforms */}
          {c.platforms?.slice(0, 2).map(p => (
            <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${PLAT_COLORS[p.toLowerCase()] ?? T.dim}22`, color: PLAT_COLORS[p.toLowerCase()] ?? T.dim }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
          {/* Deal type */}
          {c.deal_type && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${dealColor}22`, color: dealColor }}>
              {DEAL_LABELS[c.deal_type] ?? c.deal_type}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{ flex: '0 0 90px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusColor}22`, color: statusColor, textTransform: 'capitalize' }}>
          {c.status ?? '—'}
        </span>
      </div>

      {/* Payout */}
      <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 2 }}>Payout</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.green }}>{payout}</div>
      </div>

      {/* Applicants */}
      <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 2 }}>Applicants</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: c.applicants_count ? T.text : T.faint }}>
          {c.applicants_count ?? 0}
        </div>
      </div>

      {/* Deadline */}
      <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 2 }}>Deadline</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: dlColor }}>{dl}</div>
      </div>

      {/* Created */}
      <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 2 }}>Created</div>
        <div style={{ fontSize: 12, color: T.dim }}>{fmtDate(c.created_at)}</div>
      </div>

      {/* Arrow */}
      <svg viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2" width="16" height="16" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function EmptyState({ tab, onNew }: { tab: StatusTab; onNew: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: T.dim }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>
        {tab === 'all' ? 'No campaigns yet' : `No ${tab} campaigns`}
      </p>
      <p style={{ fontSize: 14, margin: '0 0 20px' }}>
        {tab === 'all' ? 'Create your first campaign to start finding creators.' : `You don't have any ${tab} campaigns right now.`}
      </p>
      {tab === 'all' && (
        <button onClick={onNew} style={{ padding: '10px 20px', borderRadius: 10, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
          Create Campaign
        </button>
      )}
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, height: 72, opacity: 0.4 + i * 0.1 }} />
      ))}
    </div>
  )
}

// Needed for inline usage
const T_purple  = T.purple
const T_purpleL = T.purpleL
