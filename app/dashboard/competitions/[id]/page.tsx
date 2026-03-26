import { createClient } from '@/utils/supabase/server';
import { getCompetition, getRegistrations, getResults } from '../actions';
import { notFound } from 'next/navigation';
import CompetitionDetail from './CompetitionDetail';

export const dynamic = 'force-dynamic';

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const competition = await getCompetition(id);
    if (!competition) return notFound();

    const [registrations, results] = await Promise.all([
        getRegistrations(id),
        getResults(id),
    ]);

    let currentUserProfile = null;
    let isRegistered = false;
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, level, is_official')
            .eq('id', user.id)
            .single();
        currentUserProfile = data;
        isRegistered = registrations.some((r: any) => r.user_id === user.id);
    }

    return (
        <CompetitionDetail
            competition={competition}
            registrations={registrations}
            results={results}
            currentUser={currentUserProfile}
            isRegistered={isRegistered}
        />
    );
}
