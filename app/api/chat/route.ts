import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ─── In-memory conversation history (keyed by sessionId) ──────────────────────
const sessionHistory = new Map<string, { role: 'user' | 'assistant'; content: string }[]>()

// ─── Groq API helper ───────────────────────────────────────────────────────────
async function callGroq(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { maxTokens?: number; jsonMode?: boolean } = {},
): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY is not configured')

  const body: Record<string, unknown> = {
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: 0.2,
  }
  if (opts.jsonMode) body.response_format = { type: 'json_object' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000) // 30s hard timeout

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Groq API timed out after 30s')
    throw new Error(`Groq network error: ${err.message}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error')
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Database schema context ───────────────────────────────────────────────────
function buildSystemPrompt(brandId: string, brandName: string): string {
  return `You are ADMIS Assistant — an AI data analyst embedded in the brand dashboard for "${brandName}".
Help brand managers understand their influencer marketing data by writing safe SQL queries.

BRAND ID (always scope every query to this): '${brandId}'

═══ EXACT SCHEMA (use only these columns) ═══

campaigns
  id uuid, brand_id uuid, title text, deal_type text, payout_model text,
  payout_amount numeric, commission_pct numeric, currency text,
  platforms text[], deadline date, slots int, applicants_count int,
  budget_total numeric, status campaign_status, created_at timestamptz, updated_at timestamptz
  status ENUM → draft | open | paused | closed | filled
  ("active campaigns" means status = 'open')

campaign_applications   ← NO updated_at column
  id uuid, campaign_id uuid, creator_id uuid, status application_status,
  bid_amount numeric, message text, created_at timestamptz,
  assigned_to uuid, conversation_id uuid
  status ENUM → applied | shortlisted | accepted | rejected | withdrawn
  ("pending applications" means status IN ('applied','shortlisted'))
  ALWAYS join to campaigns: JOIN campaigns c ON ca.campaign_id = c.id AND c.brand_id = '${brandId}'

deals
  id uuid, application_id uuid, campaign_id uuid, brand_id uuid, creator_id uuid,
  price numeric, final_price numeric, currency text, status deal_status,
  deadline date, created_at timestamptz, updated_at timestamptz,
  channel text, delivery_type delivery_type, deliverables_count int,
  conditions text, contact_name text, contact_role text, contact_value text,
  assigned_to uuid, channel_link text, promo_code text,
  payment_status payment_status, payment_details jsonb
  deal_status ENUM → active | submitted | approved | completed | cancelled | disputed
  payment_status ENUM → requested | processing | paid | failed | refunded
  ("pending deals" means status IN ('active','submitted'))

brand_tasks
  id uuid, brand_id uuid, assigned_to uuid, created_by uuid, title text,
  description text, department text, status text, priority text,
  due_date date, created_at timestamptz, updated_at timestamptz
  status ∈ todo | in_progress | done
  priority ∈ low | medium | high | urgent

brand_members
  id uuid, brand_id uuid, user_id uuid, role text, invited_by uuid,
  joined_at timestamptz, department text

creators
  id uuid, username text, full_name text, platform text,
  followers bigint, subscribers bigint, engagement_rate numeric,
  avg_likes numeric, views bigint, geo_country text, geo_city text,
  account_category text, is_verified bool, price_per_post numeric
  engagement_rate stored as decimal (0.05 = 5%)

profiles
  id uuid, display_name text, role text, email text

═══ STRICT SQL RULES ═══
1. Always WHERE brand_id = '${brandId}' for campaigns / deals / brand_tasks / brand_members
2. For campaign_applications always JOIN campaigns with brand_id filter (no direct brand_id on applications)
3. SELECT only — no INSERT / UPDATE / DELETE / DROP / ALTER / CREATE
4. LIMIT 20 unless user asks for more
5. Use readable AS aliases
6. Map user intent to real enum values (e.g. "pending" → 'applied'/'shortlisted' for apps, 'active'/'submitted' for deals)
7. "active campaigns" = status = 'open' (NOT 'active')

═══ RESPONSE FORMAT ═══
Return ONLY valid JSON with these two keys — no extra text:
{
  "sql": "SELECT ... (full valid SQL) or empty string if no SQL needed",
  "intent": "one-sentence plain English description of what the query answers"
}`
}

// ─── Execute SQL via Supabase RPC ──────────────────────────────────────────────
async function runSQL(sql: string, brandId: string): Promise<{ rows: unknown[]; error?: string }> {
  if (!sql.trim()) return { rows: [] }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await svc.rpc('execute_brand_query', {
    p_sql: sql.trim().replace(/;$/, ''),
    p_brand_id: brandId,
  })

  if (error) return { rows: [], error: error.message }

  // data is a JSON array (from the RPC's json_agg)
  const rows = Array.isArray(data) ? data : (typeof data === 'string' ? JSON.parse(data) : [])
  return { rows }
}

// ─── POST /api/chat ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { message?: string; sessionId?: string }
    const message   = body.message?.trim()
    const sessionId = body.sessionId ?? user.id
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // ── Resolve brand context ──────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .single()

    const role    = profile?.role ?? ''
    const isAdmin = role === 'admin' || role === 'owner'
    let brandId   = ''
    let brandName = 'your brand'

    if (role === 'brand') {
      const { data: brand } = await supabase
        .from('brands').select('id, name').eq('owner_id', user.id).single()
      brandId   = brand?.id   ?? ''
      brandName = brand?.name ?? 'your brand'
    } else if (role === 'member') {
      const { data: mem } = await supabase
        .from('brand_members')
        .select('brand_id, brands(name)')
        .eq('user_id', user.id)
        .single()
      brandId   = (mem as any)?.brand_id        ?? ''
      brandName = (mem as any)?.brands?.name    ?? 'your brand'
    } else if (isAdmin) {
      // Admin: use first brand in DB (or let them specify later)
      const { data: brand } = await supabase
        .from('brands').select('id, name').limit(1).single()
      brandId   = brand?.id   ?? ''
      brandName = brand?.name ?? 'all brands'
    }

    if (!brandId) {
      return NextResponse.json({
        answer: "I couldn't find a brand linked to your account. Check your profile setup.",
        sql: '',
      })
    }

    // ── Build conversation history ─────────────────────────────────────────────
    const history = sessionHistory.get(sessionId) ?? []

    // ── Step 1: Ask Groq for SQL ───────────────────────────────────────────────
    const sqlResponse = await callGroq(
      [
        { role: 'system', content: buildSystemPrompt(brandId, brandName) },
        ...history.slice(-8),
        { role: 'user', content: message },
      ],
      { maxTokens: 1024, jsonMode: true },
    )

    let sqlParsed: { sql: string; intent: string } = { sql: '', intent: '' }
    try { sqlParsed = JSON.parse(sqlResponse) } catch { /* no SQL */ }

    // ── Step 2: Execute SQL ────────────────────────────────────────────────────
    let rows: unknown[]     = []
    let queryError: string  = ''

    if (sqlParsed.sql?.trim()) {
      const result = await runSQL(sqlParsed.sql, brandId)
      rows       = result.rows
      queryError = result.error ?? ''
    }

    // ── Step 3: Groq formats the final answer ─────────────────────────────────
    let dataSection: string
    if (queryError) {
      dataSection = `The database query failed with error: "${queryError}". Do not make up data. Tell the user the query failed and suggest they rephrase.`
    } else if (rows.length > 0) {
      dataSection = `Query returned ${rows.length} row(s):\n${JSON.stringify(rows, null, 2)}`
    } else if (sqlParsed.sql) {
      dataSection = `The query ran successfully but returned 0 rows. This means there is genuinely no data matching the criteria. State this directly — do NOT say the system can't recognise a status or that there's a glitch. Just say there are no matching records.`
    } else {
      dataSection = sqlParsed.intent ?? 'No SQL was needed for this question.'
    }

    const answerPrompt = `You are ADMIS Assistant for the brand "${brandName}".

User question: "${message}"

Data result: ${dataSection}

Instructions:
- Be concise and direct (2-4 sentences max)
- Format numbers with K/M suffixes for large values
- If 0 results: say clearly there are none, don't apologise or blame the system
- If query failed: say you had trouble and ask them to rephrase
- Never mention SQL, databases, queries, or technical internals
- Don't say "I'm here to help" or add filler phrases`

    const answer = await callGroq(
      [{ role: 'user', content: answerPrompt }],
      { maxTokens: 600 },
    )

    // ── Update history ─────────────────────────────────────────────────────────
    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: answer })
    if (history.length > 20) history.splice(0, 2)
    sessionHistory.set(sessionId, history)

    return NextResponse.json({ answer, sql: sqlParsed.sql ?? '' })
  } catch (err: any) {
    console.error('[/api/chat]', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}

// ─── DELETE /api/chat?sessionId=xxx  — clear conversation ─────────────────────
export async function DELETE(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sessionId') ?? ''
  if (sid) sessionHistory.delete(sid)
  return NextResponse.json({ ok: true })
}
