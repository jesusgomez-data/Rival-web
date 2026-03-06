import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/centers/[centerId] - Get specific center (requires authentication)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { centerId } = await params

    const { data, error } = await supabase
      .from('organizations')
      .select(
        `
        id,
        name,
        center_type,
        city,
        country,
        bio,
        logo_url,
        cover_photo_url,
        verified,
        plan,
        member_count,
        followers_count,
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
