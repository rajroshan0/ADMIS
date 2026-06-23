import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json()
    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Admin client to create user + bypass RLS
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Validate the invite token
    const { data: invite, error: invErr } = await adminSupabase
      .from('team_invites')
      .select('id, email, role, department, entity_id, entity_type, brand_name, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle()

    if (invErr || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Invite already used' }, { status: 409 })
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
    }

    // 2. Check if user already exists with this email
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === invite.email)

    let userId: string

    if (existing) {
      // Existing user — just use their ID (they'll sign in normally)
      userId = existing.id
    } else {
      // 3. Create new auth user
      const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,   // skip email verification for invited members
        user_metadata: { display_name: name }
      })
      if (createErr || !newUser.user) {
        return NextResponse.json({ error: createErr?.message ?? 'Failed to create user' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // 4. Upsert profile with member role
    await adminSupabase.from('profiles').upsert({
      id: userId,
      display_name: name,
      role: 'member',
    }, { onConflict: 'id' })

    // 5. Create brand_members row (upsert to avoid duplicates)
    if (invite.entity_type === 'brand') {
      await adminSupabase.from('brand_members').upsert({
        brand_id: invite.entity_id,
        user_id: userId,
        role: invite.role ?? 'member',
        department: invite.department,
        joined_at: new Date().toISOString()
      }, { onConflict: 'brand_id,user_id' })
    }

    // 6. Mark invite as accepted
    await adminSupabase.from('team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    // 7. Sign in the new user so they have a session
    if (!existing) {
      const supabase = await createClient()
      await supabase.auth.signInWithPassword({ email: invite.email, password })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
