'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter }    from 'next/navigation'

type AccountType = 'creator' | 'brand' | 'agency'
type Mode        = 'signup'  | 'login'
type DiscoverTab = 'creators' | 'brands'
type Page        = 'home' | 'about'

const STATS = [
  { value: '10,580+', label: 'Verified Creators' },
  { value: '8,500+',  label: 'Campaigns Run'     },
  { value: '97%',     label: 'Satisfaction Rate'  },
]

const FEATURES = [
  { icon: '🎯', title: 'Smart Discovery',  desc: 'Filter by platform, niche, followers & engagement rate' },
  { icon: '📊', title: 'Live Analytics',   desc: 'Track reach, clicks, conversions and ROI in real time'  },
  { icon: '🤝', title: 'Deal Management',  desc: 'Contracts, milestones, and secure payments all-in-one'  },
]

const MOCK_CREATORS = [
  { name: 'Sarah K.',      handle: '@sarahk',      niche: 'Fashion & Lifestyle', followers: '2.4M',  avgViews: '180K',  er: '4.8%',  price: '$1,200', platform: 'IG',  color: '#E1306C' },
  { name: 'Mike Rivera',   handle: '@miketech',    niche: 'Technology',          followers: '890K',  avgViews: '95K',   er: '6.2%',  price: '$850',   platform: 'YT',  color: '#FF0000' },
  { name: 'Priya Sharma',  handle: '@priyafit',    niche: 'Health & Fitness',    followers: '1.1M',  avgViews: '210K',  er: '5.1%',  price: '$950',   platform: 'TK',  color: '#00B8D9' },
  { name: 'Jordan Lee',    handle: '@jordanlife',  niche: 'Travel & Adventure',  followers: '3.2M',  avgViews: '420K',  er: '3.9%',  price: '$2,100', platform: 'YT',  color: '#FF0000' },
  { name: 'Aisha Patel',   handle: '@aishacooks',  niche: 'Food & Cooking',      followers: '680K',  avgViews: '78K',   er: '7.3%',  price: '$600',   platform: 'IG',  color: '#E1306C' },
  { name: 'Carlos Mendez', handle: '@carlosgames', niche: 'Gaming',              followers: '2.1M',  avgViews: '350K',  er: '5.5%',  price: '$1,800', platform: 'YT',  color: '#FF0000' },
  { name: 'Emma Walsh',    handle: '@emmabeauty',  niche: 'Beauty & Skincare',   followers: '1.4M',  avgViews: '195K',  er: '4.2%',  price: '$1,100', platform: 'TK',  color: '#00B8D9' },
  { name: 'Dev Anand',     handle: '@devfinance',  niche: 'Finance & Investing', followers: '540K',  avgViews: '62K',   er: '8.1%',  price: '$720',   platform: 'IG',  color: '#E1306C' },
]

const MOCK_CAMPAIGNS = [
  { brand: 'NovaTech',     logo: 'N', category: 'Tech',     payout: '$1,500', applicants: 24, minFollowers: '100K', deadline: 'Jul 15', platform: 'YT', color: '#FF0000' },
  { brand: 'GlowSkin Co.', logo: 'G', category: 'Beauty',   payout: '$800',   applicants: 61, minFollowers: '50K',  deadline: 'Jul 20', platform: 'IG', color: '#E1306C' },
  { brand: 'FitFuel',      logo: 'F', category: 'Fitness',  payout: '$650',   applicants: 18, minFollowers: '80K',  deadline: 'Jul 25', platform: 'TK', color: '#00B8D9' },
  { brand: 'UrbanEats',    logo: 'U', category: 'Food',     payout: '$1,200', applicants: 42, minFollowers: '200K', deadline: 'Aug 1',  platform: 'YT', color: '#FF0000' },
  { brand: 'TravelPulse',  logo: 'T', category: 'Travel',   payout: '$2,000', applicants: 12, minFollowers: '500K', deadline: 'Aug 5',  platform: 'IG', color: '#E1306C' },
  { brand: 'CryptoBase',   logo: 'C', category: 'Finance',  payout: '$900',   applicants: 33, minFollowers: '100K', deadline: 'Jul 30', platform: 'YT', color: '#FF0000' },
  { brand: 'StyleBox',     logo: 'S', category: 'Fashion',  payout: '$550',   applicants: 57, minFollowers: '30K',  deadline: 'Aug 10', platform: 'TK', color: '#00B8D9' },
  { brand: 'MindfulApp',   logo: 'M', category: 'Wellness', payout: '$700',   applicants: 9,  minFollowers: '60K',  deadline: 'Aug 15', platform: 'IG', color: '#E1306C' },
]

const TEAM_MEMBERS = [
  { name: 'Roshan K.P', role: 'CEO & Co-Founder', initials: 'RP', color: '#7c3aed' },
  { name: 'Ritik K.P',  role: 'Head of Product',  initials: 'RK', color: '#2563eb' },
  { name: 'Neha K.J', role: 'Lead Engineer',    initials: 'NJ', color: '#059669' },
]

const PLATFORMS_LIST = [
  { key: 'youtube',   label: 'YouTube',   placeholder: 'youtube.com/@channel' },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/handle' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'tiktok.com/@handle'   },
  { key: 'other',     label: 'Other',     placeholder: 'Channel URL'          },
]
const CO_SIZES  = ['Solo', 'Small (1–10)', 'Medium (11–50)', 'Large (50+)']
const BUDGETS   = ['< $500/mo', '$500–$2K', '$2K–$10K', '$10K+']
const SOC_PLATS = ['YouTube','Instagram','TikTok','Twitter/X','WhatsApp','Facebook','Other']

// ─── Reusable ─────────────────────────────────────────────────
function DInput({ type='text', placeholder, value, onChange, required }: {
  type?: string; placeholder: string; value: string; onChange: (v:string)=>void; required?: boolean
}) {
  return (
    <input type={type} placeholder={placeholder} value={value} required={required}
      onChange={e=>onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none transition"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      onFocus={e => { e.currentTarget.style.border = '1px solid #7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
      onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}
function ErrMsg({ msg }: { msg: string }) {
  return <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 px-3 py-2 rounded-lg">{msg}</p>
}
function SubmitBtn({ loading, label, loadLabel }: { loading: boolean; label: string; loadLabel: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
      {loading ? loadLabel : label}
    </button>
  )
}

// ─── Navbar ────────────────────────────────────────────────────
function Navbar({ onHome, onAbout, onSignIn, onGetStarted, currentPage }: {
  onHome:()=>void; onAbout:()=>void; onSignIn:()=>void; onGetStarted:()=>void; currentPage:string
}) {
  return (
    <nav className="h-16 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30"
      style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>A</div>
        <span className="font-extrabold text-xl text-white tracking-tight">ADMIS</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm">
        <button onClick={onHome}  className={`transition font-medium ${currentPage==='home'  ? 'text-[#a78bfa]' : 'text-gray-500 hover:text-gray-200'}`}>Home</button>
        <button onClick={onAbout} className={`transition font-medium ${currentPage==='about' ? 'text-[#a78bfa]' : 'text-gray-500 hover:text-gray-200'}`}>About Us</button>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSignIn}     className="hidden sm:block text-sm text-gray-400 hover:text-white font-medium transition">Sign in</button>
        <button onClick={onGetStarted} className="text-sm px-4 py-2 text-white rounded-lg font-medium transition"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
          Get started →
        </button>
      </div>
    </nav>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function LandingPage() {
  const [mode,        setMode]        = useState<Mode>('signup')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)
  const [succEmail,   setSuccEmail]   = useState('')
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('creators')
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPw,    setLoginPw]    = useState('')
  const [accountType, setAccountType] = useState<AccountType>('creator')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPw,    setSignupPw]    = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [platform,    setPlatform]    = useState('')
  const [channelUrl,  setChannelUrl]  = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone,       setPhone]       = useState('')
  const [companySize, setCompanySize] = useState('')
  const [budgetRange, setBudgetRange] = useState('')
  const [agencyName,    setAgencyName]    = useState('')
  const [agContactName, setAgContactName] = useState('')
  const [agPhone,       setAgPhone]       = useState('')
  const [agSocPlat,     setAgSocPlat]     = useState('')
  const [agSocHandle,   setAgSocHandle]   = useState('')

  const authRef  = useRef<HTMLDivElement>(null)
  const router   = useRouter()
  const supabase = createClient()

  function scrollToAuth() {
    setCurrentPage('home')
    setTimeout(() => authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
  }
  function switchMode(m: Mode) {
    setMode(m); setError(''); setSuccess(false)
    setTimeout(() => authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw })
    if (error) setError(error.message)
    else { window.location.href = '/' }
    setLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const metadata: Record<string,unknown> = { account_type: accountType }
    if (accountType === 'creator') {
      if (!creatorName.trim()) { setError('Name is required.'); setLoading(false); return }
      if (!platform)           { setError('Select a platform.'); setLoading(false); return }
      if (!channelUrl.trim())  { setError('Channel URL is required.'); setLoading(false); return }
      metadata.full_name = creatorName.trim(); metadata.platform = platform; metadata.channel_url = channelUrl.trim()
    } else if (accountType === 'brand') {
      if (!companyName.trim()) { setError('Company name is required.'); setLoading(false); return }
      if (!contactName.trim()) { setError('Your name is required.'); setLoading(false); return }
      if (!companySize)        { setError('Select company size.'); setLoading(false); return }
      if (!budgetRange)        { setError('Select a budget range.'); setLoading(false); return }
      metadata.company_name = companyName.trim(); metadata.full_name = contactName.trim()
      metadata.phone = phone.trim()||null; metadata.company_size = companySize; metadata.budget_range = budgetRange
    } else {
      if (!agencyName.trim())    { setError('Agency name is required.'); setLoading(false); return }
      if (!agContactName.trim()) { setError('Contact name is required.'); setLoading(false); return }
      if (!agSocPlat || !agSocHandle.trim()) { setError('Add at least one social handle.'); setLoading(false); return }
      metadata.agency_name = agencyName.trim(); metadata.full_name = agContactName.trim()
      metadata.contact_phone = agPhone.trim()||null
      metadata.social_handles = [{ platform: agSocPlat, username: agSocHandle.trim() }]
    }
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail, password: signupPw,
      options: { data: metadata, emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      console.error('[signup] error:', error)
      setError(error.message || error.status?.toString() || JSON.stringify(error) || 'Signup failed — unknown error')
    } else if (data.session) {
      // Use full navigation so the route handler actually runs server-side
      window.location.href = '/auth/callback'
    } else if (data.user) {
      // User created but no session (email confirmation flow)
      setSuccess(true); setSuccEmail(signupEmail)
    } else {
      // signUp returned neither error nor user — likely email already registered
      setError('This email is already registered. Please sign in instead.')
    }
    setLoading(false)
  }

  // ── Auth form ──────────────────────────────────────────────────
  const authForm = (
    <div className="space-y-4">
      <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['signup','login'] as Mode[]).map(m => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(''); setSuccess(false) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${mode===m ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            style={mode===m ? { background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' } : {}}>
            {m==='signup' ? 'Sign up' : 'Sign in'}
          </button>
        ))}
      </div>

      {mode==='login' && (
        <form onSubmit={handleLogin} className="space-y-3">
          <DInput type="email"    placeholder="Email address" value={loginEmail} onChange={setLoginEmail} />
          <DInput type="password" placeholder="Password"      value={loginPw}    onChange={setLoginPw} />
          {error && <ErrMsg msg={error} />}
          <SubmitBtn loading={loading} label="Sign in" loadLabel="Signing in…" />
          <div className="text-right">
            <a href="/forgot-password" className="text-xs text-[#a78bfa] hover:underline">Forgot password?</a>
          </div>
        </form>
      )}

      {mode==='signup' && !success && (
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">I am a…</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key:'creator', icon:'🎬', label:'Creator' },
                { key:'brand',   icon:'🏢', label:'Brand'   },
                { key:'agency',  icon:'🤝', label:'Agency'  },
              ] as {key:AccountType;icon:string;label:string}[]).map(t => (
                <button key={t.key} type="button" onClick={() => setAccountType(t.key)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1 ${
                    accountType===t.key
                      ? 'text-white border-transparent'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={accountType===t.key
                    ? { background:'linear-gradient(135deg,#7c3aed,#5b21b6)', border:'1px solid #7c3aed' }
                    : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-base">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {accountType==='creator' && (
            <div className="space-y-3">
              <DInput placeholder="Your name *" value={creatorName} onChange={setCreatorName} />
              <div>
                <p className="text-xs text-gray-600 mb-2">Platform *</p>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS_LIST.map(p => (
                    <button key={p.key} type="button" onClick={() => setPlatform(p.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${platform===p.key ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      style={platform===p.key
                        ? { background:'#7c3aed', border:'1px solid #7c3aed' }
                        : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {platform && <DInput placeholder={`Channel URL * (${PLATFORMS_LIST.find(p=>p.key===platform)?.placeholder})`} value={channelUrl} onChange={setChannelUrl} />}
            </div>
          )}

          {accountType==='brand' && (
            <div className="space-y-3">
              <DInput placeholder="Company / Brand name *" value={companyName} onChange={setCompanyName} />
              <DInput placeholder="Your name *" value={contactName} onChange={setContactName} />
              <DInput type="tel" placeholder="Phone (optional)" value={phone} onChange={setPhone} />
              <div>
                <p className="text-xs text-gray-600 mb-2">Company size *</p>
                <div className="flex flex-wrap gap-1.5">
                  {CO_SIZES.map(s => (
                    <button key={s} type="button" onClick={() => setCompanySize(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${companySize===s ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      style={companySize===s
                        ? { background:'#db2777', border:'1px solid #db2777' }
                        : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2">Monthly budget *</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGETS.map(b => (
                    <button key={b} type="button" onClick={() => setBudgetRange(b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${budgetRange===b ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      style={budgetRange===b
                        ? { background:'#db2777', border:'1px solid #db2777' }
                        : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {accountType==='agency' && (
            <div className="space-y-3">
              <DInput placeholder="Agency name *" value={agencyName} onChange={setAgencyName} />
              <DInput placeholder="Your name *"   value={agContactName} onChange={setAgContactName} />
              <DInput type="tel" placeholder="Phone / WhatsApp (optional)" value={agPhone} onChange={setAgPhone} />
              <div>
                <p className="text-xs text-gray-600 mb-2">Social presence *</p>
                <div className="flex gap-2">
                  <select value={agSocPlat} onChange={e=>setAgSocPlat(e.target.value)}
                    className="w-32 px-2 py-2 rounded-lg text-xs text-gray-300 focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">Platform</option>
                    {SOC_PLATS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={agSocHandle} onChange={e=>setAgSocHandle(e.target.value)}
                    placeholder="@username or URL"
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-1" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <DInput type="email"    placeholder="Email address *"         value={signupEmail} onChange={setSignupEmail} required />
            <DInput type="password" placeholder="Password (min. 8 chars)" value={signupPw}    onChange={setSignupPw}    required />
          </div>

          {error && <ErrMsg msg={error} />}
          <SubmitBtn loading={loading} label="Create account →" loadLabel="Creating account…" />
        </form>
      )}

      {mode==='signup' && success && (
        <div className="text-center space-y-4 py-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)' }}>
            <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Verification link sent to<br /><strong className="text-white">{succEmail}</strong>
          </p>
          <button onClick={()=>{setMode('login');setError('');setSuccess(false)}} className="text-sm text-[#a78bfa] hover:underline">Back to sign in</button>
        </div>
      )}

      {!(mode==='signup' && success) && (
        <div className="pt-3" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-center text-xs text-gray-600">
            By continuing you agree to our{' '}
            <button onClick={()=>setCurrentPage('about')} className="text-[#a78bfa] hover:underline">Terms & Conditions</button>
            {' '}and{' '}
            <button onClick={()=>setCurrentPage('about')} className="text-[#a78bfa] hover:underline">Privacy Policy</button>.
          </p>
          <div className="mt-3 rounded-lg p-3 text-xs text-gray-700 leading-relaxed space-y-1"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <p>• Your data is kept strictly internal — never sold.</p>
            <p>• You retain full ownership of your content.</p>
            <p>• Campaign data is visible only to relevant parties.</p>
          </div>
        </div>
      )}
    </div>
  )

  // ── About Us ──────────────────────────────────────────────────
  if (currentPage === 'about') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background:'#0a0a14', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
        <Navbar onHome={()=>setCurrentPage('home')} onAbout={()=>setCurrentPage('about')}
          onSignIn={()=>{setCurrentPage('home');setTimeout(()=>switchMode('login'),100)}}
          onGetStarted={()=>{setCurrentPage('home');setTimeout(()=>switchMode('signup'),100)}}
          currentPage={currentPage} />
        <main className="flex-1 px-6 lg:px-24 py-16 max-w-4xl mx-auto w-full">
          <span className="inline-block text-xs font-semibold text-[#a78bfa] px-3 py-1 rounded-full mb-4"
            style={{ background:'rgba(124,58,237,0.15)' }}>About ADMIS</span>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Connecting Creators &amp;<br /><span className="text-[#a78bfa]">Brands Globally</span>
          </h1>
          <p className="text-gray-400 text-base max-w-xl leading-relaxed mb-14">
            ADMIS is an influencer marketing platform built for the next generation of creators and forward-thinking brands.
          </p>

          <section className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { step:'01', icon:'🔍', title:'Discover', desc:'Brands post campaigns. Creators browse and apply to those that match their niche and audience.' },
                { step:'02', icon:'🤝', title:'Connect',  desc:'Brands review applications, negotiate deals, and onboard creators via built-in messaging.' },
                { step:'03', icon:'📈', title:'Grow',     desc:'Track analytics, manage deliverables, handle payments, and measure ROI — all in one place.' },
              ].map(item => (
                <div key={item.step} className="rounded-2xl p-6"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-bold text-[#a78bfa] px-2 py-0.5 rounded-full"
                      style={{ background:'rgba(124,58,237,0.2)' }}>Step {item.step}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="text-xl font-bold text-white mb-2">Meet the Team</h2>
            <p className="text-gray-600 text-sm mb-6">The people building the future of influencer marketing.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {TEAM_MEMBERS.map(m => (
                <div key={m.name} className="rounded-2xl p-6 text-center"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                    style={{ background:m.color }}>
                    {m.initials}
                  </div>
                  <div className="font-semibold text-white text-sm">{m.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.role}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6">Terms &amp; Conditions</h2>
            <div className="rounded-2xl p-8 space-y-6 text-sm text-gray-500 leading-relaxed"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              {[
                ['1. Data Privacy', 'All data you share with ADMIS — personal information, campaign data, financial information, and communications — is kept strictly internal. We do not sell, rent, or share your personal data with third parties without your explicit consent, except as required by law.'],
                ['2. Content Ownership', 'You retain full ownership of all content you upload or create on ADMIS. By uploading, you grant ADMIS a limited, non-exclusive license to display and process your content solely for operating the platform.'],
                ['3. Campaign Data', 'Campaign information, applications, deal terms, and communications are visible only to the specific brand and creator parties involved. ADMIS staff may access this data only for support or legal compliance.'],
                ['4. Aggregated Analytics', 'ADMIS may use anonymised, aggregated data to generate platform statistics and improve features. No individual-level data is exposed in these analytics.'],
                ['5. Account Security', 'You are responsible for maintaining the confidentiality of your credentials. ADMIS will never ask for your password. Report any suspected unauthorised access immediately.'],
                ['6. Acceptable Use', 'You agree not to post misleading or harmful content, impersonate other users, engage in spam, or violate any applicable laws or regulations.'],
                ['7. Payments & Disputes', 'Disputes between creators and brands should first be resolved through ADMIS built-in messaging and mediation tools.'],
              ].map(([title, body]) => (
                <div key={title as string}>
                  <h3 className="text-white font-semibold mb-1.5 text-sm">{title}</h3>
                  <p>{body}</p>
                </div>
              ))}
              <p className="text-gray-700 text-xs">Last updated: June 2026 · support@admis.io</p>
            </div>
          </section>

          <div className="text-center rounded-2xl py-10 px-6"
            style={{ background:'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(91,33,182,0.1))', border:'1px solid rgba(124,58,237,0.25)' }}>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to get started?</h2>
            <p className="text-gray-500 text-sm mb-6">Join thousands of creators and brands on ADMIS.</p>
            <button onClick={()=>{setCurrentPage('home');setTimeout(scrollToAuth,150)}}
              className="px-8 py-3 text-white font-semibold rounded-xl text-sm transition"
              style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
              Create your account →
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Home page ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background:'#0a0a14', color:'#fff', fontFamily:'system-ui,sans-serif' }}>

      <Navbar onHome={()=>setCurrentPage('home')} onAbout={()=>setCurrentPage('about')}
        onSignIn={()=>switchMode('login')} onGetStarted={()=>switchMode('signup')} currentPage={currentPage} />

      <div className="flex">
        {/* ── Left: main content ── */}
        <div className="flex-1 min-w-0">

          {/* ── HERO ── */}
          <section className="px-8 lg:px-14 pt-16 pb-12">
            <span className="inline-block text-xs font-semibold text-[#a78bfa] px-3 py-1 rounded-full mb-5"
              style={{ background:'rgba(124,58,237,0.15)' }}>
              #1 Influencer Marketing Platform
            </span>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5">
              Where Creators &amp;<br />
              <span style={{ background:'linear-gradient(135deg,#a78bfa,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                Sponsors Meet
              </span>
            </h1>
            <p className="text-base text-gray-500 max-w-md mb-10 leading-relaxed">
              Discover verified creators, launch campaigns, and measure real results — all in one platform built for speed.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mb-10">
              {STATS.map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-white">{s.value}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Platform badges + feature pills on same row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600 mr-1">Works with</span>
              {[
                { name:'TikTok',    bg:'#00B8D9', fg:'#000' },
                { name:'Instagram', bg:'#E1306C', fg:'#fff' },
                { name:'YouTube',   bg:'#FF0000', fg:'#fff' },
              ].map(p => (
                <span key={p.name} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background:p.bg, color:p.fg }}>{p.name}</span>
              ))}
              <span className="mx-2 text-gray-800">·</span>
              {FEATURES.map(f => (
                <button key={f.title} type="button" onClick={scrollToAuth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:text-white transition"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                  <span>{f.icon}</span> {f.title}
                </button>
              ))}
            </div>
          </section>

          {/* ── DISCOVER ── */}
          <section className="px-8 lg:px-14 pb-16">

            {/* Section header + toggle */}
            <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
              <h2 className="text-base font-semibold text-white">Discover</h2>
              <div className="flex rounded-full p-1 gap-0.5" style={{ background:'rgba(255,255,255,0.06)' }}>
                <button
                  onClick={()=>setDiscoverTab('creators')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${discoverTab==='creators' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  style={discoverTab==='creators' ? { background:'linear-gradient(135deg,#7c3aed,#5b21b6)' } : {}}>
                  I&apos;m a Brand
                </button>
                <button
                  onClick={()=>setDiscoverTab('brands')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${discoverTab==='brands' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  style={discoverTab==='brands' ? { background:'linear-gradient(135deg,#7c3aed,#5b21b6)' } : {}}>
                  I&apos;m a Creator
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-5">
              {discoverTab==='creators' ? 'Showing verified creators open to brand partnerships' : 'Showing open campaigns from brands looking for creators'}
            </p>

            {/* Creator list */}
            {discoverTab==='creators' && (
              <div className="space-y-2">
                {MOCK_CREATORS.map((c, i) => (
                  <div key={c.name}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:opacity-90 transition cursor-default"
                    style={{ background: i%2===0 ? 'rgba(255,255,255,0.03)' : 'transparent', border:'1px solid rgba(255,255,255,0.04)' }}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                      style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                      {c.name.charAt(0)}
                    </div>
                    {/* Name + niche */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{c.name}</span>
                        <span className="text-xs text-gray-600 truncate hidden sm:block">{c.handle}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden md:block"
                          style={{ background:'rgba(255,255,255,0.06)', color:'#9ca3af' }}>{c.niche}</span>
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-5 text-right flex-shrink-0">
                      <div>
                        <div className="text-xs font-bold text-white">{c.followers}</div>
                        <div className="text-xs text-gray-700">followers</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#a78bfa]">{c.er}</div>
                        <div className="text-xs text-gray-700">eng. rate</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-yellow-400">{c.price}</div>
                        <div className="text-xs text-gray-700">per video</div>
                      </div>
                    </div>
                    {/* Platform badge */}
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background:c.color }}>
                      {c.platform}
                    </span>
                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={scrollToAuth}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition"
                        style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                        Message
                      </button>
                      <button onClick={scrollToAuth}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition hidden sm:block"
                        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                        Bid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Campaign list */}
            {discoverTab==='brands' && (
              <div className="space-y-2">
                {MOCK_CAMPAIGNS.map((c, i) => (
                  <div key={c.brand}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:opacity-90 transition cursor-default"
                    style={{ background: i%2===0 ? 'rgba(255,255,255,0.03)' : 'transparent', border:'1px solid rgba(255,255,255,0.04)' }}>
                    {/* Logo */}
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                      style={{ background:c.color }}>
                      {c.logo}
                    </div>
                    {/* Brand + category */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">{c.brand}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:block"
                          style={{ background:'rgba(255,255,255,0.06)', color:'#9ca3af' }}>{c.category}</span>
                      </div>
                    </div>
                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-5 text-right flex-shrink-0">
                      <div>
                        <div className="text-xs font-bold text-yellow-400">{c.payout}</div>
                        <div className="text-xs text-gray-700">payout</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{c.minFollowers}</div>
                        <div className="text-xs text-gray-700">min followers</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-300">{c.applicants}</div>
                        <div className="text-xs text-gray-700">applicants</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{c.deadline}</div>
                        <div className="text-xs text-gray-700">deadline</div>
                      </div>
                    </div>
                    {/* Platform */}
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background:c.color }}>
                      {c.platform}
                    </span>
                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={scrollToAuth}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition"
                        style={{ background:'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                        Apply
                      </button>
                      <button onClick={scrollToAuth}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition hidden sm:block"
                        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-700 text-center mt-5">
              Sign up to see full profiles, contact creators, and apply to campaigns.{' '}
              <button onClick={scrollToAuth} className="text-[#a78bfa] hover:underline font-medium">Get started →</button>
            </p>
          </section>

          {/* Mobile auth form */}
          <div ref={authRef} className="lg:hidden px-8 pb-16 pt-8" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-2xl font-bold text-white mb-1">{mode==='signup' ? 'Create your account' : 'Welcome back'}</h2>
            {mode==='signup' && !success && <p className="text-sm text-gray-600 mb-5">No credit card needed.</p>}
            {authForm}
          </div>
        </div>

        {/* ── Right: auth panel — same background, subtle divider ── */}
        <aside ref={authRef}
          className="hidden lg:flex w-[420px] flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto items-start justify-center p-8"
          style={{ borderLeft:'1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-full max-w-xs py-4">
            <h2 className="text-xl font-bold text-white mb-1">{mode==='signup' ? 'Create your account' : 'Welcome back'}</h2>
            {mode==='signup' && !success && <p className="text-xs text-gray-600 mb-5">No credit card needed.</p>}
            {authForm}
          </div>
        </aside>
      </div>
    </div>
  )
}
