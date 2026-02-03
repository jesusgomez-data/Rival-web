'use client'

import React from 'react'
import Image from 'next/image'
import { X, Search, Trophy, Zap, UserPlus, Target } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface NewChatModalProps {
    friends: any[]
    onClose: () => void
    onSelect: (userId: string) => void
}

export default function NewChatModal({ friends, onClose, onSelect }: NewChatModalProps) {
    const [search, setSearch] = React.useState('')

    const filteredFriends = friends.filter(f =>
        f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        f.username?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#0a0a0c] border border-white/[0.08] w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]"
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50" />

                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <UserPlus className="w-5 h-5 text-brand-red" />
                            <h3 className="text-2xl font-accent font-bold italic text-white uppercase tracking-tighter">RECLUTAR RIVAL</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Inicia una nueva línea de comunicación</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-red hover:border-brand-red transition-all group"
                    >
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Search Field */}
                <div className="px-8 mb-6">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-brand-red/20 rounded-[1.25rem] opacity-0 group-focus-within:opacity-100 transition-opacity blur-md" />
                        <div className="relative bg-[#121215] border border-white/[0.08] rounded-[1.25rem] group-focus-within:border-brand-red/40 transition-all">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-brand-red transition-all" />
                            <input
                                type="text"
                                placeholder="Buscar alias o nombre real..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent py-4 pl-12 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Friends List Area */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-hide custom-scrollbar">
                    <AnimatePresence mode='popLayout'>
                        {filteredFriends.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16 px-8"
                            >
                                <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
                                    <Zap className="w-8 h-8 text-gray-800" />
                                </div>
                                <h4 className="text-gray-500 text-lg font-accent italic uppercase tracking-tighter mb-1">Sin Firmas en el Radar</h4>
                                <p className="text-gray-700 text-[10px] font-black italic uppercase tracking-[0.2em]">Sigue a leyendas para empezar la disputa</p>
                            </motion.div>
                        ) : (
                            filteredFriends.map((friend, idx) => (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.03 }}
                                    key={friend.id}
                                    onClick={() => onSelect(friend.id)}
                                    className="w-full flex items-center gap-5 p-4 rounded-[1.8rem] transition-all group relative overflow-hidden hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05]"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-14 h-14 rounded-[1.25rem] overflow-hidden border-2 border-white/10 group-hover:border-brand-red/50 group-hover:scale-105 transition-all duration-300 shadow-xl">
                                            <Image
                                                src={friend.avatar_url || '/placeholder-avatar.jpg'}
                                                alt={friend.full_name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-red border-[4px] border-[#0a0a0c] rounded-full flex items-center justify-center shadow-lg">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-accent font-bold text-lg text-white italic uppercase tracking-tighter leading-none mb-1 group-hover:text-brand-red transition-colors">
                                            {friend.full_name}
                                        </p>
                                        <p className="text-xs text-gray-600 font-medium truncate tracking-tight">@{friend.username}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                                        <Target className="w-6 h-6 text-brand-red" />
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Secure Footer */}
                <footer className="p-8 bg-black/40 border-t border-white/[0.05] flex items-center justify-center gap-3">
                    <Trophy className="w-4 h-4 text-brand-red/50" />
                    <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.3em]">Solo puedes chatear con atletas que sigues</p>
                </footer>
            </motion.div>
        </div>
    )
}
