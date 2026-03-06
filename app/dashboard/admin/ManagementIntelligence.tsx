'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Users, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getManagementIntelligenceData } from './actions';

interface ChurnUser {
    id: string;
    name: string;
    risk: string;
    daysInactive: number;
    tier: string;
}

interface IntelligenceData {
    kpis: {
        projectedRevenue: string;
        revenueChange: string;
        newMembers: number;
        memberChange: string;
        churnRate: string;
        churnChange: string;
    };
    heatmap: number[][];
    churnRisk: ChurnUser[];
    aiInsight: string;
}

export default function ManagementIntelligence() {
    const [data, setData] = useState<IntelligenceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getManagementIntelligenceData()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    const { kpis, heatmap, churnRisk, aiInsight } = data;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    title="Ingresos Proyectados"
                    value={kpis.projectedRevenue}
                    change={kpis.revenueChange}
                    icon={<DollarSign className="w-5 h-5" />}
                    color="text-green-500"
                />
                <KPICard
                    title="Nuevos Miembros (30d)"
                    value={kpis.newMembers}
                    change={kpis.memberChange}
                    icon={<Users className="w-5 h-5" />}
                    color="text-blue-500"
                />
                <KPICard
                    title="Tasa de Abandono"
                    value={kpis.churnRate}
                    change={kpis.churnChange}
                    icon={<TrendingDown className="w-5 h-5" />}
                    color="text-brand-red"
                    inverse
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Heatmap */}
                <div className="lg:col-span-8 bg-brand-gray/30 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] italic text-white">Mapa de Calor: Actividad_</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Workouts registrados por franja horaria (últimos 30 días)</p>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => <div key={i} className={cn("w-3 h-3 rounded-sm",
                                i === 1 ? "bg-red-900/20" : i === 2 ? "bg-red-700/40" : i === 3 ? "bg-red-500/60" : "bg-red-500"
                            )} />)}
                        </div>
                    </div>

                    <div className="space-y-4 overflow-x-auto pb-4 custom-scrollbar">
                        <div className="min-w-[600px] space-y-4">
                            {heatmap.map((row, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="text-[9px] font-mono text-gray-500 w-10 uppercase">{['08h', '10h', '14h', '18h', '20h'][i]}</span>
                                    <div className="flex-1 grid grid-cols-7 gap-2">
                                        {row.map((val, j) => (
                                            <div
                                                key={j}
                                                className="h-10 rounded-lg relative group transition-transform hover:scale-110 cursor-help"
                                                style={{
                                                    backgroundColor: val > 80 ? 'rgba(227, 30, 36, 0.8)' :
                                                        val > 50 ? 'rgba(227, 30, 36, 0.4)' :
                                                            val > 20 ? 'rgba(227, 30, 36, 0.2)' : 'rgba(255,255,255,0.02)'
                                                }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[9px] font-black text-white">{val}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center gap-4 pt-2">
                                <span className="w-10"></span>
                                <div className="flex-1 grid grid-cols-7 gap-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                        <span key={day} className="text-center text-[9px] font-black text-gray-600 uppercase">{day}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Churn + AI Insight */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-brand-gray/30 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-6">
                            <AlertTriangle className="w-4 h-4 text-brand-red" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] italic text-white">Alerta de Abandono (Churn)_</h3>
                        </div>

                        {churnRisk.length === 0 ? (
                            <p className="text-[10px] text-gray-500 text-center py-8 uppercase font-black tracking-widest">Sin usuarios en riesgo activo</p>
                        ) : (
                            <div className="space-y-4">
                                {churnRisk.map(user => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-black/40 border border-white/5 rounded-2xl group hover:border-brand-red/30 transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-sm text-white truncate max-w-[120px]">{user.name}</div>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0",
                                                user.risk === 'Alto' ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
                                            )}>Riesgo {user.risk}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <div className="text-gray-500">Inactivo: <span className="text-white">{user.daysInactive} días</span></div>
                                            <div className="text-gray-500">Plan: <span className="text-white capitalize">{user.tier}</span></div>
                                        </div>
                                        <button className="w-full mt-4 py-2 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:bg-brand-red group-hover:text-white transition-all">
                                            Enviar Incentivo
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-brand-red/10 border border-brand-red/20 rounded-3xl p-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black italic text-brand-red uppercase mb-2 tracking-widest">AI Strategy Bot_</h4>
                            <p className="text-xs text-white/90 leading-relaxed italic">"{aiInsight}"</p>
                        </div>
                        <TrendingUp className="absolute -right-2 -bottom-2 w-20 h-20 text-brand-red/20 -rotate-12" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, change, icon, color, inverse }: {
    title: string;
    value: string | number;
    change: string;
    icon: React.ReactNode;
    color: string;
    inverse?: boolean;
}) {
    const isPositive = change.startsWith('+');
    const isGood = inverse ? !isPositive : isPositive;

    return (
        <div className="bg-brand-gray/30 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl group hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-xl bg-white/5", color)}>{icon}</div>
                <div className={cn("text-[10px] font-black px-2 py-1 rounded-lg",
                    isGood ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                    {change}
                </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{title}</div>
            <div className="text-2xl font-heading font-black italic text-white tracking-tight">{value}</div>
        </div>
    );
}
