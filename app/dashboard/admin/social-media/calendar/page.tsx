'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, X, Instagram, Facebook, Clock } from 'lucide-react'
import { getSocialPosts, createSocialPost } from '../actions'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const PLATFORM_COLORS: Record<string, string> = {
    instagram: '#E1306C', facebook: '#1877F2', tiktok: '#ffffff', all: '#C9A84C'
}

export default function CalendarPage() {
    const today = new Date()
    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())
    const [posts, setPosts] = useState<any[]>([])
    const [selectedDay, setSelectedDay] = useState<number | null>(null)
    const [showPanel, setShowPanel] = useState(false)
    const [form, setForm] = useState({ title: '', caption: '', platform: 'instagram', post_type: 'image', status: 'scheduled', scheduled_for: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { getSocialPosts().then(setPosts) }, [])

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1)

    const postsByDay = posts.reduce((acc: Record<number, any[]>, post) => {
        if (!post.scheduled_for) return acc
        const d = new Date(post.scheduled_for)
        if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate()
            acc[day] = [...(acc[day] || []), post]
        }
        return acc
    }, {})

    const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
    const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

    const selectedPosts = selectedDay ? (postsByDay[selectedDay] || []) : []
    const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}T12:00`
            await createSocialPost({ ...form, scheduled_for: dateStr })
            const updated = await getSocialPosts()
            setPosts(updated)
            setForm({ title: '', caption: '', platform: 'instagram', post_type: 'image', status: 'scheduled', scheduled_for: '' })
        } finally { setSaving(false) }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black text-white tracking-tight">
                    CALENDARIO <span className="text-[#C9A84C]">MENSUAL</span>
                </h1>
                <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-white font-black text-lg w-40 text-center">{MONTHS[month]} {year}</span>
                    <button onClick={nextMonth} className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Calendar Grid */}
                <div className="flex-1 min-w-0">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-gray-600 text-xs uppercase tracking-widest font-bold py-2">{d}</div>
                        ))}
                    </div>
                    {/* Cells */}
                    <div className="grid grid-cols-7 gap-1">
                        {cells.map((day, i) => {
                            const dayPosts = day ? (postsByDay[day] || []) : []
                            const hasContent = dayPosts.length > 0
                            const selected = selectedDay === day && day !== null
                            return (
                                <motion.div key={i} whileHover={day ? { scale: 1.02 } : {}}
                                    onClick={() => { if (day) { setSelectedDay(day); setShowPanel(true) } }}
                                    className={`min-h-[80px] md:min-h-[100px] rounded-xl p-2 cursor-pointer transition-all
                                        ${!day ? 'opacity-0 pointer-events-none' : ''}
                                        ${selected ? 'border-2 border-[#C9A84C] bg-[#C9A84C]/10' : hasContent ? 'border border-[#C9A84C]/40 bg-[#1a1a1a]' : 'border border-white/5 bg-[#111] hover:border-white/10'}
                                        ${isToday(day!) ? 'ring-2 ring-[#C9A84C]/50' : ''}
                                    `}>
                                    {day && (
                                        <>
                                            <p className={`text-xs font-black mb-1 ${isToday(day) ? 'text-[#C9A84C]' : 'text-gray-500'}`}>
                                                {isToday(day) ? <span className="bg-[#C9A84C] text-black rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{day}</span> : day}
                                            </p>
                                            <div className="space-y-0.5">
                                                {dayPosts.slice(0, 2).map((p: any) => (
                                                    <div key={p.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-bold truncate"
                                                        style={{ backgroundColor: `${PLATFORM_COLORS[p.platform]}20`, color: PLATFORM_COLORS[p.platform] }}>
                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PLATFORM_COLORS[p.platform] }} />
                                                        <span className="truncate hidden md:block">{p.title}</span>
                                                    </div>
                                                ))}
                                                {dayPosts.length > 2 && <p className="text-[9px] text-gray-600 pl-1">+{dayPosts.length - 2} más</p>}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* Side Panel */}
                <AnimatePresence>
                    {showPanel && selectedDay && (
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                            className="w-80 shrink-0 bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-5 self-start sticky top-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-black">{selectedDay} {MONTHS[month]}</h3>
                                <button onClick={() => { setShowPanel(false); setSelectedDay(null) }} className="text-gray-600 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Existing posts for this day */}
                            {selectedPosts.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {selectedPosts.map((p: any) => (
                                        <div key={p.id} className="bg-[#1a1a1a] rounded-xl p-3 border border-white/5">
                                            <p className="text-white text-sm font-bold truncate">{p.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold" style={{ color: PLATFORM_COLORS[p.platform] }}>{p.platform}</span>
                                                <span className="text-gray-600 text-xs">{p.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Create new post for this day */}
                            <div className="border-t border-white/5 pt-4">
                                <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-bold flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Nuevo post para este día
                                </p>
                                <form onSubmit={handleCreate} className="space-y-3">
                                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#C9A84C]/50 outline-none"
                                        placeholder="Título del post" />
                                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#C9A84C]/50 outline-none">
                                        <option value="instagram">Instagram</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="all">Todas</option>
                                    </select>
                                    <select value={form.post_type} onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#C9A84C]/50 outline-none">
                                        <option value="image">Imagen</option>
                                        <option value="carousel">Carrusel</option>
                                        <option value="reel">Reel</option>
                                        <option value="story">Historia</option>
                                        <option value="video">Video</option>
                                    </select>
                                    <button type="submit" disabled={saving}
                                        className="w-full py-2 bg-[#C9A84C] text-black font-bold text-sm rounded-xl hover:bg-[#D4B483] transition-all disabled:opacity-50">
                                        {saving ? 'Guardando...' : 'Agregar al calendario'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
