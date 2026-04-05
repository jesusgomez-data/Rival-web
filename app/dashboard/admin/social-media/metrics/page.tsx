'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Users, Eye, Heart, Award, Plus, Instagram, Facebook } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getMetrics, saveMetrics } from '../actions'

const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', color: '#E1306C' },
    { id: 'facebook', label: 'Facebook', color: '#1877F2' },
    { id: 'tiktok', label: 'TikTok', color: '#ffffff' },
]

// Demo growth data for chart
const generateGrowthData = (base: number) => {
    return Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        value: Math.round(base + (Math.random() - 0.3) * base * 0.05 * i)
    }))
}

const customTooltipStyle = {
    backgroundColor: '#111',
    border: '1px solid #C9A84C33',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
}

export default function MetricsPage() {
    const [metrics, setMetrics] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ platform: 'instagram', followers: '', avg_engagement: '', monthly_views: '', posts_count: '' })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadMetrics() }, [])

    async function loadMetrics() {
        setLoading(true)
        const data = await getMetrics()
        setMetrics(data)
        setLoading(false)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        try {
            await saveMetrics({
                platform: form.platform,
                followers: parseInt(form.followers) || 0,
                avg_engagement: parseFloat(form.avg_engagement) || 0,
                monthly_views: parseInt(form.monthly_views) || 0,
                posts_count: parseInt(form.posts_count) || 0,
            })
            setShowForm(false)
            setForm({ platform: 'instagram', followers: '', avg_engagement: '', monthly_views: '', posts_count: '' })
            await loadMetrics()
        } finally { setSaving(false) }
    }

    // Get latest metrics per platform
    const latestByPlatform: Record<string, any> = {}
    metrics.forEach(m => {
        if (!latestByPlatform[m.platform] || new Date(m.created_at) > new Date(latestByPlatform[m.platform].created_at)) {
            latestByPlatform[m.platform] = m
        }
    })

    const totalFollowers = Object.values(latestByPlatform).reduce((sum: number, m: any) => sum + (m.followers || 0), 0)
    const avgEngagement = Object.values(latestByPlatform).length > 0
        ? Object.values(latestByPlatform).reduce((sum: number, m: any) => sum + (m.avg_engagement || 0), 0) / Object.values(latestByPlatform).length
        : 0
    const totalViews = Object.values(latestByPlatform).reduce((sum: number, m: any) => sum + (m.monthly_views || 0), 0)

    // Chart data
    const instMetrics = latestByPlatform['instagram']
    const growthData = generateGrowthData(instMetrics?.followers || 1000).map((d, i) => ({
        day: `Día ${d.day}`,
        Instagram: d.value,
        TikTok: Math.round((latestByPlatform['tiktok']?.followers || 500) + (Math.random() - 0.3) * 200 * i * 0.1),
        Facebook: Math.round((latestByPlatform['facebook']?.followers || 800) + (Math.random() - 0.4) * 150 * i * 0.1),
    })).filter((_, i) => i % 5 === 0)

    const platformCompareData = PLATFORMS.map(p => ({
        platform: p.label,
        Seguidores: latestByPlatform[p.id]?.followers || 0,
        Engagement: (latestByPlatform[p.id]?.avg_engagement || 0) * 100,
        Vistas: (latestByPlatform[p.id]?.monthly_views || 0) / 1000,
    }))

    const formatNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString()

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        MÉTRICAS <span className="text-[#C9A84C]">SOCIALES</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Actualiza tus números manualmente</p>
                </div>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#C9A84C] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#D4B483] transition-all">
                    <Plus className="w-4 h-4" /> Actualizar métricas
                </button>
            </div>

            {/* Big Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Seguidores totales', value: formatNum(totalFollowers), icon: Users, sub: 'en todas las redes', trend: 'up' },
                    { label: 'Engagement promedio', value: `${avgEngagement.toFixed(1)}%`, icon: Heart, sub: 'tasa de interacción', trend: avgEngagement > 3 ? 'up' : 'down' },
                    { label: 'Vistas del mes', value: formatNum(totalViews), icon: Eye, sub: 'visualizaciones totales', trend: 'up' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15, type: 'spring' }}
                        className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:border-[#C9A84C]/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className="w-6 h-6 text-[#C9A84C]" />
                            {stat.trend === 'up'
                                ? <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-lg"><TrendingUp className="w-3 h-3" /> Subiendo</div>
                                : <div className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-400/10 px-2 py-1 rounded-lg"><TrendingDown className="w-3 h-3" /> Bajando</div>
                            }
                        </div>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.15 }}
                            className="text-5xl font-black text-[#C9A84C] tracking-tighter">{stat.value}</motion.p>
                        <p className="text-gray-500 text-sm mt-2 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-gray-700 text-xs mt-1">{stat.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Per-Platform Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLATFORMS.map((p, i) => {
                    const m = latestByPlatform[p.id]
                    return (
                        <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                            className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-[#C9A84C]/10 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${p.color}20` }}>
                                    <span className="text-xs font-black" style={{ color: p.color }}>{p.label[0]}</span>
                                </div>
                                <span className="text-white font-black">{p.label}</span>
                            </div>
                            {m ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Seguidores</span>
                                        <span className="text-white font-black text-lg" style={{ color: p.color }}>{formatNum(m.followers)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Engagement</span>
                                        <span className="text-white font-bold">{m.avg_engagement}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Vistas/mes</span>
                                        <span className="text-white font-bold">{formatNum(m.monthly_views)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs">Posts</span>
                                        <span className="text-white font-bold">{m.posts_count}</span>
                                    </div>
                                    <p className="text-gray-700 text-xs border-t border-white/5 pt-2">Actualizado: {new Date(m.created_at).toLocaleDateString('es-ES')}</p>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-gray-600 text-sm">Sin datos</p>
                                    <button onClick={() => { setForm(f => ({ ...f, platform: p.id })); setShowForm(true) }}
                                        className="mt-2 text-[#C9A84C] text-xs font-bold hover:underline">Agregar →</button>
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Growth Line Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-black mb-1">Crecimiento — Últimos 30 días</h2>
                <p className="text-gray-600 text-xs mb-6">Proyección estimada basada en tus datos actuales</p>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="day" tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} />
                        <Tooltip contentStyle={customTooltipStyle} formatter={(v: any) => formatNum(v)} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                        <Line type="monotone" dataKey="Instagram" stroke="#E1306C" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#E1306C' }} />
                        <Line type="monotone" dataKey="TikTok" stroke="#ffffff" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Facebook" stroke="#1877F2" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#1877F2' }} />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Bar Chart Comparison */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="bg-[#111] border border-white/5 rounded-2xl p-6">
                <h2 className="text-white font-black mb-1">Comparativa por plataforma</h2>
                <p className="text-gray-600 text-xs mb-6">Seguidores (K) · Engagement (%) · Vistas (K)</p>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={platformCompareData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="platform" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                        <Bar dataKey="Seguidores" fill="#C9A84C" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Engagement" fill="#4ade80" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Vistas" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Update Metrics Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-white font-black text-xl mb-6">Actualizar Métricas</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">Plataforma</label>
                                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#C9A84C]/50">
                                    <option value="instagram">Instagram</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="tiktok">TikTok</option>
                                </select>
                            </div>
                            {[
                                { key: 'followers', label: 'Seguidores', placeholder: '12500' },
                                { key: 'avg_engagement', label: 'Engagement promedio (%)', placeholder: '3.5' },
                                { key: 'monthly_views', label: 'Vistas del mes', placeholder: '50000' },
                                { key: 'posts_count', label: 'Posts publicados', placeholder: '28' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-1 block">{field.label}</label>
                                    <input
                                        type="number" value={form[field.key as keyof typeof form]}
                                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#C9A84C]/50 outline-none"
                                        placeholder={field.placeholder} />
                                </div>
                            ))}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-black font-bold text-sm hover:bg-[#D4B483] disabled:opacity-50">
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
