'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface InviteInfo {
  email: string
  role: string | null
  department: string | null
  brand_name: string | null
  expires_at: string | null
}

function errMsg(e: unknown): string {
  if (!e) return 'Unknown error'
  if (typeof e === 'string') return e
  if (typeof e === 'object') {
    const o = e as Record<string, unknown>
    if (typeof o.message === 'string' && o.message) return o.message
    const s = JSON.stringify(e)
    return s === '{}' ? 'An unexpected error occurred' : s
  }
  return String(e)
}

export default function JoinPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token')
  const supabase     = createClient()

  const [invite,     setInvite]     = useState<InviteInfo | null>(null)
  const [pageError,  setPageError]  = useState<string | null>(null)  // invalid token / expired
  const [formError,  setFormError]  = useState<string | null>(null)  // submit errors
  const [loading,    setLoading]    = useState(true)
  const [name,       setName]       = useState('')
  const [password,   setPassword]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step,       setStep]       = useState<'form' | 'done'>('form')

  useEffect(() => {
    if (!token) { setPageError('Invalid invite link — no token found.'); setLoading(false); return }
    supabase.from('team_invites')
      .select('email, role, department, brand_name, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error: e }) => {
        if (e) { setPageError('Could not load invite: ' + errMsg(e)); setLoading(false); return }
        if (!data) { setPageError('Invite not found or already used.'); setLoading(false); return }
        if (data.accepted_at) { setPageError('This invite has already been used.'); setLoading(false); return }
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setPageError('This invite link has expired.'); setLoading(false); return
        }
        setInvite(data as InviteInfo)
        setLoading(false)
      })
  }, [token])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !password || !token || !invite) return
    setSubmitting(true); setFormError(null)

    // Step 1: Sign up (or sign in if already registered)
    const { error: signUpErr } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { display_name: name.trim(), account_type: 'member' } }
    })

    if (signUpErr) {
      const msg = signUpErr.message ?? ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        // User exists — sign them in instead
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invite.email, password })
        if (signInErr) {
          setFormError('This email is already registered. If it\'s your account, enter the correct password.')
          setSubmitting(false); return
        }
      } else {
        setFormError(errMsg(signUpErr))
        setSubmitting(false); return
      }
    }

    // Step 2: Call SECURITY DEFINER RPC — links account to brand, sets role=member
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('accept_team_invite', {
      p_token: token,
      p_display_name: name.trim()
    })

    if (rpcErr) {
      setFormError('Error linking account: ' + errMsg(rpcErr))
      setSubmitting(false); return
    }

    // rpcResult is the jsonb returned by the function
    const result = rpcResult as { success?: boolean; error?: string } | null
    if (result?.error) {
      setFormError(result.error)
      setSubmitting(false); return
    }

    if (!result?.success) {
      setFormError('Unexpected response: ' + JSON.stringify(rpcResult))
      setSubmitting(false); return
    }

    setStep('done')
    setTimeout(() => router.push('/dashboard/member'), 1500)
  }

  const deptColors: Record<string, string> = {
    promo: '#7C3AED', payment: '#B45309', internal: '#0369A1', other: '#374151'
  }
  const deptLabel: Record<string, string> = {
    promo: 'Promo Team', payment: 'Payment Team', internal: 'Internal Team', other: 'General'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)', fontFamily: 'Inter, sans-serif', padding: 20
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Platform logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 10
          }}>A</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>ADMIS</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Influencer platform</div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 32, color: '#6b7280', fontSize: 14 }}>
              Verifying invite…
            </div>
          )}

          {/* Page-level error (invalid/expired token) */}
          {!loading && pageError && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Invite unavailable</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{pageError}</div>
              <button onClick={() => router.push('/')} style={{
                background: '#2563eb', color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>Go to home</button>
            </div>
          )}

          {/* Signup form */}
          {!loading && !pageError && invite && step === 'form' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>You're invited by</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{invite.brand_name ?? 'a brand'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {invite.department && (
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                      background: '#EDE9FE', color: deptColors[invite.department] ?? '#374151'
                    }}>{deptLabel[invite.department] ?? invite.department}</span>
                  )}
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E0F2FE', color: '#0369A1', fontWeight: 600 }}>
                    {invite.role ?? 'Member'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>Create your account to get started.</div>
              </div>

              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Email</label>
                  <input readOnly value={invite.email} style={{
                    width: '100%', fontSize: 13, padding: '9px 12px', border: '0.5px solid #e5e7eb',
                    borderRadius: 8, background: '#f3f4f6', color: '#9ca3af', boxSizing: 'border-box'
                  }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Your name</label>
                  <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required
                    style={{ width: '100%', fontSize: 13, padding: '9px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Create password</label>
                  <input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    style={{ width: '100%', fontSize: 13, padding: '9px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                {/* Form-level error — shows inline, doesn't replace the form */}
                {formError && (
                  <div style={{ fontSize: 12, padding: '10px 12px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', wordBreak: 'break-word' }}>
                    {formError}
                  </div>
                )}

                <button type="submit" disabled={submitting} style={{
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none',
                  borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1
                }}>
                  {submitting ? 'Setting up account…' : 'Join & get access'}
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>You're in!</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Redirecting to your dashboard…</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#9ca3af' }}>
          Already have an account? <a href="/" style={{ color: '#2563eb' }}>Sign in</a>
        </div>
      </div>
    </div>
  )
}
