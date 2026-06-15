'use client'

import { useState, useRef } from 'react'
import { Video, Upload, Trash2, Lock, Play, Loader2, Eye, Users, X } from 'lucide-react'
import { createPost, deletePost } from '../../feed-actions'
import { useRouter } from 'next/navigation'

interface Post {
    id: string
    content: string
    image_urls: string[] | null
    created_at: string
    profiles?: { full_name: string; avatar_url: string | null }
}

function mediaUrl(post: Post) { return post.image_urls?.[0] ?? null }
function isVideo(url: string) { return /\.(mp4|webm|mov|m4v|ogv|avi)(\?|$)/i.test(url) }

export default function ProfessionalVideoManager({
    centerId, initialPosts, currentUserId
}: {
    centerId: string
    initialPosts: Post[]
    currentUserId: string | undefined
}) {
    const router     = useRouter()
    const posts      = initialPosts.filter((p: any) => p.post_type === 'post')
    const fileRef    = useRef<HTMLInputElement>(null)

    const [caption,    setCaption]    = useState('')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [mediaType,  setMediaType]  = useState<'image' | 'video'>('video')
    const [fileName,   setFileName]   = useState<string | null>(null)
    const [isPosting,  setIsPosting]  = useState(false)
    const [deleting,   setDeleting]   = useState<string | null>(null)
    const [lightbox,   setLightbox]   = useState<Post | null>(null)
    const [error,      setError]      = useState<string | null>(null)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) { setPreviewUrl(null); setFileName(null); return }
        setPreviewUrl(URL.createObjectURL(file))
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image')
        setFileName(file.name)
    }

    function clearFile() {
        setPreviewUrl(null)
        setFileName(null)
        if (fileRef.current) fileRef.current.value = ''
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!caption.trim() && !previewUrl) { setError('Añade un vídeo o descripción'); return }
        setIsPosting(true); setError(null)
        const fd = new FormData(e.currentTarget)
        fd.append('postAsCenter', 'true')
        const res = await createPost(centerId, fd)
        setIsPosting(false)
        if (res.error) { setError(res.error); return }
        setCaption('')
        clearFile()
        router.refresh()
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este contenido?')) return
        setDeleting(id)
        await deletePost(centerId, id)
        setDeleting(null)
        router.refresh()
    }

    const videoPosts  = posts.filter(p => { const u = mediaUrl(p); return !!u && isVideo(u) })
    const imagePosts  = posts.filter(p => { const u = mediaUrl(p); return !!u && !isVideo(u) })

    return (
        <div className="space-y-8">

            {/* ── UPLOAD CARD ──────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-[380px_1fr] gap-6">
                <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Nuevo contenido</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Solo visible para tus clientes con reservas</p>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Single file input — always in DOM so FormData captures the file */}
                        <input
                            ref={fileRef}
                            name="media"
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Drop zone / preview */}
                        {!previewUrl ? (
                            <button type="button" onClick={() => fileRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-2xl aspect-video cursor-pointer hover:border-brand-red/40 hover:bg-brand-red/[0.03] transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-brand-red" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-semibold text-sm">Selecciona archivo</p>
                                    <p className="text-gray-600 text-xs mt-0.5">Vídeo o imagen · máx. 50 MB</p>
                                </div>
                            </button>
                        ) : (
                            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black">
                                {mediaType === 'video'
                                    ? <video src={previewUrl} className="w-full h-full object-contain" controls playsInline />
                                    : <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                }
                                <button type="button" onClick={clearFile}
                                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center hover:bg-brand-red transition-colors">
                                    <X className="w-3.5 h-3.5 text-white" />
                                </button>
                                {fileName && (
                                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-white text-[11px] font-medium truncate">{fileName}</p>
                                    </div>
                                )}
                                {/* Cambiar archivo */}
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-[10px] text-white font-semibold hover:bg-black/80 transition-colors">
                                    Cambiar
                                </button>
                            </div>
                        )}

                        {/* Caption */}
                        <textarea name="content" value={caption} onChange={e => setCaption(e.target.value)}
                            placeholder="Descripción (ejercicio, consejos, rutina...)"
                            rows={3}
                            className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/20 transition-colors resize-none placeholder:text-gray-600" />

                        {error && <p className="text-rose-400 text-xs font-medium">{error}</p>}

                        {/* Privacy notice */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <p className="text-amber-300/80 text-[11px]">Solo tus clientes con reservas podrán ver este contenido</p>
                        </div>

                        <button type="submit" disabled={isPosting}
                            className="w-full h-11 flex items-center justify-center gap-2 bg-brand-red text-white rounded-xl font-semibold text-sm hover:bg-red-600 disabled:opacity-50 transition-all">
                            {isPosting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publicando...</> : <><Video className="w-4 h-4" /> Publicar</>}
                        </button>
                    </div>
                </form>

                {/* Stats / info panel */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card border border-border rounded-2xl p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Publicaciones</p>
                            <p className="text-3xl font-black text-white mt-1">{posts.length}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{videoPosts.length} vídeos · {imagePosts.length} imágenes</p>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Acceso</p>
                            </div>
                            <p className="text-sm font-bold text-amber-300 mt-2">Solo clientes</p>
                            <p className="text-xs text-gray-600 mt-0.5">con reserva activa o pasada</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-brand-red" />
                            <p className="text-sm font-black text-white uppercase tracking-wider">¿Quién lo ve?</p>
                        </div>
                        <div className="space-y-2 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-[10px] text-green-400 font-bold">✓</span>
                                Clientes con reserva activa
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-[10px] text-green-400 font-bold">✓</span>
                                Clientes con reservas anteriores
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[10px] text-red-400 font-bold">✗</span>
                                Visitantes sin reserva
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[10px] text-red-400 font-bold">✗</span>
                                Usuarios no registrados
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CONTENT GRID ─────────────────────────────────────────── */}
            {posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-white/8 rounded-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-white/4 flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-700" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-semibold">Sin contenido publicado</p>
                        <p className="text-gray-500 text-sm mt-1">Sube vídeos de ejercicios, consejos o rutinas para tus clientes</p>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-4 h-4 text-gray-500" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">Contenido publicado ({posts.length})</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {posts.map(post => {
                            const url     = mediaUrl(post)
                            const vidPost = url && isVideo(url)
                            return (
                            <div key={post.id} className="group relative bg-card border border-border rounded-2xl overflow-hidden aspect-square">
                                {/* Thumbnail */}
                                {url ? (
                                    vidPost ? (
                                        <video src={url}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            muted playsInline preload="metadata" />
                                    ) : (
                                        <img src={url} alt=""
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white/3 p-4">
                                        <p className="text-gray-400 text-xs text-center line-clamp-4">{post.content}</p>
                                    </div>
                                )}

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    {url && (
                                        <button onClick={() => setLightbox(post)}
                                            className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                                            <Play className="w-4 h-4 text-black" />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(post.id)} disabled={deleting === post.id}
                                        className="w-9 h-9 bg-rose-500/90 rounded-full flex items-center justify-center hover:bg-rose-500 transition-colors">
                                        {deleting === post.id
                                            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            : <Trash2 className="w-4 h-4 text-white" />
                                        }
                                    </button>
                                </div>

                                {/* Video badge */}
                                {vidPost && (
                                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded-md">
                                        <Play className="w-3 h-3 text-white" />
                                    </div>
                                )}

                                {/* Lock badge */}
                                <div className="absolute top-2 left-2 bg-black/60 p-1 rounded-md">
                                    <Lock className="w-3 h-3 text-amber-400" />
                                </div>

                                {/* Caption */}
                                {post.content && (
                                    <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-white text-[11px] font-medium leading-tight line-clamp-2">{post.content}</p>
                                    </div>
                                )}
                            </div>
                        )})}

                    </div>
                </div>
            )}

            {/* ── LIGHTBOX ─────────────────────────────────────────────── */}
            {lightbox && (() => {
                const lbUrl = mediaUrl(lightbox)
                const lbVid = lbUrl && isVideo(lbUrl)
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                        onClick={() => setLightbox(null)}>
                        <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                            {lbVid ? (
                                <video src={lbUrl} className="w-full rounded-2xl" controls autoPlay playsInline />
                            ) : lbUrl ? (
                                <img src={lbUrl} alt="" className="w-full rounded-2xl object-contain max-h-[80vh]" />
                            ) : null}
                            {lightbox.content && (
                                <p className="text-gray-300 text-sm mt-4 px-2">{lightbox.content}</p>
                            )}
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
