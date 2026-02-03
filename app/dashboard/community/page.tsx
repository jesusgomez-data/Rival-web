import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trophy, Dumbbell, UserSearch } from "lucide-react";
import LikeButton from "./LikeButton";
import FollowButton from "./FollowButton";
import DuelButton from "./DuelButton";
import SearchAthletes from "./SearchAthletes";
import { Suspense } from "react";
import FeedPost from "../FeedPost";
import StoryBar from "../stories/StoryBar";

export const dynamic = 'force-dynamic';

export default async function CommunityPage(props: {
    searchParams: Promise<{ q?: string }>
}) {
    const searchParams = await props.searchParams;
    const query = searchParams.q || "";
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get current user to check for follow status
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch follows of current user to highlight rivals
    // Use ADMIN client to ensure we get the data regardless of RLS on 'follows' table reading policies
    const { data: myFollows } = await adminSupabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id || '');

    const followedIds = new Set(myFollows?.map(f => f.following_id) || []);

    let searchResults: any[] = [];
    if (query) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .neq('id', user?.id || '')
            .limit(10);
        searchResults = profiles || [];
    }

    // Fetch all posts with user profile and workout data
    const postsQuery = supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (id, full_name, avatar_url, username),
            workouts:workout_id (title, total_volume_kg, workout_sets(*), location_name),
            likes:likes(user_id)
        `)
        .order('created_at', { ascending: false });

    if (!query) {
        postsQuery.limit(20);
    } else {
        // If searching, maybe show posts from matched users too? 
        // For now, let's just stick to profile search results or hide posts.
    }

    const { data: posts } = await postsQuery;

    const formatTimeAgo = (date: string) => {
        try {
            const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
            if (seconds < 60) return `hace ${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h`;
            return `${Math.floor(hours / 24)}d`;
        } catch (e) { return "reciente"; }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white uppercase italic tracking-tighter">Arena Global</h1>
                    <p className="text-gray-400 text-sm">Descubre los logros de otros atletas y desafía tus límites.</p>
                </div>
                <Suspense fallback={<div className="h-10 w-full max-w-md bg-brand-gray animate-pulse rounded-2xl" />}>
                    <SearchAthletes />
                </Suspense>
            </div>

            <div className="mb-8">
                <StoryBar currentUser={user} />
            </div>

            {query && (
                <div className="space-y-4">
                    <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 italic uppercase">
                        <UserSearch className="w-5 h-5 text-brand-red" />
                        Atletas que coinciden con "{query}"
                    </h2>
                    {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {searchResults.map((profile: any) => (
                                <div key={profile.id} className="bg-brand-gray border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
                                    <Link href={`/dashboard/profile/${profile.username}`} className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden relative">
                                            <Image
                                                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                                                alt={profile.full_name}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm text-white font-bold group-hover:text-brand-red transition-colors">{profile.full_name}</p>
                                            <p className="text-xs text-gray-500">@{profile.username}</p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <DuelButton targetId={profile.id} isRival={followedIds.has(profile.id)} />
                                        <FollowButton targetId={profile.id} isFollowingInitial={followedIds.has(profile.id)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-brand-gray/50 border border-dashed border-white/5 rounded-2xl p-8 text-center">
                            <p className="text-gray-500">No se encontraron atletas que coincidan con tu búsqueda.</p>
                        </div>
                    )}
                    <div className="h-px bg-white/5 my-8" />
                    <h2 className="text-xl font-heading font-bold text-white uppercase italic tracking-wider">Actividad Reciente</h2>
                </div>
            )}

            {posts && posts.length > 0 ? (
                posts.map((post: any) => {
                    const hasLiked = post.likes?.some((l: any) => l.user_id === user?.id);
                    const isOwnPost = post.user_id === user?.id;
                    const isFollowing = followedIds.has(post.user_id);

                    return (
                        <FeedPost
                            key={post.id}
                            postId={post.id}
                            username={post.profiles?.username}
                            user={post.profiles?.full_name || "Atleta Desconocido"}
                            action={post.workout_id ? "ha completado un entrenamiento" : "ha publicado una actualización"}
                            time={formatTimeAgo(post.created_at)}
                            avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                            image={post.media_url}
                            initialLikes={post.likes_count || 0}
                            hasLikedInitial={!!hasLiked}
                            comments={post.comments_count || 0}
                            highlight={post.workouts?.title}
                            mediaType={post.media_type}
                            caption={post.caption}
                            currentUserId={user?.id}
                            authorId={post.user_id}
                            workoutData={post.workouts}
                            music_url={post.music_url}
                            music_title={post.music_title}
                            music_artist={post.music_artist}
                        />
                    );
                })
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-brand-gray/10">
                    <p className="text-gray-500 italic uppercase font-black text-[10px] tracking-[0.2em]">Silencio en la arena... ¡Sé el primero en romperlo!</p>
                </div>
            )}
        </div>
    );
}
