import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getPublicProfile, getCombatStats } from "../../community/duel-actions";
import { Trophy, Swords, Zap, Dumbbell, Calendar, MapPin, Hash, User, TrendingUp, Award, Star, Lock, Image as ImageIcon } from "lucide-react";
import FeedPost from "../../FeedPost";
import Image from "next/image";
import DuelButton from "../../community/DuelButton";
import FollowButton from "../../community/FollowButton";
import { notFound } from "next/navigation";
import UserMediaGallery from "../../UserMediaGallery";
import TrophyCabinet from "./TrophyCabinet";
import ProfileContent from "./ProfileContent";
import { checkAndAwardBadges, seedDemoGear } from "../badge-actions";

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
    const { username } = await props.params;
    const supabase = await createClient();
    const profile = await getPublicProfile(username);

    if (!profile) {
        return notFound();
    }

    const combatStats = await getCombatStats(profile.id);
    const { data: { user } } = await supabase.auth.getUser();

    // Auto-check badges and seed gear if viewing own profile
    if (user && user.id === profile.id) {
        await checkAndAwardBadges(user.id);
        await seedDemoGear(user.id);
    }

    // Fetch if current user follows this profile
    let isFollowing = false;
    if (user) {
        const adminSupabase = createAdminClient();
        const { data: follow } = await adminSupabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .single();
        isFollowing = !!follow;
    }

    // Pseudo-Trophies logic moved to TrophyCabinet component

    // Fetch all workouts for heatmap
    const { data: workouts } = await supabase
        .from('workouts')
        .select('start_time')
        .eq('user_id', profile.id);

    // Fetch class results for heatmap
    const { data: classResults } = await supabase
        .from('class_results')
        .select('date_performed')
        .eq('user_id', profile.id);

    // Fetch manual WOD/PR posts for heatmap
    const { data: manualPosts } = await supabase
        .from('posts')
        .select('created_at')
        .eq('user_id', profile.id)
        .in('media_type', ['wod', 'pr', 'class_result']);

    // Merge all training activities for the heatmap
    const allActivities = [
        ...(workouts || []).map(w => ({ start_time: w.start_time })),
        ...(classResults || []).map(c => ({ start_time: c.date_performed })),
        ...(manualPosts || []).map(p => ({ start_time: p.created_at }))
    ];

    // Fetch badges
    const { data: userBadges } = await supabase
        .from('user_badges')
        .select(`
            *,
            badges(*)
        `)
        .eq('user_id', profile.id);

    // Fetch gear
    const { data: userGear } = await supabase
        .from('user_gear')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true);

    // Fetch posts
    const { data: rawPosts } = await supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url, username),
            workouts:workout_id (title, sport_type, total_volume_kg, workout_sets(*), location_name, metrics),
            likes:likes(user_id)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

    const posts = rawPosts || [];

    // Privacy Check - Official accounts are always visible
    const privacy = profile.privacy_setting || 'public';
    const canViewContent = profile.is_official || privacy === 'public' || (user && user.id === profile.id) || isFollowing;

    let currentUserProfile = null;
    if (user) {
        const { data: p } = await supabase.from('profiles').select('is_official').eq('id', user.id).single();
        currentUserProfile = p;
    }

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
            badges={userBadges || []}
            gear={userGear || []}
            isAdminUser={currentUserProfile?.is_official === true}
        />
    );
}
