import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getConversation, getServiceMessages } from '@/app/dashboard/gyms/professional-service-actions'
import { createAdminClient } from '@/utils/supabase/admin'
import BookingChat from './BookingChat'

export default async function BookingChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: bookingId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const conversation = await getConversation(bookingId)
    if (!conversation) notFound()

    const booking = conversation.booking as any
    // Only client or professional can access
    const admin = createAdminClient()
    const { data: org } = await admin
        .from('organizations')
        .select('owner_id, name, logo_url, center_type')
        .eq('id', booking.professional_id)
        .single()

    const isClient = booking.client_id === user.id
    const isPro = org?.owner_id === user.id
    if (!isClient && !isPro) redirect('/dashboard')

    const [messages, clientProfile] = await Promise.all([
        getServiceMessages(conversation.id),
        admin.from('profiles').select('id, full_name, avatar_url').eq('id', booking.client_id).single(),
    ])

    return (
        <BookingChat
            conversationId={conversation.id}
            booking={booking}
            initialMessages={messages}
            currentUserId={user.id}
            isClient={isClient}
            professional={{ id: booking.professional_id, name: org?.name, avatar: org?.logo_url }}
            client={{ id: booking.client_id, name: clientProfile.data?.full_name, avatar: clientProfile.data?.avatar_url }}
        />
    )
}
