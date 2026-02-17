'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Zap, Target, TrendingUp, ShieldCheck } from 'lucide-react';

interface SkillTreeProps {
    stats: {
        power: number;
        endurance: number;
        agility: number;
        consistency: number;
    }
}

export default function SkillTree({ stats }: SkillTreeProps) {
    const data = [
        { subject: 'Poder', A: stats.power, fullMark: 100 },
        { subject: 'Resistencia', A: stats.endurance, fullMark: 100 },
        { subject: 'Agilidad', A: stats.agility, fullMark: 100 },
        { subject: 'Consistencia', A: stats.consistency, fullMark: 100 },
    ];

    return (
        <div className="bg-brand-gray/30 rounded-[32px] p-6 border border-white/5 backdrop-blur-md relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-brand-red" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">Skill Tree_</h3>
                </div>
                <div className="text-[10px] font-mono text-gray-500 uppercase">Versión 2.5</div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }}
                        />
                        <Radar
                            name="Atleta"
                            dataKey="A"
                            stroke="#E31E24"
                            fill="#E31E24"
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <StatItem label="Poder" value={stats.power} icon={<Zap className="w-3 h-3" />} color="text-yellow-500" />
                <StatItem label="Resis" value={stats.endurance} icon={<TrendingUp className="w-3 h-3" />} color="text-blue-500" />
                <StatItem label="Agilidad" value={stats.agility} icon={<Move className="w-3 h-3" />} color="text-green-500" />
                <StatItem label="Consis" value={stats.consistency} icon={<ShieldCheck className="w-3 h-3" />} color="text-purple-500" />
            </div>

            {/* Decorative background circle */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-red/10 blur-[60px] rounded-full pointer-events-none" />
        </div>
    );
}

function StatItem({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between group-hover:border-white/10 transition-colors">
            <div className="flex items-center gap-2">
                <div className={`${color} opacity-70`}>{icon}</div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
            </div>
            <span className="text-sm font-heading italic font-black text-white">{value}</span>
        </div>
    );
}

import { Move } from 'lucide-react';
