'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AccountType = 'creator' | 'brand' | 'agency' | null

const T = {
  bg: '#090c12', card: '#10141e', elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  purple: '#5710fc', purpleL: '#7c3aed',
  teal: '#25e0d6', pink: '#ec4899', amber: '#f5a623', red: '#f4574d',
}

const PLATFORMS = [
  { key: 'youtube',   label: 'YouTube',   placeholder: 'youtube.com/@channel' },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/handle' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'tiktok.com/@handle'   },
  { key: 'twitter',   label: 'Twitter/X', placeholder: 'x.com/handle'         },
  { key: 'facebook',  label: 'Facebook',  placeholder: 'facebook.com/page'    },
  { key: 'other',     label: 'Other',     placeholder: 'Channel URL'          },
]
const CO_SIZES  = ['Solo', 'Small (1–10)', 'Medium (11–50)', 'Large (50+)']
const BUDGETS   = ['< $500/mo', '$500–$2K', '$2K–$10K', '$10K+']
const SOC_PLATS = ['YouTube','Instagram','TikTok','Twitter/X','WhatsApp','Facebook','Other']

interface HandleRow { platform: string; channelUrl: string }
const emptyHandle = (): HandleRow => ({ platform: '', channelUrl: '' })

const ROLES = [
  { key: 'creator' as const, icon: '🎬', title: 'Creator / Influencer', desc: 'I run a YouTube, Instagram, or TikTok channel', color: T.teal  },
  { key: 'brand'   as const, icon: '🏢', title: 'Brand / Business',      desc: 'I want to find creators for campaigns',          color: T.pink  },
  { key: 'agency'  as const, icon: '🤝', title: 'Agency',                 desc: 'I manage creators or brands',                   color: T.amber },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // Creator
  const [creatorName,  setCreatorName]  = useState('')
  const [handles,      setHandles]      = useState<HandleRow[]>([emptyHandle()])

  function updateHandle(i: number, field: keyof HandleRow, value: string) {
    setHandles(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h))
  }
  function addHandle()      { if (handles.length < 4) setHandles(prev => [...prev, emptyHandle()]) }
  function removeHandle(i: number) { if (handles.length > 1) setHandles(prev => prev.filter((_, idx) => idx !== i)) }

  // Brand
  const [companyName,  setCompanyName]  = useState('')
  const [contactName,  setContactName]  = useState('')
  const [phone,        setPhone]        = useState('')
  const [companySize,  setCompanySize]  = useState('')
  const [budgetRange,  setBudgetRange]  = useState('')

  // Agency
  const [agencyName,   setAgencyName]   = useState('')
  const [agContact,    setAgContact]    = useState('')
  const [agPhone,      setAgPhone]      = useState('')
  const [agSocPlat,    setAgSocPlat]    = useState('')
  const [agSocHandle,  setAgSocHandle]  = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!accountType) { setError('Please select an account type.'); return }
    setLoading(true)

    try {
      let url  = ''
      let body: Record<string, unknown> = {}

      if (accountType === 'creator') {
        if (!creatorName.trim()) throw new Error('Name is required.')
        const filled = handles.filter(h => h.platform && h.channelUrl.trim())
        if (!filled.length)      throw new Error('Add at least one platform with a channel URL.')
        url  = '/api/onboarding/creator'
        body = { fullName: creatorName.trim(), handles: filled.map(h => ({ platform: h.platform, channelUrl: h.channelUrl.trim() })) }

      } else if (accountType === 'brand') {
        if (!companyName.trim()) throw new Error('Company name is required.')
        if (!contactName.trim()) throw new Error('Your name is required.')
        if (!companySize)        throw new Error('Select company size.')
        if (!budgetRange)        throw new Error('Select a budget range.')
        url  = '/api/onboarding/brand'
        body = { companyName: companyName.trim(), contactName: contactName.trim(), phone: phone.trim() || undefined, companySize, budgetRange }

      } else {
        if (!agencyName.trim())  throw new Error('Agency name is required.')
        if (!agContact.trim())   throw new Error('Contact name is required.')
        if (!agSocPlat || !agSocHandle.trim()) throw new Error('Add at least one social handle.')
        url  = '/api/onboarding/agency'
        body = {
          agencyName:    agencyName.trim(),
          contactName:   agContact.trim(),
          contactPhone:  agPhone.trim() || undefined,
          socialHandles: [{ platform: agSocPlat, username: agSocHandle.trim() }],
        }
      }

      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      // Store verification code if creator
      if (data.verificationCode) {
        sessionStorage.setItem('verificationCode', data.verificationCode)
      }

      // Redirect to appropriate dashboard
      if      (accountType === 'creator') router.push('/dashboard/creator')
      else if (accountType === 'brand')   router.push('/dashboard/brand')
      else                                router.push('/dashboard/agency')

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  const accentColor = accountType === 'creator' ? T.teal : accountType === 'brand' ? T.pink : T.amber

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.purple, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', fontSize: 17 }}>A</div>
        <span style={{ fontWeight: 800, fontSize: 19 }}>ADMIS</span>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Tell us about yourself</h1>
          <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>Just the basics — you can update everything later.</p>
        </div>

        <form onSubmit={submit}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Account type */}
            <div>
              <Label>I am a…</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                {ROLES.map(r => (
                  <button key={r.key} type="button" onClick={() => setAccountType(r.key)}
                    style={{
                      padding: '12px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      border:     `2px solid ${accountType === r.key ? r.color : T.border}`,
                      background: accountType === r.key ? `${r.color}18` : 'transparent',
                      color:      accountType === r.key ? r.color : T.dim,
                      transition: 'all .15s',
                    }}>
                    <span style={{ fontSize: 22 }}>{r.icon}</span>
                    <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{r.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Creator fields ── */}
            {accountType === 'creator' && (
              <>
                <Field label="Your Name *">
                  <Input placeholder="e.g. Alex Sharma" value={creatorName} onChange={setCreatorName} accent={accentColor} />
                </Field>

                <div>
                  <Label>Your Platforms *<span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, color: T.faint }}>— first one is primary</span></Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    {handles.map((h, i) => (
                      <div key={i} style={{ background: '#0d1117', border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 12px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? T.teal : T.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {i === 0 ? '★ Primary' : `Platform ${i + 1}`}
                          </span>
                          {i > 0 && (
                            <button type="button" onClick={() => removeHandle(i)}
                              style={{ background: 'none', border: 'none', color: '#f4574d', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          {PLATFORMS.map(p => (
                            <Chip key={p.key} label={p.label} active={h.platform === p.key} color={accentColor} onClick={() => updateHandle(i, 'platform', p.key)} />
                          ))}
                        </div>
                        {h.platform && (
                          <Input
                            placeholder={PLATFORMS.find(p => p.key === h.platform)?.placeholder ?? 'Channel URL'}
                            value={h.channelUrl} onChange={v => updateHandle(i, 'channelUrl', v)} accent={accentColor}
                          />
                        )}
                      </div>
                    ))}
                    {handles.length < 4 && (
                      <button type="button" onClick={addHandle}
                        style={{ padding: '9px', borderRadius: 10, border: `1px dashed ${T.border}`, background: 'transparent', color: T.faint, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        + Add another platform
                      </button>
                    )}
                  </div>
                </div>

                <InfoBox color={T.teal}>
                  Each platform gets its own <b>ADMISDB-XXXXXX</b> code to paste in your bio. You can browse until verified.
                </InfoBox>
              </>
            )}

            {/* ── Brand fields ── */}
            {accountType === 'brand' && (
              <>
                <Field label="Company / Brand Name *">
                  <Input placeholder="e.g. Acme Inc." value={companyName} onChange={setCompanyName} accent={accentColor} />
                </Field>
                <Field label="Your Name (contact) *">
                  <Input placeholder="e.g. Priya Mehta" value={contactName} onChange={setContactName} accent={accentColor} />
                </Field>
                <Field label="Phone (optional)">
                  <Input type="tel" placeholder="+91 98765 43210" value={phone} onChange={setPhone} accent={accentColor} />
                </Field>
                <Field label="Company Size *">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {CO_SIZES.map(s => <Chip key={s} label={s} active={companySize===s} color={accentColor} onClick={() => setCompanySize(s)} />)}
                  </div>
                </Field>
                <Field label="Monthly Influencer Budget *">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {BUDGETS.map(b => <Chip key={b} label={b} active={budgetRange===b} color={accentColor} onClick={() => setBudgetRange(b)} />)}
                  </div>
                </Field>
              </>
            )}

            {/* ── Agency fields ── */}
            {accountType === 'agency' && (
              <>
                <Field label="Agency Name *">
                  <Input placeholder="e.g. Spark Media" value={agencyName} onChange={setAgencyName} accent={accentColor} />
                </Field>
                <Field label="Your Name *">
                  <Input placeholder="e.g. Rohan Verma" value={agContact} onChange={setAgContact} accent={accentColor} />
                </Field>
                <Field label="Phone / WhatsApp (optional)">
                  <Input type="tel" placeholder="+91 98765 43210" value={agPhone} onChange={setAgPhone} accent={accentColor} />
                </Field>
                <Field label="Your Social Presence *">
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <select value={agSocPlat} onChange={e => setAgSocPlat(e.target.value)}
                      style={{ flexShrink: 0, width: 120, padding: '9px 8px', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: 'none' }}>
                      <option value="">Platform</option>
                      {SOC_PLATS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input value={agSocHandle} onChange={e => setAgSocHandle(e.target.value)}
                      placeholder="@username or URL"
                      style={{ flex: 1, padding: '9px 12px', background: T.elev, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
                  </div>
                </Field>
              </>
            )}

            {error && (
              <div style={{ color: T.red, fontSize: 13, background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: '10px 12px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !accountType}
              style={{
                padding: '13px', borderRadius: 10, border: 'none', fontWeight: 800, fontSize: 15, cursor: loading || !accountType ? 'not-allowed' : 'pointer', transition: 'all .15s',
                background: !accountType ? T.elev : loading ? T.elev : accentColor || T.purple,
                color: !accountType || loading ? T.faint : accountType === 'creator' ? '#000' : '#fff',
              }}>
              {loading ? 'Setting up…' : 'Continue →'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', color: T.faint, fontSize: 12, marginTop: 20 }}>
          Already set up?{' '}
          <span style={{ color: T.dim, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/')}>Sign in</span>
          {' · '}
          <span style={{ color: T.faint, cursor: 'pointer', textDecoration: 'underline' }} onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/')
          }}>Sign out</span>
        </p>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#98a2b3', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>
}

function Input({ type = 'text', placeholder, value, onChange, accent }: {
  type?: string; placeholder: string; value: string; onChange: (v: string) => void; accent: string
}) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', marginTop: 6, padding: '9px 12px', background: '#161b28', border: `1px solid #1d2433`, borderRadius: 8, color: '#f3f5f8', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
      onFocus={e => { e.target.style.borderColor = accent }}
      onBlur={e =>  { e.target.style.borderColor = '#1d2433' }}
    />
  )
}

function Chip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        border:     `1px solid ${active ? color : '#1d2433'}`,
        background: active ? `${color}22` : 'transparent',
        color:      active ? color : '#98a2b3',
        transition: 'all .15s',
      }}>
      {label}
    </button>
  )
}

function InfoBox({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 10, padding: '11px 14px', fontSize: 13, color, lineHeight: 1.55 }}>
      {children}
    </div>
  )
}
