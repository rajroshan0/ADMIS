'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const T = {
  bg: '#090c12', card: '#10141e', elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  red: '#f4574d', purple: '#5710fc', purpleL: '#7c3aed', pink: '#ec4899',
}

const SIZES = [
  { key: 'solo',   label: 'Solo / Freelancer' },
  { key: 'small',  label: 'Small (1–10)' },
  { key: 'medium', label: 'Medium (11–50)' },
  { key: 'large',  label: 'Large (50+)' },
]

const BUDGETS = [
  { key: '<500',    label: 'Under $500/mo' },
  { key: '500-2k',  label: '$500 – $2K/mo' },
  { key: '2k-10k',  label: '$2K – $10K/mo' },
  { key: '10k+',    label: '$10K+/mo' },
]

export default function BrandOnboarding() {
  const router = useRouter()

  const [companyName,  setCompanyName]  = useState('')
  const [contactName,  setContactName]  = useState('')
  const [phone,        setPhone]        = useState('')
  const [website,      setWebsite]      = useState('')
  const [companySize,  setCompanySize]  = useState('')
  const [budgetRange,  setBudgetRange]  = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!companyName.trim()) { setError('Company name is required.'); return }
    if (!contactName.trim()) { setError('Your name is required.'); return }
    if (!companySize)        { setError('Please select company size.'); return }
    if (!budgetRange)        { setError('Please select a monthly budget.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/brand', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyName, contactName, phone, website, companySize, budgetRange }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      router.push('/dashboard/brand/discover')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        <button onClick={() => router.push('/onboarding')} style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
          ← Back
        </button>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: '32px 28px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Brand Profile</h1>
          <p style={{ color: T.dim, fontSize: 14, margin: '0 0 28px' }}>Tell us about your business. Website is optional — local businesses welcome!</p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <Field label="Company / Brand Name *">
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Sunrise Bakery" style={inputStyle} />
            </Field>

            <Field label="Your Name (Contact Person) *">
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Priya Thapa" style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Phone Number">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" style={inputStyle} />
              </Field>
              <Field label="Website" hint="Optional">
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." style={inputStyle} />
              </Field>
            </div>

            <Field label="Company Size *">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SIZES.map(s => (
                  <ChipBtn key={s.key} active={companySize === s.key} color={T.pink} onClick={() => setCompanySize(s.key)}>{s.label}</ChipBtn>
                ))}
              </div>
            </Field>

            <Field label="Monthly Influencer Budget *">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {BUDGETS.map(b => (
                  <ChipBtn key={b.key} active={budgetRange === b.key} color={T.pink} onClick={() => setBudgetRange(b.key)}>{b.label}</ChipBtn>
                ))}
              </div>
            </Field>

            {/* Verification notice */}
            <div style={{ background: '#ec489911', border: '1px solid #ec489933', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#ec4899', lineHeight: 1.5 }}>
              <b>Verification:</b> Our team will confirm your account within 24–48 hours.
              You can already browse creators and plan campaigns — bidding unlocks after verification.
            </div>

            {error && <div style={{ color: T.red, fontSize: 13, background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: '10px 12px' }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ padding: '13px', borderRadius: 10, border: 'none', background: loading ? T.elev : `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: loading ? T.dim : '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating profile…' : 'Create Brand Profile →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#98a2b3', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
      {hint && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#5e6a7d' }}>{hint}</p>}
    </div>
  )
}

function ChipBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? color : '#1d2433'}`, background: active ? `${color}22` : 'transparent', color: active ? color : '#98a2b3' }}>
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161b28', border: '1px solid #1d2433', borderRadius: 10,
  padding: '10px 12px', color: '#f3f5f8', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
