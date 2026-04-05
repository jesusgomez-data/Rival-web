'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, FileText, Trash2, Clock, Play, ChevronDown, ChevronUp, Loader2, BookOpen } from 'lucide-react'
import { generateScript, getScripts, deleteScript } from '../actions'

const FORMAT_ICONS: Record<string, string> = {
    reel: '🎬', corto: '⚡', 'video largo': '📹', historia: '📖', carrusel: '🖼️'
}

export default function ScriptsPage() {
    const [scripts, setScripts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [topic, setTopic] = useState('')
    const [format, setFormat] = useState('reel')
    const [tone, setTone] = useState('profesional pero cercano')
    const [result, setResult] = useState<any>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [error, setError] = useState('')

    useEffect(() => { loadScripts() }, [])

    async function loadScripts() {
        setLoading(true)
        const data = await getScripts()
        setScripts(data)
        setLoading(false)
    }

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault()
        if (!topic.trim()) return
        setGenerating(true)
        setError('')
        setResult(null)
        try {
            const data = await generateScript(topic, format, tone)
            setResult(data)
            await loadScripts()
        } catch (err: any) {
            setError(err.message || 'Error generando guion')
        } finally {
            setGenerating(false)
        }
    }

    async function handleDelete(id: string) {
        await deleteScript(id)
        await loadScripts()
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                    GUIONES <span className="text-[#C9A84C]">CON IA</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">Genera guiones profesionales en segundos</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Generator Form */}
                <div className="space-y-4">
                    <div className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[#C9A84C]" />
                            </div>
                            <div>
                                <h2 className="text-white font-black">Generador de Guiones</h2>
                                <p className="text-gray-600 text-xs">Powered by Claude AI</p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Tema del video *</label>
                                <textarea
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    rows={3}
                                    required
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#C9A84C]/50 outline-none resize-none"
                                    placeholder="Ej: 5 errores que cometes en el gym y cómo evitarlos..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Formato</label>
                                    <select value={format} onChange={e => setFormat(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#C9A84C]/50">
                                        <option value="reel">Reel (15-90s)</option>
                                        <option value="corto">{'Short/TikTok (< 60s)'}</option>
                                        <option value="video largo">Video largo (5-20 min)</option>
                                        <option value="historia">Historia (15s)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Tono</label>
                                    <select value={tone} onChange={e => setTone(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#C9A84C]/50">
                                        <option value="profesional pero cercano">Profesional y cercano</option>
                                        <option value="motivacional e intenso">Motivacional e intenso</option>
                                        <option value="educativo y técnico">Educativo y técnico</option>
                                        <option value="informal y divertido">Informal y divertido</option>
                                        <option value="inspiracional">Inspiracional</option>
                                    </select>
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-2">{error}</p>}
                            <button type="submit" disabled={generating || !topic.trim()}
                                className="w-full py-3 rounded-xl bg-[#C9A84C] text-black font-black text-sm hover:bg-[#D4B483] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4" /> Generar Guion</>}
                            </button>
                        </form>
                    </div>

                    {/* Result */}
                    <AnimatePresence>
                        {result && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="bg-[#111] border border-[#C9A84C]/30 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[#C9A84C] font-black">{result.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-1 rounded-lg">
                                            {FORMAT_ICONS[result.suggested_format] || '🎬'} {result.suggested_format}
                                        </span>
                                        <span className="text-xs font-bold bg-white/5 text-gray-400 px-2 py-1 rounded-lg flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {result.suggested_duration}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-[#1a1a1a] rounded-xl p-4 border-l-2 border-[#C9A84C]">
                                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">🎣 Gancho inicial</p>
                                        <p className="text-white text-sm font-bold">{result.hook}</p>
                                    </div>

                                    <div className="bg-[#1a1a1a] rounded-xl p-4">
                                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">📌 Puntos clave</p>
                                        <ul className="space-y-1">
                                            {result.key_points?.map((point: string, i: number) => (
                                                <li key={i} className="text-white text-sm flex items-start gap-2">
                                                    <span className="text-[#C9A84C] font-black shrink-0">{i + 1}.</span>
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-[#1a1a1a] rounded-xl p-4 border-l-2 border-green-500">
                                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">🚀 Llamada a la acción</p>
                                        <p className="text-white text-sm font-bold">{result.call_to_action}</p>
                                    </div>

                                    <details className="bg-[#1a1a1a] rounded-xl p-4">
                                        <summary className="text-gray-400 text-xs uppercase tracking-widest cursor-pointer hover:text-white transition-colors font-bold">
                                            📄 Ver guion completo
                                        </summary>
                                        <p className="text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{result.full_script}</p>
                                    </details>
                                </div>
                                <p className="text-green-400 text-xs text-center">✓ Guardado en tu biblioteca</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Scripts Library */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="w-5 h-5 text-[#C9A84C]" />
                        <h2 className="text-white font-black">Biblioteca de Guiones</h2>
                        <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">{scripts.length}</span>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#111] rounded-2xl animate-pulse" />)}
                        </div>
                    ) : scripts.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                            <FileText className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm">Genera tu primer guion</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {scripts.map(script => (
                                <motion.div key={script.id} layout className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#C9A84C]/15 transition-all">
                                    <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === script.id ? null : script.id)}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-bold text-sm truncate">{script.title}</h3>
                                                <p className="text-gray-600 text-xs mt-0.5 truncate">{script.topic}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] px-2 py-0.5 rounded font-bold">
                                                        {FORMAT_ICONS[script.suggested_format] || '🎬'} {script.suggested_format}
                                                    </span>
                                                    <span className="text-gray-700 text-xs flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {script.suggested_duration}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={e => { e.stopPropagation(); handleDelete(script.id) }} className="p-1.5 text-gray-700 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                {expandedId === script.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                            </div>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {expandedId === script.id && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/5 p-4 space-y-3">
                                                <div className="bg-[#1a1a1a] rounded-xl p-3 border-l-2 border-[#C9A84C]">
                                                    <p className="text-gray-500 text-xs mb-1">🎣 Gancho</p>
                                                    <p className="text-white text-xs">{script.hook}</p>
                                                </div>
                                                {script.key_points?.length > 0 && (
                                                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                                                        <p className="text-gray-500 text-xs mb-2">📌 Puntos clave</p>
                                                        <ul className="space-y-1">
                                                            {script.key_points.map((p: string, i: number) => (
                                                                <li key={i} className="text-xs text-gray-300 flex gap-1">
                                                                    <span className="text-[#C9A84C]">{i + 1}.</span> {p}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <div className="bg-[#1a1a1a] rounded-xl p-3 border-l-2 border-green-500">
                                                    <p className="text-gray-500 text-xs mb-1">🚀 CTA</p>
                                                    <p className="text-white text-xs">{script.call_to_action}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
