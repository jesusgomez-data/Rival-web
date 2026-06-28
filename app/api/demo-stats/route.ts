import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get total profiles (athletes)
    const { count: athletesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // 2. Get total organizations (centers)
    const { count: centersCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    // 3. Get total classes
    const { count: classesCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })

    // 4. Calculate MRR from organizations plan
    const { data: orgs } = await supabase
      .from('organizations')
      .select('plan, monthly_revenue')

    const mrr = orgs?.reduce((acc: number, org: any) => {
      if (org.plan === 'starter') return acc + 49.99
      if (org.plan === 'pro') return acc + 99.99
      return acc + (Number(org.monthly_revenue) || 0)
    }, 0) || 0

    // 5. Get total visits
    const { count: totalVisits } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })

    // 6. Get recent profiles for check-ins
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name')
      .order('created_at', { ascending: false })
      .limit(10)

    const checkins = (profiles || []).map((p: any) => {
      const name = p.full_name || 'Atleta'
      const parts = name.trim().split(/\s+/)
      const initials = parts.map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      return {
        i: initials || 'AT',
        n: name
      }
    })

    return NextResponse.json({
      success: true,
      mrr: mrr || 99.98,
      centers: centersCount || 3,
      athletes: athletesCount || 39,
      visits: totalVisits || 5878,
      classesCount: classesCount || 12,
      checkins: checkins.length > 0 ? checkins : [
        { i: 'TU', n: 'Test User' },
        { i: 'JP', n: 'Juan Perez' },
        { i: 'KV', n: 'Kelmir Valenzuela' }
      ]
    })
  } catch (error: any) {
    console.error('Demo stats API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      // fallback metrics
      mrr: 99.98,
      centers: 3,
      athletes: 39,
      visits: 5878,
      classesCount: 12,
      checkins: [
        { i: 'TU', n: 'Test User' },
        { i: 'JP', n: 'Juan Perez' },
        { i: 'KV', n: 'Kelmir Valenzuela' }
      ]
    })
  }
}
