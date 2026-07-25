"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, Plus } from "lucide-react";

const CreatePost = dynamic(() => import("@/app/dashboard/CreatePost"), { ssr: false });

// WodCard dispara 'repost-wod' (boton "Repostear") y FeedPost dispara
// 'edit-wod'/'edit-post' (editar) por window.dispatchEvent — pero solo hay
// alguien escuchando esos eventos en la pagina de Inicio (CollapsibleCreatePost
// en app/dashboard/page.tsx). En cualquier otra pagina que tambien muestre
// una WodCard (como el historial de entrenamiento), el clic en "Repostear"
// no hacia nada porque no habia ningun listener montado. Este componente es
// esa misma logica, extraida para poder montarla en cualquier otra pagina.
export default function RepostModalListener({ currentUser, onSuccess }: { currentUser: any; onSuccess?: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [repostData, setRepostData] = useState<any>(null);
    const [editMode, setEditMode] = useState<{ id: string } | null>(null);

    useEffect(() => {
        const handleRepost = (e: any) => {
            setRepostData(e.detail);
            setEditMode(null);
            setIsOpen(true);
        };
        const handleEdit = (e: any) => {
            const { postId, content, wodData, mediaUrl, mediaType, cover_url } = e.detail;
            setRepostData({ ...wodData, caption: content, media_url: mediaUrl, media_type: mediaType, cover_url: cover_url ?? null });
            setEditMode({ id: postId });
            setIsOpen(true);
        };
        window.addEventListener('repost-wod', handleRepost as any);
        window.addEventListener('edit-wod', handleEdit as any);
        window.addEventListener('edit-post', handleEdit as any);
        return () => {
            window.removeEventListener('repost-wod', handleRepost as any);
            window.removeEventListener('edit-wod', handleEdit as any);
            window.removeEventListener('edit-post', handleEdit as any);
        };
    }, []);

    if (!isOpen) return null;

    const close = () => {
        setIsOpen(false);
        setRepostData(null);
        setEditMode(null);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
            <div className="w-full max-w-2xl mt-6 mb-6 bg-brand-gray/40 border border-white/5 rounded-[28px] px-1.5 py-4 md:px-4 md:py-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 relative z-10 border-b border-white/5 pb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-brand-red animate-pulse" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground italic">
                            {editMode ? 'EDITAR WOD' : 'REPOSTEAR WOD'}
                        </h2>
                    </div>
                    <button
                        onClick={close}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-1.5 group bg-white/5 px-2.5 py-1.5 rounded-full border border-white/5 hover:border-white/20 shadow-sm shrink-0"
                    >
                        Cancelar <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                <CreatePost
                    currentUser={currentUser}
                    onSuccess={() => { close(); onSuccess?.(); }}
                    initialPostType={
                        editMode ? (repostData?.media_type === 'wod' || repostData?.post_type === 'wod' ? 'wod' : repostData?.media_type === 'pr' ? 'pr' : 'standard') :
                        (repostData && (repostData.media_type === 'wod' || repostData.post_type === 'wod') ? 'wod' : 'standard')
                    }
                    initialData={repostData}
                    editingPostId={editMode?.id}
                />
            </div>
        </div>
    );
}
