import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters, getClientIdentifier, setRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 🚦 RATE LIMITING: Prevenir spam de creación de centros
    const identifier = getClientIdentifier(request);
    const rateLimit = await rateLimiters.centersPost.limit(identifier);

    if (!rateLimit.success) {
      const headers = setRateLimitHeaders(new Headers(), rateLimit);
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429, headers }
      );
    }

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
    const { email, centerName, centerType, country, city, plan, fullName, address, logoUrl, coverUrl, latitude, longitude, phone, website, bio } = body

    // Validate required fields
    if (!centerName || !centerType || !country || !city || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: Center Name, Type, Country, City, and Phone are required.' },
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
        email: email,
        center_type: centerType,
        country,
        city,
        address: address || null,
        logo_url: logoUrl || null,
        cover_photo_url: coverUrl || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        plan: plan || 'free',
        owner_id: userId,
        is_public: true,
        phone: phone || null,
        website: website || null,
        bio: bio || null,
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

    // 4. Create Primary Center (Default location)
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .insert({
        organization_id: organization.id,
        name: centerName, // Primary center name usually matches org name initially
        center_type: centerType,
        country: country,
        city: city,
        status: 'active',
        plan: plan || 'free',
        email: email,
        phone: phone || null,
        website: website || null,
        description: bio || null,
        address: address || null,
        logo_url: logoUrl || null
      })
      .select()
      .single()

    if (centerError) {
      console.error('Primary center creation error:', centerError)
      // We don't block the whole process if this fails, but it's bad.
      // However, usually RLS might be the cause if not handled.
    }

    // 5. Create Head Coach Role (Linked to Organization)
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
    // 🚦 RATE LIMITING: Proteger endpoint de consulta
    const identifier = getClientIdentifier(request);
    const rateLimit = await rateLimiters.centersGet.limit(identifier);

    if (!rateLimit.success) {
      const headers = setRateLimitHeaders(new Headers(), rateLimit);
      return NextResponse.json(
        {
          error: 'Too many requests. Please slow down.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { status: 429, headers }
      );
    }

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
