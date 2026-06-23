'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Deal {
  id: string
  creator_id: string
  campaign_id: string | null
  price: number | null
  final_price: number | null
  status: string
  payment_details?: { method?: string; name?: string; account?: string } | null
  created_at: string
  campaigns?: { id: string; title: string | null } | null
  creators?: { id: string; full_name: string | null; username: string | null; platform: string | null; price_per_post?: number | null } | null
}

interface ChannelAnalysis {
  id: string
  deal_id: string
  channel_name: string | null
  channel_url: string | null
  channel_id: string | null
  platform: string | null
  country: string | null
  subscribers: number | null
  avg_views_l10: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_views_90d: number | null
  last_upload_at: string | null
  days_since_upload: number | null
  videos_90d: number | null
  shorts_pct: number | null
  est_monthly_views: number | null
  est_value_usd: number | null
  engagement_pct: number | null
  view_sub_pct: number | null
  uploads_per_month: number | null
  lead_score: number | null
  lead_tier: string | null
  is_suspicious: boolean | null
  suspicious_reasons: string[] | null
  creator_price_usd: number | null
  cpm2_value: number | null
  cpm3_value: number | null
  counter_price_usd: number | null
  final_decision: string | null
  fetched_at: string | null
  created_at: string
}

interface AnalystReport {
  id: string
  deal_id: string
  channel_analysis_id: string | null
  channel_name: string | null
  channel_url: string | null
  platform: string | null
  geo: string | null
  deliveries: string[] | null
  creator_price: number | null
  creator_contact: string | null
  score: number | null
  approved: boolean | null
  counter_price: number | null
  notes: string | null
  created_at: string
}

interface HistoryRow {
  analysis: ChannelAnalysis
  report: AnalystReport | null
  deal: Deal | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function fmtUsd(n: number | null | undefined) {
  if (n == null) return '—'
  return '$' + n.toLocaleString()
}

function tierColor(tier: string | null) {
  switch (tier) {
    case 'A': return { bg: '#dcfce7', color: '#15803d', label: 'A — Hot' }
    case 'B': return { bg: '#fef9c3', color: '#854d0e', label: 'B — Warm' }
    case 'C': return { bg: '#ffedd5', color: '#9a3412', label: 'C — Cool' }
    case 'D': return { bg: '#f3f4f6', color: '#374151', label: 'D — Cold' }
    default:  return { bg: '#f3f4f6', color: '#6b7280', label: '—' }
  }
}

function scoreBar(score: number | null) {
  const s = score ?? 0
  const color = s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : s >= 40 ? '#ea580c' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${s}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28 }}>{s}</span>
    </div>
  )
}

// ─── Channel Decision Table (the big metrics table) ───────────────────────────

function ChannelIntelTable({ analysis, deal }: { analysis: ChannelAnalysis; deal: Deal }) {
  const tier = tierColor(analysis.lead_tier)
  const decisionColor = {
    approve: '#16a34a', reject: '#dc2626', counter: '#d97706', pending: '#6b7280',
  }[analysis.final_decision ?? 'pending'] ?? '#6b7280'

  const rows: [string, React.ReactNode][] = [
    ['Channel Name',         analysis.channel_name ?? deal.creators?.full_name ?? '—'],
    ['Channel URL',          analysis.channel_url
      ? <a href={analysis.channel_url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: 12 }}>{analysis.channel_url}</a>
      : '—'],
    ['Country',              analysis.country ?? '—'],
    ['Platform',             analysis.platform?.toUpperCase() ?? '—'],
    ['Subscribers',          fmt(analysis.subscribers)],
    ['Avg Views (L10)',      fmt(analysis.avg_views_l10)],
    ['Avg Likes',            fmt(analysis.avg_likes)],
    ['Avg Comments',         fmt(analysis.avg_comments)],
    ['Avg Views (90d)',      fmt(analysis.avg_views_90d)],
    ['Last Upload',          analysis.last_upload_at ? new Date(analysis.last_upload_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'],
    ['Days Since',           analysis.days_since_upload != null ? `${analysis.days_since_upload}d` : '—'],
    ['Videos 90d',           analysis.videos_90d ?? '—'],
    ['Shorts %',             analysis.shorts_pct != null ? `${analysis.shorts_pct.toFixed(1)}%` : '—'],
    ['Est. Monthly Views',   fmt(analysis.est_monthly_views)],
    ['Est. Value ($)',        fmtUsd(analysis.est_value_usd)],
    ['Engagement %',         analysis.engagement_pct != null ? `${analysis.engagement_pct.toFixed(2)}%` : '—'],
    ['View/Sub %',           analysis.view_sub_pct != null ? `${analysis.view_sub_pct.toFixed(2)}%` : '—'],
    ['Uploads/Mo',           analysis.uploads_per_month != null ? analysis.uploads_per_month.toFixed(1) : '—'],
    ['Lead Score',           scoreBar(analysis.lead_score)],
    ['Lead Tier',            <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: tier.bg, color: tier.color }}>{tier.label}</span>],
    ['Suspicious?',          analysis.is_suspicious
      ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ Yes</span>
      : <span style={{ color: '#16a34a' }}>✓ No</span>],
    ['Reasons',              analysis.suspicious_reasons?.length
      ? <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#dc2626' }}>{analysis.suspicious_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
      : <span style={{ color: '#9ca3af', fontSize: 11 }}>None</span>],
    ['Creator Price ($)',    fmtUsd(analysis.creator_price_usd)],
    ['CPM=$2 ($)',           fmtUsd(analysis.cpm2_value)],
    ['CPM=$3 ($)',           fmtUsd(analysis.cpm3_value)],
    ['Counter Price ($)',    fmtUsd(analysis.counter_price_usd)],
    ['Final Decision',       <span style={{ fontWeight: 700, textTransform: 'capitalize', color: decisionColor }}>{analysis.final_decision ?? 'Pending'}</span>],
    ['Fetched At',           analysis.fetched_at ? new Date(analysis.fetched_at).toLocaleString('en-IN') : '—'],
    ['Created At',           new Date(analysis.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })],
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e5e7eb', width: '35%' }}>Parameter</th>
            <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #e5e7eb' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, val], i) => (
            <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
              <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{key}</td>
              <td style={{ padding: '8px 14px', fontSize: 12, color: '#111827', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Analyst Report Form ──────────────────────────────────────────────────────

const DELIVERY_OPTIONS = ['Video', 'Short', 'Reel', 'Story', 'Post', 'Live', 'Community Post', 'Other']

function AnalystReportForm({ deal, analysis, existing, onSaved }: {
  deal: Deal
  analysis: ChannelAnalysis | null
  existing: AnalystReport | null
  onSaved: (r: AnalystReport) => void
}) {
  const [channelName,    setChannelName]    = useState(existing?.channel_name ?? analysis?.channel_name ?? deal.creators?.full_name ?? '')
  const [channelUrl,     setChannelUrl]     = useState(existing?.channel_url  ?? analysis?.channel_url  ?? '')
  const [platform,       setPlatform]       = useState(existing?.platform     ?? analysis?.platform     ?? deal.creators?.platform ?? 'youtube')
  const [geo,            setGeo]            = useState(existing?.geo          ?? analysis?.country      ?? '')
  const [deliveries,     setDeliveries]     = useState<string[]>(existing?.deliveries ?? [])
  const [creatorPrice,   setCreatorPrice]   = useState(String(existing?.creator_price ?? analysis?.creator_price_usd ?? deal.final_price ?? deal.price ?? ''))
  const [creatorContact, setCreatorContact] = useState(existing?.creator_contact ?? '')
  const [score,          setScore]          = useState(String(existing?.score ?? analysis?.lead_score ?? ''))
  const [approved,       setApproved]       = useState<boolean | null>(existing?.approved ?? null)
  const [counterPrice,   setCounterPrice]   = useState(String(existing?.counter_price ?? analysis?.counter_price_usd ?? ''))
  const [notes,          setNotes]          = useState(existing?.notes ?? '')
  const [saving,         setSaving]         = useState(false)
  const [err,            setErr]            = useState<string | null>(null)
  const [ok,             setOk]             = useState(false)

  function toggleDelivery(d: string) {
    setDeliveries(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function save() {
    if (approved === null) { setErr('Please select Approved or Rejected'); return }
    setSaving(true); setErr(null); setOk(false)
    try {
      const res = await fetch('/api/analyst/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id:             deal.id,
          channel_analysis_id: analysis?.id ?? null,
          creator_id:          deal.creator_id,
          channel_name:        channelName,
          channel_url:         channelUrl,
          platform,
          geo,
          deliveries,
          creator_price:       parseFloat(creatorPrice) || null,
          creator_contact:     creatorContact || null,
          score:               parseFloat(score) || null,
          approved,
          counter_price:       parseFloat(counterPrice) || null,
          notes:               notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOk(true)
      onSaved(data.report)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to save report')
    }
    setSaving(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #e5e7eb',
    borderRadius: 8, background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Channel / Creator Name</label>
          <input style={inp} value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="e.g. @techCreator" />
        </div>
        <div>
          <label style={lbl}>Channel URL / Profile Link</label>
          <input style={inp} value={channelUrl} onChange={e => setChannelUrl(e.target.value)} placeholder="https://youtube.com/@..." />
        </div>
        <div>
          <label style={lbl}>Platform</label>
          <select style={inp} value={platform} onChange={e => setPlatform(e.target.value)}>
            {['youtube', 'instagram', 'tiktok', 'facebook', 'twitter', 'other'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Geo / Country</label>
          <input style={inp} value={geo} onChange={e => setGeo(e.target.value)} placeholder="e.g. India, Nepal" />
        </div>
        <div>
          <label style={lbl}>Creator Price ($)</label>
          <input style={inp} type="number" value={creatorPrice} onChange={e => setCreatorPrice(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label style={lbl}>Creator Contact (Email / Phone)</label>
          <input style={inp} value={creatorContact} onChange={e => setCreatorContact(e.target.value)} placeholder="creator@email.com" />
        </div>
      </div>

      {/* Deliverables */}
      <div>
        <label style={lbl}>Deliverables</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DELIVERY_OPTIONS.map(d => (
            <button key={d} onClick={() => toggleDelivery(d)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                borderColor:  deliveries.includes(d) ? '#6366f1' : '#e5e7eb',
                background:   deliveries.includes(d) ? '#ede9fe' : '#f9fafb',
                color:        deliveries.includes(d) ? '#4f46e5' : '#6b7280',
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Score + decision */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Score (0–100)</label>
          <input style={inp} type="number" min={0} max={100} value={score} onChange={e => setScore(e.target.value)}
            placeholder={analysis?.lead_score != null ? `Auto: ${analysis.lead_score}` : '—'} />
          {analysis?.lead_score != null && (
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
              Auto score: {analysis.lead_score} ({analysis.lead_tier})
            </div>
          )}
        </div>
        <div>
          <label style={lbl}>Counter Price ($)</label>
          <input style={inp} type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)}
            placeholder={analysis?.counter_price_usd != null ? `Suggested: $${analysis.counter_price_usd}` : '—'} />
        </div>
        <div>
          <label style={lbl}>Decision</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => setApproved(true)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                borderColor: approved === true ? '#16a34a' : '#e5e7eb',
                background:  approved === true ? '#dcfce7' : '#f9fafb',
                color:       approved === true ? '#15803d' : '#6b7280',
              }}>✓ Approve</button>
            <button onClick={() => setApproved(false)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                borderColor: approved === false ? '#dc2626' : '#e5e7eb',
                background:  approved === false ? '#fee2e2' : '#f9fafb',
                color:       approved === false ? '#dc2626' : '#6b7280',
              }}>✗ Reject</button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={lbl}>Notes / Reason {approved === false && <span style={{ color: '#dc2626' }}>*</span>}</label>
        <textarea
          style={{ ...inp, height: 80, resize: 'vertical' }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={approved === false ? 'Reason for rejection (required)' : 'Analyst remarks, observations…'}
        />
      </div>

      {err && <div style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: 6 }}>{err}</div>}
      {ok  && <div style={{ fontSize: 12, color: '#15803d', background: '#dcfce7', padding: '8px 12px', borderRadius: 6 }}>✓ Report saved successfully</div>}

      <button onClick={save} disabled={saving}
        style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: saving ? '#e5e7eb' : '#4f46e5', color: saving ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13 }}>
        {saving ? 'Saving…' : '💾 Save Analyst Report'}
      </button>
    </div>
  )
}

// ─── Derive best YouTube URL from a deal ─────────────────────────────────────

function guessChannelUrl(deal: Deal): string {
  const c = deal.creators
  if (!c) return ''
  // If profile_url exists and looks like YouTube, use it
  const purl = (c as any).profile_url as string | null
  if (purl && purl.includes('youtube')) return purl
  // Build from username for YouTube creators
  if (c.platform === 'youtube' && c.username) {
    const u = c.username.replace('@', '')
    return `https://youtube.com/@${u}`
  }
  return purl ?? ''
}

// ─── History List ─────────────────────────────────────────────────────────────

function HistoryList({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>No analyses yet</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Run "Fetch & Score" on a deal to see results here</div>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1.5px solid #e5e7eb' }}>
            {['Channel', 'Deal / Campaign', 'Score', 'Tier', 'Subs', 'Avg Views', 'Engagement', 'Status', 'Fetched'].map(h => (
              <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const { analysis: a, report: r, deal } = row
            const tier = tierColor(a.lead_tier)
            const approved = r?.approved
            const statusLabel = approved == null ? 'Pending' : approved ? 'Approved' : 'Rejected'
            const statusStyle: React.CSSProperties = {
              display: 'inline-block', padding: '2px 9px', borderRadius: 12, fontSize: 10, fontWeight: 700,
              background: approved == null ? '#f3f4f6' : approved ? '#dcfce7' : '#fee2e2',
              color: approved == null ? '#6b7280' : approved ? '#15803d' : '#dc2626',
            }
            return (
              <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: 12 }}>{a.channel_name ?? '—'}</div>
                  {a.channel_url && (
                    <a href={a.channel_url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: '#6366f1', display: 'block', marginTop: 2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.channel_url}
                    </a>
                  )}
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{a.country ?? '—'} · {a.platform?.toUpperCase() ?? '—'}</div>
                </td>
                <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{deal?.creators?.full_name ?? deal?.creators?.username ?? '—'}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{deal?.campaigns?.title ?? '—'}</div>
                  {deal && (
                    <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2, fontWeight: 700 }}>
                      ${deal.final_price ?? deal.price ?? '—'}
                    </div>
                  )}
                </td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle', minWidth: 110 }}>
                  {scoreBar(r?.score ?? a.lead_score)}
                </td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: tier.bg, color: tier.color }}>
                    {tier.label}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 12, color: '#374151' }}>{fmt(a.subscribers)}</td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 12, color: '#374151' }}>{fmt(a.avg_views_l10)}</td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 12, color: '#374151' }}>
                  {a.engagement_pct != null ? `${a.engagement_pct.toFixed(2)}%` : '—'}
                </td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                  <span style={statusStyle}>{approved == null ? '⏳ ' : approved ? '✓ ' : '✗ '}{statusLabel}</span>
                  {r?.counter_price != null && (
                    <div style={{ fontSize: 10, color: '#d97706', marginTop: 4, fontWeight: 600 }}>
                      Counter: ${r.counter_price}
                    </div>
                  )}
                  {r?.notes && (
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>
                      {r.notes}
                    </div>
                  )}
                </td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle', fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                  {a.fetched_at ? new Date(a.fetched_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main AnalystView ─────────────────────────────────────────────────────────

export default function AnalystView({ brandId, deals, analystDealIds }: {
  brandId: string
  deals: Deal[]
  analystDealIds?: Set<string>
}) {
  const supabase         = useMemo(() => createClient(), [])
  const [viewMode,       setViewMode]       = useState<'analyse' | 'history'>('analyse')
  const [history,        setHistory]        = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedDeal,   setSelectedDeal]   = useState<Deal | null>(null)
  const [analysis,       setAnalysis]       = useState<ChannelAnalysis | null>(null)
  const [report,         setReport]         = useState<AnalystReport | null>(null)
  const [channelInput,   setChannelInput]   = useState('')
  const [creatorPrice,   setCreatorPriceIn] = useState('')
  const [fetching,       setFetching]       = useState(false)
  const [fetchErr,       setFetchErr]       = useState<string | null>(null)
  const [activeTab,      setActiveTab]      = useState<'intel' | 'report'>('intel')
  const [analystReports, setAnalystReports] = useState<Map<string, AnalystReport>>(new Map())

  // Load existing analysis + report when deal selected; pre-fill URL from creator
  useEffect(() => {
    if (!selectedDeal) return
    setAnalysis(null); setReport(null); setFetchErr(null)
    // Pre-fill URL from creator data immediately
    const guessed = guessChannelUrl(selectedDeal)
    const price   = String(selectedDeal.final_price ?? selectedDeal.price ?? '')
    setChannelInput(guessed)
    setCreatorPriceIn(price)

    Promise.all([
      supabase.from('channel_analysis').select('*').eq('deal_id', selectedDeal.id).maybeSingle(),
      supabase.from('analyst_reports').select('*').eq('deal_id', selectedDeal.id).maybeSingle(),
    ]).then(([{ data: a }, { data: r }]) => {
      setAnalysis(a ?? null)
      setReport(r ?? null)
      // Override pre-fill with saved values if they exist
      if (a?.channel_url) setChannelInput(a.channel_url)
      if (a?.creator_price_usd) setCreatorPriceIn(String(a.creator_price_usd))
      if (a) setActiveTab('intel')
      else    setActiveTab('report')
    })
  }, [selectedDeal?.id])

  // Load all analyst reports for the deals list (to show score badges)
  useEffect(() => {
    if (!brandId || deals.length === 0) return
    supabase.from('analyst_reports').select('*').eq('brand_id', brandId).then(({ data }) => {
      const map = new Map<string, AnalystReport>()
      ;(data ?? []).forEach(r => map.set(r.deal_id, r))
      setAnalystReports(map)
    })
  }, [brandId, deals.length])

  // Load history whenever the History tab is opened
  useEffect(() => {
    if (viewMode !== 'history' || !brandId) return
    setHistoryLoading(true)
    Promise.all([
      supabase.from('channel_analysis').select('*').eq('brand_id', brandId).order('fetched_at', { ascending: false }),
      supabase.from('analyst_reports').select('*').eq('brand_id', brandId),
    ]).then(([{ data: analyses }, { data: reports }]) => {
      const reportMap = new Map<string, AnalystReport>()
      ;(reports ?? []).forEach(r => reportMap.set(r.deal_id, r))
      const dealMap = new Map<string, Deal>()
      deals.forEach(d => dealMap.set(d.id, d))
      const rows: HistoryRow[] = (analyses ?? []).map(a => ({
        analysis: a as ChannelAnalysis,
        report: reportMap.get(a.deal_id) ?? null,
        deal: dealMap.get(a.deal_id) ?? null,
      }))
      setHistory(rows)
      setHistoryLoading(false)
    })
  }, [viewMode, brandId])

  async function runFetch() {
    if (!selectedDeal || !channelInput.trim()) { setFetchErr('Paste the YouTube channel URL'); return }
    setFetching(true); setFetchErr(null); setAnalysis(null)
    try {
      const res = await fetch('/api/analyst/fetch-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id:       selectedDeal.id,
          channel_url:   channelInput.trim(),
          creator_price: parseFloat(creatorPrice) || (selectedDeal.final_price ?? selectedDeal.price ?? 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalysis(data.analysis)
      setActiveTab('intel')
    } catch (e: unknown) {
      setFetchErr(e instanceof Error ? e.message : 'Fetch failed')
    }
    setFetching(false)
  }

  const tierCfg = (tier: string | null) => tierColor(tier)

  const tabBtn = (mode: 'analyse' | 'history', label: string) => (
    <button onClick={() => setViewMode(mode)} style={{
      padding: '7px 18px', borderRadius: 8, border: '1.5px solid',
      borderColor: viewMode === mode ? '#4f46e5' : '#e5e7eb',
      background: viewMode === mode ? '#ede9fe' : '#f9fafb',
      color: viewMode === mode ? '#4f46e5' : '#6b7280',
      fontWeight: 700, fontSize: 13, cursor: 'pointer',
    }}>{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── View toggle ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {tabBtn('analyse', '🔍 Analyse Deals')}
        {tabBtn('history', `📋 History${history.length > 0 ? ` (${history.length})` : ''}`)}
      </div>

      {/* ── History ─────────────────────────────────── */}
      {viewMode === 'history' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {historyLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
          ) : (
            <HistoryList rows={history} />
          )}
        </div>
      )}

      {/* ── Analyse ─────────────────────────────────── */}
      {viewMode === 'analyse' && (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minHeight: 500 }}>

      {/* ── Left: Deals list ─────────────────────────────────────── */}
      <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
          All Deals ({deals.length})
        </div>
        {deals.length === 0 && (
          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
            No deals found
          </div>
        )}
        {deals.map(deal => {
          const r        = analystReports.get(deal.id)
          const sel      = selectedDeal?.id === deal.id
          const queued   = analystDealIds?.has(deal.id)
          const hasScore = r != null
          return (
            <div key={deal.id} onClick={() => setSelectedDeal(deal)}
              style={{
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid',
                borderColor: sel ? '#0f766e' : hasScore ? (r!.approved ? '#16a34a' : '#dc2626') : queued ? '#99f6e4' : '#e5e7eb',
                background:  sel ? '#ccfbf1' : '#fff',
                transition:  'border-color .15s, background .15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>
                  {deal.creators?.full_name ?? deal.creators?.username ?? 'Creator'}
                </div>
                {queued && !hasScore && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, background: '#ccfbf1', color: '#0f766e' }}>QUEUED</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                {deal.campaigns?.title ?? 'Campaign'} · <span style={{ textTransform: 'capitalize' }}>{deal.creators?.platform ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
                  {(deal.final_price ?? deal.price) ? `$${deal.final_price ?? deal.price}` : '—'}
                </span>
                {hasScore ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8,
                    background: r!.approved ? '#dcfce7' : '#fee2e2',
                    color: r!.approved ? '#15803d' : '#dc2626',
                  }}>
                    {r!.approved ? `✓ ${r!.score ?? '—'}` : `✗ ${r!.score ?? '—'}`}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>Not analysed</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Right: Analysis panel ────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedDeal ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0' }}>
            <i className="ti ti-chart-bar" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Select a deal to analyse</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Fetch YouTube metrics, get auto-score, and submit analyst report</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Deal header */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                  {selectedDeal.creators?.full_name ?? selectedDeal.creators?.username ?? 'Creator'}
                  <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>@{selectedDeal.creators?.username}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  {selectedDeal.campaigns?.title ?? '—'} · {selectedDeal.creators?.platform ?? '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>
                  {selectedDeal.final_price ?? selectedDeal.price ? `$${selectedDeal.final_price ?? selectedDeal.price}` : '—'}
                </div>
                {analysis && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
                    <span style={{ ...tierCfg(analysis.lead_tier), padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                      Tier {analysis.lead_tier ?? '—'}
                    </span>
                    <span style={{ background: '#ede9fe', color: '#4f46e5', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                      Score {analysis.lead_score ?? '—'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fetch bar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>YouTube Channel URL</div>
                <input
                  value={channelInput}
                  onChange={e => setChannelInput(e.target.value)}
                  placeholder="https://youtube.com/@channelname  or  UC..."
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ width: 120 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Creator Price ($)</div>
                <input
                  type="number"
                  value={creatorPrice}
                  onChange={e => setCreatorPriceIn(e.target.value)}
                  placeholder={String(selectedDeal.final_price ?? selectedDeal.price ?? 0)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={runFetch} disabled={fetching}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: fetching ? '#e5e7eb' : '#4f46e5',
                  color: fetching ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: fetching ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', height: 38 }}>
                {fetching ? '⏳ Fetching…' : analysis ? '🔄 Re-fetch' : '🔍 Fetch & Score'}
              </button>
            </div>
            {fetchErr && (
              <div style={{ fontSize: 12, color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: 6 }}>{fetchErr}</div>
            )}

            {/* Sub-tabs */}
            {(analysis || report) && (
              <>
                <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                  {([
                    { key: 'intel',  label: '📊 Channel Intel',   show: !!analysis },
                    { key: 'report', label: '📋 Analyst Report',  show: true },
                  ] as const).filter(t => t.show).map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                      style={{ padding: '9px 18px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                        color: activeTab === t.key ? '#4f46e5' : '#6b7280',
                        borderBottom: activeTab === t.key ? '2px solid #4f46e5' : '2px solid transparent' }}>
                      {t.label}
                      {t.key === 'report' && report != null && (
                        <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 6,
                          background: report.approved ? '#dcfce7' : '#fee2e2',
                          color: report.approved ? '#15803d' : '#dc2626' }}>
                          {report.approved ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                  {activeTab === 'intel' && analysis && (
                    <ChannelIntelTable analysis={analysis} deal={selectedDeal} />
                  )}
                  {activeTab === 'report' && (
                    <div style={{ padding: 16 }}>
                      <AnalystReportForm
                        deal={selectedDeal}
                        analysis={analysis}
                        existing={report}
                        onSaved={r => {
                          setReport(r)
                          setAnalystReports(m => new Map(m).set(selectedDeal.id, r))
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {!analysis && !fetching && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0', fontSize: 12 }}>
                Paste the YouTube channel URL above and click <b>Fetch &amp; Score</b> to run analysis
              </div>
            )}
          </div>
        )}
      </div>
    </div>
      )}
    </div>
  )
}
