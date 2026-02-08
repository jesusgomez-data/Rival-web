
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, X, Smile } from "lucide-react";
import { createUserPost, createPRPost } from "./community/actions";
import { Trophy, Activity } from "lucide-react";
import Image from "next/image";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import MusicPicker from "./MusicPicker";
import { MusicTrack } from "./music-data";

export default function CreatePost({ currentUser }: { currentUser: any }) {
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'pr'>('standard');
    const [exercise, setExercise] = useState("");
    const [weight, setWeight] = useState("");
    const [sport, setSport] = useState("Cross Training");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Close emoji picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];

        if (postType === 'standard' && !content.trim() && !file) return;
        if (postType === 'pr' && (!exercise || !weight)) return;

        setIsPosting(true);

        const formData = new FormData();

        if (selectedTrack) {
            formData.append("music_url", selectedTrack.url);
            formData.append("music_title", selectedTrack.title);
            formData.append("music_artist", selectedTrack.artist);
        }

        let res;
        try {
            if (postType === 'pr') {
                formData.append("exercise", exercise);
                formData.append("weight", weight);
                formData.append("sport", sport);
                if (file) formData.append("media", file);
                res = await createPRPost(formData);
            } else {
                formData.append("content", content);
                if (file) formData.append("media", file);
                res = await createUserPost(formData);
            }

            if (res?.error) {
                alert(`Error al publicar: ${res.error}`);
            } else {
                setContent("");
                setExercise("");
                setWeight("");
                setPreview(null);
                setShowEmojiPicker(false);
                setPostType('standard');
                setSelectedTrack(null);
                if (fileInputRef.current) fileInputRef.current.value = "";

                // Optional: Show success toast/message here if we had a toast system
            }
        } catch (error: any) {
            console.error("Post error:", error);
            alert(`Ocurrió un error inesperado al publicar: ${error?.message || String(error)}`);
        } finally {
            setIsPosting(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 20 * 1024 * 1024) { // 20MB limit
                alert("El archivo es demasiado grande (máximo 20MB).");
                if (fileInputRef.current) fileInputRef.current.value = "";
                setPreview(null);
                return;
            }
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setContent(prev => prev + emojiData.emoji);
    };

    return (
        <div className="bg-brand-gray/30 border border-white/10 rounded-[32px] p-4 md:p-6 backdrop-blur-md mb-8 relative z-10 w-full max-w-full overflow-hidden">
            {/* Post Type Selector */}
            <div className="flex gap-2 mb-4 md:mb-6">
                <button
                    type="button"
                    onClick={() => setPostType('standard')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${postType === 'standard' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Activity className="w-3 h-3 text-brand-red" />
                    Actualización
                </button>
                <button
                    type="button"
                    onClick={() => setPostType('pr')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${postType === 'pr' ? 'bg-brand-red/10 border-brand-red/30 text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Trophy className="w-3 h-3" />
                    Nuevo PR
                </button>
            </div>

            <div className="flex gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 bg-black/40 overflow-hidden relative shrink-0">
                    {currentUser?.user_metadata?.avatar_url ? (
                        <Image src={currentUser.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-400">ME</div>
                    )}
                </div>
                <div className="flex-1 relative min-w-0">
                    <form onSubmit={handlePost}>
                        {postType === 'standard' ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What are you training today?"
                                className="w-full bg-transparent text-white placeholder:text-gray-500 text-sm md:text-lg resize-none focus:outline-none mb-4 min-h-[80px] md:min-h-[60px]"
                                rows={3}
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ejercicio</label>
                                    <input
                                        type="text"
                                        placeholder="p.ej. Back Squat"
                                        value={exercise}
                                        onChange={(e) => setExercise(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Peso (kg)</label>
                                    <input
                                        type="text" // using text to allow decimal points more easily, could change to number
                                        inputMode="decimal"
                                        placeholder="p.ej. 140"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-brand-red font-black focus:outline-none focus:border-brand-red/50 text-sm"
                                    />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Disciplina / Comentario</label>
                                    <input
                                        type="text"
                                        placeholder="p.ej. Cross Training / Levantamiento"
                                        value={sport}
                                        onChange={(e) => setSport(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {preview && (
                            <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/40 w-fit max-w-full">
                                <img src={preview} alt="Preview" className="max-h-[300px] object-contain" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreview(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-brand-red transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t border-white/5 pt-4 gap-2 flex-wrap">
                            <div className="flex gap-1 md:gap-2 relative">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-brand-red hover:bg-brand-red/10 rounded-xl transition-colors flex items-center gap-2 relative z-10 shrink-0"
                                    title="Add Media"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                                        {postType === 'pr' ? 'Fondo Personalizado' : 'Foto/Video'}
                                    </span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {postType === 'standard' && (
                                    <div ref={emojiPickerRef} className="relative z-20">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`p-2 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${showEmojiPicker ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                                            title="Add Emoji"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute top-12 left-0 shadow-2xl z-30">
                                                <EmojiPicker
                                                    theme={Theme.DARK}
                                                    onEmojiClick={onEmojiClick}
                                                    width={300}
                                                    height={400}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <MusicPicker
                                    onSelect={setSelectedTrack}
                                    selectedTrackId={selectedTrack?.id || null}
                                    placement="bottom"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPosting || (postType === 'standard' && !content.trim() && !preview) || (postType === 'pr' && (!exercise || !weight))}
                                className="bg-brand-red text-white px-5 md:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 ml-auto"
                            >
                                {isPosting ? (
                                    <>
                                        <span className="animate-spin"><Loader2 className="w-4 h-4" /></span>
                                        <span className="hidden sm:inline">Publicando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {postType === 'pr' ? 'PUBLICAR PR' : 'POST'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
