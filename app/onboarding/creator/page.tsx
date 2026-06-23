'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const T = {
  bg: '#090c12', card: '#10141e', elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  teal: '#25e0d6', red: '#f4574d', purple: '#5710fc', purpleL: '#7c3aed',
}

const PLATFORMS = [
  { key: 'youtube',   label: 'YouTube',   placeholder: 'youtube.com/@channel' },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/handle' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'tiktok.com/@handle'   },
  { key: 'twitter',   label: 'Twitter/X', placeholder: 'x.com/handle'         },
  { key: 'facebook',  label: 'Facebook',  placeholder: 'facebook.com/page'    },
  { key: 'other',     label: 'Other',     placeholder: 'Channel URL'          },
]

interface Handle { platform: string; channelUrl: string; followers: string }

const emptyHandle = (): Handle => ({ platform: '', channelUrl: '', followers: '' })

export default function CreatorOnboarding() {
  const router = useRouter()

  const [fullName,  setFullName]  = useState('')
  const [handles,   setHandles]   = useState<Handle[]>([emptyHandle()])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function updateHandle(i: number, field: keyof Handle, value: string) {
    setHandles(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h))
  }

  function addHandle() {
    if (handles.length >= 4) return
    setHandles(prev => [...prev, emptyHandle()])
  }

  function removeHandle(i: number) {
    if (handles.length === 1) return
    setHandles(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) { setError('Please enter your name.'); return }

    const filled = handles.filter(h => h.platform && h.channelUrl.trim())
    if (!filled.length)   { setError('Add at least one platform with a channel URL.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/creator', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullName: fullName.trim(),
          handles:  filled.map(h => ({
            platform:   h.platform,
            channelUrl: h.channelUrl.trim(),
            followers:  h.followers ? parseInt(h.followers) : undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')

      // Store all verification codes
      if (data.verificationCodes) {
        sessionStorage.setItem('verificationCodes', JSON.stringify(data.verificationCodes))
      }
      sessionStorage.setItem('creatorId', data.creatorId)

      router.push('/dashboard/creator')
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
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Creator Profile</h1>
          <p style={{ color: T.dim, fontSize: 14, margin: '0 0 28px' }}>Add all your active channels — each will get its own verification code.</p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Name */}
            <Field label="Your Name *">
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Alex Sharma" style={inputSt} />
            </Field>

            {/* Handles */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Your Platforms *
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>— first one is your primary</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {handles.map((h, i) => (
                  <div key={i} style={{ background: T.elev, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? T.teal : T.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {i === 0 ? 'Primary' : `Platform ${i + 1}`}
                      </span>
                      {i > 0 && (
                        <button type="button" onClick={() => removeHandle(i)}
                          style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                      )}
                    </div>

                    {/* Platform chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {PLATFORMS.map(p => (
                        <button key={p.key} type="button" onClick={() => updateHandle(i, 'platform', p.key)}
                          style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border:     `1px solid ${h.platform === p.key ? T.teal : T.border}`,
                            background: h.platform === p.key ? `${T.teal}22` : 'transparent',
                            color:      h.platform === p.key ? T.teal : T.dim,
                          }}>
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {h.platform && (
                      <input
                        type="text"
                        value={h.channelUrl}
                        onChange={e => updateHandle(i, 'channelUrl', e.target.value)}
                        placeholder={PLATFORMS.find(p => p.key === h.platform)?.placeholder ?? 'Channel URL'}
                        style={{ ...inputSt, marginBottom: 8 }}
                      />
                    )}

                    <input
                      type="number"
                      value={h.followers}
                      onChange={e => updateHandle(i, 'followers', e.target.value)}
                      placeholder="Approx. followers (optional)"
                      style={inputSt}
                    />
                  </div>
                ))}
              </div>

              {handles.length < 4 && (
                <button type="button" onClick={addHandle}
                  style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, border: `1px dashed ${T.border}`, background: 'transparent', color: T.dim, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  + Add another platform
                </button>
              )}
            </div>

            {/* Notice */}
            <div style={{ background: `${T.teal}11`, border: `1px solid ${T.teal}33`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: T.teal, lineHeight: 1.5 }}>
              Each platform gets a unique <b>ADMISDB-XXXXXX</b> code to paste in your bio. You can browse until verified — bidding and rate-setting unlock after.
            </div>

            {error && (
              <div style={{ color: T.red, fontSize: 13, background: `${T.red}11`, border: `1px solid ${T.red}33`, borderRadius: 8, padding: '10px 12px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: '13px', borderRadius: 10, border: 'none', background: loading ? T.elev : `linear-gradient(135deg,${T.purple},${T.purpleL})`, color: loading ? T.dim : '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating profile…' : 'Create Creator Profile →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#98a2b3', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputSt: React.CSSProperties = {
  width: '100%', background: '#10141e', border: '1px solid #1d2433', borderRadius: 8,
  padding: '9px 12px', color: '#f3f5f8', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
