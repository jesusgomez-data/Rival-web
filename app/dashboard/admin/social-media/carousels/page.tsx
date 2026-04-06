'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, Sparkles, Download, ExternalLink, Copy, Check, Loader2, Trophy, ArrowRight } from 'lucide-react'
import { generateCarouselHTML, saveContentDraft } from '../actions'

export default function CarouselsPage() {
    const [topic, setTopic] = useState('')
    const [slideCount, setSlideCount] = useState(5)
    const [generating, setGenerating] = useState(false)
    const [result, setResult] = useState<{ html: string; slides: any[]; caption: string; title: string } | null>(null)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    async function handleGenerate(e: React.FormEvent) {
        e.preventDefault()
        if (!topic.trim()) return
        setGenerating(true)
        setError('')
        setResult(null)
        try {
            const data = await generateCarouselHTML(topic, slideCount)
            setResult(data)
        } catch (err: any) {
            setError(err.message || 'Error generando carrusel')
        } finally {
            setGenerating(false)
        }
    }

    function downloadHTML() {
        if (!result) return
        const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rivalfit-${topic.slice(0, 24).replace(/\s+/g, '-').toLowerCase()}.html`
        a.click()
        URL.revokeObjectURL(url)
    }

    function openInBrowser() {
        if (!result) return
        const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
    }

    async function handleSaveToQueue() {
        if (!result) return
        setSaving(true)
        try {
            await saveContentDraft({ title: result.title, caption: result.caption, post_type: 'carousel' })
            setSaved(true)
            setTimeout(() => setSaved(false), 4000)
        } catch {
            alert('Error al guardar en cola')
        } finally {
            setSaving(false)
        }
    }

    function copyCaption() {
        if (!result?.caption) return
        navigator.clipboard.writeText(result.caption)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                    CARRUSELES <span className="text-[#C9A84C]">CON IA</span>
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Genera carruseles en el estilo RivalFit — descarga como PNG directamente
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left: Config */}
                <div className="space-y-5">
                    <div className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center">
                                <Layers className="w-5 h-5 text-[#C9A84C]" />
                            </div>
                            <div>
                                <h2 className="text-white font-black">Crear Carrusel</h2>
                                <p className="text-gray-600 text-xs">Powered by Groq AI · Estilo RivalFit</p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-5">
                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Tema *</label>
                                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} required
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#C9A84C]/50 outline-none resize-none"
                                    placeholder="Ej: Biomecánica del hombro para prevenir lesiones..." />
                            </div>

                            <div>
                                <label className="text-gray-400 text-xs uppercase tracking-widest mb-2 block">Número de slides</label>
                                <div className="flex gap-2">
                                    {[4, 5, 6, 7, 8, 10].map(n => (
                                        <button key={n} type="button" onClick={() => setSlideCount(n)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${slideCount === n ? 'bg-[#C9A84C] text-black' : 'bg-[#1a1a1a] text-gray-500 border border-white/10 hover:border-[#C9A84C]/30'}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

                            <button type="submit" disabled={generating || !topic.trim()}
                                className="w-full py-3 rounded-xl bg-[#C9A84C] text-black font-black text-sm hover:bg-[#D4B483] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {generating
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando con IA...</>
                                    : <><Sparkles className="w-4 h-4" /> Generar Carrusel</>}
                            </button>
                        </form>
                    </div>

                    {/* Results */}
                    {result && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {/* Title */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
                                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Título generado</p>
                                <p className="text-white font-black">{result.title}</p>
                                <p className="text-gray-600 text-xs mt-1">{result.slides.length} slides · Estilo RivalFit</p>
                            </div>

                            {/* Caption */}
                            <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Caption Instagram</p>
                                    <button onClick={copyCaption}
                                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${copied ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                                        {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                                    </button>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{result.caption}</p>
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={openInBrowser}
                                    className="py-3 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                                    <ExternalLink className="w-4 h-4" /> Abrir y descargar PNGs
                                </button>
                                <button onClick={downloadHTML}
                                    className="py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-gray-300 font-bold text-sm hover:border-white/30 transition-all flex items-center justify-center gap-2">
                                    <Download className="w-4 h-4" /> Guardar HTML
                                </button>
                            </div>

                            {/* Save to Canal Oficial queue */}
                            <button
                                onClick={handleSaveToQueue}
                                disabled={saving || saved}
                                className={`w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 border ${
                                    saved
                                        ? 'bg-green-500/10 border-green-500/40 text-green-400'
                                        : 'bg-[#C9A84C]/8 border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/15'
                                }`}
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                ) : saved ? (
                                    <><Check className="w-4 h-4" /> Guardado en Canal Oficial</>
                                ) : (
                                    <><Trophy className="w-4 h-4" /> Guardar en Cola — Canal Oficial <ArrowRight className="w-3.5 h-3.5" /></>
                                )}
                            </button>

                            <p className="text-gray-700 text-xs text-center">
                                El HTML se abre en el navegador con el diseño completo RivalFit (1080×1350px) listo para descargar como PNG
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* Right: Slide preview cards */}
                <div className="space-y-4">
                    <h2 className="text-white font-black">
                        {result ? `Vista previa — ${result.slides.length} slides` : 'Vista previa'}
                    </h2>

                    {generating ? (
                        <div className="bg-[#111] border border-white/5 rounded-2xl flex items-center justify-center" style={{ height: 560 }}>
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mx-auto mb-4" />
                                <p className="text-gray-500 text-sm">Generando con IA...</p>
                                <p className="text-gray-700 text-xs mt-1">Diseño RivalFit · {slideCount} slides</p>
                            </div>
                        </div>
                    ) : result ? (
                        /* Real HTML preview via iframe with CSS zoom */
                        <div className="rounded-2xl overflow-hidden border border-red-900/20" style={{ height: 560, overflowY: 'auto', background: '#111' }}>
                            <iframe
                                srcDoc={result.html}
                                sandbox="allow-scripts"
                                title="Carrusel Preview"
                                style={{
                                    width: '1080px',
                                    height: `${result.slides.length * 1440 + 120}px`,
                                    zoom: 0.46,
                                    border: 'none',
                                    display: 'block',
                                    transformOrigin: 'top left',
                                }}
                            />
                        </div>
                    ) : (
                        <div className="bg-black border border-red-900/20 rounded-2xl flex items-center justify-center" style={{ height: 560 }}>
                            <div className="text-center">
                                <div className="text-8xl font-black text-white/[0.03] mb-6 tracking-tighter">RF</div>
                                <Layers className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                                <p className="text-gray-700 text-sm">Tu carrusel aparecerá aquí</p>
                                <p className="text-red-900 text-xs mt-1 font-bold uppercase tracking-widest">RivalFit Design System</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
