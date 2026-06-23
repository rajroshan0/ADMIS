'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Deal {
  id: string; price: number | null; currency: string | null; status: string | null
  deadline: string | null; delivery_type: string | null; channel: string | null
  created_at: string; assigned_to: string | null; campaign_id: string; creator_id: string
  campaigns: { id: string; title: string } | null
  creators: { id: string; full_name: string | null; username: string | null; platform: string | null } | null
}
interface Application {
  id: string; bid_amount: number | null; status: string | null; message: string | null
  created_at: string; assigned_to: string | null; campaign_id: string; creator_id: string
  campaigns: { id: string; title: string } | null
  creators: { id: string; full_name: string | null; username: string | null; platform: string | null } | null
}
interface BTask {
  id: string; title: string; status: string | null; assigned_to: string | null
  created_by: string | null; due_date: string | null; department: string | null
  priority: string | null; description: string | null; created_at: string
}
interface BrandMember {
  user_id: string; role: string | null; department: string | null
  profiles: { display_name: string | null; email: string | null } | null
}
interface ContentSubmission {
  id: string; brand_id: string; deal_id: string | null; submitted_by: string
  file_url: string | null; file_name: string | null; content_type: string | null
  price: number | null; channel_name: string | null
  status: string | null; feedback: string | null; submitted_at: string | null
}
interface Membership {
  brand_id: string; role: string | null; department: string | null
  brands: { id: string; name: string | null; logo_url: string | null } | null
}
interface Conversation {
  id: string; brand_id: string; creator_id: string; last_msg_at: string | null; created_at: string
  creators: { id: string; full_name: string | null; username: string | null; user_id: string | null } | null
}
interface ChatMessage {
  id: string; conversation_id: string; sender_id: string; sender_role: string
  body: string; created_at: string; read: boolean | null
}
// MediaFile kept for promo kit / deal assets if needed in future
interface MediaFile {
  id: string; deal_id: string; file_url: string | null; file_name: string | null
  content_type: string | null; caption: string | null; status: string | null; submitted_at: string | null
}
interface TaskMsg {
  id: string; task_id: string; brand_id: string; sender_id: string; content: string; created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1000)        return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
function initFrom(s: string | null | undefined) {
  if (!s) return '?'
  return s.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function memberLabel(m: BrandMember | null | undefined): string {
  if (!m) return 'Member'
  return m.profiles?.display_name?.trim() || m.profiles?.email?.trim() || 'Member'
}

const DEPT_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  promo:    { bg: '#EDE9FE', color: '#5B21B6', label: 'Promo' },
  payment:  { bg: '#FEF9C3', color: '#854D0E', label: 'Payment' },
  internal: { bg: '#E0F2FE', color: '#0369A1', label: 'Internal' },
  other:    { bg: '#F3F4F6', color: '#374151', label: 'Other' },
}
const PRIORITY_COLORS: Record<string, string> = {
  low: '#9ca3af', medium: '#854D0E', high: '#dc2626', urgent: '#7F1D1D',
}
const TASK_STATUS_CFG: Record<string, { label: string; cls: string; next: string }> = {
  todo:        { label: 'To Do',       cls: 'b-gray', next: 'in-progress' },
  'in-progress': { label: 'In Progress', cls: 'b-warn', next: 'review' },
  review:      { label: 'In Review',   cls: 'b-info', next: 'done' },
  done:        { label: '✓ Done',      cls: 'b-ok',   next: 'todo' },
}
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'b-ok'   },
  pending:   { label: 'Pending',   cls: 'b-warn' },
  completed: { label: 'Completed', cls: 'b-gray' },
  paid:      { label: 'Paid',      cls: 'b-teal' },
  applied:   { label: 'Applied',   cls: 'b-warn' },
  review:    { label: 'In Review', cls: 'b-info' },
  accepted:  { label: 'Accepted',  cls: 'b-ok'   },
  rejected:  { label: 'Rejected',  cls: 'b-red'  },
}

type Tab = 'overview' | 'deals' | 'apps' | 'tasks' | 'dept' | 'payments' | 'messages' | 'content' | 'team' | 'profile'
const TAB_TITLES: Record<Tab, string> = {
  overview: 'Dashboard', deals: 'Deals', apps: 'Applications',
  tasks: 'Task Manager', dept: 'Departments', payments: 'Payments',
  messages: 'Messages', content: 'Content', team: 'Team Members', profile: 'Profile',
}

// ─── Shared CSS (same as brand dashboard) ────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.bd-shell{display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:#f0f2f5}
.bd-side{background:#fff;border-right:0.5px solid #e5e7eb;padding:16px 12px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100vh;overflow-y:auto}
.bd-platform-logo{display:flex;align-items:center;gap:7px;padding:8px 10px 14px;margin-bottom:4px;border-bottom:0.5px solid #e5e7eb;cursor:pointer;text-decoration:none}
.bd-platform-logo-icon{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0}
.bd-platform-logo-name{font-size:14px;font-weight:700;color:#111827;letter-spacing:-.02em}
.bd-brand-head{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:10px;border-bottom:0.5px solid #e5e7eb;padding-bottom:14px}
.bd-brand-logo{width:36px;height:36px;border-radius:8px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#185FA5;flex-shrink:0}
.bd-nav-section{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;padding:10px 10px 4px;font-weight:500}
.bd-nav-item{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:6px;font-size:12.5px;color:#6b7280;cursor:pointer;transition:background .12s,color .12s;user-select:none}
.bd-nav-item:hover{background:#f0f2f5;color:#111827}
.bd-nav-item.active{background:#fff;color:#111827;font-weight:500;border:0.5px solid #e5e7eb}
.bd-nav-item .ti{font-size:15px;flex-shrink:0}
.bd-nav-badge{margin-left:auto;font-size:10px;background:#FAEEDA;color:#854F0B;padding:2px 6px;border-radius:10px;font-weight:500}
.bd-main{display:flex;flex-direction:column;min-height:100vh;background:#f0f2f5}
.bd-topbar{padding:14px 20px;border-bottom:0.5px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#fff;position:sticky;top:0;z-index:20;flex-shrink:0}
.bd-body{padding:18px 20px;display:flex;flex-direction:column;gap:14px;flex:1}
.bd-stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.bd-stat{background:#fff;border:0.5px solid #e5e7eb;border-radius:10px;padding:14px 16px}
.bd-stat-val{font-size:22px;font-weight:600;color:#111827;letter-spacing:-.02em}
.bd-stat-lbl{font-size:11px;color:#6b7280;margin-top:3px}
.bd-card{background:#fff;border:0.5px solid #e5e7eb;border-radius:10px;padding:16px}
.bd-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.bd-card-title{font-size:13px;font-weight:600;color:#111827}
.bd-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bd-three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:500;padding:2px 8px;border-radius:10px;white-space:nowrap;line-height:1.4}
.b-ok{background:#EAF3DE;color:#3B6D11}
.b-warn{background:#FAEEDA;color:#854F0B}
.b-info{background:#E6F1FB;color:#185FA5}
.b-purple{background:#EEEDFE;color:#3C3489}
.b-gray{background:#f9fafb;color:#6b7280;border:0.5px solid #e5e7eb}
.b-red{background:#FCEBEB;color:#A32D2D}
.b-teal{background:#E1F5EE;color:#085041}
.b-blue{background:#DBEAFE;color:#1E40AF}
.bd-tbl{width:100%;border-collapse:collapse;font-size:12px}
.bd-tbl th{text-align:left;padding:7px 10px;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;border-bottom:0.5px solid #e5e7eb;white-space:nowrap;background:#f9fafb}
.bd-tbl td{padding:10px 10px;border-bottom:0.5px solid #e5e7eb;color:#111827;vertical-align:middle}
.bd-tbl tr:last-child td{border-bottom:none}
.bd-tbl tr:hover td{background:#f9fafb}
.av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0}
.av-lg{width:36px;height:36px;font-size:12px}
.task-row{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:0.5px solid #e5e7eb}
.task-row:last-child{border-bottom:none}
.chk{width:16px;height:16px;border-radius:4px;border:1.5px solid #d1d5db;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.chk.done{background:#EAF3DE;border-color:#C0DD97}
.tab-bar{display:flex;border-bottom:0.5px solid #e5e7eb;margin-bottom:14px;gap:2px}
.tab-btn{font-size:12px;padding:7px 14px;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-0.5px;font-weight:400;background:none;border-top:none;border-left:none;border-right:none}
.tab-btn.on{color:#111827;font-weight:500;border-bottom:2px solid #111827}
`

// ─── TaskChatPanel ────────────────────────────────────────────────────────────
function TaskChatPanel({ task, brandId, userId, supabase, members }: {
  task: BTask; brandId: string; userId: string
  supabase: ReturnType<typeof createClient>
  members: BrandMember[]
}) {
  const [msgs, setMsgs]       = useState<TaskMsg[]>([])
  const [loaded, setLoaded]   = useState(false)
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  function mName(uid: string) {
    const m = members.find(m => m.user_id === uid)
    return m ? memberLabel(m) : 'Member'
  }

  useEffect(() => {
    supabase.from('task_messages').select('*').eq('task_id', task.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setMsgs((data ?? []) as TaskMsg[]); setLoaded(true) })
    const ch = supabase.channel(`mtask-${task.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${task.id}` },
        p => setMsgs(prev => prev.find(m => m.id === (p.new as TaskMsg).id) ? prev : [...prev, p.new as TaskMsg]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [task.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)
    await supabase.from('task_messages').insert({ task_id: task.id, brand_id: brandId, sender_id: userId, content: input.trim() })
    setInput(''); setSending(false)
  }

  function renderMsg(m: TaskMsg) {
    const mine = m.sender_id === userId
    if (m.content.startsWith('__status__:') || m.content.startsWith('__reassigned__:')) {
      const isStatus = m.content.startsWith('__status__:')
      const val = m.content.split(':')[1]
      return (
        <div key={m.id} style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', margin: '4px 0' }}>
          {isStatus ? <>Status → <strong>{val}</strong></> : <>Reassigned to <strong>{mName(val)}</strong></>} · {fmtTime(m.created_at)}
        </div>
      )
    }
    return (
      <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
        <div style={{
          maxWidth: '75%', padding: '6px 10px', fontSize: 12,
          borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          background: mine ? '#185FA5' : '#f3f4f6', color: mine ? 'white' : '#111827',
        }}>
          {!mine && <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 2, opacity: 0.7 }}>{mName(m.sender_id)}</div>}
          {m.content}
          <div style={{ fontSize: 9, opacity: 0.6, textAlign: 'right', marginTop: 2 }}>{fmtTime(m.created_at)}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ padding: '7px 12px', background: '#f9fafb', fontSize: 11, color: '#6b7280', borderBottom: '0.5px solid #e5e7eb' }}>
        <i className="ti ti-message-2" style={{ fontSize: 12, color: '#185FA5', marginRight: 5 }} />
        Chat · <strong style={{ color: '#374151' }}>{task.title}</strong>
      </div>
      <div style={{ height: 160, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
        {!loaded && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 16 }}>Loading…</div>}
        {loaded && msgs.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 16 }}>No messages — start the conversation.</div>}
        {msgs.map(renderMsg)}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '7px 10px', borderTop: '0.5px solid #e5e7eb' }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Type a message…"
          style={{ flex: 1, fontSize: 12, padding: '6px 9px', border: '0.5px solid #e5e7eb', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={send} disabled={sending || !input.trim()} style={{
          background: '#185FA5', color: 'white', border: 'none', borderRadius: 6, padding: '0 12px', cursor: 'pointer', fontSize: 13, opacity: !input.trim() ? 0.5 : 1
        }}><i className="ti ti-send" /></button>
      </div>
    </div>
  )
}

// ─── TasksView ────────────────────────────────────────────────────────────────
function TasksView({ tasks: init, brandMembers, brandId, userId, supabase }: {
  tasks: BTask[]; brandMembers: BrandMember[]; brandId: string; userId: string
  supabase: ReturnType<typeof createClient>
}) {
  const [tasks, setTasks]       = useState<BTask[]>(init)
  const [filterDept, setFDept]  = useState('all')
  const [filterStatus, setFSt]  = useState('all')
  const [openChat, setOpenChat] = useState<string | null>(null)

  function mName(uid: string | null) {
    if (!uid) return 'Unassigned'
    const m = brandMembers.find(m => m.user_id === uid)
    return m ? memberLabel(m) : 'Member'
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('brand_tasks').update({ status }).eq('id', id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status } : t))
    await supabase.from('task_messages').insert({ task_id: id, brand_id: brandId, sender_id: userId, content: `__status__:${status}` })
  }

  async function reassign(id: string, newUid: string) {
    await supabase.from('brand_tasks').update({ assigned_to: newUid }).eq('id', id)
    await supabase.from('task_messages').insert({ task_id: id, brand_id: brandId, sender_id: userId, content: `__reassigned__:${newUid}` })
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  const visible = tasks
    .filter(t => filterDept === 'all' || t.department === filterDept)
    .filter(t => filterStatus === 'all' || t.status === filterStatus)

  const selS = { fontSize: 12, padding: '5px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none' } as const

  return (
    <div className="bd-body">
      <div className="bd-stat-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total assigned',  val: tasks.length,                               cls: 'b-gray' },
          { label: 'Open',            val: tasks.filter(t => t.status !== 'done').length, cls: 'b-warn' },
          { label: 'Completed',       val: tasks.filter(t => t.status === 'done').length, cls: 'b-ok'   },
        ].map(s => (
          <div key={s.label} className="bd-stat">
            <div className="bd-stat-val">{s.val}</div>
            <div className="bd-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bd-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterDept} onChange={e => setFDept(e.target.value)} style={selS}>
            <option value="all">All departments</option>
            {Object.entries(DEPT_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFSt(e.target.value)} style={selS}>
            <option value="all">All statuses</option>
            {Object.entries(TASK_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{visible.length} task{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📭</div>
            {tasks.length === 0 ? 'No tasks assigned to you yet.' : 'No tasks match this filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map(t => {
              const cfg    = TASK_STATUS_CFG[t.status ?? 'todo'] ?? TASK_STATUS_CFG.todo
              const db     = DEPT_BADGE[t.department ?? 'other'] ?? DEPT_BADGE.other
              const isOver = t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()
              const chatOpen = openChat === t.id

              return (
                <div key={t.id} style={{
                  border: `0.5px solid ${chatOpen ? '#185FA5' : '#e5e7eb'}`, borderRadius: 8,
                  background: '#fff', opacity: t.status === 'done' ? 0.65 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
                    {/* Dept badge */}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: db.bg, color: db.color, marginTop: 2, flexShrink: 0 }}>{db.label}</span>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.status === 'done' ? '#9ca3af' : '#111827', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>
                      {t.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.description}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {t.priority && <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[t.priority] ?? '#6b7280', textTransform: 'capitalize' }}>{t.priority}</span>}
                        {t.due_date && <span style={{ fontSize: 10, color: isOver ? '#dc2626' : '#9ca3af', fontWeight: isOver ? 700 : 400 }}>Due {fmtDate(t.due_date)}{isOver ? ' ⚠' : ''}</span>}
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>From: <strong style={{ color: '#374151' }}>{mName(t.created_by)}</strong></span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                      {/* Status toggle */}
                      <button onClick={() => updateStatus(t.id, cfg.next)} className={`badge ${cfg.cls}`}
                        style={{ cursor: 'pointer', border: 'none', outline: 'none' }} title={`Click → ${TASK_STATUS_CFG[cfg.next]?.label}`}>
                        {cfg.label}
                      </button>

                      {/* Reassign */}
                      <select defaultValue="" onChange={async e => { if (e.target.value) await reassign(t.id, e.target.value) }}
                        style={{ fontSize: 11, padding: '2px 6px', border: '0.5px solid #e5e7eb', borderRadius: 5, background: '#f9fafb', cursor: 'pointer', maxWidth: 110 }}>
                        <option value="">Reassign…</option>
                        {brandMembers.filter(m => m.user_id !== userId).map(m => (
                          <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>
                        ))}
                      </select>

                      {/* Chat toggle */}
                      <button onClick={() => setOpenChat(v => v === t.id ? null : t.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 9px', background: chatOpen ? '#E6F1FB' : '#f9fafb', color: chatOpen ? '#185FA5' : '#6b7280', border: `0.5px solid ${chatOpen ? '#185FA5' : '#e5e7eb'}`, borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                        <i className="ti ti-message" style={{ fontSize: 12 }} /> Chat
                      </button>
                    </div>
                  </div>

                  {chatOpen && (
                    <div style={{ padding: '0 14px 12px' }}>
                      <TaskChatPanel task={t} brandId={brandId} userId={userId} supabase={supabase} members={brandMembers} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DealsView ────────────────────────────────────────────────────────────────
function DealsView({ deals }: { deals: Deal[] }) {
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? deals : deals.filter(d => d.status === filter)
  return (
    <div className="bd-body">
      <div className="bd-stat-row">
        {[
          { label: 'Total deals',   val: deals.length },
          { label: 'Active',        val: deals.filter(d => d.status === 'active').length },
          { label: 'Completed',     val: deals.filter(d => d.status === 'completed').length },
          { label: 'Pipeline',      val: fmt(deals.filter(d => ['active','completed','paid'].includes(d.status ?? '')).reduce((s, d) => s + (d.price ?? 0), 0)) },
        ].map(s => <div key={s.label} className="bd-stat"><div className="bd-stat-val">{s.val}</div><div className="bd-stat-lbl">{s.label}</div></div>)}
      </div>
      <div className="bd-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['all', 'active', 'completed', 'paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`tab-btn${filter === f ? ' on' : ''}`} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
        {shown.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: 13 }}>No deals found</div>
        ) : (
          <table className="bd-tbl">
            <thead><tr><th>Creator</th><th>Campaign</th><th>Platform</th><th>Price</th><th>Status</th><th>Deadline</th></tr></thead>
            <tbody>
              {shown.map(d => {
                const c = d.creators as any; const s = STATUS_CFG[d.status ?? ''] ?? { label: d.status ?? '—', cls: 'b-gray' }
                return (
                  <tr key={d.id}>
                    <td><div style={{ fontWeight: 600 }}>{c?.full_name ?? c?.username ?? '—'}</div></td>
                    <td style={{ color: '#6b7280' }}>{(d.campaigns as any)?.title ?? '—'}</td>
                    <td><span className="badge b-gray" style={{ textTransform: 'capitalize' }}>{c?.platform ?? '—'}</span></td>
                    <td style={{ fontWeight: 700 }}>{d.price ? fmt(d.price) : '—'}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td style={{ color: '#9ca3af' }}>{d.deadline ? fmtDate(d.deadline) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── ApplicationsView ─────────────────────────────────────────────────────────
function ApplicationsView({ applications, supabase }: { applications: Application[]; supabase: ReturnType<typeof createClient> }) {
  const [apps, setApps] = useState(applications)
  async function changeStatus(id: string, status: string) {
    await supabase.from('campaign_applications').update({ status }).eq('id', id)
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }
  return (
    <div className="bd-body">
      <div className="bd-stat-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Assigned to me', val: apps.length },
          { label: 'New',            val: apps.filter(a => a.status === 'applied').length },
          { label: 'Accepted',       val: apps.filter(a => a.status === 'accepted').length },
        ].map(s => <div key={s.label} className="bd-stat"><div className="bd-stat-val">{s.val}</div><div className="bd-stat-lbl">{s.label}</div></div>)}
      </div>
      <div className="bd-card">
        {apps.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13 }}>No applications assigned to you yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {apps.map(a => {
              const c = a.creators as any
              const s = STATUS_CFG[a.status ?? ''] ?? { label: a.status ?? '—', cls: 'b-gray' }
              return (
                <div key={a.id} className="bd-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div className="av av-lg" style={{ background: '#EEEDFE', color: '#3C3489' }}>{initFrom(c?.full_name ?? c?.username)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        {c?.platform ?? '—'} · {(a.campaigns as any)?.title ?? '—'} · Applied {fmtDate(a.created_at)}
                      </div>
                      {a.message && <div style={{ fontSize: 11, color: '#374151', marginTop: 6, fontStyle: 'italic' }}>"{a.message}"</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      {a.bid_amount && <span className="badge b-purple">₹{fmt(a.bid_amount)}</span>}
                      <span className={`badge ${s.cls}`}>{s.label}</span>
                      <select value={a.status ?? 'applied'} onChange={e => changeStatus(a.id, e.target.value)}
                        style={{ fontSize: 11, padding: '3px 7px', border: '0.5px solid #e5e7eb', borderRadius: 5, background: '#f9fafb', cursor: 'pointer' }}>
                        <option value="applied">Applied</option>
                        <option value="review">In Review</option>
                        <option value="accepted">Accept</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PaymentsView ─────────────────────────────────────────────────────────────
function PaymentsView({ deals }: { deals: Deal[] }) {
  const paid    = deals.filter(d => d.status === 'paid' || d.status === 'completed')
  const pending = deals.filter(d => d.status === 'active' || d.status === 'pending')
  return (
    <div className="bd-body">
      <div className="bd-stat-row" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Paid / Completed', val: fmt(paid.reduce((s, d) => s + (d.price ?? 0), 0)),    cls: 'b-ok'   },
          { label: 'Pending',          val: fmt(pending.reduce((s, d) => s + (d.price ?? 0), 0)), cls: 'b-warn' },
          { label: 'Total deals',      val: String(deals.length),                                   cls: 'b-gray' },
        ].map(s => <div key={s.label} className="bd-stat"><div className="bd-stat-val">{s.val}</div><div className="bd-stat-lbl">{s.label}</div></div>)}
      </div>
      {[{ title: 'Paid / Completed', rows: paid }, { title: 'Pending Payment', rows: pending }].map(sec => sec.rows.length > 0 && (
        <div key={sec.title} className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">{sec.title} · {sec.rows.length}</span></div>
          <table className="bd-tbl">
            <thead><tr><th>Creator</th><th>Campaign</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {sec.rows.map(d => {
                const c = d.creators as any; const s = STATUS_CFG[d.status ?? ''] ?? { label: d.status ?? '—', cls: 'b-gray' }
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{c?.full_name ?? c?.username ?? '—'}</td>
                    <td style={{ color: '#6b7280' }}>{(d.campaigns as any)?.title ?? '—'}</td>
                    <td style={{ fontWeight: 700, color: '#3B6D11' }}>{d.price ? fmt(d.price) : '—'}</td>
                    <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td style={{ color: '#9ca3af' }}>{d.deadline ? fmtDate(d.deadline) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      {deals.length === 0 && (
        <div className="bd-card" style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>No payment data yet</div>
      )}
    </div>
  )
}

// ─── DeptView ─────────────────────────────────────────────────────────────────
function DeptView({ brandMembers, tasks }: { brandMembers: BrandMember[]; tasks: BTask[] }) {
  const depts = ['promo', 'payment', 'internal', 'other'] as const
  return (
    <div className="bd-body">
      <div className="bd-two-col">
        {depts.map(dept => {
          const db = DEPT_BADGE[dept]
          const members = brandMembers.filter(m => m.department === dept || (!m.department && dept === 'other'))
          const open = tasks.filter(t => t.department === dept && t.status !== 'done').length
          return (
            <div key={dept} className="bd-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: db.color }}>{db.label} Dept</span>
                <span className={`badge ${open > 0 ? 'b-warn' : 'b-ok'}`}>{open} open task{open !== 1 ? 's' : ''}</span>
              </div>
              {members.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 12 }}>No members yet</div>
              ) : members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                  <div className="av" style={{ background: db.bg, color: db.color }}>{initFrom(m.profiles?.display_name ?? m.profiles?.email)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{memberLabel(m)}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{m.role ?? 'member'}</div>
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>
                    {tasks.filter(t => t.assigned_to === m.user_id && t.status !== 'done').length} tasks
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MessagesView ─────────────────────────────────────────────────────────────
function MessagesView({ conversations: initConvs, userId, supabase }: {
  conversations: Conversation[]; userId: string; supabase: ReturnType<typeof createClient>
}) {
  const [convs, setConvs]         = useState(initConvs)
  const [selected, setSelected]   = useState<Conversation | null>(null)
  const [msgs, setMsgs]           = useState<ChatMessage[]>([])
  const [loading, setLoading]     = useState(false)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  async function open(conv: Conversation) {
    setSelected(conv); setLoading(true); setMsgs([])
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', conv.id).order('created_at', { ascending: true }).limit(100)
    setMsgs((data ?? []) as ChatMessage[]); setLoading(false)
  }

  useEffect(() => {
    if (!selected) return
    const ch = supabase.channel(`mchat-${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.id}` },
        p => setMsgs(prev => prev.find(m => m.id === (p.new as ChatMessage).id) ? prev : [...prev, p.new as ChatMessage]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selected?.id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send() {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const { data } = await supabase.from('messages').insert({
      conversation_id: selected.id, sender_id: userId, sender_role: 'brand', body: input.trim(), read: false
    }).select('*').single()
    if (data) { setMsgs(prev => [...prev, data as ChatMessage]); setInput('') }
    setSending(false)
  }

  return (
    <div className="bd-body" style={{ padding: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', height: '80vh' }}>
        {/* List */}
        <div style={{ borderRight: '0.5px solid #e5e7eb', overflowY: 'auto' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f3f4f6', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Conversations</div>
          {convs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No conversations yet</div>}
          {convs.map(c => {
            const cr = c.creators as any; const name = cr?.full_name ?? cr?.username ?? 'Creator'
            const sel = selected?.id === c.id
            return (
              <button key={c.id} onClick={() => open(c)} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '11px 14px', background: sel ? '#E6F1FB' : 'transparent', border: 'none', cursor: 'pointer', borderBottom: '0.5px solid #f3f4f6', textAlign: 'left' }}>
                <div className="av" style={{ background: '#E1F5EE', color: '#085041' }}>{initFrom(name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: sel ? '#185FA5' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{c.last_msg_at ? fmtDate(c.last_msg_at) : 'No messages'}</div>
                </div>
              </button>
            )
          })}
        </div>
        {/* Chat */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ textAlign: 'center' }}><i className="ti ti-message-2" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: '#d1d5db' }} />Select a conversation</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '11px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div className="av" style={{ background: '#E1F5EE', color: '#085041' }}>{initFrom((selected.creators as any)?.full_name ?? (selected.creators as any)?.username)}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{(selected.creators as any)?.full_name ?? (selected.creators as any)?.username ?? 'Creator'}</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {loading && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Loading…</div>}
                {!loading && msgs.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 40 }}>No messages yet</div>}
                {msgs.map(m => {
                  const mine = m.sender_id === userId
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '72%', padding: '8px 12px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? '#185FA5' : '#f3f4f6', color: mine ? 'white' : '#111827', fontSize: 13 }}>
                        {m.body}
                        <div style={{ fontSize: 9, opacity: 0.6, textAlign: 'right', marginTop: 2 }}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              <div style={{ padding: '10px 14px', borderTop: '0.5px solid #e5e7eb', display: 'flex', gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Type a message…"
                  style={{ flex: 1, fontSize: 13, padding: '8px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={send} disabled={sending || !input.trim()} style={{ background: '#185FA5', color: 'white', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, cursor: 'pointer', opacity: !input.trim() ? 0.5 : 1 }}>
                  {sending ? '…' : <i className="ti ti-send" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ContentView ──────────────────────────────────────────────────────────────
const CONTENT_STATUS: Record<string, { label: string; cls: string }> = {
  pending:         { label: 'Pending Review', cls: 'b-warn'   },
  approved:        { label: '✓ Approved',     cls: 'b-ok'     },
  needs_revision:  { label: 'Needs Revision', cls: 'b-purple' },
  rejected:        { label: 'Rejected',       cls: 'b-red'    },
}
const CONTENT_TYPE_ICONS: Record<string, string> = {
  video: 'ti-brand-youtube', image: 'ti-photo', document: 'ti-file-text', link: 'ti-link',
}

function ContentView({ initialSubmissions, deals, brandId, userId, supabase }: {
  initialSubmissions: ContentSubmission[]
  deals: Deal[]
  brandId: string
  userId: string
  supabase: ReturnType<typeof createClient>
}) {
  const [submissions, setSubmissions] = useState<ContentSubmission[]>(initialSubmissions)
  const [showForm, setShowForm]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Form state
  const [fDeal,        setFDeal]        = useState('')
  const [fLink,        setFLink]        = useState('')
  const [fChannelName, setFChannelName] = useState('')
  const [fPrice,       setFPrice]       = useState('')
  const [fType,        setFType]        = useState('video')

  async function submit() {
    if (!fLink.trim()) { setError('Please enter a content link.'); return }
    setSubmitting(true); setError(null)

    const { data, error: err } = await supabase.from('content_submissions').insert({
      brand_id:     brandId,
      submitted_by: userId,
      deal_id:      fDeal || null,
      file_url:     fLink.trim(),
      file_name:    fChannelName.trim() || null,
      content_type: fType,
      price:        fPrice ? parseFloat(fPrice) : null,
      channel_name: fChannelName.trim() || null,
      status:       'pending',
    }).select('id, brand_id, deal_id, submitted_by, file_url, file_name, content_type, price, channel_name, status, feedback, submitted_at').single()

    if (err) { setError('Failed: ' + err.message); setSubmitting(false); return }
    if (data) setSubmissions(prev => [data as ContentSubmission, ...prev])

    setFDeal(''); setFLink(''); setFChannelName(''); setFPrice(''); setFType('video')
    setShowForm(false); setSubmitting(false)
  }

  const inpS = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none', fontFamily: 'inherit' } as const
  const lbl  = (t: string) => <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>{t}</label>

  return (
    <div className="bd-body">
      {/* ── Stats ── */}
      <div className="bd-stat-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total submitted',  val: submissions.length },
          { label: 'Pending review',   val: submissions.filter(s => s.status === 'pending').length },
          { label: 'Approved',         val: submissions.filter(s => s.status === 'approved').length },
          { label: 'Needs revision',   val: submissions.filter(s => s.status === 'needs_revision').length },
        ].map(s => <div key={s.label} className="bd-stat"><div className="bd-stat-val">{s.val}</div><div className="bd-stat-lbl">{s.label}</div></div>)}
      </div>

      {/* ── Submit form ── */}
      <div className="bd-card">
        <div className="bd-card-hd">
          <span className="bd-card-title">Submit Content</span>
          <button onClick={() => { setShowForm(v => !v); setError(null) }}
            style={{ fontSize: 12, padding: '5px 14px', background: showForm ? '#f3f4f6' : '#185FA5', color: showForm ? '#6b7280' : 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {showForm ? 'Cancel' : '+ New Submission'}
          </button>
        </div>

        {showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.5px solid #e5e7eb', paddingTop: 14 }}>
            {error && <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>{error}</div>}

            {/* Row 1: Deal + Type */}
            <div className="bd-two-col">
              <div>
                {lbl('Deal (optional)')}
                <select value={fDeal} onChange={e => setFDeal(e.target.value)} style={inpS}>
                  <option value="">— No specific deal —</option>
                  {deals.map(d => {
                    const cr = d.creators as any
                    return <option key={d.id} value={d.id}>{(d.campaigns as any)?.title ?? 'Campaign'} · {cr?.full_name ?? cr?.username ?? 'Creator'}</option>
                  })}
                </select>
              </div>
              <div>
                {lbl('Content Type')}
                <select value={fType} onChange={e => setFType(e.target.value)} style={inpS}>
                  <option value="video">🎬 Video</option>
                  <option value="image">🖼 Image</option>
                  <option value="link">🔗 Link</option>
                  <option value="document">📄 Document</option>
                </select>
              </div>
            </div>

            {/* Row 2: Link */}
            <div>
              {lbl('Content Link *')}
              <input value={fLink} onChange={e => setFLink(e.target.value)}
                placeholder="https://youtube.com/… or drive.google.com/… or instagram.com/…"
                style={inpS} />
            </div>

            {/* Row 3: Channel Name + Price */}
            <div className="bd-two-col">
              <div>
                {lbl('Channel Name')}
                <input value={fChannelName} onChange={e => setFChannelName(e.target.value)}
                  placeholder="e.g. @TechWithRaj, MrBeast, etc."
                  style={inpS} />
              </div>
              <div>
                {lbl('Price (₹)')}
                <input type="number" value={fPrice} onChange={e => setFPrice(e.target.value)}
                  placeholder="e.g. 25000"
                  style={inpS} min={0} step={100} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={submit} disabled={submitting || !fLink.trim()}
                style={{ padding: '8px 22px', background: '#185FA5', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !fLink.trim() ? 0.5 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Submissions list ── */}
      <div className="bd-card">
        <div className="bd-card-hd"><span className="bd-card-title">My Submissions · {submissions.length}</span></div>
        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📤</div>
            No submissions yet — click <strong>+ New Submission</strong> above.
          </div>
        ) : (
          <table className="bd-tbl">
            <thead>
              <tr><th>Link</th><th>Channel</th><th>Price</th><th>Type</th><th>Deal</th><th>Status</th><th>Feedback</th><th>Date</th></tr>
            </thead>
            <tbody>
              {submissions.map(cs => {
                const sc = CONTENT_STATUS[cs.status ?? 'pending'] ?? { label: cs.status ?? 'pending', cls: 'b-gray' }
                const icon = CONTENT_TYPE_ICONS[cs.content_type ?? 'link'] ?? 'ti-file'
                const deal = deals.find(d => d.id === cs.deal_id)
                const dealLabel = deal ? ((deal.campaigns as any)?.title ?? 'Deal') : '—'
                return (
                  <tr key={cs.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 28, height: 28, background: '#f3f4f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`ti ${icon}`} style={{ fontSize: 14, color: '#9ca3af' }} />
                        </div>
                        {cs.file_url ? (
                          <a href={cs.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {cs.file_url.replace(/^https?:\/\//, '').split('/')[0]}
                            <i className="ti ti-external-link" style={{ fontSize: 10, marginLeft: 3 }} />
                          </a>
                        ) : '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{(cs as any).channel_name ?? cs.file_name ?? '—'}</td>
                    <td style={{ fontWeight: 700, color: '#3B6D11' }}>{(cs as any).price ? fmt((cs as any).price) : '—'}</td>
                    <td><span className="badge b-gray" style={{ textTransform: 'capitalize' }}>{cs.content_type ?? '—'}</span></td>
                    <td style={{ fontSize: 11, color: '#6b7280' }}>{dealLabel}</td>
                    <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                    <td style={{ fontSize: 11, color: cs.feedback ? '#111827' : '#9ca3af', maxWidth: 160 }}>
                      {cs.feedback
                        ? <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 4, padding: '3px 7px', fontStyle: 'italic' }}>"{cs.feedback}"</div>
                        : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{cs.submitted_at ? fmtDate(cs.submitted_at) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── TeamView ─────────────────────────────────────────────────────────────────
function TeamView({ brandMembers, tasks }: { brandMembers: BrandMember[]; tasks: BTask[] }) {
  return (
    <div className="bd-body">
      <div className="bd-card">
        <div className="bd-card-hd"><span className="bd-card-title">All Team Members · {brandMembers.length}</span></div>
        {brandMembers.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: 13 }}>No team members yet</div>
        ) : (
          <table className="bd-tbl">
            <thead><tr><th>Member</th><th>Role</th><th>Department</th><th>Open Tasks</th></tr></thead>
            <tbody>
              {brandMembers.map(m => {
                const db = DEPT_BADGE[m.department ?? 'other'] ?? DEPT_BADGE.other
                const open = tasks.filter(t => t.assigned_to === m.user_id && t.status !== 'done').length
                return (
                  <tr key={m.user_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="av" style={{ background: db.bg, color: db.color }}>{initFrom(m.profiles?.display_name ?? m.profiles?.email)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{m.profiles?.display_name ?? '—'}</div>
                          {m.profiles?.email && <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.profiles.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize', color: '#6b7280', fontSize: 12 }}>{m.role ?? 'member'}</td>
                    <td><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: db.bg, color: db.color }}>{db.label}</span></td>
                    <td style={{ fontWeight: open > 0 ? 600 : 400, color: open > 0 ? '#111827' : '#9ca3af' }}>{open}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MemberDashboard({
  user, profile, membership, deals, applications, tasks, brandMembers,
  contentSubmissions, conversations,
}: {
  user: { id: string; email: string }
  profile: { displayName: string | null; role: string }
  membership: Membership | null
  deals: Deal[]
  applications: Application[]
  tasks: BTask[]
  brandMembers: BrandMember[]
  contentSubmissions: ContentSubmission[]
  conversations: Conversation[]
}) {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<Tab>('overview')

  const brandName   = membership?.brands?.name ?? 'Your Brand'
  const brandId     = membership?.brand_id ?? ''
  const displayName = profile.displayName ?? user.email
  const initials    = initFrom(displayName)
  const myOpenTasks = tasks.filter(t => t.status !== 'done')

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  const NAV: { icon: string; label: string; tab: Tab; badge?: number }[] = [
    { icon: 'ti-layout-dashboard', label: 'Dashboard',    tab: 'overview' },
    { icon: 'ti-handshake',        label: 'Deals',        tab: 'deals',   badge: deals.filter(d => d.status === 'active').length || undefined },
    { icon: 'ti-inbox',            label: 'Applications', tab: 'apps',    badge: applications.filter(a => a.status === 'applied').length || undefined },
    { icon: 'ti-checklist',        label: 'Task Manager', tab: 'tasks',   badge: myOpenTasks.length || undefined },
    { icon: 'ti-layout-columns',   label: 'Departments',  tab: 'dept' },
    { icon: 'ti-cash',             label: 'Payments',     tab: 'payments' },
    { icon: 'ti-message-dots',     label: 'Messages',     tab: 'messages', badge: conversations.length || undefined },
    { icon: 'ti-video',            label: 'Content',      tab: 'content' },
    { icon: 'ti-users',            label: 'Team',         tab: 'team' },
    { icon: 'ti-user',             label: 'Profile',      tab: 'profile' },
  ]

  const SECTIONS = [
    { title: 'Work',    items: NAV.slice(0, 7) },
    { title: 'Account', items: NAV.slice(7) },
  ]

  return (
    <>
      <style>{CSS}</style>
      <div className="bd-shell">
        {/* ── Sidebar ── */}
        <aside className="bd-side">
          <a href="/dashboard/brand/discover" className="bd-platform-logo">
            <div className="bd-platform-logo-icon">A</div>
            <span className="bd-platform-logo-name">ADMIS</span>
          </a>
          <div className="bd-brand-head">
            <div className="bd-brand-logo">{initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{brandName}</div>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{membership?.role ?? 'Member'}</div>
            </div>
          </div>

          {SECTIONS.map(sec => (
            <div key={sec.title}>
              <div className="bd-nav-section">{sec.title}</div>
              {sec.items.map(n => (
                <div key={n.label} className={`bd-nav-item${tab === n.tab ? ' active' : ''}`} onClick={() => setTab(n.tab)}>
                  <i className={`ti ${n.icon}`} />
                  {n.label}
                  {n.badge ? <span className="bd-nav-badge">{n.badge}</span> : null}
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop: 'auto', padding: '12px 10px 0', borderTop: '0.5px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{user.email}</div>
            <div className="bd-nav-item" onClick={signOut} style={{ color: '#A32D2D' }}>
              <i className="ti ti-logout" /> Sign out
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="bd-main">
          <div className="bd-topbar">
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{TAB_TITLES[tab]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge b-blue">{displayName}</span>
              {myOpenTasks.length > 0 && <span className="badge b-warn">{myOpenTasks.length} open task{myOpenTasks.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <div className="bd-body">
              <div className="bd-stat-row">
                {[
                  { label: 'Active deals',   val: deals.filter(d => d.status === 'active').length },
                  { label: 'My open tasks',  val: myOpenTasks.length },
                  { label: 'Applications',   val: applications.length },
                  { label: 'Conversations',  val: conversations.length },
                ].map(s => (
                  <div key={s.label} className="bd-stat">
                    <div className="bd-stat-val">{s.val}</div>
                    <div className="bd-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bd-two-col">
                {/* My tasks */}
                <div className="bd-card">
                  <div className="bd-card-hd">
                    <span className="bd-card-title">My open tasks</span>
                    <span style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }} onClick={() => setTab('tasks')}>View all →</span>
                  </div>
                  {myOpenTasks.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: 12, padding: '12px 0', textAlign: 'center' }}>All caught up! 🎉</div>
                  ) : myOpenTasks.slice(0, 6).map(t => {
                    const db = DEPT_BADGE[t.department ?? 'other'] ?? DEPT_BADGE.other
                    const cfg = TASK_STATUS_CFG[t.status ?? 'todo'] ?? TASK_STATUS_CFG.todo
                    return (
                      <div key={t.id} className="task-row">
                        <div className={`chk${t.status === 'done' ? ' done' : ''}`}>
                          {t.status === 'done' && <i className="ti ti-check" style={{ fontSize: 10, color: '#3B6D11' }} />}
                        </div>
                        <div style={{ flex: 1, fontSize: 12.5 }}>{t.title}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: db.bg, color: db.color }}>{db.label}</span>
                        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Recent deals */}
                <div className="bd-card">
                  <div className="bd-card-hd">
                    <span className="bd-card-title">Recent deals</span>
                    <span style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }} onClick={() => setTab('deals')}>View all →</span>
                  </div>
                  {deals.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: 12, padding: '12px 0', textAlign: 'center' }}>No deals yet</div>
                  ) : deals.slice(0, 5).map(d => {
                    const c = d.creators as any; const s = STATUS_CFG[d.status ?? ''] ?? { label: d.status ?? '—', cls: 'b-gray' }
                    return (
                      <div key={d.id} className="task-row">
                        <div className="av" style={{ background: '#E1F5EE', color: '#085041' }}>{initFrom(c?.full_name ?? c?.username)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{(d.campaigns as any)?.title ?? '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${s.cls}`}>{s.label}</span>
                          {d.price && <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginTop: 2 }}>{fmt(d.price)}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'deals'    && <DealsView deals={deals} />}
          {tab === 'apps'     && <ApplicationsView applications={applications} supabase={supabase} />}
          {tab === 'tasks'    && <TasksView tasks={tasks} brandMembers={brandMembers} brandId={brandId} userId={user.id} supabase={supabase} />}
          {tab === 'dept'     && <DeptView brandMembers={brandMembers} tasks={tasks} />}
          {tab === 'payments' && <PaymentsView deals={deals} />}
          {tab === 'messages' && <MessagesView conversations={conversations} userId={user.id} supabase={supabase} />}
          {tab === 'content'  && <ContentView initialSubmissions={contentSubmissions} deals={deals} brandId={brandId} userId={user.id} supabase={supabase} />}
          {tab === 'team'     && <TeamView brandMembers={brandMembers} tasks={tasks} />}

          {tab === 'profile' && (
            <div className="bd-body">
              <div className="bd-card" style={{ maxWidth: 460 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'white' }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{user.email}</div>
                  </div>
                </div>
                {[
                  { label: 'Brand',      value: brandName },
                  { label: 'Role',       value: membership?.role ?? 'Member' },
                  { label: 'Department', value: DEPT_BADGE[membership?.department ?? 'other']?.label ?? '—' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f3f4f6', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{r.label}</span>
                    <span style={{ fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
                <button onClick={signOut} style={{ marginTop: 20, width: '100%', padding: 10, border: '0.5px solid #e5e7eb', borderRadius: 8, background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#A32D2D' }}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
