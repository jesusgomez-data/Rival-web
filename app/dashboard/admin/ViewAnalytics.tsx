'use client';

import { useEffect, useState } from 'react';
import { Eye, Building2, User, Video, Image as ImageIcon, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getViewAnalyticsData } from './actions';

interface ViewAnalyticsData {
    orgVisitStats: { id: string; name: string; type: 'profesional' | 'centro'; visits: number }[];
    totalProfileVisits: number;
    topPosts: { id: string; caption: string; mediaType: string; viewCount: number; author: string }[];
    totalPostViews: number;
    topStories: { id: string; author: string; createdAt: string; viewCount: number }[];
    totalStoryViews: number;
}

export default function ViewAnalytics() {
    const [data, setData] = useState<ViewAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getViewAnalyticsData()
            .then(setData as any)
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

    const { orgVisitStats, totalProfileVisits, topPosts, totalPostViews, topStories, totalStoryViews } = data;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard title="Visitas a Perfiles" value={totalProfileVisits} icon={<Eye className="w-5 h-5" />} color="text-blue-500" />
                <KPICard title="Visualizaciones de Posts/Videos" value={totalPostViews} icon={<Video className="w-5 h-5" />} color="text-purple-500" />
                <KPICard title="Visualizaciones de Historias" value={totalStoryViews} icon={<BookOpen className="w-5 h-5" />} color="text-green-500" />
            </div>

            {/* Profile Visits by Organization */}
            <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Visitas por Perfil (Centros y Profesionales)</h4>
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl overflow-hidden">
                    {orgVisitStats.length === 0 ? (
                        <p className="text-sm text-gray-500 p-6">Aún no hay visitas registradas.</p>
                    ) : (
                        orgVisitStats.map((org) => (
                            <div key={org.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    {org.type === 'profesional' ? <User className="w-4 h-4 text-brand-red" /> : <Building2 className="w-4 h-4 text-brand-red" />}
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{org.name}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500">{org.type}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-mono font-bold text-foreground">{org.visits}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Top Posts/Videos */}
            <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Posts y Videos Más Vistos</h4>
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl overflow-hidden">
                    {topPosts.length === 0 ? (
                        <p className="text-sm text-gray-500 p-6">Aún no hay visualizaciones registradas.</p>
                    ) : (
                        topPosts.map((post) => (
                            <div key={post.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/5 last:border-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    {post.mediaType === 'video' ? <Video className="w-4 h-4 text-purple-500 shrink-0" /> : <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />}
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate max-w-[300px]">{post.caption || '(Sin descripción)'}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500">{post.author}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-mono font-bold text-foreground shrink-0">{post.viewCount}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Top Stories */}
            <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Historias Más Vistas</h4>
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl overflow-hidden">
                    {topStories.length === 0 ? (
                        <p className="text-sm text-gray-500 p-6">Aún no hay historias con visualizaciones.</p>
                    ) : (
                        topStories.map((story) => (
                            <div key={story.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/5 last:border-0">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{story.author}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500">{new Date(story.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className="text-sm font-mono font-bold text-foreground">{story.viewCount}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-2xl p-5">
            <div className={cn("flex items-center gap-2 mb-2", color)}>
                {icon}
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</span>
            </div>
            <p className="text-3xl font-black italic text-foreground">{value.toLocaleString('es-ES')}</p>
        </div>
    );
}
