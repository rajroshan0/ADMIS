'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter }    from 'next/navigation'
import InviteModal      from './invite-modal'
import BidOfferModal    from './bid-offer-modal'
import ChatbotPopup     from '@/components/chat/ChatbotPopup'

// ─── Types ────────────────────────────────────────────────────
type Platform = 'youtube' | 'instagram' | 'tiktok'
type Mode     = 'discover' | 'contact'

interface Creator {
  id: string
  username: string | null
  full_name: string | null
  picture_url: string | null
  platform: Platform
  is_verified: boolean | null
  account_category: string | null
  followers: number | null
  subscribers: number | null
  engagement_rate: string | null
  avg_likes: string | null
  views: number | null
  reels_plays: number | null
  geo_country: string | null
  geo_city: string | null
  profile_url: string | null
  description: string | null
  price_per_post: number | null
}

interface Filters {
  platforms:  Set<Platform>
  minF:       number   // raw follower count
  maxF:       number   // 0 = no max
  minE:       number   // percentage e.g. 1 = 1%, stored in DB as 0.01
  categories: Set<string>
  countries:  Set<string>
}

interface Country { name: string; flag: string; cnt: number }

// ─── Theme ────────────────────────────────────────────────────
const T = {
  bg: '#090c12', side: '#0b0e16', card: '#10141e', cardHov: '#141926',
  elev: '#161b28', border: '#1d2433', borderS: '#161b27',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  green: '#4ade80', amber: '#f5a623', red: '#f4574d',
  purple: '#5710fc', purpleL: '#7c3aed',
}

const PLAT = {
  youtube:   { label: 'YouTube',   c: '#ff3b30', g: 'linear-gradient(90deg,#ff3b30,#ff7a18)' },
  instagram: { label: 'Instagram', c: '#ec4899', g: 'linear-gradient(90deg,#ec4899,#a855f7)' },
  tiktok:    { label: 'TikTok',    c: '#25e0d6', g: 'linear-gradient(90deg,#25e0d6,#2dd4bf)' },
}

// Follower range presets
const F_PRESETS: { label: string; min: number; max: number }[] = [
  { label: 'Any',    min: 0,         max: 0 },
  { label: 'Nano',   min: 1_000,     max: 10_000 },
  { label: 'Micro',  min: 10_000,    max: 100_000 },
  { label: 'Mid',    min: 100_000,   max: 500_000 },
  { label: 'Macro',  min: 500_000,   max: 1_000_000 },
  { label: 'Mega',   min: 1_000_000, max: 0 },
]

const ENG_OPTS = [
  { label: 'Any', v: 0 },
  { label: '>1%', v: 1 },
  { label: '>3%', v: 3 },
  { label: '>5%', v: 5 },
  { label: '>8%', v: 8 },
  { label: '>10%', v: 10 },
]

// ─── Helpers ──────────────────────────────────────────────────
function fmt(n: number | string | null): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (!v || isNaN(v)) return '—'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return Math.round(v / 1e3) + 'K'
  return Math.round(v).toString()
}
function fmtEng(n: number | string | null): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (!v || isNaN(v)) return '—'
  // stored as decimal 0.052 → display as 5.2%
  const pct = v < 1 ? v * 100 : v
  return pct.toFixed(1) + '%'
}
function score(c: Creator): number {
  const f = Math.max(c.followers ?? 0, c.subscribers ?? 0)
  const raw = parseFloat((c.engagement_rate ?? '0') as string)
  const e = raw < 1 ? raw * 100 : raw   // normalise to pct
  const fs = f > 0 ? Math.min(55, (Math.log10(Math.max(f, 100)) / 7) * 55) : 0
  const es = Math.min(45, (Math.min(e, 20) / 20) * 45)
  return Math.round(fs + es)
}
function scoreColor(s: number) { return s >= 80 ? T.green : s >= 60 ? T.amber : T.red }
function getFollowers(c: Creator) { return c.platform === 'youtube' ? (c.subscribers ?? c.followers) : c.followers }
function getViews(c: Creator) { return c.platform === 'instagram' ? c.reels_plays : c.views }
function ini(c: Creator) { return ((c.full_name || c.username || '?').replace('@', '').slice(0, 2).toUpperCase()) }

// ─── Main Component ───────────────────────────────────────────
// ─── Admin Edit Modal ─────────────────────────────────────────
function AdminEditModal({ creator, onClose, onSaved }: { creator: Creator; onClose: () => void; onSaved: (updated: Creator) => void }) {
  const [form, setForm] = useState({
    full_name:        creator.full_name ?? '',
    username:         creator.username ?? '',
    price_per_post:   creator.price_per_post?.toString() ?? '',
    account_category: creator.account_category ?? '',
    geo_country:      creator.geo_country ?? '',
    is_verified:      creator.is_verified ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  async function save() {
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/admin/creators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:               creator.id,
          full_name:        form.full_name || null,
          username:         form.username  || null,
          price_per_post:   form.price_per_post ? parseFloat(form.price_per_post) : null,
          account_category: form.account_category || null,
          geo_country:      form.geo_country || null,
          is_verified:      form.is_verified,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error ?? 'Save failed'); setSaving(false); return }
      onSaved({ ...creator, ...json.creator })
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0f0f1a', border: '1px solid #1d2433',
    borderRadius: 7, padding: '8px 10px', color: '#f3f5f8', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle2: React.CSSProperties = { fontSize: 11, color: '#5e6a7d', marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#10141e', border: '1px solid #1d2433', borderRadius: 14, padding: 28, width: 460, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f5f8' }}>Edit Creator</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5e6a7d', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle2}>Full Name</label>
            <input style={inputStyle} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle2}>Username</label>
            <input style={inputStyle} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle2}>Price / Post (USD)</label>
            <input style={inputStyle} type="number" value={form.price_per_post} onChange={e => setForm(f => ({ ...f, price_per_post: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle2}>Country</label>
            <input style={inputStyle} value={form.geo_country} onChange={e => setForm(f => ({ ...f, geo_country: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle2}>Category</label>
            <input style={inputStyle} value={form.account_category} onChange={e => setForm(f => ({ ...f, account_category: e.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="verif" checked={form.is_verified} onChange={e => setForm(f => ({ ...f, is_verified: e.target.checked }))} />
            <label htmlFor="verif" style={{ ...labelStyle2, margin: 0, cursor: 'pointer' }}>Verified creator</label>
          </div>
        </div>
        {err && <div style={{ marginTop: 12, color: '#f4574d', fontSize: 12 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid #1d2433', borderRadius: 8, color: '#98a2b3', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#5710fc', border: 'none', borderRadius: 8, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? .6 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CreatorDiscovery({
  userInitials, initialCreators, initialTotal, categories, countries, isAdmin = false,
}: {
  userInitials?: string
  initialCreators: Creator[]
  initialTotal: number
  categories: string[]
  countries: Country[]
  isAdmin?: boolean
}) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [mode,      setMode]      = useState<Mode>('discover')
  const [layout,    setLayout]    = useState<'grid' | 'list'>('grid')
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState('followers')
  const [pageSize,  setPageSize]  = useState<25 | 50 | 100>(25)
  const [page,      setPage]      = useState(0)
  const [creators,  setCreators]  = useState<Creator[]>(initialCreators)
  const [total,     setTotal]     = useState(initialTotal)
  const [loading,   setLoading]   = useState(false)
  const [catSearch, setCatSearch] = useState('')

  const [inviteTarget,   setInviteTarget]   = useState<Creator | null>(null)
  const [bidOfferTarget, setBidOfferTarget] = useState<Creator | null>(null)
  const [editTarget,     setEditTarget]     = useState<Creator | null>(null)

  function handleAdminDelete(creatorId: string) {
    if (!confirm('Delete this creator? This cannot be undone.')) return
    fetch(`/api/admin/creators?id=${creatorId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(json => {
        if (json.success) setCreators(prev => prev.filter(c => c.id !== creatorId))
      })
      .catch(console.error)
  }

  function handleAdminSaved(updated: Creator) {
    setCreators(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditTarget(null)
  }

  // Pending (sidebar) filters — committed on Apply
  const [pPlatforms,  setPPlatforms]  = useState<Set<Platform>>(new Set())
  const [pMinF,       setPMinF]       = useState(0)
  const [pMaxF,       setPMaxF]       = useState(0)
  const [pMinE,       setPMinE]       = useState(0)
  const [pCategories, setPCategories] = useState<Set<string>>(new Set())
  const [pCountries,  setPCountries]  = useState<Set<string>>(new Set())
  const [countrySearch, setCountrySearch] = useState('')

  // Applied filters
  const [filters, setFilters] = useState<Filters>({
    platforms: new Set(), minF: 0, maxF: 0, minE: 0, categories: new Set(), countries: new Set(),
  })

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doFetch = useCallback(async (pg: number, f: Filters, s: string, so: string, ps: number) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page',     String(pg))
      params.set('pageSize', String(ps))
      params.set('sort',     so)
      if (s.trim())           params.set('search',     s.trim())
      if (f.minF > 0)         params.set('minF',       String(f.minF))
      if (f.maxF > 0)         params.set('maxF',       String(f.maxF))
      if (f.minE > 0)         params.set('minE',       String(f.minE))
      if (f.platforms.size)   params.set('platforms',  [...f.platforms].join(','))
      if (f.categories.size)  params.set('categories', [...f.categories].join('||'))
      if (f.countries.size)   params.set('countries',  [...f.countries].join(','))

      const res  = await fetch(`/api/creators?${params}`, { signal: abortRef.current.signal })
      const json = await res.json()

      if (res.ok) {
        setCreators(json.creators ?? [])
        setTotal(json.total ?? 0)
      } else {
        console.error('Creator fetch error:', json.error)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e)
    }
    setLoading(false)
  }, [])

  // Single consolidated effect — watch everything
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const delay = search ? 400 : 0
    timerRef.current = setTimeout(() => {
      void doFetch(page, filters, search, sort, pageSize)
    }, delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [page, filters, search, sort, pageSize, doFetch])

  function applyFilters() {
    const f: Filters = {
      platforms:  new Set(pPlatforms),
      minF:       pMinF,
      maxF:       pMaxF,
      minE:       pMinE,
      categories: new Set(pCategories),
      countries:  new Set(pCountries),
    }
    setFilters(f)
    setPage(0)
  }

  function resetFilters() {
    setPPlatforms(new Set()); setPMinF(0); setPMaxF(0); setPMinE(0)
    setPCategories(new Set()); setPCountries(new Set())
    setFilters({ platforms: new Set(), minF: 0, maxF: 0, minE: 0, categories: new Set(), countries: new Set() })
    setPage(0)
  }

  function setPreset(p: { min: number; max: number }) {
    setPMinF(p.min); setPMaxF(p.max)
  }

  const totalPages  = Math.max(1, Math.ceil(total / pageSize))
  const pgStart     = Math.max(0, page - 2)
  const pgEnd       = Math.min(totalPages - 1, pgStart + 4)
  const activeFilters = filters.platforms.size + filters.categories.size + filters.countries.size
    + (filters.minF > 0 ? 1 : 0) + (filters.minE > 0 ? 1 : 0)

  const filteredCats     = categories.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()))
  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  // ── Sidebar ─────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{ width: 260, flexShrink: 0, background: T.side, borderRight: `1px solid ${T.border}`, height: 'calc(100vh - 64px)', overflowY: 'auto', position: 'sticky', top: 64 }}>
      <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {activeFilters > 0 && (
          <div style={{ background: '#1d1145', border: '1px solid #3b1f8a', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#a78bfa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{activeFilters} filter{activeFilters > 1 ? 's' : ''} active</span>
            <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>Clear all</button>
          </div>
        )}

        {/* Platform */}
        <div>
          <p style={labelStyle}>Platform</p>
          {(['youtube', 'instagram', 'tiktok'] as Platform[]).map(p => {
            const checked = pPlatforms.has(p)
            const cfg = PLAT[p]
            return (
              <label key={p} onClick={() => { const n = new Set(pPlatforms); checked ? n.delete(p) : n.add(p); setPPlatforms(n) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? cfg.c : T.border}`, background: checked ? cfg.c : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {checked && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" width="9" height="9"><path d="M5 12l5 5L20 6"/></svg>}
                </div>
                <span style={{ color: cfg.c, fontWeight: 600, fontSize: 13 }}>{cfg.label}</span>
              </label>
            )
          })}
        </div>

        {/* Followers range */}
        <div>
          <p style={labelStyle}>Followers / Subscribers</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {F_PRESETS.map(pr => {
              const active = pMinF === pr.min && pMaxF === pr.max
              return (
                <button key={pr.label} onClick={() => setPreset(pr)}
                  style={chipStyle(active, T.purple, '#1d1145', '#a78bfa')}>{pr.label}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: T.faint, display: 'block', marginBottom: 3 }}>Min</label>
              <input type="number" value={pMinF || ''} onChange={e => setPMinF(parseInt(e.target.value) || 0)}
                placeholder="0"
                style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 7px', color: T.text, fontSize: 12, outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: T.faint, display: 'block', marginBottom: 3 }}>Max</label>
              <input type="number" value={pMaxF || ''} onChange={e => setPMaxF(parseInt(e.target.value) || 0)}
                placeholder="No limit"
                style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 7px', color: T.text, fontSize: 12, outline: 'none' }} />
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div>
          <p style={labelStyle}>Engagement Rate</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ENG_OPTS.map(o => (
              <button key={o.v} onClick={() => setPMinE(o.v)} style={chipStyle(pMinE === o.v, T.green, '#052e16', '#4ade80')}>{o.label}</button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <p style={labelStyle}>Category {pCategories.size > 0 && <span style={{ color: '#a78bfa' }}>({pCategories.size})</span>}</p>
          <input
            type="text" placeholder="Search categories…" value={catSearch} onChange={e => setCatSearch(e.target.value)}
            style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', color: T.text, fontSize: 12, marginBottom: 7, outline: 'none' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
            {filteredCats.map(cat => {
              const on = pCategories.has(cat)
              return (
                <button key={cat} onClick={() => { const n = new Set(pCategories); on ? n.delete(cat) : n.add(cat); setPCategories(n) }}
                  style={chipStyle(on, T.purple, '#1d1145', '#a78bfa')}>{cat}</button>
              )
            })}
          </div>
        </div>

        {/* Country */}
        <div>
          <p style={labelStyle}>Country {pCountries.size > 0 && <span style={{ color: '#a78bfa' }}>({pCountries.size})</span>}</p>
          <input
            type="text" placeholder="Search countries…" value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
            style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', color: T.text, fontSize: 12, marginBottom: 7, outline: 'none' }}
          />
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filteredCountries.map(c => {
              const checked = pCountries.has(c.name)
              return (
                <label key={c.name} onClick={() => { const n = new Set(pCountries); checked ? n.delete(c.name) : n.add(c.name); setPCountries(n) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? T.purple : T.border}`, background: checked ? T.purple : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {checked && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" width="7" height="7"><path d="M5 12l5 5L20 6"/></svg>}
                  </div>
                  <span style={{ fontSize: 12, color: T.dim, flex: 1 }}>{c.flag} {c.name}</span>
                  <span style={{ fontSize: 10, color: T.faint }}>{fmt(c.cnt)}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Buttons */}
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

      {/* ── Top Bar ──────────────────────────────────────────── */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 20, padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.side, position: 'sticky', top: 0, zIndex: 20 }}>
        <a href="/dashboard/brand/discover" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 15 }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>ADMIS</span>
        </a>

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: T.elev, borderRadius: 10, padding: 3, gap: 2, marginLeft: 12 }}>
          {[
            { key: 'discover', label: '🔍 Find & Bid',     desc: 'Discover creators and make offers' },
            { key: 'contact',  label: '📋 Contact Sheet',  desc: 'View profile links and details' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key as Mode)} title={m.desc}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: mode === m.key ? `linear-gradient(135deg,${T.purple},${T.purpleL})` : 'transparent',
                color: mode === m.key ? '#fff' : T.dim, transition: 'all .15s' }}>
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: '#1d1145', color: '#a78bfa', border: '1px solid #3b1f8a', padding: '3px 10px', borderRadius: 20 }}>Brand</span>
          <button onClick={signOut} style={{ fontSize: 12, color: T.dim, background: 'none', border: `1px solid ${T.border}`, cursor: 'pointer', padding: '5px 12px', borderRadius: 8 }}>Sign out</button>
          <div onClick={() => router.push('/dashboard/brand/profile')} title="Brand dashboard"
            style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${T.purple},#a855f7)`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            {userInitials ?? 'B'}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex' }}>
        {Sidebar}

        <main style={{ flex: 1, padding: '24px 28px', minWidth: 0 }}>
          {/* Page header */}
          <div style={{ marginBottom: 18 }}>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, background: '#1d1145', color: '#a78bfa', border: '1px solid #3b1f8a', padding: '2px 10px', borderRadius: 20, marginBottom: 6 }}>
              {mode === 'discover' ? 'Discover & Bid' : 'Contact Sheet'}
            </span>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
              {mode === 'discover' ? 'Find Creators' : 'Creator Contacts'}
            </h1>
            <div style={{ color: T.dim, fontSize: 13 }}>
              {loading ? 'Searching…' : `${total.toLocaleString()} creators`}
              {activeFilters > 0 && <span style={{ color: '#a78bfa', marginLeft: 6 }}>· {activeFilters} filter{activeFilters > 1 ? 's' : ''} applied</span>}
            </div>
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 200px', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.faint }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or @username…"
                style={{ width: '100%', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px 8px 32px', color: T.text, fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '0 10px', height: 38 }}>
              <span style={{ color: T.dim, fontSize: 12 }}>Sort:</span>
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(0) }} style={{ background: 'transparent', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', outline: 'none' }}>
                <option value="followers">Followers</option>
                <option value="subscribers">Subscribers (YT)</option>
                <option value="engagement_rate">Engagement</option>
                <option value="avg_likes">Avg Likes</option>
                <option value="reels_plays">Avg Views</option>
              </select>
            </div>
            {mode === 'discover' && (
              <div style={{ display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {(['grid', 'list'] as const).map(l => (
                  <button key={l} onClick={() => setLayout(l)} style={{ padding: '8px 13px', background: layout === l ? T.elev : 'transparent', color: layout === l ? T.text : T.dim, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {l === 'grid' ? '⊞' : '≡'} {l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {([25, 50, 100] as const).map(n => (
                <button key={n} onClick={() => { setPageSize(n); setPage(0) }} style={{ padding: '8px 12px', background: pageSize === n ? '#1d1145' : 'transparent', color: pageSize === n ? '#a78bfa' : T.dim, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <SkeletonGrid count={Math.min(pageSize, 12)} layout={mode === 'contact' ? 'list' : layout} />
          ) : creators.length === 0 ? (
            <EmptyState />
          ) : mode === 'discover' ? (
            <div style={{
              display: layout === 'grid' ? 'grid' : 'flex',
              gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(265px, 1fr))' : undefined,
              flexDirection: layout === 'list' ? 'column' : undefined,
              gap: 12,
            }}>
              {creators.map(c => <CreatorCard key={c.id} creator={c} layout={layout} onContact={() => setInviteTarget(c)} onBid={() => setBidOfferTarget(c)} isAdmin={isAdmin} onEdit={() => setEditTarget(c)} onDelete={() => handleAdminDelete(c.id)} />)}
            </div>
          ) : (
            <ContactSheet creators={creators} onBid={c => setBidOfferTarget(c)} onContact={c => setInviteTarget(c)} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, paddingBottom: 28 }}>
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

      <InviteModal open={!!inviteTarget} onClose={() => setInviteTarget(null)} creator={inviteTarget} />
      <BidOfferModal open={!!bidOfferTarget} onClose={() => setBidOfferTarget(null)} creator={bidOfferTarget} estimatedPrice={bidOfferTarget?.price_per_post ?? null} />
      {editTarget && <AdminEditModal creator={editTarget} onClose={() => setEditTarget(null)} onSaved={handleAdminSaved} />}

      {/* ── AI Chat Assistant ── */}
      <ChatbotPopup />
    </div>
  )
}

// ─── Contact Sheet ────────────────────────────────────────────
interface ContactInfo { email?: string; phone?: string; whatsapp?: string }

function ContactSheet({ creators, onBid, onContact }: { creators: Creator[]; onBid: (c: Creator) => void; onContact: (c: Creator) => void }) {
  const supabase   = useMemo(() => createClient(), [])
  const [copied,   setCopied]    = useState<string | null>(null)
  const [contacts, setContacts]  = useState<Map<string, ContactInfo>>(new Map())

  // Fetch real contact data from creator_contacts for loaded creators
  useEffect(() => {
    if (creators.length === 0) return
    const ids = creators.map(c => c.id)
    supabase
      .from('creator_contacts')
      .select('creator_id, contact_type, contact_value')
      .in('creator_id', ids)
      .in('contact_type', ['email', 'phone', 'whatsapp'])
      .then(({ data }) => {
        const map = new Map<string, ContactInfo>()
        ;(data ?? []).forEach(row => {
          const existing: ContactInfo = map.get(row.creator_id) ?? {}
          if (row.contact_type === 'email'    && !existing.email)    existing.email    = row.contact_value
          if (row.contact_type === 'phone'    && !existing.phone)    existing.phone    = row.contact_value
          if (row.contact_type === 'whatsapp' && !existing.whatsapp) existing.whatsapp = row.contact_value
          map.set(row.creator_id, existing)
        })
        setContacts(map)
      })
  }, [creators])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500) })
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.elev, borderBottom: `1px solid ${T.border}` }}>
              {['Creator', 'Platform', 'Followers', 'Eng Rate', 'Category', 'Country', 'Channel / Profile + Contacts', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {creators.map((c, i) => {
              const pcfg     = PLAT[c.platform] ?? PLAT.instagram
              const followers = getFollowers(c)
              const engRaw   = parseFloat((c.engagement_rate ?? '0') as string)
              const engPct   = engRaw < 1 ? engRaw * 100 : engRaw
              const profileLink = c.profile_url
                ?? (c.platform === 'instagram' ? `https://instagram.com/${c.username}` : c.platform === 'youtube' ? `https://youtube.com/@${c.username}` : `https://tiktok.com/@${c.username}`)
              const contact  = contacts.get(c.id) ?? {}

              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? 'transparent' : `${T.elev}55` }}>
                  {/* Creator */}
                  <td style={{ padding: '12px 14px', minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar creator={c} size={34} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>
                          {c.full_name || c.username || '—'}
                          {c.is_verified && <span style={{ marginLeft: 5, fontSize: 10, background: '#1d1145', color: '#a78bfa', padding: '1px 5px', borderRadius: 8 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 11, color: T.faint }}>@{c.username}</div>
                      </div>
                    </div>
                  </td>

                  {/* Platform */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${pcfg.c}22`, color: pcfg.c }}>{pcfg.label}</span>
                  </td>

                  {/* Followers */}
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#6b7dff', whiteSpace: 'nowrap' }}>
                    {fmt(followers)}
                  </td>

                  {/* Engagement */}
                  <td style={{ padding: '12px 14px', color: engPct > 5 ? T.green : engPct > 2 ? T.amber : T.dim, fontWeight: 600 }}>
                    {engPct > 0 ? engPct.toFixed(1) + '%' : '—'}
                  </td>

                  {/* Category */}
                  <td style={{ padding: '12px 14px', color: T.dim, fontSize: 12, maxWidth: 140 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.account_category ?? '—'}
                    </div>
                  </td>

                  {/* Country */}
                  <td style={{ padding: '12px 14px', color: T.dim, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {c.geo_country ?? '—'}
                    {c.geo_city && <span style={{ color: T.faint }}>, {c.geo_city}</span>}
                  </td>

                  {/* Channel link + contacts */}
                  <td style={{ padding: '12px 14px', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <a href={profileLink} target="_blank" rel="noreferrer"
                        style={{ color: '#6b7dff', fontSize: 12, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}
                        title={profileLink}>
                        {c.username ?? 'View profile'}
                      </a>
                      <button onClick={() => copy(profileLink, c.id + 'url')}
                        style={{ padding: '3px 7px', borderRadius: 5, border: `1px solid ${T.border}`, background: copied === c.id + 'url' ? T.green + '33' : T.elev, color: copied === c.id + 'url' ? T.green : T.faint, fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>
                        {copied === c.id + 'url' ? '✓' : '⎘'}
                      </button>
                    </div>
                    {/* Email from creator_contacts */}
                    {contact.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: T.amber }}>✉ {contact.email}</span>
                        <button onClick={() => copy(contact.email!, c.id + 'email')}
                          style={{ padding: '2px 5px', borderRadius: 4, border: `1px solid ${T.border}`, background: copied === c.id + 'email' ? T.amber + '33' : T.elev, color: copied === c.id + 'email' ? T.amber : T.faint, fontSize: 9, cursor: 'pointer' }}>
                          {copied === c.id + 'email' ? '✓' : '⎘'}
                        </button>
                      </div>
                    )}
                    {/* Phone from creator_contacts */}
                    {contact.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: T.green }}>📞 {contact.phone}</span>
                        <button onClick={() => copy(contact.phone!, c.id + 'phone')}
                          style={{ padding: '2px 5px', borderRadius: 4, border: `1px solid ${T.border}`, background: copied === c.id + 'phone' ? T.green + '33' : T.elev, color: copied === c.id + 'phone' ? T.green : T.faint, fontSize: 9, cursor: 'pointer' }}>
                          {copied === c.id + 'phone' ? '✓' : '⎘'}
                        </button>
                      </div>
                    )}
                    {!contact.email && !contact.phone && (
                      <div style={{ fontSize: 10, color: T.faint, marginTop: 3, fontStyle: 'italic' }}>No contacts on file</div>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      <button onClick={() => onContact(c)}
                        style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${T.border}`, background: 'transparent', color: T.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        💬 Message
                      </button>
                      <button onClick={() => onBid(c)}
                        style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#f5a623,#e8920f)', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Bid →
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Creator Card (Discover mode) ────────────────────────────
function CreatorCard({ creator: c, layout, onContact, onBid, isAdmin = false, onEdit, onDelete }: {
  creator: Creator; layout: 'grid' | 'list'; onContact: () => void; onBid: () => void
  isAdmin?: boolean; onEdit?: () => void; onDelete?: () => void
}) {
  const [hov, setHov] = useState(false)
  const pcfg     = PLAT[c.platform] ?? PLAT.instagram
  const followers = getFollowers(c)
  const views    = getViews(c)
  const s        = score(c)
  const sc       = scoreColor(s)
  const name     = c.full_name || c.username || 'Unknown'
  const handle   = c.username ? `@${c.username.replace('@', '')}` : ''
  const hasPrice = c.price_per_post != null

  if (layout === 'list') {
    return (
      <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${pcfg.c}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, transition: 'background .12s' }}>
        <Avatar creator={c} size={38} />
        <div style={{ flex: '0 0 170px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            {c.is_verified && <span style={{ fontSize: 9, background: '#1d1145', color: '#a78bfa', padding: '1px 5px', borderRadius: 8 }}>✓</span>}
          </div>
          <div style={{ color: T.faint, fontSize: 11 }}>{handle}</div>
        </div>
        <div style={{ flex: '0 0 130px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${pcfg.c}22`, color: pcfg.c }}>{pcfg.label}</span>
          {c.account_category && <div style={{ fontSize: 10, color: T.faint, marginTop: 3 }}>{c.account_category}</div>}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 24, justifyContent: 'center' }}>
          <Stat label="Followers" value={fmt(followers)} color="#6b7dff" />
          <Stat label="Avg Views" value={fmt(views)}     color={T.dim} />
          <Stat label="Eng Rate"  value={fmtEng(c.engagement_rate)} color={T.green} />
        </div>
        <div style={{ flex: '0 0 110px', textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: T.faint, marginBottom: 2 }}>Price / post</div>
          {hasPrice ? <div style={{ fontWeight: 800, fontSize: 14, color: T.amber }}>${c.price_per_post!.toLocaleString()}</div> : <div style={{ fontSize: 11, color: T.faint }}>Not listed</div>}
        </div>
        <ScoreBadge s={s} sc={sc} />
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onContact} style={ghostBtn}>Message</button>
          <button onClick={onBid} style={bidBtnStyle}>Bid Price →</button>
          {isAdmin && <>
            <button onClick={onEdit} style={{ ...ghostBtn, color: '#f5a623', borderColor: '#f5a623' }} title="Edit">✏</button>
            <button onClick={onDelete} style={{ ...ghostBtn, color: '#f4574d', borderColor: '#f4574d' }} title="Delete">🗑</button>
          </>}
        </div>
      </article>
    )
  }

  return (
    <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', transition: 'background .12s, box-shadow .12s', boxShadow: hov ? '0 4px 20px rgba(0,0,0,.4)' : 'none' }}>
      <div style={{ height: 3, background: pcfg.g }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <Avatar creator={c} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              {c.is_verified && <span style={{ fontSize: 9, background: '#1d1145', color: '#a78bfa', padding: '1px 5px', borderRadius: 8 }}>✓</span>}
            </div>
            <div style={{ color: T.faint, fontSize: 11, marginBottom: 5 }}>{handle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: `${pcfg.c}22`, color: pcfg.c }}>{pcfg.label}</span>
              <span style={{ fontSize: 10, color: T.faint }}>{c.geo_country}{c.account_category ? ` · ${c.account_category}` : ''}</span>
            </div>
          </div>
          <ScoreBadge s={s} sc={sc} />
        </div>
        <div style={{ display: 'flex', background: T.side, borderRadius: 10, padding: '9px 4px', marginBottom: 12, justifyContent: 'space-around' }}>
          <Stat label="Followers" value={fmt(followers)} color="#6b7dff" />
          <div style={{ width: 1, background: T.border }} />
          <Stat label="Avg Views" value={fmt(views)}     color={T.dim} />
          <div style={{ width: 1, background: T.border }} />
          <Stat label="Eng Rate"  value={fmtEng(c.engagement_rate)} color={T.green} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '.06em' }}>Price / post</span>
          {hasPrice ? <span style={{ fontWeight: 800, fontSize: 17, color: T.amber }}>${c.price_per_post!.toLocaleString()}</span> : <span style={{ fontSize: 11, color: T.faint }}>Not listed</span>}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={onContact} style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}>Message</button>
          <button onClick={onBid}     style={{ ...bidBtnStyle, flex: 1, justifyContent: 'center' }}>Bid Price →</button>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={onEdit}   style={{ flex: 1, padding: '6px', background: '#1a1400', border: '1px solid #f5a623', borderRadius: 7, color: '#f5a623', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>✏ Edit</button>
            <button onClick={onDelete} style={{ flex: 1, padding: '6px', background: '#1a0000', border: '1px solid #f4574d', borderRadius: 7, color: '#f4574d', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>🗑 Delete</button>
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function Avatar({ creator: c, size }: { creator: Creator; size: number }) {
  const pcfg = PLAT[c.platform] ?? PLAT.instagram
  const [err, setErr] = useState(false)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${pcfg.c}22`, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden', border: `1.5px solid ${pcfg.c}44` }}>
      {c.picture_url && !err
        ? <img src={c.picture_url} alt="" width={size} height={size} style={{ objectFit: 'cover', width: '100%', height: '100%' }} onError={() => setErr(true)} />
        : <span style={{ fontWeight: 700, fontSize: size * 0.35, color: pcfg.c }}>{ini(c)}</span>}
    </div>
  )
}

function ScoreBadge({ s, sc }: { s: number; sc: string }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: `${sc}22`, border: `1px solid ${sc}44`, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, color: sc }}>
      {s}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color }}>{value}</div>
      <div style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function PagBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ minWidth: 34, height: 34, padding: '0 10px', borderRadius: 8, border: `1px solid ${active ? T.purple : T.border}`, background: active ? '#1d1145' : 'transparent', color: active ? '#a78bfa' : disabled ? T.faint : T.dim, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
      {children}
    </button>
  )
}

function SkeletonGrid({ count, layout }: { count: number; layout: 'grid' | 'list' }) {
  return (
    <div style={{ display: layout === 'grid' ? 'grid' : 'flex', gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fill, minmax(265px, 1fr))' : undefined, flexDirection: layout === 'list' ? 'column' : undefined, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, height: layout === 'grid' ? 190 : 62, opacity: 0.3 + (i % 3) * 0.1 }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '70px 0', color: T.dim }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🔍</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>No creators found</p>
      <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your filters or search</p>
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: T.faint,
  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px',
}

const ghostBtn: React.CSSProperties = {
  padding: '7px 11px', borderRadius: 8, border: `1px solid ${T.border}`,
  background: 'transparent', color: T.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer',
}

const bidBtnStyle: React.CSSProperties = {
  padding: '7px 11px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg,#f5a623,#e8920f)', color: '#000',
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
}

function chipStyle(active: boolean, accentBorder: string, accentBg: string, accentText: string): React.CSSProperties {
  return {
    padding: '4px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? accentBorder : T.border}`,
    background: active ? accentBg : 'transparent',
    color: active ? accentText : T.dim,
  }
}
