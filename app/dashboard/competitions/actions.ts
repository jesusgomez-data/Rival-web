'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getCompetitions() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('competitions')
        .select(`*, organizer:organizer_id(full_name, username, avatar_url), _count:competition_registrations(count)`)
        .order('date', { ascending: true });
    return data || [];
}

export async function getCompetition(id: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('competitions')
        .select(`*, organizer:organizer_id(full_name, username, avatar_url)`)
        .eq('id', id)
        .single();
    return data;
}

export async function createCompetition(formData: {
    title: string; description: string; type: string; date: string;
    location: string; image_url?: string; max_participants?: number;
    registration_deadline?: string; status: string; registration_url?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('competitions').insert({
        ...formData, organizer_id: user.id,
    }).select().single();
    if (error) throw error;
    revalidatePath('/dashboard/competitions');
    return data;
}

export async function updateCompetitionStatus(id: string, status: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('competitions').update({ status }).eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/competitions');
    revalidatePath(`/dashboard/competitions/${id}`);
}

export async function updateCompetition(id: string, formData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const { error } = await adminSupabase.from('competitions').update(formData).eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/competitions');
    revalidatePath(`/dashboard/competitions/${id}`);
}

export async function deleteCompetition(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { error } = await adminSupabase.from('competitions').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/competitions');
}

export async function registerForCompetition(competitionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('competition_registrations').insert({
        competition_id: competitionId, user_id: user.id
    });
    if (error) throw error;
    revalidatePath(`/dashboard/competitions/${competitionId}`);
}

export async function unregisterFromCompetition(competitionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await supabase.from('competition_registrations')
        .delete().eq('competition_id', competitionId).eq('user_id', user.id);
    revalidatePath(`/dashboard/competitions/${competitionId}`);
}

export async function getRegistrations(competitionId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('competition_registrations')
        .select(`*, user:user_id(id, full_name, username, avatar_url, level)`)
        .eq('competition_id', competitionId)
        .eq('status', 'confirmed')
        .order('registered_at', { ascending: true });
    return data || [];
}

export async function uploadResults(competitionId: string, results: Array<{
    user_id: string; position: number; score?: string; notes?: string;
}>) {
    const supabase = await createClient();
    const withMedals = results.map(r => ({
        ...r,
        competition_id: competitionId,
        medal_type: r.position === 1 ? 'gold' : r.position === 2 ? 'silver' : r.position === 3 ? 'bronze' : r.position === 4 ? 'fourth' : null
    }));
    const { error } = await supabase.from('competition_results').upsert(withMedals, { onConflict: 'competition_id,user_id' });
    if (error) throw error;
    // Mark competition as finished
    await supabase.from('competitions').update({ status: 'finished' }).eq('id', competitionId);
    revalidatePath(`/dashboard/competitions/${competitionId}`);
    revalidatePath('/dashboard/competitions');
}

export async function getResults(competitionId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('competition_results')
        .select(`*, user:user_id(id, full_name, username, avatar_url, level)`)
        .eq('competition_id', competitionId)
        .order('position', { ascending: true });
    return data || [];
}

export async function getUserMedals(userId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('competition_results')
        .select(`*, competition:competition_id(id, title, type, date)`)
        .eq('user_id', userId)
        .not('medal_type', 'is', null)
        .order('created_at', { ascending: false });
    return data || [];
}

export async function requestEventRegistration(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const eventName = formData.get('eventName') as string;
    const type = formData.get('type') as string;
    const date = formData.get('date') as string;
    const location = formData.get('location') as string;
    const email = formData.get('email') as string;
    const details = formData.get('details') as string;

    // 1. Save to database
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    await adminSupabase.from('event_requests').insert({
        user_id: user.id,
        event_name: eventName,
        type,
        date,
        location,
        contact_email: email,
        details,
        status: 'pending'
    });

    // 2. Send email notification
    const { Resend } = await import('resend');
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.error('RESEND_API_KEY is missing');
        throw new Error('Email service not configured');
    }
    const resend = new Resend(resendApiKey);

    const adminEmails = (process.env.ADMIN_EMAILS || 'rival.app.official@gmail.com').split(',');

    const { error } = await resend.emails.send({
        from: 'Rival Fit <notifications@rivalfit.app>',
        to: adminEmails,
        subject: `Nueva Solicitud de Competición: ${eventName}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
                <h1 style="font-size: 24px; font-weight: bold; font-style: italic; color: #E11D48; margin-bottom: 20px; text-transform: uppercase;">Nueva Solicitud de Alta de Competición</h1>
                <p>Se ha recibido una nueva solicitud para publicar un evento en Rival Fit.</p>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 12px; margin-top: 20px;">
                    <p><strong>Usuario Solicitante:</strong> ${user.email}</p>
                    <p><strong>Evento:</strong> ${eventName}</p>
                    <p><strong>Tipo:</strong> ${type}</p>
                    <p><strong>Fecha Estimada:</strong> ${date}</p>
                    <p><strong>Ubicación / Sede:</strong> ${location}</p>
                    <p><strong>Email Organización:</strong> ${email}</p>
                    <p><strong>Detalles:</strong><br/>${(details || 'N/A').replace(/\n/g, '<br/>')}</p>
                </div>
            </div>
        `,
    });

    if (error) {
        console.error("Resend Error:", error);
    }
}

export async function getEventRequests() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data } = await adminSupabase
        .from('event_requests')
        .select('*, profiles:user_id(full_name, username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
    return data || [];
}

export async function approveEventRequest(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Get the request
    const { data: req } = await adminSupabase.from('event_requests').select('*').eq('id', requestId).single();
    if (!req) throw new Error('Solicitud no encontrada');

    // Create the competition
    const { error: insertError } = await adminSupabase.from('competitions').insert({
        title: req.event_name,
        type: req.type,
        date: req.date,
        location: req.location,
        description: req.details,
        organizer_id: req.user_id, // Link to the user who requested it
        status: 'open'
    });
    if (insertError) throw insertError;

    // Update request status
    await adminSupabase.from('event_requests').update({ status: 'approved' }).eq('id', requestId);
    
    revalidatePath('/dashboard/competitions');
}

export async function rejectEventRequest(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    await adminSupabase.from('event_requests').update({ status: 'rejected' }).eq('id', requestId);
}
