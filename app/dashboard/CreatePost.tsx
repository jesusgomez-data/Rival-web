"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, X, Smile, Trophy, Activity } from "lucide-react";
import MentionInput from "@/components/MentionInput";
import Image from "next/image";
import MusicPicker from "./MusicPicker";
import { MusicTrack } from "./music-data";
import { useUploads } from "./UploadContext";
import dynamic from 'next/dynamic';
import VideoEditor from "./VideoEditor";

// Import correctly for SSR safety
import { Theme } from 'emoji-picker-react';
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface UserProfile {
    username?: string;
    avatar_url?: string;
    full_name?: string;
}

export default function CreatePost({ currentUser, onSuccess }: { currentUser: UserProfile | null, onSuccess?: () => void }) {
    const [mounted, setMounted] = useState(false);

    const [content, setContent] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'pr'>('standard');
    const [exercise, setExercise] = useState("");
    const [weight, setWeight] = useState("");
    const [sport, setSport] = useState("Cross Training");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [isVideoTrimming, setIsVideoTrimming] = useState(false);
    const [trimmerVideoUrl, setTrimmerVideoUrl] = useState<string | null>(null);
    const [videoToEdit, setVideoToEdit] = useState<File | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const { startUpload } = useUploads();

    // Prevent hydration issues
    useEffect(() => {
        setMounted(true);
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!mounted) return null;

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        let file = pendingFile || fileInputRef.current?.files?.[0];
        if (postType === 'standard' && !content.trim() && !file) return;
        if (postType === 'pr' && (!exercise || !weight)) return;

        startUpload({
            postType,
            content,
            file,
            exercise,
            weight,
            sport,
            selectedTrack,
            currentUser,
            preview
        });

        setContent(""); setExercise(""); setWeight(""); setPreview(null);
        setDuration(null); setPendingFile(null); setShowEmojiPicker(false);
        setPostType('standard'); setSelectedTrack(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onSuccess?.();
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('video/')) {
                setVideoToEdit(file);
                setTrimmerVideoUrl(URL.createObjectURL(file));
                setIsVideoTrimming(true);
            } else {
                setPreview(URL.createObjectURL(file));
                setDuration(null);
                setPendingFile(file);
            }
        }
    };

    return (
        <div className="bg-brand-gray/30 border border-white/10 rounded-[28px] p-4 md:p-6 backdrop-blur-md mb-8 relative z-10 w-full animate-in fade-in duration-500">
            <div className="flex gap-2 mb-4 md:mb-6">
                <button type="button" onClick={() => setPostType('standard')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${postType === 'standard' ? 'bg-white/10 border-white/20 text-white shadow-inner' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Activity className="w-3.5 h-3.5 text-brand-red" />Actualización</button>
                <button type="button" onClick={() => setPostType('pr')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${postType === 'pr' ? 'bg-white/10 border-white/20 text-white shadow-inner' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Trophy className="w-3.5 h-3.5 text-brand-yellow" />Nuevo PR</button>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <form onSubmit={handlePost} className="space-y-4">
                        {postType === 'pr' && (
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                <input type="text" placeholder="EJERCICIO" value={exercise} onChange={(e) => setExercise(e.target.value.toUpperCase())} className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all uppercase" />
                                <input type="text" placeholder="PESO (KG/LBS)" value={weight} onChange={(e) => setWeight(e.target.value.toUpperCase())} className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all uppercase" />
                            </div>
                        )}
                        <div className="relative group">
                            <MentionInput value={content} onChange={setContent} placeholder={postType === 'pr' ? "¿Cómo te sentiste en este levantamiento?" : currentUser ? `¿Qué hay de nuevo, ${currentUser.username || 'Atleta'}?` : "¿Qué hay de nuevo?"} className="w-full bg-black/20 border border-white/5 rounded-[24px] p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all resize-none min-h-[120px] shadow-inner" />
                            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                <div className="relative" ref={emojiPickerRef}>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-500 hover:text-brand-red transition-colors"><Smile className="w-5 h-5" /></button>
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-full right-0 mb-4 z-[100] scale-75 md:scale-100 origin-bottom-right">
                                            <EmojiPicker
                                                theme={Theme.DARK}
                                                onEmojiClick={(ed) => setContent(p => p + ed.emoji)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {preview && (
                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group animate-in zoom-in-95">
                                {preview.startsWith('data:image') || preview.includes('image') ? (
                                    <Image src={preview} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <video src={preview} className="w-full h-full object-cover" controls playsInline />
                                )}
                                <button type="button" onClick={() => { setPreview(null); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={handleFileChange} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"><ImageIcon className="w-4 h-4 text-brand-red" /> Multimedia</button>
                                <MusicPicker onSelect={setSelectedTrack} selectedTrackId={selectedTrack?.id || null} />
                            </div>
                            <button type="submit" disabled={(postType === 'standard' && !content.trim() && !preview) || (postType === 'pr' && (!exercise || !weight))} className="bg-brand-red text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-glow-sm hover:shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3 ml-auto"><Send className="w-4 h-4" /><span>{postType === 'pr' ? 'Publicar PR' : 'Publicar'}</span></button>
                        </div>
                    </form>
                </div>
            </div>

            {isVideoTrimming && trimmerVideoUrl && videoToEdit && (
                <VideoEditor
                    videoSrc={trimmerVideoUrl}
                    videoFile={videoToEdit}
                    onCancel={() => {
                        setIsVideoTrimming(false);
                        setTrimmerVideoUrl(null);
                        setVideoToEdit(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    onSave={(file, dur) => {
                        setPendingFile(file);
                        setPreview(URL.createObjectURL(file));
                        setDuration(dur);
                        setIsVideoTrimming(false);
                        setTrimmerVideoUrl(null);
                        setVideoToEdit(null);
                    }}
                />
            )}
        </div>
    );
}
