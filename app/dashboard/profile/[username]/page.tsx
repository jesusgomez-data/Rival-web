import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getPublicProfile, getCombatStats, getActiveDuel } from "../../explore/duel-actions";
import { Trophy, Swords, Zap, Dumbbell, Calendar, MapPin, Hash, User, TrendingUp, Award, Star, Lock, Image as ImageIcon } from "lucide-react";
import FeedPost from "../../FeedPost";
import Image from "next/image";
import DuelButton from "../../explore/DuelButton";
import FollowButton from "../../explore/FollowButton";
import { notFound } from "next/navigation";
import UserMediaGallery from "../../UserMediaGallery";
import TrophyCabinet from "./TrophyCabinet";
import ProfileContent from "./ProfileContent";
import { checkAndAwardBadges, seedDemoGear } from "../badge-actions";

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
    const { username } = await props.params;
    const supabase = await createClient();

    // Phase 1: Fetch profile and authenticated user in parallel
    const [profile, authRes] = await Promise.all([
        getPublicProfile(username),
        supabase.auth.getUser().catch(() => ({ data: { user: null } })),
    ]);

    if (!profile) {
        return notFound();
    }

    const user = authRes.data?.user || null;

    // Fire background badge/gear check for own profile (non-blocking)
    if (user && user.id === profile.id) {
        checkAndAwardBadges(user.id).catch(() => {});
        seedDemoGear(user.id).catch(() => {});
    }

    const adminSupabase = createAdminClient();

    // Phase 2: Fetch all content and combat stats in parallel
    const [
        combatStats,
        followRes,
        duelData,
        workoutsRes,
        classResultsRes,
        manualPostsRes,
        badgesRes,
        gearRes,
        rawPostsRes,
        currentUserProfileRes,
        medalsRes,
        professionalMembershipRes,
    ] = await Promise.all([
        getCombatStats(profile.id),
        user
            ? adminSupabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle()
            : Promise.resolve({ data: null }),
        user ? getActiveDuel(user.id, profile.id) : Promise.resolve(null),
        supabase.from('workouts').select('start_time').eq('user_id', profile.id),
        supabase.from('class_results').select('date_performed').eq('user_id', profile.id),
        supabase.from('posts').select('created_at').eq('user_id', profile.id).in('media_type', ['wod', 'pr', 'class_result']),
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', profile.id),
        supabase.from('user_gear').select('*').eq('user_id', profile.id).eq('is_active', true),
        (async () => {
            let q = supabase.from('posts').select(`
                *,
                profiles:user_id (full_name, avatar_url, username),
                workouts:workout_id (title, sport_type, total_volume_kg, workout_sets(*), location_name, metrics),
                likes:likes(user_id),
                comments:comments(count)
            `);
            return q.eq('user_id', profile.id).order('created_at', { ascending: false });
        })(),
        user ? supabase.from('profiles').select('is_official').eq('id', user.id).single() : Promise.resolve({ data: null }),
        (async () => {
            try {
                return await supabase.from('competition_results')
                    .select('*, competition:competition_id(id, title, type, date)')
                    .eq('user_id', profile.id).not('medal_type', 'is', null).order('created_at', { ascending: false });
            } catch { return { data: [] as any[] }; }
        })(),
        // Check if current user is an active/trial student of this professional
        (async () => {
            if (!user || !profile.id) return { data: null };
            try {
                // Find this professional's organization where they are the owner
                const { data: org } = await adminSupabase
                    .from('organizations')
                    .select('id, name')
                    .eq('owner_id', profile.id)
                    .limit(1)
                    .maybeSingle();
                if (!org) return { data: null };
                // Check if current user has active/trial membership
                const { data: member } = await adminSupabase
                    .from('members')
                    .select('id, status, center_id')
                    .eq('center_id', org.id)
                    .eq('user_id', user.id)
                    .in('status', ['active', 'trial'])
                    .maybeSingle();
                if (!member) return { data: null };
                return { data: { memberId: member.id, orgId: org.id, orgName: org.name } };
            } catch { return { data: null }; }
        })(),
    ]);

    const isFollowing = !!followRes.data;
    const activeDuel = duelData;
    const allActivities = [
        ...(workoutsRes.data || []).map((w: any) => ({ start_time: w.start_time })),
        ...(classResultsRes.data || []).map((c: any) => ({ start_time: c.date_performed })),
        ...(manualPostsRes.data || []).map((p: any) => ({ start_time: p.created_at })),
    ];
    const posts = rawPostsRes.data || [];
    const currentUserProfile = currentUserProfileRes.data;
    const competitionMedals = (medalsRes as any).data || [];
    const professionalMembership = professionalMembershipRes.data || null;

    const privacy = profile.privacy_setting || 'public';
    const canViewContent = profile.is_official || privacy === 'public' || (user && user.id === profile.id) || isFollowing;

    const ADMIN_EMAILS = ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com'];
    const isActuallyAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    return (
        <ProfileContent
            profile={profile}
            combatStats={combatStats}
            user={user}
            isFollowing={isFollowing}
            posts={posts}
            privacy={privacy}
            canViewContent={canViewContent}
            workouts={allActivities}
            badges={badgesRes.data || []}
            gear={gearRes.data || []}
            isAdminUser={isActuallyAdmin === true || currentUserProfile?.is_official === true}
            hasActiveDuel={!!activeDuel}
            medals={competitionMedals}
            professionalMembership={professionalMembership}
        />
    );
}
