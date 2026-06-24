'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notify } from '@/lib/notifications'

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: '#f7f8fa', sidebar: '#fff', card: '#fff', border: '#e5e7eb',
  text: '#111827', dim: '#6b7280', faint: '#9ca3af',
  green: '#16a34a', greenBg: '#dcfce7', greenBorder: '#bbf7d0',
  amber: '#d97706', amberBg: '#fef3c7', amberBorder: '#fde68a',
  red: '#dc2626', redBg: '#fee2e2', redBorder: '#fecaca',
  blue: '#2563eb', blueBg: '#eff6ff', blueBorder: '#bfdbfe',
  purple: '#7c3aed', purpleBg: '#ede9fe',
  teal: '#0d9488',
}

const PLAT_META: Record<string, { label: string; bg: string; color: string; short: string }> = {
  youtube:   { label: 'YouTube',   bg: '#fee2e2', color: '#dc2626', short: 'YT' },
  instagram: { label: 'Instagram', bg: '#fce7f3', color: '#be185d', short: 'IG' },
  tiktok:    { label: 'TikTok',    bg: '#f0fdf4', color: '#15803d', short: 'TK' },
  twitter:   { label: 'Twitter/X', bg: '#eff6ff', color: '#1d4ed8', short: 'TW' },
  facebook:  { label: 'Facebook',  bg: '#eff6ff', color: '#1d4ed8', short: 'FB' },
  other:     { label: 'Other',     bg: '#f3f4f6', color: '#374151', short: '??' },
}

// Content types per platform
const CONTENT_TYPES: Record<string, Array<{ key: string; label: string }>> = {
  youtube:   [{ key: 'video', label: 'Video' }, { key: 'shorts', label: 'Shorts' }, { key: 'integration', label: 'Integration' }],
  instagram: [{ key: 'post', label: 'Post' }, { key: 'story', label: 'Story' }, { key: 'reel', label: 'Reel' }],
  tiktok:    [{ key: 'video', label: 'Video' }, { key: 'live', label: 'Live' }],
  twitter:   [{ key: 'post', label: 'Post' }, { key: 'thread', label: 'Thread' }],
  facebook:  [{ key: 'post', label: 'Post' }, { key: 'reel', label: 'Reel' }, { key: 'story', label: 'Story' }],
  other:     [{ key: 'post', label: 'Post' }],
}

const VSTATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  verified:   { label: 'Verified',   color: T.green,  bg: T.greenBg,  border: T.greenBorder  },
  unverified: { label: 'Unverified', color: T.dim,    bg: '#f3f4f6',  border: T.border       },
  pending:    { label: 'Pending',    color: T.amber,  bg: T.amberBg,  border: T.amberBorder  },
  rejected:   { label: 'Rejected',   color: T.red,    bg: T.redBg,    border: T.redBorder    },
}

const BID_STATUS: Record<string, { label: string; color: string }> = {
  applied:     { label: 'Applied',     color: T.blue   },
  pending:     { label: 'Pending',     color: T.amber  },
  review:      { label: 'In Review',   color: T.purple },
  shortlisted: { label: 'Shortlisted', color: T.purple },
  accepted:    { label: 'Accepted',    color: T.green  },
  success:     { label: 'Success ✓',  color: T.teal   },
  rejected:    { label: 'Rejected',    color: T.red    },
  withdrawn:   { label: 'Withdrawn',   color: T.faint  },
  completed:   { label: 'Completed',   color: T.teal   },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
function fmtAmount(n: number | null) {
  if (!n) return '—'
  return `$${n.toLocaleString()}`
}
function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Handle {
  id: string; platform: string; username: string | null; channel_url: string | null
  followers: number | null; is_primary: boolean
  verification_status: string | null; verification_code: string | null
}
interface Bid {
  id: string; bid_amount: number | null; status: string | null; created_at: string | null
  campaigns?: { title: string | null; platforms: string[] | null; brands?: { name: string | null } | null } | null
}
interface Connection {
  id: string; name: string; deals: number; totalValue: number; lastDeal: string; campaigns: string[]
}
interface Creator {
  id: string; full_name: string | null; platform: string
  username: string | null; profile_url: string | null
  verification_status: string | null; price_per_post: number | null
  rates: Record<string, Record<string, number>> | null
}
interface Conversation {
  id: string
  brand_id: string
  creator_id: string
  last_msg_at: string | null
  created_at: string
  brands: { id: string; name: string | null; logo_url: string | null; owner_id: string | null } | null
}
interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: string
  body: string
  read: boolean
  created_at: string
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800) }}
      style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
        background: done ? T.greenBg : '#f3f4f6', color: done ? T.green : T.dim,
        border: `1px solid ${done ? T.greenBorder : T.border}`, transition: 'all .2s' }}>
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  )
}

// ─── Multi-platform Rates Modal ───────────────────────────────────────────────
function RatesModal({ handles, currentRates, onClose, onSaved }: {
  handles: Handle[]
  currentRates: Record<string, Record<string, number>> | null
  onClose: () => void
  onSaved: (rates: Record<string, Record<string, number>>) => void
}) {
  const platforms = Array.from(new Set(handles.map(h => h.platform)))
  const [rates, setRates] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {}
    for (const p of platforms) {
      init[p] = { ...(currentRates?.[p] ?? {}) }
    }
    return init
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function setRate(platform: string, type: string, val: string) {
    const n = val === '' ? 0 : parseFloat(val)
    setRates(r => ({ ...r, [platform]: { ...r[platform], [type]: n } }))
  }

  async function save() {
    // Remove zero entries
    const clean: Record<string, Record<string, number>> = {}
    for (const [plat, types] of Object.entries(rates)) {
      const filtered = Object.fromEntries(Object.entries(types).filter(([, v]) => v > 0))
      if (Object.keys(filtered).length > 0) clean[plat] = filtered
    }
    setLoading(true); setErr('')
    const res = await fetch('/api/creator/set-rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates: clean }),
    })
    const data = await res.json()
    if (!res.ok) { setErr(data.error ?? 'Failed'); setLoading(false); return }
    onSaved(data.rates)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000060', display: 'grid', placeItems: 'center', zIndex: 200, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px #0002' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: T.text }}>Set your rates</div>
        <div style={{ fontSize: 13, color: T.dim, marginBottom: 24, lineHeight: 1.5 }}>
          Set your price per content type. Leave blank for types you don't offer. Brands will see these rates.
        </div>

        {platforms.length === 0 && (
          <div style={{ color: T.faint, fontSize: 13, marginBottom: 20 }}>No platforms connected yet. Add a platform first.</div>
        )}

        {platforms.map(plat => {
          const meta = PLAT_META[plat] ?? PLAT_META.other
          const types = CONTENT_TYPES[plat] ?? CONTENT_TYPES.other
          return (
            <div key={plat} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: meta.bg, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: meta.color }}>
                  {meta.short}
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{meta.label}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {types.map(t => (
                  <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 13, color: T.dim, width: 100, flexShrink: 0 }}>{t.label}</label>
                    <div style={{ display: 'flex', flex: 1 }}>
                      <span style={{ padding: '8px 10px', background: '#f3f4f6', border: `1px solid ${T.border}`, borderRight: 'none', borderRadius: '7px 0 0 7px', color: T.dim, fontSize: 13 }}>$</span>
                      <input
                        type="number" min={0} placeholder="—"
                        value={rates[plat]?.[t.key] || ''}
                        onChange={e => setRate(plat, t.key, e.target.value)}
                        style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: '0 7px 7px 0', padding: '8px 10px', fontSize: 14, outline: 'none', color: T.text }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: T.faint, width: 40 }}>/ piece</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {err && <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, border: `1px solid ${T.border}`, borderRadius: 8, background: '#f3f4f6', color: T.dim, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={loading || platforms.length === 0}
            style={{ flex: 2, padding: 10, border: 'none', borderRadius: 8, background: T.text, color: '#fff', fontWeight: 700, cursor: (loading || platforms.length === 0) ? 'not-allowed' : 'pointer', opacity: (loading || platforms.length === 0) ? .6 : 1 }}>
            {loading ? 'Saving…' : 'Save rates'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Complete profile inline form (when no creator record found) ──────────────
const ALL_PLATFORMS = [
  { key: 'youtube',   label: 'YouTube',    placeholder: 'youtube.com/@channel'  },
  { key: 'instagram', label: 'Instagram',  placeholder: 'instagram.com/handle'  },
  { key: 'tiktok',    label: 'TikTok',     placeholder: 'tiktok.com/@handle'    },
  { key: 'twitter',   label: 'Twitter/X',  placeholder: 'x.com/handle'          },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'facebook.com/page'     },
  { key: 'other',     label: 'Other',      placeholder: 'Channel URL'           },
]

interface CPHandle { platform: string; channelUrl: string; followers: string }
const emptyHandle = (): CPHandle => ({ platform: '', channelUrl: '', followers: '' })

function CompleteProfileForm({ userId, email }: { userId: string; email: string }) {
  const router   = useRouter()
  const [name,    setName]    = useState('')
  const [handles, setHandles] = useState<CPHandle[]>([emptyHandle()])
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  function updateHandle(i: number, field: keyof CPHandle, val: string) {
    setHandles(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h))
  }
  function addHandle() { if (handles.length < 5) setHandles(prev => [...prev, emptyHandle()]) }
  function removeHandle(i: number) { if (handles.length > 1) setHandles(prev => prev.filter((_, idx) => idx !== i)) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name required'); return }
    const filled = handles.filter(h => h.platform && h.channelUrl.trim())
    if (!filled.length) { setErr('Add at least one platform and channel URL'); return }
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/onboarding/creator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          handles: filled.map(h => ({ platform: h.platform, channelUrl: h.channelUrl.trim(), followers: h.followers ? parseInt(h.followers) : undefined })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.refresh()
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') }
    setLoading(false)
  }

  const inputSt: React.CSSProperties = { width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: T.text, background: '#fff' }

  return (
    <div style={{ maxWidth: 560, margin: '48px auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Complete your creator profile</div>
      <div style={{ fontSize: 13, color: T.dim, marginBottom: 24, lineHeight: 1.6 }}>
        Your account ({email}) is set up but your creator profile wasn't saved. Add all your active channels below.
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Name */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>Your name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Sharma" style={inputSt} />
        </div>

        {/* Channels */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.dim, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Your platforms * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— first one is primary</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {handles.map((h, i) => (
              <div key={i} style={{ background: '#f9fafb', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? T.blue : T.faint, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {i === 0 ? 'Primary channel' : `Channel ${i + 1}`}
                  </span>
                  {i > 0 && (
                    <button type="button" onClick={() => removeHandle(i)}
                      style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                  )}
                </div>
                {/* Platform chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {ALL_PLATFORMS.map(p => (
                    <button key={p.key} type="button" onClick={() => updateHandle(i, 'platform', p.key)}
                      style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${h.platform === p.key ? T.blue : T.border}`,
                        background: h.platform === p.key ? T.blueBg : '#fff',
                        color: h.platform === p.key ? T.blue : T.dim }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {h.platform && (
                  <input type="text" value={h.channelUrl} onChange={e => updateHandle(i, 'channelUrl', e.target.value)}
                    placeholder={ALL_PLATFORMS.find(p => p.key === h.platform)?.placeholder ?? 'Channel URL'}
                    style={{ ...inputSt, marginBottom: 6 }} />
                )}
                <input type="number" value={h.followers} onChange={e => updateHandle(i, 'followers', e.target.value)}
                  placeholder="Approx. followers (optional)"
                  style={inputSt} />
              </div>
            ))}
          </div>

          {handles.length < 5 && (
            <button type="button" onClick={addHandle}
              style={{ marginTop: 8, width: '100%', padding: '9px', borderRadius: 8, border: `1px dashed ${T.border}`, background: 'transparent', color: T.dim, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + Add another channel
            </button>
          )}
        </div>

        {err && <div style={{ fontSize: 13, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '8px 12px' }}>{err}</div>}

        <button type="submit" disabled={loading}
          style={{ padding: '12px', border: 'none', borderRadius: 10, background: loading ? '#e5e7eb' : T.text, color: loading ? T.dim : '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving…' : 'Save profile →'}
        </button>
      </form>
    </div>
  )
}

// ─── Inbox / Chat component ───────────────────────────────────────────────────
function MessagesTab({ conversations, userId, creatorId }: { conversations: Conversation[]; userId: string; creatorId: string }) {
  const supabase  = createClient()
  const [liveConvs, setLiveConvs] = useState<Conversation[]>(conversations)
  const [selected,  setSelected]  = useState<Conversation | null>(conversations[0] ?? null)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [loadingM,  setLoadingM]  = useState(false)
  const [reply,     setReply]     = useState('')
  const [sending,   setSending]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Realtime: listen for new conversations opened by brands
  useEffect(() => {
    if (!creatorId) return
    const ch = supabase
      .channel(`creator_new_convs_${creatorId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `creator_id=eq.${creatorId}` },
        async (payload) => {
          // Fetch full conversation with brand details
          const { data } = await supabase
            .from('conversations')
            .select('id, brand_id, creator_id, last_msg_at, created_at, brands(id, name, logo_url, owner_id)')
            .eq('id', (payload.new as any).id)
            .single()
          if (data) {
            setLiveConvs(prev => prev.find(c => c.id === data.id) ? prev : [data as unknown as Conversation, ...prev])
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [creatorId])

  // Realtime: subscribe to new messages in selected conversation
  useEffect(() => {
    if (!selected) return
    const ch = supabase
      .channel(`creator_conv_${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.id}` },
        (payload) => {
          setMessages(prev => prev.find(m => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message])
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selected?.id])

  async function loadMessages(conv: Conversation) {
    setSelected(conv)
    setLoadingM(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as Message[])
    setLoadingM(false)
    // Mark unread as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conv.id)
      .neq('sender_id', userId)
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSending(true)
    const body = reply.trim()
    setReply('')
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: selected.id, sender_id: userId, sender_role: 'creator', body })
      .select('*')
      .single()
    if (data) setMessages(prev => [...prev, data as Message])
    // Update last_msg_at
    await supabase.from('conversations').update({ last_msg_at: new Date().toISOString() }).eq('id', selected.id)
    // Notify the brand owner
    const brandOwnerId = selected.brands?.owner_id
    if (brandOwnerId) {
      await notify(supabase, brandOwnerId, {
        type:  'message',
        title: 'New reply from creator',
        body:  body.slice(0, 100),
        link:  '/dashboard/brand/profile',
      })
    }
    setSending(false)
  }

  // Load messages for first conversation on mount
  useEffect(() => { if (liveConvs[0]) loadMessages(liveConvs[0]) }, [])

  function fmtTime(s: string) {
    const d = new Date(s)
    const now = new Date()
    const diffH = (now.getTime() - d.getTime()) / 3600000
    if (diffH < 24) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (diffH < 168) return d.toLocaleDateString('en-US', { weekday: 'short' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function brandInitials(name: string | null | undefined) {
    if (!name) return '?'
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  if (liveConvs.length === 0) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 8 }}>No messages yet</div>
        <div style={{ fontSize: 14, color: T.dim }}>When brands send you offers, they'll appear here.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 560, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Conversation list */}
      <div style={{ borderRight: `1px solid ${T.border}`, overflowY: 'auto', background: '#fafafa' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Inbox
        </div>
        {liveConvs.map(conv => {
          const brand = conv.brands
          const isActive = selected?.id === conv.id
          return (
            <div
              key={conv.id}
              onClick={() => loadMessages(conv)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: isActive ? T.blueBg : 'transparent',
                borderLeft: isActive ? `3px solid ${T.blue}` : '3px solid transparent',
                cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                transition: 'background .1s',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {brandInitials(brand?.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {brand?.name ?? 'Brand'}
                </div>
                <div style={{ fontSize: 11, color: T.faint }}>
                  {conv.last_msg_at ? fmtTime(conv.last_msg_at) : fmtTime(conv.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chat panel */}
      {selected ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, background: T.card }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {brandInitials(selected.brands?.name)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{selected.brands?.name ?? 'Brand'}</div>
              <div style={{ fontSize: 11, color: T.faint }}>Brand offer & conversation</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingM ? (
              <div style={{ fontSize: 12, color: T.faint, textAlign: 'center', marginTop: 20 }}>Loading…</div>
            ) : messages.length === 0 ? (
              <div style={{ fontSize: 12, color: T.faint, textAlign: 'center', marginTop: 20 }}>No messages yet</div>
            ) : messages.map(msg => {
              const isMe = msg.sender_role === 'creator'
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? T.blueBg : '#e0e7ff', color: isMe ? T.blue : '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {isMe ? 'ME' : brandInitials(selected.brands?.name)}
                  </div>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMe ? T.blue : '#f3f4f6',
                      color: isMe ? '#fff' : T.text,
                      fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    }}>
                      {msg.body}
                    </div>
                    <div style={{ fontSize: 10, color: T.faint, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                      {fmtTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, background: T.card }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
              placeholder="Type a reply… (Enter to send)"
              rows={2}
              style={{
                flex: 1, resize: 'none', fontSize: 13, padding: '8px 12px',
                border: `1px solid ${T.border}`, borderRadius: 10,
                background: '#f9fafb', color: T.text, outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none',
                background: reply.trim() ? T.blue : '#e5e7eb',
                color: reply.trim() ? '#fff' : T.faint,
                fontWeight: 600, fontSize: 13, cursor: reply.trim() ? 'pointer' : 'not-allowed',
                alignSelf: 'flex-end', flexShrink: 0,
              }}
            >{sending ? '…' : 'Send'}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.faint, fontSize: 14 }}>Select a conversation</div>
      )}
    </div>
  )
}

// ─── Coming soon placeholder ──────────────────────────────────────────────────
function ComingSoon({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: T.dim, maxWidth: 360, margin: '0 auto' }}>{desc}</div>
    </div>
  )
}

// ─── Main profile view ────────────────────────────────────────────────────────
export default function CreatorProfileView({ user, creator, handles, bids, connections, conversations, initials }: {
  user: { id: string; email: string }
  creator: Creator | null
  handles: Handle[]
  bids: Bid[]
  connections: Connection[]
  conversations: Conversation[]
  initials: string
}) {
  const router   = useRouter()
  const supabase = createClient()

  type Tab = 'overview' | 'platforms' | 'bids' | 'connections' | 'messages' | 'settings'
  const [tab, setTab]             = useState<Tab>('overview')
  const [showRates, setShowRates] = useState(false)
  const [rates, setRates]         = useState<Record<string, Record<string, number>>>(creator?.rates ?? {})
  const [liveBids, setLiveBids]   = useState<Bid[]>(bids)
  const [, startTransition]       = useTransition()

  // Realtime: update bid status live when brand changes it
  useEffect(() => {
    if (!creator) return
    const ch = supabase
      .channel(`creator_bids_${creator.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaign_applications', filter: `creator_id=eq.${creator.id}` },
        (payload) => {
          setLiveBids(prev => prev.map(b => b.id === (payload.new as any).id ? { ...b, status: (payload.new as any).status } : b))
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [creator?.id])

  // Display name state
  const [displayName, setDisplayName] = useState(creator?.full_name ?? '')
  const [savingName, setSavingName]   = useState(false)
  const [nameSaved, setNameSaved]     = useState(false)
  const [nameError, setNameError]     = useState('')

  // Per-handle verify state
  const [verifying, setVerifying]       = useState<Record<string, boolean>>({})
  const [verifyResult, setVerifyResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function saveDisplayName() {
    if (!displayName.trim()) { setNameError('Name cannot be empty'); return }
    setSavingName(true); setNameError(''); setNameSaved(false)
    try {
      const { error: e1 } = await supabase
        .from('creators').update({ full_name: displayName.trim() }).eq('user_id', user.id)
      const { error: e2 } = await supabase
        .from('profiles').update({ display_name: displayName.trim() }).eq('id', user.id)
      if (e1 || e2) throw new Error((e1 ?? e2)!.message)
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    } catch (e: any) { setNameError(e.message) }
    setSavingName(false)
  }

  async function verifyHandle(h: Handle) {
    setVerifying(v => ({ ...v, [h.id]: true }))
    setVerifyResult(r => ({ ...r, [h.id]: { ok: false, msg: '' } }))
    try {
      if (h.platform === 'youtube') {
        const res = await fetch('/api/verify/youtube', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelUrl: h.channel_url, verificationCode: h.verification_code, creatorId: creator!.id, handleId: h.id }),
        })
        const data = await res.json()
        setVerifyResult(r => ({ ...r, [h.id]: { ok: data.verified ?? false, msg: data.message ?? data.error ?? 'Unknown result' } }))
        if (data.verified) setTimeout(() => router.refresh(), 1200)
      } else {
        const res = await fetch('/api/verify/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'creator', entityId: creator!.id,
            platform: h.platform, verificationType: 'manual',
            verificationCode: h.verification_code, channelUrl: h.channel_url,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Submission failed')
        setVerifyResult(r => ({ ...r, [h.id]: { ok: true, msg: 'Verification request submitted! Admin will review within 24h.' } }))
      }
    } catch (e: any) {
      setVerifyResult(r => ({ ...r, [h.id]: { ok: false, msg: e.message } }))
    }
    setVerifying(v => ({ ...v, [h.id]: false }))
  }

  // If no creator record — show inline completion form
  if (!creator) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text }}>
        <header style={{ height: 56, background: T.card, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          <div onClick={() => router.push('/dashboard/creator/discover')} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>A</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: T.text }}>ADMIS</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: T.dim, cursor: 'pointer' }} onClick={signOut}>Sign out</div>
        </header>
        <CompleteProfileForm userId={user.id} email={user.email} />
      </div>
    )
  }

  const verifiedCount  = handles.filter(h => h.verification_status === 'verified').length
  const totalFollowers = handles.reduce((s, h) => s + (h.followers ?? 0), 0)
  const recentBids     = liveBids.slice(0, 5)

  // Flatten rates for display in stats
  const allRates = Object.entries(rates).flatMap(([plat, types]) =>
    Object.entries(types).map(([type, price]) => ({ plat, type, price }))
  ).filter(r => r.price > 0)

  const TABS = [
    { key: 'overview',    label: 'Overview'     },
    { key: 'platforms',   label: 'Platforms'    },
    { key: 'bids',        label: 'My Bids'      },
    { key: 'connections', label: 'Connections'  },
    { key: 'messages',    label: 'Messages'     },
    { key: 'settings',    label: 'Settings'     },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text, display: 'flex' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{ width: 220, background: T.card, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '28px 0', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>

        {/* Platform logo → home */}
        <div onClick={() => router.push('/dashboard/creator/discover')}
          style={{ padding: '0 20px 20px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.text }}>ADMIS</span>
        </div>

        {/* Avatar + name */}
        <div style={{ padding: '18px 20px 18px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e0e7ff',
            display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>
            {initials}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{creator.full_name ?? user.email}</div>
          {verifiedCount > 0
            ? <div style={{ fontSize: 11, color: T.green, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
                {verifiedCount} verified
              </div>
            : <div style={{ fontSize: 11, color: T.amber, marginTop: 2 }}>Not verified yet</div>
          }
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 8px', marginBottom: 6 }}>Menu</div>
          {([
            { key: 'overview',    label: '👤  Profile'     },
            { key: 'bids',        label: '📋  My Bids'     },
            { key: 'connections', label: '🤝  Connections' },
            { key: 'messages',    label: '💬  Messages'    },
          ] as const).map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: tab === item.key ? 600 : 400,
                color: tab === item.key ? T.text : T.dim, background: tab === item.key ? '#f3f4f6' : 'transparent',
                border: 'none', cursor: 'pointer', marginBottom: 2 }}>
              {item.label}
            </button>
          ))}
          <button onClick={() => router.push('/dashboard/creator/discover')}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13,
              color: T.blue, background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 2, fontWeight: 500 }}>
            🔍  Discover Campaigns
          </button>
        </nav>

        {/* Account */}
        <div style={{ padding: '12px 12px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.faint, textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 8px', marginBottom: 6 }}>Account</div>
          <button onClick={() => setTab('settings')}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13,
              color: tab === 'settings' ? T.text : T.dim, background: tab === 'settings' ? '#f3f4f6' : 'transparent',
              border: 'none', cursor: 'pointer', marginBottom: 2, fontWeight: tab === 'settings' ? 600 : 400 }}>
            ⚙️  Settings
          </button>
          <button onClick={signOut}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: 13, color: T.red, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            🚪  Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main style={{ flex: 1, padding: '32px 40px', minWidth: 0, maxWidth: 1100 }}>

        {/* Page heading */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: T.text }}>
              {tab === 'overview' ? 'Your profile' : tab === 'bids' ? 'My Bids' : tab === 'connections' ? 'Connections' : tab === 'messages' ? 'Messages' : 'Settings'}
            </h1>
            <p style={{ fontSize: 13, color: T.dim, margin: 0 }}>
              {tab === 'overview' ? 'Manage your channels, rates, and public presence' : ''}
            </p>
          </div>
          {tab === 'overview' && (
            <button onClick={() => setTab('settings')}
              style={{ padding: '8px 18px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.card, color: T.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              ✏️ Edit profile
            </button>
          )}
        </div>

        {/* Tabs strip */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, marginBottom: 28, gap: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '9px 18px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? T.text : T.dim,
                background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? T.text : 'transparent'}`,
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Connected platforms */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Connected platforms</span>
                  <button style={{ padding: '5px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.card, color: T.text, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Add
                  </button>
                </div>
                {handles.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: T.faint, fontSize: 13 }}>No platforms connected yet</div>
                ) : handles.map((h, i) => {
                  const meta = PLAT_META[h.platform] ?? PLAT_META.other
                  const vs   = VSTATUS[h.verification_status ?? 'unverified'] ?? VSTATUS.unverified
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                      borderBottom: i < handles.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: meta.color, flexShrink: 0 }}>{meta.short}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{meta.label}</div>
                        <div style={{ fontSize: 12, color: T.dim }}>
                          {h.username ? `@${h.username}` : h.channel_url ?? '—'}
                          {h.followers ? ` · ${fmtFollowers(h.followers)} followers` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`, flexShrink: 0 }}>{vs.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Verification codes */}
              {handles.length > 0 && (
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Verification codes</div>
                  <div style={{ fontSize: 12, color: T.dim, marginBottom: 16 }}>
                    Add each code to your bio/description, then click Verify.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {handles.map(h => {
                      const meta = PLAT_META[h.platform] ?? PLAT_META.other
                      const isVerified = h.verification_status === 'verified'
                      const res = verifyResult[h.id]
                      return (
                        <div key={h.id} style={{ background: '#f9fafb', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, marginBottom: 6 }}>{meta.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <code style={{ flex: 1, fontSize: 13, fontWeight: 700, letterSpacing: '.05em', color: T.text, fontFamily: 'monospace' }}>
                              {h.verification_code ?? '—'}
                            </code>
                            <CopyBtn text={h.verification_code ?? ''} />
                            {isVerified ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: T.green, flexShrink: 0 }}>Verified ✓</span>
                            ) : (
                              <button onClick={() => verifyHandle(h)} disabled={verifying[h.id]}
                                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: verifying[h.id] ? 'not-allowed' : 'pointer', fontWeight: 600, flexShrink: 0,
                                  background: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}`, opacity: verifying[h.id] ? .6 : 1 }}>
                                {verifying[h.id] ? '…' : h.platform === 'youtube' ? 'Verify' : 'Request'}
                              </button>
                            )}
                          </div>
                          {res?.msg && (
                            <div style={{ marginTop: 8, fontSize: 12, color: res.ok ? T.green : T.red, lineHeight: 1.5 }}>{res.msg}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Stats snapshot */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 16 }}>Stats snapshot</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, textAlign: 'center', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{fmtFollowers(totalFollowers)}</div>
                    <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Total followers</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>—</div>
                    <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Avg eng.</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{handles.length}</div>
                    <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Platforms</div>
                  </div>
                </div>

                {/* Rates section */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.dim }}>Your rates</span>
                    <button onClick={() => setShowRates(true)}
                      style={{ padding: '5px 12px', border: `1px solid ${T.border}`, borderRadius: 7, background: T.card, color: T.text, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                      {allRates.length > 0 ? 'Edit rates' : 'Set rates'}
                    </button>
                  </div>
                  {allRates.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.faint }}>No rates set — click "Set rates" to add yours.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {allRates.map(r => {
                        const meta = PLAT_META[r.plat] ?? PLAT_META.other
                        return (
                          <div key={`${r.plat}-${r.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: T.dim }}>{meta.label} · {r.type}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>${r.price.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent bids */}
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Recent bids</span>
                  {liveBids.length > 5 && (
                    <button onClick={() => setTab('bids')} style={{ fontSize: 12, color: T.blue, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
                  )}
                </div>
                {recentBids.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: T.faint, fontSize: 12 }}>No bids yet</div>
                ) : recentBids.map((bid, i) => {
                  const camp  = bid.campaigns
                  const brand = camp?.brands
                  const st    = BID_STATUS[bid.status ?? 'applied'] ?? BID_STATUS.applied
                  return (
                    <div key={bid.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: i < recentBids.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#4338ca', flexShrink: 0 }}>
                        {(brand?.name ?? '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {brand?.name ?? 'Unknown brand'}
                        </div>
                        <div style={{ fontSize: 11, color: T.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {camp?.title ?? '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{fmtAmount(bid.bid_amount)}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: st.color }}>{st.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Profile nudge */}
              {(allRates.length === 0 || verifiedCount === 0) && (
                <div style={{ background: '#fffbeb', border: `1px solid ${T.amberBorder}`, borderRadius: 14, padding: 16, display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>💡</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>Complete your profile</div>
                    <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
                      {allRates.length === 0 ? '· Set your rates  ' : ''}
                      {verifiedCount === 0 ? '· Verify a platform' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Platforms tab ────────────────────────────────── */}
        {tab === 'platforms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {handles.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📱</div>
                <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>No platforms connected</div>
                <div style={{ fontSize: 13, color: T.dim }}>Contact support to add a platform.</div>
              </div>
            ) : handles.map(h => {
              const meta = PLAT_META[h.platform] ?? PLAT_META.other
              const vs   = VSTATUS[h.verification_status ?? 'unverified'] ?? VSTATUS.unverified
              const res  = verifyResult[h.id]
              return (
                <div key={h.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: meta.bg, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: meta.color }}>{meta.short}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{meta.label}</div>
                      <a href={h.channel_url ?? '#'} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.blue, textDecoration: 'none' }}>
                        {h.username ? `@${h.username}` : h.channel_url ?? '—'}
                      </a>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 11px', borderRadius: 20, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}` }}>{vs.label}</span>
                    {h.is_primary && <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, background: T.purpleBg, padding: '3px 9px', borderRadius: 20 }}>Primary</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: '#f9fafb', borderRadius: 9, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: T.faint, marginBottom: 2 }}>Followers</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{fmtFollowers(h.followers)}</div>
                    </div>
                    <div style={{ background: '#f9fafb', borderRadius: 9, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: T.faint, marginBottom: 2 }}>Status</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: vs.color }}>{vs.label}</div>
                    </div>
                  </div>
                  <div style={{ background: '#f9fafb', border: `1px solid ${T.border}`, borderRadius: 9, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: T.faint, fontWeight: 600, marginBottom: 8 }}>VERIFICATION CODE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 14, fontWeight: 700, letterSpacing: '.06em', fontFamily: 'monospace', color: T.text }}>{h.verification_code ?? '—'}</code>
                      <CopyBtn text={h.verification_code ?? ''} />
                    </div>
                    {h.verification_status !== 'verified' && (
                      <>
                        <div style={{ fontSize: 12, color: T.dim, marginTop: 10, lineHeight: 1.6 }}>
                          {h.platform === 'youtube'
                            ? 'Paste this code in your YouTube channel description, save, then click Verify.'
                            : `Paste this code in your ${meta.label} bio, then click Request Verification.`}
                        </div>
                        <button onClick={() => verifyHandle(h)}
                          disabled={verifying[h.id] || h.verification_status === 'pending'}
                          style={{ marginTop: 10, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                            cursor: (verifying[h.id] || h.verification_status === 'pending') ? 'not-allowed' : 'pointer',
                            border: 'none', background: T.text, color: '#fff',
                            opacity: (verifying[h.id] || h.verification_status === 'pending') ? .5 : 1 }}>
                          {verifying[h.id] ? 'Checking…' : h.verification_status === 'pending' ? 'Pending review' : h.platform === 'youtube' ? 'Verify now' : 'Request verification'}
                        </button>
                        {res?.msg && (
                          <div style={{ marginTop: 8, fontSize: 12, color: res.ok ? T.green : T.red, lineHeight: 1.5 }}>{res.msg}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Bids tab ─────────────────────────────────────── */}
        {tab === 'bids' && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {liveBids.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>No bids yet</div>
                <div style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>Browse campaigns and start applying.</div>
                <button onClick={() => router.push('/dashboard/creator/discover')}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: T.text, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Discover campaigns →
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, background: '#f9fafb' }}>
                    {['Campaign', 'Brand', 'Your bid', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.faint, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveBids.map((bid, i) => {
                    const camp  = bid.campaigns
                    const brand = camp?.brands
                    const st    = BID_STATUS[bid.status ?? 'applied'] ?? BID_STATUS.applied
                    return (
                      <tr key={bid.id} style={{ borderBottom: i < bids.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                        <td style={{ padding: '13px 16px', fontWeight: 500, color: T.text }}>{camp?.title ?? '—'}</td>
                        <td style={{ padding: '13px 16px', color: T.dim }}>{brand?.name ?? '—'}</td>
                        <td style={{ padding: '13px 16px', fontWeight: 700 }}>{fmtAmount(bid.bid_amount)}</td>
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: st.color, background: st.color + '18' }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '13px 16px', color: T.dim, fontSize: 12 }}>{fmtDate(bid.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Connections tab ──────────────────────────────── */}
        {tab === 'connections' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 4 }}>
              Brands you've applied to or worked with — built from your bid history.
            </div>
            {connections.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
                <div style={{ fontWeight: 600, color: T.text, marginBottom: 6 }}>No connections yet</div>
                <div style={{ fontSize: 13, color: T.dim }}>Once your bids are applied, brands appear here.</div>
              </div>
            ) : connections.sort((a, b) => b.totalValue - a.totalValue).map(conn => (
              <div key={conn.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: '#e0e7ff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, color: '#4338ca', flexShrink: 0 }}>
                  {conn.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{conn.name}</div>
                  {conn.campaigns.length > 0 && (
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conn.campaigns.slice(0, 3).join(' · ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{conn.deals}</div>
                    <div style={{ fontSize: 10, color: T.faint }}>Bids</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.teal }}>{fmtAmount(conn.totalValue)}</div>
                    <div style={{ fontSize: 10, color: T.faint }}>Total value</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.dim }}>{fmtDate(conn.lastDeal)}</div>
                    <div style={{ fontSize: 10, color: T.faint }}>Last bid</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Messages tab ─────────────────────────────────── */}
        {tab === 'messages' && (
          <MessagesTab conversations={conversations} userId={user.id} creatorId={creator?.id ?? ''} />
        )}

        {/* ── Settings tab ─────────────────────────────────── */}
        {tab === 'settings' && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, maxWidth: 520 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: T.text }}>Account settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.dim, display: 'block', marginBottom: 5 }}>Email</label>
                <input value={user.email} disabled
                  style={{ width: '100%', border: `1px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, background: '#f3f4f6', color: T.dim, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.dim, display: 'block', marginBottom: 5 }}>Display name</label>
                <input
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setNameSaved(false); setNameError('') }}
                  placeholder="Your name"
                  style={{ width: '100%', border: `1px solid ${nameError ? T.red : T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: T.text }}
                />
              </div>
              {nameError && (
                <div style={{ fontSize: 12, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: '8px 12px' }}>{nameError}</div>
              )}
              {nameSaved && (
                <div style={{ fontSize: 12, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 8, padding: '8px 12px' }}>✓ Name updated successfully</div>
              )}
              <button onClick={saveDisplayName} disabled={savingName}
                style={{ padding: '10px', border: 'none', borderRadius: 8, background: T.text, color: '#fff', fontWeight: 600, fontSize: 14, cursor: savingName ? 'not-allowed' : 'pointer', opacity: savingName ? .6 : 1 }}>
                {savingName ? 'Saving…' : 'Save changes'}
              </button>

              <div style={{ marginTop: 12, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 10 }}>Danger zone</div>
                <button onClick={signOut}
                  style={{ padding: '9px 20px', border: `1px solid ${T.redBorder}`, borderRadius: 8, background: T.redBg, color: T.red, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Rates modal */}
      {showRates && (
        <RatesModal
          handles={handles}
          currentRates={rates}
          onClose={() => setShowRates(false)}
          onSaved={r => { setRates(r); setShowRates(false) }}
        />
      )}
    </div>
  )
}
