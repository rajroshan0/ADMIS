/**
 * POST /api/verify/youtube
 * Checks a YouTube channel description for the verification code via YouTube Data API.
 * On success: marks the handle as verified + creates an approved verification_request.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveChannelId, checkVerificationCode } from '@/lib/services/youtube-service'
import { approveVerification, createVerificationRequest } from '@/lib/services/verification-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { channelUrl, verificationCode, creatorId, handleId } = await req.json()

    if (!channelUrl)       return NextResponse.json({ error: 'channelUrl is required' }, { status: 400 })
    if (!verificationCode) return NextResponse.json({ error: 'verificationCode is required' }, { status: 400 })
    if (!creatorId)        return NextResponse.json({ error: 'creatorId is required' }, { status: 400 })

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured. Contact support.' },
        { status: 503 }
      )
    }

    // Resolve channel ID from URL
    const channelId = await resolveChannelId(channelUrl)
    if (!channelId) {
      return NextResponse.json(
        { error: 'Could not find this YouTube channel. Check the URL and try again.' },
        { status: 404 }
      )
    }

    // Check if verification code is in the description
    const { found, channel } = await checkVerificationCode(channelId, verificationCode)

    if (!found) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: `Code "${verificationCode}" not found in channel description. Make sure you pasted it exactly and saved your channel, then try again.`,
        channelTitle: channel?.title ?? null,
      })
    }

    // Code found → create + immediately approve a verification request
    const vReq = await createVerificationRequest({
      userId:           user.id,
      entityType:       'creator',
      entityId:         creatorId,
      platform:         'youtube',
      verificationType: 'api',
      verificationCode,
      channelUrl,
    })

    await approveVerification(vReq.id, user.id, 'Auto-verified via YouTube Data API')

    // Update creator_social_handles if handleId provided
    if (handleId) {
      await supabase
        .from('creator_social_handles')
        .update({
          verification_status: 'verified',
          verified_at:         new Date().toISOString(),
          username:            channel?.customUrl ?? undefined,
          followers:           channel?.subscriberCount ?? undefined,
        })
        .eq('id', handleId)
    }

    return NextResponse.json({
      success:      true,
      verified:     true,
      channelTitle: channel?.title,
      subscribers:  channel?.subscriberCount,
      message:      `✓ Channel "${channel?.title}" verified successfully!`,
    })
  } catch (err: unknown) {
    console.error('[verify/youtube]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
