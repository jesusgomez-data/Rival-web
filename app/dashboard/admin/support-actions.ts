'use server';

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { isUserAdmin } from "@/utils/admin";
import { createNotification } from "../notifications-actions";

export async function createSupportTicket(subject: string, message: string, category: string = 'technical') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autenticado" };

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
            user_id: user.id,
            subject,
            category,
            status: 'open',
            priority: 'normal'
        })
        .select()
        .single();

    if (ticketError) return { error: ticketError.message };

    // Create the first message
    const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
            ticket_id: ticket.id,
            sender_id: user.id,
            content: message
        });

    if (messageError) return { error: "Ticket creado pero falló el mensaje inicial: " + messageError.message };

    // Notify Admins
    const adminEmails = ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com'];
    const adminSupabase = createAdminClient();
    const { data: adminUsers } = await adminSupabase
        .from('profiles')
        .select('id, email')
        .in('email', adminEmails);

    if (adminUsers && adminUsers.length > 0) {
        console.log(`[SUPPORT] Notifying ${adminUsers.length} admins`);
        for (const admin of adminUsers) {
            const notifResult = await createNotification({
                userId: admin.id,
                type: 'support_ticket',
                title: 'Nuevo Ticket de Soporte',
                content: `${user.email} ha enviado un reporte: ${subject}`,
                link: '/dashboard/admin'
            });
            if (notifResult.error) {
                console.error(`[SUPPORT] Error notifying admin ${admin.id}:`, notifResult.error);
            }
        }
    } else {
        console.warn("[SUPPORT] No admin users found for emails:", adminEmails);
    }

    revalidatePath('/dashboard/admin');
    return { success: true, ticketId: ticket.id };
}

export async function getSupportTickets() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const adminSupabase = createAdminClient();

    // Fetch tickets
    const { data: tickets, error: ticketsError } = await adminSupabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (ticketsError) {
        console.error("Error fetching support tickets:", ticketsError);
        return [];
    }

    if (!tickets || tickets.length === 0) return [];

    // Fetch unique user ids
    const userIds = Array.from(new Set(tickets.map(t => t.user_id).filter(Boolean)));

    // Fetch profiles for these users
    const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
    }, {});

    // Transform
    return tickets.map(ticket => ({
        ...ticket,
        user: profilesMap[ticket.user_id] || { full_name: 'Usuario', email: 'Desconocido' }
    }));
}

export async function getTicketDetails(ticketId: string) {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const isAdmin = await isUserAdmin();

    // Fetch Ticket Info
    const { data: ticket, error: ticketError } = await adminSupabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

    if (ticketError) return { error: ticketError.message };

    // Fetch User Profile
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', ticket.user_id)
        .single();

    // Transform ticket
    const transformedTicket = {
        ...ticket,
        user: profile || { full_name: 'Usuario', email: 'Desconocido' }
    };

    // Check if user is owner or admin
    if (ticket.user_id !== user.id && !isAdmin) {
        return { error: "No autorizado" };
    }

    // Fetch Messages
    const { data: messages, error: messagesError } = await adminSupabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (messagesError) return { error: messagesError.message };

    // Fetch senders for messages
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id).filter(Boolean)));
    const { data: senders } = await adminSupabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

    const sendersMap = (senders || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
    }, {});

    // Transform messages sender
    const transformedMessages = messages?.map(msg => ({
        ...msg,
        sender: sendersMap[msg.sender_id] || { full_name: 'U' }
    })) || [];

    return { ticket: transformedTicket, messages: transformedMessages };
}

export async function sendReply(ticketId: string, content: string, isAdmin: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autenticado" };

    if (isAdmin && !(await isUserAdmin())) {
        return { error: "No autorizado para responder como admin" };
    }

    const { error } = await supabase
        .from('support_messages')
        .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            content: content,
            is_admin_reply: isAdmin
        });

    if (error) return { error: error.message };

    // Update ticket updated_at
    await supabase
        .from('support_tickets')
        .update({
            updated_at: new Date().toISOString(),
            status: isAdmin ? 'in_progress' : 'open' // Re-open if user replies, In Progress if admin replies
        })
        .eq('id', ticketId);

    revalidatePath(`/dashboard/admin`);
    return { success: true };
}


export async function resolveTicket(ticketId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const adminSupabase = createAdminClient();

    await adminSupabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', ticketId);

    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function deleteSupportTicket(ticketId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const adminSupabase = createAdminClient();

    // Messages will be deleted automatically due to ON DELETE CASCADE
    const { error } = await adminSupabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
}
