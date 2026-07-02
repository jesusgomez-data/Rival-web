import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trophy, Calendar, Users, CheckCircle2, TrendingUp, Medal } from "lucide-react";
import { clsx } from "clsx";
import ChallengeJoinButton from "../../ChallengeJoinButton";
import ChallengeCompletionCard from "../../ChallengeCompletionCard";
import ChallengeProgressUpdate from "../../ChallengeProgressUpdate";

const formatDate = (d: string | null) => {
    if (!d) return 'Sin fecha límite';
    const date = new Date(d);
    if (date.getFullYear() < 2024) return 'Siempre Activo';
    return date.toLocaleDateString();
};

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
    console.log('--- START CHALLENGE DETAIL PAGE ---');

    // Polyfill for Next.js 15+ where params is a Promise
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    console.log('Resolved ID:', id);

    if (!id) {
        console.error('ERROR: No ID in params');
        notFound();
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User ID:', user?.id);

    // 1. Fetch challenge details with basic participant info
    console.log('Fetching challenge for ID:', id);

    const { data: challengeData, error: challengeError } = await supabase
        .from('community_challenges')
        .select(`
            *,
            participants:challenge_participants(
                user_id,
                current_progress,
                is_completed,
                joined_at
            )
        `)
        .eq('id', id)
        .single();

    if (challengeError || !challengeData) {
        console.log('Challenge params ID:', id);
        console.error('Error fetching challenge:', challengeError);
        notFound();
    }

    // 2. Fetch profiles for participants manually to avoid complex join issues
    const participantIds = challengeData.participants?.map((p: any) => p.user_id) || [];
    let profilesMap: Record<string, any> = {};

    if (participantIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, level')
            .in('id', participantIds);

        if (profiles) {
            profilesMap = profiles.reduce((acc: any, profile: any) => {
                acc[profile.id] = profile;
                return acc;
            }, {});
        }
    }

    // 3. Merge data
    const challenge = {
        ...challengeData,
        participants: challengeData.participants?.map((p: any) => ({
            ...p,
            profiles: profilesMap[p.user_id] || { username: 'Unknown', full_name: 'Unknown User' }
        }))
    };

    // Sort participants by progress (descending)
    // First those completed, then by progress amount
    const sortedParticipants = challenge.participants?.sort((a: any, b: any) => {
        if (b.is_completed !== a.is_completed) return (b.is_completed ? 1 : 0) - (a.is_completed ? 1 : 0);
        return (b.current_progress || 0) - (a.current_progress || 0);
    }) || [];

    const myParticipation = sortedParticipants.find((p: any) => p.user_id === user?.id);
    const isJoined = !!myParticipation;
    const progressPercentage = myParticipation
        ? Math.min(100, ((myParticipation.current_progress || 0) / (challenge.goal_value || 1)) * 100)
        : 0;

    return (
        <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Navigation */}
            <div className="mb-6 sm:mb-8">
                <Link
                    href="/dashboard/leaderboard"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Volver al Leaderboard
                </Link>

                <div className="relative p-8 rounded-[32px] bg-[#111] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 blur-3xl -mr-20 -mt-20" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                    challenge.is_active
                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                        : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                )}>
                                    {challenge.is_active ? 'Activo' : 'Finalizado'}
                                </span>
                                <span className="flex items-center gap-1.5 text-brand-red text-[10px] font-black uppercase tracking-widest bg-brand-red/10 px-3 py-1 rounded-full border border-brand-red/20">
                                    <Trophy className="w-3 h-3" /> +{challenge.xp_reward} XP
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-heading font-black text-white italic uppercase tracking-tighter leading-none">
                                {challenge.title}
                            </h1>
                            <p className="text-gray-400 font-medium text-sm md:text-base max-w-xl leading-relaxed">
                                {challenge.description}
                            </p>

                            <div className="flex items-center gap-6 text-xs text-gray-500 font-bold uppercase tracking-wider pt-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-brand-red" />
                                    <span>{new Date(challenge.start_date).toLocaleDateString()} - {formatDate(challenge.end_date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-brand-red" />
                                    <span>{challenge.participants?.length || 0} Participantes</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Card */}
                        <div className="w-full md:w-auto min-w-[280px] bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-white/10 shrink-0">
                            {isJoined ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="font-black text-white uppercase tracking-wider">Tu Progreso</span>
                                        <span className="font-black text-brand-red">{Math.round(progressPercentage)}%</span>
                                    </div>
                                    <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-glow relative overflow-hidden"
                                            style={{ width: `${progressPercentage}%` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        <span>Current: <span className="text-white">{myParticipation.current_progress}</span></span>
                                        <span>Target: <span className="text-white">{challenge.goal_value}</span></span>
                                    </div>
                                    <div className="w-full py-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center gap-2 text-green-500 font-black text-xs uppercase tracking-widest">
                                        <CheckCircle2 className="w-4 h-4" /> Inscrito
                                    </div>

                                    {myParticipation.is_completed && myParticipation.current_progress >= challenge.goal_value && (
                                        <ChallengeCompletionCard
                                            challenge={challenge}
                                            user={myParticipation.profiles}
                                            progress={myParticipation.current_progress}
                                        />
                                    )}

                                    {/* Manual Update Component */}
                                    <ChallengeProgressUpdate
                                        challengeId={id}
                                        currentProgress={myParticipation.current_progress}
                                        targetValue={challenge.goal_value}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <p className="text-gray-400 text-xs font-medium leading-relaxed">
                                        Únete ahora y compite contra otros atletas.
                                    </p>
                                    <ChallengeJoinButton challengeId={challenge.id} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Participants Leaderboard */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Trophy className="w-6 h-6 text-brand-red" />
                    <h2 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter">Clasificación</h2>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-[32px] overflow-hidden">
                    {sortedParticipants.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {sortedParticipants.map((participant: any, index: number) => {
                                const profile = participant.profiles;
                                const isMe = participant.user_id === user?.id;
                                const percentage = Math.min(100, ((participant.current_progress || 0) / (challenge.goal_value || 1)) * 100);

                                return (
                                    <div
                                        key={participant.user_id}
                                        className={clsx(
                                            "flex items-center gap-4 p-4 sm:p-6 transition-colors hover:bg-white/[0.02]",
                                            isMe && "bg-brand-red/5 hover:bg-brand-red/10"
                                        )}
                                    >
                                        <div className="w-8 flex justify-center font-heading font-black text-xl italic text-gray-600">
                                            {index + 1}
                                        </div>

                                        <div className="relative shrink-0">
                                            <div className={clsx(
                                                "w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2",
                                                isMe ? "border-brand-red" : "border-white/10"
                                            )}>
                                                {profile?.avatar_url ? (
                                                    <Image
                                                        src={profile.avatar_url}
                                                        alt={profile.username || 'User'}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-black text-gray-500 uppercase">
                                                        {profile?.username?.[0] || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            {index < 3 && (
                                                <div className="absolute -top-1 -right-1 bg-black rounded-full p-0.5">
                                                    <Medal className={clsx(
                                                        "w-4 h-4",
                                                        index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-amber-700"
                                                    )} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={clsx(
                                                    "font-bold text-sm sm:text-base truncate",
                                                    isMe ? "text-brand-red" : "text-white"
                                                )}>
                                                    {profile?.full_name || `@${profile?.username}`}
                                                </p>
                                                {isMe && <span className="text-[9px] bg-brand-red px-1.5 py-0.5 rounded text-white font-black uppercase tracking-widest">TÚ</span>}
                                            </div>
                                            <div className="w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-red rounded-full"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="font-heading font-black text-lg sm:text-2xl text-white italic">
                                                {participant.current_progress}
                                            </p>
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                                                / {challenge.goal_value}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-medium">Aún no hay participantes en este desafío.</p>
                            <p className="text-xs uppercase tracking-widest mt-2">¡Sé el primero en unirte!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
