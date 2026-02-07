'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isUserAdmin } from "@/utils/admin";

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

    revalidatePath('/dashboard/admin');
    return { success: true, ticketId: ticket.id };
}

export async function getSupportTickets() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();

    // In a real app, verify admin role here. 
    // We assume the page using this is admin-protected or RLS handles it (if user is admin).
    // For now, we fetch ALL tickets for the Admin Dashboard.

    const { data, error } = await supabase
        .from('support_tickets')
        .select(`
            *,
            user:user_id (full_name, email, avatar_url)
        `)
        .order('updated_at', { ascending: false });

    if (error) return [];
    return data;
}

export async function getTicketDetails(ticketId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const isAdmin = await isUserAdmin();

    // Fetch Ticket Info
    const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select(`
            *,
            user:user_id (full_name, email, avatar_url)
        `)
        .eq('id', ticketId)
        .single();

    if (ticketError) return { error: ticketError.message };

    // Check if user is owner or admin
    if (ticket.user_id !== user.id && !isAdmin) {
        return { error: "No autorizado" };
    }

    // Fetch Messages
    const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select(`
            *,
            sender:sender_id (full_name, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (messagesError) return { error: messagesError.message };

    return { ticket, messages };
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
    const supabase = await createClient();

    await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', ticketId);

    revalidatePath('/dashboard/admin');
    return { success: true };
}
