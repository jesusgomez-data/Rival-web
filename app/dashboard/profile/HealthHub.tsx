'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Battery, Moon, Footprints, RefreshCw, CheckCircle2, ChevronRight, X, TrendingUp, Heart, Watch, Triangle, Compass } from 'lucide-react';
import { getHealthMetrics, syncHealthData, getAIPredictions, getHealthHistory } from '../training/actions';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export default function HealthHub() {
    const [metrics, setMetrics] = useState<any>(null);
    const [ai, setAi] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showDeviceSelector, setShowDeviceSelector] = useState(false);
    const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    async function loadData() {
        const [m, a] = await Promise.all([
            getHealthMetrics(),
            getAIPredictions()
        ]);
        setMetrics(m);
        setAi(a);
        if (m) setLastSync(new Date(m.synced_at));
    }

    useEffect(() => {
        loadData();
    }, []);

    const providers = [
        { id: 'apple', name: 'Apple Health', icon: <Heart className="w-5 h-5 text-red-500" />, color: 'bg-red-500/10' },
        { id: 'garmin', name: 'Garmin Connect', icon: <Watch className="w-5 h-5 text-blue-500" />, color: 'bg-blue-500/10' },
        { id: 'strava', name: 'Strava', icon: <Triangle className="w-5 h-5 text-orange-500" />, color: 'bg-orange-500/10' },
        { id: 'google', name: 'Google Fit', icon: <Activity className="w-5 h-5 text-green-500" />, color: 'bg-green-500/10' },
    ];

    const performSync = async (providerName: string) => {
        setConnectingProvider(providerName);
        await new Promise(r => setTimeout(r, 1500));

        alert(`Próximamente: Estamos trabajando en la integración oficial con ${providerName} para que puedas sincronizar tus datos reales.`);

        setConnectingProvider(null);
        setShowDeviceSelector(false);
    };

    const toggleDetails = async () => {
        if (!showDetails) {
            const h = await getHealthHistory(7);
            setHistory(h.map(item => ({
                name: new Date(item.synced_at).toLocaleDateString([], { weekday: 'short' }),
                recovery: item.recovery_score,
                steps: item.steps
            })));
        }
        setShowDetails(!showDetails);
    };

    return (
        <div className="bg-brand-gray/30 rounded-[32px] p-6 border border-white/5 backdrop-blur-md relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">Bio Hub_</h3>
                </div>
                <button
                    onClick={() => setShowDeviceSelector(true)}
                    disabled={isSyncing}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 border",
                        isSyncing
                            ? "bg-green-500/10 border-green-500/20 text-green-500"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Sync Device'}</span>
                </button>
            </div>

            {/* AI Recommendation Card */}
            <AnimatePresence mode="wait">
                {ai && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-brand-red/10 border border-brand-red/20 rounded-2xl p-4 mb-8 relative overflow-hidden"
                    >
                        <div className="flex gap-4 items-start relative z-10">
                            <div className="p-2 rounded-xl bg-brand-red/20 shrink-0">
                                <Battery className={cn("w-5 h-5", Number(ai.recoveryScore) > 70 ? "text-green-500" : "text-yellow-500")} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-red mb-1">AI Strategist_</h4>
                                <p className="text-xs text-white/90 font-medium leading-relaxed italic">"{ai.recommendation}"</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-brand-red/70 uppercase px-2 py-0.5 bg-brand-red/10 rounded-full">
                                        Plan: {ai.plan}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <MetricCard
                    icon={<Footprints className="w-4 h-4 text-orange-400" />}
                    label="Pasos"
                    value={metrics?.steps?.toLocaleString() || (isSyncing ? '...' : '0')}
                    unit="pasos"
                />
                <MetricCard
                    icon={<Moon className="w-4 h-4 text-purple-400" />}
                    label="Sueño"
                    value={metrics?.sleep_hours || (isSyncing ? '...' : '0')}
                    unit="horas"
                />
                <MetricCard
                    icon={<Activity className="w-4 h-4 text-red-400" />}
                    label="FC Descanso"
                    value={metrics?.avg_hr || (isSyncing ? '...' : '0')}
                    unit="bpm"
                />
                <MetricCard
                    icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
                    label="Recuperación"
                    value={metrics?.recovery_score || (isSyncing ? '...' : '0')}
                    unit="%"
                    isPerc
                />
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Actualizado: {lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                </span>
                <button
                    onClick={toggleDetails}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group/more"
                >
                    Detalles <ChevronRight className="w-3 h-3 group-hover/more:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Device Selector Modal */}
            <AnimatePresence>
                {showDeviceSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl p-6 flex flex-col justify-center"
                    >
                        <button
                            onClick={() => setShowDeviceSelector(false)}
                            className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>

                        <div className="text-center mb-8">
                            <h3 className="text-lg font-heading font-black italic uppercase text-white mb-2">Conectar Dispositivo_</h3>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Selecciona tu plataforma de salud</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {providers.map((provider) => (
                                <button
                                    key={provider.id}
                                    onClick={() => performSync(provider.name)}
                                    disabled={!!connectingProvider}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                        connectingProvider === provider.name
                                            ? "bg-white/10 border-white/20"
                                            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", provider.color)}>
                                            {provider.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase tracking-widest text-white">{provider.name}</p>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase">Click para vincular</p>
                                        </div>
                                    </div>
                                    {connectingProvider === provider.name ? (
                                        <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {connectingProvider && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 text-center"
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500 animate-pulse">
                                    Estableciendo conexión segura con {connectingProvider}...
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Details Modal */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-[#0f0f0f] p-6 flex flex-col overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] italic text-white">Análisis de Biometría_</h3>
                            <button onClick={() => setShowDetails(false)} className="p-2 bg-white/5 rounded-full">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tendencia de Recuperación</span>
                                    </div>
                                    <span className="text-xs font-black text-white">{metrics?.recovery_score}%</span>
                                </div>
                                <div className="h-40 w-full mt-4">
                                    {history.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={history}>
                                                <defs>
                                                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Area type="monotone" dataKey="recovery" stroke="#22c55e" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-[10px] text-gray-500 uppercase font-black">Sincroniza datos para ver tendencias</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Pasos Totales</p>
                                    <p className="text-2xl font-heading font-black italic text-white tracking-tight">{metrics?.steps?.toLocaleString() || 0}</p>
                                    <div className="mt-2 text-[9px] text-green-500 font-bold uppercase tracking-widest">+12% vs ayer</div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Horas Sueño</p>
                                    <p className="text-2xl font-heading font-black italic text-white tracking-tight">{metrics?.sleep_hours || 0}h</p>
                                    <div className="mt-2 text-[9px] text-orange-500 font-bold uppercase tracking-widest">-5% vs ayer</div>
                                </div>
                            </div>

                            <div className="bg-brand-red/10 border border-brand-red/20 rounded-3xl p-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-red mb-3">Insights de salud (AI)_</h4>
                                <ul className="space-y-3">
                                    <li className="flex gap-2 text-[11px] text-white/80 italic">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1 shrink-0" />
                                        "Tu frecuencia cardíaca en reposo ha bajado, indicando una mejor forma aeróbica."
                                    </li>
                                    <li className="flex gap-2 text-[11px] text-white/80 italic">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-1 shrink-0" />
                                        "Dormiste 1.2h más de lo habitual, tu pico de energía será a las 18:00."
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MetricCard({ icon, label, value, unit, isPerc }: { icon: React.ReactNode, label: string, value: any, unit: string, isPerc?: boolean }) {
    return (
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-heading font-black italic">{value}</span>
                <span className="text-[9px] font-bold text-gray-600 uppercase italic">{unit}</span>
            </div>
            {isPerc && (
                <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        className={cn(
                            "h-full rounded-full",
                            Number(value) > 70 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" :
                                Number(value) > 40 ? "bg-yellow-500" : "bg-brand-red"
                        )}
                    />
                </div>
            )}
        </div>
    );
}
