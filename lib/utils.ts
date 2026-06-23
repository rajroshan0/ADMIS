// ─── Shared design tokens ──────────────────────────────────────
export const T = {
  bg: '#090c12', side: '#0b0e16', card: '#10141e', cardHov: '#141926',
  elev: '#161b28', border: '#1d2433',
  text: '#f3f5f8', dim: '#98a2b3', faint: '#5e6a7d',
  green: '#4ade80', amber: '#f5a623', red: '#f4574d',
  purple: '#5710fc', purpleL: '#7c3aed',
}

export const PLAT_COLORS: Record<string, string> = {
  youtube: '#ff3b30', instagram: '#ec4899', tiktok: '#25e0d6',
  twitter: '#1d9bf0', linkedin: '#0a66c2', facebook: '#1877f2',
}

export const PLAT_CFG = {
  youtube:   { label: 'YouTube',   c: '#ff3b30', g: 'linear-gradient(90deg,#ff3b30,#ff7a18)' },
  instagram: { label: 'Instagram', c: '#ec4899', g: 'linear-gradient(90deg,#ec4899,#a855f7)' },
  tiktok:    { label: 'TikTok',    c: '#25e0d6', g: 'linear-gradient(90deg,#25e0d6,#2dd4bf)' },
} as const

export const DEAL_COLORS: Record<string, string> = {
  paid_post: '#6b7dff', affiliate: '#f5a623', gifting: '#4ade80', ambassador: '#a78bfa',
}
export const DEAL_LABELS: Record<string, string> = {
  paid_post: 'Paid Post', affiliate: 'Affiliate', gifting: 'Gifting', ambassador: 'Ambassador',
}

export const STATUS_COLORS: Record<string, string> = {
  open:   '#4ade80', draft:  '#f5a623', paused: '#6b7dff',
  closed: '#f4574d', filled: '#a78bfa',
}

// ─── Number formatters ─────────────────────────────────────────
export function fmt(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (!v || isNaN(v)) return '—'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return Math.round(v / 1_000) + 'K'
  return Math.round(v).toString()
}

export function fmtEng(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (!v || isNaN(v)) return '—'
  return v.toFixed(1) + '%'
}

export function fmtMoney(n: number | null | undefined): string {
  if (!n) return '—'
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return `$${n}`
}

export function fmtBudget(
  payout: number | null | undefined,
  total: number | null | undefined,
  model: string | null | undefined
): string {
  if (model === 'commission') return 'Commission-based'
  const v = payout ?? total
  return v ? fmtMoney(v) : 'Negotiable'
}

// ─── Date helpers ──────────────────────────────────────────────
export function daysLeft(d: string | null | undefined): string {
  if (!d) return '—'
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return 'Closed'
  if (diff === 0) return 'Today'
  return diff === 1 ? '1 day left' : `${diff} days left`
}

export function daysColor(d: string | null | undefined): string {
  if (!d) return T.faint
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
  return diff < 0 ? T.red : diff <= 3 ? T.amber : T.green
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Creator helpers ───────────────────────────────────────────
export function creatorInitials(fullName: string | null, username: string | null): string {
  return ((fullName || username || '?').replace('@', '').slice(0, 2).toUpperCase())
}

export function creatorScore(followers: number, engagementRate: number): number {
  const fs = followers > 0 ? Math.min(55, (Math.log10(Math.max(followers, 100)) / 7) * 55) : 0
  const es = Math.min(45, (Math.min(engagementRate, 20) / 20) * 45)
  return Math.round(fs + es)
}

export function scoreColor(s: number): string {
  return s >= 80 ? T.green : s >= 60 ? T.amber : T.red
}

// ─── CSS helper ────────────────────────────────────────────────
export function chipStyle(
  active: boolean,
  borderC: string,
  bgC: string,
  textC: string
): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? borderC : T.border}`,
    background: active ? bgC : 'transparent',
    color: active ? textC : T.dim,
  }
}
