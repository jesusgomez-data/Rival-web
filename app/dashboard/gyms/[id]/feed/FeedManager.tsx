"use client";

import { useState } from "react";
import { Send, Image as ImageIcon, Trash2, Building2 } from "lucide-react";
import { createPost, deletePost } from "../../feed-actions";
import { useRouter } from "next/navigation";

import GymPostCard from "../../GymPostCard";

export default function FeedManager({ centerId, initialPosts, currentUserId }: any) {
    const router = useRouter();
    const [posts, setPosts] = useState(initialPosts);
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [postAsCenter, setPostAsCenter] = useState(false);

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        if (!content.trim() && !(e.target as any).media.value) return;
        setIsPosting(true);

        const formData = new FormData(e.target as HTMLFormElement);
        formData.append('postAsCenter', String(postAsCenter));
        const res = await createPost(centerId, formData);
        setIsPosting(false);

        if (res.error) {
            alert(res.error);
        } else {
            setContent("");
            setPreviewUrl(null);
            router.refresh();
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar esta publicación?")) return;
        const res = await deletePost(centerId, id);
        if (res.success) {
            setPosts(posts.filter((p: any) => p.id !== id));
            router.refresh();
        }
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-card p-4 sm:p-6 rounded-2xl border border-border gap-4 sm:gap-0">
                <div>
                    <h2 className="text-xl font-black text-foreground italic uppercase">Gestionar Feed</h2>
                    <p className="text-muted-foreground text-sm">Publica actualizaciones y mira tu perfil exactamente como los miembros lo ven.</p>
                </div>
                <a
                    href={`/gym/${centerId}`}
                    target="_blank"
                    className="bg-foreground text-background px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-80 transition-colors flex items-center gap-2"
                >
                    Ver Perfil Público
                </a>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Create Post */}
                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 sticky top-8">
                        <h3 className="text-lg font-black text-foreground italic uppercase mb-4">Nueva Publicación</h3>
                        <form onSubmit={handlePost} className="space-y-4">
                            <textarea
                                name="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share an update, photo, or announcement..."
                                className="w-full h-32 bg-input border border-border rounded-xl p-4 text-foreground outline-none focus:border-brand-red text-sm resize-none"
                                required
                            />

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Adjuntar Multimedia</label>
                                <input
                                    name="media"
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-foreground/10 file:text-foreground hover:file:bg-foreground/20"
                                />
                                {previewUrl && (
                                    <div className="mt-4 relative rounded-xl overflow-hidden aspect-video border border-border bg-black/40">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setPreviewUrl(null); (document.querySelector('input[name="media"]') as any).value = ""; }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-brand-red transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 py-2 cursor-pointer" onClick={() => setPostAsCenter(!postAsCenter)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${postAsCenter ? 'bg-brand-red border-brand-red' : 'border-border bg-input'}`}>
                                    {postAsCenter && <Send className="w-3 h-3 text-white rotate-[-45deg]" />}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wide select-none ${postAsCenter ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    Publicar como el Centro
                                </span>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isPosting}
                                    className="w-full bg-brand-red text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPosting ? 'Publicando...' : <><Send className="w-4 h-4" /> Publicar</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Feed Preview Grid (Instagram Style) */}
                <div className="lg:col-span-2">
                    <div className="space-y-4 sm:space-y-6">
                        {posts.filter((p: any) => p.post_type === 'post').map((post: any) => (
                            <GymPostCard
                                key={post.id}
                                post={post}
                                centerId={centerId}
                                isAdmin={true}
                                currentUserId={currentUserId}
                            />
                        ))}
                    </div>

                    {posts.filter((p: any) => p.post_type === 'post').length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-muted-foreground">No hay publicaciones aún. ¡Empieza a construir tu cuadrícula!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
