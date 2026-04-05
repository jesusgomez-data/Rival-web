'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Instagram, Facebook, TrendingUp, Calendar, Lightbulb, FileText, Plus, Clock, CheckCircle, Edit3, Trash2, Layers, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { getSocialPosts, createSocialPost, deleteSocialPost, updateSocialPost } from './actions'

const PLATFORM_ICONS: Record<string, any> = {
    instagram: { icon: Instagram, color: '#E1306C', bg: 'bg-pink-500/10 border-pink-500/20' },
    facebook: { icon: Facebook, color: '#1877F2', bg: 'bg-blue-500/10 border-blue-500/20' },
    tiktok: { icon: () => <span className="text-xs font-black">TT</span>, color: '#ffffff', bg: 'bg-white/10 border-white/20' },
    all: { icon: () => <span className="text-xs font-black">ALL</span>, color: '#C9A84C', bg: 'bg-[#C9A84C]/10 border-[#C9A84C]/20' },
}

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-gray-700/50 text-gray-400 border-gray-600/50',
    ready: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    scheduled: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30',
    published: 'bg-green-500/10 text-green-400 border-green-500/30',
}
const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador', ready: 'Listo', scheduled: 'Programado', published: 'Publicado'
}

export default function SocialMediaDashboard() {
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ title: '', caption: '', platform: 'instagram', post_type: 'image', status: 'draft', scheduled_for: '', thumbnail_url: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadPosts() }, [])

    async function loadPosts() {
        setLoading(true)
        const data = await getSocialPosts()
        setPosts(data)
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            await createSocialPost({ ...form, scheduled_for: form.scheduled_for || undefined })
            setShowCreate(false)
            setForm({ title: '', caption: '', platform: 'instagram', post_type: 'image', status: 'draft', scheduled_for: '', thumbnail_url: '' })
            await loadPosts()
        } finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        await deleteSocialPost(id)
        await loadPosts()
    }

    async function handleStatusChange(id: string, status: string) {
        await updateSocialPost(id, { status })
        await loadPosts()
    }

    const thisWeek = posts.filter(p => {
        if (!p.scheduled_for) return false
        const d = new Date(p.scheduled_for)
        const now = new Date()
        const week = new Date(now); week.setDate(now.getDate() + 7)
        return d >= now && d <= week
    })
    const published = posts.filter(p => p.status === 'published')
    const drafts = posts.filter(p => p.status === 'draft')
    const ready = posts.filter(p => p.status === 'ready' || p.status === 'scheduled')

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        SOCIAL MEDIA <span className="text-[#C9A84C]">MANAGER</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestiona todo tu contenido para redes sociales</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#C9A84C] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#D4B483] transition-all">
                    <Plus className="w-4 h-4" /> Nuevo Post
                </button>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Esta semana', value: thisWeek.length, icon: Calendar, color: '#C9A84C', link: '/dashboard/admin/social-media/calendar' },
                    { label: 'Publicados', value: published.length, icon: CheckCircle, color: '#4ade80', link: null },
                    { label: 'Listos', value: ready.length, icon: Clock, color: '#60a5fa', link: null },
                    { label: 'Borradores', value: drafts.length, icon: Edit3, color: '#9ca3af', link: null },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-[#C9A84C]/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                            </div>
                            <p className="text-3xl font-black text-white">{stat.value}</p>
                            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { href: '/dashboard/admin/social-media/calendar', label: 'Calendario', icon: Calendar, desc: 'Ver mes completo' },
                    { href: '/dashboard/admin/social-media/metrics', label: 'Métricas', icon: BarChart3, desc: 'Stats de tus redes' },
                    { href: '/dashboard/admin/social-media/scripts', label: 'Guiones IA', icon: FileText, desc: 'Genera con IA' },
                    { href: '/dashboard/admin/social-media/carousels', label: 'Carruseles IA', icon: Layers, desc: 'Crea con IA' },
                ].map((item, i) => (
                    <motion.div key={item.href} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                        <Link href={item.href} className="block bg-[#111] border border-white/5 rounded-2xl p-4 hover:border-[#C9A84C]/30 hover:bg-[#C9A84C]/5 transition-all group">
                            <item.icon className="w-6 h-6 text-[#C9A84C] mb-2 group-hover:scale-110 transition-transform" />
                            <p className="text-white font-bold text-sm">{item.label}</p>
                            <p className="text-gray-600 text-xs mt-0.5">{item.desc}</p>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Posts List */}
            <div>
                <h2 className="text-white font-black text-lg mb-4 uppercase tracking-widest">Todos los posts</h2>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-[#111] rounded-2xl animate-pulse" />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-600 text-sm">No tienes posts aún.</p>
                        <button onClick={() => setShowCreate(true)} className="mt-4 text-[#C9A84C] text-sm font-bold hover:underline">Crear el primero →</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {posts.map((post, i) => {
                            const platform = PLATFORM_ICONS[post.platform] || PLATFORM_ICONS.instagram
                            const PlatformIcon = platform.icon
                            return (
                                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#C9A84C]/20 transition-all group">
                                    {/* Thumbnail */}
                                    <div className="h-36 bg-[#1a1a1a] relative overflow-hidden">
                                        {post.thumbnail_url ? (
                                            <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-gray-700 text-4xl font-black">{post.platform?.[0]?.toUpperCase()}</span>
                                            </div>
                                        )}
                                        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${platform.bg}`}>
                                            <PlatformIcon style={{ color: platform.color }} className="w-3 h-3" />
                                            <span style={{ color: platform.color }}>{post.platform}</span>
                                        </div>
                                    </div>
                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="text-white font-bold text-sm truncate">{post.title}</h3>
                                        {post.scheduled_for && (
                                            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(post.scheduled_for).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between mt-3">
                                            <select
                                                value={post.status}
                                                onChange={e => handleStatusChange(post.id, e.target.value)}
                                                className={`text-xs font-bold px-2 py-1 rounded-lg border bg-transparent cursor-pointer ${STATUS_STYLES[post.status]}`}
                                            >
                                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                                    <option key={val} value={val} className="bg-[#1a1a1a] text-white">{label}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => handleDelete(post.id)} className="p-1.5 text-gray-600 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6 w-full max-w-lg">
                        <h2 className="text-white font-black text-xl mb-6">Nuevo Post</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Título *</label>
                                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none" placeholder="Título del post" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Caption</label>
                                <textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} rows={3}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none resize-none" placeholder="Texto del post..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Plataforma</label>
                                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none">
                                        <option value="instagram">Instagram</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="all">Todas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Tipo</label>
                                    <select value={form.post_type} onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none">
                                        <option value="image">Imagen</option>
                                        <option value="carousel">Carrusel</option>
                                        <option value="video">Video</option>
                                        <option value="reel">Reel</option>
                                        <option value="story">Historia</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Estado</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none">
                                        <option value="draft">Borrador</option>
                                        <option value="ready">Listo</option>
                                        <option value="scheduled">Programado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Fecha programada</label>
                                    <input type="datetime-local" value={form.scheduled_for} onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">URL Miniatura</label>
                                <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none" placeholder="https://..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:border-white/20 transition-all">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-black font-bold text-sm hover:bg-[#D4B483] transition-all disabled:opacity-50">
                                    {saving ? 'Guardando...' : 'Crear Post'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
