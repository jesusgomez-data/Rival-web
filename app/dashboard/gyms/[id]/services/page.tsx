import { getCenterDetails } from '../../actions'
import { getProfessionalServices, getProfessionalAvailability } from '../../professional-service-actions'
import ServicesManager from './ServicesManager'
import { redirect } from 'next/navigation'
import { isProfessional } from '@/lib/professional-types'

export default async function ServicesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const [details, services, availability] = await Promise.all([
        getCenterDetails(id),
        getProfessionalServices(id),
        getProfessionalAvailability(id),
    ])

    if (!details || !isProfessional(details.center_type)) {
        redirect(`/dashboard/gyms/${id}`)
    }

    return (
        <div className="px-2 py-4 sm:p-8 animate-fade-in">
            <ServicesManager
                organizationId={id}
                initialServices={services}
                initialAvailability={availability}
                centerType={details.center_type}
            />
        </div>
    )
}
