'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter }    from 'next/navigation'
import { T, PLAT_COLORS } from '@/lib/utils'

interface Props {
  brand:      { id: string; name: string | null } | null
  categories: { id: string; name: string }[]
}

const PLATFORMS   = ['youtube', 'instagram', 'tiktok']
const DEAL_TYPES  = ['paid_post', 'affiliate', 'gifting', 'ambassador'] as const
const DEAL_LABELS = { paid_post: 'Paid Post', affiliate: 'Affiliate', gifting: 'Gifting', ambassador: 'Ambassador' }
const PAYOUT_MODELS = ['flat', 'commission', 'product_cash'] as const
const PAYOUT_LABELS = { flat: 'Flat Fee', commission: 'Commission %', product_cash: 'Product + Cash' }

export default function CampaignForm({ brand, categories }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  // Form state
  const [title,         setTitle]         = useState('')
  const [brief,         setBrief]         = useState('')
  const [dealType,      setDealType]      = useState<typeof DEAL_TYPES[number]>('paid_post')
  const [payoutModel,   setPayoutModel]   = useState<typeof PAYOUT_MODELS[number]>('flat')
  const [payoutAmount,  setPayoutAmount]  = useState('')
  const [commissionPct, setCommissionPct] = useState('')
  const [budgetTotal,   setBudgetTotal]   = useState('')
  const [platforms,     setPlatforms]     = useState<Set<string>>(new Set())
  const [categoryId,    setCategoryId]    = useState('')
  const [deadline,      setDeadline]      = useState('')
  const [slots,         setSlots]         = useState('1')
  const [minFollowers,  setMinFollowers]  = useState('')
  const [minEngRate,    setMinEngRate]    = useState('')
  const [geoTarget,     setGeoTarget]     = useState('')
  const [status,        setStatus]        = useState<'draft' | 'open'>('open')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function togglePlatform(p: string) {
    const n = new Set(platforms)
    n.has(p) ? n.delete(p) : n.add(p)
    setPlatforms(n)
  }

  async function submit(publishStatus: 'draft' | 'open') {
    setError(null)

    if (!title.trim()) { setError('Campaign title is required.'); return }
    if (!brief.trim()) { setError('Campaign brief is required.'); return }
    if (platforms.size === 0) { setError('Select at least one platform.'); return }
    if (!brand) { setError('No brand profile found. Please set up your brand profile first.'); return }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        brand_id:     brand.id,
        title:        title.trim(),
        brief:        brief.trim(),
        deal_type:    dealType,
        payout_model: payoutModel,
        platforms:    [...platforms],
        status:       publishStatus,
        slots:        parseInt(slots) || 1,
      }

      if (payoutAmount)   payload.payout_amount       = parseFloat(payoutAmount)
      if (commissionPct)  payload.commission_pct      = parseFloat(commissionPct)
      if (budgetTotal)    payload.budget_total        = parseFloat(budgetTotal)
      if (categoryId)     payload.category_id         = categoryId
      if (deadline)       payload.deadline            = deadline
      if (minFollowers)   payload.min_followers       = parseInt(minFollowers)
      if (minEngRate)     payload.min_engagement_rate = parseFloat(minEngRate)
      if (geoTarget.trim()) payload.geo_target        = geoTarget.split(',').map(s => s.trim()).filter(Boolean)

      const { data, error: insertErr } = await supabase
        .from('campaigns')
        .insert(payload)
        .select('id')
        .single()

      if (insertErr) throw insertErr

      router.push(`/dashboard/brand/campaigns`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setLoading(false)
  }

  const showPayout     = payoutModel === 'flat' || payoutModel === 'product_cash'
  const showCommission = payoutModel === 'commission'

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Top bar */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', borderBottom: `1px solid ${T.border}`, background: T.side, position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={() => router.back()} style={{ background: T.elev, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', color: T.dim, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>New Campaign</span>
        {brand && <span style={{ fontSize: 13, color: T.dim }}>for <b style={{ color: T.text }}>{brand.name}</b></span>}
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* No brand warning */}
        {!brand && (
          <div style={{ background: `${T.red}11`, border: `1px solid ${T.red}44`, borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <p style={{ margin: 0, color: T.red, fontWeight: 600 }}>No brand profile found. You need to create a brand profile before posting campaigns.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Section: Basics ────────────────────────────── */}
          <Section title="Campaign Basics">
            <Field label="Campaign Title *">
              <Input value={title} onChange={setTitle} placeholder="e.g. Summer Collection Launch — Instagram" />
            </Field>
            <Field label="Brief *" hint="Describe what you need — content type, key messages, tone, dos and don'ts.">
              <Textarea value={brief} onChange={setBrief} placeholder="We're launching our summer collection and need authentic lifestyle content…" rows={5} />
            </Field>
          </Section>

          {/* ── Section: Deal ──────────────────────────────── */}
          <Section title="Deal Type & Payout">
            <Field label="Deal Type *">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DEAL_TYPES.map(dt => (
                  <ChipBtn key={dt} active={dealType === dt} color="#a78bfa" onClick={() => setDealType(dt)}>
                    {DEAL_LABELS[dt]}
                  </ChipBtn>
                ))}
              </div>
            </Field>

            <Field label="Payout Model *">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PAYOUT_MODELS.map(pm => (
                  <ChipBtn key={pm} active={payoutModel === pm} color={T.green} onClick={() => setPayoutModel(pm)}>
                    {PAYOUT_LABELS[pm]}
                  </ChipBtn>
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {showPayout && (
                <Field label="Payout per Creator (USD)">
                  <Input value={payoutAmount} onChange={setPayoutAmount} placeholder="500" type="number" prefix="$" />
                </Field>
              )}
              {showCommission && (
                <Field label="Commission Rate (%)">
                  <Input value={commissionPct} onChange={setCommissionPct} placeholder="15" type="number" suffix="%" />
                </Field>
              )}
              <Field label="Total Campaign Budget (USD)">
                <Input value={budgetTotal} onChange={setBudgetTotal} placeholder="10000" type="number" prefix="$" />
              </Field>
            </div>
          </Section>

          {/* ── Section: Targeting ─────────────────────────── */}
          <Section title="Targeting">
            <Field label="Platforms *">
              <div style={{ display: 'flex', gap: 8 }}>
                {PLATFORMS.map(p => {
                  const col = PLAT_COLORS[p] ?? T.dim
                  return (
                    <ChipBtn key={p} active={platforms.has(p)} color={col} onClick={() => togglePlatform(p)}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </ChipBtn>
                  )
                })}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Category">
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none' }}>
                  <option value="">Any category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Geo Targets" hint="Comma-separated countries">
                <Input value={geoTarget} onChange={setGeoTarget} placeholder="United States, India" />
              </Field>
              <Field label="Min Followers">
                <Input value={minFollowers} onChange={setMinFollowers} placeholder="10000" type="number" />
              </Field>
              <Field label="Min Engagement Rate (%)">
                <Input value={minEngRate} onChange={setMinEngRate} placeholder="2.5" type="number" />
              </Field>
            </div>
          </Section>

          {/* ── Section: Logistics ─────────────────────────── */}
          <Section title="Logistics">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Deadline">
                <Input value={deadline} onChange={setDeadline} type="date" />
              </Field>
              <Field label="Creator Slots" hint="How many creators do you need?">
                <Input value={slots} onChange={setSlots} type="number" placeholder="1" />
              </Field>
            </div>
          </Section>

          {/* ── Error ──────────────────────────────────────── */}
          {error && (
            <div style={{ padding: '12px 16px', background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 10, color: T.red, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* ── Actions ────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => submit('draft')} disabled={loading || !brand}
              style={{ flex: 1, padding: '12px', borderRadius: 10, background: T.elev, color: T.dim, fontWeight: 700, fontSize: 15, border: `1px solid ${T.border}`, cursor: loading || !brand ? 'not-allowed' : 'pointer' }}>
              Save as Draft
            </button>
            <button onClick={() => submit('open')} disabled={loading || !brand}
              style={{ flex: 2, padding: '12px', borderRadius: 10, background: loading || !brand ? T.elev : `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: loading || !brand ? T.dim : '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading || !brand ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Publishing…' : 'Publish Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Form sub-components ───────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 24px' }}>
      <h2 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800, color: T.text, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '5px 0 0', fontSize: 11, color: T.faint }}>{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', prefix, suffix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string; suffix?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.dim, fontSize: 14 }}>{prefix}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: prefix ? '10px 12px 10px 28px' : suffix ? '10px 28px 10px 12px' : '10px 12px', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
      {suffix && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: T.dim, fontSize: 14 }}>{suffix}</span>}
    </div>
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: '100%', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', color: T.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
  )
}

function ChipBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${active ? color : T.border}`,
      background: active ? `${color}22` : 'transparent',
      color: active ? color : T.dim,
    }}>{children}</button>
  )
}
