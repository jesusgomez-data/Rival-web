'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ExternalLink, Megaphone, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeedAd({ tier }: { tier: string }) {
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (tier !== 'free') {
            setLoading(false);
            return;
        }

        async function loadRandomAd() {
            const { data } = await supabase
                .from('advertisements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(10); // Get a few to pick randomly

            if (data && data.length > 0) {
                const randomAd = data[Math.floor(Math.random() * data.length)];
                setAd(randomAd);
                await supabase.rpc('increment_ad_views', { ad_id: randomAd.id });
            }
            setLoading(false);
        }

        loadRandomAd();
    }, [tier, supabase]);

    if (tier !== 'free' || loading || !ad) return null;

    return (
        <div className="bg-brand-gray border border-white/5 rounded-3xl overflow-hidden mb-8 group animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red">
                        <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white tracking-widest italic">Patrocinado</p>
                        <p className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Sugerido para ti</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/5">
                    <Shield className="w-3 h-3 text-gray-500" />
                    <span className="text-[8px] font-black text-gray-500 uppercase">Verificado</span>
                </div>
            </div>

            <div className="relative aspect-video w-full overflow-hidden">
                {ad.image_url?.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                    <video
                        src={ad.image_url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    />
                ) : (
                    <Image
                        src={ad.image_url}
                        alt={ad.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-1000"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            </div>

            <div className="p-6 space-y-4">
                <div>
                    <h4 className="text-xl font-heading font-black italic text-white uppercase tracking-tighter mb-2 group-hover:text-brand-red transition-colors">
                        {ad.title}
                    </h4>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 italic">
                        "{ad.description}"
                    </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-brand-red uppercase border border-brand-red/30 px-2 py-0.5 rounded">Ad</span>
                        <span className="text-[10px] text-gray-500 uppercase font-black">Rival Network</span>
                    </div>

                    {ad.link_url && (
                        (ad.link_url.startsWith('/') || ad.link_url.includes('rival')) ? (
                            <Link
                                href={ad.link_url}
                                onClick={async () => await supabase.rpc('increment_ad_clicks', { ad_id: ad.id })}
                                className="bg-white text-black hover:bg-brand-red hover:text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl active:scale-95"
                            >
                                Ver Más <ExternalLink className="w-3 h-3" />
                            </Link>
                        ) : (
                            <a
                                href={ad.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={async () => await supabase.rpc('increment_ad_clicks', { ad_id: ad.id })}
                                className="bg-white text-black hover:bg-brand-red hover:text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl active:scale-95"
                            >
                                Ver Más <ExternalLink className="w-3 h-3" />
                            </a>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
