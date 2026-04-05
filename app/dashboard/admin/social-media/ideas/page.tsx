'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Plus, Trash2, CheckCircle, Flame, ArrowUp, Minus } from 'lucide-react'
import { getIdeas, createIdea, deleteIdea, markIdeaUsed } from '../actions'

const PRIORITY_CONFIG = {
    high: { label: 'Alta', icon: Flame, color: '#ef4444', bg: 'bg-red-500/10 border-red-500/20' },
    medium: { label: 'Media', icon: ArrowUp, color: '#C9A84C', bg: 'bg-[#C9A84C]/10 border-[#C9A84C]/20' },
    low: { label: 'Baja', icon: Minus, color: '#6b7280', bg: 'bg-gray-700/30 border-gray-600/20' },
}

const PLATFORM_COLORS: Record<string, string> = {
    instagram: '#E1306C', facebook: '#1877F2', tiktok: '#ffffff', all: '#C9A84C', '': '#6b7280'
}

export default function IdeasPage() {
    const [ideas, setIdeas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [filter, setFilter] = useState<'all' | 'pending' | 'used'>('pending')
    const [form, setForm] = useState({ title: '', description: '', platform: '', content_type: '', priority: 'medium' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadIdeas() }, [])

    async function loadIdeas() {
        setLoading(true)
        const data = await getIdeas()
        setIdeas(data)
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            await createIdea(form)
            setShowForm(false)
            setForm({ title: '', description: '', platform: '', content_type: '', priority: 'medium' })
            await loadIdeas()
        } finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        await deleteIdea(id)
        await loadIdeas()
    }

    async function handleMarkUsed(id: string) {
        await markIdeaUsed(id)
        await loadIdeas()
    }

    const filtered = ideas.filter(i => {
        if (filter === 'pending') return !i.is_used
        if (filter === 'used') return i.is_used
        return true
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        BANCO DE <span className="text-[#C9A84C]">IDEAS</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">{ideas.filter(i => !i.is_used).length} ideas pendientes</p>
                </div>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#C9A84C] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#D4B483] transition-all">
                    <Plus className="w-4 h-4" /> Nueva Idea
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(['all', 'pending', 'used'] as const).map(tab => (
                    <button key={tab} onClick={() => setFilter(tab)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30' : 'text-gray-600 hover:text-gray-400'}`}>
                        {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendientes' : 'Usadas'}
                        <span className="ml-2 text-xs opacity-60">
                            {tab === 'all' ? ideas.length : tab === 'pending' ? ideas.filter(i => !i.is_used).length : ideas.filter(i => i.is_used).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Ideas Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-[#111] rounded-2xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <Lightbulb className="w-12 h-12 text-[#C9A84C]/30 mx-auto mb-3" />
                    <p className="text-gray-600">No hay ideas aquí aún.</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 text-[#C9A84C] text-sm font-bold hover:underline">Agregar idea →</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filtered.map((idea, i) => {
                            const priority = PRIORITY_CONFIG[idea.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium
                            const PriorityIcon = priority.icon
                            return (
                                <motion.div key={idea.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: idea.is_used ? 0.5 : 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}
                                    className={`bg-[#111] border rounded-2xl p-5 transition-all hover:border-[#C9A84C]/20 ${idea.is_used ? 'border-white/5' : 'border-white/5'}`}>
                                    {/* Priority badge */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${priority.bg}`} style={{ color: priority.color }}>
                                            <PriorityIcon className="w-3 h-3" />
                                            {priority.label}
                                        </span>
                                        {idea.platform && (
                                            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: PLATFORM_COLORS[idea.platform], background: `${PLATFORM_COLORS[idea.platform]}15` }}>
                                                {idea.platform}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className={`font-black text-base mb-1 ${idea.is_used ? 'text-gray-500 line-through' : 'text-white'}`}>{idea.title}</h3>
                                    {idea.description && <p className="text-gray-500 text-sm leading-relaxed">{idea.description}</p>}
                                    {idea.content_type && <p className="text-[#C9A84C]/60 text-xs mt-2 font-bold uppercase">{idea.content_type}</p>}

                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                                        <p className="text-gray-700 text-xs flex-1">{new Date(idea.created_at).toLocaleDateString('es-ES')}</p>
                                        {!idea.is_used && (
                                            <button onClick={() => handleMarkUsed(idea.id)} className="p-1.5 text-gray-600 hover:text-green-400 transition-colors" title="Marcar como usada">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(idea.id)} className="p-1.5 text-gray-600 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6 w-full max-w-md">
                            <div className="flex items-center gap-3 mb-6">
                                <Lightbulb className="w-6 h-6 text-[#C9A84C]" />
                                <h2 className="text-white font-black text-xl">Nueva Idea</h2>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Título *</label>
                                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none"
                                        placeholder="¿De qué trata la idea?" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Descripción</label>
                                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none resize-none"
                                        placeholder="Detalles, referencias, notas..." />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Red</label>
                                        <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                                            <option value="">Todas</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="tiktok">TikTok</option>
                                            <option value="facebook">Facebook</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Tipo</label>
                                        <input value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))}
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none"
                                            placeholder="Reel..." />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Prioridad</label>
                                        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                                            <option value="high">Alta</option>
                                            <option value="medium">Media</option>
                                            <option value="low">Baja</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:border-white/20">Cancelar</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-black font-bold text-sm hover:bg-[#D4B483] disabled:opacity-50">
                                        {saving ? 'Guardando...' : 'Guardar Idea'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
