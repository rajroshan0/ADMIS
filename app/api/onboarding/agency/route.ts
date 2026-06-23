import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerAgency } from '@/lib/services/agency-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { agencyName, contactName, contactPhone, socialHandles, initialChannels } = body

    if (!agencyName?.trim())  return NextResponse.json({ error: 'Agency name is required' }, { status: 400 })
    if (!contactName?.trim()) return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
    if (!socialHandles?.length) return NextResponse.json({ error: 'At least one social handle is required' }, { status: 400 })

    const { agencyId } = await registerAgency({
      userId:          user.id,
      name:            agencyName.trim(),
      contactName:     contactName.trim(),
      contactEmail:    user.email ?? '',
      contactPhone:    contactPhone?.trim() || undefined,
      socialHandles,
      initialChannels: initialChannels ?? [],
    })

    return NextResponse.json({
      success: true,
      agencyId,
      message: 'Agency profile created. Submit your ID proof from your dashboard to get verified.',
    })
  } catch (err: unknown) {
    console.error('[onboarding/agency]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 }
    )
  }
}
