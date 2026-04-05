'use client';

import { useState, useTransition } from 'react';
import { publishInAppOfficialPost, deleteOfficialPost, updateOfficialProfile } from './actions';
import { Trophy, Plus, Trash2, Image, FileText, Megaphone, Dumbbell, Loader2, CheckCircle, X, Edit3, Eye, Users, Heart, MessageCircle, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const POST_TYPES = [
    { id: 'text', label: 'Comunicado', icon: Megaphone, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'image', label: 'Imagen', icon: Image, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { id: 'wod', label: 'WOD del Día', icon: Dumbbell, color: 'text-brand-red', bg: 'bg-brand-red/10 border-brand-red/20' },
    { id: 'announcement', label: 'Anuncio', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
] as const;

interface Props {
    rivalfitProfile: any;
    posts: any[];
    adminName: string;
}

function PostCard({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
    const [deleting, setDeleting] = useState(false);
    const isImage = post.media_type === 'image' && post.media_url && !post.media_url.startsWith('{');
    const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es });

    return (
        <div className="bg-black/40 border border-white/8 rounded-2xl overflow-hidden group hover:border-white/15 transition-all">
            {isImage && (
                <div className="h-40 relative overflow-hidden">
                    <NextImage src={post.media_url} alt="" fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
            )}
            <div className="p-4">
                <p className="text-sm text-gray-200 font-medium leading-relaxed line-clamp-3 mb-3">
                    {post.caption}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="uppercase tracking-wider font-bold">{post.media_type || 'text'}</span>
                        <span>·</span>
                        <span>{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                            href={`/dashboard/post/${post.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                            onClick={async () => {
                                if (!confirm('¿Eliminar este post?')) return;
                                setDeleting(true);
                                await onDelete(post.id);
                            }}
                            disabled={deleting}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                        >
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OfficialPostsClient({ rivalfitProfile, posts: initialPosts, adminName }: Props) {
    const [posts, setPosts] = useState(initialPosts);
    const [showCreate, setShowCreate] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [postType, setPostType] = useState<'text' | 'image' | 'wod' | 'announcement'>('text');
    const [caption, setCaption] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');

    // Profile edit state
    const [profileBio, setProfileBio] = useState(rivalfitProfile?.bio || '');
    const [profileAvatar, setProfileAvatar] = useState(rivalfitProfile?.avatar_url || '');
    const [profileCover, setProfileCover] = useState(rivalfitProfile?.cover_url || '');

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handlePublish = () => {
        if (!caption.trim()) return;
        startTransition(async () => {
            try {
                const post = await publishInAppOfficialPost({
                    caption: caption.trim(),
                    media_url: mediaUrl || undefined,
                    media_type: postType === 'image' && mediaUrl ? 'image' : postType === 'wod' ? 'wod' : 'text',
                    post_type: postType,
                });
                setPosts(prev => [post, ...prev]);
                setCaption('');
                setMediaUrl('');
                setShowCreate(false);
                showToast('✓ Post publicado como @rivalfit');
            } catch (e: any) {
                showToast(e.message || 'Error al publicar', 'error');
            }
        });
    };

    const handleDelete = async (id: string) => {
        await deleteOfficialPost(id);
        setPosts(prev => prev.filter(p => p.id !== id));
        showToast('Post eliminado');
    };

    const handleSaveProfile = () => {
        startTransition(async () => {
            try {
                await updateOfficialProfile({ bio: profileBio, avatar_url: profileAvatar, cover_url: profileCover });
                setShowEditProfile(false);
                showToast('✓ Perfil actualizado');
            } catch (e: any) {
                showToast(e.message || 'Error', 'error');
            }
        });
    };

    const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-red/40 transition-all font-medium";

    const hasProfile = !!rivalfitProfile;

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500">
            {/* Toast */}
            {toast && (
                <div className={clsx(
                    'fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 transition-all',
                    toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
                )}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Trophy className="w-7 h-7 text-brand-red" />
                        Canal Oficial RivalFit
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Publicando como <span className="text-brand-red font-bold">@rivalfit</span> · Admin: {adminName}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowEditProfile(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        <Edit3 className="w-4 h-4" /> Editar Perfil
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Post
                    </button>
                </div>
            </div>

            {/* No profile warning */}
            {!hasProfile && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center">
                    <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                    <p className="text-yellow-300 font-bold text-sm mb-2">Perfil @rivalfit no encontrado</p>
                    <p className="text-yellow-500/70 text-xs">Ejecuta el archivo <code className="bg-black/40 px-2 py-0.5 rounded">add_rivalfit_official_account.sql</code> en Supabase SQL Editor para crearlo.</p>
                </div>
            )}

            {/* Profile preview */}
            {hasProfile && (
                <div className="bg-gradient-to-br from-brand-red/10 via-black/60 to-black border border-brand-red/20 rounded-3xl p-6 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full border-2 border-brand-red/50 overflow-hidden relative shrink-0 bg-brand-gray">
                        {rivalfitProfile.avatar_url ? (
                            <NextImage src={rivalfitProfile.avatar_url} alt="RivalFit" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-brand-red italic">R</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-heading font-black text-white italic uppercase">RivalFit</h2>
                            <span className="bg-brand-red text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                                <Trophy className="w-2.5 h-2.5" /> OFICIAL
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-medium">@rivalfit</p>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{rivalfitProfile.bio}</p>
                    </div>
                    <div className="flex items-center gap-4 text-center shrink-0">
                        <div>
                            <p className="text-white font-black text-lg">{posts.length}</p>
                            <p className="text-gray-600 text-[9px] uppercase tracking-widest">Posts</p>
                        </div>
                        <Link
                            href="/dashboard/profile/rivalfit"
                            target="_blank"
                            className="flex items-center gap-1.5 text-xs text-brand-red font-black uppercase tracking-widest hover:underline"
                        >
                            <Eye className="w-3.5 h-3.5" /> Ver perfil
                        </Link>
                    </div>
                </div>
            )}

            {/* Posts grid */}
            <div>
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">{posts.length} publicaciones</h2>
                {posts.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-4 opacity-40">
                        <Megaphone className="w-12 h-12 text-gray-600" />
                        <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Sin publicaciones aún</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create post modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5">
                            <h2 className="text-lg font-heading font-black text-white italic uppercase">Nuevo Post Oficial</h2>
                            <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white p-2"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            {/* Post type */}
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Tipo de Post</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {POST_TYPES.map(pt => (
                                        <button
                                            key={pt.id}
                                            onClick={() => setPostType(pt.id as any)}
                                            className={clsx(
                                                'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                                                postType === pt.id ? pt.bg + ' ' + pt.color : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8'
                                            )}
                                        >
                                            <pt.icon className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-bold uppercase tracking-wider">{pt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Caption */}
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Texto del Post *</label>
                                <textarea
                                    className={clsx(inputCls, 'resize-none h-32')}
                                    placeholder="Escribe el contenido del post..."
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-600 mt-1 text-right">{caption.length} caracteres</p>
                            </div>

                            {/* Media URL (for image posts) */}
                            {postType === 'image' && (
                                <div>
                                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">URL de Imagen</label>
                                    <input
                                        className={inputCls}
                                        placeholder="https://..."
                                        value={mediaUrl}
                                        onChange={e => setMediaUrl(e.target.value)}
                                    />
                                    {mediaUrl && (
                                        <div className="mt-2 h-24 relative rounded-xl overflow-hidden border border-white/10">
                                            <NextImage src={mediaUrl} alt="preview" fill className="object-cover" />
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handlePublish}
                                disabled={isPending || !caption.trim() || !hasProfile}
                                className="w-full bg-brand-red text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                                {isPending ? 'Publicando...' : 'Publicar como @rivalfit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit profile modal */}
            {showEditProfile && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5">
                            <h2 className="text-lg font-heading font-black text-white italic uppercase">Editar Perfil @rivalfit</h2>
                            <button onClick={() => setShowEditProfile(false)} className="text-gray-500 hover:text-white p-2"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Bio</label>
                                <textarea className={clsx(inputCls, 'resize-none h-24')} value={profileBio} onChange={e => setProfileBio(e.target.value)} placeholder="Descripción de la cuenta oficial..." />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">URL del Avatar (Logo)</label>
                                <input className={inputCls} value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">URL de la Portada</label>
                                <input className={inputCls} value={profileCover} onChange={e => setProfileCover(e.target.value)} placeholder="https://..." />
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isPending}
                                className="w-full bg-brand-red text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {isPending ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
