import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Authenticate Request
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in first' },
        { status: 401 }
      )
    }
    const userId = user.id

    const body = await request.json()
    const { email, centerName, centerType, country, city, plan, fullName } = body

    // Validate required fields
    if (!centerName || !centerType || !country || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 2. Ensure Profile Exists (Safe Upsert)
    // We do this to satisfy the Foreign Key constraint on 'organizations.owner_id'
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: email.split('@')[0],
        full_name: fullName,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile sync error:', profileError)
      // Proceeding anyway, assuming profile might exist
    }

    // 3. Create Organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: centerName,
        email: email, // Contact email for center, usually same as owner
        center_type: centerType,
        country,
        city,
        plan: plan || 'free',
        owner_id: userId,
        is_public: true,
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      return NextResponse.json(
        { error: orgError.message || 'Failed to create organization' },
        { status: 400 }
      )
    }

    // 4. Create Head Coach Role
    const { error: roleError } = await supabase
      .from('center_roles')
      .insert({
        organization_id: organization.id,
        user_id: userId,
        role: 'head_coach',
        permissions: [
          'manage_classes',
          'manage_members',
          'see_analytics',
          'manage_store',
          'manage_payments',
        ],
      })

    if (roleError) {
      console.error('Role creation error:', roleError)
    }

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/centers - List public centers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const city = searchParams.get('city')
    const country = searchParams.get('country')

    const supabase = await createClient()

    let query = supabase
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
        member_count,
        followers_count,
        center_reviews(count)
      `,
        { count: 'exact' }
      )
      .eq('is_public', true)

    if (type) query = query.eq('center_type', type)
    if (city) query = query.eq('city', city)
    if (country) query = query.eq('country', country)

    const { data, error } = await query.limit(20)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ organizations: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
