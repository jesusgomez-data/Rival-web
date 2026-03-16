'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { X, Type, Smile, Loader2, Sparkles, ChevronRight, Music as MusicIcon, Scissors, Image as ImageIcon, Volume2, VolumeX, Zap, Play, Pause, SlidersHorizontal, Gauge, UserPlus, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'

interface TextOverlay {
    id: string; text: string; x: number; y: number; fontSize: number;
    color: string; fontFamily: string; style: string; animation: string;
}
interface StickerOverlay { id: string; emoji: string; x: number; y: number; size: number; }
interface ImageOverlay { id: string; src: string; x: number; y: number; width: number; height: number; }
interface TagOverlay { id: string; username: string; fullName: string; avatarUrl: string | null; x: number; y: number; }
interface Adjustments { brightness: number; contrast: number; saturation: number; warmth: number; vignette: number; }

interface UserProfile { id: string; username: string; full_name?: string; avatar_url?: string | null; }

const FILTERS = [
    { name: "Normal",    css: "none" },
    { name: "Clarendon", css: "contrast(1.2) saturate(1.35) brightness(1.1)" },
    { name: "Moon",      css: "grayscale(1) contrast(1.1) brightness(1.16)" },
    { name: "Lark",      css: "contrast(0.9) brightness(1.1) saturate(1.05) hue-rotate(-3deg)" },
    { name: "Juno",      css: "sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.8)" },
    { name: "Crema",     css: "sepia(0.5) contrast(1.1) brightness(1.25) saturate(0.9)" },
    { name: "Ludwig",    css: "sepia(0.25) contrast(1.05) brightness(1.05) saturate(2)" },
    { name: "Aden",      css: "sepia(0.2) contrast(0.85) saturate(0.85) brightness(1.3) hue-rotate(20deg)" },
    { name: "Valencia",  css: "contrast(1.08) brightness(1.08) sepia(0.15) saturate(1.5)" },
    { name: "Reyes",     css: "sepia(0.22) contrast(0.85) brightness(1.1) saturate(0.75)" },
    { name: "Slumber",   css: "sepia(0.35) contrast(1.15) saturate(0.7) brightness(1.05)" },
    { name: "Mayfair",   css: "contrast(1.1) saturate(1.5) brightness(1.05)" },
    { name: "Hudson",    css: "brightness(1.2) contrast(0.9) saturate(1.1) hue-rotate(15deg)" },
    { name: "Lo-Fi",     css: "saturate(1.5) contrast(1.5) hue-rotate(-15deg)" },
    { name: "Inkwell",   css: "grayscale(1) brightness(1.1) contrast(1.1)" },
    { name: "Willow",    css: "grayscale(0.5) contrast(0.95) brightness(0.9) sepia(0.05)" },
    { name: "X-Pro II",  css: "contrast(1.3) saturate(1.3) sepia(0.2) hue-rotate(-20deg)" },
    { name: "RIVAL",     css: "contrast(1.4) saturate(1.6) brightness(0.9) hue-rotate(-5deg) sepia(0.15)" },
]

const SPECIAL_FX = [
    { name: "Ninguno",   id: "none",    filter: "" },
    { name: "Glitch",    id: "glitch",  filter: "contrast(1.5) hue-rotate(90deg) saturate(2)" },
    { name: "Cyber",     id: "cyber",   filter: "hue-rotate(280deg) contrast(1.4) saturate(1.8)" },
    { name: "Golden",    id: "golden",  filter: "sepia(0.6) saturate(1.8) contrast(1.1) brightness(1.1)" },
    { name: "Noir",      id: "noir",    filter: "grayscale(1) contrast(1.8) brightness(0.8)" },
    { name: "Dreamy",    id: "dreamy",  filter: "blur(4px) saturate(1.5) contrast(1.1)" },
    { name: "Vapor",     id: "vapor",   filter: "hue-rotate(120deg) saturate(3) contrast(0.9)" },
    { name: "Fire",      id: "fire",    filter: "sepia(1) saturate(3) hue-rotate(-30deg) contrast(1.2)" },
    { name: "Ice",       id: "ice",     filter: "sepia(0.3) saturate(0.8) hue-rotate(180deg) brightness(1.2)" },
    { name: "Invertido", id: "invert",  filter: "invert(1) hue-rotate(180deg)" },
]

const FONTS = [
    { name: "CLASSIC",    family: "'Outfit', sans-serif",              style: 'classic' },
    { name: "MODERN",     family: "'Inter', sans-serif",               style: 'modern' },
    { name: "NEON",       family: "'Bungee', cursive",                 style: 'neon' },
    { name: "TYPEWRITER", family: "'Courier New', Courier, monospace", style: 'typewriter' },
    { name: "ELITE",      family: "'Montserrat', sans-serif",          style: 'elite' },
    { name: "STRONG",     family: "'Anton', sans-serif",               style: 'strong' },
    { name: "SCRIPT",     family: "'Sacramento', cursive",             style: 'script' },
]

const COLORS = ["#FFFFFF","#000000","#FF4C4C","#FFD700","#32CD32","#1E90FF","#BA55D3","#FF69B4","#FFA500","#40E0D0"]

const TEXT_ANIMATIONS = [
    { id: 'none',      name: 'Ninguna' },
    { id: 'fadeIn',    name: 'Fade' },
    { id: 'slideUp',   name: 'Slide ↑' },
    { id: 'slideLeft', name: 'Slide ←' },
    { id: 'bounce',    name: 'Bounce' },
    { id: 'pulse',     name: 'Pulse' },
    { id: 'zoom',      name: 'Zoom' },
    { id: 'shake',     name: 'Shake' },
]

const SPEEDS = [
    { label: "0.3×", value: 0.3 },
    { label: "0.5×", value: 0.5 },
    { label: "1×",   value: 1 },
    { label: "1.5×", value: 1.5 },
    { label: "2×",   value: 2 },
    { label: "3×",   value: 3 },
]

const TRACKS = [
    // ── DUBSTEP / AGGRESSIVE ELECTRONIC · The Avalune (CC BY 4.0) ──
    { name: "Kinetic Breach",       artist: "The Avalune",  genre: "Dubstep",       url: "https://archive.org/download/avalune-kinetic-aggressive-dubstep-mix-30-min/Kinetic%20Breach.mp3" },
    { name: "Armor Shatter",        artist: "The Avalune",  genre: "Dubstep",       url: "https://archive.org/download/avalune-kinetic-aggressive-dubstep-mix-30-min/Armor%20Shatter.mp3" },
    { name: "Digital Anarchy",      artist: "The Avalune",  genre: "Industrial",    url: "https://archive.org/download/avalune-kinetic-aggressive-dubstep-mix-30-min/Digital%20Anarchy.mp3" },
    { name: "System Implosion",     artist: "The Avalune",  genre: "Heavy EDM",     url: "https://archive.org/download/avalune-kinetic-aggressive-dubstep-mix-30-min/System%20Implosion.mp3" },
    { name: "Dominance Wave",       artist: "The Avalune",  genre: "Dubstep",       url: "https://archive.org/download/avalune-kinetic-aggressive-dubstep-mix-30-min/Dominance%20Wave.mp3" },
    { name: "Pulse Weaponry",       artist: "The Avalune",  genre: "Future Bass",   url: "https://archive.org/download/avalune-kinetic-aggressive-dubstep-mix-30-min/Pulse%20Weaponry.mp3" },
    // ── SYNTHWAVE / HIGH-OCTANE · The Avalune (CC BY 4.0) ──
    { name: "Velocity Surge",       artist: "The Avalune",  genre: "Synthwave",     url: "https://archive.org/download/avalune-blaze-highoctane-synth-mix-30-minute/Velocity%20Surge.mp3" },
    { name: "Chrome Metropolis",    artist: "The Avalune",  genre: "Synthwave",     url: "https://archive.org/download/avalune-blaze-highoctane-synth-mix-30-minute/Chrome%20Metropolis.mp3" },
    { name: "Midnight Pursuit",     artist: "The Avalune",  genre: "Dark Synth",    url: "https://archive.org/download/avalune-blaze-highoctane-synth-mix-30-minute/Midnight%20Pursuit.mp3" },
    { name: "Night Drive Protocol", artist: "The Avalune",  genre: "Synthwave",     url: "https://archive.org/download/avalune-blaze-highoctane-synth-mix-30-minute/Night%20Drive%20Protocol.mp3" },
    { name: "Street Heat",          artist: "The Avalune",  genre: "Outrun",        url: "https://archive.org/download/avalune-velocity-chiptune-outrun-mix-23-minutes/Street%20Heat.mp3" },
    { name: "Electric Streets",     artist: "The Avalune",  genre: "Chiptune",      url: "https://archive.org/download/avalune-velocity-chiptune-outrun-mix-23-minutes/Electric%20Streets.mp3" },
    { name: "Nightfall Pursuit",    artist: "The Avalune",  genre: "Outrun",        url: "https://archive.org/download/avalune-velocity-chiptune-outrun-mix-23-minutes/Nightfall%20Pursuit.mp3" },
    { name: "Urban Circuit",        artist: "The Avalune",  genre: "Electronic",    url: "https://archive.org/download/avalune-velocity-chiptune-outrun-mix-23-minutes/Urban%20Circuit.mp3" },
    // ── METAL / ROCK · Komiku (CC0 — Dominio Público) ──
    { name: "Metal Circuit",        artist: "Komiku",       genre: "Metal",         url: "https://archive.org/download/komiku-incredible-kart-game/Metal%20Circuit.mp3" },
    { name: "Punk Rock Circuit",    artist: "Komiku",       genre: "Punk Rock",     url: "https://archive.org/download/komiku-incredible-kart-game/Punk%20Rock%20Circuit.mp3" },
    { name: "Rock'n Roll Circuit",  artist: "Komiku",       genre: "Rock",          url: "https://archive.org/download/komiku-incredible-kart-game/Rock%27n%20Roll%20Circuit.mp3" },
    { name: "Boss Fight Circuit",   artist: "Komiku",       genre: "Action Rock",   url: "https://archive.org/download/komiku-incredible-kart-game/Boss%20Fight%20Circuit.mp3" },
    // ── HIP-HOP BEAT · Cely Grande (CC0 — Dominio Público) ──
    { name: "Real Man Use Fists",   artist: "Cely Grande",  genre: "Hip-Hop",       url: "https://archive.org/download/CelyGrande-RealManUseFistsdeepUndergroundRapInstrumental/Celygrande-Real_man_use_fists.mp3" },
]

const ASPECT_RATIOS = [
    { label: "9:16",  name: "Vertical",    desc: "TikTok · Reels",      ratio: 9/16  },
    { label: "1:1",   name: "Cuadrado",    desc: "Instagram Feed",       ratio: 1     },
    { label: "4:5",   name: "Portrait",    desc: "Instagram Portrait",   ratio: 4/5   },
    { label: "16:9",  name: "Horizontal",  desc: "YouTube · Landscape",  ratio: 16/9  },
]

interface VideoEditorProps {
    videoFile: File
    onSave: (editedFile: File, duration: number) => void
    onCancel: () => void
}

export default function VideoEditor({ videoFile, onSave, onCancel }: VideoEditorProps) {
    const [videoUrl, setVideoUrl]           = useState<string | null>(null)
    const [currentFilter, setCurrentFilter] = useState(FILTERS[0])
    const [currentFX, setCurrentFX]         = useState(SPECIAL_FX[0])
    const [adjustments, setAdjustments]     = useState<Adjustments>({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0 })
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const [textOverlays, setTextOverlays]   = useState<TextOverlay[]>([])
    const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([])
    const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([])
    const [isSaving, setIsSaving]           = useState(false)
    const [saveProgress, setSaveProgress]   = useState(0)
    const [activeTool, setActiveTool]       = useState<'filter'|'fx'|'adjust'|'speed'|'format'|'text'|'sticker'|'trim'|'image'|'music'|'tag'|'none'>('none')
    const [tagOverlays, setTagOverlays]     = useState<TagOverlay[]>([])
    const [tagSearch, setTagSearch]         = useState('')
    const [tagResults, setTagResults]       = useState<UserProfile[]>([])
    const [tagLoading, setTagLoading]       = useState(false)
    const [videoDuration, setVideoDuration] = useState(0)
    const [currentTime, setCurrentTime]     = useState(0)
    const [trimRange, setTrimRange]         = useState({ start: 0, end: 0 })
    const [thumbnails, setThumbnails]       = useState<string[]>([])
    const [filterFrame, setFilterFrame]     = useState<string | null>(null)
    const [pendingText, setPendingText]     = useState('')
    const [pendingTextAnim, setPendingTextAnim] = useState('none')
    const [activeFont, setActiveFont]       = useState(FONTS[0])
    const [isMuted, setIsMuted]             = useState(true)   // start muted so iOS autoplay works
    const [selectedTrack, setSelectedTrack] = useState<typeof TRACKS[0] | null>(null)
    const [activeTextColor, setActiveTextColor] = useState(COLORS[0])
    const [selectedId, setSelectedId]       = useState<string | null>(null)
    const [mounted, setMounted]             = useState(false)
    const [aspectRatio, setAspectRatio]     = useState(ASPECT_RATIOS[0])
    const [videoScale, setVideoScale]       = useState(1)
    const [videoPan, setVideoPan]           = useState({ x: 0, y: 0 })

    const containerRef    = useRef<HTMLDivElement>(null)
    const videoRef        = useRef<HTMLVideoElement>(null)
    const exportVideoRef  = useRef<HTMLVideoElement>(null)
    const exportCanvasRef = useRef<HTMLCanvasElement>(null)
    const musicRef        = useRef<HTMLAudioElement>(null)
    const imageInputRef   = useRef<HTMLInputElement>(null)
    const audioCtxRef     = useRef<AudioContext | null>(null)
    const videoSourceRef  = useRef<MediaElementAudioSourceNode | null>(null)
    const musicSourceRef  = useRef<MediaElementAudioSourceNode | null>(null)
    const audioDestRef    = useRef<MediaStreamAudioDestinationNode | null>(null)
    // Tracks grab offset so element doesn't jump on drag start
    const dragState       = useRef<{ id: string|null; ox: number; oy: number }>({ id: null, ox: 0, oy: 0 })
    // Trim handle drag state
    const trimBarRef      = useRef<HTMLDivElement>(null)
    const trimDragRef     = useRef<{ handle: 'start' | 'end' | null }>({ handle: null })
    const trimRangeRef    = useRef(trimRange)   // always-current trimRange for event closures
    // Pinch-to-zoom state
    const pinchRef        = useRef<{ dist: number; scale: number; px: number; py: number } | null>(null)
    const panRef          = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)

    const computedFilter = useMemo(() => {
        const adj = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.warmth}deg)`
        const base = currentFilter.css !== 'none' ? currentFilter.css : ''
        const fx   = currentFX.filter
        return [adj, base, fx].filter(Boolean).join(' ') || 'none'
    }, [adjustments, currentFilter, currentFX])

    useEffect(() => {
        setMounted(true)
        const url = URL.createObjectURL(videoFile)
        setVideoUrl(url)
        return () => { 
            URL.revokeObjectURL(url)
            setMounted(false) 
            if (audioCtxRef.current) audioCtxRef.current.close()
        }
    }, [videoFile])

    useEffect(() => {
        if (videoRef.current) videoRef.current.playbackRate = playbackSpeed
    }, [playbackSpeed])

    const captureFilterFrame = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        const canvas = document.createElement('canvas')
        canvas.width = 80; canvas.height = 120
        canvas.getContext('2d')?.drawImage(video, 0, 0, 80, 120)
        setFilterFrame(canvas.toDataURL('image/jpeg', 0.7))
    }, [])

    useEffect(() => {
        if (activeTool === 'filter' || activeTool === 'fx') captureFilterFrame()
    }, [activeTool, captureFilterFrame])

    const generateThumbnails = async (duration: number) => {
        if (!videoUrl || thumbnails.length > 0) return
        const v = document.createElement('video')
        v.src = videoUrl; v.preload = 'metadata'; v.muted = true; v.crossOrigin = 'anonymous'
        await new Promise(r => { v.onloadedmetadata = r })
        const canvas = document.createElement('canvas')
        canvas.width = 60; canvas.height = 100
        const ctx = canvas.getContext('2d')!
        const frames: string[] = []
        for (let i = 0; i < 12; i++) {
            v.currentTime = (i / 12) * duration
            await new Promise(r => { v.onseeked = r })
            ctx.drawImage(v, 0, 0, 60, 100)
            frames.push(canvas.toDataURL('image/jpeg', 0.5))
        }
        setThumbnails(frames)
    }

    useEffect(() => {
        if (videoDuration > 0 && trimRange.end === 0) {
            setTrimRange({ start: 0, end: videoDuration })
            generateThumbnails(videoDuration)
        }
    }, [videoDuration])

    // Force play music when track changes (browser autoplay policy may block it)
    useEffect(() => {
        if (!selectedTrack) {
            musicRef.current?.pause()
            return
        }
        const tryPlay = () => {
            if (musicRef.current) {
                musicRef.current.currentTime = 0
                musicRef.current.play().catch(() => {/* blocked by browser policy */})
            }
        }
        // Small delay to let the audio element mount with the new src
        const t = setTimeout(tryPlay, 100)
        return () => clearTimeout(t)
    }, [selectedTrack])

    useEffect(() => {
        const video = videoRef.current
        if (!video || videoDuration === 0) return
        const checkTime = () => {
            if (video.currentTime >= trimRange.end) {
                video.currentTime = trimRange.start
                if (musicRef.current) musicRef.current.currentTime = 0
            }
            setCurrentTime(video.currentTime)
        }
        video.addEventListener('timeupdate', checkTime)
        return () => video.removeEventListener('timeupdate', checkTime)
    }, [trimRange, videoDuration])

    // Keep trimRangeRef in sync so event handler closures always see current value
    useEffect(() => { trimRangeRef.current = trimRange }, [trimRange])

    // ── Non-passive touch events for trim bar (iOS Safari requires this) ──────
    useEffect(() => {
        const bar = trimBarRef.current
        if (!bar || activeTool !== 'trim' || videoDuration === 0) return

        let activeHandle: 'start' | 'end' | null = null
        let activeTouchId: number | null = null

        const handleTouchStart = (e: TouchEvent) => {
            if (activeTouchId !== null) return
            e.preventDefault()
            const touch = e.changedTouches[0]
            activeTouchId = touch.identifier
            const rect = bar.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
            const { start, end } = trimRangeRef.current
            const distToStart = Math.abs(ratio - start / videoDuration)
            const distToEnd   = Math.abs(ratio - end   / videoDuration)
            activeHandle = distToStart <= distToEnd ? 'start' : 'end'
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (activeHandle === null || activeTouchId === null) return
            e.preventDefault()
            const touch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId)
            if (!touch) return
            const rect = bar.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
            const t = ratio * videoDuration
            if (activeHandle === 'start') {
                setTrimRange(p => ({ ...p, start: Math.max(0, Math.min(t, p.end - 0.5)) }))
            } else {
                setTrimRange(p => ({ ...p, end: Math.min(videoDuration, Math.max(t, p.start + 0.5)) }))
            }
            if (videoRef.current) videoRef.current.currentTime = t
        }

        const handleTouchEnd = (e: TouchEvent) => {
            if (Array.from(e.changedTouches).some(t => t.identifier === activeTouchId)) {
                activeHandle = null; activeTouchId = null
            }
        }

        bar.addEventListener('touchstart',  handleTouchStart,  { passive: false })
        bar.addEventListener('touchmove',   handleTouchMove,   { passive: false })
        bar.addEventListener('touchend',    handleTouchEnd)
        bar.addEventListener('touchcancel', handleTouchEnd)
        return () => {
            bar.removeEventListener('touchstart',  handleTouchStart)
            bar.removeEventListener('touchmove',   handleTouchMove)
            bar.removeEventListener('touchend',    handleTouchEnd)
            bar.removeEventListener('touchcancel', handleTouchEnd)
        }
    }, [activeTool, videoDuration])

    if (!mounted) return null

    const searchUsers = async (query: string) => {
        setTagSearch(query)
        if (!query.trim()) { setTagResults([]); return }
        setTagLoading(true)
        try {
            const supabase = createClient()
            const { data } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(15)
            setTagResults(data || [])
        } catch {
            setTagResults([])
        } finally {
            setTagLoading(false)
        }
    }

    const addTag = (user: UserProfile) => {
        setTagOverlays(prev => [...prev, {
            id: Date.now().toString(),
            username: user.username,
            fullName: user.full_name || user.username,
            avatarUrl: user.avatar_url || null,
            x: 50, y: 50,
        }])
        setTagSearch('')
        setTagResults([])
        setActiveTool('none')
    }

    const addText = () => {
        if (!pendingText.trim()) return
        setTextOverlays(prev => [...prev, {
            id: Date.now().toString(), text: pendingText, x: 50, y: 40,
            fontSize: 48, color: activeTextColor, fontFamily: activeFont.family,
            style: activeFont.style, animation: pendingTextAnim
        }])
        setPendingText(''); setPendingTextAnim('none'); setActiveTool('none')
    }

    const addSticker = (emojiData: EmojiClickData) => {
        setStickerOverlays(prev => [...prev, { id: Date.now().toString(), emoji: emojiData.emoji, x: 50, y: 50, size: 80 }])
        setActiveTool('none')
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setImageOverlays(prev => [...prev, { id: Date.now().toString(), src: url, x: 50, y: 60, width: 180, height: 180 }])
            setActiveTool('none')
        }
    }

    const handleExport = async () => {
        if (!exportCanvasRef.current || !exportVideoRef.current) return
        setIsSaving(true); setSaveProgress(0)

        const durationToRecord = trimRange.end - trimRange.start

        // iOS / Safari fallback: canvas.captureStream not supported → upload original file directly
        const canvas = exportCanvasRef.current
        const captureStreamFn = (canvas as any).captureStream || (canvas as any).webkitCaptureStream
        const MIME_TYPES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
        const supportedMime = typeof MediaRecorder !== 'undefined'
            ? MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || null
            : null

        if (!captureStreamFn || !supportedMime) {
            // No canvas recording support (iOS Safari) — upload original video as-is
            setSaveProgress(100)
            onSave(videoFile, durationToRecord)
            setIsSaving(false)
            return
        }

        try {
            const video = exportVideoRef.current
            const ctx   = canvas.getContext('2d')!
            canvas.width = video.videoWidth; canvas.height = video.videoHeight

            // --- AUDIO MIXING ---
            if (!audioCtxRef.current) {
                const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
                const ctx = new AudioContextClass()
                audioCtxRef.current = ctx
                audioDestRef.current = ctx.createMediaStreamDestination()
            }
            const audioCtx = audioCtxRef.current!
            const dest = audioDestRef.current!
            
            if (!videoSourceRef.current && video) {
                videoSourceRef.current = audioCtx.createMediaElementSource(video)
                videoSourceRef.current.connect(dest)
                videoSourceRef.current.connect(audioCtx.destination) // Connect to speakers so we can hear progress
            }
            
            if (selectedTrack && musicRef.current && !musicSourceRef.current) {
                musicSourceRef.current = audioCtx.createMediaElementSource(musicRef.current)
                musicSourceRef.current.connect(dest)
                musicSourceRef.current.connect(audioCtx.destination)
            }

            const canvasStream = captureStreamFn.call(canvas, 30) as MediaStream
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ])

            const recorder = new MediaRecorder(combinedStream, { mimeType: supportedMime, videoBitsPerSecond: 8000000 })
            const chunks: Blob[] = []
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: supportedMime })
                const ext  = supportedMime.includes('mp4') ? 'mp4' : 'webm'
                onSave(new File([blob], `rival_video.${ext}`, { type: supportedMime }), durationToRecord)
                setIsSaving(false)
            }
            
            recorder.onerror = () => {
                onSave(videoFile, durationToRecord)
                setIsSaving(false)
            }

            video.playbackRate = playbackSpeed
            video.currentTime  = trimRange.start
            video.muted = false // MUST BE UNMUTED for capture
            video.volume = 1.0
            
            if (musicRef.current) {
                musicRef.current.currentTime = 0
                musicRef.current.playbackRate = playbackSpeed
                musicRef.current.volume = 1.0
            }

            await new Promise(r => { video.onseeked = r })
            
            if (audioCtx.state === 'suspended') await audioCtx.resume()
            
            video.play()
            if (musicRef.current) musicRef.current.play()
            
            recorder.start(1000) // Collect data every 1s to prevent memory issues and "stuck" frames

            // Safety timeout: if export takes more than 3× the video duration, abort
            const timeoutId = setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop()
                    video.pause()
                    if (musicRef.current) musicRef.current.pause()
                }
            }, durationToRecord * 3000 + 10000)

            const renderLoop = () => {
                if (video.currentTime >= trimRange.end || video.ended) {
                    clearTimeout(timeoutId)
                    if (recorder.state === 'recording') recorder.stop()
                    video.pause()
                    if (musicRef.current) musicRef.current.pause()
                    return
                }
                setSaveProgress(Math.min(99, Math.round(((video.currentTime - trimRange.start) / durationToRecord) * 100)))
                ctx.filter = computedFilter
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                ctx.filter = 'none'
                if (adjustments.vignette > 0) {
                    const g = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.3, canvas.width/2, canvas.height/2, canvas.height*0.9)
                    g.addColorStop(0, 'rgba(0,0,0,0)')
                    g.addColorStop(1, `rgba(0,0,0,${adjustments.vignette/100})`)
                    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height)
                }
                imageOverlays.forEach(img => {
                    const el = new Image(); el.src = img.src
                    ctx.drawImage(el, (img.x/100)*canvas.width - img.width/2, (img.y/100)*canvas.height - img.height/2, img.width, img.height)
                })
                stickerOverlays.forEach(so => {
                    ctx.save(); ctx.translate((so.x/100)*canvas.width, (so.y/100)*canvas.height)
                    ctx.font = `${so.size*(canvas.height/800)}px Arial`; ctx.textAlign = 'center'
                    ctx.fillText(so.emoji, 0, 0); ctx.restore()
                })
                textOverlays.forEach(to => {
                    ctx.save(); ctx.translate((to.x/100)*canvas.width, (to.y/100)*canvas.height)
                    if (to.style === 'neon') { ctx.shadowColor = to.color; ctx.shadowBlur = 30*(canvas.height/800) }
                    ctx.font = `${to.style === 'script' ? 'normal' : 'italic'} 950 ${to.fontSize*(canvas.height/800)}px ${to.fontFamily}`
                    ctx.textAlign = 'center'; ctx.fillStyle = to.color
                    ctx.fillText(to.style === 'script' ? to.text : to.text.toUpperCase(), 0, 0); ctx.restore()
                })
                tagOverlays.forEach(tag => {
                    const scale = canvas.height / 800
                    const cx = (tag.x/100)*canvas.width
                    const cy = (tag.y/100)*canvas.height
                    const text = `@${tag.username}`
                    const fs = 14 * scale
                    ctx.font = `800 ${fs}px Inter, sans-serif`
                    const tw = ctx.measureText(text).width
                    const pad = 10 * scale
                    const bh = (fs + pad * 2)
                    const bw = tw + pad * 2 + (tag.avatarUrl ? bh + 4*scale : 0)
                    ctx.save()
                    ctx.fillStyle = 'rgba(0,0,0,0.65)'
                    ctx.beginPath()
                    ctx.roundRect(cx - bw/2, cy - bh/2, bw, bh, bh/2)
                    ctx.fill()
                    ctx.fillStyle = '#ffffff'
                    ctx.textAlign = 'right'
                    ctx.fillText(text, cx + bw/2 - pad, cy + fs*0.35)
                    ctx.restore()
                })
                if (recorder.state === 'recording') requestAnimationFrame(renderLoop)
            }
            renderLoop()
        } catch (err) {
            console.error('Video export failed, uploading original:', err)
            onSave(videoFile, durationToRecord)
            setIsSaving(false)
        }
    }

    const clamp = (v: number) => Math.max(2, Math.min(98, v))

    // Called on drag start: records the offset between pointer and element center
    const onOverlayDragStart = (id: string, currentX: number, currentY: number, info: any) => {
        setSelectedId(id)
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const centerXpx = (currentX / 100) * rect.width
        const centerYpx = (currentY / 100) * rect.height
        dragState.current = {
            id,
            ox: info.point.x - rect.left - centerXpx,
            oy: info.point.y - rect.top  - centerYpx,
        }
    }

    // Called every frame during drag: moves element to pointer minus grab offset
    const onOverlayDrag = (id: string, info: any, type: 'text'|'sticker'|'image'|'tag') => {
        if (!containerRef.current || dragState.current.id !== id) return
        const rect = containerRef.current.getBoundingClientRect()
        const xPct = clamp(((info.point.x - rect.left - dragState.current.ox) / rect.width)  * 100)
        const yPct = clamp(((info.point.y - rect.top  - dragState.current.oy) / rect.height) * 100)
        if (type === 'text')    setTextOverlays(p    => p.map(t => t.id === id ? { ...t, x: xPct, y: yPct } : t))
        if (type === 'sticker') setStickerOverlays(p => p.map(s => s.id === id ? { ...s, x: xPct, y: yPct } : s))
        if (type === 'image')   setImageOverlays(p   => p.map(i => i.id === id ? { ...i, x: xPct, y: yPct } : i))
        if (type === 'tag')     setTagOverlays(p     => p.map(t => t.id === id ? { ...t, x: xPct, y: yPct } : t))
    }

    // ── Trim handles ──────────────────────────────────────────────────────────
    const onTrimHandleDown = (e: React.PointerEvent, handle: 'start' | 'end') => {
        e.stopPropagation()
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        trimDragRef.current.handle = handle
    }
    const onTrimHandleMove = (e: React.PointerEvent, handle: 'start' | 'end') => {
        if (trimDragRef.current.handle !== handle || !trimBarRef.current) return
        const rect = trimBarRef.current.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const t = ratio * videoDuration
        if (handle === 'start') {
            setTrimRange(p => ({ ...p, start: Math.max(0, Math.min(t, p.end - 0.5)) }))
            if (videoRef.current) videoRef.current.currentTime = t
        } else {
            setTrimRange(p => ({ ...p, end: Math.min(videoDuration, Math.max(t, p.start + 0.5)) }))
            if (videoRef.current) videoRef.current.currentTime = t
        }
    }
    const onTrimHandleUp = () => { trimDragRef.current.handle = null }

    // ── Pinch-to-zoom & pan ───────────────────────────────────────────────────
    const getPinchDist = (t: React.TouchList) =>
        Math.sqrt((t[0].clientX - t[1].clientX) ** 2 + (t[0].clientY - t[1].clientY) ** 2)

    const onVideoTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault()
            pinchRef.current = { dist: getPinchDist(e.touches), scale: videoScale, px: videoPan.x, py: videoPan.y }
            panRef.current = null
        } else if (e.touches.length === 1 && videoScale > 1) {
            panRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, px: videoPan.x, py: videoPan.y }
        }
    }
    const onVideoTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current) {
            e.preventDefault()
            const scale = Math.max(1, Math.min(4, pinchRef.current.scale * (getPinchDist(e.touches) / pinchRef.current.dist)))
            setVideoScale(scale)
        } else if (e.touches.length === 1 && panRef.current && videoScale > 1) {
            const dx = e.touches[0].clientX - panRef.current.sx
            const dy = e.touches[0].clientY - panRef.current.sy
            setVideoPan({ x: panRef.current.px + dx, y: panRef.current.py + dy })
        }
    }
    const onVideoTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) pinchRef.current = null
        if (e.touches.length === 0) { panRef.current = null; if (videoScale <= 1) setVideoPan({ x: 0, y: 0 }) }
    }

    return createPortal(
        <div className="fixed inset-0 z-[1000000] bg-black overflow-hidden select-none touch-none w-screen h-[100dvh] flex flex-col items-center justify-center">

            {/* Desktop ambient blur */}
            <div className="absolute inset-0 z-0 opacity-40 scale-110 blur-3xl pointer-events-none hidden md:block">
                <video src={videoUrl||undefined} className="w-full h-full object-cover" style={{ filter: computedFilter }} playsInline loop autoPlay muted />
            </div>

            {/* Phone-sized container */}
            <div className="relative w-full h-full md:w-[min(480px,95vw)] md:h-[min(850px,90vh)] md:rounded-[40px] md:border-[10px] md:border-white/10 md:shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden bg-black flex items-center justify-center z-10">
                {/* Aspect ratio crop frame — black bars simulate the final output */}
                <div ref={containerRef} className="relative overflow-hidden flex items-center justify-center bg-black"
                    style={{ width:'100%', height:'100%', maxWidth: aspectRatio.ratio < 1 ? `${aspectRatio.ratio * 100}vh` : '100%', maxHeight: aspectRatio.ratio > 1 ? `${(1/aspectRatio.ratio) * 100}vw` : '100%' }}
                    onTouchStart={onVideoTouchStart}
                    onTouchMove={onVideoTouchMove}
                    onTouchEnd={onVideoTouchEnd}
                >
                    <video
                        ref={videoRef} src={videoUrl||undefined}
                        className="w-full h-full object-cover"
                        style={{ filter: computedFilter, transform: `scale(${videoScale}) translate(${videoPan.x / videoScale}px, ${videoPan.y / videoScale}px)`, transformOrigin: 'center center', willChange: 'transform' }}
                        playsInline loop autoPlay muted={isMuted}
                        onLoadedMetadata={e => setVideoDuration(e.currentTarget.duration)}
                    />

                    {/* Vignette */}
                    {adjustments.vignette > 0 && (
                        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${adjustments.vignette/100}) 100%)` }} />
                    )}

                    {selectedTrack && <audio ref={musicRef} src={selectedTrack.url} loop autoPlay />}

                    {/* Overlay layer */}
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <AnimatePresence>
                            {imageOverlays.map(img => (
                                <motion.div key={img.id} drag dragMomentum={false} dragElastic={0}
                                    dragConstraints={{ left:0, right:0, top:0, bottom:0 }}
                                    onDragStart={(_, info) => onOverlayDragStart(img.id, img.x, img.y, info)}
                                    onDrag={(_, info) => onOverlayDrag(img.id, info, 'image')}
                                    onClick={() => setSelectedId(img.id)}
                                    className={clsx("absolute pointer-events-auto cursor-grab active:cursor-grabbing rounded-xl border-2 transition-colors overflow-visible", selectedId===img.id ? "border-brand-red" : "border-white/20")}
                                    style={{ left:`${img.x}%`, top:`${img.y}%`, width:`${img.width}px`, height:`${img.height}px`, translateX:'-50%', translateY:'-50%' }}
                                >
                                    <img src={img.src} className="w-full h-full object-cover rounded-lg pointer-events-none" />
                                    {selectedId===img.id && <DeleteBtn onClick={e => { e.stopPropagation(); setImageOverlays(p=>p.filter(i=>i.id!==img.id)); setSelectedId(null) }} />}
                                </motion.div>
                            ))}

                            {textOverlays.map(to => (
                                <motion.div key={to.id} drag dragMomentum={false} dragElastic={0}
                                    dragConstraints={{ left:0, right:0, top:0, bottom:0 }}
                                    onDragStart={(_, info) => onOverlayDragStart(to.id, to.x, to.y, info)}
                                    onDrag={(_, info) => onOverlayDrag(to.id, info, 'text')}
                                    onClick={() => setSelectedId(to.id)}
                                    className={clsx("absolute pointer-events-auto p-4 cursor-grab active:cursor-grabbing overflow-visible", selectedId===to.id && "ring-2 ring-brand-red ring-offset-2 ring-offset-black/50 rounded-lg", to.animation !== 'none' && `ve-anim-${to.animation}`)}
                                    style={{ left:`${to.x}%`, top:`${to.y}%`, translateX:'-50%', translateY:'-50%', color:to.color, fontSize:`${to.fontSize}px`, fontFamily:to.fontFamily, fontWeight:950, fontStyle:to.style==='script'?'normal':'italic', textTransform:to.style==='script'?'none':'uppercase', textShadow:to.style==='neon'?`0 0 30px ${to.color}, 0 0 10px ${to.color}`:'0 4px 20px rgba(0,0,0,0.85)', whiteSpace:'nowrap' }}
                                >
                                    {to.text}
                                    {selectedId===to.id && <DeleteBtn small onClick={e => { e.stopPropagation(); setTextOverlays(p=>p.filter(t=>t.id!==to.id)); setSelectedId(null) }} />}
                                </motion.div>
                            ))}

                            {stickerOverlays.map(so => (
                                <motion.div key={so.id} drag dragMomentum={false} dragElastic={0}
                                    dragConstraints={{ left:0, right:0, top:0, bottom:0 }}
                                    onDragStart={(_, info) => onOverlayDragStart(so.id, so.x, so.y, info)}
                                    onDrag={(_, info) => onOverlayDrag(so.id, info, 'sticker')}
                                    onClick={() => setSelectedId(so.id)}
                                    className="absolute pointer-events-auto cursor-grab active:cursor-grabbing overflow-visible"
                                    style={{ left:`${so.x}%`, top:`${so.y}%`, translateX:'-50%', translateY:'-50%' }}
                                >
                                    <span style={{ fontSize:`${so.size}px`, lineHeight:1 }}>{so.emoji}</span>
                                    {selectedId===so.id && <DeleteBtn onClick={e => { e.stopPropagation(); setStickerOverlays(p=>p.filter(s=>s.id!==so.id)); setSelectedId(null) }} />}
                                </motion.div>
                            ))}

                            {tagOverlays.map(tag => (
                                <motion.div key={tag.id} drag dragMomentum={false} dragElastic={0}
                                    dragConstraints={{ left:0, right:0, top:0, bottom:0 }}
                                    onDragStart={(_, info) => onOverlayDragStart(tag.id, tag.x, tag.y, info)}
                                    onDrag={(_, info) => onOverlayDrag(tag.id, info, 'tag')}
                                    onClick={() => setSelectedId(tag.id)}
                                    className="absolute pointer-events-auto cursor-grab active:cursor-grabbing overflow-visible"
                                    style={{ left:`${tag.x}%`, top:`${tag.y}%`, translateX:'-50%', translateY:'-50%' }}
                                >
                                    <div className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all",
                                        selectedId===tag.id ? "border-brand-red shadow-glow" : "border-white/30"
                                    )} style={{ background: 'rgba(0,0,0,0.65)', whiteSpace:'nowrap' }}>
                                        {tag.avatarUrl
                                            ? <img src={tag.avatarUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                            : <div className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0 text-[9px] font-black text-white">{tag.username[0]?.toUpperCase()}</div>
                                        }
                                        <span style={{ color:'#fff', fontSize:'12px', fontWeight:800, letterSpacing:'0.02em' }}>@{tag.username}</span>
                                    </div>
                                    {selectedId===tag.id && <DeleteBtn small onClick={e => { e.stopPropagation(); setTagOverlays(p=>p.filter(t=>t.id!==tag.id)); setSelectedId(null) }} />}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-[500] pointer-events-none">
                    <button onClick={onCancel} className="p-4 bg-black/40 backdrop-blur-xl rounded-full text-white pointer-events-auto border border-white/10 shadow-2xl active:scale-95 transition-transform"><X size={20}/></button>
                    <div className="flex gap-2 pointer-events-auto items-center">
                        {aspectRatio.label !== '9:16' && <span className="px-3 py-1.5 bg-black/60 text-white/70 text-[10px] font-black rounded-full border border-white/10">{aspectRatio.label}</span>}
                        {playbackSpeed !== 1 && <span className="px-3 py-1.5 bg-brand-red/90 text-white text-[10px] font-black rounded-full">{playbackSpeed}×</span>}
                        <button onClick={() => setIsMuted(!isMuted)} className="p-4 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/10 shadow-2xl active:scale-95 transition-transform">
                            {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                        </button>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 p-5 pb-10 flex flex-col items-center gap-5 z-[500] pointer-events-none">
                    <div className="flex bg-black/60 backdrop-blur-2xl px-4 py-3 rounded-2xl border border-white/10 pointer-events-auto gap-4 shadow-2xl overflow-x-auto no-scrollbar max-w-full">
                        <NavBtn icon={<Sparkles size={17}/>}        onClick={() => setActiveTool('filter')} active={activeTool==='filter'} title="Filtros" />
                        <NavBtn icon={<Zap size={17}/>}             onClick={() => setActiveTool('fx')}     active={activeTool==='fx'}     title="Efectos" />
                        <NavBtn icon={<SlidersHorizontal size={17}/>} onClick={() => setActiveTool('adjust')} active={activeTool==='adjust'} title="Ajustar" />
                        <NavBtn icon={<Gauge size={17}/>}           onClick={() => setActiveTool('speed')}  active={activeTool==='speed'}  title="Velocidad" />
                        <NavBtn icon={<span className="text-[11px] font-black leading-none">9:16</span>} onClick={() => setActiveTool('format')} active={activeTool==='format'} title="Formato" />
                        <NavBtn icon={<Scissors size={17}/>}        onClick={() => setActiveTool('trim')}   active={activeTool==='trim'}   title="Cortar" />
                        <NavBtn icon={<MusicIcon size={17}/>}       onClick={() => setActiveTool('music')}  active={activeTool==='music'}  title="Música" />
                        <NavBtn icon={<Smile size={17}/>}           onClick={() => setActiveTool('sticker')} active={activeTool==='sticker'} title="Stickers" />
                        <NavBtn icon={<ImageIcon size={17}/>}       onClick={() => { setActiveTool('image'); imageInputRef.current?.click() }} active={activeTool==='image'} title="Imagen" />
                        <NavBtn icon={<Type size={17}/>}            onClick={() => setActiveTool('text')}   active={activeTool==='text'}   title="Texto" />
                        <NavBtn icon={<UserPlus size={17}/>}        onClick={() => { setActiveTool('tag'); setTagSearch(''); setTagResults([]) }} active={activeTool==='tag'} title="Etiquetar" />
                    </div>
                    <button onClick={handleExport} disabled={isSaving}
                        className="w-14 h-14 bg-white text-black rounded-full shadow-2xl pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
                    >
                        {isSaving ? <Loader2 size={24} className="animate-spin text-brand-red"/> : <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform"/>}
                    </button>
                </div>
            </div>

            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* ── PANELS ── */}
            <AnimatePresence>

                {/* FILTERS */}
                {activeTool === 'filter' && (
                    <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 pt-5 pb-20 border-t border-white/10 pointer-events-auto">
                        <p className="text-[9px] font-black italic uppercase tracking-[0.5em] text-white/30 mb-4 text-center">FILTROS</p>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-5">
                            {FILTERS.map(f => (
                                <button key={f.name} onClick={() => setCurrentFilter(f)} className="flex flex-col items-center gap-2 shrink-0">
                                    <div className={clsx("w-14 h-20 rounded-2xl overflow-hidden border-2 transition-all", currentFilter.name===f.name ? "border-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.25)]" : "border-transparent opacity-70")}>
                                        {filterFrame
                                            ? <img src={filterFrame} className="w-full h-full object-cover" style={{ filter: f.css }}/>
                                            : <div className="w-full h-full bg-white/10 flex items-center justify-center font-black text-white/30">{f.name[0]}</div>
                                        }
                                    </div>
                                    <span className={clsx("text-[8px] font-black uppercase tracking-widest", currentFilter.name===f.name ? "text-white" : "text-white/30")}>{f.name}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-[calc(100%-40px)] mx-5 mt-4 py-4 bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest rounded-full border border-white/5">LISTO</button>
                    </motion.div>
                )}

                {/* FX */}
                {activeTool === 'fx' && (
                    <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 pt-5 pb-20 border-t border-white/10 pointer-events-auto">
                        <p className="text-[9px] font-black italic uppercase tracking-[0.5em] text-white/30 mb-4 text-center">EFECTOS ESPECIALES</p>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-5">
                            {SPECIAL_FX.map(fx => (
                                <button key={fx.id} onClick={() => setCurrentFX(fx)} className="flex flex-col items-center gap-2 shrink-0">
                                    <div className={clsx("w-14 h-20 rounded-2xl overflow-hidden border-2 transition-all", currentFX.id===fx.id ? "border-brand-red scale-105 shadow-glow" : "border-transparent opacity-70")}>
                                        {filterFrame
                                            ? <img src={filterFrame} className="w-full h-full object-cover" style={{ filter: fx.filter||'none' }}/>
                                            : <div className="w-full h-full bg-white/10 flex items-center justify-center font-black italic text-white/30">{fx.name[0]}</div>
                                        }
                                    </div>
                                    <span className={clsx("text-[8px] font-black uppercase tracking-widest", currentFX.id===fx.id ? "text-brand-red" : "text-white/30")}>{fx.name}</span>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-[calc(100%-40px)] mx-5 mt-4 py-4 bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest rounded-full border border-white/5">LISTO</button>
                    </motion.div>
                )}

                {/* ADJUSTMENTS */}
                {activeTool === 'adjust' && (
                    <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 pt-5 pb-20 border-t border-white/10 pointer-events-auto px-5">
                        <p className="text-[9px] font-black italic uppercase tracking-[0.5em] text-white/30 mb-5 text-center">AJUSTES</p>
                        <div className="space-y-4">
                            {([
                                { label:'Brillo',      key:'brightness', min:50,  max:150, def:100 },
                                { label:'Contraste',   key:'contrast',   min:50,  max:200, def:100 },
                                { label:'Saturación',  key:'saturation', min:0,   max:200, def:100 },
                                { label:'Temperatura', key:'warmth',     min:-50, max:50,  def:0   },
                                { label:'Viñeta',      key:'vignette',   min:0,   max:100, def:0   },
                            ] as const).map(({ label, key, min, max, def }) => (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="text-[9px] font-black uppercase text-white/40 w-24 shrink-0">{label}</span>
                                    <input type="range" min={min} max={max} step={1}
                                        value={adjustments[key]}
                                        onChange={e => setAdjustments(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                                        className="flex-1 accent-brand-red h-1 cursor-pointer"
                                    />
                                    <button onClick={() => setAdjustments(p => ({ ...p, [key]: def }))} className="text-[10px] text-white/20 hover:text-white/60 w-6 shrink-0 transition-colors">↺</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-full mt-6 py-4 bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest rounded-full border border-white/5">LISTO</button>
                    </motion.div>
                )}

                {/* SPEED */}
                {activeTool === 'speed' && (
                    <motion.div initial={{y:250}} animate={{y:0}} exit={{y:250}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 pt-5 pb-20 border-t border-white/10 pointer-events-auto px-5">
                        <p className="text-[9px] font-black italic uppercase tracking-[0.5em] text-white/30 mb-5 text-center">VELOCIDAD</p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            {SPEEDS.map(s => (
                                <button key={s.value} onClick={() => { setPlaybackSpeed(s.value); if (videoRef.current) videoRef.current.playbackRate = s.value }}
                                    className={clsx("px-5 py-4 rounded-2xl font-black text-sm transition-all border", playbackSpeed===s.value ? "bg-brand-red border-brand-red text-white shadow-glow scale-110" : "bg-white/5 border-white/10 text-white/50 hover:text-white")}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[9px] text-white/20 text-center mt-3 font-bold uppercase tracking-widest">
                            {playbackSpeed < 1 ? '⏪ Cámara lenta' : playbackSpeed > 1 ? '⏩ Cámara rápida' : '▶ Normal'}
                        </p>
                        <button onClick={() => setActiveTool('none')} className="w-full mt-5 py-4 bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest rounded-full border border-white/5">LISTO</button>
                    </motion.div>
                )}

                {/* FORMAT */}
                {activeTool === 'format' && (
                    <motion.div initial={{y:250}} animate={{y:0}} exit={{y:250}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 pt-5 pb-20 border-t border-white/10 pointer-events-auto px-5">
                        <p className="text-[9px] font-black italic uppercase tracking-[0.5em] text-white/30 mb-5 text-center">FORMATO DEL VIDEO</p>
                        <div className="grid grid-cols-2 gap-3">
                            {ASPECT_RATIOS.map(ar => (
                                <button key={ar.label} onClick={() => setAspectRatio(ar)}
                                    className={clsx("flex items-center gap-4 p-4 rounded-2xl border transition-all", aspectRatio.label===ar.label ? "bg-brand-red/20 border-brand-red" : "bg-white/5 border-white/10")}
                                >
                                    {/* Mini visual preview of ratio */}
                                    <div className="shrink-0 flex items-center justify-center w-10 h-10">
                                        <div className={clsx("bg-white/20 rounded-sm border-2", aspectRatio.label===ar.label ? "border-brand-red" : "border-white/30")}
                                            style={{ width: ar.ratio >= 1 ? 36 : Math.round(36*ar.ratio), height: ar.ratio >= 1 ? Math.round(36/ar.ratio) : 36 }}
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className={clsx("font-black text-sm", aspectRatio.label===ar.label ? "text-brand-red" : "text-white")}>{ar.label} — {ar.name}</p>
                                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{ar.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-full mt-5 py-4 bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest rounded-full border border-white/5">LISTO</button>
                    </motion.div>
                )}

                {/* TRIM */}
                {activeTool === 'trim' && (
                    <motion.div initial={{y:250}} animate={{y:0}} exit={{y:250}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black pt-5 pb-16 border-t border-white/10 pointer-events-auto px-5">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-[9px] font-black italic uppercase tracking-[0.4em] text-white/30">RECORTE</span>
                            <span className="text-2xl font-black italic text-brand-red">{(trimRange.end - trimRange.start).toFixed(1)}s</span>
                        </div>
                        {/* Trim bar — touch events managed via non-passive useEffect */}
                        {videoDuration === 0 ? (
                            <div className="h-20 bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center">
                                <span className="text-white/30 text-[10px] font-black uppercase tracking-widest animate-pulse">Cargando video...</span>
                            </div>
                        ) : (
                        <div ref={trimBarRef} className="relative h-20 bg-zinc-900 rounded-2xl overflow-visible flex border border-white/10 touch-none select-none">
                            {/* Thumbnails */}
                            {thumbnails.map((src, i) => <img key={i} src={src} className="flex-1 h-full object-cover opacity-60 grayscale rounded-2xl" alt=""/>)}
                            {/* Dimmed region — before start */}
                            <div className="absolute inset-y-0 left-0 bg-black/60 z-10 rounded-l-2xl pointer-events-none"
                                style={{ width: `${(trimRange.start / videoDuration) * 100}%` }}/>
                            {/* Dimmed region — after end */}
                            <div className="absolute inset-y-0 right-0 bg-black/60 z-10 rounded-r-2xl pointer-events-none"
                                style={{ width: `${(1 - trimRange.end / videoDuration) * 100}%` }}/>
                            {/* Active selection border */}
                            <div className="absolute inset-y-0 border-y-4 border-brand-red z-20 pointer-events-none"
                                style={{ left: `${(trimRange.start / videoDuration) * 100}%`, right: `${(1 - trimRange.end / videoDuration) * 100}%` }}/>
                            {/* Playhead */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-white/70 z-20 pointer-events-none"
                                style={{ left: `${(currentTime / videoDuration) * 100}%` }}/>
                            {/* Left handle — visual only; touch handled by useEffect */}
                            <div className="absolute inset-y-0 w-8 bg-brand-red z-30 flex items-center justify-center rounded-l-xl pointer-events-none"
                                style={{ left: `${(trimRange.start / videoDuration) * 100}%`, transform: 'translateX(-50%)' }}>
                                <div className="flex gap-0.5">
                                    <div className="w-0.5 h-5 bg-white/70 rounded-full"/>
                                    <div className="w-0.5 h-5 bg-white/70 rounded-full"/>
                                </div>
                            </div>
                            {/* Right handle — visual only; touch handled by useEffect */}
                            <div className="absolute inset-y-0 w-8 bg-brand-red z-30 flex items-center justify-center rounded-r-xl pointer-events-none"
                                style={{ right: `${(1 - trimRange.end / videoDuration) * 100}%`, transform: 'translateX(50%)' }}>
                                <div className="flex gap-0.5">
                                    <div className="w-0.5 h-5 bg-white/70 rounded-full"/>
                                    <div className="w-0.5 h-5 bg-white/70 rounded-full"/>
                                </div>
                            </div>
                        </div>
                        )}
                        <div className="flex justify-between mt-2 px-1">
                            <span className="text-[9px] text-white/30 font-bold">{trimRange.start.toFixed(1)}s</span>
                            <span className="text-[9px] text-white/30 font-bold">{trimRange.end.toFixed(1)}s</span>
                        </div>
                        <button onClick={() => setActiveTool('none')} className="w-full mt-4 py-4 bg-white/5 text-white/40 font-black uppercase text-[10px] rounded-full">LISTO</button>
                    </motion.div>
                )}

                {/* MUSIC */}
                {activeTool === 'music' && (
                    <motion.div initial={{y:300}} animate={{y:0}} exit={{y:300}} className="absolute bottom-0 left-0 right-0 z-[600] bg-black/95 pt-5 pb-24 border-t border-white/10 pointer-events-auto px-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[9px] font-black italic uppercase tracking-[0.5em] text-white/30">MÚSICA · {TRACKS.length} TRACKS</p>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-2 py-1 rounded-full">Royalty-Free</span>
                        </div>
                        <div className="grid gap-2 mb-5 overflow-y-auto max-h-[40vh] pr-1">
                            {/* Group by artist */}
                            {Array.from(new Set(TRACKS.map(t => t.artist))).map(artist => (
                                <div key={artist}>
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-1.5 mt-1">{artist}</p>
                                    {TRACKS.filter(t => t.artist === artist).map(t => (
                                        <button key={t.name} onClick={() => setSelectedTrack(selectedTrack?.name===t.name ? null : t)}
                                            className={clsx("w-full flex items-center gap-3 p-3 rounded-xl border transition-all mb-1.5", selectedTrack?.name===t.name ? "bg-brand-red/20 border-brand-red" : "bg-white/5 border-white/5 hover:border-white/20")}
                                        >
                                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all", selectedTrack?.name===t.name ? "bg-brand-red" : "bg-white/10")}>
                                                {selectedTrack?.name===t.name ? <Pause size={13} color="white"/> : <Play size={13} color="white"/>}
                                            </div>
                                            <div className="text-left min-w-0 flex-1">
                                                <p className={clsx("text-xs font-black uppercase italic truncate", selectedTrack?.name===t.name ? "text-white" : "text-white/70")}>{t.name}</p>
                                                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{t.genre}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                        {selectedTrack && (
                            <div className="mb-3 px-3 py-2 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse shrink-0"/>
                                <p className="text-[10px] font-black text-brand-red truncate flex-1">{selectedTrack.name} · {selectedTrack.artist}</p>
                                <button onClick={() => setSelectedTrack(null)} className="text-white/30 hover:text-white shrink-0"><X size={12}/></button>
                            </div>
                        )}
                        <button onClick={() => setActiveTool('none')} className="w-full py-4 bg-white text-black rounded-full font-black text-[11px] uppercase">CONFIRMAR</button>
                        <p className="text-center text-[8px] text-white/15 font-bold mt-2">CC0 / CC BY 4.0 · Uso comercial permitido</p>
                    </motion.div>
                )}

                {/* TEXT */}
                {activeTool === 'text' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 pointer-events-auto">
                        <textarea autoFocus value={pendingText} onChange={e => setPendingText(e.target.value)}
                            className="bg-transparent text-white text-5xl font-black italic uppercase text-center focus:outline-none w-full max-w-4xl min-h-[100px] resize-none"
                            placeholder="ESCRIBE..."
                            style={{ fontFamily: activeFont.family, color: activeTextColor, textShadow: activeFont.style==='neon' ? `0 0 30px ${activeTextColor}` : 'none' }}
                        />
                        <div className="flex gap-3 mt-8 overflow-x-auto no-scrollbar max-w-full px-4 py-1">
                            {COLORS.map(c => <button key={c} onClick={() => setActiveTextColor(c)} className={clsx("w-9 h-9 rounded-full border-2 transition-all shrink-0", activeTextColor===c ? "border-white scale-125" : "border-white/20")} style={{ backgroundColor: c }}/>)}
                        </div>
                        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar max-w-full px-4">
                            {FONTS.map(f => <button key={f.name} onClick={() => setActiveFont(f)} className={clsx("px-4 py-2 rounded-full border transition-all shrink-0 font-black italic uppercase text-[8px] tracking-widest", activeFont.name===f.name ? "bg-white text-black border-white" : "border-white/10 text-white/40")}>{f.name}</button>)}
                        </div>
                        <div className="mt-4 w-full max-w-sm">
                            <p className="text-[8px] font-black uppercase text-white/25 tracking-widest mb-2 text-center">ANIMACIÓN</p>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
                                {TEXT_ANIMATIONS.map(a => (
                                    <button key={a.id} onClick={() => setPendingTextAnim(a.id)} className={clsx("px-3 py-2 rounded-full border text-[8px] font-black uppercase tracking-widest shrink-0 transition-all", pendingTextAnim===a.id ? "bg-brand-red border-brand-red text-white" : "border-white/10 text-white/30")}>{a.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-8 mt-8">
                            <button onClick={() => { setPendingText(''); setActiveTool('none') }} className="text-white/30 font-black text-[10px] uppercase tracking-widest">ATRÁS</button>
                            <button onClick={addText} className="bg-white text-black px-10 py-4 rounded-full font-black text-[10px] uppercase shadow-2xl">AÑADIR</button>
                        </div>
                    </motion.div>
                )}

                {/* TAG PEOPLE */}
                {activeTool === 'tag' && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-3xl flex flex-col pointer-events-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-14 pb-4 border-b border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">ETIQUETAR PERSONAS</p>
                            <button onClick={() => setActiveTool('none')} className="p-2 bg-white/10 rounded-full text-white"><X size={18}/></button>
                        </div>

                        {/* Search bar */}
                        <div className="px-5 pt-4 pb-3">
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                <Search size={16} className="text-white/30 shrink-0"/>
                                <input
                                    autoFocus
                                    type="text"
                                    value={tagSearch}
                                    onChange={e => searchUsers(e.target.value)}
                                    placeholder="Buscar por nombre o @usuario..."
                                    className="bg-transparent text-white text-sm w-full outline-none placeholder:text-white/20"
                                />
                                {tagLoading && <Loader2 size={14} className="animate-spin text-brand-red shrink-0"/>}
                            </div>
                        </div>

                        {/* Already tagged */}
                        {tagOverlays.length > 0 && tagSearch === '' && (
                            <div className="px-5 pb-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-2">YA ETIQUETADOS</p>
                                <div className="flex flex-wrap gap-2">
                                    {tagOverlays.map(tag => (
                                        <div key={tag.id} className="flex items-center gap-1.5 bg-brand-red/20 border border-brand-red/40 rounded-full px-3 py-1.5">
                                            <span className="text-brand-red text-[11px] font-black">@{tag.username}</span>
                                            <button onClick={() => setTagOverlays(p => p.filter(t => t.id !== tag.id))}>
                                                <X size={10} className="text-brand-red/60 hover:text-brand-red"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto px-5 pb-10">
                            {tagResults.length === 0 && tagSearch !== '' && !tagLoading && (
                                <p className="text-center text-white/20 text-xs font-bold uppercase tracking-widest mt-10">Sin resultados</p>
                            )}
                            {tagResults.length === 0 && tagSearch === '' && (
                                <p className="text-center text-white/15 text-[10px] font-bold uppercase tracking-widest mt-10">Escribe para buscar atletas</p>
                            )}
                            <div className="space-y-2 mt-2">
                                {tagResults.map(user => {
                                    const already = tagOverlays.some(t => t.username === user.username)
                                    return (
                                        <button key={user.id} onClick={() => !already && addTag(user)} disabled={already}
                                            className={clsx("w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left", already ? "bg-brand-red/10 border-brand-red/30 opacity-60" : "bg-white/5 border-white/10 hover:border-white/30 active:scale-[0.98]")}
                                        >
                                            {user.avatar_url
                                                ? <img src={user.avatar_url} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-white/10"/>
                                                : <div className="w-11 h-11 rounded-full bg-brand-red flex items-center justify-center flex-shrink-0 text-white font-black text-lg">{user.username[0]?.toUpperCase()}</div>
                                            }
                                            <div className="min-w-0">
                                                <p className="text-white font-black text-sm truncate">{user.full_name || user.username}</p>
                                                <p className="text-white/40 text-[11px] font-bold">@{user.username}</p>
                                            </div>
                                            {already
                                                ? <span className="ml-auto text-brand-red text-[9px] font-black uppercase tracking-widest shrink-0">Añadido</span>
                                                : <UserPlus size={16} className="ml-auto text-white/30 shrink-0"/>
                                            }
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Saving overlay */}
            <AnimatePresence>
                {isSaving && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="fixed inset-0 bg-black z-[2000000] flex flex-col items-center justify-center gap-12">
                        <div className="relative w-64 h-64">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle className="text-white/5 stroke-current" strokeWidth="2" fill="transparent" r="48" cx="50" cy="50"/>
                                <circle className="text-white stroke-current transition-all duration-200" strokeWidth="3" strokeLinecap="round" fill="transparent" r="48" cx="50" cy="50" style={{ strokeDasharray:301, strokeDashoffset: 301-(301*saveProgress/100) }}/>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-black italic text-white text-7xl tracking-tighter">{Math.round(saveProgress)}%</span>
                                <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.8em] mt-4 animate-pulse">RENDER MASTER</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticker picker */}
            <AnimatePresence>
                {activeTool === 'sticker' && (
                    <div className="fixed inset-0 z-[1000] flex items-end justify-center">
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setActiveTool('none')} className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
                        <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:30}} className="w-full max-w-5xl bg-[#111] rounded-t-[40px] p-8 h-[80vh] relative border-t border-white/5 pointer-events-auto">
                            <EmojiPicker theme={Theme.DARK} width="100%" height="90%" skinTonesDisabled onEmojiClick={addSticker}/>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="hidden">
                <video ref={exportVideoRef} src={videoUrl||undefined} crossOrigin="anonymous"/>
                <canvas ref={exportCanvasRef}/>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .shadow-glow { filter: drop-shadow(0 0 20px rgba(220,38,38,0.6)); }
                @keyframes ve-fadeIn    { from { opacity:0 } to { opacity:1 } }
                @keyframes ve-slideUp   { from { opacity:0; transform:translateY(30px) translateX(-50%) } to { opacity:1; transform:translateY(0) translateX(-50%) } }
                @keyframes ve-slideLeft { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }
                @keyframes ve-bounce    { 0%,100% { transform:translateY(-8px) } 50% { transform:translateY(0) } }
                @keyframes ve-pulse     { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
                @keyframes ve-zoom      { from { opacity:0; transform:scale(0.4) } to { opacity:1; transform:scale(1) } }
                @keyframes ve-shake     { 0%,100% { transform:rotate(0deg) } 25% { transform:rotate(-4deg) } 75% { transform:rotate(4deg) } }
                .ve-anim-fadeIn    { animation: ve-fadeIn 0.6s ease forwards; }
                .ve-anim-slideUp   { animation: ve-slideUp 0.5s ease forwards; }
                .ve-anim-slideLeft { animation: ve-slideLeft 0.5s ease forwards; }
                .ve-anim-bounce    { animation: ve-bounce 1s ease-in-out infinite; }
                .ve-anim-pulse     { animation: ve-pulse 1.5s ease-in-out infinite; }
                .ve-anim-zoom      { animation: ve-zoom 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
                .ve-anim-shake     { animation: ve-shake 0.5s ease-in-out infinite; }
            `}</style>
        </div>,
        document.body
    )
}

function NavBtn({ icon, onClick, active, title }: { icon: React.ReactNode; onClick: () => void; active: boolean; title?: string }) {
    return (
        <button onClick={onClick} className={clsx("flex flex-col items-center gap-1.5 transition-all shrink-0", active ? "text-brand-red scale-110" : "text-white/50 hover:text-white/90")}>
            {icon}
            {title && <span className="text-[7px] font-black tracking-widest">{title}</span>}
        </button>
    )
}

function DeleteBtn({ onClick, small }: { onClick: (e: React.MouseEvent) => void; small?: boolean }) {
    return (
        <button onClick={onClick} className={clsx("absolute -top-3 -right-3 bg-brand-red text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-[1100]", small ? "w-6 h-6" : "w-8 h-8")}>
            <X size={small ? 11 : 15} strokeWidth={4}/>
        </button>
    )
}
