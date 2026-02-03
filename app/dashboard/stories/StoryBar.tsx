'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Play, Heart, Eye, Users, Trash2, Music, Send, Type, Smile, Move } from 'lucide-react'
import { createStory, createPRStory, toggleStoryLike, recordStoryView, deleteStory } from './actions'
import { clsx } from 'clsx'
import PRCard from '../community/PRCard'
import { Trophy, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStories } from './StoryContext'
import MusicPicker from '../MusicPicker'
import { MusicTrack } from '../music-data'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'

interface Story {
    id: string
    media_url: string
    media_type: string
    created_at: string
    likes_count?: number
    has_liked?: boolean
    views_count?: number
    viewer_details?: any[]
    music_url?: string | null
    music_title?: string | null
    music_artist?: string | null
    metadata?: any
}

interface UserStories {
    user: {
        id: string
        username: string
        full_name: string
        avatar_url: string | null
    }
    stories: Story[]
}

interface OverlayElement {
    id: string
    type: 'text' | 'sticker'
    content: string
    x: number
    y: number
    scale: number
    rotation: number
    color?: string
}

export default function StoryBar({ currentUser }: { currentUser: any }) {
    const { userStories, refreshStories } = useStories()
    const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null)
    const [activeStoryIndex, setActiveStoryIndex] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [showViewers, setShowViewers] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const prFileInputRef = useRef<HTMLInputElement>(null)
    const [showPRCreator, setShowPRCreator] = useState(false)
    const [prExercise, setPrExercise] = useState("")
    const [prWeight, setPrWeight] = useState("")
    const [prSport, setPrSport] = useState("CrossFit")
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const router = useRouter()

    // Preview/Editor State
    const [previewFile, setPreviewFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [overlays, setOverlays] = useState<OverlayElement[]>([])
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showTextInput, setShowTextInput] = useState(false)
    const [currentTextInput, setCurrentTextInput] = useState("")
    const [textColor, setTextColor] = useState("#FFFFFF")
    const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false)

    // Interaction State for Dragging
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const dragStartRef = useRef<{ x: number, y: number } | null>(null)

    useEffect(() => {
        // Poll for stories every 30 seconds to catch new ones
        const interval = setInterval(refreshStories, 30000)

        const handleOpenStory = (e: any) => {
            const userId = e.detail.userId
            // Trigger a separate effect to avoid stale closures with userStories
            window.dispatchEvent(new CustomEvent('trigger-story-open', { detail: { userId } }))
        }

        window.addEventListener('open-story', handleOpenStory)
        return () => {
            window.removeEventListener('open-story', handleOpenStory)
            clearInterval(interval)
        }
    }, [refreshStories])

    // Specific effect to handle the 'trigger-story-open' so it has access to current userStories
    useEffect(() => {
        const handleTrigger = (e: any) => {
            const userId = e.detail.userId
            const index = userStories.findIndex(us => us.user.id === userId)
            if (index !== -1) {
                setSelectedUserIndex(index)
                setActiveStoryIndex(0)
                recordView(userStories[index].stories[0].id)
            }
        }
        window.addEventListener('trigger-story-open', handleTrigger)
        return () => window.removeEventListener('trigger-story-open', handleTrigger)
    }, [userStories])

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    async function loadStories() {
        await refreshStories()
    }

    const recordView = async (storyId: string) => {
        await recordStoryView(storyId)
    }

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedUserIndex === null) return
        const story = userStories[selectedUserIndex].stories[activeStoryIndex]

        await toggleStoryLike(story.id)
        await loadStories()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo es demasiado grande. El límite es 10MB.')
            return
        }

        const url = URL.createObjectURL(file)
        setPreviewFile(file)
        setPreviewUrl(url)
        setOverlays([]) // Reset overlays
        setSelectedTrack(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    // Editor Functions
    const addTextOverlay = () => {
        if (!currentTextInput.trim()) {
            setShowTextInput(false)
            return
        }
        const newOverlay: OverlayElement = {
            id: Date.now().toString(),
            type: 'text',
            content: currentTextInput,
            x: 50,
            y: 50,
            scale: 1,
            rotation: 0,
            color: textColor
        }
        setOverlays([...overlays, newOverlay])
        setCurrentTextInput("")
        setShowTextInput(false)
    }

    const addEmojiOverlay = (emojiData: EmojiClickData) => {
        const newOverlay: OverlayElement = {
            id: Date.now().toString(),
            type: 'sticker',
            content: emojiData.imageUrl,
            x: 50,
            y: 50,
            scale: 1,
            rotation: 0
        }
        setOverlays([...overlays, newOverlay])
        setShowEmojiPicker(false)
    }

    const removeOverlay = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setOverlays(overlays.filter(o => o.id !== id))
    }

    // Dragging Logic (Simple 2D translation for now)
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        // e.stopPropagation(); 
        setDraggingId(id)
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
        dragStartRef.current = { x: clientX, y: clientY }
    }

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggingId || !dragStartRef.current) return

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

        const deltaX = clientX - dragStartRef.current.x
        const deltaY = clientY - dragStartRef.current.y

        // Convert pixels to % roughly (assuming mostly standard phone width, but simplistic)
        // A better way is to use pixels relative to container, but let's just nudge the % values for MVP feel
        // Assuming ~400px width container
        const percentX = (deltaX / 300) * 100
        const percentY = (deltaY / 600) * 100

        setOverlays(prev => prev.map(o => {
            if (o.id === draggingId) {
                return {
                    ...o,
                    x: Math.min(Math.max(o.x + percentX, 0), 100),
                    y: Math.min(Math.max(o.y + percentY, 0), 100)
                }
            }
            return o
        }))

        dragStartRef.current = { x: clientX, y: clientY }
    }

    const handleDragEnd = () => {
        setDraggingId(null)
        dragStartRef.current = null
    }

    const handlePostStory = async () => {
        if (!previewFile) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('media', previewFile)
            if (selectedTrack) {
                formData.append('music_url', selectedTrack.url)
                formData.append('music_title', selectedTrack.title)
                formData.append('music_artist', selectedTrack.artist)
            }
            if (overlays.length > 0) {
                formData.append('metadata', JSON.stringify({ overlays }))
            }

            const res = await createStory(formData)
            if (res.error) {
                alert(`Error: ${res.error}`)
            } else {
                setPreviewFile(null)
                setPreviewUrl(null)
                setSelectedTrack(null)
                setOverlays([])
                await loadStories()
                router.refresh()
            }
        } finally {
            setIsUploading(false)
        }
    }

    const closePreview = () => {
        setPreviewFile(null)
        setPreviewUrl(null)
        setSelectedTrack(null)
        setOverlays([])
    }

    const handlePRStoryPost = async (e: React.FormEvent) => {
        // ... (PR Logic kept mostly same, simple)
        e.preventDefault()
        if (!prExercise || !prWeight) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('exercise', prExercise)
            formData.append('weight', prWeight)
            formData.append('sport', prSport)
            const file = prFileInputRef.current?.files?.[0]
            if (file) formData.append('media', file)
            if (selectedTrack) {
                formData.append('music_url', selectedTrack.url)
                formData.append('music_title', selectedTrack.title)
                formData.append('music_artist', selectedTrack.artist)
            }

            const res = await createPRStory(formData)
            if (res.error) {
                alert(res.error)
            } else {
                setPrWeight("")
                setShowPRCreator(false)
                setSelectedTrack(null)
                if (prFileInputRef.current) prFileInputRef.current.value = ""
                await loadStories()
                router.refresh()
            }
        } finally {
            setIsUploading(false)
        }
    }

    const handleDeleteStory = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (selectedUserIndex === null) return
        const story = userStories[selectedUserIndex].stories[activeStoryIndex]
        if (!confirm('¿Estás seguro de que quieres eliminar esta historia?')) return
        const res = await deleteStory(story.id)
        if (res.error) {
            alert(res.error)
        } else {
            if (userStories[selectedUserIndex].stories.length === 1) {
                setSelectedUserIndex(null)
            } else {
                nextStory()
            }
            await loadStories()
        }
    }

    const nextStory = () => {
        if (selectedUserIndex === null) return
        setShowViewers(false)
        if (activeStoryIndex < userStories[selectedUserIndex].stories.length - 1) {
            const nextIdx = activeStoryIndex + 1
            setActiveStoryIndex(nextIdx)
            recordView(userStories[selectedUserIndex].stories[nextIdx].id)
            if (audioRef.current) audioRef.current.pause()
        } else if (selectedUserIndex < userStories.length - 1) {
            const nextUserIdx = selectedUserIndex + 1
            setSelectedUserIndex(nextUserIdx)
            setActiveStoryIndex(0)
            recordView(userStories[nextUserIdx].stories[0].id)
            if (audioRef.current) audioRef.current.pause()
        } else {
            setSelectedUserIndex(null)
            if (audioRef.current) audioRef.current.pause()
        }
    }

    const prevStory = () => {
        if (selectedUserIndex === null) return
        setShowViewers(false)
        if (activeStoryIndex > 0) {
            const prevIdx = activeStoryIndex - 1
            setActiveStoryIndex(prevIdx)
            recordView(userStories[selectedUserIndex].stories[prevIdx].id)
        } else if (selectedUserIndex > 0) {
            const prevUserIndex = selectedUserIndex - 1
            setSelectedUserIndex(prevUserIndex)
            const lastStoryIdx = userStories[prevUserIndex].stories.length - 1
            setActiveStoryIndex(lastStoryIdx)
            recordView(userStories[prevUserIndex].stories[lastStoryIdx].id)
        } else {
            setSelectedUserIndex(null)
        }
    }

    const currentStory = selectedUserIndex !== null ? userStories[selectedUserIndex].stories[activeStoryIndex] : null
    const isOwner = selectedUserIndex !== null && userStories[selectedUserIndex].user.id === currentUser?.id

    useEffect(() => {
        if (selectedUserIndex !== null && currentStory?.music_url && !showViewers && !previewUrl) {
            if (audioRef.current) {
                audioRef.current.src = currentStory.music_url;
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log("Audio play blocked by browser"));
            }
        } else if (!previewUrl) {
            if (audioRef.current) audioRef.current.pause();
        }
    }, [selectedUserIndex, activeStoryIndex, showViewers, currentStory?.music_url, previewUrl])



    // Render Overlays Helper
    const renderOverlays = (storyOverlays: OverlayElement[]) => {
        return storyOverlays.map(overlay => (
            <div
                key={overlay.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move z-20"
                style={{ left: `${overlay.x}%`, top: `${overlay.y}%` }}
                onMouseDown={(e) => previewUrl && handleDragStart(e, overlay.id)}
                onTouchStart={(e) => previewUrl && handleDragStart(e, overlay.id)}
            >
                {overlay.type === 'text' ? (
                    <div className="relative group">
                        <p
                            className="font-black text-2xl uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-center break-words max-w-[300px]"
                            style={{ color: overlay.color || 'white' }}
                        >
                            {overlay.content}
                        </p>
                        {previewUrl && (
                            <button
                                onClick={(e) => removeOverlay(overlay.id, e)}
                                className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="relative group">
                        <Image src={overlay.content} width={64} height={64} alt="sticker" className="drop-shadow-lg" />
                        {previewUrl && (
                            <button
                                onClick={(e) => removeOverlay(overlay.id, e)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        ))
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar items-center select-none">
            {/* Add Story Button Group */}
            <div className="flex gap-2 shrink-0 pr-4 border-r border-white/10">
                <div className="flex flex-col items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center hover:border-white transition-all group relative overflow-hidden"
                    >
                        {isUploading && !showPRCreator && !previewUrl ? (
                            <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                        ) : (
                            <div className="bg-white/10 p-1.5 rounded-full text-white group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5" />
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                    </button>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Story</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <button onClick={() => setShowPRCreator(true)} className="w-16 h-16 rounded-full border-2 border-brand-red flex items-center justify-center hover:scale-105 transition-all group shadow-glow shadow-brand-red/20 bg-black">
                        <div className="bg-brand-red p-1.5 rounded-full text-white group-hover:rotate-12 transition-transform">
                            <Trophy className="w-5 h-5" />
                        </div>
                    </button>
                    <span className="text-[10px] font-black text-brand-red uppercase tracking-widest">PR</span>
                </div>
            </div>

            {/* List of Users */}
            {userStories.map((us, idx) => (
                <div key={us.user.id} className="flex flex-col items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            setSelectedUserIndex(idx)
                            setActiveStoryIndex(0)
                            recordView(us.stories[0].id)
                        }}
                        className="w-16 h-16 p-0.5 rounded-full ring-2 ring-brand-red shadow-glow transition-all hover:scale-105 active:scale-95 bg-black"
                    >
                        <div className="w-full h-full rounded-full overflow-hidden relative">
                            <Image
                                src={us.user.avatar_url || `https://ui-avatars.com/api/?name=${us.user.full_name}&background=random`}
                                alt={us.user.username} fill className="object-cover"
                            />
                        </div>
                    </button>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest truncate max-w-[64px]">
                        {us.user.username}
                    </span>
                </div>
            ))}

            {/* Editor Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div
                        className="relative w-full max-w-[400px] h-[90vh] bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex flex-col"
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                    >
                        {/* Top Toolbar */}
                        <div className="absolute top-0 left-0 right-0 p-6 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                            <button onClick={closePreview} className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/5">
                                <X className="w-5 h-5 text-white" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsMusicPickerOpen(!isMusicPickerOpen)}
                                        className={clsx("p-2 rounded-full transition-all border border-white/5", selectedTrack ? "bg-brand-red text-white" : "bg-black/40 text-white hover:bg-white/10")}
                                    >
                                        <Music className="w-5 h-5" />
                                    </button>
                                    {isMusicPickerOpen && (
                                        <div className="absolute top-12 right-0 mt-2 z-[300] w-[300px]">
                                            <MusicPicker
                                                onSelect={(track) => {
                                                    console.log("Track selected in StoryBar:", track?.title);
                                                    setSelectedTrack(track);
                                                    setIsMusicPickerOpen(false);
                                                    if (track && audioRef.current) {
                                                        console.log("Setting StoryBar audio src to:", track.url);
                                                        audioRef.current.src = track.url;
                                                        audioRef.current.volume = 1.0;
                                                        audioRef.current.muted = false;
                                                        audioRef.current.load();
                                                        const playPromise = audioRef.current.play();
                                                        if (playPromise !== undefined) {
                                                            playPromise.then(() => {
                                                                console.log("StoryBar audio playing successfully");
                                                            }).catch(error => {
                                                                console.error("StoryBar playback error:", error);
                                                            });
                                                        }
                                                    } else if (!track && audioRef.current) {
                                                        console.log("No track selected, pausing StoryBar audio");
                                                        audioRef.current.pause();
                                                    }
                                                }}
                                                selectedTrackId={selectedTrack?.id || null}
                                                variant="embedded"
                                            />
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setShowTextInput(true)} className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/5">
                                    <Type className="w-5 h-5 text-white" />
                                </button>
                                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/5">
                                    <Smile className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Canvas Area */}
                        <div className="relative flex-1 bg-gray-900 overflow-hidden flex items-center justify-center">
                            {previewFile?.type.startsWith('video/') ? (
                                <video src={previewUrl} autoPlay loop playsInline className="w-full h-full object-cover" />
                            ) : (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            )}

                            {/* Overlays Rendering */}
                            {renderOverlays(overlays)}

                            {/* Text Input Modal Overlay */}
                            {showTextInput && (
                                <div className="absolute inset-0 bg-black/80 z-[350] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Escribe algo..."
                                        value={currentTextInput}
                                        onChange={(e) => setCurrentTextInput(e.target.value)}
                                        className="bg-transparent text-center text-3xl font-black text-white placeholder-white/50 border-none outline-none w-full mb-8 uppercase tracking-wider"
                                    />
                                    <div className="flex gap-4 mb-8">
                                        {['#FFFFFF', '#DC2626', '#FACC15', '#22C55E', '#3B82F6', '#A855F7'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setTextColor(color)}
                                                className={clsx("w-8 h-8 rounded-full border-2", textColor === color ? "border-white scale-110" : "border-transparent")}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => setShowTextInput(false)} className="px-6 py-2 rounded-full border border-white/20 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10">Cancelar</button>
                                        <button onClick={addTextOverlay} className="px-6 py-2 rounded-full bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">Listo</button>
                                    </div>
                                </div>
                            )}

                            {/* Emoji Picker Overlay */}
                            {showEmojiPicker && (
                                <div className="absolute top-20 right-4 z-[350]">
                                    <div className="relative">
                                        <button onClick={() => setShowEmojiPicker(false)} className="absolute -top-2 -right-2 bg-black/50 text-white rounded-full p-1 z-10"><X className="w-4 h-4" /></button>
                                        <EmojiPicker
                                            onEmojiClick={addEmojiOverlay}
                                            theme={Theme.DARK}
                                            lazyLoadEmojis={true}
                                            width={300}
                                            height={400}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Toolbar */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent z-50">
                            <div className="flex items-center gap-2 max-w-[50%]">
                                {selectedTrack && (
                                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 truncate pointer-events-auto">
                                        <Music className="w-3 h-3 text-brand-red animate-pulse flex-shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-white leading-none truncate">{selectedTrack.title}</span>
                                            <span className="text-[8px] text-gray-400 uppercase font-black truncate">{selectedTrack.artist}</span>
                                        </div>
                                        <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (audioRef.current) {
                                                        console.log("Manual Play/Pause clicked. Current src:", audioRef.current.src);
                                                        if (audioRef.current.paused) {
                                                            audioRef.current.volume = 1.0;
                                                            audioRef.current.play().then(() => console.log("Manual play success")).catch(err => console.error("Manual play failed:", err));
                                                        } else {
                                                            audioRef.current.pause();
                                                            console.log("Manual pause success");
                                                        }
                                                    }
                                                }}
                                                className="text-white hover:scale-110 transition-transform flex-shrink-0"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTrack(null);
                                                    if (audioRef.current) audioRef.current.pause();
                                                }}
                                                className="text-gray-400 hover:text-white flex-shrink-0"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handlePostStory}
                                disabled={isUploading}
                                className="bg-brand-red text-white pl-6 pr-4 py-3 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Compartir <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Story Viewer (Updated to show overlays) */}
            {selectedUserIndex !== null && currentStory && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-[400px] h-[90vh] bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/5 mx-auto">
                        <div className="absolute top-6 inset-x-6 flex gap-1.5 z-50">
                            {userStories[selectedUserIndex].stories.map((_, i) => (
                                <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white transition-all duration-100 ease-linear"
                                        style={{ width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${progress}%` : '0%' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="absolute top-12 left-6 right-6 flex items-center justify-between z-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border-2 border-brand-red overflow-hidden relative">
                                    <Image
                                        src={userStories[selectedUserIndex].user.avatar_url || `https://ui-avatars.com/api/?name=${userStories[selectedUserIndex].user.full_name}`}
                                        alt="Avatar" fill className="object-cover"
                                    />
                                </div>
                                <div className="drop-shadow-lg">
                                    <p className="text-white font-black text-sm uppercase italic tracking-tighter">
                                        {userStories[selectedUserIndex].user.full_name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {currentStory.music_url && (
                                        <div className="flex items-center gap-1.5 mt-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 w-fit">
                                            <Music className="w-2.5 h-2.5 text-brand-red animate-bounce" />
                                            <span className="text-[8px] font-black text-white uppercase tracking-[0.1em] marquee-container whitespace-nowrap overflow-hidden max-w-[80px]">
                                                {currentStory.music_title} • {currentStory.music_artist}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isOwner && (
                                    <button
                                        onClick={handleDeleteStory}
                                        className="p-2 bg-black/40 hover:bg-red-500/60 text-white rounded-full backdrop-blur-md transition-all group/delete"
                                        title="Eliminar historia"
                                    >
                                        <Trash2 className="w-5 h-5 group-hover/delete:scale-110 transition-transform" />
                                    </button>
                                )}
                                <button onClick={() => setSelectedUserIndex(null)} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="absolute inset-0 z-40 flex">
                            <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                            <div className="w-2/3 h-full cursor-pointer" onClick={nextStory} />
                        </div>

                        <div className="w-full h-full relative">
                            {currentStory.media_type === 'pr' ? (
                                (() => {
                                    try {
                                        const pr = JSON.parse(currentStory.media_url)
                                        return (
                                            <PRCard
                                                userName={userStories[selectedUserIndex].user.full_name}
                                                avatarUrl={userStories[selectedUserIndex].user.avatar_url || ''}
                                                sport={pr.sport}
                                                exerciseName={pr.exerciseName}
                                                weight={pr.weight}
                                                backgroundImage={pr.backgroundImage}
                                                isStory={true}
                                            />
                                        )
                                    } catch (e) {
                                        return <div className="flex items-center justify-center h-full text-white">Error cargando PR</div>
                                    }
                                })()
                            ) : currentStory.media_type === 'video' ? (
                                <video src={currentStory.media_url} autoPlay muted playsInline className="w-full h-full object-cover" />
                            ) : (
                                <Image src={currentStory.media_url} alt="Story content" fill className="object-cover" />
                            )}
                            {/* Render Viewer Overlays */}
                            {currentStory.metadata?.overlays && currentStory.metadata.overlays.map((overlay: OverlayElement) => (
                                <div
                                    key={overlay.id}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                                    style={{ left: `${overlay.x}%`, top: `${overlay.y}%` }}
                                >
                                    {overlay.type === 'text' ? (
                                        <p
                                            className="font-black text-2xl uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-center break-words max-w-[300px]"
                                            style={{ color: overlay.color || 'white' }}
                                        >
                                            {overlay.content}
                                        </p>
                                    ) : (
                                        <Image src={overlay.content} width={64} height={64} alt="sticker" className="drop-shadow-lg" />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="absolute bottom-10 left-0 right-0 px-6 flex items-center justify-between z-50 pointer-events-none">
                            <div className="pointer-events-auto">
                                {isOwner ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowViewers(true); }}
                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 transition-all group"
                                    >
                                        <div className="flex -space-x-2">
                                            {(currentStory as any).viewer_details?.slice(0, 3).map((v: any, i: number) => (
                                                <div key={i} className="w-5 h-5 rounded-full border border-black overflow-hidden relative">
                                                    <Image src={v.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${v.profiles?.full_name}`} fill alt="v" className="object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                            {(currentStory as any).views_count} {(currentStory as any).views_count === 1 ? 'Vista' : 'Vistas'}
                                        </span>
                                    </button>
                                ) : (
                                    <div className="flex-1" />
                                )}
                            </div>

                            <button
                                onClick={handleLike}
                                className={clsx(
                                    "p-3 rounded-full backdrop-blur-xl border transition-all active:scale-90 pointer-events-auto",
                                    (currentStory as any).has_liked
                                        ? "bg-brand-red/20 border-brand-red text-brand-red"
                                        : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                                )}
                            >
                                <Heart className={clsx("w-6 h-6", (currentStory as any).has_liked && "fill-current animate-heart-pop")} />
                                {(currentStory as any).likes_count! > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-black">
                                        {(currentStory as any).likes_count}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPRCreator && (
                <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-brand-gray border border-white/10 w-full max-w-md rounded-[32px] p-8 shadow-2xl relative">
                        <button onClick={() => setShowPRCreator(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-brand-red/10 rounded-2xl">
                                <Trophy className="w-6 h-6 text-brand-red" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Publicar Nuevo PR</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Se verá en tus historias por 24h</p>
                            </div>
                        </div>

                        <form onSubmit={handlePRStoryPost} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Ejercicio</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="p.ej. Back Squat"
                                    value={prExercise}
                                    onChange={(e) => setPrExercise(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-red/50 text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Peso Elevado (KG)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="p.ej. 140"
                                    value={prWeight}
                                    onChange={(e) => setPrWeight(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-brand-red font-black focus:outline-none focus:border-brand-red/50 text-2xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Disciplina</label>
                                <input
                                    type="text"
                                    placeholder="p.ej. CrossFit"
                                    value={prSport}
                                    onChange={(e) => setPrSport(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-red/50 text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Música</label>
                                <div className="flex bg-black/40 border border-white/10 rounded-2xl p-2 items-center justify-between">
                                    <MusicPicker onSelect={setSelectedTrack} selectedTrackId={selectedTrack?.id || null} />
                                    <div className="flex-1 px-4 text-left">
                                        {selectedTrack ? (
                                            <div>
                                                <p className="text-xs font-bold text-white leading-none">{selectedTrack.title}</p>
                                                <p className="text-[9px] text-gray-500 uppercase font-black">{selectedTrack.artist}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 italic">Elegir música (opcional)</p>
                                        )}
                                    </div>
                                    {selectedTrack && (
                                        <button type="button" onClick={() => setSelectedTrack(null)} className="p-2 text-gray-500 hover:text-white">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => prFileInputRef.current?.click()}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] border border-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Activity className="w-4 h-4 text-brand-red" />
                                    Fondo Foto
                                </button>
                                <input
                                    ref={prFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={() => { }} // No auto-post
                                />
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-[2] bg-brand-red text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> PUBLICAR PR</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <audio
                ref={audioRef}
                loop
                playsInline
                preload="auto"
                onError={(e) => console.error("StoryBar Audio Error:", e)}
                onPlay={(e) => {
                    console.log("StoryBar Audio onPlay triggered");
                    const audio = e.currentTarget;
                    audio.volume = 1.0;
                    audio.muted = false;
                }}
                style={{ width: '1px', height: '1px', opacity: 0.01, position: 'absolute', pointerEvents: 'none' }}
            />
        </div>
    )
}

function setUserInteraction(type: string) {
    console.log("Interaction:", type)
}
