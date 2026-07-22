'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Search, Check, Users, ChevronRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

interface GroupChatModalProps {
    friends: any[]
    onClose: () => void
    onCreate: (name: string, memberIds: string[]) => Promise<void>
}

export default function GroupChatModal({ friends, onClose, onCreate }: GroupChatModalProps) {
    const [step, setStep] = useState<'select' | 'name'>('select')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<string[]>([])
    const [groupName, setGroupName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const filtered = friends.filter(f =>
        !search.trim() ||
        f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        f.username?.toLowerCase().includes(search.toLowerCase())
    )

    const toggleMember = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleCreate = async () => {
        if (!groupName.trim() || selected.length === 0) return
        setIsCreating(true)
        await onCreate(groupName.trim(), selected)
        setIsCreating(false)
    }

    const selectedFriends = friends.filter(f => selected.includes(f.id))

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="relative w-full sm:max-w-md bg-[#0e0e0e] border border-white/[0.07] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.05]">
                    <div>
                        {step === 'select' ? (
                            <>
                                <h2 className="text-lg font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-brand-red" />
                                    Nuevo Grupo
                                </h2>
                                <p className="text-[10px] text-white/25 font-bold mt-0.5">
                                    {selected.length === 0 ? 'Selecciona participantes' : `${selected.length} seleccionado${selected.length !== 1 ? 's' : ''}`}
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-lg font-black italic uppercase tracking-tight text-white">Nombre del Grupo</h2>
                                <p className="text-[10px] text-white/25 font-bold mt-0.5">{selected.length} participante{selected.length !== 1 ? 's' : ''}</p>
                            </>
                        )}
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {step === 'select' ? (
                        <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col flex-1 overflow-hidden">
                            {/* Selected chips */}
                            {selected.length > 0 && (
                                <div className="px-5 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/[0.04]">
                                    {selectedFriends.map(f => (
                                        <button key={f.id} onClick={() => toggleMember(f.id)}
                                            className="flex items-center gap-1.5 bg-brand-red/20 border border-brand-red/30 rounded-full px-3 py-1.5 shrink-0">
                                            <span className="text-[11px] font-black text-white/80">{f.full_name?.split(' ')[0] || f.username}</span>
                                            <X className="w-3 h-3 text-brand-red" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Search */}
                            <div className="px-5 pt-4 pb-2">
                                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-2.5">
                                    <Search className="w-4 h-4 text-white/20 shrink-0" />
                                    <input
                                        autoFocus
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Buscar amigos..."
                                        className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-white/15 font-medium"
                                    />
                                </div>
                            </div>

                            {/* Friends list */}
                            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1.5">
                                {filtered.length === 0 ? (
                                    <p className="text-center text-white/20 text-xs font-bold uppercase tracking-widest mt-8">Sin resultados</p>
                                ) : filtered.map(f => {
                                    const isSelected = selected.includes(f.id)
                                    return (
                                        <button key={f.id} onClick={() => toggleMember(f.id)}
                                            className={clsx(
                                                "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left active:scale-[0.98]",
                                                isSelected
                                                    ? "bg-brand-red/10 border-brand-red/30"
                                                    : "bg-white/[0.03] border-white/[0.05] hover:border-white/10"
                                            )}>
                                            <div className="relative shrink-0">
                                                <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 relative">
                                                    {f.avatar_url
                                                        ? <Image src={f.avatar_url} alt="" fill className="object-cover" />
                                                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-black text-white/30 text-lg">{(f.full_name || f.username || '?')[0].toUpperCase()}</div>
                                                    }
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={clsx("font-black text-sm truncate", isSelected ? "text-white" : "text-white/60")}>{f.full_name || f.username}</p>
                                                <p className="text-[10px] text-white/25 font-bold">@{f.username}</p>
                                            </div>
                                            <div className={clsx(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                isSelected ? "bg-brand-red border-brand-red" : "border-white/20"
                                            )}>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Next button */}
                            <div className="px-5 pb-8 pt-3 border-t border-white/[0.05]">
                                <button
                                    onClick={() => selected.length > 0 && setStep('name')}
                                    disabled={selected.length === 0}
                                    className={clsx(
                                        "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all",
                                        selected.length > 0
                                            ? "bg-brand-red text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] active:scale-95"
                                            : "bg-white/[0.04] text-white/20 cursor-not-allowed"
                                    )}
                                >
                                    Siguiente
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col flex-1 overflow-hidden">
                            {/* Group avatar preview */}
                            <div className="flex flex-col items-center pt-6 pb-4 px-6">
                                <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-brand-red/60 to-orange-500/60 flex items-center justify-center border-2 border-brand-red/30 mb-4 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                                    <Users className="w-9 h-9 text-white/70" />
                                </div>

                                {/* Selected members preview */}
                                <div className="flex items-center gap-1 mb-4">
                                    {selectedFriends.slice(0, 5).map((f, i) => (
                                        <div key={f.id} className="w-8 h-8 rounded-full border-2 border-[#0E0E0E] overflow-hidden relative"
                                            style={{ marginLeft: i > 0 ? -8 : 0, zIndex: selectedFriends.length - i }}>
                                            {f.avatar_url
                                                ? <Image src={f.avatar_url} alt="" fill className="object-cover" />
                                                : <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-[9px] font-black text-white/50">{(f.full_name || '?')[0]}</div>
                                            }
                                        </div>
                                    ))}
                                    {selectedFriends.length > 5 && (
                                        <div className="w-8 h-8 rounded-full bg-zinc-700 border-2 border-[#0E0E0E] flex items-center justify-center text-[9px] font-black text-white/50" style={{ marginLeft: -8 }}>
                                            +{selectedFriends.length - 5}
                                        </div>
                                    )}
                                </div>

                                {/* Group name input */}
                                <input
                                    autoFocus
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    placeholder="Nombre del grupo..."
                                    maxLength={40}
                                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-2xl px-5 py-3.5 text-white text-base font-black text-center focus:outline-none focus:border-brand-red/30 placeholder:text-white/15 transition-colors"
                                    onKeyDown={e => { if (e.key === 'Enter' && groupName.trim() && !isCreating) handleCreate() }}
                                />
                                <p className="text-[9px] text-white/15 font-bold mt-1.5">{groupName.length}/40</p>
                            </div>

                            <div className="flex-1" />

                            {/* Buttons */}
                            <div className="px-5 pb-8 pt-3 border-t border-white/[0.05] flex gap-3">
                                <button onClick={() => setStep('select')} className="flex-1 py-4 rounded-2xl bg-white/5 text-white/40 font-black text-[11px] uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all">
                                    Atrás
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!groupName.trim() || isCreating}
                                    className={clsx(
                                        "flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                                        groupName.trim() && !isCreating
                                            ? "bg-brand-red text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] active:scale-95"
                                            : "bg-white/[0.04] text-white/20 cursor-not-allowed"
                                    )}
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Crear Grupo</>}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}
