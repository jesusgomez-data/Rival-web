import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function buildSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => {
          const cookieStore = await cookies()
          return cookieStore.getAll()
        },
        setAll: async (cookiesToSet) => {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

async function verifyOrgAccess(supabase: ReturnType<typeof buildSupabaseClient>, userId: string, centerId: string) {
  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('organization_id', centerId)
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .single()
  return !!data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = buildSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const hasAccess = await verifyOrgAccess(supabase, user.id, body.centerId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        center_id: body.centerId,
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        stock: parseInt(body.stock),
        image_url: body.imageUrl,
        emoji: body.emoji,
        category: body.category,
        status: 'active',
      })
      .select()

    if (error) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 400 })
    }

    return NextResponse.json(newProduct[0], { status: 201 })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = buildSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const hasAccess = await verifyOrgAccess(supabase, user.id, centerId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 400 })
    }

    return NextResponse.json(products)
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
