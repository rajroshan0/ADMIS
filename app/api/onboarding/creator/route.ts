import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findCreatorByChannel, claimCreator, registerNewCreator } from '@/lib/services/creator-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { fullName, handles } = body as {
      fullName: string
      handles: Array<{ platform: string; channelUrl: string; followers?: number }>
    }

    if (!fullName?.trim())    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!handles?.length)     return NextResponse.json({ error: 'At least one platform handle is required' }, { status: 400 })

    const primary = handles[0]
    if (!primary.platform)    return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    if (!primary.channelUrl?.trim()) return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })

    // Check if primary channel already exists in DB (scraped data claim)
    const existing = await findCreatorByChannel(primary.platform, primary.channelUrl)

    let creatorId: string
    let verificationCodes: Record<string, string>
    let isExistingChannel = false

    if (existing) {
      const result = await claimCreator(existing.id, user.id)
      creatorId          = existing.id
      verificationCodes  = { [primary.platform]: result.verificationCode }
      isExistingChannel  = true
      // TODO: also add additional handles for claimed channels
    } else {
      const result = await registerNewCreator({
        userId:   user.id,
        fullName: fullName.trim(),
        handles:  handles.map(h => ({
          platform:   h.platform,
          channelUrl: h.channelUrl.trim(),
          followers:  h.followers ? Number(h.followers) : undefined,
        })),
      })
      creatorId         = result.creatorId
      verificationCodes = result.verificationCodes
    }

    return NextResponse.json({
      success:           true,
      creatorId,
      verificationCodes,
      // backward-compat: primary code
      verificationCode:  verificationCodes[primary.platform],
      isExistingChannel,
      handles:           handles.length,
      message: isExistingChannel
        ? 'Channel found in our database. Please verify ownership.'
        : `Profile created with ${handles.length} platform(s). Verify each channel to unlock all features.`,
    })
  } catch (err: unknown) {
    console.error('[onboarding/creator]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 }
    )
  }
}
