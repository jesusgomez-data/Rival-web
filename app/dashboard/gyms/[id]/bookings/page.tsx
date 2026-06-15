import { getCenterDetails } from '../../actions'
import { getProfessionalBookings } from '../../professional-service-actions'
import BookingsManager from './BookingsManager'
import { redirect } from 'next/navigation'
import { isProfessional } from '@/lib/professional-types'

export default async function BookingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [details, bookings] = await Promise.all([
        getCenterDetails(id),
        getProfessionalBookings(id),
    ])

    if (!details || !isProfessional(details.center_type)) {
        redirect(`/dashboard/gyms/${id}`)
    }

    return (
        <div className="px-2 py-4 sm:p-8 animate-fade-in">
            <BookingsManager
                organizationId={id}
                initialBookings={bookings}
            />
        </div>
    )
}
