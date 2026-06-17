'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, ArrowLeft, Trophy } from 'lucide-react'
import Link from 'next/link'
import FeedPost from '../../FeedPost'
import { useLanguage } from '@/app/LanguageContext'

export default function PostPage() {
    const params = useParams()
    const router = useRouter()
    const { language } = useLanguage()
    const postId = params.id as string
    const [post, setPost] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        async function loadPost() {
            if (!postId) return;
            setLoading(true)
            setErrorMsg(null)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setCurrentUser(user)

                console.log("[PostPage] Buscando señal ID:", postId)
                
                // Intento 1: Con todos los joins
                let result = await supabase
                    .from('posts')
                    .select(`
                        *,
                        profiles:user_id (*),
                        workouts:workout_id (title),
                        likes (user_id),
                        comments:comments(count)
                    `)
                    .eq('id', postId)
                    .single()

                // Intento 2: Básico si el anterior falla (por si alguna relación falló)
                if (result.error) {
                    console.warn("[PostPage] Intento 1 falló, probando consulta básica...", result.error)
                    result = await supabase
                        .from('posts')
                        .select('*')
                        .eq('id', postId)
                        .single()
                }

                if (result.error) {
                    setErrorMsg(result.error.message)
                    // No redirigir de inmediato para dejar ver el error
                } else {
                    setPost(result.data)
                }
            } catch (err: any) {
                console.error("[PostPage] Error en catch:", err)
                setErrorMsg(err.message || 'Error desconocido')
            } finally {
                setLoading(false)
            }
        }

        loadPost()
    }, [postId, supabase])

    const formatTimeAgo = (date: string) => {
        try {
            const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h`;
            return `${Math.floor(hours / 24)}d`;
        } catch (e) { return 'recientemente'; }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest animate-pulse">
                        {language === 'es' ? 'Localizando señal...' : 'Locating signal...'}
                    </p>
                </div>
            </div>
        )
    }

    if (errorMsg || !post) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6">
                <div className="text-center space-y-6 max-w-sm">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                        <Trophy className="w-10 h-10 text-gray-700 opacity-50" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-xl font-heading font-black italic uppercase text-white tracking-tighter">
                            {language === 'es' ? 'SEÑAL NO ENCONTRADA' : 'SIGNAL NOT FOUND'}
                        </h2>
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                            <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Error del Radar:</p>
                            <p className="text-xs text-gray-400 font-medium">
                                {errorMsg || (language === 'es' ? 'El post no parece existir.' : 'Post does not exist.')}
                            </p>
                        </div>
                    </div>
                    <Link 
                        href="/dashboard" 
                        className="inline-flex items-center gap-2 text-brand-red font-black uppercase tracking-widest text-xs hover:gap-4 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {language === 'es' ? 'VOLVER AL RADAR' : 'BACK TO RADAR'}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto py-6 md:py-12 px-0 sm:px-4 lg:px-8 space-y-6">
            <div className="flex items-center gap-4 mb-8 px-4 sm:px-0">
                <Link 
                    href="/dashboard" 
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </Link>
                <div>
                    <h1 className="text-2xl font-heading font-black italic uppercase text-white tracking-tighter leading-none">
                        {language === 'es' ? 'DETALLE DE LA ' : 'SIGNAL '}<span className="text-brand-red">{language === 'es' ? 'SEÑAL' : 'DETAILS'}</span>
                    </h1>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1.5">
                        {language === 'es' ? 'Rival Fit Radar Central' : 'Rival Fit Central Radar'}
                    </p>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <FeedPost
                    postId={post.id}
                    username={post.profiles?.username}
                    user={post.profiles?.full_name || "Unknown Athlete"}
                    action={post.media_type === 'class_result' ? (language === 'es' ? "ha completado una sesión de clase" : "completed a class session") : post.workout_id ? (language === 'es' ? "ha completado un entrenamiento" : "completed a workout") : (language === 'es' ? "ha publicado una actualización" : "posted an update")}
                    time={formatTimeAgo(post.created_at)}
                    avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                    image={post.media_url}
                    initialLikes={post.likes ? post.likes.length : 0}
                    hasLikedInitial={post.likes?.some((l: any) => l.user_id === currentUser?.id) || false}
                    comments={post.comments?.[0]?.count || 0}
                    highlight={post.workouts?.title}
                    mediaType={post.media_type}
                    caption={post.caption}
                    currentUserId={currentUser?.id}
                    authorId={post.user_id}
                    isOfficial={post.profiles?.is_official}
                    post_type={post.post_type || post.media_type}
                    wod_data={post.post_type === 'wod' ? post.media_url : null}
                    viewCount={post.view_count || 0}
                />
            </div>
        </div>
    )
}
