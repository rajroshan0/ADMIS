import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { registerBrand } from '@/lib/services/brand-service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { companyName, contactName, phone, website, companySize, budgetRange } = body

    if (!companyName?.trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    if (!contactName?.trim()) return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
    if (!companySize)         return NextResponse.json({ error: 'Company size is required' }, { status: 400 })
    if (!budgetRange)         return NextResponse.json({ error: 'Budget range is required' }, { status: 400 })

    // Check if brand record already exists — don't create a duplicate
    const admin = createAdminClient()
    const { data: existingBrand } = await admin
      .from('brands')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existingBrand) {
      return NextResponse.json({ success: true, brandId: existingBrand.id, message: 'Brand already exists.' })
    }

    const { brandId } = await registerBrand({
      userId:      user.id,
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email:       user.email ?? '',
      phone:       phone?.trim() || undefined,
      website:     website?.trim() || undefined,
      companySize,
      budgetRange,
    })

    return NextResponse.json({
      success: true,
      brandId,
      message: 'Brand profile created. Our team will verify your account within 24-48 hours.',
    })
  } catch (err: unknown) {
    console.error('[onboarding/brand]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 }
    )
  }
}
