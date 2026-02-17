import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Play, Heart, Eye, Users, Trash2, Music, Send, Type, Smile, Move, Zap, Clock, MapPin, Dumbbell, ChevronUp, ChevronDown, Share2 } from 'lucide-react'
import { createStory, createPRStory, toggleStoryLike, recordStoryView, deleteStory } from './actions'
import { clsx } from 'clsx'
import PRCard from '../community/PRCard'
import { Trophy, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStories } from './StoryContext'
import { motion, AnimatePresence } from 'framer-motion'
import MusicPicker from '../MusicPicker'
import { MusicTrack } from '../music-data'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { createClient } from '@/utils/supabase/client'
import VideoEditor from '../VideoEditor'

interface OverlayElement {
    id: string
    type: 'text' | 'image' | 'sticker' | 'workout_sticker' | 'pr_sticker'
    content: string
    x: number
    y: number
    scale: number
    rotation: number
    color?: string
    link?: string
}

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
    overlays?: OverlayElement[]
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

export default function StoryBar({ currentUser }: { currentUser: any }) {
    const { userStories, setUserStories, refreshStories } = useStories()
    const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null)
    const [activeStoryIndex, setActiveStoryIndex] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [showViewers, setShowViewers] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const storyVideoRef = useRef<HTMLVideoElement>(null)
    const prFileInputRef = useRef<HTMLInputElement>(null)
    const [showPRCreator, setShowPRCreator] = useState(false)
    const [prExercise, setPrExercise] = useState("")
    const [prWeight, setPrWeight] = useState("")
    const [prSport, setPrSport] = useState("Cross Training")
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

    // Image adjustment controls (Instagram-style)
    const [imageZoom, setImageZoom] = useState(1)
    const [imagePositionX, setImagePositionX] = useState(50)
    const [imagePositionY, setImagePositionY] = useState(50)
    const [showImageAdjust, setShowImageAdjust] = useState(false)

    const [isVideoTrimming, setIsVideoTrimming] = useState(false)
    const [trimmerVideoUrl, setTrimmerVideoUrl] = useState<string | null>(null)
    const [videoToEdit, setVideoToEdit] = useState<File | null>(null)
    const [videoDuration, setVideoDuration] = useState(0)

    // Interaction State for Dragging
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const dragStartRef = useRef<{ x: number, y: number } | null>(null)
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
    const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
    const [showFullSummary, setShowFullSummary] = useState(false)

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

    // Listener for 'share-to-story' event from FeedPost
    useEffect(() => {
        const handleShareToStory = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const { type, url, attribution } = customEvent.detail;

            if ((type === 'image' || type === 'video') && url) {
                setIsUploading(true);
                try {
                    // Fetch the media to use as the main story file
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const fileName = type === 'video' ? "shared_story_video.mp4" : "shared_story_image.jpg";
                    const file = new File([blob], fileName, { type: blob.type });

                    setupPreview(file);

                    const newOverlays: OverlayElement[] = [];

                    // Add "View Post" sticker if postId is present
                    if (customEvent.detail.postId) {
                        newOverlays.push({
                            id: `link-${Date.now()}`,
                            type: 'text',
                            content: 'VER POST 🔗',
                            x: 50,
                            y: 85,
                            scale: 1,
                            rotation: 0,
                            color: '#FFFFFF',
                            link: `/dashboard`
                        });
                    }

                    // Add attribution if present
                    if (attribution) {
                        newOverlays.push({
                            id: `attr-${Date.now()}`,
                            type: 'text',
                            content: `DE: @${attribution.username}`,
                            x: 50,
                            y: 15,
                            scale: 0.8,
                            rotation: 0,
                            color: '#DC2626' // Brand red for attribution
                        });
                    }

                    if (newOverlays.length > 0) {
                        setTimeout(() => setOverlays(newOverlays), 100);
                    }
                } catch (err) {
                    console.error("Error preparing shared story:", err);
                    alert(`Error al cargar ${type === 'video' ? 'el video' : 'la imagen'} para la historia.`);
                } finally {
                    setIsUploading(false);
                }
            } else if (['workout', 'class_result', 'pr'].includes(type) && customEvent.detail.data) {
                const postId = customEvent.detail.postId;
                // Generate a background
                const canvas = document.createElement('canvas');
                canvas.width = 1080;
                canvas.height = 1920;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Modern dynamic background
                    const gradient = ctx.createRadialGradient(540, 960, 0, 540, 960, 1200);
                    gradient.addColorStop(0, '#1a1a1a');
                    gradient.addColorStop(0.5, '#0a0a0a');
                    gradient.addColorStop(1, '#000000');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 1080, 1920);

                    // Add subtle glow at technical areas
                    const glow = ctx.createRadialGradient(1080, 0, 0, 1080, 0, 800);
                    glow.addColorStop(0, 'rgba(220, 38, 38, 0.05)');
                    glow.addColorStop(1, 'transparent');
                    ctx.fillStyle = glow;
                    ctx.fillRect(0, 0, 1080, 1920);

                    // Add honeycomb pattern (subtle)
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
                    ctx.lineWidth = 1;
                    const size = 60;
                    for (let y = 0; y < 1920 + size; y += size * 1.5) {
                        for (let x = 0; x < 1080 + size; x += size * Math.sqrt(3)) {
                            const xOffset = (Math.floor(y / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2);
                            ctx.beginPath();
                            for (let i = 0; i < 6; i++) {
                                const angle = (i * 60 * Math.PI) / 180;
                                const px = x + xOffset + size * Math.cos(angle);
                                const py = y + size * Math.sin(angle);
                                if (i === 0) ctx.moveTo(px, py);
                                else ctx.lineTo(px, py);
                            }
                            ctx.closePath();
                            ctx.stroke();
                        }
                    }

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const file = new File([blob], "story_background.png", { type: "image/png" });
                            setupPreview(file);

                            const data = customEvent.detail.data;
                            const newOverlays: OverlayElement[] = [];

                            const stickerOverlay: OverlayElement = {
                                id: `sticker-${Date.now()}`,
                                type: type === 'pr' ? 'pr_sticker' : 'workout_sticker',
                                content: JSON.stringify(data),
                                x: 50,
                                y: 50, // Perfectly centered
                                scale: 1,
                                rotation: 0,
                                link: postId ? `/dashboard` : undefined
                            };
                            newOverlays.push(stickerOverlay);

                            // Add attribution if present
                            if (attribution) {
                                newOverlays.push({
                                    id: `attr-${Date.now()}`,
                                    type: 'text',
                                    content: `DE: @${attribution.username}`,
                                    x: 50,
                                    y: 15,
                                    scale: 0.8,
                                    rotation: 0,
                                    color: '#DC2626'
                                });
                            }

                            // Use setTimeout to ensure state update happens after setupPreview's state clear
                            setTimeout(() => {
                                setOverlays(newOverlays);
                                if (!attribution) setSelectedOverlayId(stickerOverlay.id);
                            }, 100);
                        }
                    }, 'image/png');
                }
            }
        };

        window.addEventListener('share-to-story', handleShareToStory);
        return () => window.removeEventListener('share-to-story', handleShareToStory);
    }, []);

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
        if (!currentUserStories || !currentStory) return

        // Optimistic update
        const updatedUserStories = [...userStories]
        const targetStory = updatedUserStories[selectedUserIndex as number].stories[activeStoryIndex]
        const wasLiked = (targetStory as any).has_liked

            ; (targetStory as any).has_liked = !wasLiked
            ; (targetStory as any).likes_count = (targetStory as any).likes_count + (wasLiked ? -1 : 1)

        setUserStories(updatedUserStories)

        await toggleStoryLike(currentStory.id)
        refreshStories()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        console.log("File selected:", file.name, "MIME:", file.type);

        // Check if it's REALLY a video by extension if MIME is missing/weird
        const ext = file.name.split('.').pop()?.toLowerCase();
        const videoExts = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
        const isVideo = file.type.startsWith('video/') || (ext && videoExts.includes(ext));

        if (isVideo) {
            // Check duration if it's a video
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 65) {
                    alert('Los videos deben durar menos de 60 segundos.');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                    setupPreview(file);
                }
            };
            video.src = URL.createObjectURL(file);
        } else {
            setupPreview(file);
        }
    }

    const setupPreview = (file: File) => {
        const url = URL.createObjectURL(file)
        setPreviewFile(file)
        setPreviewUrl(url)
        setOverlays([]) // Reset overlays
        setSelectedTrack(null)
        setImageZoom(1)
        setImagePositionX(50)
        setImagePositionY(50)
        setShowImageAdjust(false)
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
        console.log("Starting upload for:", previewFile.name, previewFile.size);
        try {
            const formData = new FormData()
            let mediaUrl = null;
            let mediaType = previewFile.type.startsWith('video/') ? 'video' : 'image';

            // DIRECT CLIENT UPLOAD for "pesados" (heavy) files
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("No user found");

                const fileExt = previewFile.name.split('.').pop() || 'jpg';
                const fileName = `${user.id}/story_${Date.now()}.${fileExt}`;

                console.log("Directly uploading story to storage...");
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('posts')
                    .upload(fileName, previewFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('posts')
                    .getPublicUrl(fileName);

                mediaUrl = publicUrl;
                console.log("Direct upload successful:", mediaUrl);
            } catch (storageError) {
                console.error("Direct storage upload failed, falling back to server action if small:", storageError);
                if (previewFile.size > 4.5 * 1024 * 1024) {
                    alert("El archivo es demasiado grande para el modo de respaldo. Por favor, asegúrate de tener buena conexión.");
                    setIsUploading(false);
                    return;
                }
                // If it's small enough, let the server action handle it by NOT setting mediaUrl
                formData.append('media', previewFile);
            }

            if (mediaUrl) {
                formData.append('media_url', mediaUrl);
            }

            // Refined media type detection for stories
            const fileExt = previewFile.name.split('.').pop()?.toLowerCase() || '';
            const videoExtensions = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
            const isVideo = previewFile.type.startsWith('video/') || videoExtensions.includes(fileExt);
            const finalMediaType = isVideo ? 'video' : 'image';

            formData.append('media_type', finalMediaType);

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
                console.error("Upload error:", res.error);
                alert(`Error: ${res.error}`)
            } else {
                console.log("Upload success!");
                setPreviewFile(null)
                setPreviewUrl(null)
                setSelectedTrack(null)
                setOverlays([])
                await refreshStories()
                router.refresh()
            }
        } catch (err) {
            console.error("Post story critical error:", err);
            alert("Error crítico al subir la historia.");
        } finally {
            setIsUploading(false)
        }
    }


    const closePreview = () => {
        setPreviewFile(null)
        setPreviewUrl(null)
        setSelectedTrack(null)
        setOverlays([])
        setImageZoom(1)
        setImagePositionX(50)
        setImagePositionY(50)
        setShowImageAdjust(false)
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
                await refreshStories()
                router.refresh()
            }
        } finally {
            setIsUploading(false)
        }
    }

    const handleDeleteStory = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!currentUserStories || !currentStory) return

        if (!confirm('¿Estás seguro de que quieres eliminar esta historia?')) return
        const res = await deleteStory(currentStory.id)
        if (res.error) {
            alert(res.error)
        } else {
            if (currentUserStories.stories.length === 1) {
                setSelectedUserIndex(null)
            } else {
                nextStory()
            }
            await refreshStories()
        }
    }

    const nextStory = () => {
        if (selectedUserIndex === null) return
        setShowViewers(false)
        setExpandedWorkoutId(null)
        setShowFullSummary(false)
        setIsPaused(false)
        if (activeStoryIndex < (currentUserStories?.stories?.length || 0) - 1) {
            const nextIdx = activeStoryIndex + 1
            setActiveStoryIndex(nextIdx)
            if (currentUserStories?.stories?.[nextIdx]?.id) {
                recordView(currentUserStories.stories[nextIdx].id)
            }
        } else if (selectedUserIndex < userStories.length - 1) {
            const nextUserIdx = selectedUserIndex + 1
            setSelectedUserIndex(nextUserIdx)
            setActiveStoryIndex(0)
            if (userStories[nextUserIdx]?.stories?.[0]?.id) {
                recordView(userStories[nextUserIdx].stories[0].id)
            }
        } else {
            setSelectedUserIndex(null)
            if (audioRef.current) audioRef.current.pause()
        }
    }

    const prevStory = () => {
        if (selectedUserIndex === null) return
        setShowViewers(false)
        setExpandedWorkoutId(null)
        setShowFullSummary(false)
        setIsPaused(false)
        if (activeStoryIndex > 0) {
            const prevIdx = activeStoryIndex - 1
            setActiveStoryIndex(prevIdx)
            if (currentUserStories?.stories?.[prevIdx]?.id) {
                recordView(currentUserStories.stories[prevIdx].id)
            }
        } else if (selectedUserIndex > 0) {
            const prevUserIndex = selectedUserIndex - 1
            setSelectedUserIndex(prevUserIndex)
            const targetUserStories = userStories[prevUserIndex]
            if (targetUserStories?.stories?.length > 0) {
                const lastStoryIdx = targetUserStories.stories.length - 1
                setActiveStoryIndex(lastStoryIdx)
                recordView(targetUserStories.stories[lastStoryIdx].id)
            }
        } else {
            setSelectedUserIndex(null)
        }
    }

    const currentUserStories = selectedUserIndex !== null ? userStories[selectedUserIndex] : null
    const currentStory = currentUserStories?.stories?.[activeStoryIndex] || null
    const isOwner = currentUserStories?.user?.id === currentUser?.id

    useEffect(() => {
        if (selectedUserIndex !== null && currentStory?.music_url && !showViewers && !previewUrl && !isPaused) {
            if (audioRef.current) {
                audioRef.current.src = currentStory.music_url;
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log("Audio play blocked by browser"));
            }
        } else {
            if (audioRef.current) audioRef.current.pause();
        }
    }, [selectedUserIndex, activeStoryIndex, showViewers, currentStory?.music_url, previewUrl, isPaused])

    // Story Progression Logic
    useEffect(() => {
        let interval: any;
        if (selectedUserIndex !== null && !showViewers && !isPaused && !previewUrl) {
            const storyDuration = 10000; // 10 seconds for images
            const step = 50; // update every 50ms

            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        nextStory();
                        return 0;
                    }
                    return prev + (100 / (storyDuration / step));
                });
            }, step);
        }
        return () => clearInterval(interval);
    }, [selectedUserIndex, activeStoryIndex, isPaused, showViewers, previewUrl]);


    const handlePressStart = () => {
        setIsPressed(true);
        setIsPaused(true);
        if (storyVideoRef.current) storyVideoRef.current.pause();
    };

    const handlePressEnd = () => {
        setIsPressed(false);
        setIsPaused(false);
        if (storyVideoRef.current) storyVideoRef.current.play().catch(() => { });
    };



    // Render Overlays Helper
    const renderOverlays = (storyOverlays: OverlayElement[]) => {
        return storyOverlays.map(overlay => (
            <div
                key={overlay.id}
                className={clsx(
                    "absolute z-20 origin-center touch-none select-none",
                    previewUrl ? "cursor-move" : (overlay.link && "cursor-pointer hover:scale-105 active:scale-95 transition-all")
                )}
                style={{
                    left: `${overlay.x}%`,
                    top: `${overlay.y}%`,
                    transform: `translate(-50%, -50%) scale(${overlay.scale || 1}) rotate(${overlay.rotation || 0}deg)`,
                    border: (previewUrl && selectedOverlayId === overlay.id) ? '2px solid #DC2626' : 'none',
                    borderRadius: '16px'
                }}
                onMouseDown={(e) => {
                    if (previewUrl) {
                        e.stopPropagation();
                        setSelectedOverlayId(overlay.id);
                        handleDragStart(e, overlay.id);
                    } else if (overlay.link) {
                        e.stopPropagation();
                        // Close viewer and navigate
                        setSelectedUserIndex(null);
                        router.push(overlay.link);
                    }
                }}
                onTouchStart={(e) => {
                    if (previewUrl) {
                        e.stopPropagation();
                        setSelectedOverlayId(overlay.id);
                        handleDragStart(e, overlay.id);
                    } else if (overlay.link) {
                        e.stopPropagation();
                        setSelectedUserIndex(null);
                        router.push(overlay.link);
                    }
                }}
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
                ) : overlay.type === 'workout_sticker' ? (
                    (() => {
                        try {
                            const data = JSON.parse(overlay.content);
                            const hasBlocks = data.metrics?.blocks?.length > 0;
                            return (
                                <div className="bg-black/60 backdrop-blur-3xl border border-white/10 p-5 rounded-[24px] shadow-2xl w-[300px] max-w-[calc(100vw-40px)] relative overflow-hidden group select-none transition-all">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                    <div className="flex items-center gap-4 mb-4 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center border border-brand-red/20 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                                            <Trophy className="w-5 h-5 text-brand-red" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-0.5">Entrenamiento</p>
                                            <h4 className="text-white font-black italic uppercase text-lg tracking-tighter truncate leading-none">{data.title || data.name || 'Sesión'}</h4>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        {hasBlocks ? (
                                            <div className="space-y-1.5">
                                                {data.metrics.blocks.slice(0, 4).map((block: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[9px] font-black text-white uppercase tracking-tight truncate">{block.title || block.type || 'BLOQUE'}</span>
                                                            <span className="text-[7px] text-brand-red/70 font-bold uppercase tracking-widest leading-none">{block.type}</span>
                                                        </div>
                                                        <span className="text-brand-red font-black text-xs italic tracking-tighter shrink-0 ml-2">
                                                            {block.type === 'fortime' ? block.result?.time : (block.result?.rounds ? `${block.result.rounds} RDS` : (block.result?.reps ? `${block.result.reps} REPS` : (block.result?.weight ? `${block.result.weight}${block.result?.unit || ''}` : '-')))}
                                                        </span>
                                                    </div>
                                                ))}
                                                {data.metrics.blocks.length > 4 && (
                                                    <div className="text-[8px] text-center text-brand-red/70 font-black uppercase tracking-[0.2em] pt-1">
                                                        +{data.metrics.blocks.length - 4} bloques más
                                                    </div>
                                                )}
                                            </div>
                                        ) : data.exercises && data.exercises.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {data.exercises.slice(0, 4).map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-black text-white uppercase tracking-tight truncate flex-1 pr-2">{ex.name}</span>
                                                        <span className="text-brand-red font-black text-xs italic tracking-tighter shrink-0">
                                                            {ex.sets?.length || 0} SERIES
                                                        </span>
                                                    </div>
                                                ))}
                                                {data.exercises.length > 4 && (
                                                    <div className="text-[8px] text-center text-brand-red/70 font-black uppercase tracking-[0.2em] pt-1">
                                                        +{data.exercises.length - 4} ejercicios más
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <p className="text-white/60 text-[10px] italic uppercase font-black">¡Sesión Completada!</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-center">
                                        <div className="flex items-center gap-1.5 opacity-50">
                                            <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
                                            <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.3em]">RIVAL FIT ATLETA</span>
                                        </div>
                                    </div>
                                    {previewUrl && (
                                        <button
                                            onClick={(e) => removeOverlay(overlay.id, e)}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )
                        } catch (e) { return null }
                    })()
                ) : overlay.type === 'pr_sticker' ? (
                    (() => {
                        try {
                            const prData = JSON.parse(overlay.content);
                            return (
                                <div className="relative group">
                                    <PRCard
                                        userName={currentUser?.full_name || 'Usuario'}
                                        avatarUrl={currentUser?.avatar_url || ''}
                                        sport={prData.sport}
                                        exerciseName={prData.exerciseName}
                                        weight={prData.weight}
                                        unit={prData.unit}
                                        isStory={true}
                                    />
                                    {previewUrl && (
                                        <button
                                            onClick={(e) => removeOverlay(overlay.id, e)}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )
                        } catch (e) { return null }
                    })()
                ) : overlay.type === 'image' ? (
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={overlay.content}
                            alt="Shared Content"
                            className="w-full h-auto object-contain pointer-events-none"
                            crossOrigin="anonymous"
                        />
                        {previewUrl && (
                            <button
                                onClick={(e) => removeOverlay(overlay.id, e)}
                                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
            </div >
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
                        title="Subir Historia (Máx 30s para videos)"
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
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Story</span>
                        <span className="text-[7px] font-bold text-brand-red uppercase tracking-tighter mt-1 opacity-60">Max 30s</span>
                    </div>
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
                        className={clsx(
                            "w-16 h-16 p-0.5 rounded-full ring-2 transition-all hover:scale-105 active:scale-95 bg-black relative",
                            (us.user as any).is_official
                                ? "ring-brand-red shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                : "ring-brand-red/40"
                        )}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden relative">
                            <Image
                                src={us.user.avatar_url || `https://ui-avatars.com/api/?name=${us.user.full_name}&background=random`}
                                alt={us.user.username} fill className="object-cover"
                            />
                        </div>
                        {(us.user as any).is_official && (
                            <div className="absolute -bottom-1 -right-1 bg-brand-red p-1 rounded-full border border-black shadow-lg">
                                <Trophy className="w-2.5 h-2.5 text-white" />
                            </div>
                        )}
                    </button>
                    <span className={clsx(
                        "text-[10px] font-black uppercase tracking-widest truncate max-w-[64px]",
                        (us.user as any).is_official ? "text-brand-red" : "text-gray-300"
                    )}>
                        {us.user.username}
                    </span>
                </div>
            ))}

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
                        setupPreview(file);
                        setIsVideoTrimming(false);
                        setTrimmerVideoUrl(null);
                        setVideoToEdit(null);
                    }}
                />
            )}

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
                                        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                                                onClick={() => setIsMusicPickerOpen(false)}
                                            />

                                            {/* Centered Picker Container */}
                                            <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
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
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowImageAdjust(!showImageAdjust)}
                                    className={clsx("p-2 rounded-full transition-all border border-white/5", showImageAdjust ? "bg-brand-red text-white" : "bg-black/40 text-white hover:bg-white/10")}
                                    title="Ajustar imagen"
                                >
                                    <Move className="w-5 h-5" />
                                </button>
                                <button onClick={() => setShowTextInput(true)} className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/5">
                                    <Type className="w-5 h-5 text-white" />
                                </button>
                                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 bg-black/40 rounded-full hover:bg-white/10 transition-colors border border-white/5">
                                    <Smile className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Canvas Area */}
                        <div className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden flex items-center justify-center">
                            {(() => {
                                const ext = previewFile?.name.split('.').pop()?.toLowerCase() || '';
                                const videoExts = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
                                const isVideo = previewFile?.type.startsWith('video/') || videoExts.includes(ext);

                                return isVideo ? (
                                    <video
                                        src={previewUrl}
                                        autoPlay
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover"
                                        style={{
                                            transform: `scale(${imageZoom}) translate(${(imagePositionX - 50) / imageZoom}%, ${(imagePositionY - 50) / imageZoom}%)`,
                                            transformOrigin: 'center center'
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        style={{
                                            transform: `scale(${imageZoom}) translate(${(imagePositionX - 50) / imageZoom}%, ${(imagePositionY - 50) / imageZoom}%)`,
                                            transformOrigin: 'center center'
                                        }}
                                    />
                                );
                            })()}

                            {/* Overlays Rendering */}
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                {renderOverlays(overlays)}
                            </div>

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

                            {/* Image Adjustment Controls */}
                            {showImageAdjust && (
                                <div className="absolute bottom-24 left-0 right-0 flex justify-center z-[350] pointer-events-auto px-4">
                                    <div className="bg-black/90 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/10 w-full max-w-sm shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Zoom</span>
                                                    <span className="text-sm font-black text-white">{imageZoom.toFixed(1)}x</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="3"
                                                    step="0.1"
                                                    value={imageZoom}
                                                    onChange={(e) => setImageZoom(parseFloat(e.target.value))}
                                                    className="w-full accent-brand-red cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Posición Horizontal</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={imagePositionX}
                                                    onChange={(e) => setImagePositionX(parseFloat(e.target.value))}
                                                    className="w-full accent-brand-red cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Posición Vertical</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={imagePositionY}
                                                    onChange={(e) => setImagePositionY(parseFloat(e.target.value))}
                                                    className="w-full accent-brand-red cursor-pointer h-2 bg-white/10 rounded-full appearance-none"
                                                />
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setImageZoom(1);
                                                        setImagePositionX(50);
                                                        setImagePositionY(50);
                                                    }}
                                                    className="flex-1 px-4 py-2 rounded-xl border border-white/20 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
                                                >
                                                    Resetear
                                                </button>
                                                <button
                                                    onClick={() => setShowImageAdjust(false)}
                                                    className="flex-1 px-4 py-2 rounded-xl bg-brand-red text-white font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                                                >
                                                    Listo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Overlay Controls (Resize & Delete) */}
                            {selectedOverlayId && (
                                <div className="absolute top-28 left-0 right-0 flex justify-center z-50 pointer-events-auto">
                                    <div className="bg-black/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] uppercase font-black text-gray-500 tracking-widest pl-1">Tamaño</span>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2.0"
                                                step="0.1"
                                                value={overlays.find(o => o.id === selectedOverlayId)?.scale || 1}
                                                onChange={(e) => {
                                                    const newScale = parseFloat(e.target.value);
                                                    setOverlays(prev => prev.map(o => o.id === selectedOverlayId ? { ...o, scale: newScale } : o));
                                                }}
                                                className="w-32 accent-brand-red cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
                                            />
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <button
                                            onClick={() => {
                                                setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId));
                                                setSelectedOverlayId(null);
                                            }}
                                            className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-xl transition-colors group"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Emoji Picker Modal Overlay */}

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
            )
            }

            {/* Story Viewer (Updated to show overlays) */}
            {
                selectedUserIndex !== null && currentStory && (
                    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
                        <div className="relative w-full max-w-[400px] h-[90vh] bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/5 mx-auto flex flex-col">
                            <AnimatePresence>
                                {!isPressed && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-6 inset-x-6 flex gap-1.5 z-50"
                                    >
                                        {currentUserStories?.stories?.map((_, i) => (
                                            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-white transition-all duration-100 ease-linear"
                                                    style={{ width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${progress}%` : '0%' }}
                                                />
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {!isPressed && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute top-12 left-6 right-6 flex items-center justify-between z-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border-2 border-brand-red overflow-hidden relative">
                                                <Image
                                                    src={currentUserStories?.user?.avatar_url || `https://ui-avatars.com/api/?name=${currentUserStories?.user?.full_name || 'User'}`}
                                                    alt="Avatar" fill className="object-cover"
                                                />
                                            </div>
                                            <div className="drop-shadow-lg">
                                                <p className="text-white font-black text-sm uppercase italic tracking-tighter">
                                                    {currentUserStories?.user?.full_name}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    {currentStory ? new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </p>
                                                {currentStory?.music_url && (
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
                                            <button onClick={() => setSelectedUserIndex(null)} className="p-2 bg-black/40 hover:text-brand-red text-white rounded-full backdrop-blur-md transition-colors border border-white/5 shadow-lg">
                                                <X className="w-8 h-8" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>


                            <div className="absolute inset-0 z-35 flex">
                                <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                                <div className="w-2/3 h-full cursor-pointer" onClick={nextStory} />
                            </div>


                            <motion.div
                                key={`${selectedUserIndex}-${activeStoryIndex}`}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={(_: any, info: any) => {
                                    if (info.offset.x < -100) {
                                        // Swipe left -> Next User
                                        if (selectedUserIndex < userStories.length - 1) {
                                            setSelectedUserIndex(selectedUserIndex + 1)
                                            setActiveStoryIndex(0)
                                            recordView(userStories[selectedUserIndex + 1].stories[0].id)
                                        } else {
                                            setSelectedUserIndex(null)
                                        }
                                    } else if (info.offset.x > 100) {
                                        // Swipe right -> Previous User
                                        if (selectedUserIndex > 0) {
                                            setSelectedUserIndex(selectedUserIndex - 1)
                                            const lastStoryIdx = userStories[selectedUserIndex - 1].stories.length - 1
                                            setActiveStoryIndex(lastStoryIdx)
                                            recordView(userStories[selectedUserIndex - 1].stories[lastStoryIdx].id)
                                        }
                                    }
                                }}
                                className="w-full h-full relative cursor-grab active:cursor-grabbing touch-none flex-1"
                                onMouseDown={handlePressStart}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressEnd}
                                onTouchStart={handlePressStart}
                                onTouchEnd={handlePressEnd}

                            >
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
                                ) : (() => {
                                    const ext = currentStory.media_url.split('.').pop()?.toLowerCase() || '';
                                    const videoExts = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
                                    const isVideo = currentStory.media_type === 'video' || videoExts.includes(ext);
                                    return isVideo;
                                })() ? (
                                    <video ref={storyVideoRef} src={currentStory.media_url} autoPlay playsInline className="w-full h-full object-cover pointer-events-none" />
                                ) : (
                                    <Image src={currentStory.media_url} alt="Story content" fill className="object-cover pointer-events-none" />
                                )}

                                {/* Workout Summary Overlay */}
                                {currentStory.metadata?.type === 'workout' && currentStory.metadata.summary && (
                                    <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end p-8 pointer-events-none">
                                        <motion.div
                                            layout
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowFullSummary(!showFullSummary);
                                                setIsPaused(!showFullSummary);
                                            }}
                                            className={clsx(
                                                "bg-black/60 backdrop-blur-3xl rounded-[32px] p-6 border border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 pointer-events-auto transition-all",
                                                showFullSummary ? "max-h-[500px] overflow-y-auto no-scrollbar mb-10" : "mb-0"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-brand-red rounded-xl shadow-lg shadow-brand-red/20">
                                                        <Zap className="w-5 h-5 text-white animate-pulse" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-white font-black uppercase italic tracking-tighter text-xl leading-tight truncate">
                                                            {currentStory.metadata.summary.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-brand-red font-black uppercase tracking-[0.2em]">
                                                                {currentStory.metadata.summary.sportType} PROTOCOL
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    {showFullSummary ? <ChevronDown className="w-5 h-5 text-brand-red" /> : <ChevronUp className="w-5 h-5 text-gray-500" />}
                                                </div>
                                            </div>

                                            {!showFullSummary && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Clock className="w-3.5 h-3.5 text-brand-red" />
                                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">Duración</p>
                                                        </div>
                                                        <p className="text-sm font-black text-white italic">
                                                            {Math.floor(currentStory.metadata.summary.duration / 60)}:{(currentStory.metadata.summary.duration % 60).toString().padStart(2, '0')} <span className="text-[10px] opacity-60">MIN</span>
                                                        </p>
                                                    </div>

                                                    {currentStory.metadata.summary.metrics?.distance > 0 ? (
                                                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Activity className="w-3.5 h-3.5 text-brand-red" />
                                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">Distancia</p>
                                                            </div>
                                                            <p className="text-sm font-black text-white italic">
                                                                {(currentStory.metadata.summary.metrics.distance / 1000).toFixed(2)} <span className="text-[10px] opacity-60">KM</span>
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Trophy className="w-3.5 h-3.5 text-brand-red" />
                                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-none">Status</p>
                                                            </div>
                                                            <p className="text-sm font-black text-white italic">COMPLETADO</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {showFullSummary && (
                                                <div className="space-y-4 pt-2">
                                                    {currentStory.metadata.summary.metrics?.blocks && (
                                                        <>
                                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2 italic">Bloques de Entrenamiento</p>
                                                            {currentStory.metadata.summary.metrics.blocks.map((block: any, idx: number) => (
                                                                <motion.div
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: idx * 0.1 }}
                                                                    key={idx}
                                                                    className="bg-white/5 rounded-[22px] p-4 border border-white/5"
                                                                >
                                                                    <div className="flex justify-between items-center mb-3">
                                                                        <span className="text-sm font-black text-white uppercase italic tracking-tighter">{block.title || block.type || `BLOQUE ${idx + 1}`}</span>
                                                                        <span className="text-brand-red font-black text-base italic leading-none">{block.result?.time || (block.result?.rounds ? `${block.result.rounds} RDS` : (block.result?.reps ? `${block.result.reps} REPS` : ''))}</span>
                                                                    </div>
                                                                    {block.exercises && (
                                                                        <div className="space-y-1.5">
                                                                            {block.exercises.map((ex: any, eIdx: number) => (
                                                                                <div key={eIdx} className="flex justify-between items-center text-[10px] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                                                                    <span className="text-gray-300 font-black uppercase tracking-tight truncate pr-2">{ex.name}</span>
                                                                                    <span className="text-brand-red font-black italic whitespace-nowrap">
                                                                                        {(() => {
                                                                                            const s = ex.sets?.[0];
                                                                                            const target = ex.target || ex.goal || '';

                                                                                            // Try to get logged results first
                                                                                            if (ex.value) return ex.value;

                                                                                            if (s) {
                                                                                                const weight = s.weight > 0 ? `${s.weight}KG` : '';
                                                                                                const reps = s.reps > 0 ? `${s.reps}${s.measure && s.measure !== 'reps' ? s.measure : ''}` : '';
                                                                                                if (weight && reps) return `${weight} x ${reps}`;
                                                                                                if (weight || reps) return weight || reps;
                                                                                            }

                                                                                            // Fallback to top-level properties
                                                                                            const tWeight = ex.weight > 0 ? `${ex.weight}KG` : '';
                                                                                            const tReps = ex.reps > 0 ? `${ex.reps}${ex.measure && ex.measure !== 'reps' ? ex.measure : ''}` : '';
                                                                                            if (tWeight || tReps) {
                                                                                                if (tWeight && tReps) return `${tWeight} x ${tReps}`;
                                                                                                return tWeight || tReps;
                                                                                            }

                                                                                            // Final fallback to instructions (target)
                                                                                            return target !== '-' ? target : '';
                                                                                        })()}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            ))}
                                                        </>
                                                    )}

                                                    {!currentStory.metadata.summary.metrics?.blocks && currentStory.metadata.summary.exercises && (
                                                        <>
                                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2 italic">Ejercicios Realizados</p>
                                                            <div className="space-y-2">
                                                                {currentStory.metadata.summary.exercises.map((ex: any, idx: number) => (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, x: -20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: idx * 0.05 }}
                                                                        key={idx}
                                                                        className="bg-white/5 rounded-2xl p-3 border border-white/5 flex justify-between items-center"
                                                                    >
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-xs font-black text-white uppercase italic tracking-tighter truncate">{ex.name}</span>
                                                                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{ex.sets?.length || 0} Series</span>
                                                                        </div>
                                                                        <div className="text-right flex flex-col items-end gap-1">
                                                                            {ex.sets?.map((s: any, sIdx: number) => (
                                                                                <span key={sIdx} className="text-[10px] text-brand-red font-black italic leading-none">
                                                                                    {s.weight > 0 ? `${s.weight}KG x ` : ''}{s.reps}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {!showFullSummary && currentStory.metadata.caption && (
                                                <p className="text-[11px] text-white font-medium italic opacity-80 border-l-2 border-brand-red pl-3 pt-1">
                                                    "{currentStory.metadata.caption}"
                                                </p>
                                            )}
                                        </motion.div>
                                    </div>
                                )}

                                {/* Render Viewer Overlays */}
                                <div className="absolute inset-0 z-50 pointer-events-none">
                                    {currentStory.metadata?.overlays && currentStory.metadata.overlays.map((overlay: OverlayElement) => (
                                        <div
                                            key={overlay.id}
                                            className={clsx(
                                                "absolute z-50 pointer-events-auto origin-center touch-none select-none",
                                                overlay.link && "cursor-pointer active:scale-95 hover:scale-105"
                                            )}
                                            style={{
                                                left: `${overlay.x}%`,
                                                top: `${overlay.y}%`,
                                                transform: `translate(-50%, -50%) scale(${overlay.scale || 1}) rotate(${overlay.rotation || 0}deg)`
                                            }}
                                            onClick={(e) => {
                                                if (overlay.link) {
                                                    e.stopPropagation();
                                                    setSelectedUserIndex(null);
                                                    router.push(overlay.link);
                                                }
                                            }}
                                        >
                                            {overlay.type === 'text' ? (
                                                <p
                                                    className="font-black text-2xl uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-center break-words max-w-[300px]"
                                                    style={{ color: overlay.color || 'white' }}
                                                >
                                                    {overlay.content}
                                                </p>
                                            ) : overlay.type === 'workout_sticker' ? (
                                                (() => {
                                                    try {
                                                        const data = JSON.parse(overlay.content);
                                                        const hasBlocks = data.metrics?.blocks?.length > 0;
                                                        const isExpanded = expandedWorkoutId === overlay.id;

                                                        return (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedWorkoutId(isExpanded ? null : overlay.id);
                                                                    setIsPaused(!isExpanded);
                                                                }}
                                                                className={clsx(
                                                                    "bg-black/60 backdrop-blur-3xl border border-white/10 p-5 rounded-[24px] shadow-2xl relative overflow-hidden select-none",
                                                                    isExpanded ? "w-[340px] max-h-[500px] overflow-y-auto no-scrollbar" : "w-[300px]"
                                                                )}
                                                            >
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                                                    <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center border border-brand-red/20 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                                                                        <Trophy className="w-5 h-5 text-brand-red" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-0.5">Entrenamiento</p>
                                                                        <h4 className="text-white font-black italic uppercase text-lg tracking-tighter truncate leading-none">{data.title || data.name || 'Sesión'}</h4>
                                                                    </div>
                                                                    <div className="shrink-0 flex items-center justify-center">
                                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-brand-red" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2 relative z-10">
                                                                    {hasBlocks ? (
                                                                        <div className="space-y-1.5">
                                                                            {(isExpanded ? data.metrics.blocks : data.metrics.blocks.slice(0, 3)).map((block: any, idx: number) => (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, y: 10 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    transition={{ delay: idx * 0.05 }}
                                                                                    key={idx}
                                                                                    className="flex flex-col bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors gap-2"
                                                                                >
                                                                                    <div className="flex justify-between items-center">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[10px] font-black text-white uppercase tracking-tight">{block.title || block.type || 'BLOQUE'}</span>
                                                                                            {isExpanded && block.type && (
                                                                                                <span className="text-[8px] text-brand-red/70 font-bold uppercase tracking-widest">{block.type}</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <span className="text-brand-red font-black text-sm italic tracking-tighter">
                                                                                            {block.type === 'fortime' ? block.result?.time : (block.result?.rounds ? `${block.result.rounds} RDS` : (block.result?.reps ? `${block.result.reps} REPS` : '-'))}
                                                                                        </span>
                                                                                    </div>

                                                                                    {isExpanded && block.exercises && block.exercises.length > 0 && (
                                                                                        <div className="grid grid-cols-1 gap-1.5 mt-1 border-t border-white/5 pt-2">
                                                                                            {block.exercises.map((ex: any, eIdx: number) => (
                                                                                                <div key={eIdx} className="flex justify-between items-center bg-black/20 px-2 py-1.5 rounded-lg">
                                                                                                    <span className="text-[9px] text-gray-300 font-bold uppercase truncate max-w-[150px]">{ex.name}</span>
                                                                                                    <span className="text-[9px] text-white font-black italic">{ex.value || ex.weight_kg} {ex.reps ? `x ${ex.reps}` : ''}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </motion.div>
                                                                            ))}
                                                                            {!isExpanded && data.metrics.blocks.length > 3 && (
                                                                                <div className="text-[9px] text-center text-brand-red/70 font-black uppercase tracking-[0.2em] pt-2 animate-pulse">
                                                                                    Tocar para ver +{data.metrics.blocks.length - 3} bloques
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {(data.total_volume_kg > 0 || data.max_weight) && (
                                                                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Carga Máxima</span>
                                                                                    <span className="text-brand-red font-black text-sm">{data.total_volume_kg || data.max_weight} KG</span>
                                                                                </div>
                                                                            )}
                                                                            {data.location_name && (
                                                                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lugar</span>
                                                                                    <span className="text-white font-bold text-xs truncate max-w-[150px] uppercase">{data.location_name}</span>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {!hasBlocks && !data.total_volume_kg && !data.location_name && (
                                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                                            <p className="text-white/60 text-xs italic text-center">¡Entrenamiento completado!</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="mt-4 pt-3 border-t border-white/5 flex justify-center">
                                                                    <div className="flex items-center gap-1.5 opacity-50">
                                                                        <div className="w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse" />
                                                                        <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.3em]">RIVAL FIT ATLETA</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    } catch (e) { return null }
                                                })()
                                            ) : overlay.type === 'pr_sticker' ? (
                                                (() => {
                                                    try {
                                                        const prData = JSON.parse(overlay.content);
                                                        return (
                                                            <PRCard
                                                                userName={currentUserStories?.user?.full_name || ''}
                                                                avatarUrl={currentUserStories?.user?.avatar_url || ''}
                                                                sport={prData.sport}
                                                                exerciseName={prData.exerciseName}
                                                                weight={prData.weight}
                                                                unit={prData.unit}
                                                                isStory={true}
                                                            />
                                                        )
                                                    } catch (e) { return null }
                                                })()
                                            ) : overlay.type === 'image' ? (
                                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group w-full">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={overlay.content}
                                                        alt="Shared Content"
                                                        className="w-full h-auto object-contain pointer-events-none"
                                                        crossOrigin="anonymous"
                                                    />
                                                    {previewUrl && (
                                                        <button
                                                            onClick={(e) => removeOverlay(overlay.id, e)}
                                                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <Image src={overlay.content} width={64} height={64} alt="sticker" className="drop-shadow-lg" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {!isPressed && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute bottom-10 left-0 right-0 px-6 flex items-center justify-between z-50 pointer-events-none"
                                    >
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

                                        <div className="flex items-center gap-3 pointer-events-auto">
                                            {!isOwner && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const detail: any = {
                                                            attribution: {
                                                                username: currentUserStories?.user?.username || currentUserStories?.user?.full_name,
                                                                avatar: currentUserStories?.user?.avatar_url
                                                            }
                                                        };

                                                        const postOverlay = (currentStory as any).overlays?.find((o: any) => o.type === 'workout_sticker' || o.type === 'pr_sticker');
                                                        if (postOverlay) {
                                                            detail.type = postOverlay.type === 'pr_sticker' ? 'pr' : 'workout';
                                                            detail.data = JSON.parse(postOverlay.content);
                                                        } else if (currentStory.media_type === 'video') {
                                                            detail.type = 'video';
                                                            detail.url = currentStory.media_url;
                                                        } else {
                                                            detail.type = 'image';
                                                            detail.url = currentStory.media_url;
                                                        }

                                                        window.dispatchEvent(new CustomEvent('share-to-story', { detail }));
                                                        // Close the viewer to go to the story editor
                                                        setSelectedUserIndex(null);
                                                    }}
                                                    className="p-3 rounded-full backdrop-blur-xl border bg-white/10 border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                                                >
                                                    <Share2 className="w-6 h-6" />
                                                </button>
                                            )}
                                            <button
                                                onClick={handleLike}
                                                className={clsx(
                                                    "p-3 rounded-full backdrop-blur-xl border transition-all active:scale-90 relative",
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
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Viewers List Modal */}
                            <AnimatePresence>
                                {showViewers && (
                                    <motion.div
                                        initial={{ y: '100%' }}
                                        animate={{ y: 0 }}
                                        exit={{ y: '100%' }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col pointer-events-auto"
                                    >
                                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/50">
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-5 h-5 text-brand-red" />
                                                <h3 className="text-white font-black uppercase tracking-widest text-sm">
                                                    Vistas ({(currentStory as any).views_count})
                                                </h3>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowViewers(false); }}
                                                className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                                            {(currentStory as any).viewer_details?.map((viewer: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                                    <div className="w-10 h-10 rounded-full border border-brand-red overflow-hidden relative shrink-0">
                                                        <Image
                                                            src={viewer.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${viewer.profiles?.full_name || 'User'}`}
                                                            alt={viewer.profiles?.username || 'User'}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{viewer.profiles?.full_name || 'Usuario Desconocido'}</p>
                                                        <p className="text-xs text-gray-400 truncate">@{viewer.profiles?.username || 'user'}</p>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono font-bold shrink-0">
                                                        {viewer.created_at ? new Date(viewer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                            ))}
                                            {(!(currentStory as any).viewer_details || (currentStory as any).viewer_details.length === 0) && (
                                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 pb-20">
                                                    <Eye className="w-12 h-12 mb-4 opacity-20" />
                                                    <p className="text-sm font-medium">
                                                        {(currentStory as any).views_count > 0 ? 'Cargando vistas...' : 'Aún no hay vistas'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )
            }
            {
                showPRCreator && (
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
                                        placeholder="p.ej. Cross Training"
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
                )
            }

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
        </div >
    )
}
