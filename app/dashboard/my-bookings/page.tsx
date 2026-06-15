import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClientBookings } from '@/app/dashboard/gyms/professional-service-actions'
import MyBookingsClient from './MyBookingsClient'

export default async function MyBookingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const bookings = await getClientBookings(user.id)

    return (
        <div className="px-2 py-4 sm:p-8 animate-fade-in">
            <MyBookingsClient initialBookings={bookings} />
        </div>
    )
}
