'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
    | 'emom' | 'e2mo2m' | 'e3mo3m' | 'e2mo3m'
    | 'fortime' | 'amrap' | 'work_rest'
    | 'into' | 'rest' | 'custom'

interface WodBlock {
    id: string
    type: BlockType
    header: string
    exercises: string
    isRest: boolean
}

interface ScalesData {
    sb: string
    go: string
    mo: string
    extra1label: string
    extra1: string
    extra2label: string
    extra2: string
}

interface WodBuilderProps {
    onChange: (caption: string) => void
}

// ─── Block type definitions ───────────────────────────────────────────────────

const BLOCK_TYPES: { value: BlockType; label: string; defaultHeader: string; isRest?: boolean; color: string }[] = [
    { value: 'emom',     label: 'EMOM',      defaultHeader: "EMOM __'",         color: 'red'   },
    { value: 'e2mo2m',   label: 'E2MO2M',    defaultHeader: "E2MO2Mx_",         color: 'red'   },
    { value: 'e3mo3m',   label: 'E3MO3M',    defaultHeader: "E3MO3Mx_",         color: 'red'   },
    { value: 'e2mo3m',   label: 'E2MO3M',    defaultHeader: "E2MO3Mx_",         color: 'red'   },
    { value: 'fortime',  label: 'FOR TIME',  defaultHeader: "FOR TIME (__')",    color: 'red'   },
    { value: 'amrap',    label: 'AMRAP',     defaultHeader: "AMRAP __'",         color: 'red'   },
    { value: 'work_rest',label: 'WORK/REST', defaultHeader: "_' WORK / _' REST", color: 'red'   },
    { value: 'into',     label: 'INTO:',     defaultHeader: "INTO:",             color: 'red'   },
    { value: 'rest',     label: 'REST',      defaultHeader: "4' REST",           isRest: true, color: 'gray' },
    { value: 'custom',   label: 'Custom',    defaultHeader: "",                  color: 'red'   },
]

// ─── Caption generator ────────────────────────────────────────────────────────

function generateWodCaption(
    wodTitle: string,
    blocks: WodBlock[],
    scales: ScalesData,
    notas: string,
    tc: string
): string {
    const lines: string[] = []

    if (wodTitle.trim()) {
        lines.push(`💪 ${wodTitle.trim().toUpperCase()}`)
        lines.push('')
    }

    blocks.forEach(block => {
        if (block.isRest || block.type === 'rest') {
            lines.push(`${block.header.trim() || "4' REST"}`)
            lines.push('')
        } else {
            if (block.header.trim()) {
                lines.push(block.header.trim())
            }
            if (block.exercises.trim()) {
                lines.push(block.exercises.trim())
            }
            lines.push('')
        }
    })

    const hasScales = [scales.sb, scales.go, scales.mo, scales.extra1, scales.extra2].some(v => v.trim())
    if (hasScales) {
        lines.push('─────────────────')
        if (scales.sb.trim()) lines.push(`SB: ${scales.sb.trim()}`)
        if (scales.go.trim()) lines.push(`GO: ${scales.go.trim()}`)
        if (scales.mo.trim()) lines.push(`MO: ${scales.mo.trim()}`)
        if (scales.extra1.trim() && scales.extra1label.trim()) lines.push(`${scales.extra1label.trim()}: ${scales.extra1.trim()}`)
        if (scales.extra2.trim() && scales.extra2label.trim()) lines.push(`${scales.extra2label.trim()}: ${scales.extra2.trim()}`)
        lines.push('')
    }

    if (notas.trim()) {
        lines.push(`📝 ${notas.trim()}`)
        lines.push('')
    }

    if (tc.trim()) {
        lines.push(`⏱ TC: ${tc.trim()}'`)
    }

    // Clean trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

    return lines.join('\n')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BlockCard({
    block,
    index,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
}: {
    block: WodBlock
    index: number
    onUpdate: (id: string, field: keyof WodBlock, value: string | boolean) => void
    onRemove: (id: string) => void
    onMoveUp: (id: string) => void
    onMoveDown: (id: string) => void
    isFirst: boolean
    isLast: boolean
}) {
    const isRest = block.isRest || block.type === 'rest'
    const inputBase = "w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all"

    return (
        <div className={`rounded-2xl border overflow-hidden ${isRest ? 'border-white/6 bg-white/[0.02]' : 'border-brand-red/15 bg-brand-red/[0.04]'}`}>
            {/* Block header row */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                {/* Move buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button type="button" onClick={() => onMoveUp(block.id)} disabled={isFirst}
                        className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
                        <ChevronUp className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => onMoveDown(block.id)} disabled={isLast}
                        className="p-0.5 rounded text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
                        <ChevronDown className="w-3 h-3" />
                    </button>
                </div>

                {/* Block number badge */}
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0 ${
                    isRest ? 'bg-white/5 text-gray-500' : 'bg-brand-red/15 text-brand-red/70'
                }`}>
                    {isRest ? '⏸ REST' : `BLOQUE ${index + 1}`}
                </span>

                {/* Header input */}
                <input
                    className={`${inputBase} font-black text-sm flex-1`}
                    value={block.header}
                    onChange={e => onUpdate(block.id, 'header', e.target.value)}
                    placeholder={isRest ? "4' REST" : "EMOM 12'"}
                />

                {/* Delete */}
                <button type="button" onClick={() => onRemove(block.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-red-500/8 hover:bg-red-500/18 text-red-500/60 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Exercises textarea (not for REST blocks) */}
            {!isRest && (
                <div className="px-3 pb-3">
                    <textarea
                        className={`${inputBase} resize-none text-xs leading-relaxed font-mono`}
                        rows={4}
                        value={block.exercises}
                        onChange={e => onUpdate(block.id, 'exercises', e.target.value)}
                        placeholder={"15-12-9 THRUSTERS\nSIT UPS\nTTB\nBURPEES"}
                    />
                    <p className="text-[9px] text-gray-700 mt-1">Un ejercicio por línea. Ejemplo: 15 WALL BALLS · 1'5 SHOULDER PRESS RIR 2</p>
                </div>
            )}
        </div>
    )
}

// ─── Main WodBuilder ──────────────────────────────────────────────────────────

export default function WodBuilder({ onChange }: WodBuilderProps) {
    const [wodTitle, setWodTitle] = useState('')
    const [blocks, setBlocks] = useState<WodBlock[]>([])
    const [scales, setScales] = useState<ScalesData>({
        sb: '', go: '', mo: '',
        extra1label: 'CTB', extra1: '',
        extra2label: 'PU', extra2: '',
    })
    const [notas, setNotas] = useState('')
    const [tc, setTc] = useState('')
    const [showScales, setShowScales] = useState(false)
    const [preview, setPreview] = useState('')

    const inputBase = "w-full bg-black/60 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all"

    // Regenerate caption on any change
    useEffect(() => {
        const caption = generateWodCaption(wodTitle, blocks, scales, notas, tc)
        setPreview(caption)
        onChange(caption)
    }, [wodTitle, blocks, scales, notas, tc, onChange])

    function addBlock(type: BlockType) {
        const def = BLOCK_TYPES.find(t => t.value === type)!
        setBlocks(prev => [...prev, {
            id: Math.random().toString(36).slice(2),
            type,
            header: def.defaultHeader,
            exercises: '',
            isRest: !!def.isRest,
        }])
    }

    function updateBlock(id: string, field: keyof WodBlock, value: string | boolean) {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
    }

    function removeBlock(id: string) {
        setBlocks(prev => prev.filter(b => b.id !== id))
    }

    function moveBlock(id: string, direction: 'up' | 'down') {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === id)
            if (direction === 'up' && idx === 0) return prev
            if (direction === 'down' && idx === prev.length - 1) return prev
            const newBlocks = [...prev]
            const swap = direction === 'up' ? idx - 1 : idx + 1
            ;[newBlocks[idx], newBlocks[swap]] = [newBlocks[swap], newBlocks[idx]]
            return newBlocks
        })
    }

    const workBlocks = BLOCK_TYPES.filter(t => !t.isRest)
    const restBlocks = BLOCK_TYPES.filter(t => t.isRest)

    return (
        <div className="space-y-5">
            {/* WOD Title */}
            <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5">
                    Nombre del WOD
                </label>
                <input
                    className={inputBase}
                    placeholder="Ej: WOD LUNES · 7 ABRIL"
                    value={wodTitle}
                    onChange={e => setWodTitle(e.target.value)}
                />
            </div>

            {/* Blocks */}
            <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                    Estructura del WOD
                </label>

                {blocks.length === 0 && (
                    <div className="border border-dashed border-white/8 rounded-2xl py-8 flex flex-col items-center gap-2 text-center mb-3">
                        <Dumbbell className="w-8 h-8 text-gray-700" />
                        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">Añade bloques para construir el WOD</p>
                    </div>
                )}

                <div className="space-y-2 mb-3">
                    {blocks.map((block, idx) => (
                        <BlockCard
                            key={block.id}
                            block={block}
                            index={idx}
                            onUpdate={updateBlock}
                            onRemove={removeBlock}
                            onMoveUp={id => moveBlock(id, 'up')}
                            onMoveDown={id => moveBlock(id, 'down')}
                            isFirst={idx === 0}
                            isLast={idx === blocks.length - 1}
                        />
                    ))}
                </div>

                {/* Add block buttons */}
                <div className="space-y-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">+ Añadir bloque</p>
                    <div className="flex flex-wrap gap-1.5">
                        {workBlocks.map(t => (
                            <button key={t.value} type="button" onClick={() => addBlock(t.value)}
                                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-brand-red/20 bg-brand-red/8 text-brand-red/70 hover:bg-brand-red/15 hover:text-brand-red transition-all">
                                {t.label}
                            </button>
                        ))}
                        {restBlocks.map(t => (
                            <button key={t.value} type="button" onClick={() => addBlock(t.value)}
                                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-all">
                                ⏸ {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scales section (collapsible) */}
            <div className="border border-white/8 rounded-2xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowScales(!showScales)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
                >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        📊 Escalas de Peso (SB / GO / MO)
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showScales ? 'rotate-180' : ''}`} />
                </button>

                {showScales && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            {(['sb', 'go', 'mo'] as const).map(scale => (
                                <div key={scale}>
                                    <label className="block text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">
                                        {scale === 'sb' ? 'SB (Scaled Below)' : scale === 'go' ? 'GO (As Rx)' : 'MO (Modified)'}
                                    </label>
                                    <input
                                        className={`${inputBase} text-xs`}
                                        placeholder={scale === 'sb' ? "60-70-80 / 35-40-45" : scale === 'go' ? "50-60-70 / 25-30-35" : "40-45-50 / 15-20-25"}
                                        value={scales[scale]}
                                        onChange={e => setScales(prev => ({ ...prev, [scale]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {([['extra1label', 'extra1', 'CTB'], ['extra2label', 'extra2', 'PU']] as const).map(([labelKey, valueKey, placeholder]) => (
                                <div key={valueKey} className="flex gap-1.5">
                                    <input
                                        className="w-16 bg-black/60 border border-white/10 rounded-lg py-2 px-2 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 font-black uppercase"
                                        placeholder={placeholder}
                                        value={scales[labelKey]}
                                        onChange={e => setScales(prev => ({ ...prev, [labelKey]: e.target.value }))}
                                    />
                                    <input
                                        className={`${inputBase} text-xs flex-1`}
                                        placeholder="12/10/8"
                                        value={scales[valueKey]}
                                        onChange={e => setScales(prev => ({ ...prev, [valueKey]: e.target.value }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Notas del Coach */}
            <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5">
                    Notas del Coach
                </label>
                <textarea
                    className={`${inputBase} resize-none`}
                    rows={3}
                    placeholder="El último AMRAP debe ser muy incómodo. Que lleguen de correr y que realmente se tengan que pensar el lift. Si hacen más de 10 reps podéis decirles que han ido demasiado ligeros."
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                />
            </div>

            {/* TC */}
            <div className="flex items-center gap-4">
                <div>
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5">
                        ⏱ Time Cap (TC)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            className="w-24 bg-black/60 border border-white/10 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 font-black text-center"
                            placeholder="33"
                            value={tc}
                            onChange={e => setTc(e.target.value)}
                        />
                        <span className="text-gray-500 font-black text-sm">minutos</span>
                    </div>
                </div>
            </div>

            {/* Preview */}
            {preview && (
                <div className="border border-white/6 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2 bg-white/3 border-b border-white/5">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Vista previa del post</p>
                    </div>
                    <pre className="px-4 py-3 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {preview}
                    </pre>
                </div>
            )}
        </div>
    )
}
