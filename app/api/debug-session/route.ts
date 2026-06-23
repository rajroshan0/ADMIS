import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: userFromGet } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  const cookies = req.cookies.getAll().map(c => c.name)
  return NextResponse.json({
    cookies,
    sessionUser: session?.user?.email ?? null,
    getUser: userFromGet?.email ?? null,
  })
}
