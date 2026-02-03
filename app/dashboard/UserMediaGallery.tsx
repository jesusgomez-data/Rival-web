"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getUserMedia } from "./community/actions";
import { Play, X } from "lucide-react";

export default function UserMediaGallery({ userId }: { userId: string }) {
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
                    {mediaItems.slice(0, 9).map((item, index) => (
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

                {mediaItems.length > 9 && (
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
                    <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div
                        className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {mediaItems[lightboxIndex].media_type === 'video' ? (
                            <video
                                src={mediaItems[lightboxIndex].media_url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                            />
                        ) : (
                            <img
                                src={mediaItems[lightboxIndex].media_url}
                                alt="Full size"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
