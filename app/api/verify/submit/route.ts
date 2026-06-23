/**
 * POST /api/verify/submit
 * Submit a manual verification request (screenshot or ID proof).
 * Used for Instagram/TikTok creators, brands, and agencies.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createVerificationRequest } from '@/lib/services/verification-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      entityType,      // 'creator' | 'brand' | 'agency'
      entityId,
      platform,        // 'instagram' | 'tiktok' | 'website' | 'id_proof'
      verificationType, // 'screenshot' | 'id_proof' | 'manual'
      verificationCode,
      channelUrl,
      screenshotUrl,   // URL from Supabase Storage after upload
      idProofUrl,
    } = body

    if (!entityType || !entityId || !verificationType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (verificationType === 'screenshot' && !screenshotUrl) {
      return NextResponse.json({ error: 'Screenshot URL is required' }, { status: 400 })
    }
    if (verificationType === 'id_proof' && !idProofUrl) {
      return NextResponse.json({ error: 'ID proof URL is required' }, { status: 400 })
    }

    // Update profile verification_status to 'pending' right away
    await supabase
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', user.id)

    const vReq = await createVerificationRequest({
      userId:           user.id,
      entityType,
      entityId,
      platform,
      verificationType,
      verificationCode,
      channelUrl,
      screenshotUrl,
      idProofUrl,
    })

    return NextResponse.json({
      success:   true,
      requestId: vReq.id,
      message:   'Verification request submitted. Our team will review it within 24 hours.',
    })
  } catch (err: unknown) {
    console.error('[verify/submit]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Submission failed' },
      { status: 500 }
    )
  }
}
