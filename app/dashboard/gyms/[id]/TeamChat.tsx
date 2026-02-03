"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Loader2, User as UserIcon, Clock, Building2 } from "lucide-react";
import { getTeamMessages, sendTeamMessage, checkStaffRole } from "../team-actions";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface TeamMessage {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    as_org: boolean;
    user: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    organization: {
        name: string;
        logo_url: string | null;
    } | null;
}

export default function TeamChat({ centerId, className }: { centerId: string, className?: string }) {
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [isStaff, setIsStaff] = useState<boolean | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [postAsOrg, setPostAsOrg] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async () => {
        if (isStaff === false) return;
        const res = await getTeamMessages(centerId);
        if (res.messages) {
            setMessages(res.messages);
        }
        setLoading(false);
    };

    useEffect(() => {
        async function verifyRole() {
            const { isStaff } = await checkStaffRole(centerId);
            setIsStaff(isStaff);

            // Also check if owner to show organization toggle
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: org } = await supabase
                    .from('organizations')
                    .select('owner_id')
                    .eq('id', centerId)
                    .single();
                if (org?.owner_id === user.id) {
                    setIsOwner(true);
                }
            }

            if (!isStaff) setLoading(false);
        }
        verifyRole();
    }, [centerId]);

    useEffect(() => {
        if (isStaff) {
            loadMessages();
            const interval = setInterval(loadMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [centerId, isStaff]);

    const [lastMessageCount, setLastMessageCount] = useState(0);

    useEffect(() => {
        if (messages.length > lastMessageCount) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            setLastMessageCount(messages.length);
        }
    }, [messages, lastMessageCount]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || sending) return;

        setSending(true);
        const res = await sendTeamMessage(centerId, input, postAsOrg);
        if (res.success) {
            setInput("");
            await loadMessages();
        }
        setSending(false);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const isToday = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        return date.getUTCDate() === today.getUTCDate() &&
            date.getUTCMonth() === today.getUTCMonth() &&
            date.getUTCFullYear() === today.getUTCFullYear();
    };

    if (isStaff === false) return null;
    if (isStaff === null) return null; // Or a skeleton

    return (
        <div className={clsx("bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-xl", className || "h-[500px]")}>
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-red/10 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-brand-red" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground">Notas del Equipo</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Solo Personal Autorizado</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-green-500 uppercase">Live</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-card/50">
                {loading && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                        <p className="text-xs font-bold uppercase tracking-tighter">Sincronizando notas tácticas...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
                        <div className="p-4 bg-muted/50 rounded-full">
                            <MessageSquare className="w-8 h-8 text-muted-foreground opacity-20" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground italic uppercase">Sin notas hoy</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Deja una nota para que el siguiente coach sepa el estado del centro o tareas pendientes.</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            const showDate = idx === 0 || !isToday(messages[idx - 1].created_at) && isToday(msg.created_at);

                            return (
                                <div key={msg.id} className="space-y-4">
                                    {showDate && (
                                        <div className="flex items-center gap-4 py-2">
                                            <div className="h-px flex-1 bg-border/50" />
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hoy</span>
                                            <div className="h-px flex-1 bg-border/50" />
                                        </div>
                                    )}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3"
                                    >
                                        <div className="shrink-0">
                                            {msg.as_org ? (
                                                msg.organization?.logo_url ? (
                                                    <img src={msg.organization.logo_url} alt="" className="w-8 h-8 rounded-full border-2 border-brand-red mt-1 p-0.5" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center mt-1">
                                                        <Building2 className="w-4 h-4 text-white" />
                                                    </div>
                                                )
                                            ) : msg.user?.avatar_url ? (
                                                <img src={msg.user.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border mt-1" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center mt-1">
                                                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className={clsx("text-xs font-bold", msg.as_org ? "text-brand-red uppercase tracking-wider italic" : "text-foreground")}>
                                                    {msg.as_org ? msg.organization?.name : (msg.user?.full_name || 'Coach')}
                                                </span>
                                                {msg.as_org && <span className="text-[8px] bg-brand-red text-white px-1 rounded font-black uppercase">OFICIAL</span>}
                                                <span className="text-[9px] text-muted-foreground flex items-center gap-1 uppercase font-black">
                                                    <Clock className="w-2.5 h-2.5" /> {formatTime(msg.created_at)}
                                                </span>
                                            </div>
                                            <div className={clsx(
                                                "p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm border",
                                                msg.as_org
                                                    ? "bg-brand-red/5 border-brand-red/30 text-white font-medium"
                                                    : "bg-muted/40 border-border/50 text-foreground/90"
                                            )}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-muted/20 space-y-3">
                {isOwner && (
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Publicar como:</span>
                        <div className="flex bg-card border border-border rounded-lg p-0.5">
                            <button
                                onClick={() => setPostAsOrg(false)}
                                className={clsx(
                                    "px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all",
                                    !postAsOrg ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Personal
                            </button>
                            <button
                                onClick={() => setPostAsOrg(true)}
                                className={clsx(
                                    "px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all flex items-center gap-1.5",
                                    postAsOrg ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Building2 className="w-3 h-3" /> Empresa
                            </button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSend} className="relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe una nota para el equipo..."
                        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/50 transition-all pr-12 placeholder:italic"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || sending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-red text-white rounded-lg hover:bg-brand-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-red/20"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </form>
                <div className="mt-2 text-[9px] text-center text-muted-foreground font-bold uppercase tracking-widest opacity-50">
                    Protocolo de Comunicación Interna v1.0
                </div>
            </div>
        </div>
    );
}
