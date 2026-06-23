'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { T, fmtMoney, fmtDate, daysLeft, daysColor, DEAL_LABELS, DEAL_COLORS, STATUS_COLORS } from '@/lib/utils'

const BLUE = '#3b82f6'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string
  title: string | null
  description: string | null
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
  requirements: string | null
  target_audience: string | null
}

interface Handle {
  platform: string
  username: string
  followers: number | null
  is_primary: boolean
}

interface Application {
  id: string
  bid_amount: number | null
  status: string | null
  message: string | null
  created_at: string | null
  creator_id: string
  assigned_to: string | null
  creators: {
    id: string
    full_name: string | null
    username: string | null
    platform: string | null
    profile_url: string | null
    price_per_post: number | null
    user_id: string | null
    creator_social_handles: Handle[]
  } | null
}

interface TeamMember {
  id: string
  user_id: string
  role: string | null
  department: string | null
  profiles: { display_name: string | null } | null
}

interface Brand {
  id: string
  name: string | null
  logo_url: string | null
  is_verified: boolean | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAT_COLORS: Record<string, string> = {
  youtube: '#ff3b30', instagram: '#ec4899', tiktok: '#25e0d6', twitter: '#1d9bf0',
}

function fmtFollowers(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const APP_STATUS_COLORS: Record<string, string> = {
  applied:    '#f59e0b',
  pending:    '#f59e0b',   // fallback alias
  shortlisted:'#3b82f6',
  accepted:   '#10b981',
  rejected:   '#ef4444',
  withdrawn:  '#6b7280',
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? T.text }}>{value}</div>
    </div>
  )
}

// ─── Application row ──────────────────────────────────────────────────────────
function AppRow({
  app, onStatusChange, onMessage, onAssign, teamMembers,
}: {
  app: Application
  onStatusChange: (id: string, status: string) => void
  onMessage: (app: Application) => void
  onAssign: (appId: string, userId: string) => void
  teamMembers: TeamMember[]
}) {
  const [hov, setHov]     = useState(false)
  const [acting, setActing] = useState(false)
  const creator    = app.creators
  const primaryHandle = creator?.creator_social_handles?.find(h => h.is_primary) ?? creator?.creator_social_handles?.[0]
  const statusColor = APP_STATUS_COLORS[app.status ?? ''] ?? T.dim

  async function act(status: string) {
    setActing(true)
    await onStatusChange(app.id, status)
    setActing(false)
  }

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? T.cardHov : T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', transition: 'background .15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Avatar */}
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${T.purple},${T.purpleL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {(creator?.full_name ?? creator?.username ?? '?').slice(0, 1).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{creator?.full_name ?? creator?.username ?? 'Unknown'}</span>
            {creator?.username && <span style={{ fontSize: 12, color: T.faint }}>@{creator.username}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${statusColor}22`, color: statusColor, textTransform: 'capitalize' }}>
              {app.status ?? 'pending'}
            </span>
          </div>

          {/* Platform handles */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {creator?.creator_social_handles?.map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${PLAT_COLORS[h.platform?.toLowerCase()] ?? T.dim}22`, color: PLAT_COLORS[h.platform?.toLowerCase()] ?? T.dim }}>
                {h.platform?.charAt(0).toUpperCase() + (h.platform?.slice(1) ?? '')} · {fmtFollowers(h.followers)}
              </span>
            ))}
          </div>

          {/* Message */}
          {app.message && (
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.5, background: T.bg, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
              "{app.message}"
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: T.faint }}>Applied {fmtDate(app.created_at)}</div>
            {app.bid_amount && <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>Bid: {fmtMoney(app.bid_amount)}</div>}
            {creator?.price_per_post && <div style={{ fontSize: 12, color: T.dim }}>Rate: {fmtMoney(creator.price_per_post)}/post</div>}
            {creator?.profile_url && <a href={creator.profile_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: BLUE, textDecoration: 'none' }}>View profile →</a>}
          </div>

          {/* Assign to team member */}
          {teamMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: T.faint }}>Assign to:</span>
              <select
                value={app.assigned_to ?? ''}
                onChange={e => onAssign(app.id, e.target.value)}
                style={{ fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 8px', background: T.card, color: T.text, cursor: 'pointer' }}
              >
                <option value="">— Unassigned —</option>
                {teamMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.display_name ?? 'Member'}{m.department ? ` (${m.department})` : ''}
                  </option>
                ))}
              </select>
              {app.assigned_to && (
                <span style={{ fontSize: 11, color: T.purple, background: `${T.purple}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                  ✓ Assigned
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
          {/* Message button — always visible */}
          <button onClick={() => onMessage(app)} disabled={!creator?.user_id}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${BLUE}`, background: `${BLUE}15`, color: BLUE, fontWeight: 600, fontSize: 12, cursor: creator?.user_id ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, opacity: creator?.user_id ? 1 : 0.5 }}>
            💬 Message
          </button>

          {/* Status actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            {app.status !== 'accepted' && app.status !== 'rejected' && (
              <>
                {app.status !== 'shortlisted' && (
                  <button onClick={() => act('shortlisted')} disabled={acting}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: `${BLUE}22`, color: BLUE, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Shortlist
                  </button>
                )}
                <button onClick={() => act('accepted')} disabled={acting}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#10b98122', color: '#10b981', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Accept ✓
                </button>
                <button onClick={() => act('rejected')} disabled={acting}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#ef444422', color: '#ef4444', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Reject
                </button>
              </>
            )}
            {(app.status === 'accepted' || app.status === 'rejected') && (
              <button onClick={() => act('applied')} disabled={acting}
                style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.dim, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Undo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CampaignDetail({
  campaign,
  applications: initialApps,
  brand,
  userInitials,
  userId,
  teamMembers,
}: {
  campaign: Campaign
  applications: Application[]
  brand: Brand | null
  userInitials: string
  userId: string
  teamMembers: TeamMember[]
}) {
  const router   = useRouter()
  const supabase = createClient()

  const [apps, setApps]               = useState<Application[]>(initialApps)
  const [tab, setTab]                 = useState<'applications' | 'overview'>('applications')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [msgStatus, setMsgStatus]     = useState<string | null>(null)

  const statusColor = STATUS_COLORS[campaign.status ?? ''] ?? T.dim
  const dealColor   = DEAL_COLORS[campaign.deal_type ?? ''] ?? T.dim
  const dl          = daysLeft(campaign.deadline)
  const dlColor     = daysColor(campaign.deadline)
  const payout      = campaign.payout_model === 'commission' ? 'Commission' : fmtMoney(campaign.payout_amount ?? campaign.budget_total)

  const pending     = apps.filter(a => a.status === 'applied' || a.status === 'pending').length
  const shortlisted = apps.filter(a => a.status === 'shortlisted').length
  const accepted    = apps.filter(a => a.status === 'accepted').length
  const rejected    = apps.filter(a => a.status === 'rejected').length

  const filteredApps = statusFilter === 'all'
    ? apps
    : statusFilter === 'applied'
      ? apps.filter(a => a.status === 'applied' || a.status === 'pending')
      : apps.filter(a => a.status === statusFilter)

  // Update application status + auto-create deal when accepting
  async function handleStatusChange(appId: string, newStatus: string) {
    const app = apps.find(a => a.id === appId)
    const { error } = await supabase
      .from('campaign_applications')
      .update({ status: newStatus })
      .eq('id', appId)
    if (error) return

    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))

    // Auto-create a deal when brand accepts an application
    if (newStatus === 'accepted' && app && brand) {
      const { error: dealErr } = await supabase.from('deals').insert({
        brand_id:       brand.id,
        creator_id:     app.creator_id,
        campaign_id:    campaign.id,
        application_id: appId,
        price:          app.bid_amount ?? null,
        currency:       'USD',
        status:         'active',
        delivery_type:  campaign.deal_type ?? 'paid_post',
        assigned_to:    app.assigned_to ?? null,
      })
      if (!dealErr) {
        setMsgStatus('✓ Application accepted — deal created in your Deals tracker')
        setTimeout(() => setMsgStatus(null), 4000)
      }
    }
  }

  // Message creator: find or create conversation → redirect to brand profile messages tab
  async function handleMessage(app: Application) {
    const creatorId = app.creators?.id
    if (!creatorId || !brand) return

    setMsgStatus('Opening chat…')

    // Find existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('brand_id', brand.id)
      .eq('creator_id', creatorId)
      .maybeSingle()

    if (!existing) {
      // Create new conversation
      await supabase.from('conversations').insert({
        brand_id:   brand.id,
        creator_id: creatorId,
      })
    }

    // Redirect to brand profile with messages tab open
    router.push('/dashboard/brand/profile?tab=messages')
  }

  // Assign application to team member
  async function handleAssign(appId: string, userId: string) {
    await supabase
      .from('campaign_applications')
      .update({ assigned_to: userId || null })
      .eq('id', appId)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, assigned_to: userId || null } : a))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

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
            { label: 'Dashboard',  href: '/dashboard/brand/profile' },
            { label: 'Discovery',  href: '/dashboard/brand/discover' },
            { label: 'Campaigns',  href: '/dashboard/brand/campaigns', active: true },
            { label: 'Deals',      href: '/dashboard/brand/profile' },   // ← goes to main dashboard (Deals tab inside)
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
          <div onClick={() => router.push('/dashboard/brand/profile')} style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${T.purple},#a855f7)`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 13, cursor: 'pointer' }}>{userInitials}</div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Flash message */}
        {msgStatus && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
            {msgStatus}
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: T.dim }}>
          <span onClick={() => router.push('/dashboard/brand/campaigns')} style={{ cursor: 'pointer', color: BLUE }}>Campaigns</span>
          <span>›</span>
          <span style={{ color: T.text, fontWeight: 600 }}>{campaign.title ?? 'Untitled'}</span>
        </div>

        {/* Campaign header */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '24px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusColor}22`, color: statusColor, textTransform: 'capitalize' }}>{campaign.status ?? '—'}</span>
                {campaign.deal_type && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${dealColor}22`, color: dealColor }}>{DEAL_LABELS[campaign.deal_type] ?? campaign.deal_type}</span>
                )}
                {campaign.platforms?.map(p => (
                  <span key={p} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${PLAT_COLORS[p.toLowerCase()] ?? T.dim}22`, color: PLAT_COLORS[p.toLowerCase()] ?? T.dim }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.4px' }}>{campaign.title ?? 'Untitled Campaign'}</h1>
              {campaign.description && (
                <p style={{ fontSize: 14, color: T.dim, margin: '0 0 10px', lineHeight: 1.6, maxWidth: 600 }}>{campaign.description}</p>
              )}
              <div style={{ fontSize: 12, color: T.faint }}>Created {fmtDate(campaign.created_at)}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => router.push(`/dashboard/brand/campaigns/new?edit=${campaign.id}`)}
                style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <Stat label="Payout"      value={payout ?? '—'}              color={T.green} />
          <Stat label="Budget"      value={fmtMoney(campaign.budget_total)} />
          <Stat label="Deadline"    value={dl}                          color={dlColor} />
          <Stat label="Slots"       value={String(campaign.slots ?? '∞')} />
          <Stat label="Applicants"  value={String(apps.length)} />
          <Stat label="Accepted"    value={String(accepted)}            color="#10b981" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
          {(['applications', 'overview'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', background: 'transparent', fontWeight: 700, fontSize: 14,
                color: tab === t ? T.text : T.dim,
                borderBottom: tab === t ? `2px solid ${T.purple}` : '2px solid transparent',
                marginBottom: -1, textTransform: 'capitalize',
              }}>
              {t === 'applications' ? `Applications (${apps.length})` : 'Overview'}
            </button>
          ))}
        </div>

        {/* Applications tab */}
        {tab === 'applications' && (
          <div>
            {/* Filter row */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: T.side, borderRadius: 12, padding: 4, width: 'fit-content' }}>
              {[
                { key: 'all',         label: `All (${apps.length})` },
                { key: 'applied',     label: `New (${pending})` },
                { key: 'shortlisted', label: `Shortlisted (${shortlisted})` },
                { key: 'accepted',    label: `Accepted (${accepted})` },
                { key: 'rejected',    label: `Rejected (${rejected})` },
              ].map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  style={{
                    padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: statusFilter === f.key ? T.elev : 'transparent',
                    color: statusFilter === f.key ? T.text : T.dim,
                    fontWeight: statusFilter === f.key ? 700 : 500, fontSize: 12,
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {filteredApps.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '60px 24px', textAlign: 'center', color: T.dim }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 6 }}>
                  {statusFilter === 'all' ? 'No applications yet' : `No ${statusFilter} applications`}
                </div>
                <div style={{ fontSize: 14 }}>
                  {statusFilter === 'all' ? 'Once creators apply, their profiles will appear here.' : 'Try a different filter.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredApps.map(app => (
                  <AppRow
                    key={app.id}
                    app={app}
                    onStatusChange={handleStatusChange}
                    onMessage={handleMessage}
                    onAssign={handleAssign}
                    teamMembers={teamMembers}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {campaign.requirements && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: T.text }}>Requirements</div>
                <p style={{ fontSize: 14, color: T.dim, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{campaign.requirements}</p>
              </div>
            )}
            {campaign.target_audience && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: T.text }}>Target Audience</div>
                <p style={{ fontSize: 14, color: T.dim, margin: 0, lineHeight: 1.6 }}>{campaign.target_audience}</p>
              </div>
            )}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: T.text }}>Campaign Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Payout Model', value: campaign.payout_model ?? '—' },
                  { label: 'Deal Type',    value: DEAL_LABELS[campaign.deal_type ?? ''] ?? campaign.deal_type ?? '—' },
                  { label: 'Platforms',    value: campaign.platforms?.join(', ') ?? '—' },
                  { label: 'Slots',        value: String(campaign.slots ?? 'Unlimited') },
                  { label: 'Created',      value: fmtDate(campaign.created_at) },
                  { label: 'Deadline',     value: fmtDate(campaign.deadline) },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.faint, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, textTransform: 'capitalize' }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
