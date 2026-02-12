"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getUserMedia } from "./community/actions";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function UserMediaGallery({ userId, limit }: { userId: string, limit?: number }) {
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        if (userId) {
            getUserMedia(userId).then((data) => {
                // Filter out class_result or JSON strings immediately
                const validMedia = (data || []).filter((item: any) => {
                    const isJson = item.media_url?.startsWith('[') || item.media_url?.startsWith('{');
                    return item.media_type !== 'class_result' && !isJson;
                });
                setMediaItems(validMedia);
                setIsLoading(false);
            });
        }
    }, [userId]);

    if (isLoading) {
        return <div className="p-6 bg-brand-gray border border-white/5 rounded-3xl animate-pulse h-40"></div>;
    }

    if (mediaItems.length === 0) {
        return null; // Don't show if empty
    }

    return (
        <>
            <div className="p-6 bg-brand-gray border border-white/5 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-white font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <span className="w-1 h-3 bg-brand-red rounded-full"></span>
                        MEDIA GALLERY
                    </h2>
                    <span className="text-xs text-gray-500">{mediaItems.length} items</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {(limit ? mediaItems.slice(0, limit) : mediaItems).map((item, index) => (
                        <div
                            key={item.id}
                            className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-white/5"
                            onClick={() => setLightboxIndex(index)}
                        >
                            {item.media_type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <video src={item.media_url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <Play className="w-6 h-6 text-white fill-white" />
                                    </div>
                                </div>
                            ) : (
                                <Image
                                    src={item.media_url}
                                    alt="User media"
                                    fill
                                    className="object-cover"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {limit && mediaItems.length > limit && (
                    <button className="w-full text-center text-xs text-gray-400 hover:text-white mt-2">
                        View all
                    </button>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setLightboxIndex(null)}
                >
                    {/* Navigation Buttons */}
                    <button
                        className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors z-[110]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : mediaItems.length - 1));
                        }}
                    >
                        <ChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
                    </button>

                    <button
                        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors z-[110]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightboxIndex((prev) => (prev !== null && prev < mediaItems.length - 1 ? prev + 1 : 0));
                        }}
                    >
                        <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
                    </button>

                    <div
                        className="relative w-auto max-w-5xl max-h-[80vh] flex items-center justify-center px-0 shadow-2xl rounded-2xl overflow-hidden bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setLightboxIndex(null)}
                            className="absolute top-4 right-4 text-white hover:text-brand-red focus:outline-none transition-colors z-[120] bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {mediaItems[lightboxIndex].media_type === 'video' ? (
                            <video
                                src={mediaItems[lightboxIndex].media_url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        ) : (
                            <img
                                src={mediaItems[lightboxIndex].media_url}
                                alt="Full size"
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
