'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const T = {
  bg: '#090c12', side: '#0b0e16', card: '#10141e', cardHov: '#141926',
  elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  green: '#4ade80', amber: '#f5a623', red: '#f4574d',
  purple: '#5710fc', purpleL: '#7c3aed',
}

type StatusFilter = 'pending' | 'approved' | 'rejected'
type EntityFilter = 'all' | 'creator' | 'brand' | 'agency'

interface VRequest {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  platform: string | null
  verification_type: string
  verification_code: string | null
  channel_url: string | null
  screenshot_url: string | null
  id_proof_url: string | null
  status: string
  admin_notes: string | null
  resubmit_count: number
  created_at: string
  userName: string
  entityName: string
}

const ENTITY_COLORS: Record<string, string> = {
  creator: '#25e0d6', brand: '#ec4899', agency: '#f5a623',
}

export default function AdminVerifications({ userInitials }: { userInitials?: string }) {
  const router = useRouter()

  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('pending')
  const [entityFilter,  setEntityFilter]  = useState<EntityFilter>('all')
  const [requests,      setRequests]      = useState<VRequest[]>([])
  const [total,         setTotal]         = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState<VRequest | null>(null)
  const [notes,         setNotes]         = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg,     setActionMsg]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: statusFilter })
    if (entityFilter !== 'all') params.set('entity_type', entityFilter)

    const res  = await fetch(`/api/admin/verifications?${params}`)
    const data = await res.json()
    setRequests(data.data ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [statusFilter, entityFilter])

  useEffect(() => { load() }, [load])

  async function handleAction(action: 'approve' | 'reject') {
    if (!selected) return
    if (action === 'reject' && !notes.trim()) { setActionMsg('Please add a rejection reason.'); return }
    setActionLoading(true); setActionMsg(null)

    const res  = await fetch('/api/admin/verifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ requestId: selected.id, action, notes: notes.trim() || undefined }),
    })
    const data = await res.json()

    if (res.ok) {
      setActionMsg(action === 'approve' ? '✓ Approved!' : '✗ Rejected.')
      setSelected(null); setNotes('')
      load()
    } else {
      setActionMsg(data.error ?? 'Action failed.')
    }
    setActionLoading(false)
  }

  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={{ width: 220, background: T.side, borderRight: `1px solid ${T.border}`, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 13 }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 14 }}>Admin Panel</span>
        </div>
        {[
          { label: 'Verifications', href: '/dashboard/admin/verifications', active: true },
          { label: 'Brand Discovery',  href: '/dashboard/brand/discover' },
          { label: 'Creator Discovery',href: '/dashboard/creator/discover' },
        ].map(item => (
          <div key={item.label} onClick={() => router.push(item.href)}
            style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: item.active ? 700 : 500, color: item.active ? T.text : T.dim, background: item.active ? T.elev : 'transparent' }}>
            {item.label}
          </div>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div onClick={signOut} style={{ padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, color: T.faint }}>Sign out</div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>Verification Requests</h1>
            <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>{loading ? 'Loading…' : `${total} ${statusFilter} request${total !== 1 ? 's' : ''}`}</p>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${T.purple},#a855f7)`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 13 }}>{userInitials ?? 'A'}</div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 4, background: T.side, borderRadius: 10, padding: 4 }}>
            {(['pending','approved','rejected'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', background: statusFilter === s ? T.elev : 'transparent', color: statusFilter === s ? T.text : T.dim }}>
                {s}
              </button>
            ))}
          </div>
          {/* Entity type */}
          <div style={{ display: 'flex', gap: 4, background: T.side, borderRadius: 10, padding: 4 }}>
            {(['all','creator','brand','agency'] as EntityFilter[]).map(e => (
              <button key={e} onClick={() => setEntityFilter(e)}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize', background: entityFilter === e ? T.elev : 'transparent', color: entityFilter === e ? (e !== 'all' ? ENTITY_COLORS[e] : T.text) : T.dim }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <SkeletonList />
        ) : requests.length === 0 ? (
          <EmptyState status={statusFilter} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => (
              <RequestRow key={r.id} req={r} onClick={() => { setSelected(r); setNotes(''); setActionMsg(null) }} />
            ))}
          </div>
        )}

        {actionMsg && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: actionMsg.startsWith('✓') ? `${T.green}11` : `${T.red}11`, color: actionMsg.startsWith('✓') ? T.green : T.red, fontSize: 13, border: `1px solid ${actionMsg.startsWith('✓') ? T.green : T.red}33` }}>
            {actionMsg}
          </div>
        )}
      </div>

      {/* ── Detail Panel ──────────────────────────────────────── */}
      {selected && (
        <aside style={{ width: 380, background: T.side, borderLeft: `1px solid ${T.border}`, padding: 24, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Review Request</h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>

          {/* Meta */}
          <div style={{ background: T.elev, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <Row label="Entity"     value={<><EntityBadge type={selected.entity_type} /> {selected.entityName}</>} />
            <Row label="User"       value={selected.userName || selected.user_id.slice(0,8)} />
            <Row label="Platform"   value={selected.platform ?? '—'} />
            <Row label="Type"       value={selected.verification_type} />
            <Row label="Resubmits"  value={String(selected.resubmit_count)} />
            <Row label="Submitted"  value={new Date(selected.created_at).toLocaleString()} />
          </div>

          {/* Verification code */}
          {selected.verification_code && (
            <div style={{ background: `${T.amber}11`, border: `1px solid ${T.amber}33`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code given to creator</div>
              <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: T.amber, letterSpacing: '0.1em' }}>{selected.verification_code}</div>
            </div>
          )}

          {/* Channel URL */}
          {selected.channel_url && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Channel URL</div>
              <a href={selected.channel_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#6b7dff', wordBreak: 'break-all' }}>{selected.channel_url}</a>
            </div>
          )}

          {/* Screenshot */}
          {selected.screenshot_url && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Screenshot</div>
              <a href={selected.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img src={selected.screenshot_url} alt="Screenshot" style={{ width: '100%', borderRadius: 10, border: `1px solid ${T.border}`, maxHeight: 260, objectFit: 'cover' }} />
              </a>
              <a href={selected.screenshot_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#6b7dff', display: 'block', marginTop: 4 }}>Open full image ↗</a>
            </div>
          )}

          {/* ID Proof */}
          {selected.id_proof_url && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ID Proof</div>
              <a href={selected.id_proof_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#6b7dff', textDecoration: 'none' }}>
                📄 View ID document ↗
              </a>
            </div>
          )}

          {/* Existing admin notes */}
          {selected.admin_notes && (
            <div style={{ background: `${T.red}11`, border: `1px solid ${T.red}22`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: T.dim }}>
              <b style={{ color: T.red }}>Previous note:</b> {selected.admin_notes}
            </div>
          )}

          {/* Action controls — only for pending */}
          {selected.status === 'pending' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes (required for rejection)</label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Code not found in bio. Please paste exactly: ADMISDB-XXXXX"
                  rows={3}
                  style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {actionMsg && (
                <div style={{ marginBottom: 12, fontSize: 13, color: actionMsg.startsWith('✓') ? T.green : T.red }}>{actionMsg}</div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleAction('reject')} disabled={actionLoading}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${T.red}66`, background: `${T.red}11`, color: T.red, fontWeight: 700, fontSize: 13, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                  {actionLoading ? '…' : 'Reject'}
                </button>
                <button onClick={() => handleAction('approve')} disabled={actionLoading}
                  style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: actionLoading ? T.elev : `linear-gradient(135deg,${T.green},#22c55e)`, color: actionLoading ? T.dim : '#000', fontWeight: 800, fontSize: 13, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                  {actionLoading ? 'Processing…' : '✓ Approve & Verify'}
                </button>
              </div>
            </>
          )}

          {selected.status !== 'pending' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: selected.status === 'approved' ? `${T.green}11` : `${T.red}11`, border: `1px solid ${selected.status === 'approved' ? T.green : T.red}33`, fontSize: 13, color: selected.status === 'approved' ? T.green : T.red, fontWeight: 700, textAlign: 'center', textTransform: 'capitalize' }}>
              {selected.status === 'approved' ? '✓ Verified' : '✗ Rejected'}
            </div>
          )}
        </aside>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function RequestRow({ req, onClick }: { req: VRequest; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const entityColor = ENTITY_COLORS[req.entity_type] ?? T.dim
  const statusColor = req.status === 'pending' ? T.amber : req.status === 'approved' ? T.green : T.red

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}
      style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${entityColor}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background .15s' }}>

      <EntityBadge type={req.entity_type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{req.entityName || `${req.entity_type} #${req.entity_id.slice(0,6)}`}</div>
        <div style={{ fontSize: 12, color: T.dim }}>
          {req.platform ?? req.verification_type}
          {req.resubmit_count > 0 && <span style={{ color: T.amber, marginLeft: 8 }}>↺ {req.resubmit_count}x resubmit</span>}
        </div>
      </div>

      {req.screenshot_url && <span style={{ fontSize: 11, color: T.faint }}>📸 screenshot</span>}
      {req.id_proof_url  && <span style={{ fontSize: 11, color: T.faint }}>🪪 ID proof</span>}
      {req.verification_code && <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.amber }}>{req.verification_code}</span>}

      <div style={{ fontSize: 11, color: T.faint, flexShrink: 0 }}>
        {new Date(req.created_at).toLocaleDateString()}
      </div>

      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusColor}22`, color: statusColor, textTransform: 'capitalize', flexShrink: 0 }}>
        {req.status}
      </span>
    </div>
  )
}

function EntityBadge({ type }: { type: string }) {
  const color = ENTITY_COLORS[type] ?? T.dim
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${color}22`, color, textTransform: 'capitalize', flexShrink: 0 }}>{type}</span>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: T.faint, fontWeight: 700, minWidth: 70, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 13, color: T.dim }}>{value}</span>
    </div>
  )
}

function EmptyState({ status }: { status: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: T.dim }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>No {status} requests</p>
      <p style={{ fontSize: 14, margin: 0 }}>All caught up!</p>
    </div>
  )
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4].map(i => <div key={i} style={{ background: T.card, borderRadius: 12, height: 64, opacity: 0.3 + i * 0.1 }} />)}
    </div>
  )
}
