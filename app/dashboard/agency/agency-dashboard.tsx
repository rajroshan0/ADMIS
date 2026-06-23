'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Theme (light, matches creator profile) ───────────────────────────────────
const T = {
  bg: '#f7f8fa', card: '#fff', border: '#e5e7eb',
  text: '#111827', dim: '#6b7280', faint: '#9ca3af',
  green: '#16a34a', greenBg: '#dcfce7', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fef3c7', amberBorder: '#fde68a',
  red: '#dc2626', redBg: '#fee2e2', redBorder: '#fecaca',
  blue: '#2563eb', blueBg: '#eff6ff',
  purple: '#7c3aed', purpleBg: '#ede9fe', purpleBorder: '#ddd6fe',
  teal: '#0d9488',
}

const PLAT_META: Record<string, { label: string; bg: string; color: string; short: string }> = {
  youtube:   { label: 'YouTube',   bg: '#fee2e2', color: '#dc2626', short: 'YT' },
  instagram: { label: 'Instagram', bg: '#fce7f3', color: '#be185d', short: 'IG' },
  tiktok:    { label: 'TikTok',    bg: '#f0fdf4', color: '#15803d', short: 'TK' },
  twitter:   { label: 'Twitter/X', bg: '#eff6ff', color: '#1d4ed8', short: 'TW' },
  other:     { label: 'Other',     bg: '#f3f4f6', color: '#374151', short: '??' },
}

function fmtFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}
function fmtAmount(n: number | null) {
  if (!n) return 'Negotiable'
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}
function daysLeft(d: string | null) {
  if (!d) return ''
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return 'Closed'
  if (diff === 0) return 'Today'
  return `${diff}d left`
}

// ─── Complete-agency inline form ──────────────────────────────────────────────
function CompleteAgencyForm({ email }: { email: string }) {
  const router = useRouter()
  const PLATS  = ['YouTube','Instagram','TikTok','Twitter/X','Facebook','Other']
  const [name,    setName]    = useState('')
  const [contact, setContact] = useState('')
  const [phone,   setPhone]   = useState('')
  const [plat,    setPlat]    = useState('')
  const [handle,  setHandle]  = useState('')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())    { setErr('Agency name required'); return }
    if (!contact.trim()) { setErr('Contact name required'); return }
    if (!plat || !handle.trim()) { setErr('Add at least one social handle'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/onboarding/agency', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName:   name.trim(),
          contactName:  contact.trim(),
          contactPhone: phone.trim() || undefined,
          socialHandles: [{ platform: plat.toLowerCase(), username: handle.trim() }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Complete your agency profile</div>
      <div style={{ fontSize: 13, color: T.dim, marginBottom: 24 }}>Your account ({email}) is ready but we need a few more details.</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Agency name *">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. InfMax Agency" style={inp} />
        </Field>
        <Field label="Your name (contact) *">
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Alex Sharma" style={inp} />
        </Field>
        <Field label="Phone (optional)">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98000 00000" style={inp} />
        </Field>
        <Field label="Primary platform *">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PLATS.map(p => (
              <button key={p} type="button" onClick={() => setPlat(p)}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${plat === p ? T.text : T.border}`,
                  background: plat === p ? T.text : '#f3f4f6', color: plat === p ? '#fff' : T.dim }}>
                {p}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Social handle / URL *">
          <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@youragency or profile URL" style={inp} />
        </Field>
        {err && <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '8px 12px' }}>{err}</div>}
        <button type="submit" disabled={loading}
          style={{ padding: 12, border: 'none', borderRadius: 10, background: T.text, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
          {loading ? 'Saving…' : 'Save agency profile →'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.dim, display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}
const inp: React.CSSProperties = {
  width: '100%', border: `1px solid ${T.border}`, borderRadius: 8,
  padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: T.text,
}

// ─── Bid modal ────────────────────────────────────────────────────────────────
function BidModal({ campaign, managed, onClose }: {
  campaign: any; managed: any[]; onClose: () => void
}) {
  const [amount,  setAmount]  = useState('')
  const [note,    setNote]    = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [err,     setErr]     = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount) { setErr('Enter a bid amount'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/bids', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, amount: parseInt(amount), message: note, submittedByAgency: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit bid')
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', display: 'grid', placeItems: 'center', zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 420, maxWidth: '92vw', boxShadow: '0 20px 60px #0002' }}
        onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 6 }}>Bid submitted!</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>The brand will review your agency's application.</div>
            <button onClick={onClose} style={{ padding: '10px 28px', border: 'none', borderRadius: 8, background: T.text, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 4 }}>Apply to campaign</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 4 }}>{campaign.title}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
              background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}`,
              padding: '3px 10px', borderRadius: 20, marginBottom: 18 }}>
              🏢 Agency application · 10% commission applies
            </div>
            <Field label="Your bid amount ($) *">
              <div style={{ display: 'flex' }}>
                <span style={{ padding: '9px 12px', background: '#f3f4f6', border: `1px solid ${T.border}`, borderRight: 'none', borderRadius: '8px 0 0 8px', color: T.dim }}>$</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" min={1}
                  style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: '0 8px 8px 0', padding: '9px 12px', fontSize: 14, outline: 'none', color: T.text }} />
              </div>
            </Field>
            <div style={{ marginTop: 12 }}>
              <Field label="Cover note (optional)">
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Tell the brand about your agency and what you can deliver…"
                  style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
              </Field>
            </div>
            {managed.length > 0 && (
              <div style={{ marginTop: 12, background: '#f9fafb', border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 8 }}>CREATORS IN YOUR ROSTER</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {managed.slice(0, 6).map((m: any) => (
                    <span key={m.creators?.id} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20,
                      background: '#e0e7ff', color: '#4338ca', fontWeight: 500 }}>
                      {m.creators?.full_name ?? 'Creator'}
                    </span>
                  ))}
                  {managed.length > 6 && <span style={{ fontSize: 12, color: T.faint }}>+{managed.length - 6} more</span>}
                </div>
              </div>
            )}
            {err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '8px 12px' }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, background: '#f3f4f6', color: T.dim, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={loading}
                style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: T.text, color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
                {loading ? 'Submitting…' : 'Submit agency bid'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Add Creator Modal ────────────────────────────────────────────────────────
function AddCreatorModal({ onClose, onAdded }: { onClose: () => void; onAdded: (c: any) => void }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [adding,  setAdding]  = useState<string | null>(null)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function search() {
    if (!query.trim()) return
    setLoading(true); setResults([])
    const res = await fetch(`/api/agency/add-creator?q=${encodeURIComponent(query.trim())}`)
    const data = await res.json()
    setResults(data.results ?? [])
    setLoading(false)
    if ((data.results ?? []).length === 0) setMsg({ ok: false, text: 'No creators found. Try a different name or username.' })
    else setMsg(null)
  }

  async function addCreator(creatorId: string) {
    setAdding(creatorId); setMsg(null)
    const res = await fetch('/api/agency/add-creator', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: results.find(r => r.id === creatorId)?.username ?? creatorId }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? 'Failed' }); setAdding(null); return }
    setMsg({ ok: true, text: data.message })
    onAdded(data.creator)
    setAdding(null)
  }

  const VSTATUS: Record<string, { label: string; color: string }> = {
    verified:   { label: 'Verified',   color: T.green },
    pending:    { label: 'Pending',    color: T.amber },
    unverified: { label: 'Unverified', color: T.faint },
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', display: 'grid', placeItems: 'center', zIndex: 200, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 460, maxWidth: '100%', boxShadow: '0 20px 60px #0002' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 4 }}>Add creator to roster</div>
        <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>
          Search by name or username. The creator will receive a notification to accept.
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            autoFocus value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search creator name or @username…"
            style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', color: T.text }}
          />
          <button onClick={search} disabled={loading}
            style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: T.text, color: '#fff', fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {results.map(c => {
              const vs = VSTATUS[c.verification_status ?? 'unverified'] ?? VSTATUS.unverified
              const ini = (c.full_name ?? c.username ?? '??').slice(0, 2).toUpperCase()
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#4338ca', flexShrink: 0 }}>
                    {ini}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{c.full_name ?? 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: T.dim }}>
                      {c.username ? `@${c.username}` : '—'}
                      {' · '}
                      <span style={{ color: vs.color, fontWeight: 600 }}>{vs.label}</span>
                    </div>
                  </div>
                  <button onClick={() => addCreator(c.id)} disabled={adding === c.id}
                    style={{ padding: '6px 16px', border: 'none', borderRadius: 7, background: T.purple, color: '#fff', fontWeight: 600, fontSize: 12, cursor: adding === c.id ? 'not-allowed' : 'pointer', opacity: adding === c.id ? .6 : 1, flexShrink: 0 }}>
                    {adding === c.id ? '…' : 'Invite'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {msg && (
          <div style={{ fontSize: 13, color: msg.ok ? T.green : T.red, background: msg.ok ? T.greenBg : T.redBg, border: `1px solid ${msg.ok ? T.greenBorder : T.redBorder}`, borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>
            {msg.text}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4 }}>
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>💡 Creator must accept your invite before they appear as active in your roster.</div>
          <button onClick={onClose} style={{ padding: '8px 20px', border: `1px solid ${T.border}`, borderRadius: 8, background: '#f3f4f6', color: T.dim, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AgencyDashboard({ user, agency, managed, campaigns, applications, deals, initials }: {
  user: { id: string; email: string }
  agency: any | null
  managed: any[]
  campaigns: any[]
  applications: any[]
  deals: any[]
  initials: string
}) {
  const router   = useRouter()
  const supabase = createClient()
  const [tab, setTab]             = useState<'discover' | 'roster' | 'applications' | 'deals' | 'profile'>('discover')
  const [bidTarget, setBidTarget] = useState<any | null>(null)
  const [search, setSearch]       = useState('')
  const [showAddCreator, setShowAddCreator] = useState(false)
  const [managedList, setManagedList]       = useState<any[]>(managed)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // No agency record → show completion form
  if (!agency) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text }}>
        <header style={{ height: 56, background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>ADMIS</div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: T.dim, cursor: 'pointer' }} onClick={signOut}>Sign out</div>
        </header>
        <CompleteAgencyForm email={user.email} />
      </div>
    )
  }

  const totalReach = managed.reduce((s: number, m: any) => {
    const handles: any[] = m.creators?.creator_social_handles ?? []
    return s + handles.reduce((hs: number, h: any) => hs + (h.followers ?? 0), 0)
  }, 0)

  const filtered = campaigns.filter(c =>
    !search || (c.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.brands?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const newApps = applications.filter((a: any) => a.status === 'applied').length
  const activeDeals = deals.filter((d: any) => d.status === 'active').length
  const [appFilter,  setAppFilter]  = useState('all')
  const [dealFilter, setDealFilter] = useState('all')

  const NAV = [
    { key: 'discover',     label: 'Discover',        badge: 0 },
    { key: 'roster',       label: 'My roster',       badge: 0 },
    { key: 'applications', label: 'My Applications', badge: newApps },
    { key: 'deals',        label: 'Deals',           badge: activeDeals },
    { key: 'profile',      label: 'Agency profile',  badge: 0 },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text, display: 'flex' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{ width: 220, background: T.card, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '12px 0 28px', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        {/* Platform logo → home */}
        <div onClick={() => router.push('/dashboard/agency')}
          style={{ padding: '0 20px 14px', borderBottom: `1px solid ${T.border}`, marginBottom: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.text }}>ADMIS</span>
        </div>
        <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.purpleBg,
            display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: T.purple, marginBottom: 10 }}>
            {initials}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{agency.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
            fontSize: 11, fontWeight: 700, background: T.purpleBg, color: T.purple,
            border: `1px solid ${T.purpleBorder}`, padding: '2px 9px', borderRadius: 20 }}>
            🏢 Agency
          </div>
          <div style={{ fontSize: 12, color: T.dim, marginTop: 6 }}>
            {managed.length} creator{managed.length !== 1 ? 's' : ''} managed
          </div>
        </div>

        <nav style={{ padding: '20px 12px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 8px', marginBottom: 6 }}>Menu</div>
          {NAV.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 14,
                fontWeight: tab === item.key ? 600 : 400, color: tab === item.key ? T.text : T.dim,
                background: tab === item.key ? '#f3f4f6' : 'transparent', border: 'none', cursor: 'pointer', marginBottom: 2 }}>
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: T.purple, color: '#fff', padding: '1px 7px', borderRadius: 20 }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 8px', marginBottom: 6 }}>Account</div>
          <button onClick={signOut}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 14, color: T.red, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '32px 40px', minWidth: 0 }}>

        {/* ── Discover campaigns ──────────────────────────── */}
        {tab === 'discover' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}`,
                padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>
                🏢 Agency workspace
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Discover campaigns</h1>
              <p style={{ fontSize: 14, color: T.dim, margin: 0 }}>
                Apply on behalf of your agency. Your 10% commission is added transparently.
              </p>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Creators managed', value: String(managedList.length), color: T.purple },
                { label: 'Total roster reach', value: fmtFollowers(totalReach), color: T.teal },
                { label: 'Open campaigns', value: String(campaigns.length), color: T.blue },
              ].map(s => (
                <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.faint, pointerEvents: 'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns or brands…"
                style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px 10px 38px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: T.text, background: T.card }} />
            </div>

            {/* Campaign cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {filtered.map(c => {
                const brand    = c.brands
                const platKey  = (c.platforms?.[0] ?? '').toLowerCase()
                const platMeta = PLAT_META[platKey] ?? PLAT_META.other
                const dl       = daysLeft(c.deadline)
                const bini     = (brand?.name ?? '?').slice(0, 2).toUpperCase()

                return (
                  <div key={c.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: '#4338ca', flexShrink: 0 }}>
                        {bini}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title ?? 'Untitled campaign'}
                        </div>
                        <div style={{ fontSize: 12, color: T.dim }}>{brand?.name ?? 'Unknown brand'}</div>
                      </div>
                      {brand?.is_verified && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenBg, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>✓ Verified</span>
                      )}
                    </div>

                    {/* Brief */}
                    {c.brief && (
                      <p style={{ fontSize: 13, color: T.dim, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.brief}
                      </p>
                    )}

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: platMeta.bg, color: platMeta.color }}>{platMeta.label}</span>
                      {c.deal_type && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#f3f4f6', color: T.dim, textTransform: 'capitalize' }}>{c.deal_type.replace('_', ' ')}</span>}
                      {dl && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: T.amberBg, color: T.amber }}>{dl}</span>}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{fmtAmount(c.payout_amount ?? c.budget_total)}</div>
                        <div style={{ fontSize: 11, color: T.faint }}>per creator</div>
                      </div>
                      <button onClick={() => setBidTarget(c)}
                        style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: T.text, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        Apply
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: T.faint }}>
                  No campaigns found
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Roster ─────────────────────────────────────────── */}
        {tab === 'roster' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Creator roster</h1>
                <p style={{ fontSize: 14, color: T.dim, margin: 0 }}>Creators managed by {agency.name}</p>
              </div>
              <button onClick={() => setShowAddCreator(true)}
                style={{ padding: '9px 20px', border: 'none', borderRadius: 9, background: T.text, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                + Add creator
              </button>
            </div>

            {managedList.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>No creators yet</div>
                <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>
                  Search for creators by name or username to invite them to your roster.
                </div>
                <button onClick={() => setShowAddCreator(true)}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: 9, background: T.text, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  + Add your first creator
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {managedList.map((m: any) => {
                  const creator = m.creators
                  if (!creator) return null
                  const handles: any[] = creator.creator_social_handles ?? []
                  const totalF  = handles.reduce((s: number, h: any) => s + (h.followers ?? 0), 0)
                  const cini    = (creator.full_name ?? '??').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  const isVer   = handles.some((h: any) => h.verification_status === 'verified')

                  const rosterStatus = m.status ?? 'active'
                  return (
                    <div key={creator.id} style={{ background: T.card, border: `1px solid ${rosterStatus === 'pending' ? T.amberBorder : T.border}`, borderRadius: 14, padding: 20, opacity: rosterStatus === 'pending' ? .85 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, color: '#4338ca' }}>
                          {cini}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{creator.full_name ?? 'Unknown'}</div>
                          <div style={{ fontSize: 12, color: rosterStatus === 'pending' ? T.amber : isVer ? T.green : T.faint }}>
                            {rosterStatus === 'pending' ? '⏳ Invite pending acceptance' : isVer ? '✓ Verified' : 'Unverified'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {handles.map((h: any) => {
                          const pm = PLAT_META[h.platform] ?? PLAT_META.other
                          return (
                            <span key={h.platform} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: pm.bg, color: pm.color, fontWeight: 600 }}>
                              {pm.short} · {fmtFollowers(h.followers)}
                            </span>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.dim, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                        <span>Total reach</span>
                        <span style={{ fontWeight: 700, color: T.text }}>{fmtFollowers(totalF)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.dim, marginTop: 4 }}>
                        <span>Your commission</span>
                        <span style={{ fontWeight: 700, color: T.purple }}>{m.commission_pct ?? 10}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── My Applications ─────────────────────────────────── */}
        {tab === 'applications' && (() => {
          const APP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
            applied:     { label: 'Applied',     color: '#60a5fa', bg: '#dbeafe' },
            pending:     { label: 'Pending',     color: T.amber,   bg: T.amberBg },
            review:      { label: 'In Review',   color: T.purple,  bg: T.purpleBg },
            shortlisted: { label: 'Shortlisted', color: T.purple,  bg: T.purpleBg },
            accepted:    { label: 'Accepted',    color: T.green,   bg: T.greenBg },
            success:     { label: 'Completed',   color: T.teal,    bg: '#ccfbf1' },
            rejected:    { label: 'Rejected',    color: T.red,     bg: T.redBg },
            withdrawn:   { label: 'Withdrawn',   color: T.faint,   bg: '#f3f4f6' },
          }
          const appCounts: Record<string, number> = { all: applications.length }
          for (const k of ['applied','review','accepted','rejected','withdrawn']) {
            appCounts[k] = applications.filter((a: any) => {
              if (k === 'review') return a.status === 'review' || a.status === 'shortlisted'
              return a.status === k
            }).length
          }
          const shownApps = appFilter === 'all' ? applications : applications.filter((a: any) => {
            if (appFilter === 'review') return a.status === 'review' || a.status === 'shortlisted'
            return a.status === appFilter
          })
          return (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>My Applications</h1>
                <p style={{ fontSize: 14, color: T.dim, margin: 0 }}>{applications.length} applications from your managed creators</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total',    val: applications.length,  color: T.dim   },
                  { label: 'Applied',  val: appCounts.applied,    color: '#60a5fa' },
                  { label: 'In Review',val: appCounts.review,     color: T.purple  },
                  { label: 'Accepted', val: appCounts.accepted,   color: T.green   },
                  { label: 'Rejected', val: appCounts.rejected,   color: T.red     },
                ].map(s => (
                  <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 18px', minWidth: 90 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all','applied','review','accepted','rejected','withdrawn'].map(f => (
                  <button key={f} onClick={() => setAppFilter(f)}
                    style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: appFilter === f ? T.purple : '#f3f4f6',
                      color: appFilter === f ? '#fff' : T.dim }}>
                    {f === 'all' ? 'All' : f === 'review' ? 'In Review' : f.charAt(0).toUpperCase() + f.slice(1)} ({appCounts[f] ?? 0})
                  </button>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                {shownApps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: T.faint }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                    <div>No applications{appFilter !== 'all' ? ` with status "${appFilter}"` : ' yet'}</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}`, background: '#f9fafb' }}>
                        {['Creator','Campaign','Brand','Platforms','Bid Amount','Status','Applied'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: T.faint, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shownApps.map((app: any, i: number) => {
                        const c  = app.creators
                        const camp = app.campaigns
                        const brand = camp?.brands
                        const sm = APP_STATUS[app.status ?? 'applied'] ?? APP_STATUS.applied
                        return (
                          <tr key={app.id} style={{ borderBottom: i < shownApps.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{c?.full_name ?? c?.username ?? '—'}</div>
                              {c?.platform && <div style={{ fontSize: 11, color: T.faint }}>{c.platform}</div>}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {camp?.title ?? '—'}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: T.dim }}>{brand?.name ?? '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                {(camp?.platforms ?? []).map((p: string) => (
                                  <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: '#e5e7eb', color: '#374151' }}>{p.slice(0,2).toUpperCase()}</span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: T.teal, whiteSpace: 'nowrap' }}>
                              {app.bid_amount ? `$${Number(app.bid_amount).toLocaleString()}` : 'Negotiable'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>
                                {sm.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 11, color: T.faint, whiteSpace: 'nowrap' }}>
                              {app.created_at ? new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Deals ────────────────────────────────────────────── */}
        {tab === 'deals' && (() => {
          const DEAL_ST: Record<string, { label: string; color: string; bg: string }> = {
            active:             { label: 'Active',            color: '#60a5fa', bg: '#dbeafe' },
            submitted:          { label: 'Submitted',         color: T.amber,   bg: T.amberBg },
            approved:           { label: 'Approved',          color: T.green,   bg: T.greenBg },
            completed:          { label: 'Completed',         color: T.teal,    bg: '#ccfbf1' },
            cancelled:          { label: 'Cancelled',         color: T.red,     bg: T.redBg },
            disputed:           { label: 'Disputed',          color: '#fb923c', bg: '#fff7ed' },
            revision_requested: { label: 'Revision Req.',     color: T.purple,  bg: T.purpleBg },
          }
          const commissionPct = agency?.commission_pct ?? 10
          const shownDeals = dealFilter === 'all' ? deals : deals.filter((d: any) => d.status === dealFilter)
          const totalPipeline  = deals.filter((d: any) => ['active','submitted','approved'].includes(d.status ?? '')).reduce((s: number, d: any) => s + (d.price ?? 0), 0)
          const totalCompleted = deals.filter((d: any) => d.status === 'completed').reduce((s: number, d: any) => s + (d.price ?? 0), 0)
          const agencyCut      = deals.reduce((s: number, d: any) => s + ((d.price ?? 0) * commissionPct / 100), 0)

          return (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Deals</h1>
                <p style={{ fontSize: 14, color: T.dim, margin: 0 }}>{deals.length} deals across your managed creators · {commissionPct}% commission rate</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total deals',      val: String(deals.length),                          color: T.dim    },
                  { label: 'Active',           val: String(deals.filter((d: any) => d.status === 'active').length),  color: '#60a5fa' },
                  { label: 'Completed',        val: String(deals.filter((d: any) => d.status === 'completed').length), color: T.teal },
                  { label: 'Pipeline value',   val: `$${totalPipeline.toLocaleString()}`,           color: T.purple },
                  { label: 'Earned (done)',     val: `$${totalCompleted.toLocaleString()}`,          color: T.green  },
                  { label: `Agency cut (${commissionPct}%)`, val: `$${Math.round(agencyCut).toLocaleString()}`, color: T.amber },
                ].map(s => (
                  <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 18px', minWidth: 110 }}>
                    <div style={{ fontSize: s.val.startsWith('$') ? 16 : 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['all','active','submitted','approved','completed','cancelled'].map(f => (
                  <button key={f} onClick={() => setDealFilter(f)}
                    style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: dealFilter === f ? T.purple : '#f3f4f6',
                      color: dealFilter === f ? '#fff' : T.dim }}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? deals.length : deals.filter((d: any) => d.status === f).length})
                  </button>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                {shownDeals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: T.faint }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
                    <div>No deals{dealFilter !== 'all' ? ` with status "${dealFilter}"` : ' yet'}</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}`, background: '#f9fafb' }}>
                        {['Creator','Campaign','Brand','Deal Price',`Agency Cut (${commissionPct}%)`, 'Status','Deadline'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: T.faint, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shownDeals.map((deal: any, i: number) => {
                        const c  = deal.creators
                        const brand = deal.brands
                        const camp  = deal.campaigns
                        const sm = DEAL_ST[deal.status ?? 'active'] ?? DEAL_ST.active
                        const cut = deal.price ? Math.round(deal.price * commissionPct / 100) : null
                        const dl = deal.deadline ? Math.ceil((new Date(deal.deadline).getTime() - Date.now()) / 86_400_000) : null
                        return (
                          <tr key={deal.id} style={{ borderBottom: i < shownDeals.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{c?.full_name ?? c?.username ?? '—'}</div>
                              {c?.platform && <div style={{ fontSize: 11, color: T.faint }}>{c.platform}</div>}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp?.title ?? '—'}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: T.dim }}>{brand?.name ?? '—'}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                              {deal.price ? `$${Number(deal.price).toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: T.amber, whiteSpace: 'nowrap' }}>
                              {cut ? `$${cut.toLocaleString()}` : '—'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {deal.deadline ? (
                                <div>
                                  <div style={{ color: T.text }}>{new Date(deal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                  {dl !== null && (
                                    <div style={{ fontSize: 11, color: dl < 0 ? T.red : dl <= 3 ? T.amber : T.faint }}>
                                      {dl < 0 ? 'Overdue' : dl === 0 ? 'Due today' : `${dl}d left`}
                                    </div>
                                  )}
                                </div>
                              ) : <span style={{ color: T.faint }}>—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Agency profile ──────────────────────────────────── */}
        {tab === 'profile' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Agency profile</h1>
              <button style={{ padding: '8px 18px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.card, color: T.text, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Edit
              </button>
            </div>

            {/* Profile card */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 14, background: T.purpleBg, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, color: T.purple }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{agency.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: T.purpleBg, color: T.purple, border: `1px solid ${T.purpleBorder}`, padding: '2px 9px', borderRadius: 20 }}>🏢 Agency</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: T.amberBg, color: T.amber, border: `1px solid ${T.amberBorder}`, padding: '2px 9px', borderRadius: 20 }}>
                      {agency.verification_status === 'verified' ? '✓ Verified' : 'Pending verification'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Contact', value: agency.contact_name },
                  { label: 'Email',   value: agency.contact_email },
                  { label: 'Phone',   value: agency.contact_phone ?? '—' },
                  { label: 'Commission', value: `${agency.commission_pct ?? 10}% per deal` },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: T.faint, marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Social handles */}
              {agency.social_handles?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 10 }}>SOCIAL HANDLES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {agency.social_handles.map((h: any, i: number) => {
                      const pm = PLAT_META[(h.platform ?? '').toLowerCase()] ?? PLAT_META.other
                      return (
                        <span key={i} style={{ fontSize: 13, padding: '5px 12px', borderRadius: 20, background: pm.bg, color: pm.color, fontWeight: 600 }}>
                          {pm.short} · {h.username ?? h.url ?? '—'}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Creators managed', value: String(managed.length), color: T.purple },
                { label: 'Total reach', value: fmtFollowers(totalReach), color: T.teal },
                { label: 'Commission rate', value: `${agency.commission_pct ?? 10}%`, color: T.amber },
              ].map(s => (
                <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {bidTarget && (
        <BidModal campaign={bidTarget} managed={managedList} onClose={() => setBidTarget(null)} />
      )}

      {showAddCreator && (
        <AddCreatorModal
          onClose={() => setShowAddCreator(false)}
          onAdded={newCreator => {
            // Optimistically add to the list as a pending entry
            setManagedList(prev => [...prev, {
              commission_pct: 10, status: 'pending',
              creators: { id: newCreator.id, full_name: newCreator.full_name, creator_social_handles: [] }
            }])
          }}
        />
      )}
    </div>
  )
}
