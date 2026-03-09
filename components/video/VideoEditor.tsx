"use client";

import { useState, useRef, useEffect } from "react";
import { 
    X, 
    Type, 
    Smile, 
    Loader2, 
    Sparkles, 
    ChevronRight, 
    Music as MusicIcon, 
    Scissors, 
    Image as ImageIcon, 
    Plus, 
    Volume2, 
    VolumeX,
    Zap,
    Play,
    Pause
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { createPortal } from "react-dom";

interface TextOverlay {
    id: string; text: string; x: number; y: number; fontSize: number;
    color: string; fontFamily: string; style: 'classic' | 'modern' | 'neon' | 'typewriter';
}

interface StickerOverlay { id: string; emoji: string; x: number; y: number; size: number; }
interface ImageOverlay { id: string; src: string; x: number; y: number; width: number; height: number; }

interface VideoEditorProps {
    videoFile: File;
    onSave: (editedFile: File, duration: number) => void;
    onCancel: () => void;
}

const FONTS = [
    { name: "CLASSIC", family: "'Outfit', sans-serif", style: 'classic' },
    { name: "MODERN", family: "'Inter', sans-serif", style: 'modern' },
    { name: "NEON", family: "'Bungee', cursive", style: 'neon' },
    { name: "TYPEWRITER", family: "'Courier New', Courier, monospace", style: 'typewriter' }
];

const FILTERS = [
    { name: "Normal", css: "none" },
    { name: "Mono", css: "grayscale(1) contrast(1.1) brightness(1.2)" },
    { name: "Cinema", css: "sepia(0.2) saturate(0.9) contrast(1.4) brightness(0.8) hue-rotate(-5deg)" },
    { name: "Vibrant", css: "saturate(2.2) contrast(1.1) brightness(1.05)" },
    { name: "Elite", css: "contrast(1.6) saturate(1.4) brightness(1.1) sepia(0.2)" }
];

const SPECIAL_FX = [
    { name: "Ninguno", id: "none", filter: "" },
    { name: "Glitch", id: "glitch", filter: "contrast(1.5) hue-rotate(90deg)" },
    { name: "RGB Split", id: "rgb", filter: "drop-shadow(4px 0px 0px #ff0000) drop-shadow(-4px 0px 0px #00ffff)" },
    { name: "Pixel", id: "pixel", filter: "contrast(1.2) brightness(1.1)" },
    { name: "Blur Intenso", id: "blur", filter: "blur(10px)" },
    { name: "Invertido", id: "invert", filter: "invert(1)" }
];

const TRACKS = [
    { name: "Rival Energy", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Gym Hardcore", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Urban Beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { name: "Elite Performance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" }
];

export default function VideoEditor({ videoFile, onSave, onCancel }: VideoEditorProps) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentFilter, setCurrentFilter] = useState(FILTERS[0]);
    const [currentFX, setCurrentFX] = useState(SPECIAL_FX[0]);
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
    const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [activeTool, setActiveTool] = useState<'filter' | 'text' | 'sticker' | 'trim' | 'image' | 'music' | 'fx' | 'none'>('none');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [lastDragEndTime, setLastDragEndTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 0 }); 
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [pendingText, setPendingText] = useState("");
    const [activeFont, setActiveFont] = useState(FONTS[0]);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<typeof TRACKS[0] | null>(null);
    const [musicVolume, setMusicVolume] = useState(0.5);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const exportVideoRef = useRef<HTMLVideoElement>(null);
    const exportCanvasRef = useRef<HTMLCanvasElement>(null);
    const musicRef = useRef<HTMLAudioElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
        return () => {
            URL.revokeObjectURL(url);
            setMounted(false);
        };
    }, [videoFile]);

    // Thumbnail Generation
    const generateThumbnails = async (duration: number) => {
        if (!videoUrl || thumbnails.length > 0) return;
        const v = document.createElement('video');
        v.src = videoUrl; v.preload = 'metadata'; v.muted = true; v.crossOrigin = "anonymous";
        await new Promise(r => v.onloadedmetadata = r);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 60; canvas.height = 100;
        const count = 12; const frames: string[] = [];
        for (let i = 0; i < count; i++) {
            v.currentTime = (i / count) * duration;
            await new Promise(r => v.onseeked = r);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.5));
        }
        setThumbnails(frames);
    };

    useEffect(() => {
        if (videoDuration > 0 && trimRange.end === 0) {
            setTrimRange({ start: 0, end: videoDuration });
            generateThumbnails(videoDuration);
        }
    }, [videoDuration]);

    // Loop logic for the preview
    useEffect(() => {
        const video = videoRef.current;
        if (!video || videoDuration === 0) return;

        const checkTime = () => {
            if (video.currentTime >= trimRange.end) {
                video.currentTime = trimRange.start;
                if (musicRef.current) musicRef.current.currentTime = 0;
            }
            setCurrentTime(video.currentTime);
        };

        video.addEventListener('timeupdate', checkTime);
        return () => video.removeEventListener('timeupdate', checkTime);
    }, [trimRange, videoDuration]);

    if (!mounted) return null;

    const addText = () => {
        if (!pendingText.trim()) return;
        setTextOverlays(prev => [...prev, { id: Date.now().toString(), text: pendingText, x: 50, y: 40, fontSize: 48, color: '#FFFFFF', fontFamily: activeFont.family, style: activeFont.style as any }]);
        setPendingText(""); setActiveTool('none');
    };

    const addSticker = (emojiData: EmojiClickData) => {
        setStickerOverlays(prev => [...prev, { id: Date.now().toString(), emoji: emojiData.emoji, x: 50, y: 50, size: 100 }]);
        setActiveTool('none');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImageOverlays(prev => [...prev, { id: Date.now().toString(), src: url, x: 50, y: 60, width: 200, height: 200 }]);
            setActiveTool('none');
        }
    };

    const handleExport = async () => {
        if (!exportCanvasRef.current || !exportVideoRef.current) return;
        setIsSaving(true);
        setSaveProgress(0);
        
        const canvas = exportCanvasRef.current;
        const video = exportVideoRef.current;
        const ctx = canvas.getContext('2d')!;
        const durationToRecord = trimRange.end - trimRange.start;

        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 25000000 });
        
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            onSave(new File([blob], "rival_pro.webm", { type: recorder.mimeType }), durationToRecord);
            setIsSaving(false);
        };

        video.currentTime = trimRange.start;
        video.play();
        recorder.start();

        const renderLoop = () => {
            if (video.currentTime >= trimRange.end) { recorder.stop(); video.pause(); return; }
            ctx.filter = `${currentFilter.css} ${currentFX.filter}`;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';

            // Draw Overlays
            imageOverlays.forEach(img => {
                const el = new Image(); el.src = img.src;
                ctx.drawImage(el, (img.x / 100) * canvas.width - (img.width/2), (img.y / 100) * canvas.height - (img.height/2), img.width, img.height);
            });
            stickerOverlays.forEach(so => {
                ctx.save(); ctx.translate((so.x / 100) * canvas.width, (so.y / 100) * canvas.height); ctx.font = `${so.size * (canvas.height/800)}px Arial`;
                ctx.textAlign = 'center'; ctx.fillText(so.emoji, 0, 0); ctx.restore();
            });
            textOverlays.forEach(to => {
                ctx.save(); ctx.translate((to.x / 100) * canvas.width, (to.y / 100) * canvas.height);
                if (to.style === 'neon') { ctx.shadowColor = to.color; ctx.shadowBlur = 30; }
                ctx.font = `italic 950 ${to.fontSize * (canvas.height/800)}px ${to.fontFamily}`;
                ctx.textAlign = 'center'; ctx.fillStyle = to.color; ctx.fillText(to.text.toUpperCase(), 0, 0); ctx.restore();
            });
            if (recorder.state === 'recording') requestAnimationFrame(renderLoop);
        };
        renderLoop();
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000000] bg-black overflow-hidden select-none touch-none w-screen h-[100dvh] flex flex-col items-center justify-center">
            {/* 1. COMPARED TO IG: VIDEO IS CENTERED/FULL SCREEN */}
            <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
                <video 
                    ref={videoRef} src={videoUrl || undefined}
                    className="w-full h-full object-cover"
                    style={{ filter: `${currentFilter.css} ${currentFX.filter}` }}
                    playsInline loop autoPlay muted={isMuted}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                />
                
                {selectedTrack && <audio ref={musicRef} src={selectedTrack.url} loop crossOrigin="anonymous" />}

                {/* VISUAL OVERLAYS DRAGGABLE LAYER */}
                <div className="absolute inset-0 pointer-events-none z-20">
                    <AnimatePresence>
                        {imageOverlays.map(img => (
                            <motion.div
                                key={img.id}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                dragConstraints={containerRef}
                                onDragStart={() => setDraggingId(img.id)}
                                onDragEnd={(_, info) => {
                                    setDraggingId(null);
                                    setLastDragEndTime(Date.now());
                                    if (!containerRef.current) return;
                                    const rect = containerRef.current.getBoundingClientRect();
                                    
                                    // Update using delta (offset) for absolute stability
                                    const deltaX = (info.offset.x / rect.width) * 100;
                                    const deltaY = (info.offset.y / rect.height) * 100;
                                    
                                    setImageOverlays(prev => prev.map(i => i.id === img.id ? { 
                                        ...i, 
                                        x: i.x + deltaX, 
                                        y: i.y + deltaY 
                                    } : i));
                                }}
                                className="absolute pointer-events-auto cursor-grab active:cursor-grabbing shadow-2xl rounded-xl border-2 border-white/20 group"
                                animate={{ x: 0, y: 0 }}
                                transition={{ duration: 0 }}
                                style={{ 
                                    left: `${img.x}%`, 
                                    top: `${img.y}%`, 
                                    width: `${img.width}px`, 
                                    height: `${img.height}px`,
                                    translateX: '-50%',
                                    translateY: '-50%'
                                }}
                            >
                                <img src={img.src} className="w-full h-full object-cover rounded-lg pointer-events-none" />
                                {draggingId !== img.id && (
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { 
                                            e.preventDefault();
                                            e.stopPropagation(); 
                                            // Prevent deletion if a drag recently ended (accidental click protection)
                                            if (Date.now() - lastDragEndTime < 300) return;
                                            setImageOverlays(prev => prev.filter(i => i.id !== img.id)); 
                                        }} 
                                        className="absolute -top-4 -right-4 bg-brand-red w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50 border-2 border-white"
                                    >
                                        <X size={16} color="white" strokeWidth={3} />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                        {textOverlays.map(to => (
                            <motion.div
                                key={to.id}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                dragConstraints={containerRef}
                                onDragStart={() => setDraggingId(to.id)}
                                onDragEnd={(_, info) => {
                                    setDraggingId(null);
                                    setLastDragEndTime(Date.now());
                                    if (!containerRef.current) return;
                                    const rect = containerRef.current.getBoundingClientRect();
                                    
                                    const deltaX = (info.offset.x / rect.width) * 100;
                                    const deltaY = (info.offset.y / rect.height) * 100;
                                    
                                    setTextOverlays(prev => prev.map(t => t.id === to.id ? { 
                                        ...t, 
                                        x: t.x + deltaX, 
                                        y: t.y + deltaY 
                                    } : t));
                                }}
                                className="absolute pointer-events-auto p-4 cursor-grab active:cursor-grabbing group"
                                animate={{ x: 0, y: 0 }}
                                transition={{ duration: 0 }}
                                style={{ 
                                    left: `${to.x}%`, 
                                    top: `${to.y}%`,
                                    translateX: '-50%',
                                    translateY: '-50%',
                                    color: to.color, 
                                    fontSize: `${to.fontSize}px`, 
                                    fontFamily: to.fontFamily, 
                                    fontWeight: 950, 
                                    fontStyle: 'italic', 
                                    textTransform: 'uppercase', 
                                    textShadow: to.style === 'neon' ? `0 0 20px ${to.color}` : '0 4px 20px rgba(0,0,0,0.85)', 
                                    whiteSpace: 'nowrap' 
                                }}
                            >
                                {to.text}
                                {draggingId !== to.id && (
                                    <button 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { 
                                            e.preventDefault();
                                            e.stopPropagation(); 
                                            if (Date.now() - lastDragEndTime < 300) return;
                                            setTextOverlays(prev => prev.filter(t => t.id !== to.id)); 
                                        }} 
                                        className="absolute -top-2 -right-2 bg-brand-red w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50 border-2 border-white"
                                    >
                                        <X size={12} color="white" strokeWidth={3} />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* EXIT & MUTE CONTROLS (TOP) */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[500] pointer-events-none">
                <button onClick={onCancel} className="p-4 bg-black/40 backdrop-blur-xl rounded-full text-white pointer-events-auto border border-white/10 shadow-2xl active:scale-95 transition-transform"><X size={24} /></button>
                <button onClick={() => setIsMuted(!isMuted)} className="p-4 bg-black/40 backdrop-blur-xl rounded-full text-white pointer-events-auto border border-white/10 shadow-2xl active:scale-95 transition-transform">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </div>

            {/* UI STACK AT THE BOTTOM: TOOLBAR + SAVE BUTTON */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pb-8 flex flex-col items-center gap-8 z-[500] pointer-events-none">
                {/* TOOLS BAR */}
                <div className="flex bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white/10 pointer-events-auto gap-6 shadow-2xl">
                    <NavBtn icon={<Sparkles size={18} />} onClick={() => setActiveTool('filter')} active={activeTool === 'filter'} title="FX" />
                    <NavBtn icon={<Zap size={18} />} onClick={() => setActiveTool('fx')} active={activeTool === 'fx'} title="Visual" />
                    <NavBtn icon={<Scissors size={18} />} onClick={() => setActiveTool('trim')} active={activeTool === 'trim'} title="Cortar" />
                    <NavBtn icon={<MusicIcon size={18} />} onClick={() => setActiveTool('music')} active={activeTool === 'music'} title="Audio" />
                    <NavBtn icon={<Smile size={18} />} onClick={() => setActiveTool('sticker')} active={activeTool === 'sticker'} title="Stickers" />
                    <NavBtn icon={<ImageIcon size={18} />} onClick={() => { setActiveTool('image'); imageInputRef.current?.click(); }} active={activeTool === 'image'} title="Imagen" />
                    <NavBtn icon={<Type size={18} />} onClick={() => setActiveTool('text')} active={activeTool === 'text'} title="Texto" />
                </div>

                {/* BOTÓN GUARDAR - SOLO FLECHA */}
                <button 
                    onClick={handleExport} disabled={isSaving}
                    className="w-16 h-16 bg-white text-black rounded-full shadow-2xl pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
                >
                    {isSaving ? (
                        <Loader2 size={24} className="animate-spin text-brand-red" />
                    ) : (
                        <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                    )}
                </button>
            </div>

            {/* Oculto: Input de Imagen */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* TOOL PANELS */}
            <AnimatePresence>
                {/* TOOL: FX (Efectos Visibles) */}
                {activeTool === 'fx' && (
                    <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 p-12 pb-20 border-t border-white/10 pointer-events-auto">
                        <h3 className="text-[10px] font-black italic uppercase tracking-[0.5em] text-white/50 mb-10 text-center">RIVAL VISUAL FX</h3>
                        <div className="flex gap-8 overflow-x-auto no-scrollbar py-4 px-4">
                            {SPECIAL_FX.map(fx => (
                                <button key={fx.id} onClick={() => setCurrentFX(fx)} className="flex flex-col items-center gap-5 shrink-0">
                                    <div className={clsx("w-22 h-22 rounded-[32px] border-2 transition-all flex items-center justify-center font-black italic text-xl", currentFX.id === fx.id ? "bg-brand-red border-white text-white shadow-glow" : "bg-white/5 border-white/10 text-white/20")}>
                                        {fx.name.charAt(0)}
                                    </div>
                                    <span className={clsx("text-[10px] font-black uppercase tracking-widest transition-colors", currentFX.id === fx.id ? "text-white" : "text-white/30")}>{fx.name}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-full mt-12 py-5 bg-white/5 text-white/40 font-black text-[11px] uppercase tracking-widest rounded-full border border-white/5">LISTO</button>
                    </motion.div>
                )}

                {/* TOOL: MUSIC */}
                {activeTool === 'music' && (
                    <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 p-12 pb-24 border-t border-white/10 pointer-events-auto">
                        <div className="grid grid-cols-1 gap-4 mb-10 overflow-y-auto max-h-[40vh] pr-4">
                            {TRACKS.map(t => (
                                <button key={t.name} onClick={() => setSelectedTrack(t)} className={clsx("flex justify-between items-center p-6 rounded-2xl border transition-all", selectedTrack?.name === t.name ? "bg-brand-red border-brand-red shadow-glow" : "bg-white/5 border-white/10")}>
                                    <span className="text-xs font-black uppercase italic text-white">{t.name}</span>
                                    {selectedTrack?.name === t.name ? <Pause size={18} color="white" /> : <Play size={18} color="white" />}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-full py-5 bg-white text-black rounded-full font-black text-[12px] uppercase">CONFIRMAR MÚSICA</button>
                    </motion.div>
                )}

                {/* TOOL: TRIM */}
                {activeTool === 'trim' && (
                    <motion.div initial={{ y: 250 }} animate={{ y: 0 }} exit={{ y: 250 }} className="absolute bottom-0 left-0 right-0 z-[600] bg-black p-10 pb-16 border-t border-white/10 pointer-events-auto">
                        <div className="flex justify-between items-end mb-8">
                            <span className="text-[10px] font-black italic uppercase tracking-[0.4em] text-white/30">RECORTE REEL</span>
                            <span className="text-2xl font-black italic text-brand-red">{(trimRange.end - trimRange.start).toFixed(1)}s</span>
                        </div>
                        <div className="relative h-24 bg-zinc-900 rounded-2xl overflow-hidden flex border border-white/10">
                            {thumbnails.map((src, i) => <img key={i} src={src} className="flex-1 h-full object-cover opacity-60 grayscale" />)}
                            <div className="absolute inset-x-0 inset-y-0 z-20">
                                <div className="absolute inset-y-0 border-y-4 border-brand-red z-10" style={{ left: `${(trimRange.start / videoDuration) * 100}%`, right: `${100 - (trimRange.end / videoDuration) * 100}%` }}>
                                    <div className="absolute -left-1 top-0 bottom-0 w-3 bg-brand-red rounded shadow-glow" />
                                    <div className="absolute -right-1 top-0 bottom-0 w-3 bg-brand-red rounded shadow-glow" />
                                </div>
                                <input type="range" min="0" max={videoDuration} step="0.1" value={trimRange.start} onChange={(e) => setTrimRange(p => ({ ...p, start: Math.min(parseFloat(e.target.value), p.end - 1) }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                                <input type="range" min="0" max={videoDuration} step="0.1" value={trimRange.end} onChange={(e) => setTrimRange(p => ({ ...p, end: Math.max(parseFloat(e.target.value), p.start + 1) }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                            </div>
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-full mt-10 py-5 bg-white/5 text-white/40 font-black uppercase text-[11px] rounded-full">LISTO</button>
                    </motion.div>
                )}

                {/* TOOL: TEXT */}
                {activeTool === 'text' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-3xl flex flex-col items-center justify-center p-8 pointer-events-auto">
                        <textarea autoFocus value={pendingText} onChange={(e) => setPendingText(e.target.value)} className="bg-transparent text-white text-6xl font-black italic uppercase text-center focus:outline-none w-full max-w-4xl min-h-[150px] resize-none" placeholder="ESCRIBE..." style={{ fontFamily: activeFont.family }} />
                        <div className="flex gap-4 mt-20 overflow-x-auto no-scrollbar max-w-full px-8">
                            {FONTS.map(f => (
                                <button key={f.name} onClick={() => setActiveFont(f)} className={clsx("px-8 py-4 rounded-full border transition-all shrink-0 font-black italic uppercase text-[11px] tracking-widest", activeFont.name === f.name ? "bg-white text-black border-white" : "border-white/10 text-white/40")}>{f.name}</button>
                            ))}
                        </div>
                        <div className="flex gap-10 mt-16">
                            <button onClick={() => { setPendingText(""); setActiveTool('none'); }} className="text-white/30 font-black text-[12px] uppercase tracking-widest">ATRÁS</button>
                            <button onClick={addText} className="bg-white text-black px-16 py-5 rounded-full font-black text-[12px] uppercase shadow-2xl">AÑADIR</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>



            {/* OVERLAY EXPORTACIÓN */}
            <AnimatePresence>
                {isSaving && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black z-[2000000] flex flex-col items-center justify-center gap-16">
                        <div className="relative w-80 h-80">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle className="text-white/5 stroke-current" strokeWidth="1" fill="transparent" r="49" cx="50" cy="50" />
                                <circle className="text-white stroke-current transition-all duration-300 shadow-glow" strokeWidth="2" strokeLinecap="round" fill="transparent" r="49" cx="50" cy="50" style={{ strokeDasharray: 308, strokeDashoffset: 308 - (308 * saveProgress) / 100 }} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-black italic text-white text-9xl tracking-tighter">{Math.round(saveProgress)}%</span>
                                <span className="text-[12px] font-black text-brand-red uppercase tracking-[0.8em] mt-8 animate-pulse">RENDER MASTER</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="hidden">
                <video ref={exportVideoRef} src={videoUrl || undefined} crossOrigin="anonymous" />
                <canvas ref={exportCanvasRef} />
            </div>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .shadow-glow { filter: drop-shadow(0 0 20px rgba(220,38,38,0.6)); }
                input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 50px; height: 100%; cursor: pointer; pointer-events: auto; }
            `}</style>

            {/* STICKER PICKER OVERLAY */}
            <AnimatePresence>
                {activeTool === 'sticker' && (
                    <div className="fixed inset-0 z-[1000] flex items-end justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveTool('none')} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30 }} className="w-full max-w-5xl bg-[#111] rounded-t-[50px] p-10 h-[80vh] relative border-t border-white/5 pointer-events-auto">
                            <EmojiPicker theme={Theme.DARK} width="100%" height="90%" skinTonesDisabled onEmojiClick={addSticker} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
}

function NavBtn({ icon, onClick, active, title }: { icon: React.ReactNode, onClick: () => void, active: boolean, title?: string }) {
    return (
        <button onClick={onClick} className={clsx("flex flex-col items-center gap-2 transition-all", active ? "text-brand-red scale-135" : "text-white/50 hover:text-white/90")}>
            {icon}
            {title && <span className="text-[7px] font-black tracking-widest">{title}</span>}
        </button>
    );
}
