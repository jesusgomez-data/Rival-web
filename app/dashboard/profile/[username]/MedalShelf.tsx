'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Medal {
    id: string;
    medal_type: 'gold' | 'silver' | 'bronze' | 'fourth';
    competition: { title: string; type: string; date: string; };
    position: number;
    score?: string;
}

const MEDAL_CONFIG = {
    gold:   { emoji: '🥇', label: '1er Puesto', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]' },
    silver: { emoji: '🥈', label: '2do Puesto', bg: 'bg-gray-400/10',   border: 'border-gray-400/30',   text: 'text-gray-300',   glow: '' },
    bronze: { emoji: '🥉', label: '3er Puesto', bg: 'bg-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: '' },
    fourth: { emoji: '🏅', label: '4to Puesto', bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   glow: '' },
};

export default function MedalShelf({ medals }: { medals: Medal[] }) {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!medals || medals.length === 0) return null;

    // Show first 6 medals collapsed, all when expanded
    const visible = isExpanded ? medals : medals.slice(0, 6);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                    Palmares · {medals.length} medalla{medals.length !== 1 ? 's' : ''}
                </h3>
                {medals.length > 6 && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-[9px] text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {visible.map((medal) => {
                    const cfg = MEDAL_CONFIG[medal.medal_type] || MEDAL_CONFIG.fourth;
                    const dateStr = new Date(medal.competition.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                    return (
                        <div
                            key={medal.id}
                            title={`${medal.competition.title} · ${cfg.label} · ${dateStr}${medal.score ? ' · ' + medal.score : ''}`}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border ${cfg.bg} ${cfg.border} ${cfg.glow} cursor-help transition-all hover:scale-110`}
                            style={{ minWidth: 56 }}
                        >
                            <span className="text-2xl leading-none">{cfg.emoji}</span>
                            <span className={`text-[7px] font-black uppercase tracking-wider mt-1 ${cfg.text}`}>{medal.competition.type}</span>
                            <span className="text-[6px] text-gray-600 font-bold">{dateStr}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
