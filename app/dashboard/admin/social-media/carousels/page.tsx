'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Sparkles, ChevronLeft, ChevronRight, Download, Edit3, Check, Loader2, Copy } from 'lucide-react'
import { generateCarousel } from '../actions'

const STYLES = [
    { id: 'minimal', label: 'Minimalista', desc: 'Limpio, espacios blancos, tipografía grande', bg: 'bg-white', text: 'text-black', accent: '#000' },
    { id: 'dark', label: 'Dark Premium', desc: 'Fondo oscuro, detalles dorados', bg: 'bg-[#0a0a0a]', text: 'text-white', accent: '#C9A84C' },
    { id: 'gradient', label: 'Gradiente', desc: 'Colores vibrantes, energético', bg: 'bg-gradient-to-br from-purple-600 to-red-500', text: 'text-white', accent: '#fff' },
    { id: 'fitness', label: 'Fitness Bold', desc: 'Rojo y negro, impactante', bg: 'bg-[#1a0000]', text: 'text-white', accent: '#ef4444' },
]

const SLIDE_STYLE: Record<string, { wrapper: string; headline: string; body: string; number: string; cta: string }> = {
    minimal: {
        wrapper: 'bg-white', headline: 'text-black text-3xl font-black', body: 'text-gray-600 text-sm',
        number: 'text-gray-200 text-8xl font-black absolute -top-4 -right-2', cta: 'text-black border-black'
    },
    dark: {
        wrapper: 'bg-[#0a0a0a]', headline: 'text-[#C9A84C] text-3xl font-black', body: 'text-gray-400 text-sm',
        number: 'text-[#C9A84C]/10 text-8xl font-black absolute -top-4 -right-2', cta: 'text-[#C9A84C] border-[#C9A84C]'
    },
    gradient: {
        wrapper: 'bg-gradient-to-br from-purple-600 to-red-500', headline: 'text-white text-3xl font-black', body: 'text-white/80 text-sm',
        number: 'text-white/10 text-8xl font-black absolute -top-4 -right-2', cta: 'text-white border-white'
    },
    fitness: {
        wrapper: 'bg-[#0a0000]', headline: 'text-red-500 text-3xl font-black', body: 'text-gray-400 text-sm',
        number: 'text-red-900 text-8xl font-black absolute -top-4 -right-2', cta: 'text-red-500 border-red-500'
    },
}

export default function CarouselsPage() {
    const [topic, setTopic] = useState('')
    const [style, setStyle] = useState('dark')
    const [slideCount, setSlideCount] = useState(5)
    const [generating, setGenerating] = useState(false)
    const [carousel, setCarousel] = useState<any>(null)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [editingSlide, setEditingSlide] = useState<number | null>(null)
    const [editForm, setEditForm] = useState({ headline: '', body: '' })
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault()
        if (!topic.trim()) return
        setGenerating(true)
        setError('')
        setCarousel(null)
        setCurrentSlide(0)
        try {
            const data = await generateCarousel(topic, style, slideCount)
            setCarousel(data)
        } catch (err: any) {
            setError(err.message || 'Error generando carrusel')
        } finally {
            setGenerating(false)
        }
    }

    function startEdit(i: number) {
        setEditingSlide(i)
        setEditForm({ headline: carousel.slides[i].headline, body: carousel.slides[i].body || '' })
    }

    function saveEdit() {
        if (editingSlide === null) return
        const updated = { ...carousel }
        updated.slides[editingSlide] = { ...updated.slides[editingSlide], ...editForm }
        setCarousel(updated)
        setEditingSlide(null)
    }

    function copyCaption() {
        if (!carousel?.caption) return
        navigator.clipboard.writeText(carousel.caption)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const currentStyle = SLIDE_STYLE[style]
    const slide = carousel?.slides?.[currentSlide]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                    CARRUSELES <span className="text-[#C9A84C]">CON IA</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">Genera carruseles profesionales para Instagram</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Config Panel */}
                <div className="space-y-6">
                    <div className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center">
                                <Layers className="w-5 h-5 text-[#C9A84C]" />
                            </div>
                            <div>
                                <h2 className="text-white font-black">Crear Carrusel</h2>
                                <p className="text-gray-600 text-xs">Powered by Claude AI</p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-5">
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Tema *</label>
                                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} required
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#C9A84C]/50 outline-none resize-none"
                                    placeholder="Ej: 5 ejercicios para fortalecer el core sin equipamiento..." />
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Número de diapositivas</label>
                                <div className="flex gap-2">
                                    {[4, 5, 6, 7, 8, 10].map(n => (
                                        <button key={n} type="button" onClick={() => setSlideCount(n)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${slideCount === n ? 'bg-[#C9A84C] text-black' : 'bg-[#1a1a1a] text-gray-500 border border-white/10 hover:border-[#C9A84C]/30'}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-3 block">Estilo visual</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {STYLES.map(s => (
                                        <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                                            className={`p-3 rounded-xl border text-left transition-all ${style === s.id ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-white/10 hover:border-white/20'}`}>
                                            <div className={`w-full h-8 rounded-lg mb-2 ${s.bg}`} />
                                            <p className={`text-xs font-bold ${style === s.id ? 'text-[#C9A84C]' : 'text-white'}`}>{s.label}</p>
                                            <p className="text-gray-600 text-[10px] mt-0.5">{s.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-2">{error}</p>}

                            <button type="submit" disabled={generating || !topic.trim()}
                                className="w-full py-3 rounded-xl bg-[#C9A84C] text-black font-black text-sm hover:bg-[#D4B483] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4" /> Generar Carrusel</>}
                            </button>
                        </form>
                    </div>

                    {/* Caption */}
                    {carousel?.caption && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-[#111] border border-white/5 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Caption para Instagram</p>
                                <button onClick={copyCaption} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${copied ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                                    {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                                </button>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{carousel.caption}</p>
                        </motion.div>
                    )}
                </div>

                {/* Preview Panel */}
                <div className="space-y-4">
                    <h2 className="text-white font-black">Vista Previa</h2>

                    {generating ? (
                        <div className="aspect-square bg-[#111] rounded-2xl flex items-center justify-center border border-white/5">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mx-auto mb-4" />
                                <p className="text-gray-500 text-sm">Generando tu carrusel...</p>
                            </div>
                        </div>
                    ) : carousel ? (
                        <>
                            {/* Slide Preview */}
                            <AnimatePresence mode="wait">
                                <motion.div key={currentSlide} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className={`aspect-square rounded-2xl overflow-hidden relative p-8 flex flex-col justify-between ${currentStyle.wrapper}`}>
                                    {/* Slide number */}
                                    <span className={currentStyle.number}>{String(currentSlide + 1).padStart(2, '0')}</span>

                                    {/* Badge */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: STYLES.find(s => s.id === style)?.accent }}>
                                            {slide?.type === 'hook' ? '↗ HOOK' : slide?.type === 'cta' ? '→ CTA' : `SLIDE ${currentSlide + 1}`}
                                        </span>
                                        <span className="text-xs opacity-30 font-bold">{currentSlide + 1}/{carousel.slides.length}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col justify-center relative z-10">
                                        {editingSlide === currentSlide ? (
                                            <div className="space-y-3">
                                                <input value={editForm.headline} onChange={e => setEditForm(f => ({ ...f, headline: e.target.value }))}
                                                    className="w-full bg-black/30 text-white text-xl font-black rounded-xl p-3 outline-none border border-white/20" />
                                                <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))} rows={3}
                                                    className="w-full bg-black/30 text-white text-sm rounded-xl p-3 outline-none border border-white/20 resize-none" />
                                                <button onClick={saveEdit} className="w-full py-2 bg-[#C9A84C] text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                                                    <Check className="w-4 h-4" /> Guardar
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className={`${currentStyle.headline} leading-tight mb-3`}>{slide?.headline}</h2>
                                                {slide?.body && <p className={`${currentStyle.body} leading-relaxed`}>{slide.body}</p>}
                                                {slide?.cta && <p className={`mt-4 text-sm font-black border-b-2 inline-block ${currentStyle.cta}`}>{slide.cta}</p>}
                                            </>
                                        )}
                                    </div>

                                    {/* RivalFit brand */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase opacity-40" style={{ color: STYLES.find(s => s.id === style)?.accent }}>rivalfit.app</span>
                                        {editingSlide !== currentSlide && (
                                            <button onClick={() => startEdit(currentSlide)} className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-1.5 bg-black/30 rounded-lg">
                                                <Edit3 className="w-3.5 h-3.5 text-white" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Navigation */}
                            <div className="flex items-center gap-3">
                                <button onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0}
                                    className="p-3 rounded-xl bg-[#111] border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                {/* Slide dots */}
                                <div className="flex-1 flex items-center justify-center gap-1.5">
                                    {carousel.slides.map((_: any, i: number) => (
                                        <button key={i} onClick={() => setCurrentSlide(i)}
                                            className={`transition-all rounded-full ${i === currentSlide ? 'w-6 h-2 bg-[#C9A84C]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
                                    ))}
                                </div>

                                <button onClick={() => setCurrentSlide(s => Math.min(carousel.slides.length - 1, s + 1))} disabled={currentSlide === carousel.slides.length - 1}
                                    className="p-3 rounded-xl bg-[#111] border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                </button>

                                <button onClick={() => startEdit(currentSlide)}
                                    className="p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-400 hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* All slides thumbnail strip */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {carousel.slides.map((s: any, i: number) => (
                                    <button key={i} onClick={() => setCurrentSlide(i)}
                                        className={`shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-xs font-black transition-all overflow-hidden ${currentStyle.wrapper} ${i === currentSlide ? 'ring-2 ring-[#C9A84C]' : 'opacity-50 hover:opacity-80'}`}>
                                        <span className="text-[8px] p-1 leading-tight text-center" style={{ color: STYLES.find(st => st.id === style)?.accent }}>
                                            {s.headline?.slice(0, 20)}...
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="aspect-square bg-[#111] border border-dashed border-white/10 rounded-2xl flex items-center justify-center">
                            <div className="text-center">
                                <Layers className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">Tu carrusel aparecerá aquí</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
