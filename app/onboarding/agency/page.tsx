'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const T = {
  bg: '#090c12', card: '#10141e', elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  amber: '#f5a623', red: '#f4574d', purple: '#5710fc', purpleL: '#7c3aed',
}

const SOCIAL_PLATFORMS = ['YouTube','Instagram','TikTok','Twitter/X','Facebook','WhatsApp','LinkedIn','Other']

interface SocialHandle { platform: string; username: string }

export default function AgencyOnboarding() {
  const router = useRouter()

  const [agencyName,     setAgencyName]     = useState('')
  const [contactName,    setContactName]    = useState('')
  const [contactPhone,   setContactPhone]   = useState('')
  const [socialHandles,  setSocialHandles]  = useState<SocialHandle[]>([{ platform: '', username: '' }])
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  function addHandle()  { setSocialHandles(h => [...h, { platform: '', username: '' }]) }
  function removeHandle(i: number) { setSocialHandles(h => h.filter((_, idx) => idx !== i)) }
  function updateHandle(i: number, field: keyof SocialHandle, val: string) {
    setSocialHandles(h => h.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!agencyName.trim())  { setError('Agency name is required.'); return }
    if (!contactName.trim()) { setError('Contact name is required.'); return }
    const validHandles = socialHandles.filter(h => h.platform && h.username.trim())
    if (!validHandles.length) { setError('Please add at least one social handle.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/agency', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          agencyName, contactName,
          contactPhone: contactPhone || undefined,
          socialHandles: validHandles,
        }),
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
      <div style={{ width: '100%', maxWidth: 540 }}>

        <button onClick={() => router.push('/onboarding')} style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
          ← Back
        </button>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: '32px 28px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Agency Profile</h1>
          <p style={{ color: T.dim, fontSize: 14, margin: '0 0 28px' }}>You'll be able to manage creators and brands. ID verification required to unlock full agency features.</p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <Field label="Agency Name *">
              <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="e.g. Nexus Talent Group" style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Your Name *">
                <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" style={inputStyle} />
              </Field>
              <Field label="Phone / WhatsApp">
                <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+1 555 000 0000" style={inputStyle} />
              </Field>
            </div>

            {/* Social handles */}
            <Field label="Social Handles / Presence *" hint="At least one required — website not needed.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {socialHandles.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={h.platform} onChange={e => updateHandle(i, 'platform', e.target.value)}
                      style={{ ...inputStyle, flex: '0 0 130px', padding: '10px 8px' }}>
                      <option value="">Platform</option>
                      {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input
                      type="text" value={h.username}
                      onChange={e => updateHandle(i, 'username', e.target.value)}
                      placeholder="@username or URL"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {socialHandles.length > 1 && (
                      <button type="button" onClick={() => removeHandle(i)}
                        style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addHandle}
                  style={{ alignSelf: 'flex-start', background: 'none', border: `1px dashed ${T.border}`, color: T.dim, borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
                  + Add another
                </button>
              </div>
            </Field>

            {/* ID Proof notice */}
            <div style={{ background: `${T.amber}11`, border: `1px solid ${T.amber}33`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: T.amber, lineHeight: 1.5 }}>
              <b>ID Verification required:</b> After signing up, go to your dashboard to upload a government-issued ID
              (citizenship card, passport, or national ID) to get your agency verified.
              Standard commission: <b>10%</b>.
            </div>

            {error && <div style={{ color: T.red, fontSize: 13, background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: '10px 12px' }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ padding: '13px', borderRadius: 10, border: 'none', background: loading ? T.elev : `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: loading ? T.dim : '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating profile…' : 'Create Agency Profile →'}
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

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161b28', border: '1px solid #1d2433', borderRadius: 10,
  padding: '10px 12px', color: '#f3f5f8', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
