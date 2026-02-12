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

    // Fetch posts
    const { data: rawPosts } = await supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url, username),
            workouts:workout_id (title, total_volume_kg, workout_sets(*), location_name, metrics),
            likes:likes(user_id)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

    const posts = rawPosts || [];

    // Privacy Check - Official accounts are always visible
    const privacy = profile.privacy_setting || 'public';
    const canViewContent = profile.is_official || privacy === 'public' || (user && user.id === profile.id) || isFollowing;

    return (
        <ProfileContent
            profile={profile}
            combatStats={combatStats}
            user={user}
            isFollowing={isFollowing}
            posts={posts}
            privacy={privacy}
            canViewContent={canViewContent}
        />
    );
}
