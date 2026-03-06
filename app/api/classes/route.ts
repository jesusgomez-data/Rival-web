import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
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

    const { data } = await supabase.auth.getSession()
    const user = data.session?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    // Verify user has a management role in the center
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('organization_id', body.centerId)
      .eq('user_id', user.id)
      .in('role', ['owner', 'coach', 'admin'])
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        center_id: body.centerId,
        name: body.name,
        description: body.description,
        coach_name: body.coach,
        day_of_week: body.schedule,
        time: body.time,
        capacity: parseInt(body.capacity),
        duration_minutes: parseInt(body.duration),
        emoji: body.emoji,
        status: 'active',
      })
      .select()

    if (error) {
      return NextResponse.json({ error: 'Failed to create class' }, { status: 400 })
    }

    return NextResponse.json(newClass[0], { status: 201 })
  } catch (err) {
    console.error('Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
