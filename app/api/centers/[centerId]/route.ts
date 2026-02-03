import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/centers/[centerId] - Get specific center
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const { centerId } = await params

    const { data, error } = await supabase
      .from('organizations')
      .select(
        `
        id,
        name,
        email,
        center_type,
        city,
        country,
        address,
        bio,
        logo_url,
        cover_photo_url,
        verified,
        plan,
        member_count,
        followers_count,
        monthly_revenue,
        created_at,
        updated_at
      `
      )
      .eq('id', centerId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Center not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
