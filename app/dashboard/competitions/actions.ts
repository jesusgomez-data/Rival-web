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
    registration_deadline?: string; status: string;
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
