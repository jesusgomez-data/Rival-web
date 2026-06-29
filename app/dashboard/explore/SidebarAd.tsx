'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ExternalLink, Megaphone } from 'lucide-react';

export default function SidebarAd({ tier }: { tier: string }) {
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const adRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const supabase = createClient();

    // Intersection Observer
    useEffect(() => {
        if (!adRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            setIsVisible(entry.isIntersecting);
        }, { threshold: 0.5 });
        observer.observe(adRef.current);
        return () => observer.disconnect();
    }, []);

    // Page Visibility
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                videoRef.current?.pause();
            } else if (isVisible) {
                videoRef.current?.play().catch(() => { });
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isVisible]);

    // Internal Visibility
    useEffect(() => {
        if (isVisible) {
            videoRef.current?.play().catch(() => { });
        } else {
            videoRef.current?.pause();
        }
    }, [isVisible]);

    useEffect(() => {
        if (tier !== 'free') {
            setLoading(false);
            return;
        }

        async function loadRandomAd() {
            const { data, error } = await supabase
                .from('advertisements')
                .select('*')
                .eq('is_active', true)
                .order('id') // We could randomize, but for now just pick one
                .limit(1);

            if (data && data.length > 0) {
                const selectedAd = data[0];
                setAd(selectedAd);

                // Track view (increment views_count)
                // In a production environment, we'd throttle this
                await supabase.rpc('increment_ad_views', { ad_id: selectedAd.id });
            }
            setLoading(false);
        }

        loadRandomAd();
    }, [tier, supabase]);

    async function handleAdClick(e: React.MouseEvent) {
        if (ad) {
            await supabase.rpc('increment_ad_clicks', { ad_id: ad.id });
        }
    }

    if (tier !== 'free' || loading || !ad) {
        if (tier !== 'free' && !loading) {
            return (
                <div className="bg-gradient-to-br from-brand-red/10 to-transparent border border-brand-red/20 rounded-3xl p-6 backdrop-blur-sm">
                    <Megaphone className="w-8 h-8 text-brand-red mb-4" />
                    <h3 className="text-lg font-heading font-bold text-white uppercase italic tracking-tighter">Sin Anuncios</h3>
                    <p className="text-gray-400 text-xs mt-2 font-medium leading-relaxed">Tu cuenta Premium está libre de publicidad. ¡Disfruta de la experiencia total!</p>
                </div>
            );
        }
        return null;
    }

    const isInternalLink = ad.link_url?.startsWith('/') || ad.link_url?.includes('rival');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000" ref={adRef}>
            <div className="bg-brand-gray border border-white/5 rounded-3xl p-1 relative overflow-hidden aspect-[4/5] group shadow-2xl">
                {ad.image_url?.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                    <video
                        ref={videoRef}
                        src={ad.image_url}
                        autoPlay
                        muted={!isVisible || (typeof document !== 'undefined' && document.hidden)}
                        loop
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                ) : (
                    <Image
                        src={ad.image_url}
                        alt={ad.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Patrocinado</p>
                    <h4 className="text-white font-heading font-black italic text-lg uppercase tracking-tight leading-none mb-3 drop-shadow-lg">
                        {ad.title}
                    </h4>
                    <p className="text-[10px] text-gray-300 mb-4 line-clamp-2 leading-tight">
                        {ad.description}
                    </p>
                    {ad.link_url && (
                        isInternalLink ? (
                            <Link
                                href={ad.link_url}
                                onClick={handleAdClick}
                                className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95"
                            >
                                Ver Más <ExternalLink className="w-3 h-3" />
                            </Link>
                        ) : (
                            <a
                                href={ad.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleAdClick}
                                className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 transition-all active:scale-95"
                            >
                                Ver Más <ExternalLink className="w-3 h-3" />
                            </a>
                        )
                    )}
                </div>
            </div>

            <Link href="/dashboard/settings/billing" className="block group/card">
                <div className="bg-brand-gray border border-white/5 rounded-3xl p-6 overflow-hidden relative shadow-lg group-hover/card:border-brand-red/30 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/10 via-transparent to-transparent opacity-50 group-hover/card:opacity-100 transition-opacity" />
                    <div className="relative z-10 text-center">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">¿Cansado de ver esto?</p>
                        <h3 className="text-sm font-heading font-black italic text-white uppercase mb-4 tracking-tighter leading-tight group-hover/card:text-brand-red transition-colors">Apoya a Rival y elimina los anuncios</h3>
                        <div className="w-full bg-white/5 group-hover/card:bg-brand-red text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-white/10 uppercase text-[9px] tracking-widest">
                            Apoyar Proyecto
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
