'use client';

import { useState } from 'react';
import { HelpCircle, Send, Loader2, X, Shield } from 'lucide-react';
import { getTicketDetails, sendReply, resolveTicket } from './support-actions';
import { cn } from '@/lib/utils';

// Reuse the modal pattern
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 p-2">
                    <X className="w-5 h-5" />
                </button>
                {children}
            </div>
        </div>
    );
}

export default function SupportInbox({ tickets }: { tickets: any[] }) {
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [replying, setReplying] = useState(false);

    async function handleOpenTicket(ticket: any) {
        setSelectedTicket(ticket);
        setOpen(true);
        setLoadingChat(true);
        const res = await getTicketDetails(ticket.id);
        if (!res.error) {
            setMessages(res.messages || []);
        }
        setLoadingChat(false);
    }

    async function handleSend(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setReplying(true);
        const form = e.currentTarget;
        const msg = (form.elements.namedItem('content') as HTMLInputElement).value;

        await sendReply(selectedTicket.id, msg, true);

        // Optimistic update
        setMessages([...messages, {
            id: 'temp',
            content: msg,
            is_admin_reply: true,
            created_at: new Date().toISOString()
        }]);
        form.reset();
        setReplying(false);
    }

    async function handleResolve() {
        if (!confirm('¿Marcar como resuelto?')) return;
        await resolveTicket(selectedTicket.id);
        setOpen(false);
    }

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-lg font-bold italic uppercase flex items-center gap-2 text-white">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Bandeja de Soporte
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {tickets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">Sin tickets pendientes</p>
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => handleOpenTicket(ticket)}
                            className="p-4 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                    ticket.status === 'open' ? "bg-red-500/10 text-red-500" :
                                        ticket.status === 'resolved' ? "bg-green-500/10 text-green-500" :
                                            "bg-yellow-500/10 text-yellow-500"
                                )}>
                                    {ticket.status}
                                </span>
                                <span className="text-[10px] text-gray-600 font-mono">
                                    {new Date(ticket.updated_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h4 className="font-bold text-white text-sm mb-1 group-hover:text-blue-400 transition-colors">{ticket.subject}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black">
                                    {(ticket.user?.full_name || 'U')[0]}
                                </span>
                                {ticket.user?.full_name || 'Usuario desconocido'}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal open={open} onClose={() => setOpen(false)}>
                {selectedTicket && (
                    <>
                        <div className="p-4 border-b border-white/10 bg-white/[0.02] flex justify-between items-center pr-12">
                            <div>
                                <h3 className="font-bold text-white mb-0.5">{selectedTicket.subject}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="capitalize">{selectedTicket.category}</span>
                                    <span>•</span>
                                    <span>{selectedTicket.user?.email}</span>
                                </div>
                            </div>
                            {selectedTicket.status !== 'resolved' && (
                                <button
                                    onClick={handleResolve}
                                    className="bg-green-500/10 hover:bg-green-500/20 text-green-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                    Resolver
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
                            {loadingChat ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        msg.is_admin_reply ? "ml-auto flex-row-reverse" : ""
                                    )}>
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10",
                                            msg.is_admin_reply ? "bg-brand-red text-white" : "bg-gray-800 text-gray-400"
                                        )}>
                                            {msg.is_admin_reply ? <Shield className="w-4 h-4" /> : <span className="font-bold text-xs">{(selectedTicket.user?.full_name || 'U')[0]}</span>}
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm leading-relaxed",
                                            msg.is_admin_reply ? "bg-brand-red/10 text-white border border-brand-red/20 rounded-tr-sm" : "bg-white/5 text-gray-300 border border-white/10 rounded-tl-sm"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                            <form onSubmit={handleSend} className="relative">
                                <input
                                    name="content"
                                    autoComplete="off"
                                    placeholder="Escribe una respuesta oficial..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                                />
                                <button
                                    disabled={replying}
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-red text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
