import { createClient } from '@/utils/supabase/server';
import CompetitionsClient from './CompetitionsClient';
import { Suspense } from 'react';
import { COMPETITIONS_DATA } from './data';

export const dynamic = 'force-dynamic';

export default async function CompetitionsPage() {
    const supabase = await createClient();

    // Fetch DB competitions
    let dbCompetitions: any[] = [];
    try {
        const { data } = await supabase
            .from('competitions')
            .select('*, organizer:organizer_id(full_name, username, avatar_url)')
            .order('date', { ascending: true });
        dbCompetitions = data || [];
    } catch {
        // Table may not exist yet — graceful fallback
        dbCompetitions = [];
    }

    // Check if current user is admin
    let isAdmin = false;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_official, username')
            .eq('id', user.id)
            .single();
        isAdmin = profile?.is_official === true || profile?.username?.toLowerCase() === 'rivalfit';
    }

    return (
        <Suspense fallback={<div className="p-20 text-center text-gray-500 animate-pulse font-black uppercase tracking-widest">Cargando...</div>}>
            <CompetitionsClient
                staticCompetitions={COMPETITIONS_DATA}
                dbCompetitions={dbCompetitions}
                isAdmin={isAdmin}
            />
        </Suspense>
    );
}
