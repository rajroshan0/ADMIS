'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import BidModal         from './bid-modal'

// ─── Types ────────────────────────────────────────────────────
interface Campaign {
  id: string
  title: string | null
  brief: string | null
  payout_amount: number | null
  budget_total: number | null
  platforms: string[] | null      // text[]
  deal_type: string | null        // paid_post | affiliate | gifting | ambassador
  payout_model: string | null     // flat | commission | product_cash
  status: string | null
  created_at: string | null
  deadline: string | null
  brand_id: string | null
  brands?: {
    name: string | null
    logo_url: string | null
    is_verified: boolean | null
  } | null
}

// ─── Theme ────────────────────────────────────────────────────
const T = {
  bg: '#090c12', side: '#0b0e16', card: '#10141e', cardHov: '#141926',
  elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  green: '#4ade80', amber: '#f5a623', red: '#f4574d',
  purple: '#5710fc', purpleL: '#7c3aed',
}

const PLAT_COLORS: Record<string, string> = {
  youtube: '#ff3b30', instagram: '#ec4899', tiktok: '#25e0d6',
  twitter: '#1d9bf0', linkedin: '#0a66c2', facebook: '#1877f2',
}

const DEAL_COLORS: Record<string, string> = {
  paid_post:  '#6b7dff',
  affiliate:  '#f5a623',
  gifting:    '#4ade80',
  ambassador: '#a78bfa',
}
const DEAL_LABELS: Record<string, string> = {
  paid_post: 'Paid Post', affiliate: 'Affiliate', gifting: 'Gifting', ambassador: 'Ambassador',
}

const ALL_PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Twitter', 'LinkedIn']
const ALL_DEAL_TYPES = ['paid_post', 'affiliate', 'gifting', 'ambassador']

const BUDGET_OPTS = [
  { label: 'Any',     min: 0,    max: Infinity },
  { label: '<$500',   min: 0,    max: 500 },
  { label: '$500–1K', min: 500,  max: 1000 },
  { label: '$1K–5K',  min: 1000, max: 5000 },
  { label: '$5K+',    min: 5000, max: Infinity },
]

// ─── Helpers ──────────────────────────────────────────────────
function fmtBudget(payout: number | null, total: number | null, model: string | null): string {
  if (model === 'commission') return 'Commission-based'
  const v = payout ?? total
  if (!v) return 'Negotiable'
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`
  return `$${v}`
}
function daysLeft(d: string | null): string {
  if (!d) return '—'
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Closed'
  if (diff === 0) return 'Today'
  return diff === 1 ? '1 day left' : `${diff} days left`
}
function daysColor(d: string | null): string {
  if (!d) return T.faint
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  return diff < 0 ? T.red : diff <= 3 ? T.amber : T.green
}
function brandIni(b: Campaign['brands']): string {
  return (b?.name ?? '?').slice(0, 2).toUpperCase()
}
function primaryPlatform(platforms: string[] | null): string {
  return (platforms?.[0] ?? '').toLowerCase()
}

// ─── Main Component ───────────────────────────────────────────
export default function CampaignDiscovery({ userInitials, initialCampaigns = [], initialTotal = 0 }: { userInitials?: string; initialCampaigns?: any[]; initialTotal?: number }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Pending filter state
  const [pPlatforms,  setPPlatforms]  = useState<Set<string>>(new Set())
  const [pDealTypes,  setPDealTypes]  = useState<Set<string>>(new Set())
  const [pBudgetIdx,  setPBudgetIdx]  = useState(0)

  // Applied
  const [filters, setFilters] = useState({
    platforms: new Set<string>(), dealTypes: new Set<string>(), budgetIdx: 0,
  })

  // UI
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState('created_at')
  const [layout,   setLayout]   = useState<'grid' | 'list'>('grid')
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  const [page,     setPage]     = useState(0)

  // Data — seeded from SSR to avoid flash of empty state
  const [campaigns,  setCampaigns]  = useState<Campaign[]>(initialCampaigns as Campaign[])
  const [total,      setTotal]      = useState(initialTotal)
  const [loading,    setLoading]    = useState(initialCampaigns.length === 0)
  const [bidTarget,  setBidTarget]  = useState<Campaign | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (pg: number, f = filters, s = search, so = sort, ps = pageSize) => {
    setLoading(true)
    try {
      let q = supabase
        .from('campaigns')
        .select(
          'id,title,brief,payout_amount,budget_total,platforms,deal_type,payout_model,status,created_at,deadline,brand_id,brands(name,logo_url,is_verified)',
          { count: 'exact' }
        )
        .eq('status', 'open')

      // Platform filter: campaign.platforms is text[], match if any overlap
      if (f.platforms.size > 0) {
        const platArr = [...f.platforms].map(p => p.toLowerCase())
        // Use overlaps operator: platforms && ARRAY[...]
        q = q.overlaps('platforms', platArr)
      }

      if (f.dealTypes.size > 0) {
        q = q.in('deal_type', [...f.dealTypes])
      }

      const bOpt = BUDGET_OPTS[f.budgetIdx]
      if (bOpt.min > 0)          q = q.gte('payout_amount', bOpt.min)
      if (bOpt.max < Infinity)   q = q.lte('payout_amount', bOpt.max)

      if (s.trim()) q = q.or(`title.ilike.%${s.trim()}%,brief.ilike.%${s.trim()}%`)

      const ascending = so === 'deadline' || so === 'payout_amount'
      const { data, count, error } = await q
        .order(so, { ascending, nullsFirst: false })
        .range(pg * ps, pg * ps + ps - 1)

      if (!error) { setCampaigns((data as unknown as Campaign[]) || []); setTotal(count || 0) }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filters, search, sort, pageSize, supabase])

  useEffect(() => { fetchData(0) }, [filters, sort, pageSize])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchData(0, filters, search), 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  useEffect(() => { fetchData(page) }, [page])

  function applyFilters() {
    const f = { platforms: new Set(pPlatforms), dealTypes: new Set(pDealTypes), budgetIdx: pBudgetIdx }
    setFilters(f); setPage(0); fetchData(0, f)
  }
  function resetFilters() {
    setPPlatforms(new Set()); setPDealTypes(new Set()); setPBudgetIdx(0)
    const f = { platforms: new Set<string>(), dealTypes: new Set<string>(), budgetIdx: 0 }
    setFilters(f); setPage(0); fetchData(0, f)
  }
  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  const totalPages = Math.ceil(total / pageSize)
  const pgStart    = Math.max(0, page - 2)
  const pgEnd      = Math.min(totalPages - 1, pgStart + 4)

  // ── Sidebar ─────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{ width: 256, flexShrink: 0, background: T.side, borderRight: `1px solid ${T.border}`, height: 'calc(100vh - 64px)', overflowY: 'auto', position: 'sticky', top: 64 }}>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Platform */}
        <div>
          <p style={labelStyle}>Platform</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ALL_PLATFORMS.map(p => {
              const key = p.toLowerCase()
              const on  = pPlatforms.has(key)
              const col = PLAT_COLORS[key] ?? T.dim
              return (
                <button key={p} onClick={() => { const n = new Set(pPlatforms); on ? n.delete(key) : n.add(key); setPPlatforms(n) }}
                  style={chipStyle(on, col, `${col}22`, col)}>{p}</button>
              )
            })}
          </div>
        </div>

        {/* Deal type */}
        <div>
          <p style={labelStyle}>Deal Type</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ALL_DEAL_TYPES.map(dt => {
              const on  = pDealTypes.has(dt)
              const col = DEAL_COLORS[dt]
              return (
                <button key={dt} onClick={() => { const n = new Set(pDealTypes); on ? n.delete(dt) : n.add(dt); setPDealTypes(n) }}
                  style={chipStyle(on, col, `${col}22`, col)}>{DEAL_LABELS[dt]}</button>
              )
            })}
          </div>
        </div>

        {/* Budget */}
        <div>
          <p style={labelStyle}>Budget / Payout</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {BUDGET_OPTS.map((o, i) => (
              <button key={i} onClick={() => setPBudgetIdx(i)} style={chipStyle(pBudgetIdx === i, T.green, '#052e16', T.green)}>{o.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={applyFilters} style={{ padding: '10px', borderRadius: 10, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none' }}>
            Apply Filters
          </button>
          <button onClick={resetFilters} style={{ padding: '10px', borderRadius: 10, background: T.elev, color: T.dim, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: `1px solid ${T.border}` }}>
            Reset All
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.side, position: 'sticky', top: 0, zIndex: 20 }}>
        <a href="/dashboard/creator/discover" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>ADMIS</span>
        </a>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {[
            { label: 'Discovery',       href: '/dashboard/creator/discover' },
            { label: 'My Applications', href: '/dashboard/creator/applications' },
            { label: 'Deals',           href: '/dashboard/creator/deals' },
          ].map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <span key={item.label} onClick={() => router.push(item.href)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: active ? T.text : T.dim, background: active ? T.elev : 'transparent', cursor: 'pointer' }}>
                {item.label}
              </span>
            )
          })}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#052e16', color: T.green, border: '1px solid #166534', padding: '3px 10px', borderRadius: 20 }}>Creator</span>
          <button onClick={signOut} style={{ fontSize: 12, color: T.dim, background: 'none', border: `1px solid ${T.border}`, cursor: 'pointer', padding: '5px 12px', borderRadius: 8 }}>Sign out</button>
          <div onClick={() => router.push('/dashboard/creator/profile')} title="View profile"
            style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${T.green},#22c55e)`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#000', fontSize: 13, cursor: 'pointer' }}>{userInitials ?? 'C'}</div>
        </div>
      </header>

      <div style={{ display: 'flex' }}>
        {Sidebar}

        <main style={{ flex: 1, padding: '24px 28px', minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, background: '#052e16', color: T.green, border: '1px solid #166534', padding: '2px 10px', borderRadius: 20, marginBottom: 8 }}>Creator workspace</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>Discover Campaigns</h1>
            <div style={{ color: T.dim, fontSize: 14 }}>{loading ? 'Loading…' : `${total.toLocaleString()} campaigns available`}</div>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 200px', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.faint }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns or brands…"
                style={{ width: '100%', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px 8px 34px', color: T.text, fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0 12px', height: 38, fontSize: 13 }}>
              <span style={{ color: T.dim }}>Sort:</span>
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(0) }} style={{ background: 'transparent', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                <option value="created_at">Newest</option>
                <option value="deadline">Deadline</option>
                <option value="payout_amount">Highest Payout</option>
                <option value="budget_total">Total Budget</option>
              </select>
            </div>
            <div style={{ display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {(['grid', 'list'] as const).map(l => (
                <button key={l} onClick={() => setLayout(l)} style={{ padding: '8px 14px', background: layout === l ? T.elev : 'transparent', color: layout === l ? T.text : T.dim, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {l === 'grid'
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                  }
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {([25, 50, 100] as const).map(n => (
                <button key={n} onClick={() => { setPageSize(n); setPage(0) }} style={{ padding: '8px 13px', background: pageSize === n ? '#1d1145' : 'transparent', color: pageSize === n ? '#a78bfa' : T.dim, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{n}</button>
              ))}
            </div>
          </div>

          <div style={{ color: T.dim, fontSize: 13, marginBottom: 16 }}>
            <b style={{ color: T.text }}>{total.toLocaleString()}</b> campaigns &middot; page {page + 1} of {Math.max(1, totalPages).toLocaleString()}
          </div>

          {loading ? (
            <SkeletonGrid count={Math.min(pageSize, 9)} layout={layout} />
          ) : campaigns.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{
              display: layout === 'grid' ? 'grid' : 'flex',
              gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined,
              flexDirection: layout === 'list' ? 'column' : undefined,
              gap: 12,
            }}>
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} layout={layout} onApply={() => setBidTarget(c)} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32, paddingBottom: 32 }}>
              <PagBtn onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</PagBtn>
              {Array.from({ length: pgEnd - pgStart + 1 }, (_, i) => pgStart + i).map(p => (
                <PagBtn key={p} onClick={() => setPage(p)} active={page === p}>{p + 1}</PagBtn>
              ))}
              {pgEnd < totalPages - 1 && <>
                <span style={{ color: T.faint }}>…</span>
                <PagBtn onClick={() => setPage(totalPages - 1)}>{totalPages}</PagBtn>
              </>}
              <PagBtn onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next →</PagBtn>
            </div>
          )}
        </main>
      </div>
      <BidModal open={!!bidTarget} onClose={() => setBidTarget(null)} campaign={bidTarget} />
    </div>
  )
}

// ─── Campaign Card ────────────────────────────────────────────
function CampaignCard({ campaign: c, layout, onApply }: { campaign: Campaign; layout: 'grid' | 'list'; onApply: () => void }) {
  const [hov, setHov] = useState(false)
  const platKey   = primaryPlatform(c.platforms)
  const platColor = PLAT_COLORS[platKey] ?? T.dim
  const dealColor = DEAL_COLORS[c.deal_type ?? ''] ?? T.dim
  const budget    = fmtBudget(c.payout_amount, c.budget_total, c.payout_model)
  const dl        = daysLeft(c.deadline)
  const dlColor   = daysColor(c.deadline)

  if (layout === 'list') {
    return (
      <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${platColor}`, borderRadius: 12, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 16, transition: 'background .15s' }}>
        <BrandLogo brand={c.brands} />
        <div style={{ flex: '0 0 200px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'Untitled'}</div>
          <div style={{ color: T.faint, fontSize: 12 }}>{c.brands?.name ?? 'Brand'}</div>
        </div>
        <div style={{ flex: '0 0 160px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <PlatPills platforms={c.platforms} />
          {c.deal_type && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${dealColor}22`, color: dealColor }}>{DEAL_LABELS[c.deal_type]}</span>}
        </div>
        <div style={{ flex: 1, color: T.green, fontWeight: 800, fontSize: 15 }}>{budget}</div>
        <div style={{ color: dlColor, fontSize: 12, fontWeight: 600, flex: '0 0 90px', textAlign: 'right' }}>{dl}</div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <Btn variant="ghost">Save</Btn>
          <Btn variant="primary" onClick={onApply}>Apply</Btn>
        </div>
      </article>
    )
  }

  return (
    <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', transition: 'background .15s, box-shadow .15s', boxShadow: hov ? '0 4px 20px rgba(0,0,0,.4)' : 'none', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 3, background: platColor }} />
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 11 }}>
          <BrandLogo brand={c.brands} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {c.title || 'Untitled Campaign'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: T.dim, fontSize: 12 }}>{c.brands?.name ?? 'Brand'}</span>
              {c.brands?.is_verified && <span style={{ fontSize: 9, background: '#1d1145', color: '#a78bfa', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>✓</span>}
            </div>
          </div>
        </div>

        {/* Brief */}
        {c.brief && (
          <p style={{ color: T.dim, fontSize: 12.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
            {c.brief}
          </p>
        )}

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <PlatPills platforms={c.platforms} />
          {c.deal_type && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${dealColor}22`, color: dealColor }}>{DEAL_LABELS[c.deal_type]}</span>}
        </div>

        {/* Budget + Deadline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.side, borderRadius: 10, padding: '10px 14px', marginTop: 'auto' }}>
          <div>
            <div style={{ fontSize: 10, color: T.faint, marginBottom: 2 }}>Payout</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.green }}>{budget}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: T.faint, marginBottom: 2 }}>Deadline</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: dlColor }}>{dl}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" style={{ flex: 1 }}>Save</Btn>
          <Btn variant="primary" style={{ flex: 1 }} onClick={onApply}>Apply Now</Btn>
        </div>
      </div>
    </article>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function BrandLogo({ brand }: { brand: Campaign['brands'] }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div style={{ width: 42, height: 42, borderRadius: 10, background: T.elev, border: `1px solid ${T.border}`, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
      {brand?.logo_url && !imgErr
        ? <img src={brand.logo_url} alt="" width={42} height={42} style={{ objectFit: 'cover', width: '100%', height: '100%' }} onError={() => setImgErr(true)} />
        : <span style={{ fontWeight: 700, color: T.dim, fontSize: 14 }}>{brandIni(brand)}</span>
      }
    </div>
  )
}

function PlatPills({ platforms }: { platforms: string[] | null }) {
  if (!platforms?.length) return null
  return (
    <>
      {platforms.slice(0, 2).map(p => {
        const col = PLAT_COLORS[p.toLowerCase()] ?? T.dim
        return <span key={p} style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${col}22`, color: col }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
      })}
      {platforms.length > 2 && <span style={{ fontSize: 11, color: T.faint }}>+{platforms.length - 2}</span>}
    </>
  )
}

function Btn({ variant, children, style, onClick }: { variant: 'ghost' | 'primary'; children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  const base: React.CSSProperties = { padding: '8px 12px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'opacity .15s', opacity: hov ? 0.85 : 1, ...style }
  const s = variant === 'primary'
    ? { ...base, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: '#fff' }
    : { ...base, background: 'transparent', color: T.dim, border: `1px solid ${T.border}` }
  return <button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={s} onClick={onClick}>{children}</button>
}

function PagBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 36, height: 36, padding: '0 12px', borderRadius: 8,
      border: `1px solid ${active ? T.purple : T.border}`,
      background: active ? '#1d1145' : 'transparent',
      color: active ? '#a78bfa' : disabled ? T.faint : T.dim,
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
    }}>{children}</button>
  )
}

function SkeletonGrid({ count, layout }: { count: number; layout: 'grid' | 'list' }) {
  return (
    <div style={{ display: layout === 'grid' ? 'grid' : 'flex', gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined, flexDirection: layout === 'list' ? 'column' : undefined, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, height: layout === 'grid' ? 210 : 64, opacity: 0.4 + (i % 3) * 0.1 }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: T.dim }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: T.text }}>No campaigns found</p>
      <p style={{ fontSize: 14, marginTop: 4 }}>Try adjusting your filters or search term</p>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.faint,
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px',
}
function chipStyle(active: boolean, borderC: string, bgC: string, textC: string): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? borderC : T.border}`,
    background: active ? bgC : 'transparent',
    color: active ? textC : T.dim,
  }
}
