/**
 * POST /api/upload
 * Upload a verification file (screenshot or ID proof) to Supabase Storage.
 * Returns the public-accessible URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    const fileType  = (formData.get('type') as string) ?? 'screenshot' // 'screenshot' | 'id_proof'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, WEBP, HEIC, or PDF files are accepted.' },
        { status: 400 }
      )
    }

    const maxBytes = 10 * 1024 * 1024  // 10 MB
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 400 })
    }

    const ext      = file.name.split('.').pop() ?? 'jpg'
    const path     = `${fileType}/${user.id}/${Date.now()}.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabase.storage
      .from('verifications')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadErr) throw uploadErr

    // Generate a signed URL valid for 7 days (admin review window)
    const { data: signed } = await supabase.storage
      .from('verifications')
      .createSignedUrl(path, 60 * 60 * 24 * 7)

    return NextResponse.json({
      success: true,
      path,
      url: signed?.signedUrl ?? null,
    })
  } catch (err: unknown) {
    console.error('[upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
