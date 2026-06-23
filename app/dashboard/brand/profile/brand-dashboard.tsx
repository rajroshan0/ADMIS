'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { notify } from '@/lib/notifications'
import AnalystView   from './analyst-view'
import BannerMaker   from './banner-maker'
import ChatbotPopup  from '@/components/chat/ChatbotPopup'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BrandConversation {
  id: string
  brand_id: string
  creator_id: string
  last_msg_at: string | null
  created_at: string
  creators: { id: string; full_name: string | null; username: string | null; user_id: string | null } | null
}
interface BrandMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: string
  body: string
  created_at: string
  read: boolean | null
}
interface Notification {
  id: string
  type: string
  data: { title?: string; body?: string; link?: string } | null
  is_read: boolean
  created_at: string
}
interface Brand {
  id: string
  name: string | null
  logo_url: string | null
  website: string | null
  company_size: string | null
  budget_range: string | null
}
interface Campaign {
  id: string
  title: string
  status: string | null
  platforms: string[] | null
  budget_total: number | null
  payout_amount: number | null
  deadline: string | null
  slots: number | null
  created_at: string
}
interface TeamMember {
  id: string
  user_id: string
  role: string | null
  department: string | null
  joined_at: string | null
  profiles: { display_name: string | null; avatar_url: string | null; email: string | null } | null
}
interface Application {
  id: string
  bid_amount: number | null
  status: string
  message: string | null
  created_at: string
  campaign_id: string
  creator_id: string
  assigned_to: string | null
  campaigns: { id: string; title: string; platforms: string[] | null } | null
  creators: { id: string; full_name: string | null; username: string | null; platform: string | null; price_per_post: number | null; user_id: string | null } | null
}
interface Deal {
  id: string
  price: number | null
  final_price: number | null
  currency: string | null
  status: string | null
  deadline: string | null
  delivery_type: string | null
  deliverables_count: number | null
  channel: string | null
  channel_link: string | null
  promo_code: string | null
  created_at: string
  updated_at: string | null
  campaign_id: string | null
  creator_id: string
  application_id: string | null
  assigned_to: string | null
  campaigns: { id: string; title: string | null } | null
  creators: { id: string; full_name: string | null; username: string | null; platform: string | null } | null
}
interface ContentSubmission {
  id: string
  deal_id: string
  brand_id: string
  creator_id: string
  file_url: string
  file_name: string | null
  content_type: string | null
  caption: string | null
  status: string
  feedback: string | null
  submitted_at: string
  deals?: { campaigns?: { title: string | null } | null; creators?: { full_name: string | null; username: string | null } | null } | null
}
interface Props {
  user: { id: string; email: string }
  brand: Brand | null
  profile: { role: string | null; display_name: string | null; avatar_url: string | null } | null
  campaigns: Campaign[]
  applications: Application[]
  deals: Deal[]
  conversations: BrandConversation[]
  teamMembers: TeamMember[]
  unreadNotifs: number
  initials: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'campaigns' | 'tracker' | 'apps' | 'messages' | 'media' | 'dept' | 'content' | 'payments' | 'tasks' | 'team' | 'reports' | 'settings'

const TAB_TITLES: Record<Tab, string> = {
  overview: 'Dashboard', campaigns: 'My Campaigns', tracker: 'Deals', apps: 'Applications',
  messages: 'Messages',
  media: 'Promo toolkit', dept: 'Departments', content: 'Content received',
  payments: 'Payments', tasks: 'Task manager', team: 'Team members',
  reports: 'Reports', settings: 'Settings',
}

/** Best display label for a team member — name → email → fallback */
function memberLabel(m: { profiles?: { display_name?: string | null; email?: string | null } | null } | null | undefined, fallback = 'Member'): string {
  if (!m) return fallback
  return m.profiles?.email?.trim() || m.profiles?.display_name?.trim() || fallback
}

function fmt(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1000)        return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function initFrom(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AV_COLORS = [
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#FCEBEB', color: '#A32D2D' },
]
function avColor(id: string) { return AV_COLORS[id.charCodeAt(0) % AV_COLORS.length] }

const STATUS: Record<string, { label: string; cls: string }> = {
  active:      { label: 'Active',     cls: 'b-ok'    },
  open:        { label: 'Active',     cls: 'b-ok'    },
  draft:       { label: 'Draft',      cls: 'b-gray'  },
  completed:   { label: 'Completed',  cls: 'b-gray'  },
  paused:      { label: 'Paused',     cls: 'b-warn'  },
  applied:     { label: 'New',        cls: 'b-warn'  },
  review:      { label: 'In Review',  cls: 'b-info'  },
  shortlisted: { label: 'Reviewing',  cls: 'b-info'  },
  accepted:    { label: 'Accepted',   cls: 'b-ok'    },
  success:     { label: 'Success ✓',  cls: 'b-teal'  },
  rejected:    { label: 'Rejected',   cls: 'b-red'   },
  withdrawn:   { label: 'Withdrawn',  cls: 'b-gray'  },
}

// ─── CSS (matches mockup exactly) ────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.bd-shell{display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:var(--color-background-tertiary,#f0f2f5)}
.bd-side{background:var(--color-background-secondary,#fff);border-right:0.5px solid var(--color-border-tertiary,#e5e7eb);padding:16px 12px;display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100vh;overflow-y:auto}
.bd-platform-logo{display:flex;align-items:center;gap:7px;padding:8px 10px 14px;margin-bottom:4px;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);cursor:pointer;text-decoration:none}
.bd-platform-logo-icon{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;letter-spacing:-.03em;flex-shrink:0}
.bd-platform-logo-name{font-size:14px;font-weight:700;color:#111827;letter-spacing:-.02em}
.bd-brand-head{display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:10px;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);padding-bottom:14px}
.bd-brand-logo{width:36px;height:36px;border-radius:8px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#185FA5;flex-shrink:0;letter-spacing:.02em}
.bd-nav-section{font-size:10px;color:var(--color-text-tertiary,#9ca3af);text-transform:uppercase;letter-spacing:.07em;padding:10px 10px 4px;font-weight:500}
.bd-nav-item{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:6px;font-size:12.5px;color:var(--color-text-secondary,#6b7280);cursor:pointer;transition:background .12s,color .12s;user-select:none}
.bd-nav-item:hover{background:var(--color-background-tertiary,#f0f2f5);color:var(--color-text-primary,#111827)}
.bd-nav-item.active{background:var(--color-background-primary,#fff);color:var(--color-text-primary,#111827);font-weight:500;border:0.5px solid var(--color-border-tertiary,#e5e7eb)}
.bd-nav-item .ti{font-size:15px;flex-shrink:0}
.bd-nav-badge{margin-left:auto;font-size:10px;background:#FAEEDA;color:#854F0B;padding:2px 6px;border-radius:10px;font-weight:500}
.bd-main{display:flex;flex-direction:column;min-height:100vh;background:var(--color-background-tertiary,#f0f2f5)}
.bd-topbar{padding:14px 20px;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);display:flex;align-items:center;justify-content:space-between;background:var(--color-background-primary,#fff);position:sticky;top:0;z-index:20;flex-shrink:0}
.bd-body{padding:18px 20px;display:flex;flex-direction:column;gap:14px;flex:1}
.bd-stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.bd-stat{background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:10px;padding:14px 16px}
.bd-stat-val{font-size:22px;font-weight:600;color:var(--color-text-primary,#111827);letter-spacing:-.02em}
.bd-stat-lbl{font-size:11px;color:var(--color-text-secondary,#6b7280);margin-top:3px}
.bd-stat-sub{font-size:11px;margin-top:6px}
.bd-card{background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:10px;padding:16px}
.bd-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.bd-card-title{font-size:13px;font-weight:600;color:var(--color-text-primary,#111827)}
.bd-two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bd-three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:500;padding:2px 8px;border-radius:10px;white-space:nowrap;line-height:1.4}
.b-ok{background:#EAF3DE;color:#3B6D11}
.b-warn{background:#FAEEDA;color:#854F0B}
.b-info{background:#E6F1FB;color:#185FA5}
.b-purple{background:#EEEDFE;color:#3C3489}
.b-gray{background:var(--color-background-secondary,#f9fafb);color:var(--color-text-secondary,#6b7280);border:0.5px solid var(--color-border-tertiary,#e5e7eb)}
.b-red{background:#FCEBEB;color:#A32D2D}
.b-teal{background:#E1F5EE;color:#085041}
.b-yellow{background:#FEF9C3;color:#854D0E}
.b-blue{background:#DBEAFE;color:#1E40AF}
.b-green{background:#DCFCE7;color:#166534}
.bd-tbl{width:100%;border-collapse:collapse;font-size:12px}
.bd-tbl th{text-align:left;padding:7px 10px;font-size:10px;font-weight:600;color:var(--color-text-tertiary,#9ca3af);text-transform:uppercase;letter-spacing:.06em;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);white-space:nowrap;background:var(--color-background-secondary,#f9fafb)}
.bd-tbl td{padding:10px 10px;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);color:var(--color-text-primary,#111827);vertical-align:middle}
.bd-tbl tr:last-child td{border-bottom:none}
.bd-tbl tr:hover td{background:var(--color-background-tertiary,#f9fafb)}
.av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0}
.av-lg{width:36px;height:36px;font-size:12px}
.app-row{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb)}
.app-row:last-child{border-bottom:none}
.task-row{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb)}
.task-row:last-child{border-bottom:none}
.chk{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--color-border-secondary,#d1d5db);flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.chk.done{background:#EAF3DE;border-color:#C0DD97}
.prog{height:4px;background:var(--color-background-tertiary,#f0f2f5);border-radius:3px;overflow:hidden;width:70px}
.prog-fill{height:100%;border-radius:3px}
.tab-bar{display:flex;border-bottom:0.5px solid var(--color-border-tertiary,#e5e7eb);margin-bottom:14px}
.tab{font-size:12px;padding:8px 14px;color:var(--color-text-secondary,#6b7280);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-0.5px;font-weight:400}
.tab.on{color:var(--color-text-primary,#111827);font-weight:500;border-bottom-color:var(--color-text-primary,#111827)}
.code-box{font-family:ui-monospace,monospace;font-size:12px;background:var(--color-background-tertiary,#f0f2f5);border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:6px;padding:7px 10px;color:var(--color-text-primary,#111827);display:flex;align-items:center;justify-content:space-between;gap:8px;word-break:break-all}
.copy-btn{flex-shrink:0;font-size:11px;padding:3px 8px;display:flex;align-items:center;gap:3px;white-space:nowrap;background:var(--color-background-primary,#fff);border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:4px;cursor:pointer;color:var(--color-text-secondary,#6b7280)}
.copy-btn:hover{color:var(--color-text-primary,#111827)}
.script-box{background:var(--color-background-secondary,#f9fafb);border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;padding:14px;font-size:12px;color:var(--color-text-secondary,#6b7280);line-height:1.7}
.asset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.asset-card{background:var(--color-background-secondary,#f9fafb);border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}
.asset-preview{border-radius:8px;display:flex;align-items:center;justify-content:center;height:64px;border:0.5px dashed var(--color-border-secondary,#d1d5db)}
.dept-card{background:var(--color-background-secondary,#f9fafb);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;border:0.5px solid var(--color-border-tertiary,#e5e7eb)}
.creator-chip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);font-size:12px;cursor:pointer;background:var(--color-background-secondary,#f9fafb);color:var(--color-text-secondary,#6b7280);transition:all .1s}
.creator-chip.sel{border-color:#185FA5;background:#E6F1FB;color:#185FA5;font-weight:500}
bd-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:5px 12px;border:0.5px solid var(--color-border-tertiary,#e5e7eb);border-radius:6px;background:var(--color-background-secondary,#f9fafb);color:var(--color-text-primary,#111827);cursor:pointer}
`

// ─── Sub-views ────────────────────────────────────────────────────────────────

function Btn({ children, onClick, style, variant, title }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; variant?: 'green' | 'red' | 'primary'; title?: string }) {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 12px', border: '0.5px solid var(--color-border-tertiary,#e5e7eb)', borderRadius: 6, background: 'var(--color-background-secondary,#f9fafb)', color: 'var(--color-text-primary,#111827)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }
  const v = variant === 'green' ? { background: '#EAF3DE', color: '#3B6D11', borderColor: '#C0DD97' } : variant === 'red' ? { background: '#FCEBEB', color: '#A32D2D', borderColor: '#F7C1C1' } : variant === 'primary' ? { background: '#185FA5', color: '#fff', borderColor: '#185FA5' } : {}
  return <button onClick={onClick} title={title} style={{ ...base, ...v, ...style }}>{children}</button>
}

function PlatBadge({ p }: { p: string }) {
  const m: Record<string, string> = { youtube: 'b-red', instagram: 'b-purple', tiktok: 'b-teal', twitter: 'b-info' }
  const label: Record<string, string> = { youtube: 'YT', instagram: 'IG', tiktok: 'TK', twitter: 'TW' }
  return <span className={`badge ${m[p] ?? 'b-gray'}`}>{label[p] ?? p.slice(0, 2).toUpperCase()}</span>
}

// Overview
function OverviewView({ campaigns, applications, setTab }: { campaigns: Campaign[]; applications: Application[]; setTab: (t: Tab) => void }) {
  const activeC = campaigns.filter(c => c.status === 'active' || c.status === 'open').length
  const totalB  = campaigns.reduce((s, c) => s + (c.budget_total ?? 0), 0)
  const newApps = applications.filter(a => a.status === 'applied').length
  const accepted= applications.filter(a => a.status === 'accepted').length
  const recent  = applications.slice(0, 4)

  return (
    <div className="bd-body">
      <div className="bd-stat-row">
        <div className="bd-stat">
          <div className="bd-stat-val">{activeC}</div>
          <div className="bd-stat-lbl">Active campaigns</div>
          <div className="bd-stat-sub" style={{ color: '#6b7280' }}>of {campaigns.length} total</div>
        </div>
        <div className="bd-stat">
          <div className="bd-stat-val">{totalB ? fmt(totalB) : '—'}</div>
          <div className="bd-stat-lbl">Total budget</div>
          <div className="bd-stat-sub" style={{ color: '#6b7280' }}>across all campaigns</div>
        </div>
        <div className="bd-stat">
          <div className="bd-stat-val">{applications.length}</div>
          <div className="bd-stat-lbl">Total applications</div>
          <div className="bd-stat-sub" style={{ color: newApps ? '#854F0B' : '#6b7280' }}>{newApps} new</div>
        </div>
        <div className="bd-stat">
          <div className="bd-stat-val">{accepted}</div>
          <div className="bd-stat-lbl">Accepted deals</div>
          <div className="bd-stat-sub" style={{ color: '#3B6D11' }}>creators onboarded</div>
        </div>
      </div>

      <div className="bd-two-col">
        {/* Recent applications */}
        <div className="bd-card">
          <div className="bd-card-hd">
            <span className="bd-card-title">Recent applications</span>
            <span
              style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }}
              onClick={() => setTab('apps')}
            >View all →</span>
          </div>
          {recent.length === 0
            ? <div style={{ fontSize: 12, color: '#9ca3af', padding: '16px 0', textAlign: 'center' }}>No applications yet</div>
            : recent.map(app => {
              const c = app.creators
              const av = avColor(app.creator_id)
              const s = STATUS[app.status] ?? { label: app.status, cls: 'b-gray' }
              return (
                <div key={app.id} className="app-row">
                  <div className="av" style={{ background: av.bg, color: av.color }}>{initFrom(c?.full_name ?? c?.username)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#111827' }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{c?.platform ?? '—'} · {app.campaigns?.title ?? '—'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    {app.bid_amount ? <span className="badge b-purple">{fmt(app.bid_amount)}</span> : null}
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Pending tasks */}
        <div className="bd-card">
          <div className="bd-card-hd">
            <span className="bd-card-title">Pending tasks</span>
            <span style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }} onClick={() => setTab('tasks')}>View all →</span>
          </div>
          {[
            { text: 'Review creator applications', av: 'PR', bg: '#EEEDFE', c: '#3C3489', done: false },
            { text: 'Approve pending payments', av: 'AK', bg: '#E6F1FB', c: '#185FA5', done: false },
            { text: 'Update campaign brief', av: 'SM', bg: '#E1F5EE', c: '#085041', done: false },
            { text: 'Set up promo toolkit', av: 'PR', bg: '#EEEDFE', c: '#3C3489', done: true },
          ].map((t, i) => (
            <div key={i} className="task-row">
              <div className={`chk${t.done ? ' done' : ''}`}>
                {t.done && <i className="ti ti-check" style={{ fontSize: 10, color: '#3B6D11' }} />}
              </div>
              <div style={{ flex: 1, fontSize: 12.5, color: t.done ? '#9ca3af' : '#111827', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
              <div className="av" style={{ width: 22, height: 22, fontSize: 9, background: t.bg, color: t.c }}>{t.av}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign overview */}
      <div className="bd-card">
        <div className="bd-card-hd">
          <span className="bd-card-title">Campaign overview</span>
          <a href="/dashboard/brand/campaigns/new"><Btn><i className="ti ti-plus" />New campaign</Btn></a>
        </div>
        {campaigns.length === 0
          ? <div style={{ fontSize: 12, color: '#9ca3af', padding: '16px 0', textAlign: 'center' }}>
              No campaigns yet. <a href="/dashboard/brand/campaigns/new" style={{ color: '#185FA5' }}>Create your first →</a>
            </div>
          : (
            <table className="bd-tbl">
              <thead><tr><th>Campaign</th><th>Platforms</th><th>Applications</th><th>Budget</th><th>Progress</th><th>Status</th></tr></thead>
              <tbody>
                {campaigns.map(c => {
                  const appCount = applications.filter(a => a.campaign_id === c.id).length
                  const s = STATUS[c.status ?? 'draft'] ?? { label: c.status, cls: 'b-gray' }
                  const pct = Math.min(100, Math.round((applications.filter(a => a.campaign_id === c.id && a.status === 'accepted').length / Math.max(1, appCount)) * 100))
                  return (
                    <tr key={c.id}>
                      <td><b style={{ fontSize: 12 }}>{c.title}</b></td>
                      <td>{(c.platforms ?? []).map(p => <PlatBadge key={p} p={p} />)}</td>
                      <td style={{ fontSize: 12 }}>{appCount}</td>
                      <td style={{ fontSize: 12 }}>{c.budget_total ? fmt(c.budget_total) : '—'}</td>
                      <td>
                        <div className="prog"><div className="prog-fill" style={{ width: `${pct}%`, background: '#1D9E75' }} /></div>
                      </td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
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

// Channel Tracker
const DEAL_STATUS: Record<string, { label: string; cls: string }> = {
  active:             { label: 'Active',             cls: 'b-info'   },
  submitted:          { label: 'Submitted',           cls: 'b-warn'   },
  approved:           { label: 'Approved',            cls: 'b-ok'     },
  completed:          { label: 'Completed',           cls: 'b-teal'   },
  cancelled:          { label: 'Cancelled',           cls: 'b-red'    },
  disputed:           { label: 'Disputed',            cls: 'b-red'    },
  revision_requested: { label: 'Revision Requested',  cls: 'b-purple' },
}
const DELIVERY_LABELS: Record<string, string> = {
  paid_post: 'Paid Post', affiliate: 'Affiliate', gifting: 'Gifting', ambassador: 'Ambassador',
}

function TrackerView({ deals: initialDeals, teamMembers, brandId, userId, onGoTab }: { deals: Deal[]; teamMembers: TeamMember[]; brandId: string; userId: string; onGoTab: (tab: string, dept?: string) => void }) {
  const supabase   = useMemo(() => createClient(), [])
  const [liveDeals, setLiveDeals] = useState<Deal[]>(initialDeals)
  const [filter,    setFilter]    = useState('all')
  // Inline edits per deal: channel_link, promo_code
  const [edits,     setEdits]     = useState<Record<string, { channel_link: string; promo_code: string }>>({})
  // Task send state per deal
  const [taskState, setTaskState] = useState<Record<string, { dept: string; assignee: string; sending: boolean }>>({})
  // Analyst reports map: deal_id → report
  const [analystScores, setAnalystScores] = useState<Map<string, { score: number | null; approved: boolean | null }>>(new Map())

  useEffect(() => {
    if (!brandId) return
    supabase.from('analyst_reports').select('deal_id, score, approved').eq('brand_id', brandId)
      .then(({ data }) => {
        const m = new Map<string, { score: number | null; approved: boolean | null }>()
        ;(data ?? []).forEach(r => m.set(r.deal_id, { score: r.score, approved: r.approved }))
        setAnalystScores(m)
      })
  }, [brandId])

  const shown = filter === 'all' ? liveDeals : liveDeals.filter(d => d.status === filter)
  const pipeline = liveDeals.filter(d => ['active','approved','completed'].includes(d.status ?? '')).reduce((s,d) => s + (d.final_price ?? d.price ?? 0), 0)

  async function updateDealField(dealId: string, fields: Record<string, any>) {
    await supabase.from('deals').update(fields).eq('id', dealId)
    setLiveDeals(ds => ds.map(d => d.id === dealId ? { ...d, ...fields } : d))
  }

  async function assignDeal(dealId: string, userId: string | null) {
    await updateDealField(dealId, { assigned_to: userId || null })
  }

  function edit(dealId: string) {
    const d = liveDeals.find(x => x.id === dealId)!
    setEdits(e => ({ ...e, [dealId]: { channel_link: (d as any).channel_link ?? '', promo_code: (d as any).promo_code ?? '' } }))
  }
  async function saveEdit(dealId: string) {
    const e = edits[dealId]
    if (!e) return
    await updateDealField(dealId, { channel_link: e.channel_link || null, promo_code: e.promo_code || null })
    setEdits(ex => { const copy = { ...ex }; delete copy[dealId]; return copy })
  }

  async function sendToDept(deal: Deal, dept: 'promo' | 'payment' | 'analyst') {
    setTaskState(ts => ({ ...ts, [deal.id]: { ...(ts[deal.id] ?? { dept, assignee: '' }), sending: true } }))
    const c = deal.creators
    const taskText = dept === 'promo'
      ? `Set up promo link / code for ${c?.full_name ?? c?.username ?? 'Creator'} — ${deal.campaigns?.title ?? 'Campaign'}`
      : dept === 'payment'
      ? `Process payment for ${c?.full_name ?? c?.username ?? 'Creator'} — ${deal.campaigns?.title ?? 'Campaign'} ($${deal.final_price ?? deal.price ?? '?'})`
      : `Analyse channel for ${c?.full_name ?? c?.username ?? 'Creator'} (${c?.platform ?? 'unknown'}) — evaluate metrics, score, and approve/reject deal`
    const assigneeId = taskState[deal.id]?.assignee || null
    await supabase.from('brand_tasks').insert({
      brand_id:    brandId,
      title:       taskText,
      department:  dept,
      assigned_to: assigneeId || null,
      status:      'todo',
      priority:    'medium',
      created_by:  userId,
    })
    setTaskState(ts => ({ ...ts, [deal.id]: { ...(ts[deal.id] ?? { dept, assignee: '' }), sending: false } }))
    onGoTab('dept', dept)
  }

  return (
    <div className="bd-body">
      {/* Stats */}
      <div className="bd-stat-row">
        <div className="bd-stat"><div className="bd-stat-val">{liveDeals.length}</div><div className="bd-stat-lbl">Total deals</div></div>
        <div className="bd-stat"><div className="bd-stat-val" style={{ color: '#16a34a' }}>{liveDeals.filter(d => d.status === 'active').length}</div><div className="bd-stat-lbl">Active</div></div>
        <div className="bd-stat"><div className="bd-stat-val" style={{ color: '#0d9488' }}>{liveDeals.filter(d => d.status === 'completed').length}</div><div className="bd-stat-lbl">Completed</div></div>
        <div className="bd-stat"><div className="bd-stat-val" style={{ fontSize: 15 }}>{pipeline ? fmt(pipeline) : '—'}</div><div className="bd-stat-lbl">Pipeline value</div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['all','active','approved','completed','cancelled'].map(f => (
          <span key={f} className={`badge ${filter === f ? 'b-purple' : 'b-gray'}`}
            style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 11 }} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? liveDeals.length : liveDeals.filter(d => d.status === f).length})
          </span>
        ))}
      </div>

      {/* Deal cards */}
      {shown.length === 0 && (
        <div className="bd-card" style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 13 }}>
          No confirmed deals yet.<br />
          <span style={{ fontSize: 12 }}>Accept an application in the Applications tab to create your first deal.</span>
        </div>
      )}

      {shown.map(deal => {
        const c   = deal.creators
        const av  = avColor(deal.creator_id)
        const ds  = DEAL_STATUS[deal.status ?? 'active'] ?? { label: deal.status ?? '—', cls: 'b-gray' }
        const e   = edits[deal.id]
        const ts  = taskState[deal.id]
        const assignedMember  = teamMembers.find(m => m.user_id === deal.assigned_to)
        const analystResult   = analystScores.get(deal.id)

        return (
          <div key={deal.id} className="bd-card" style={{ borderLeft: '3px solid #16a34a', borderRadius: '0 10px 10px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div className="av av-lg" style={{ background: av.bg, color: av.color }}>{initFrom(c?.full_name ?? c?.username)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>@{c?.username} {c?.platform ? <PlatBadge p={c.platform} /> : null}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge b-gray">{deal.campaigns?.title ?? 'Campaign'}</span>
                    <span className={`badge ${ds.cls}`}>{ds.label}</span>
                    {(deal as any).final_price
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>₹{fmt((deal as any).final_price)}</span>
                      : deal.price
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>₹{fmt(deal.price)}</span>
                      : null}
                    {analystResult && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                        background: analystResult.approved === true ? '#dcfce7' : analystResult.approved === false ? '#fee2e2' : '#f0fdf4',
                        color: analystResult.approved === true ? '#15803d' : analystResult.approved === false ? '#dc2626' : '#0f766e',
                        cursor: 'pointer',
                      }}
                        title="Analyst evaluation" onClick={() => onGoTab('dept', 'analyst')}>
                        🧠 {analystResult.approved === true ? '✓' : analystResult.approved === false ? '✗' : '?'} Score {analystResult.score ?? '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Assign */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <select value={deal.assigned_to ?? ''} onChange={e2 => assignDeal(deal.id, e2.target.value)}
                  style={{ fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 5, padding: '2px 5px', background: assignedMember ? '#eff6ff' : '#f9fafb', color: assignedMember ? '#1d4ed8' : '#6b7280', cursor: 'pointer', maxWidth: 110 }}>
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>)}
                </select>

                {/* Deal status change */}
                <select value={deal.status ?? 'active'} onChange={e2 => updateDealField(deal.id, { status: e2.target.value })}
                  style={{ fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 5, padding: '2px 5px', background: '#f9fafb', color: '#374151', cursor: 'pointer', maxWidth: 110 }}>
                  {['active','approved','completed','cancelled'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Channel & Promo section */}
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#f9fafb', borderRadius: 7, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Channel / Content Link</div>
                {e
                  ? <input value={e.channel_link} onChange={ev => setEdits(ex => ({ ...ex, [deal.id]: { ...ex[deal.id], channel_link: ev.target.value } }))}
                      placeholder="https://youtube.com/watch?v=..." style={{ width: '100%', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 6px' }} />
                  : <div style={{ fontSize: 12, color: (deal as any).channel_link ? '#111827' : '#9ca3af' }}>
                      {(deal as any).channel_link ? <a href={(deal as any).channel_link} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>{(deal as any).channel_link}</a> : 'Not set yet'}
                    </div>}
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 7, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Promo Code</div>
                {e
                  ? <input value={e.promo_code} onChange={ev => setEdits(ex => ({ ...ex, [deal.id]: { ...ex[deal.id], promo_code: ev.target.value } }))}
                      placeholder="e.g. CREATOR20" style={{ width: '100%', fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 6px' }} />
                  : <div style={{ fontSize: 12, color: (deal as any).promo_code ? '#7c3aed' : '#9ca3af', fontWeight: (deal as any).promo_code ? 700 : 400 }}>
                      {(deal as any).promo_code ?? 'Not set yet'}
                    </div>}
              </div>
            </div>

            {/* Payment details */}
            {(deal as any).payment_details && (() => {
              const pd = (deal as any).payment_details as { method?: string; name?: string; account?: string }
              return (
                <div style={{ marginTop: 8, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 7, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                    <i className="ti ti-credit-card" style={{ marginRight: 4 }} />Payment details
                  </div>
                  <div style={{ fontSize: 12, color: '#111827', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {pd.method && <span><span style={{ color: '#6b7280' }}>Method: </span>{pd.method.toUpperCase()}</span>}
                    {pd.name   && <span><span style={{ color: '#6b7280' }}>Name: </span>{pd.name}</span>}
                    {pd.account && <span><span style={{ color: '#6b7280' }}>Account: </span><strong>{pd.account}</strong></span>}
                  </div>
                </div>
              )
            })()}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {!e
                ? <Btn onClick={() => edit(deal.id)}><i className="ti ti-edit" />Edit details</Btn>
                : <>
                    <Btn variant="green" onClick={() => saveEdit(deal.id)}><i className="ti ti-check" />Save</Btn>
                    <Btn onClick={() => setEdits(ex => { const c2 = {...ex}; delete c2[deal.id]; return c2 })}><i className="ti ti-x" />Cancel</Btn>
                  </>}

              {/* Send to dept */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
                {teamMembers.length > 0 && (
                  <select value={ts?.assignee ?? ''} onChange={ev => setTaskState(t => ({ ...t, [deal.id]: { ...(t[deal.id] ?? { dept: '', sending: false }), assignee: ev.target.value } }))}
                    style={{ fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 5, padding: '4px 6px', background: '#f9fafb', color: '#374151', cursor: 'pointer' }}>
                    <option value="">Assign dept task to…</option>
                    {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>)}
                  </select>
                )}
                <Btn style={{ background: '#EEEDFE', color: '#3C3489', borderColor: '#c4b5fd' }}
                  onClick={() => { void sendToDept(deal, 'promo') }} title="Create task for Promo/Link dept">
                  <i className="ti ti-link" />{ts?.sending ? '…' : '→ Promo Dept'}
                </Btn>
                <Btn style={{ background: '#E1F5EE', color: '#085041', borderColor: '#A0D8B3' }}
                  onClick={() => { void sendToDept(deal, 'payment') }} title="Create task for Payment dept">
                  <i className="ti ti-cash" />{ts?.sending ? '…' : '→ Payment Dept'}
                </Btn>
                <Btn style={{ background: '#CCFBF1', color: '#0F766E', borderColor: '#99F6E4' }}
                  onClick={() => { void sendToDept(deal, 'analyst') }} title="Send to Analyst dept for channel evaluation">
                  <i className="ti ti-chart-bar" />{ts?.sending ? '…' : '→ Analyst'}
                </Btn>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Applications ─────────────────────────────────────────────────────────────
function ApplicationsView({ applications, conversations, deals, teamMembers, brandId, onUpdate, onDealCreated, onGoTab }: {
  applications: Application[]
  conversations: BrandConversation[]
  deals: Deal[]
  teamMembers: TeamMember[]
  brandId: string
  onUpdate: (id: string, status: string, creatorUserId: string | null) => void
  onDealCreated: (deal: Deal) => void
  onGoTab: (tab: string) => void
}) {
  const supabase = createClient()
  const [filter,   setFilter]   = useState('all')
  const [liveApps, setLiveApps] = useState<Application[]>(applications)
  // negotiating[appId] = { price, notes, pay_method, pay_name, pay_account, loading }
  const [negotiating, setNegotiating] = useState<Record<string, {
    price: string; notes: string;
    pay_method: string; pay_name: string; pay_account: string;
    loading: boolean
  }>>({})

  const dealAppIds = new Set(deals.map(d => d.application_id).filter(Boolean))

  // Status filter — map 'shortlisted' display filter to both 'shortlisted' values
  const shown = filter === 'all'         ? liveApps
    : filter === 'shortlisted'           ? liveApps.filter(a => a.status === 'shortlisted')
    : filter === 'accepted'              ? liveApps.filter(a => a.status === 'accepted')
    : filter === 'rejected'              ? liveApps.filter(a => a.status === 'rejected')
    : filter === 'outreach'              ? []   // conversations shown separately
    : liveApps.filter(a => a.status === 'applied' || a.status === 'pending')

  const counts = {
    all:         liveApps.length + conversations.length,
    new:         liveApps.filter(a => a.status === 'applied' || a.status === 'pending').length,
    shortlisted: liveApps.filter(a => a.status === 'shortlisted').length,
    accepted:    liveApps.filter(a => a.status === 'accepted').length,
    rejected:    liveApps.filter(a => a.status === 'rejected').length,
    outreach:    conversations.length,
  }

  async function changeStatus(app: Application, status: string) {
    // valid DB enum values: applied, shortlisted, accepted, rejected, withdrawn
    setLiveApps(as => as.map(a => a.id === app.id ? { ...a, status } : a))
    await supabase.from('campaign_applications').update({ status }).eq('id', app.id)
    if (app.creators?.user_id) {
      const labels: Record<string, string> = { shortlisted: 'shortlisted', accepted: 'accepted', rejected: 'rejected' }
      const label = labels[status]
      if (label) await notify(supabase, app.creators.user_id, {
        type: 'status_change',
        title: `Your application has been ${label}`,
        body: `The brand updated your application to "${label}"`,
        link: '/dashboard/creator/profile',
      })
    }
  }

  async function assignApp(appId: string, userId: string) {
    await supabase.from('campaign_applications').update({ assigned_to: userId || null }).eq('id', appId)
    setLiveApps(as => as.map(a => a.id === appId ? { ...a, assigned_to: userId || null } : a))
  }

  // Accept → negotiate → create deal
  function startNegotiate(app: Application) {
    setNegotiating(n => ({ ...n, [app.id]: { price: String(app.bid_amount ?? app.creators?.price_per_post ?? ''), notes: '', pay_method: 'upi', pay_name: '', pay_account: '', loading: false } }))
  }
  function cancelNegotiate(appId: string) {
    setNegotiating(n => { const copy = { ...n }; delete copy[appId]; return copy })
  }

  async function confirmAccept(app: Application) {
    const neg = negotiating[app.id]
    if (!neg) return
    setNegotiating(n => ({ ...n, [app.id]: { ...n[app.id], loading: true } }))

    // Update application status
    await changeStatus(app, 'accepted')

    // Create deal row
    const paymentDetails = (neg.pay_account || neg.pay_name) ? {
      method:  neg.pay_method,
      name:    neg.pay_name    || null,
      account: neg.pay_account || null,
    } : null

    const { data: dealRow } = await supabase.from('deals').insert({
      brand_id:        brandId || null,
      creator_id:      app.creator_id,
      campaign_id:     app.campaign_id,
      application_id:  app.id,
      price:           neg.price ? parseFloat(neg.price) : (app.bid_amount ?? null),
      final_price:     neg.price ? parseFloat(neg.price) : null,
      currency:        'USD',
      status:          'active',
      delivery_type:   null,
      conditions:      neg.notes || null,
      payment_details: paymentDetails,
    }).select('id, price, final_price, currency, status, deadline, delivery_type, deliverables_count, channel, channel_link, promo_code, created_at, updated_at, campaign_id, creator_id, application_id, assigned_to, campaigns(id,title), creators(id,full_name,username,platform)').maybeSingle()

    // Link conversation ↔ deal ↔ application (new schema columns)
    if (dealRow) {
      const { data: conv } = await supabase.from('conversations')
        .select('id')
        .eq('brand_id', brandId)
        .eq('creator_id', app.creator_id)
        .maybeSingle()
      if (conv?.id) {
        await Promise.all([
          supabase.from('conversations').update({ deal_id: dealRow.id, application_id: app.id }).eq('id', conv.id),
          supabase.from('campaign_applications').update({ conversation_id: conv.id }).eq('id', app.id),
        ])
      }
    }

    cancelNegotiate(app.id)
    if (dealRow) onDealCreated(dealRow as unknown as Deal)
    onGoTab('tracker')
  }

  const appRows = filter === 'outreach' ? [] : shown
  const showOutreach = filter === 'all' || filter === 'outreach'

  return (
    <div className="bd-body">
      <div className="bd-two-col" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Section header */}
          {filter !== 'outreach' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
                Inbound — creators applied to your campaigns
              </div>
              {appRows.length === 0 && (
                <div className="bd-card" style={{ textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 12 }}>
                  {filter === 'all' ? 'No applications yet' : `No "${filter}" applications`}
                </div>
              )}
              {appRows.map(app => {
                const c   = app.creators
                const av  = avColor(app.creator_id)
                const s   = STATUS[app.status] ?? { label: app.status, cls: 'b-gray' }
                const neg = negotiating[app.id]
                const alreadyDeal = dealAppIds.has(app.id)
                const assignedMember = teamMembers.find(m => m.user_id === app.assigned_to)
                return (
                  <div key={app.id} className="bd-card"
                    style={(app.status === 'applied' || app.status === 'pending') ? { borderLeft: '3px solid #EF9F27', borderRadius: '0 10px 10px 0' } : {}}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div className="av av-lg" style={{ background: av.bg, color: av.color }}>{initFrom(c?.full_name ?? c?.username)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c?.platform ?? '—'} · @{c?.username ?? 'unknown'}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                            {app.bid_amount ? <span className="badge b-purple">₹{fmt(app.bid_amount)}</span> : null}
                            <span className="badge b-gray">{app.campaigns?.title ?? 'Campaign'}</span>
                            {c?.platform ? <PlatBadge p={c.platform} /> : null}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span className={`badge ${s.cls}`}>{s.label}</span>
                        {alreadyDeal && <span className="badge b-ok" style={{ fontSize: 10 }}>Deal created ✓</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <i className="ti ti-user-check" style={{ fontSize: 11, color: '#9ca3af' }} />
                          <select value={app.assigned_to ?? ''} onChange={e => assignApp(app.id, e.target.value)}
                            style={{ fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 5, padding: '2px 5px', background: assignedMember ? '#eff6ff' : '#f9fafb', color: assignedMember ? '#1d4ed8' : '#6b7280', cursor: 'pointer', maxWidth: 110 }}>
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {app.message && (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.6, background: '#f9fafb', borderRadius: 6, padding: '8px 10px' }}>
                        "{app.message}"
                      </div>
                    )}

                    {/* Negotiation form — shown when Accept is clicked */}
                    {neg && (
                      <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 10 }}>Confirm deal terms before accepting</div>

                        {/* Row 1: Price + Notes */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>Final agreed price (₹)</label>
                            <input type="number" value={neg.price} onChange={e => setNegotiating(n => ({ ...n, [app.id]: { ...n[app.id], price: e.target.value } }))}
                              placeholder="e.g. 5000"
                              style={{ width: '100%', fontSize: 12, border: '1px solid #d1fae5', borderRadius: 6, padding: '5px 8px', background: '#fff' }} />
                          </div>
                          <div style={{ flex: 2, minWidth: 160 }}>
                            <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>Conditions / Notes</label>
                            <input type="text" value={neg.notes} onChange={e => setNegotiating(n => ({ ...n, [app.id]: { ...n[app.id], notes: e.target.value } }))}
                              placeholder="e.g. 1 Reel by July 30, no re-edits"
                              style={{ width: '100%', fontSize: 12, border: '1px solid #d1fae5', borderRadius: 6, padding: '5px 8px', background: '#fff' }} />
                          </div>
                        </div>

                        {/* Row 2: Payment details */}
                        <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: 8, marginTop: 2 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
                            <i className="ti ti-credit-card" style={{ marginRight: 4 }} />Creator payment details
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 110 }}>
                              <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>Payment method</label>
                              <select value={neg.pay_method} onChange={e => setNegotiating(n => ({ ...n, [app.id]: { ...n[app.id], pay_method: e.target.value } }))}
                                style={{ fontSize: 12, border: '1px solid #d1fae5', borderRadius: 6, padding: '5px 8px', background: '#fff', width: '100%' }}>
                                <option value="upi">UPI</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="paypal">PayPal</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: 130 }}>
                              <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>Account holder name</label>
                              <input type="text" value={neg.pay_name} onChange={e => setNegotiating(n => ({ ...n, [app.id]: { ...n[app.id], pay_name: e.target.value } }))}
                                placeholder="Beneficiary name"
                                style={{ width: '100%', fontSize: 12, border: '1px solid #d1fae5', borderRadius: 6, padding: '5px 8px', background: '#fff' }} />
                            </div>
                            <div style={{ flex: 2, minWidth: 160 }}>
                              <label style={{ fontSize: 11, color: '#374151', display: 'block', marginBottom: 3 }}>
                                {neg.pay_method === 'upi' ? 'UPI ID' : neg.pay_method === 'bank' ? 'Account No. / IFSC' : neg.pay_method === 'paypal' ? 'PayPal email' : 'Account / ID'}
                              </label>
                              <input type="text" value={neg.pay_account} onChange={e => setNegotiating(n => ({ ...n, [app.id]: { ...n[app.id], pay_account: e.target.value } }))}
                                placeholder={neg.pay_method === 'upi' ? 'name@upi' : neg.pay_method === 'bank' ? '123456789 / SBIN0001234' : ''}
                                style={{ width: '100%', fontSize: 12, border: '1px solid #d1fae5', borderRadius: 6, padding: '5px 8px', background: '#fff' }} />
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <Btn variant="green" onClick={() => confirmAccept(app)} style={{ opacity: neg.loading ? .6 : 1 }}>
                            <i className="ti ti-check" />{neg.loading ? 'Creating deal…' : 'Confirm & Create Deal'}
                          </Btn>
                          <Btn onClick={() => cancelNegotiate(app.id)}><i className="ti ti-x" />Cancel</Btn>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!neg && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                        {app.status !== 'shortlisted' && app.status !== 'accepted' && app.status !== 'rejected' && (
                          <Btn onClick={() => changeStatus(app, 'shortlisted')}>
                            <i className="ti ti-eye" />Shortlist
                          </Btn>
                        )}
                        {app.status !== 'accepted' && !alreadyDeal && (
                          <Btn variant="green" onClick={() => startNegotiate(app)}>
                            <i className="ti ti-check" />Accept → Deal
                          </Btn>
                        )}
                        {alreadyDeal && (
                          <Btn style={{ background: '#E1F5EE', color: '#085041', borderColor: '#A0D8B3' }} onClick={() => onGoTab('tracker')}>
                            <i className="ti ti-arrow-right" />View in Deals →
                          </Btn>
                        )}
                        {app.status !== 'rejected' && (
                          <Btn variant="red" onClick={() => changeStatus(app, 'rejected')}>
                            <i className="ti ti-x" />Reject
                          </Btn>
                        )}
                        {app.status !== 'applied' && !alreadyDeal && (
                          <Btn onClick={() => changeStatus(app, 'applied')}>
                            <i className="ti ti-arrow-back-up" />Reset
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Outreach section — conversations where brand reached out */}
          {showOutreach && conversations.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: filter === 'all' ? 16 : 0, marginBottom: 2 }}>
                Outreach — creators you contacted
              </div>
              {conversations.map(conv => {
                const c  = conv.creators
                const av = avColor(conv.creator_id)
                return (
                  <div key={conv.id} className="bd-card" style={{ borderLeft: '3px solid #6b7280', borderRadius: '0 10px 10px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="av av-lg" style={{ background: av.bg, color: av.color }}>{initFrom(c?.full_name ?? c?.username)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>@{c?.username ?? 'unknown'}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                            Last message: {conv.last_msg_at ? new Date(conv.last_msg_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No messages yet'}
                          </div>
                        </div>
                      </div>
                      <span className="badge b-gray">Outreach</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <Btn onClick={() => onGoTab('messages')}>
                        <i className="ti ti-message" />Continue Chat
                      </Btn>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Filter sidebar */}
        <div className="bd-card" style={{ position: 'sticky', top: 70 }}>
          <div className="bd-card-hd"><span className="bd-card-title">Filter</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[
              { k: 'all',         label: `All (${counts.all})`,               cls: 'b-gray' },
              { k: 'new',         label: `New (${counts.new})`,               cls: 'b-warn' },
              { k: 'shortlisted', label: `Shortlisted (${counts.shortlisted})`, cls: 'b-info' },
              { k: 'accepted',    label: `Accepted (${counts.accepted})`,     cls: 'b-ok'   },
              { k: 'rejected',    label: `Rejected (${counts.rejected})`,     cls: 'b-red'  },
              { k: 'outreach',    label: `Outreach (${counts.outreach})`,     cls: 'b-gray' },
            ].map(f => (
              <span key={f.k} className={`badge ${filter === f.k ? f.cls : 'b-gray'}`}
                style={{ cursor: 'pointer', padding: '5px 10px', fontSize: 11 }}
                onClick={() => setFilter(f.k)}>
                {f.label}
              </span>
            ))}
          </div>
          {teamMembers.length > 0 && (
            <div style={{ marginTop: 12, borderTop: '0.5px solid #e5e7eb', paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Team workload</div>
              {teamMembers.map(m => {
                const n = liveApps.filter(a => a.assigned_to === m.user_id).length
                return (
                  <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#374151', marginBottom: 4 }}>
                    <span>{memberLabel(m)}</span>
                    <span className="badge b-info" style={{ fontSize: 10, padding: '1px 6px' }}>{n}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Promo Toolkit
// ── helpers ───────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
function ensureHttp(url: string) {
  return url.startsWith('http') ? url : `http://${url}`
}
function buildTrackingLink(website: string | null | undefined, channelId: string, promoCode: string) {
  const base = (website ?? 'http://localhost:3000').replace(/\/$/, '')
  const url  = ensureHttp(base)
  const params = new URLSearchParams()
  params.set('ref',          channelId)
  params.set('code',         promoCode)
  params.set('utm_source',   'influencer')
  params.set('utm_medium',   'creator')
  params.set('utm_campaign', channelId)
  return `${url}?${params.toString()}`
}
function autoCode(channelName: string, disc: string) {
  const slug = slugify(channelName).replace(/_/g, '').toUpperCase().slice(0, 6)
  return `${slug}${disc}`
}

interface TrackingLink {
  id: string
  channelName: string   // e.g. "MrBeast"
  channelId:   string   // e.g. "mrbeast_yt"  — unique ref/slug
  promoCode:   string   // e.g. "MRBEAS15"
  discount:    string   // e.g. "15"
  clicks:      number
}

function PromoView({ brand }: { brand: Brand | null }) {
  const [copied, setCopied] = useState<string | null>(null)

  const [links,       setLinks]       = useState<TrackingLink[]>([
    { id: '1', channelName: 'Creator 1', channelId: 'creator1_yt', promoCode: 'CREATO15', discount: '15', clicks: 428  },
    { id: '2', channelName: 'Creator 2', channelId: 'creator2_ig', promoCode: 'CREATO210', discount: '10', clicks: 1240 },
  ])
  const [showForm,    setShowForm]    = useState(false)
  const [fName,       setFName]       = useState('')
  const [fId,         setFId]         = useState('')
  const [fDisc,       setFDisc]       = useState('')
  const [fCode,       setFCode]       = useState('')

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1800) })
  }

  const autoId   = slugify(fName || 'channel_name')
  const autoPromo = autoCode(fName, fDisc)
  const previewLink = buildTrackingLink(brand?.website, fId || autoId, fCode || autoPromo)

  function addLink() {
    if (!fName.trim()) return
    const channelId  = fId.trim()   || autoId
    const promoCode  = fCode.trim() || autoPromo
    setLinks(prev => [...prev, {
      id: Date.now().toString(),
      channelName: fName.trim(), channelId, promoCode, discount: fDisc, clicks: 0,
    }])
    setFName(''); setFId(''); setFDisc(''); setFCode(''); setShowForm(false)
  }
  function removeLink(id: string) { setLinks(prev => prev.filter(l => l.id !== id)) }

  const bName = brand?.name    ?? 'Your Brand'
  const bSite = brand?.website ?? null

  return (
    <div className="bd-body">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Promo toolkit</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Assets, codes, links and scripts — ready for each creator to copy and use</div>
        </div>
        <Btn><i className="ti ti-plus" />Add asset</Btn>
      </div>

      {/* Logo assets */}
      <div className="bd-card">
        <div className="bd-card-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-vector-triangle" style={{ fontSize: 16, color: '#185FA5' }} /><span className="bd-card-title">Logo & branding assets</span></div>
          <Btn><i className="ti ti-upload" style={{ fontSize: 12 }} />Upload</Btn>
        </div>
        <div className="asset-grid">
          {[{ bg: '#E6F1FB', label: `${bName} — light`, sub: 'PNG · Transparent bg' }, { bg: '#1a1a2e', label: `${bName} — dark`, sub: 'PNG · Dark bg' }].map(a => (
            <div key={a.label} className="asset-card">
              <div className="asset-preview" style={{ background: a.bg }}><i className="ti ti-photo" style={{ fontSize: 28, color: '#ccc' }} /></div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.sub}</div>
              <Btn style={{ justifyContent: 'center' }}><i className="ti ti-download" style={{ fontSize: 12 }} />Download</Btn>
            </div>
          ))}
          <div className="asset-card" style={{ border: '0.5px dashed #d1d5db', background: 'transparent', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 120 }}>
            <i className="ti ti-plus" style={{ fontSize: 20, color: '#9ca3af' }} />
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Add logo</div>
          </div>
        </div>
      </div>

      {/* Banner Maker */}
      <div className="bd-card">
        <div className="bd-card-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-photo-star" style={{ fontSize: 16, color: '#6366f1' }} />
            <span className="bd-card-title">Event Banner Maker</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#ede9fe', color: '#6366f1', marginLeft: 2 }}>
              NEW
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Choose event · add promo code · download</div>
        </div>
        <BannerMaker brandName={bName} />
      </div>

      {/* Creator Tracking Links — brand website + channel ref + promo code unified */}
      <div className="bd-card">
        <div className="bd-card-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-link" style={{ fontSize: 15, color: '#3B6D11' }} />
            <span className="bd-card-title">Creator tracking links</span>
          </div>
          <Btn style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cancel' : '+ New link'}
          </Btn>
        </div>

        {/* Base URL strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, marginBottom: 12,
          background: bSite ? '#f0fdf4' : '#fffbeb', border: `1px solid ${bSite ? '#bbf7d0' : '#fde68a'}` }}>
          <i className={`ti ${bSite ? 'ti-circle-check' : 'ti-alert-triangle'}`} style={{ fontSize: 12, color: bSite ? '#16a34a' : '#d97706' }} />
          <span style={{ fontSize: 11, color: bSite ? '#15803d' : '#92400e' }}>
            {bSite
              ? <>Destination: <strong style={{ fontFamily: 'monospace' }}>{bSite.replace(/\/$/, '')}</strong></>
              : 'No website set — add it in Settings first'}
          </span>
        </div>

        {/* Generate form */}
        {showForm && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em' }}>New tracking link</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Channel name */}
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Channel / Creator name *</div>
                <input value={fName} onChange={e => setFName(e.target.value)}
                  placeholder="e.g. MrBeast"
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
              </div>
              {/* Channel ID */}
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Channel ID / ref slug (auto)</div>
                <input value={fId} onChange={e => setFId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder={autoId}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              {/* Discount */}
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Discount %</div>
                <input value={fDisc} onChange={e => setFDisc(e.target.value.replace(/[^0-9]/g, ''))} maxLength={3}
                  placeholder="e.g. 15"
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
              </div>
              {/* Promo code */}
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Promo code (auto)</div>
                <input value={fCode} onChange={e => setFCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder={autoPromo}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '.06em' }} />
              </div>
            </div>

            {/* Live preview */}
            {fName.trim() && (
              <div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Preview long link</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '7px 10px', wordBreak: 'break-all', color: '#374151' }}>
                  {/* Colour the parts */}
                  <span style={{ color: '#15803d', fontWeight: 600 }}>{(bSite ?? 'http://localhost:3000').replace(/\/$/, '')}</span>
                  <span style={{ color: '#6b7280' }}>?</span>
                  <span style={{ color: '#1d4ed8' }}>ref=</span><span style={{ color: '#111827' }}>{fId || autoId}</span>
                  <span style={{ color: '#6b7280' }}>&amp;</span>
                  <span style={{ color: '#7c3aed' }}>code=</span><span style={{ color: '#111827' }}>{fCode || autoPromo}</span>
                  <span style={{ color: '#6b7280' }}>&amp;utm_source=influencer&amp;utm_medium=creator&amp;utm_campaign=</span><span style={{ color: '#111827' }}>{fId || autoId}</span>
                </div>
              </div>
            )}

            <button onClick={addLink}
              style={{ padding: '9px 0', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Generate tracking link
            </button>
          </div>
        )}

        {/* Links list */}
        {links.length === 0 && !showForm && (
          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
            No links yet — click "New link" to generate one per creator
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map(l => {
            const url = buildTrackingLink(bSite, l.channelId, l.promoCode)
            return (
              <div key={l.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-user" style={{ fontSize: 13, color: '#6b7280' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{l.channelName}</span>
                    <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>#{l.channelId}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l.discount && <span className="badge b-ok">{l.discount}% off</span>}
                    {l.clicks > 0 && <span className="badge b-info">{l.clicks.toLocaleString()} clicks</span>}
                    <button onClick={() => removeLink(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 13, padding: 2 }}><i className="ti ti-x" /></button>
                  </div>
                </div>

                {/* Promo code row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-tag" style={{ fontSize: 12, color: '#854F0B' }} />
                    <span style={{ fontSize: 10, color: '#6b7280' }}>Promo code</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, letterSpacing: '.1em', color: '#111827' }}>{l.promoCode}</span>
                  </div>
                  <button className="copy-btn" onClick={() => copy(l.promoCode, `code_${l.id}`)}>
                    <i className="ti ti-copy" style={{ fontSize: 11 }} />{copied === `code_${l.id}` ? 'Copied!' : 'Copy code'}
                  </button>
                </div>

                {/* Long link row */}
                <div style={{ padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Tracking link (share with creator)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#374151', wordBreak: 'break-all', flex: 1, lineHeight: 1.5 }}>
                      <span style={{ color: '#15803d' }}>{url.split('?')[0]}</span>
                      <span style={{ color: '#9ca3af' }}>?</span>
                      {url.split('?')[1]?.split('&').map((p, i) => (
                        <span key={i}>
                          {i > 0 && <span style={{ color: '#9ca3af' }}>&amp;</span>}
                          <span style={{ color: i === 0 ? '#1d4ed8' : i === 1 ? '#7c3aed' : '#9ca3af' }}>{p}</span>
                        </span>
                      ))}
                    </div>
                    <button className="copy-btn" style={{ flexShrink: 0 }} onClick={() => copy(url, `url_${l.id}`)}>
                      <i className="ti ti-copy" style={{ fontSize: 11 }} />{copied === `url_${l.id}` ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ad scripts */}
      <div className="bd-card">
        <div className="bd-card-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-writing" style={{ fontSize: 15, color: '#3C3489' }} /><span className="bd-card-title">Ad scripts & talking points</span></div>
          <Btn style={{ fontSize: 11, padding: '3px 10px' }}>+ New script</Btn>
        </div>
        <div className="tab-bar"><div className="tab on">Long (60s)</div><div className="tab">Short (15s)</div><div className="tab">Bullet points</div></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{bName} · General promotion</span>
          <Btn style={{ fontSize: 11, padding: '3px 8px' }}><i className="ti ti-copy" style={{ fontSize: 11 }} />Copy</Btn>
        </div>
        <div className="script-box">
          <span style={{ color: '#9ca3af', fontSize: 11 }}>[Opening hook]</span><br />
          "Guys, I've been using {bName} and honestly can't imagine going back..."<br /><br />
          <span style={{ color: '#9ca3af', fontSize: 11 }}>[Product mention]</span><br />
          "What sets them apart is [unique value prop]. I've been testing this for weeks now."<br /><br />
          <span style={{ color: '#9ca3af', fontSize: 11 }}>[CTA — use their code]</span><br />
          "Link in bio — use my code <b style={{ color: '#111827' }}>PROMO15</b> for 15% off. Valid only this month."
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <Btn style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}><i className="ti ti-edit" style={{ fontSize: 12 }} />Edit</Btn>
          <Btn style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}><i className="ti ti-send" style={{ fontSize: 12 }} />Send to creator</Btn>
        </div>
      </div>
    </div>
  )
}

// Payments
function PaymentsView({ applications, onUpdate }: { applications: Application[]; onUpdate: (id: string, status: string, creatorUserId: string | null) => void }) {
  const supabase = createClient()
  const [localApps, setLocalApps] = useState(applications)
  const [amounts,   setAmounts]   = useState<Record<string, string>>({})
  const [saving,    setSaving]    = useState<Record<string, boolean>>({})
  const [msg,       setMsg]       = useState<Record<string, string>>({})

  useEffect(() => { setLocalApps(applications) }, [applications])

  // Only show accepted or success deals
  const payApps = localApps.filter(a => a.status === 'accepted' || a.status === 'success')
  const paidTotal   = localApps.filter(a => a.status === 'success').reduce((s, a) => s + (a.bid_amount ?? 0), 0)
  const pendingTotal = localApps.filter(a => a.status === 'accepted').reduce((s, a) => s + (a.bid_amount ?? 0), 0)

  async function markPaid(app: Application) {
    const rawAmt = amounts[app.id]
    const amt = rawAmt ? parseFloat(rawAmt) : (app.bid_amount ?? 0)
    if (!amt || amt <= 0) { setMsg(m => ({ ...m, [app.id]: 'Enter a valid amount' })); return }
    setSaving(s => ({ ...s, [app.id]: true }))
    // Update bid_amount if changed
    if (rawAmt && parseFloat(rawAmt) !== app.bid_amount) {
      await supabase.from('campaign_applications').update({ bid_amount: amt }).eq('id', app.id)
      setLocalApps(prev => prev.map(a => a.id === app.id ? { ...a, bid_amount: amt } : a))
    }
    await onUpdate(app.id, 'success', app.creators?.user_id ?? null)
    setLocalApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'success' } : a))
    setSaving(s => ({ ...s, [app.id]: false }))
    setMsg(m => ({ ...m, [app.id]: '✓ Marked as paid!' }))
    setTimeout(() => setMsg(m => ({ ...m, [app.id]: '' })), 2500)
  }

  return (
    <div className="bd-body">
      <div className="bd-stat-row">
        <div className="bd-stat"><div className="bd-stat-val" style={{ color: '#3B6D11' }}>{fmt(paidTotal)}</div><div className="bd-stat-lbl">Total paid out</div></div>
        <div className="bd-stat"><div className="bd-stat-val" style={{ color: '#854F0B' }}>{fmt(pendingTotal)}</div><div className="bd-stat-lbl">Pending payment</div></div>
        <div className="bd-stat"><div className="bd-stat-val">{localApps.filter(a => a.status === 'success').length}</div><div className="bd-stat-lbl">Deals paid</div></div>
        <div className="bd-stat"><div className="bd-stat-val" style={{ color: '#854F0B' }}>{localApps.filter(a => a.status === 'accepted').length}</div><div className="bd-stat-lbl">Awaiting payment</div></div>
      </div>

      {payApps.length === 0 ? (
        <div className="bd-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <i className="ti ti-credit-card" style={{ fontSize: 36, color: '#d1d5db', display: 'block', marginBottom: 14 }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 8 }}>No payment requests yet</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Accept creator applications first, then come back here to process payments.</div>
        </div>
      ) : (
        <div className="bd-card">
          <div className="bd-card-hd">
            <span className="bd-card-title">Deals to pay</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="bd-tbl" style={{ minWidth: 700 }}>
              <thead>
                <tr><th>Creator</th><th>Campaign</th><th>Bid amount</th><th>Final amount</th><th>TDS (2%)</th><th>Net payable</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {payApps.map(app => {
                  const c = app.creators; const av = avColor(app.creator_id)
                  const s = STATUS[app.status] ?? { label: app.status, cls: 'b-gray' }
                  const bidAmt   = app.bid_amount ?? 0
                  const finalAmt = amounts[app.id] ? parseFloat(amounts[app.id]) || bidAmt : bidAmt
                  const tds      = Math.round(finalAmt * 0.02)
                  const net      = finalAmt - tds
                  const isPaid   = app.status === 'success'
                  return (
                    <tr key={app.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="av" style={{ background: av.bg, color: av.color }}>{initFrom(c?.full_name ?? c?.username)}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{c?.full_name ?? c?.username ?? 'Creator'}</div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>{c?.platform ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{app.campaigns?.title ?? '—'}</td>
                      <td><b style={{ fontSize: 12 }}>{bidAmt ? fmt(bidAmt) : '—'}</b></td>
                      <td>
                        {isPaid ? (
                          <b style={{ fontSize: 12, color: '#3B6D11' }}>{finalAmt ? fmt(finalAmt) : '—'}</b>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12 }}>₹</span>
                            <input
                              type="number"
                              value={amounts[app.id] ?? (bidAmt || '')}
                              onChange={e => setAmounts(a => ({ ...a, [app.id]: e.target.value }))}
                              style={{ width: 90, padding: '4px 6px 4px 18px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none' }}
                            />
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{tds ? fmt(tds) : '—'}</td>
                      <td><b style={{ fontSize: 12, color: '#3B6D11' }}>{net ? fmt(net) : '—'}</b></td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        {isPaid ? (
                          <div style={{ fontSize: 11, color: '#3B6D11', fontWeight: 600 }}>✓ Paid</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Btn variant="green" style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={() => markPaid(app)}>
                              {saving[app.id] ? '…' : <><i className="ti ti-check" />Mark Paid</>}
                            </Btn>
                            {msg[app.id] && <div style={{ fontSize: 10, color: msg[app.id].startsWith('✓') ? '#3B6D11' : '#A32D2D' }}>{msg[app.id]}</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Departments
// ─── Dept task — matches actual DB columns ────────────────────────────────────
interface BDeptTask {
  id: string
  brand_id: string
  title: string
  description: string | null
  department: string | null
  status: string        // 'todo' | 'in_progress' | 'review' | 'done'
  priority: string | null
  assigned_to: string | null
  created_by: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

interface TaskMessage {
  id: string
  task_id: string
  brand_id: string
  sender_id: string
  content: string
  created_at: string
}

const TASK_STATUS_CFG: Record<string, { label: string; cls: string; next: string; icon: string }> = {
  todo:        { label: 'To Do',       cls: 'b-gray', next: 'in_progress', icon: 'ti-circle'        },
  in_progress: { label: 'In Progress', cls: 'b-warn', next: 'review',      icon: 'ti-loader-2'      },
  review:      { label: 'In Review',   cls: 'b-info', next: 'done',        icon: 'ti-eye'           },
  done:        { label: '✓ Done',      cls: 'b-ok',   next: 'todo',        icon: 'ti-circle-check'  },
}

const PHASES: { key: string; label: string; icon: string }[] = [
  { key: 'todo',        label: 'Assigned',    icon: 'ti-flag'         },
  { key: 'in_progress', label: 'In progress', icon: 'ti-loader-2'     },
  { key: 'review',      label: 'Review',      icon: 'ti-eye'          },
  { key: 'done',        label: 'Done',        icon: 'ti-circle-check' },
]
const PHASE_ORDER = ['todo', 'in_progress', 'review', 'done']

function DeptTaskTable({ tasks, teamMembers, onUpdateStatus, onDelete }: {
  tasks: BDeptTask[]
  teamMembers: TeamMember[]
  onUpdateStatus: (t: BDeptTask, newStatus: string) => void
  onDelete: (id: string) => void
}) {
  if (tasks.length === 0) return (
    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '28px 0', fontSize: 12 }}>
      No tasks in this department yet. Add one above.
    </div>
  )

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#6b7280',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="bd-tbl">
        <thead>
          <tr>
            <th>Task</th>
            <th>Priority</th>
            <th>Assigned to</th>
            <th>Due date</th>
            <th>Status</th>
            <th style={{ width: 28 }}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => {
            const cfg      = TASK_STATUS_CFG[t.status] ?? TASK_STATUS_CFG.todo
            const assignee = teamMembers.find(m => m.user_id === t.assigned_to)
            const priColor = PRIORITY_COLORS[t.priority ?? 'medium'] ?? '#6b7280'
            const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()
            return (
              <tr key={t.id} style={{ opacity: t.status === 'done' ? 0.55 : 1 }}>
                <td style={{ maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? '#9ca3af' : '#111827' }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.description}</div>}
                </td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, color: priColor, textTransform: 'capitalize' }}>
                    {t.priority ?? 'medium'}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {assignee
                    ? <span className="badge b-blue">{memberLabel(assignee)}</span>
                    : <span style={{ color: '#9ca3af', fontSize: 11 }}>Unassigned</span>}
                </td>
                <td style={{ fontSize: 11, whiteSpace: 'nowrap', color: isOverdue ? '#dc2626' : '#9ca3af', fontWeight: isOverdue ? 700 : 400 }}>
                  {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  {isOverdue && ' ⚠'}
                </td>
                <td>
                  <button
                    onClick={() => onUpdateStatus(t, cfg.next)}
                    className={`badge ${cfg.cls}`}
                    style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                    title={`Click to advance → ${TASK_STATUS_CFG[cfg.next]?.label}`}
                  >
                    {cfg.label}
                  </button>
                </td>
                <td>
                  <button onClick={() => onDelete(t.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, lineHeight: 1 }}
                    title="Delete task">✕</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

type DeptKey = 'banner' | 'promo' | 'affiliate' | 'internal' | 'analyst'

const DEPT_CFG: { key: DeptKey; label: string; icon: string; color: string; badgeCls: string }[] = [
  { key: 'banner',    label: 'Banner / Display',    icon: 'ti-photo',      color: '#185FA5', badgeCls: 'b-info' },
  { key: 'promo',     label: 'Promo / Sponsorship', icon: 'ti-video',      color: '#854F0B', badgeCls: 'b-warn' },
  { key: 'affiliate', label: 'Affiliate / Link',    icon: 'ti-link',       color: '#3B6D11', badgeCls: 'b-ok' },
  { key: 'internal',  label: 'Internal',            icon: 'ti-users',      color: '#0369A1', badgeCls: 'b-gray' },
  { key: 'analyst',   label: 'Analyst',             icon: 'ti-chart-bar',  color: '#0F766E', badgeCls: 'b-gray' },
]

const CARD_DEPTS: DeptKey[] = ['banner', 'promo', 'affiliate', 'analyst']

// ─── Task Tracker (split-panel: list + phase chat) ───────────────────────────

function TaskTrackerView({ tasks, teamMembers, brandId, userId, onUpdateStatus }: {
  tasks: BDeptTask[]
  teamMembers: TeamMember[]
  brandId: string
  userId: string
  onUpdateStatus: (t: BDeptTask, newStatus: string) => void
}) {
  const supabase = useMemo(() => createClient(), [])

  const [selected,   setSelected]   = useState<BDeptTask | null>(null)
  const [messages,   setMessages]   = useState<TaskMessage[]>([])
  const [msgCounts,  setMsgCounts]  = useState<Record<string, number>>({})
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [filterDept, setFilterDept] = useState<string>('all')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load message counts for all tasks (for badges)
  useEffect(() => {
    if (!brandId || tasks.length === 0) return
    supabase
      .from('task_messages')
      .select('task_id')
      .eq('brand_id', brandId)
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        ;(data ?? []).forEach((r: any) => { counts[r.task_id] = (counts[r.task_id] ?? 0) + 1 })
        setMsgCounts(counts)
      })
  }, [brandId, tasks.length])

  // Load messages + subscribe to realtime when a task is selected
  useEffect(() => {
    if (!selected) return
    setMessages([])

    supabase
      .from('task_messages')
      .select('*')
      .eq('task_id', selected.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as TaskMessage[]))

    const ch = supabase
      .channel(`task-chat-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'task_messages',
        filter: `task_id=eq.${selected.id}`,
      }, payload => {
        setMessages(m => [...m, payload.new as TaskMessage])
        setMsgCounts(c => ({ ...c, [selected.id]: (c[selected.id] ?? 0) + 1 }))
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [selected?.id])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    await supabase.from('task_messages').insert({
      task_id:   selected.id,
      brand_id:  brandId,
      sender_id: userId,
      content:   input.trim(),
    })
    setInput('')
    setSending(false)
  }

  async function movePhase(task: BDeptTask, newStatus: string) {
    onUpdateStatus(task, newStatus)
    if (selected?.id === task.id) setSelected({ ...task, status: newStatus })
    // Post a system-style message
    await supabase.from('task_messages').insert({
      task_id:   task.id,
      brand_id:  brandId,
      sender_id: userId,
      content:   `__status__:${newStatus}`,
    })
  }

  const filtered = tasks.filter(t => filterDept === 'all' || t.department === filterDept)

  const assignee = selected ? teamMembers.find(m => m.user_id === selected.assigned_to) ?? null : null
  const assigner = selected ? teamMembers.find(m => m.user_id === selected.created_by)  ?? null : null
  const phaseIdx = selected ? PHASE_ORDER.indexOf(selected.status) : -1

  const inp: React.CSSProperties = {
    fontSize: 12, padding: '5px 9px', border: '0.5px solid var(--color-border-secondary,#e5e7eb)',
    borderRadius: 6, background: 'var(--color-background-secondary,#f9fafb)',
    outline: 'none', color: 'var(--color-text-primary,#111827)',
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: 560, border: '0.5px solid var(--color-border-tertiary,#e5e7eb)', borderRadius: 10, overflow: 'hidden', background: 'var(--color-background-primary,#fff)' }}>

      {/* ── Left: task list ── */}
      <div style={{ width: 256, flexShrink: 0, borderRight: '0.5px solid var(--color-border-tertiary,#e5e7eb)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header + filters */}
        <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary,#e5e7eb)' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary,#111827)', marginBottom: 8 }}>All tasks · {filtered.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(['all', ...DEPT_CFG.filter(d => d.key !== 'analyst').map(d => d.key)] as string[]).map(k => {
              const label = k === 'all' ? 'All' : DEPT_CFG.find(d => d.key === k)?.label.split(' /')[0] ?? k
              return (
                <button key={k} onClick={() => setFilterDept(k)}
                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: '0.5px solid',
                    borderColor: filterDept === k ? '#534AB7' : 'var(--color-border-secondary,#e5e7eb)',
                    background:  filterDept === k ? '#EEEDFE' : 'var(--color-background-secondary,#f9fafb)',
                    color:       filterDept === k ? '#3C3489' : 'var(--color-text-secondary,#6b7280)',
                    cursor: 'pointer', fontWeight: 500,
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Task rows */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary,#9ca3af)', padding: '30px 0', fontSize: 12 }}>No tasks</div>
          )}
          {filtered.map(t => {
            const isSel  = selected?.id === t.id
            const dBadge = DEPT_BADGE[t.department ?? ''] ?? { bg: '#f3f4f6', color: '#6b7280' }
            const cfg    = TASK_STATUS_CFG[t.status] ?? TASK_STATUS_CFG.todo
            const msgN   = msgCounts[t.id] ?? 0
            const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()
            const assigneeMember = teamMembers.find(m => m.user_id === t.assigned_to)
            return (
              <div key={t.id} onClick={() => setSelected(t)}
                style={{
                  padding: '10px 12px', borderBottom: '0.5px solid var(--color-border-tertiary,#e5e7eb)',
                  cursor: 'pointer', background: isSel ? '#EEEDFE' : 'transparent',
                  transition: 'background .1s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: isSel ? '#26215C' : 'var(--color-text-primary,#111827)', lineHeight: 1.3 }}>{t.title}</span>
                  {msgN > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0, marginLeft: 4 }}>{msgN}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: dBadge.bg, color: dBadge.color }}>
                    {DEPT_CFG.find(d => d.key === t.department)?.label.split(' /')[0] ?? t.department}
                  </span>
                  <span className={`badge ${cfg.cls}`} style={{ fontSize: 9, padding: '1px 6px' }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary,#9ca3af)', marginTop: 4, display: 'flex', gap: 6 }}>
                  {assigneeMember && <span><i className="ti ti-user" style={{ fontSize: 10 }} /> {memberLabel(assigneeMember)}</span>}
                  {t.due_date && (
                    <span style={{ color: isOverdue ? '#dc2626' : 'inherit' }}>
                      <i className="ti ti-calendar" style={{ fontSize: 10 }} /> {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{isOverdue ? ' ⚠' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right: task detail ── */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--color-text-secondary,#9ca3af)' }}>
          <i className="ti ti-layout-sidebar-right" style={{ fontSize: 36 }} />
          <div style={{ fontSize: 13, fontWeight: 500 }}>Select a task to view details and chat</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Task header */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary,#e5e7eb)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary,#111827)', marginBottom: 6 }}>{selected.title}</div>
            {selected.description && <div style={{ fontSize: 11, color: 'var(--color-text-secondary,#6b7280)', marginBottom: 6 }}>{selected.description}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {(() => { const d = DEPT_BADGE[selected.department ?? '']; return d ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: d.bg, color: d.color }}>{DEPT_CFG.find(x => x.key === selected.department)?.label ?? selected.department}</span> : null })()}
              <span className={`badge ${(TASK_STATUS_CFG[selected.status] ?? TASK_STATUS_CFG.todo).cls}`} style={{ fontSize: 10 }}>
                {(TASK_STATUS_CFG[selected.status] ?? TASK_STATUS_CFG.todo).label}
              </span>
              {selected.priority && (
                <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLORS[selected.priority] ?? '#6b7280', textTransform: 'capitalize' }}>{selected.priority}</span>
              )}
              {selected.due_date && (
                <span style={{ fontSize: 10, color: 'var(--color-text-secondary,#9ca3af)', marginLeft: 'auto' }}>
                  <i className="ti ti-calendar" style={{ fontSize: 11 }} /> Due {new Date(selected.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>

          {/* 4-phase tracker */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--color-border-tertiary,#e5e7eb)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
              {/* connector line */}
              <div style={{ position: 'absolute', top: 13, left: 14, right: 14, height: 2, background: 'var(--color-border-tertiary,#e5e7eb)', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: 13, left: 14, height: 2, zIndex: 1, background: '#534AB7', width: phaseIdx <= 0 ? '0%' : phaseIdx >= 3 ? '100%' : `${(phaseIdx / 3) * 100}%`, transition: 'width .4s' }} />
              {PHASES.map((ph, i) => {
                const isDone   = i < phaseIdx
                const isActive = i === phaseIdx
                return (
                  <div key={ph.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid', fontSize: 13,
                      borderColor: isDone ? '#3B6D11' : isActive ? '#534AB7' : 'var(--color-border-tertiary,#e5e7eb)',
                      background:  isDone ? '#EAF3DE' : isActive ? '#EEEDFE'  : 'var(--color-background-secondary,#f9fafb)',
                      color:       isDone ? '#27500A' : isActive ? '#3C3489'  : 'var(--color-text-secondary,#9ca3af)',
                    }}>
                      <i className={`ti ${isDone ? 'ti-check' : ph.icon}`} style={{ fontSize: 12 }} />
                    </div>
                    <div style={{ fontSize: 9, marginTop: 4, fontWeight: isActive ? 600 : 400, color: isDone ? '#3B6D11' : isActive ? '#534AB7' : 'var(--color-text-secondary,#9ca3af)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {ph.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* People + move phase */}
          <div style={{ padding: '8px 16px', borderBottom: '0.5px solid var(--color-border-tertiary,#e5e7eb)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {[
              { member: assigner,  role: 'Assigned by' },
              { member: assignee,  role: 'Assigned to' },
            ].map(({ member, role }) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#3C3489', flexShrink: 0 }}>
                  {(member ? memberLabel(member) : '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary,#111827)' }}>{member ? memberLabel(member) : 'Unknown'}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary,#6b7280)' }}>{role}</div>
                </div>
              </div>
            ))}
            {/* Phase action — role-aware label so each person knows what to do */}
            {(() => {
              const isAssignee = selected.assigned_to === userId
              const isAssigner = selected.created_by  === userId
              const canAct     = isAssignee || isAssigner

              // Label + hint per stage
              const ACTION: Record<string, { btn: string; hint: string; actor: string }> = {
                todo:        { btn: 'Start working',       hint: 'Assignee marks this when work begins',          actor: 'assignee' },
                in_progress: { btn: 'Submit for review',   hint: 'Assignee submits once work is ready to check',  actor: 'assignee' },
                review:      { btn: 'Approve & complete',  hint: 'Assigner approves after checking the work',     actor: 'assigner' },
              }
              const act = ACTION[selected.status]

              if (selected.status === 'done') return (
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <button onClick={() => movePhase(selected, 'todo')}
                    style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary,#e5e7eb)', background: 'var(--color-background-secondary,#f9fafb)', color: 'var(--color-text-secondary,#6b7280)', cursor: 'pointer' }}>
                    <i className="ti ti-refresh" style={{ fontSize: 11 }} /> Reopen task
                  </button>
                </div>
              )

              if (!act) return null
              const isMyTurn = (act.actor === 'assignee' && isAssignee) || (act.actor === 'assigner' && isAssigner)

              return (
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <button
                    onClick={() => canAct && movePhase(selected, (TASK_STATUS_CFG[selected.status] ?? TASK_STATUS_CFG.todo).next)}
                    disabled={!canAct}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
                      border: `0.5px solid ${isMyTurn ? '#AFA9EC' : 'var(--color-border-secondary,#e5e7eb)'}`,
                      background: isMyTurn ? '#EEEDFE' : 'var(--color-background-secondary,#f9fafb)',
                      color: isMyTurn ? '#3C3489' : 'var(--color-text-secondary,#9ca3af)',
                      cursor: canAct ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                    }}>
                    <i className={`ti ${isMyTurn ? 'ti-arrow-right' : 'ti-lock'}`} style={{ fontSize: 11 }} /> {act.btn}
                  </button>
                  <span style={{ fontSize: 9, color: 'var(--color-text-secondary,#9ca3af)', textAlign: 'right', maxWidth: 180 }}>
                    {isMyTurn ? '← your turn' : act.hint}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Chat thread */}
          <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary,#9ca3af)', padding: '20px 0', fontSize: 12 }}>
                No messages yet. Start the conversation below.
              </div>
            )}
            {messages.map(msg => {
              // System status messages
              if (msg.content.startsWith('__status__:')) {
                const newStatus = msg.content.replace('__status__:', '')
                const cfg = TASK_STATUS_CFG[newStatus]
                return (
                  <div key={msg.id} style={{ alignSelf: 'center', fontSize: 10, color: 'var(--color-text-secondary,#9ca3af)', background: 'var(--color-background-secondary,#f3f4f6)', padding: '3px 10px', borderRadius: 20, border: '0.5px solid var(--color-border-tertiary,#e5e7eb)' }}>
                    <i className={`ti ${cfg?.icon ?? 'ti-refresh'}`} style={{ fontSize: 10, marginRight: 4 }} />
                    Phase moved to <strong>{cfg?.label ?? newStatus}</strong> · {new Date(msg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )
              }
              const isMe     = msg.sender_id === userId
              const sender   = teamMembers.find(m => m.user_id === msg.sender_id)
              const senderLbl = sender ? memberLabel(sender) : 'Unknown'
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '75%', alignSelf: isMe ? 'flex-end' : 'flex-start', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-secondary,#9ca3af)' }}>
                    {senderLbl} · {new Date(msg.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div style={{
                    padding: '8px 11px', borderRadius: 10, fontSize: 12, lineHeight: 1.5,
                    background: isMe ? '#EEEDFE' : 'var(--color-background-secondary,#f3f4f6)',
                    border: `0.5px solid ${isMe ? '#AFA9EC' : 'var(--color-border-tertiary,#e5e7eb)'}`,
                    color: isMe ? '#26215C' : 'var(--color-text-primary,#111827)',
                  }}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '8px 16px', borderTop: '0.5px solid var(--color-border-tertiary,#e5e7eb)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a query or update… (Enter to send)"
              style={{ ...inp, flex: 1, padding: '7px 10px' }}
            />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: sending || !input.trim() ? 'var(--color-background-secondary,#e5e7eb)' : '#534AB7', color: '#fff', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-send" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Task History (unified cross-dept list) ───────────────────────────────────
const DEPT_BADGE: Record<string, { bg: string; color: string }> = {
  banner:    { bg: '#DBEAFE', color: '#185FA5' },
  promo:     { bg: '#FEF3C7', color: '#854F0B' },
  affiliate: { bg: '#DCFCE7', color: '#3B6D11' },
  internal:  { bg: '#E0F2FE', color: '#0369A1' },
  analyst:   { bg: '#CCFBF1', color: '#0F766E' },
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#6b7280',
}

function TaskHistoryView({
  tasks, teamMembers, onUpdateStatus, onDelete,
}: {
  tasks: BDeptTask[]; teamMembers: TeamMember[]
  onUpdateStatus: (t: BDeptTask, newStatus: string) => void
  onDelete: (id: string) => void
}) {
  const [filterDept,   setFilterDept]   = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const visible = tasks
    .filter(t => filterDept   === 'all' || t.department === filterDept)
    .filter(t => filterStatus === 'all' || t.status      === filterStatus)

  const selStyle = { fontSize: 12, padding: '5px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selStyle}>
          <option value="all">All departments</option>
          {DEPT_CFG.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="all">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{visible.length} task{visible.length !== 1 ? 's' : ''}</span>
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '36px 0', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
          No tasks match this filter
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1.5px solid #e5e7eb' }}>
                {['Dept', 'Task', 'Priority', 'Assigned To', 'Due', 'Status', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((t, i) => {
                const cfg      = TASK_STATUS_CFG[t.status] ?? TASK_STATUS_CFG.todo
                const assignee = teamMembers.find(m => m.user_id === t.assigned_to)
                const isOverdue = t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()
                const dBadge   = DEPT_BADGE[t.department ?? ''] ?? { bg: '#f3f4f6', color: '#6b7280' }
                const dLabel   = DEPT_CFG.find(d => d.key === t.department)?.label ?? t.department ?? '—'
                return (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6', opacity: t.status === 'done' ? 0.6 : 1 }}>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: dBadge.bg, color: dBadge.color }}>
                        {dLabel}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: 260, whiteSpace: 'normal', lineHeight: 1.4 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.status === 'done' ? '#9ca3af' : '#111827', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{t.description}</div>}
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[t.priority ?? 'medium'] ?? '#6b7280', textTransform: 'capitalize' }}>
                        {t.priority ?? 'medium'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {assignee
                        ? <span className="badge b-blue">{memberLabel(assignee)}</span>
                        : <span style={{ color: '#9ca3af', fontSize: 11 }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: 11, color: isOverdue ? '#dc2626' : '#9ca3af', fontWeight: isOverdue ? 700 : 400 }}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      {isOverdue && ' ⚠'}
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => onUpdateStatus(t, cfg.next)}
                        className={`badge ${cfg.cls}`}
                        style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                        title={`Click → ${TASK_STATUS_CFG[cfg.next]?.label}`}>
                        {cfg.label}
                      </button>
                    </td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: 11, color: '#9ca3af' }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => onDelete(t.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, lineHeight: 1 }}
                        title="Delete">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── DeptView ─────────────────────────────────────────────────────────────────

function DeptView({ brandId, teamMembers, deals, focusDept }: {
  brandId: string; teamMembers: TeamMember[]; deals: Deal[]; focusDept?: string
}) {
  const supabase  = useMemo(() => createClient(), [])
  const [tasks,   setTasks]   = useState<BDeptTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'manage' | 'history'>('manage')
  const [deptTab, setDeptTab] = useState<DeptKey>(
    (DEPT_CFG.find(d => d.key === focusDept)?.key) ?? 'banner'
  )

  // New task form state
  const [newTitle,    setNewTitle]    = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newAssignee, setNewAssignee] = useState('')
  const [newDue,      setNewDue]      = useState('')
  const [addErr,      setAddErr]      = useState('')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (focusDept && DEPT_CFG.find(d => d.key === focusDept)) {
      setDeptTab(focusDept as DeptKey)
    }
  }, [focusDept])

  useEffect(() => {
    if (!brandId) return
    supabase.from('brand_tasks').select('*').eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTasks((data ?? []) as BDeptTask[]); setLoading(false) })
  }, [brandId])

  async function updateTaskStatus(task: BDeptTask, newStatus: string) {
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    await supabase.from('brand_tasks').update({ status: newStatus }).eq('id', task.id)
  }

  async function deleteTask(id: string) {
    setTasks(ts => ts.filter(t => t.id !== id))
    await supabase.from('brand_tasks').delete().eq('id', id)
  }

  async function addTask() {
    if (!newTitle.trim()) { setAddErr('Title is required.'); return }
    setSaving(true); setAddErr('')
    const { data, error } = await supabase.from('brand_tasks').insert({
      brand_id:    brandId,
      title:       newTitle.trim(),
      department:  deptTab,
      status:      'todo',
      priority:    newPriority,
      assigned_to: newAssignee || null,
      due_date:    newDue || null,
      created_by:  (await supabase.auth.getUser()).data.user?.id ?? null,
    }).select('*').single()
    setSaving(false)
    if (error) { setAddErr(error.message); return }
    if (data) setTasks(ts => [data as BDeptTask, ...ts])
    setNewTitle(''); setNewDue(''); setNewAssignee('')
  }

  // Group tasks by department
  const byDept = (key: DeptKey) => tasks.filter(t => t.department === key)

  const activeTasks  = byDept(deptTab)
  const activeCfg    = DEPT_CFG.find(d => d.key === deptTab)!

  const inpS = { width: '100%', fontSize: 12, padding: '6px 9px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none', fontFamily: 'inherit' } as const

  const nonAnalystTasks = tasks.filter(t => t.department !== 'analyst')

  return (
    <div className="bd-body">

      {/* ── View mode toggle ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {([
          { key: 'manage',  label: '📋 Manage' },
          { key: 'history', label: `🕒 History${nonAnalystTasks.length > 0 ? ` (${nonAnalystTasks.length})` : ''}` },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setViewMode(key)} style={{
            padding: '7px 16px', borderRadius: 8, border: '1.5px solid',
            borderColor: viewMode === key ? '#4f46e5' : '#e5e7eb',
            background:  viewMode === key ? '#ede9fe' : '#f9fafb',
            color:       viewMode === key ? '#4f46e5' : '#6b7280',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── History view ── */}
      {viewMode === 'history' && (
        <div className="bd-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>All Task History</div>
          {loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
          ) : (
            <TaskHistoryView
              tasks={nonAnalystTasks}
              teamMembers={teamMembers}
              onUpdateStatus={updateTaskStatus}
              onDelete={deleteTask}
            />
          )}
        </div>
      )}

      {/* ── Manage view ── */}
      {viewMode === 'manage' && <>

      {/* ── Summary cards (top 4 dept) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {CARD_DEPTS.map(key => {
          const cfg   = DEPT_CFG.find(d => d.key === key)!
          const dt    = byDept(key)
          const todo  = dt.filter(t => t.status === 'todo').length
          const inPrg = dt.filter(t => t.status === 'in_progress').length
          const done  = dt.filter(t => t.status === 'done').length
          const isActive = deptTab === key
          return (
            <div
              key={key}
              className="dept-card"
              onClick={() => setDeptTab(key)}
              style={{
                cursor: 'pointer',
                outline: isActive ? `2px solid ${cfg.color}` : 'none',
                outlineOffset: -1,
                transition: 'outline 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 15, color: cfg.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{cfg.label}</span>
                </div>
                <span className={`badge ${cfg.badgeCls}`}>{dt.length} tasks</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#111827', letterSpacing: '-.02em' }}>
                {todo + inPrg}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Open tasks</div>
              <div style={{ borderTop: '0.5px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['To Do',       todo,  '#6b7280'],
                  ['In Progress', inPrg, '#d97706'],
                  ['Done',        done,  '#16a34a'],
                ].map(([label, val, color]: any) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ color, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Department task queues ── */}
      <div className="bd-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Dept tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexWrap: 'wrap' }}>
          {DEPT_CFG.map(d => {
            const open = byDept(d.key).filter(t => t.status !== 'done').length
            return (
              <button key={d.key} onClick={() => setDeptTab(d.key)}
                style={{
                  padding: '10px 16px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none',
                  cursor: 'pointer', color: deptTab === d.key ? d.color : '#6b7280',
                  borderBottom: deptTab === d.key ? `2px solid ${d.color}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                <i className={`ti ${d.icon}`} />
                {d.label}
                {open > 0 && (
                  <span style={{ background: d.color, color: '#fff', borderRadius: 9, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                    {open}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 16 }}>
          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              <i className={`ti ${activeCfg.icon}`} style={{ marginRight: 6, color: activeCfg.color }} />
              {activeCfg.label}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#6b7280' }}>
              {[
                [activeTasks.filter(t => t.status === 'todo').length,        'to do'],
                [activeTasks.filter(t => t.status === 'in_progress').length, 'in progress'],
                [activeTasks.filter(t => t.status === 'done').length,        'done'],
              ].map(([n, label]) => (
                <span key={String(label)}><strong style={{ color: '#111827' }}>{n}</strong> {label}</span>
              ))}
            </div>
          </div>

          {/* Add task form */}
          {deptTab !== 'analyst' && (
            <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8 }}>+ Add task to {activeCfg.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="Task title…"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  style={inpS}
                />
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ ...inpS, width: 'auto' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} style={{ ...inpS, width: 'auto' }}>
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>
                  ))}
                </select>
                <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} style={{ ...inpS, width: 'auto' }} />
                <button
                  onClick={addTask}
                  disabled={saving}
                  style={{ padding: '6px 14px', background: activeCfg.color, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {saving ? '…' : 'Add'}
                </button>
              </div>
              {addErr && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>{addErr}</div>}
            </div>
          )}

          {/* Task table / analyst view */}
          {deptTab === 'analyst' ? (
            <AnalystView brandId={brandId} deals={deals as unknown as any[]} analystDealIds={new Set()} />
          ) : loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
          ) : (
            <DeptTaskTable
              tasks={activeTasks}
              teamMembers={teamMembers}
              onUpdateStatus={updateTaskStatus}
              onDelete={deleteTask}
            />
          )}
        </div>
      </div>

      </>}
    </div>
  )
}

// Content
// ─── Types for content submissions ───────────────────────────────────────────
interface ContentSub {
  id: string; brand_id: string; deal_id: string | null; submitted_by: string
  file_url: string | null; file_name: string | null; content_type: string | null
  price: number | null; channel_name: string | null
  status: string | null; feedback: string | null; submitted_at: string | null
  profiles: { display_name: string | null; email: string | null } | null
  deals: { id: string; campaigns: { title: string } | null } | null
}

const CS_STATUS: Record<string, { label: string; cls: string; next: string }> = {
  pending:        { label: 'Pending Review', cls: 'b-warn',   next: 'approved'       },
  approved:       { label: '✓ Approved',     cls: 'b-ok',     next: 'needs_revision' },
  needs_revision: { label: 'Needs Revision', cls: 'b-purple', next: 'rejected'       },
  rejected:       { label: 'Rejected',       cls: 'b-red',    next: 'pending'        },
}
const CS_TYPE_ICON: Record<string, string> = {
  video: 'ti-brand-youtube', image: 'ti-photo', document: 'ti-file-text', link: 'ti-link',
}

function ContentView({ brandId }: { brandId: string }) {
  const supabase = createClient()
  const [subs,       setSubs]       = useState<ContentSub[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const [feedback,   setFeedback]   = useState<Record<string, string>>({})
  const [saving,     setSaving]     = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!brandId) return
    supabase
      .from('content_submissions')
      .select('id, brand_id, deal_id, submitted_by, file_url, file_name, content_type, price, channel_name, status, feedback, submitted_at, profiles:submitted_by(display_name, email), deals:deal_id(id, campaigns:campaign_id(title))')
      .eq('brand_id', brandId)
      .order('submitted_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setSubs((data ?? []) as unknown as ContentSub[]); setLoading(false) })

    // Realtime: new submissions pop in instantly
    const ch = supabase.channel(`cs-brand-${brandId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_submissions', filter: `brand_id=eq.${brandId}` },
        async p => {
          // Refetch to get joins
          const { data } = await supabase
            .from('content_submissions')
            .select('id, brand_id, deal_id, submitted_by, file_url, file_name, content_type, price, channel_name, status, feedback, submitted_at, profiles:submitted_by(display_name, email), deals:deal_id(id, campaigns:campaign_id(title))')
            .eq('id', (p.new as any).id)
            .single()
          if (data) setSubs(prev => prev.find(s => s.id === (data as any).id) ? prev : [data as unknown as ContentSub, ...prev])
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [brandId])

  async function setStatus(id: string, status: string) {
    await supabase.from('content_submissions').update({ status }).eq('id', id)
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  async function saveFeedback(id: string) {
    const fb = feedback[id]?.trim()
    if (!fb) return
    setSaving(s => ({ ...s, [id]: true }))
    await supabase.from('content_submissions').update({ feedback: fb }).eq('id', id)
    setSubs(prev => prev.map(s => s.id === id ? { ...s, feedback: fb } : s))
    setSaving(s => ({ ...s, [id]: false }))
  }

  const visible = filter === 'all' ? subs : subs.filter(s => s.status === filter)

  const stats = {
    total:    subs.length,
    pending:  subs.filter(s => s.status === 'pending').length,
    approved: subs.filter(s => s.status === 'approved').length,
    revision: subs.filter(s => s.status === 'needs_revision').length,
  }

  return (
    <div className="bd-body">
      {/* Stats */}
      <div className="bd-stat-row">
        {[
          { label: 'Total received',  val: stats.total    },
          { label: 'Pending review',  val: stats.pending  },
          { label: 'Approved',        val: stats.approved },
          { label: 'Needs revision',  val: stats.revision },
        ].map(s => <div key={s.label} className="bd-stat"><div className="bd-stat-val">{s.val}</div><div className="bd-stat-lbl">{s.label}</div></div>)}
      </div>

      <div className="bd-card">
        <div className="bd-card-hd">
          <span className="bd-card-title">Content Submissions</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'pending', 'approved', 'needs_revision', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ fontSize: 11, padding: '3px 10px', border: `0.5px solid ${filter === f ? '#185FA5' : '#e5e7eb'}`, borderRadius: 5, background: filter === f ? '#E6F1FB' : '#f9fafb', color: filter === f ? '#185FA5' : '#6b7280', cursor: 'pointer', textTransform: 'capitalize' }}>
                {f === 'needs_revision' ? 'Revision' : f}
              </button>
            ))}
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0', fontSize: 13 }}>Loading…</div>}

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📭</div>
            {subs.length === 0 ? 'No content submitted yet — members can submit from their dashboard.' : 'No items match this filter.'}
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map(cs => {
              const sc   = CS_STATUS[cs.status ?? 'pending'] ?? { label: cs.status ?? '—', cls: 'b-gray', next: 'pending' }
              const icon = CS_TYPE_ICON[cs.content_type ?? 'link'] ?? 'ti-file'
              const submitter = cs.profiles?.display_name ?? cs.profiles?.email ?? 'Member'
              const campaignTitle = (cs.deals as any)?.campaigns?.title ?? null
              const isImg = cs.content_type === 'image' || cs.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)

              return (
                <div key={cs.id} style={{ border: '0.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Row */}
                  <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Thumbnail */}
                    <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isImg && cs.file_url
                        ? <img src={cs.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <i className={`ti ${icon}`} style={{ fontSize: 22, color: '#9ca3af' }} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{cs.file_name ?? 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        By <strong>{submitter}</strong>
                        {campaignTitle && <> · {campaignTitle}</>}
                        {cs.submitted_at && <> · {new Date(cs.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
                      </div>
                      {cs.channel_name && <div style={{ fontSize: 11, color: '#374151', marginTop: 3, fontWeight: 600 }}>📺 {cs.channel_name}</div>}
                      {cs.price        && <div style={{ fontSize: 11, color: '#3B6D11', marginTop: 2, fontWeight: 700 }}>₹{cs.price.toLocaleString('en-IN')}</div>}
                      {cs.file_url && (
                        <a href={cs.file_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 11, color: '#185FA5', textDecoration: 'none', fontWeight: 600 }}>
                          <i className="ti ti-external-link" style={{ fontSize: 11 }} />View content
                        </a>
                      )}
                    </div>

                    {/* Status + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <span className={`badge ${sc.cls}`}>{sc.label}</span>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {cs.status !== 'approved' && (
                          <button onClick={() => setStatus(cs.id, 'approved')}
                            style={{ fontSize: 11, padding: '3px 10px', background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
                            ✓ Approve
                          </button>
                        )}
                        {cs.status !== 'needs_revision' && (
                          <button onClick={() => setStatus(cs.id, 'needs_revision')}
                            style={{ fontSize: 11, padding: '3px 10px', background: '#EEEDFE', color: '#3C3489', border: '0.5px solid #c4b5fd', borderRadius: 5, cursor: 'pointer' }}>
                            Needs Revision
                          </button>
                        )}
                        {cs.status !== 'rejected' && (
                          <button onClick={() => setStatus(cs.id, 'rejected')}
                            style={{ fontSize: 11, padding: '3px 10px', background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #f9b4b4', borderRadius: 5, cursor: 'pointer' }}>
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feedback row */}
                  <div style={{ borderTop: '0.5px solid #f3f4f6', padding: '8px 14px', background: '#fafafa', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <i className="ti ti-message-2" style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }} />
                    {cs.feedback && !(cs.id in feedback) && (
                      <span style={{ fontSize: 11, color: '#374151', fontStyle: 'italic', flex: 1 }}>"{cs.feedback}"</span>
                    )}
                    <input
                      value={feedback[cs.id] ?? cs.feedback ?? ''}
                      onChange={e => setFeedback(f => ({ ...f, [cs.id]: e.target.value }))}
                      placeholder="Add feedback for member…"
                      style={{ flex: 1, fontSize: 12, padding: '4px 9px', border: '0.5px solid #e5e7eb', borderRadius: 5, background: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={() => saveFeedback(cs.id)} disabled={saving[cs.id]}
                      style={{ fontSize: 11, padding: '4px 12px', background: '#185FA5', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', opacity: saving[cs.id] ? 0.5 : 1, flexShrink: 0 }}>
                      {saving[cs.id] ? '…' : 'Send'}
                    </button>
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

// Tasks — live, stored in brand_tasks table
const DEPT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  promo:    { bg: '#EDE9FE', color: '#5B21B6', label: 'Promo' },
  payment:  { bg: '#FEF9C3', color: '#854D0E', label: 'Payment' },
  internal: { bg: '#E0F2FE', color: '#0369A1', label: 'Internal' },
  other:    { bg: '#F3F4F6', color: '#374151', label: 'Other' },
}

function TasksView({ brandId, teamMembers, userId, deals }: { brandId: string; teamMembers: TeamMember[]; userId: string; deals: Deal[] }) {
  const supabase = createClient()
  interface BTask {
    id: string; title: string; status: string; due_date: string | null; created_at: string
    department: string | null; assigned_to: string | null; priority: string | null
  }
  const [tasks,       setTasks]       = useState<BTask[]>([])
  const [input,       setInput]       = useState('')
  const [due,         setDue]         = useState('')
  const [dept,        setDept]        = useState('internal')
  const [assignee,    setAssignee]    = useState('')
  const [priority,    setPriority]    = useState('medium')
  const [filterDept,  setFilterDept]  = useState('all')
  const [filterWho,   setFilterWho]   = useState('all')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [taskErr,     setTaskErr]     = useState<string | null>(null)
  const [viewMode,    setViewMode]    = useState<'board' | 'tracker'>('board')

  useEffect(() => {
    if (!brandId) return
    supabase.from('brand_tasks').select('id, title, status, due_date, created_at, department, assigned_to, priority').eq('brand_id', brandId).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTasks((data ?? []) as BTask[])
        setLoading(false)
      })
  }, [brandId])

  async function addTask() {
    if (!input.trim()) return
    if (!brandId) { setTaskErr('Brand not loaded — please refresh.'); return }
    setSaving(true); setTaskErr(null)
    const { data, error } = await supabase.from('brand_tasks').insert({
      brand_id: brandId, title: input.trim(), status: 'todo',
      due_date: due || null, department: dept,
      assigned_to: assignee || null, priority,
      created_by: userId,
    }).select('id, title, status, due_date, created_at, department, assigned_to, priority').single()
    if (error) {
      setTaskErr('Failed to add task: ' + error.message)
      setSaving(false); return
    }
    if (data) setTasks(t => [data as BTask, ...t])
    setInput(''); setDue(''); setAssignee(''); setSaving(false)
  }

  async function toggleTask(task: BTask) {
    const status = task.status === 'done' ? 'todo' : 'done'
    await supabase.from('brand_tasks').update({ status }).eq('id', task.id)
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('brand_tasks').delete().eq('id', id)
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  function memberInfo(uid: string | null): { name: string; dept: string | null } | null {
    if (!uid) return null
    const m = teamMembers.find(m => m.user_id === uid)
    if (!m) return null
    return {
      name: memberLabel(m),
      dept: m.department ?? null,
    }
  }

  const filtered = tasks.filter(t =>
    (filterDept === 'all' || t.department === filterDept) &&
    (filterWho  === 'all' || t.assigned_to === filterWho)
  )
  const todo = filtered.filter(t => t.status !== 'done')
  const done = filtered.filter(t => t.status === 'done')

  const inpStyle = { width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none', fontFamily: 'inherit' } as const

  const allDeptTasks = tasks as unknown as BDeptTask[]

  if (viewMode === 'tracker') {
    return (
      <div className="bd-body">
        <div style={{ display: 'flex', gap: 8 }}>
          {([{ k: 'board', l: '📋 Task board' }, { k: 'tracker', l: '💬 Tracker' }] as const).map(({ k, l }) => (
            <button key={k} onClick={() => setViewMode(k)} style={{
              padding: '7px 16px', borderRadius: 8, border: '1.5px solid',
              borderColor: viewMode === k ? '#4f46e5' : '#e5e7eb',
              background:  viewMode === k ? '#ede9fe' : '#f9fafb',
              color:       viewMode === k ? '#4f46e5' : '#6b7280',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
        <TaskTrackerView
          tasks={allDeptTasks}
          teamMembers={teamMembers}
          brandId={brandId}
          userId={userId}
          onUpdateStatus={(t, s) => {
            supabase.from('brand_tasks').update({ status: s }).eq('id', t.id)
          }}
        />
      </div>
    )
  }

  return (
    <div className="bd-body">
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {([{ k: 'board', l: '📋 Task board' }, { k: 'tracker', l: '💬 Tracker' }] as const).map(({ k, l }) => (
          <button key={k} onClick={() => setViewMode(k)} style={{
            padding: '7px 16px', borderRadius: 8, border: '1.5px solid',
            borderColor: viewMode === k ? '#4f46e5' : '#e5e7eb',
            background:  viewMode === k ? '#ede9fe' : '#f9fafb',
            color:       viewMode === k ? '#4f46e5' : '#6b7280',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>{l}</button>
        ))}
      </div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb' }}>
          <option value="all">All departments</option>
          <option value="promo">Promo</option>
          <option value="payment">Payment</option>
          <option value="internal">Internal</option>
          <option value="other">Other</option>
        </select>
        <select value={filterWho} onChange={e => setFilterWho(e.target.value)} style={{ fontSize: 12, padding: '5px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb' }}>
          <option value="all">All assignees</option>
          {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bd-two-col">
        <div className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">Task board</span></div>
          {loading ? <div style={{ fontSize: 12, color: '#9ca3af', padding: 12 }}>Loading…</div> : <>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', padding: '4px 0 6px', fontWeight: 600 }}>To do · {todo.length}</div>
            {todo.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af', padding: '6px 0 12px' }}>No open tasks</p>}
            {todo.map(t => {
              const dc = DEPT_COLORS[t.department ?? 'other'] ?? DEPT_COLORS.other
              const who = memberInfo(t.assigned_to)
              return (
                <div key={t.id} className="task-row" style={{ flexWrap: 'wrap', gap: '4px 8px', alignItems: 'flex-start' }}>
                  <div className="chk" onClick={() => toggleTask(t)} style={{ cursor: 'pointer', marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 12.5 }}>{t.title}</div>
                    {who && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 3, alignItems: 'center' }}>
                        <i className="ti ti-user" style={{ fontSize: 10, color: '#9ca3af' }} />
                        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{who.name}</span>
                        {who.dept && <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 3, background: DEPT_COLORS[who.dept]?.bg ?? '#f3f4f6', color: DEPT_COLORS[who.dept]?.color ?? '#374151' }}>{DEPT_COLORS[who.dept]?.label ?? who.dept}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: dc.bg, color: dc.color }}>{dc.label}</span>
                    {(t.priority === 'high' || t.priority === 'urgent') && <span className="badge b-red" style={{ fontSize: 10 }}>{t.priority}</span>}
                    {t.due_date && <span className="badge b-warn" style={{ fontSize: 10 }}>{new Date(t.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>}
                    <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 13, padding: '0 2px' }}>×</button>
                  </div>
                </div>
              )
            })}
            {done.length > 0 && <>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', padding: '12px 0 6px', fontWeight: 600 }}>Done · {done.length}</div>
              {done.map(t => {
                const who = memberInfo(t.assigned_to)
                return (
                  <div key={t.id} className="task-row">
                    <div className="chk done" onClick={() => toggleTask(t)} style={{ cursor: 'pointer' }}><i className="ti ti-check" style={{ fontSize: 10, color: '#3B6D11' }} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: '#9ca3af', textDecoration: 'line-through' }}>{t.title}</div>
                      {who && <div style={{ fontSize: 10, color: '#d1d5db' }}>→ {who.name}{who.dept ? ` · ${DEPT_COLORS[who.dept]?.label ?? who.dept}` : ''}</div>}
                    </div>
                    <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 13, padding: '0 2px' }}>×</button>
                  </div>
                )
              })}
            </>}
          </>}
        </div>

        <div className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">Add task</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Task description</div>
              <input type="text" placeholder="e.g. Review creator draft" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTask() }} style={inpStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Department</div>
                <select value={dept} onChange={e => setDept(e.target.value)} style={inpStyle}>
                  <option value="internal">Internal</option>
                  <option value="promo">Promo</option>
                  <option value="payment">Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Priority</div>
                <select value={priority} onChange={e => setPriority(e.target.value)} style={inpStyle}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Assign to</div>
              <select value={assignee} onChange={e => setAssignee(e.target.value)} style={inpStyle}>
                <option value="">Unassigned</option>
                {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{memberLabel(m)}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Due date (optional)</div>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} style={inpStyle} />
            </div>
            {taskErr && <div style={{ fontSize: 12, padding: '8px 10px', borderRadius: 6, background: '#FCEBEB', color: '#A32D2D' }}>{taskErr}</div>}
            <Btn variant="primary" style={{ justifyContent: 'center', fontSize: 13, padding: '8px', width: '100%' }} onClick={addTask}>
              {saving ? 'Adding…' : <><i className="ti ti-plus" />Add task</>}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reports
function ReportsView({ campaigns, applications }: { campaigns: Campaign[]; applications: Application[] }) {
  return (
    <div className="bd-body">
      <div className="bd-stat-row">
        <div className="bd-stat"><div className="bd-stat-val">—</div><div className="bd-stat-lbl">Est. reach</div></div>
        <div className="bd-stat"><div className="bd-stat-val">4.6%</div><div className="bd-stat-lbl">Avg engagement</div><div className="bd-stat-sub" style={{ color: '#3B6D11' }}>↑ 0.4%</div></div>
        <div className="bd-stat"><div className="bd-stat-val">—</div><div className="bd-stat-lbl">Est. conversions</div></div>
        <div className="bd-stat"><div className="bd-stat-val">{campaigns.length}</div><div className="bd-stat-lbl">Total campaigns</div></div>
      </div>
      <div className="bd-two-col">
        <div className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">By platform</span></div>
          <table className="bd-tbl">
            <thead><tr><th>Platform</th><th>Applications</th><th>Accepted</th></tr></thead>
            <tbody>
              {['youtube', 'instagram', 'tiktok'].map(p => {
                const apps = applications.filter(a => a.creators?.platform === p)
                return <tr key={p}><td><PlatBadge p={p} /></td><td>{apps.length}</td><td>{apps.filter(a => a.status === 'accepted').length}</td></tr>
              })}
            </tbody>
          </table>
        </div>
        <div className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">Campaign performance</span></div>
          <table className="bd-tbl">
            <thead><tr><th>Campaign</th><th>Applications</th><th>Budget</th></tr></thead>
            <tbody>
              {campaigns.length === 0
                ? <tr><td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No campaigns yet</td></tr>
                : campaigns.map(c => <tr key={c.id}><td style={{ fontSize: 12 }}>{c.title}</td><td>{applications.filter(a => a.campaign_id === c.id).length}</td><td>{c.budget_total ? fmt(c.budget_total) : '—'}</td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Team — live via brand_members
function TeamView({ teamMembers, brandId, ownerEmail, brandName }: { teamMembers: TeamMember[]; brandId: string; ownerEmail: string; brandName: string }) {
  const supabase = createClient()
  const [members,    setMembers]    = useState<TeamMember[]>(teamMembers)
  const [email,      setEmail]      = useState('')
  const [role,       setRole]       = useState('member')
  const [department, setDepartment] = useState('internal')
  const [inviting,   setInviting]   = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteMsg,  setInviteMsg]  = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [invites,    setInvites]    = useState<{ id: string; email: string; role: string | null; department: string | null; created_at: string | null; token: string | null }[]>([])

  useEffect(() => {
    supabase.from('team_invites').select('id, email, role, department, created_at, token').eq('entity_type', 'brand').eq('entity_id', brandId).is('accepted_at', null).order('created_at', { ascending: false })
      .then(({ data }) => setInvites((data ?? []) as any[]))
  }, [brandId])

  async function sendInvite() {
    if (!email.trim()) return
    setInviting(true); setInviteMsg(null); setInviteLink(null)
    const userId = (await supabase.auth.getUser()).data.user?.id
    const token  = crypto.randomUUID()
    const { error } = await supabase.from('team_invites').insert({
      entity_type: 'brand', entity_id: brandId, email: email.trim(), role, department,
      brand_name: brandName, token, invited_by: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error) { setInviteMsg(`Error: ${error.message}`); setInviting(false); return }
    const link = `${window.location.origin}/join?token=${token}`
    setInviteLink(link)
    setInvites(prev => [{ id: Date.now().toString(), email: email.trim(), role, department, created_at: new Date().toISOString(), token }, ...prev])
    setEmail(''); setInviting(false)
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function removeMember(id: string) {
    await supabase.from('brand_members').delete().eq('id', id)
    setMembers(m => m.filter(x => x.id !== id))
  }

  return (
    <div className="bd-body">
      <div className="bd-two-col">
        <div className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">Team members</span></div>
          <table className="bd-tbl">
            <thead><tr><th>Member</th><th>Role</th><th>Joined</th><th /></tr></thead>
            <tbody>
              {/* Owner row */}
              <tr>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="av" style={{ background: '#E6F1FB', color: '#185FA5' }}>{initFrom(ownerEmail)}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 500 }}>You (Owner)</div><div style={{ fontSize: 10, color: '#9ca3af' }}>{ownerEmail}</div></div>
                </div></td>
                <td><span className="badge b-purple">Owner</span></td>
                <td style={{ fontSize: 11, color: '#6b7280' }}>—</td>
                <td />
              </tr>
              {members.filter(m => m.role !== 'owner').map(m => {
                const name = memberLabel(m)
                const av = avColor(m.user_id)
                return (
                  <tr key={m.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="av" style={{ background: av.bg, color: av.color }}>{initFrom(name)}</div>
                      <div><div style={{ fontSize: 12, fontWeight: 500 }}>{name}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>{m.role ?? 'member'}</div></div>
                    </div></td>
                    <td><span className="badge b-info">{m.role ?? 'Member'}</span></td>
                    <td style={{ fontSize: 11, color: '#6b7280' }}>{m.joined_at ? fmtDate(m.joined_at) : '—'}</td>
                    <td><Btn variant="red" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => removeMember(m.id)}>Remove</Btn></td>
                  </tr>
                )
              })}
              {members.filter(m => m.role !== 'owner').length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 16 }}>No additional members yet — invite someone below</td></tr>
              )}
            </tbody>
          </table>

          {invites.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' }}>Pending invites</div>
              {invites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                  <i className="ti ti-mail" style={{ fontSize: 14, color: '#9ca3af' }} />
                  <div style={{ flex: 1, fontSize: 12 }}>{inv.email}</div>
                  {inv.department && <span className="badge b-gray">{inv.department}</span>}
                  <span className="badge b-gray">{inv.role ?? 'member'}</span>
                  <span className="badge b-warn">Pending</span>
                  {inv.token && (
                    <button onClick={() => copyLink(`${window.location.origin}/join?token=${inv.token}`)}
                      style={{ background: 'none', border: '0.5px solid #e5e7eb', borderRadius: 5, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: '#6b7280' }}>
                      <i className="ti ti-copy" />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="bd-card">
          <div className="bd-card-hd"><span className="bd-card-title">Invite team member</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Email address</div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com"
                onKeyDown={e => { if (e.key === 'Enter') sendInvite() }}
                style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Role</div>
                <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', fontFamily: 'inherit' }}>
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Department</div>
                <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', fontFamily: 'inherit' }}>
                  <option value="internal">Internal</option>
                  <option value="promo">Promo</option>
                  <option value="payment">Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            {inviteMsg && <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, background: '#FCEBEB', color: '#A32D2D' }}>{inviteMsg}</div>}
            {inviteLink && (
              <div style={{ background: '#F0F7FF', border: '0.5px solid #BFDBFE', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, marginBottom: 6 }}>
                  <i className="ti ti-link" style={{ marginRight: 4 }} />Invite link generated
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input readOnly value={inviteLink}
                    style={{ flex: 1, fontSize: 11, padding: '6px 8px', border: '0.5px solid #BFDBFE', borderRadius: 5, background: 'white', fontFamily: 'monospace', color: '#374151', outline: 'none' }} />
                  <Btn variant="primary" style={{ fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' }} onClick={() => copyLink(inviteLink)}>
                    {copied ? <><i className="ti ti-check" />Copied!</> : <><i className="ti ti-copy" />Copy</>}
                  </Btn>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>Share this link with your team member — they'll set up their account and get access.</div>
              </div>
            )}
            <Btn variant="primary" style={{ justifyContent: 'center', fontSize: 13, padding: '8px', width: '100%' }} onClick={sendInvite}>
              {inviting ? 'Generating link…' : <><i className="ti ti-link" />Generate invite link</>}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings
function SettingsView({ brand, user }: { brand: Brand | null; user: { id: string; email: string } }) {
  const [name,    setName]    = useState(brand?.name    ?? '')
  const [website, setWebsite] = useState(brand?.website ?? '')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<string | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('brands').update({ name: name.trim(), website: website.trim() }).eq('owner_id', user.id)
    setSaving(false)
    setMsg(error ? `Error: ${error.message}` : 'Saved!')
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="bd-body">
      <div className="bd-card" style={{ maxWidth: 480 }}>
        <div className="bd-card-hd"><span className="bd-card-title">Brand settings</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Brand name', type: 'text',  val: name,    set: setName,    placeholder: 'Your brand name' },
            { label: 'Website',    type: 'url',   val: website, set: setWebsite, placeholder: 'https://yourbrand.com' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{f.label}</div>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', outline: 'none', fontFamily: 'inherit' }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Email</div>
            <input type="email" value={user.email} disabled style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#f0f2f5', color: '#9ca3af', fontFamily: 'inherit' }} />
          </div>
          {msg && <div style={{ fontSize: 12, padding: '7px 10px', borderRadius: 6, background: msg.startsWith('Error') ? '#FCEBEB' : '#EAF3DE', color: msg.startsWith('Error') ? '#A32D2D' : '#3B6D11' }}>{msg}</div>}
          <Btn variant="primary" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '8px 16px' }} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Brand Messages View ─────────────────────────────────────────────────────
function MessagesView({ conversations, userId, brandName }: {
  conversations: BrandConversation[]
  userId: string
  brandName: string
}) {
  const supabase   = createClient()
  const [selected,  setSelected]  = useState<BrandConversation | null>(conversations[0] ?? null)
  const [messages,  setMessages]  = useState<BrandMessage[]>([])
  const [loadingM,  setLoadingM]  = useState(false)
  const [reply,     setReply]     = useState('')
  const [sending,   setSending]   = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { if (conversations[0]) loadMessages(conversations[0]) }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Realtime: subscribe to new messages in the selected conversation
  useEffect(() => {
    if (!selected) return
    const ch = supabase
      .channel(`brand_conv_${selected.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selected.id}` },
        (payload) => {
          setMessages(prev => prev.find(m => m.id === (payload.new as BrandMessage).id) ? prev : [...prev, payload.new as BrandMessage])
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selected?.id])

  async function loadMessages(conv: BrandConversation) {
    setSelected(conv)
    setLoadingM(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as BrandMessage[])
    setLoadingM(false)
    // Mark unread as read
    await supabase.from('messages').update({ read: true })
      .eq('conversation_id', conv.id).neq('sender_id', userId)
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSending(true)
    const body = reply.trim()
    setReply('')
    const { data } = await supabase.from('messages')
      .insert({ conversation_id: selected.id, sender_id: userId, sender_role: 'brand', body })
      .select('*').single()
    if (data) setMessages(prev => [...prev, data as BrandMessage])
    await supabase.from('conversations').update({ last_msg_at: new Date().toISOString() }).eq('id', selected.id)
    // Notify the creator
    const creatorUserId = selected.creators?.user_id
    if (creatorUserId) {
      await notify(supabase, creatorUserId, {
        type:  'message',
        title: `${brandName} replied to you`,
        body:  body.slice(0, 100),
        link:  '/dashboard/creator/profile',
      })
    }
    setSending(false)
  }

  function fmtTime(s: string) {
    const d = new Date(s); const now = new Date()
    const diffH = (now.getTime() - d.getTime()) / 3600000
    if (diffH < 24) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (diffH < 168) return d.toLocaleDateString('en-US', { weekday: 'short' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function creatorInitials(c: BrandConversation['creators']) {
    const name = c?.full_name ?? c?.username
    if (!name) return '?'
    return name.split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  }

  if (conversations.length === 0) {
    return (
      <div className="bd-body">
        <div className="bd-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <i className="ti ti-message-dots" style={{ fontSize: 40, color: '#d1d5db', display: 'block', marginBottom: 14 }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 8 }}>No conversations yet</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Send offers to creators from the Discovery page to start chatting.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bd-body" style={{ padding: 0, flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100vh - 58px)', overflow: 'hidden' }}>
        {/* Conversation list */}
        <div style={{ borderRight: '0.5px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #e5e7eb', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em' }}>Inbox</div>
          {conversations.map(conv => {
            const isActive = selected?.id === conv.id
            return (
              <div key={conv.id} onClick={() => loadMessages(conv)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: isActive ? '#E6F1FB' : 'transparent', borderLeft: isActive ? '3px solid #185FA5' : '3px solid transparent', cursor: 'pointer', borderBottom: '0.5px solid #e5e7eb', transition: 'background .1s' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {creatorInitials(conv.creators)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.creators?.full_name ?? conv.creators?.username ?? 'Creator'}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{conv.last_msg_at ? fmtTime(conv.last_msg_at) : fmtTime(conv.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chat panel */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '11px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {creatorInitials(selected.creators)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selected.creators?.full_name ?? selected.creators?.username ?? 'Creator'}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>@{selected.creators?.username ?? '—'}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingM ? (
                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>No messages yet — send a reply below</div>
              ) : messages.map(msg => {
                const isMe = msg.sender_role === 'brand'
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: isMe ? '#E6F1FB' : '#EEEDFE', color: isMe ? '#185FA5' : '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                      {isMe ? 'B' : creatorInitials(selected.creators)}
                    </div>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ padding: '9px 13px', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: isMe ? '#185FA5' : '#f3f4f6', color: isMe ? '#fff' : '#111827', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {msg.body}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{fmtTime(msg.created_at)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div style={{ padding: '10px 14px', borderTop: '0.5px solid #e5e7eb', display: 'flex', gap: 8, flexShrink: 0 }}>
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                placeholder="Type a message… (Enter to send)" rows={2}
                style={{ flex: 1, resize: 'none', fontSize: 12.5, padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#111827', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
              <button onClick={sendReply} disabled={sending || !reply.trim()}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: reply.trim() ? '#185FA5' : '#e5e7eb', color: reply.trim() ? '#fff' : '#9ca3af', fontWeight: 600, fontSize: 12, cursor: reply.trim() ? 'pointer' : 'not-allowed', alignSelf: 'flex-end', flexShrink: 0 }}>
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Select a conversation</div>
        )}
      </div>
    </div>
  )
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotifBell({ userId, initialCount }: { userId: string; initialCount: number }) {
  const supabase = createClient()
  const router   = useRouter()
  const [open,    setOpen]    = useState(false)
  const [notifs,  setNotifs]  = useState<Notification[]>([])
  const [count,   setCount]   = useState(initialCount)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Realtime: new notification arrives → update count + prepend to list if panel is open
  useEffect(() => {
    const ch = supabase
      .channel(`notif_brand_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setCount(c => c + 1)
          setNotifs(prev => prev.length > 0 ? [payload.new as Notification, ...prev] : prev)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  async function openPanel() {
    if (!open) {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      setNotifs((data ?? []) as Notification[])
    }
    setOpen(o => !o)
  }

  async function markRead(id: string, link: string | null | undefined) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setCount(prev => Math.max(0, prev - 1))
    setOpen(false)
    if (link) router.push(link)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setCount(0)
  }

  const NOTIF_ICONS: Record<string, string> = { offer: 'ti-cash', bid: 'ti-inbox', message: 'ti-message', status_change: 'ti-refresh', new_application: 'ti-inbox', deliverable_submitted: 'ti-video' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={openPanel} style={{ position: 'relative', background: 'none', border: '0.5px solid #e5e7eb', borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
        <i className="ti ti-bell" style={{ fontSize: 15 }} />
        {count > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 36, right: 0, width: 320, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.1)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Notifications</span>
            {count > 0 && <span onClick={markAllRead} style={{ fontSize: 11, color: '#185FA5', cursor: 'pointer' }}>Mark all read</span>}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>No notifications</div>
            ) : notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n.id, n.data?.link)}
                style={{ padding: '10px 14px', borderBottom: '0.5px solid #f3f4f6', cursor: n.data?.link ? 'pointer' : 'default', background: n.is_read ? '#fff' : '#F0F7FF', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <i className={`ti ${NOTIF_ICONS[n.type] ?? 'ti-bell'}`} style={{ fontSize: 14, color: '#185FA5', marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: n.is_read ? 400 : 600, color: '#111827', marginBottom: 2 }}>{n.data?.title ?? n.type}</div>
                  {n.data?.body && <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.data.body}</div>}
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}</div>
                </div>
                {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#185FA5', flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Campaigns View ───────────────────────────────────────────────────────────
function CampaignsView({ campaigns, applications, brandId }: { campaigns: Campaign[]; applications: Application[]; brandId: string }) {
  const supabase = createClient()
  const [liveC, setLiveC] = useState<Campaign[]>(campaigns)
  const [toggling, setToggling] = useState<string | null>(null)

  async function toggleStatus(c: Campaign) {
    const next = (c.status === 'active' || c.status === 'open') ? 'paused' : 'open'
    setToggling(c.id)
    await supabase.from('campaigns').update({ status: next }).eq('id', c.id)
    setLiveC(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x))
    setToggling(null)
  }

  const active  = liveC.filter(c => c.status === 'active' || c.status === 'open').length
  const paused  = liveC.filter(c => c.status === 'paused').length
  const totalB  = liveC.reduce((s, c) => s + (c.budget_total ?? 0), 0)
  const totalApps = applications.length

  return (
    <div className="bd-body">
      <div className="bd-stat-row">
        <div className="bd-stat"><div className="bd-stat-val">{liveC.length}</div><div className="bd-stat-lbl">Total campaigns</div></div>
        <div className="bd-stat"><div className="bd-stat-val" style={{ color: '#3B6D11' }}>{active}</div><div className="bd-stat-lbl">Active</div><div className="bd-stat-sub" style={{ color: '#854F0B' }}>{paused} paused</div></div>
        <div className="bd-stat"><div className="bd-stat-val">{totalB ? fmt(totalB) : '—'}</div><div className="bd-stat-lbl">Total budget</div></div>
        <div className="bd-stat"><div className="bd-stat-val">{totalApps}</div><div className="bd-stat-lbl">Total applications</div></div>
      </div>

      <div className="bd-card">
        <div className="bd-card-hd">
          <span className="bd-card-title">My campaigns</span>
          <a href="/dashboard/brand/campaigns/new"><Btn variant="primary"><i className="ti ti-plus" />New campaign</Btn></a>
        </div>
        {liveC.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <i className="ti ti-speakerphone" style={{ fontSize: 38, color: '#d1d5db', display: 'block', marginBottom: 14 }} />
            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 8 }}>No campaigns yet</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Create your first campaign to start finding creators.</div>
            <a href="/dashboard/brand/campaigns/new"><Btn variant="primary"><i className="ti ti-plus" />Create campaign</Btn></a>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bd-tbl" style={{ minWidth: 760 }}>
              <thead>
                <tr><th>Campaign</th><th>Platforms</th><th>Budget</th><th>Payout</th><th>Applications</th><th>Deadline</th><th>Slots</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {liveC.map(c => {
                  const appCount  = applications.filter(a => a.campaign_id === c.id).length
                  const newApps   = applications.filter(a => a.campaign_id === c.id && a.status === 'applied').length
                  const accepted  = applications.filter(a => a.campaign_id === c.id && a.status === 'accepted').length
                  const s = STATUS[c.status ?? 'draft'] ?? { label: c.status ?? 'Draft', cls: 'b-gray' }
                  const isActive  = c.status === 'active' || c.status === 'open'
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12.5, color: '#111827' }}>{c.title}</div>
                        {accepted > 0 && <div style={{ fontSize: 10, color: '#3B6D11', marginTop: 2 }}>{accepted} accepted</div>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{(c.platforms ?? []).map(p => <PlatBadge key={p} p={p} />)}</td>
                      <td style={{ fontSize: 12 }}>{c.budget_total ? fmt(c.budget_total) : '—'}</td>
                      <td style={{ fontSize: 12 }}>{c.payout_amount ? fmt(c.payout_amount) : '—'}</td>
                      <td>
                        <div style={{ fontSize: 12 }}>{appCount}</div>
                        {newApps > 0 && <span className="badge b-warn" style={{ fontSize: 10 }}>{newApps} new</span>}
                      </td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>{c.deadline ? fmtDate(c.deadline) : '—'}</td>
                      <td style={{ fontSize: 12 }}>{c.slots ?? '—'}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <a href={`/dashboard/brand/campaigns/${c.id}/edit`}><Btn style={{ fontSize: 11, padding: '3px 8px' }}><i className="ti ti-edit" /></Btn></a>
                          <Btn
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            variant={isActive ? undefined : 'green'}
                            onClick={() => toggleStatus(c)}
                          >
                            {toggling === c.id ? '…' : isActive ? <><i className="ti ti-player-pause" />Pause</> : <><i className="ti ti-player-play" />Activate</>}
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NoBrandSetup — shown when brand record is missing ────────────────────────
function NoBrandSetup({ user }: { user: { id: string; email: string } }) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) { setError('Company name is required'); return }
    if (!contactName.trim()) { setError('Your name is required'); return }
    if (!companySize)        { setError('Select company size'); return }
    if (!budgetRange)        { setError('Select budget range'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/onboarding/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim(), contactName: contactName.trim(), companySize, budgetRange }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Setup failed'); setLoading(false); return }
      window.location.reload()
    } catch {
      setError('Network error — try again'); setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.08)', padding: 40, width: '100%', maxWidth: 420 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Finish setting up your brand</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>We couldn't complete your brand profile during signup. Fill this in once and you're all set.</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Company name" value={companyName} onChange={e => setCompanyName(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
          <input placeholder="Your name" value={contactName} onChange={e => setContactName(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
          <select value={companySize} onChange={e => setCompanySize(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: companySize ? '#111' : '#9ca3af', outline: 'none' }}>
            <option value="">Company size</option>
            {['Solo (1)','Small (1–10)','Medium (11–50)','Large (51–200)','Enterprise (200+)'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={budgetRange} onChange={e => setBudgetRange(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: budgetRange ? '#111' : '#9ca3af', outline: 'none' }}>
            <option value="">Monthly influencer budget</option>
            {['Under $500','$500–$2K','$2K–$10K','$10K–$50K','$50K+'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1 }}>
            {loading ? 'Setting up…' : 'Complete setup'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrandDashboard({ user, brand, profile, campaigns, applications, deals, conversations, teamMembers, unreadNotifs, initials }: Props) {
  const router  = useRouter()
  const [tab,       setTab]      = useState<Tab>('overview')
  const [apps,      setApps]     = useState(applications)
  const [liveDeals, setLiveDeals] = useState<Deal[]>(deals)
  const [deptFocus, setDeptFocus] = useState<string | undefined>()

  const supabase = createClient()

  const updateApp = useCallback(async (id: string, status: string, creatorUserId: string | null) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    await supabase.from('campaign_applications').update({ status }).eq('id', id)
    // Notify the creator
    if (creatorUserId) {
      const statusLabels: Record<string, string> = { review: 'in review', accepted: 'accepted', rejected: 'rejected', success: 'marked as success' }
      const label = statusLabels[status]
      if (label) {
        await notify(supabase, creatorUserId, {
          type:  'status_change',
          title: `Your application has been ${label}`,
          body:  `The brand updated your application status to "${label}"`,
          link:  '/dashboard/creator/profile',
        })
      }
    }
  }, [supabase])

  const newCount   = apps.filter(a => a.status === 'applied').length
  const [notifCount, setNotifCount] = useState(unreadNotifs)
  const brandName = brand?.name ?? 'Your Brand'

  async function signOut() { await supabase.auth.signOut(); router.push('/') }

  const NAV: { icon: string; label: string; tab?: Tab; badge?: number; action?: () => void }[] = [
    { icon: 'ti-layout-dashboard',    label: 'Dashboard',        tab: 'overview' },
    { icon: 'ti-speakerphone',        label: 'My Campaigns',     tab: 'campaigns' },
    { icon: 'ti-handshake',            label: 'Deals',            tab: 'tracker', badge: liveDeals.filter(d => d.status === 'active').length || undefined },
    { icon: 'ti-inbox',               label: 'Applications',     tab: 'apps',     badge: newCount },
    { icon: 'ti-message-dots',        label: 'Messages',         tab: 'messages', badge: conversations.length },
    { icon: 'ti-packages',            label: 'Promo toolkit',    tab: 'media' },
    { icon: 'ti-layout-columns',      label: 'Departments',      tab: 'dept' },
    { icon: 'ti-video',               label: 'Content received', tab: 'content' },
    { icon: 'ti-cash',                label: 'Payments',         tab: 'payments' },
    { icon: 'ti-checklist',           label: 'Task manager',     tab: 'tasks' },
    { icon: 'ti-users',               label: 'Team members',     tab: 'team' },
    { icon: 'ti-chart-bar',           label: 'Reports',          tab: 'reports' },
    { icon: 'ti-settings',            label: 'Settings',         tab: 'settings' },
    { icon: 'ti-search',              label: 'Find creators',    action: () => router.push('/dashboard/brand/discover') },
    { icon: 'ti-logout',              label: 'Sign out',         action: signOut },
  ]

  const SECTIONS = [
    { title: 'Overview',  items: NAV.slice(0, 5) },
    { title: 'Campaigns', items: NAV.slice(5, 9) },
    { title: 'Team',      items: NAV.slice(9, 12) },
    { title: 'Account',   items: NAV.slice(12) },
  ]

  // No brand record yet — show inline setup (happens when auth callback failed on first signup)
  if (!brand) return <NoBrandSetup user={user} />

  return (
    <>
      <style>{CSS}</style>
      <div className="bd-shell">
        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="bd-side">
          {/* Platform logo → home */}
          <a href="/dashboard/brand/discover" className="bd-platform-logo">
            <div className="bd-platform-logo-icon">A</div>
            <span className="bd-platform-logo-name">ADMIS</span>
          </a>
          <div className="bd-brand-head">
            <div className="bd-brand-logo">{initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{brandName}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Brand account</div>
            </div>
          </div>

          {SECTIONS.map(sec => (
            <div key={sec.title}>
              <div className="bd-nav-section">{sec.title}</div>
              {sec.items.map(n => (
                <div
                  key={n.label}
                  className={`bd-nav-item${n.tab && tab === n.tab ? ' active' : ''}${n.label === 'Sign out' ? '' : ''}`}
                  style={n.label === 'Sign out' ? { color: '#A32D2D', marginTop: 4 } : {}}
                  onClick={() => n.tab ? setTab(n.tab) : n.action?.()}
                >
                  <i className={`ti ${n.icon}`} />
                  {n.label}
                  {n.badge ? <span className="bd-nav-badge">{n.badge}</span> : null}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* ── Main ────────────────────────────────────── */}
        <div className="bd-main">
          <div className="bd-topbar">
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{TAB_TITLES[tab]}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href="/dashboard/brand/campaigns/new">
                <Btn variant="primary"><i className="ti ti-plus" style={{ fontSize: 13 }} />New campaign</Btn>
              </a>
              <NotifBell userId={user.id} initialCount={notifCount} />
              <div
                onClick={() => setTab('settings')}
                title="Settings"
                style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#3C3489', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
              >{initials}</div>
            </div>
          </div>

          {tab === 'overview'   && <OverviewView campaigns={campaigns} applications={apps} setTab={setTab} />}
          {tab === 'campaigns'  && <CampaignsView campaigns={campaigns} applications={apps} brandId={brand?.id ?? ''} />}
          {tab === 'tracker'    && <TrackerView deals={liveDeals} teamMembers={teamMembers} brandId={brand?.id ?? ''} userId={user.id}
            onGoTab={(t, dept) => { setTab(t as Tab); if (dept) setDeptFocus(dept) }} />}
          {tab === 'apps'       && <ApplicationsView
            applications={apps}
            conversations={conversations}
            deals={liveDeals}
            teamMembers={teamMembers}
            brandId={brand?.id ?? ''}
            onUpdate={updateApp}
            onDealCreated={deal => setLiveDeals(d => [...d, deal])}
            onGoTab={t => setTab(t as Tab)}
          />}
          {tab === 'messages'   && <MessagesView conversations={conversations} userId={user.id} brandName={brandName} />}
          {tab === 'media'      && <PromoView brand={brand} />}
          {tab === 'dept'       && <DeptView brandId={brand?.id ?? ''} teamMembers={teamMembers} deals={liveDeals} focusDept={deptFocus} />}
          {tab === 'content'    && <ContentView brandId={brand?.id ?? ''} />}
          {tab === 'payments'   && <PaymentsView applications={apps} onUpdate={updateApp} />}
          {tab === 'tasks'      && <TasksView brandId={brand?.id ?? ''} teamMembers={teamMembers} userId={user.id} deals={liveDeals} />}
          {tab === 'team'       && <TeamView teamMembers={teamMembers} brandId={brand?.id ?? ''} ownerEmail={user.email} brandName={brandName} />}
          {tab === 'reports'    && <ReportsView campaigns={campaigns} applications={apps} />}
          {tab === 'settings'   && <SettingsView brand={brand} user={user} />}
        </div>
      </div>
      <ChatbotPopup />
    </>
  )
}
