import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getClientBookings } from '@/app/dashboard/gyms/professional-service-actions'
import { getMyUpcomingClasses } from '@/app/dashboard/gyms/schedule-actions'
import MyBookingsClient from './MyBookingsClient'
import MyClassesSection from './MyClassesSection'

export default async function MyBookingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [bookings, myClasses] = await Promise.all([
        getClientBookings(user.id),
        getMyUpcomingClasses()
    ])

    return (
        <div className="px-2 py-4 sm:p-8 animate-fade-in">
            <MyClassesSection
                initialEnrollments={myClasses.enrollments as any}
                initialWaitlist={myClasses.waitlist as any}
            />
            <MyBookingsClient initialBookings={bookings} />
        </div>
    )
}
