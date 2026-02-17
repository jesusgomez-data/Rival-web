import { motion } from 'framer-motion';
import { Eye, UserPlus, CreditCard, Zap, Terminal as TerminalIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityEvent {
    id: string;
    type: string;
    label: string;
    created_at: string;
    page_path?: string;
    full_name?: string;
    profiles?: { full_name: string };
    icon: string;
    color: string;
}

export default function TerminalActivity({ activities }: { activities: any[] }) {
    return (
        <div className="bg-black/90 dark:bg-black rounded-3xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl">
            {/* Terminal Header */}
            <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="ml-4 flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        <TerminalIcon className="w-3 h-3" />
                        Rival System Terminal_
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-green-500/70 uppercase">Live Feed</span>
                </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono no-scrollbar">
                {activities.length === 0 ? (
                    <div className="text-gray-600 text-xs italic">Escuchando eventos del sistema...</div>
                ) : (
                    activities.map((event, i) => {
                        const Icon = event.type === 'visit' ? Eye :
                            event.type === 'signup' ? UserPlus :
                                event.type === 'subscription' ? CreditCard : Zap;

                        return (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={event.id || i}
                                className="flex items-start gap-3 group border-l border-white/5 pl-3 hover:border-brand-red/30 transition-colors"
                            >
                                <div className={cn("mt-1 p-1 rounded bg-white/5", event.color)}>
                                    <Icon className="w-3 h-3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn("text-[10px] font-bold uppercase", event.color)}>
                                            {event.label}
                                        </span>
                                        <span className="text-[9px] text-gray-600 shrink-0">
                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-400 truncate leading-relaxed mt-0.5">
                                        {event.type === 'visit' ? (
                                            <>Visitó <span className="text-blue-400">{event.page_path}</span></>
                                        ) : event.type === 'signup' ? (
                                            <>Nuevo atleta registrado: <span className="text-green-400">{event.full_name || 'Anónimo'}</span></>
                                        ) : event.type === 'subscription' ? (
                                            <>Cambio en plan de <span className="text-purple-400">{event.profiles?.full_name || 'Usuario'}</span></>
                                        ) : (
                                            <>Entrenamiento registrado por <span className="text-yellow-400">{event.profiles?.full_name || 'Atleta'}</span></>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
                <div className="h-4 flex items-center gap-1">
                    <div className="w-1.5 h-3 bg-brand-red animate-pulse" />
                </div>
            </div>

            {/* Terminal Footer */}
            <div className="p-3 bg-white/5 border-t border-white/10">
                <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <div className="flex items-center gap-4">
                        <span>CPU: 12%</span>
                        <span>MEM: 244MB</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
