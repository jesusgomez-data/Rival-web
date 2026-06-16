'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Play, Heart, Eye, Users, Trash2, Music, Send, Type, Smile, Move, Zap, Clock, MapPin, Dumbbell, ChevronUp, ChevronDown } from 'lucide-react'
import { createStory, createPRStory, toggleStoryLike, recordStoryView, deleteStory, getStoryViewers } from './actions'
import { getOrCreateConversation, sendMessage } from '../messages/actions'
import { clsx } from 'clsx'
import PRCard from '../community/PRCard'
import { Trophy, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useStories } from './StoryContext'
import { useVideo } from '../VideoContext'
import { motion, AnimatePresence } from 'framer-motion'
import MusicPicker from '../MusicPicker'
import { MusicTrack } from '../MusicPicker'
import type { EmojiClickData, Theme } from 'emoji-picker-react'
import dynamic from 'next/dynamic'
import { createClient } from '@/utils/supabase/client'
import VideoEditor from '@/components/video/VideoEditor'
import { Sparkles } from 'lucide-react'
import RouteMap from '@/components/training/RouteMap'
import { isImageUrl } from '@/lib/utils'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

// ─── Exercise detail extractor (used in story cards) ─────────────────────────
function getExDetail(ex: any): string {
    // Only treat sets as array if it actually is one
    const s = Array.isArray(ex.sets) ? ex.sets[0] : undefined;
    if (s) {
        const unit = (s.unit || '').toLowerCase();
        if (unit === 'm' || unit === 'meters' || unit === 'meter') return `· ${s.reps}M`;
        if (unit === 'cal' || unit === 'calories') return `${s.reps} CAL`;
        if (unit === 'time') return `${s.reps} SEC`;
        const w = (s.weight ?? 0) > 0 ? ` · ${s.weight}KG` : '';
        if (s.reps) return `${s.reps}${w}`;
        if (w) return w.trim();
    }
    // Top-level fallbacks
    if (ex.value) return String(ex.value);
    const exUnit = (ex.unit || ex.measure || '').toLowerCase();
    const rawReps = ex.reps;
    
    // Include ex.detail as weight source if it is different from reps
    const tW_val = (ex.weight ?? ex.weight_kg ?? ex.detail ?? 0);
    const hasWeight = (typeof tW_val === 'string' && tW_val.trim().length > 0) || (typeof tW_val === 'number' && tW_val > 0);
    
    if (rawReps) {
        const repsStr = String(rawReps);
        if (exUnit === 'm' || exUnit === 'meters') return `· ${repsStr}M`;
        if (exUnit === 'cal') return `${repsStr} CAL`;
        
        const weightSuffix = (hasWeight && tW_val !== rawReps) ? ` · ${tW_val}${exUnit.includes('kg') || exUnit.includes('lb') ? '' : 'KG'}` : '';
        return `${repsStr}${weightSuffix}`;
    }
    
    if (hasWeight) return `${tW_val}${exUnit.includes('kg') || exUnit.includes('lb') ? '' : 'KG'}`;
    
    if (ex.target && ex.target !== '-') return String(ex.target);
    if (ex.detail) return `${ex.detail}${ex.unit || ''}`;
    if (ex.instructions) return String(ex.instructions);
    return '';
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
    type: 'text' | 'image' | 'sticker' | 'workout_sticker' | 'pr_sticker'
    content: string
    x: number
    y: number
    scale: number
    rotation: number
    color?: string
    link?: string
}

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '100%' : direction < 0 ? '-100%' : '0%',
        scale: 0.92,
        opacity: 0
    }),
    center: {
        x: '0%',
        scale: 1,
        opacity: 1
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '50%' : direction > 0 ? '-50%' : '0%',
        scale: 0.92,
        opacity: 0
    })
};

export default function StoryBar({ currentUser, hideBar = false }: { currentUser: any, hideBar?: boolean }) {
    const { userStories, setUserStories, refreshStories } = useStories()
    const { isMuted, toggleMute, setIsMuted } = useVideo()
    const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null)
    const [activeStoryIndex, setActiveStoryIndex] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    
    // Story DM Reply and Quick Reactions State
    const [replyText, setReplyText] = useState("")
    const [showReactions, setShowReactions] = useState(false)
    const [isSendingReply, setIsSendingReply] = useState(false)
    const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; char: string; left: number; delay: number }[]>([])
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
    const [isVideoEditing, setIsVideoEditing] = useState(false)
    const [editorVideoFile, setEditorVideoFile] = useState<File | null>(null)
    const [direction, setDirection] = useState(0)

    // Image adjustment controls (Instagram-style)
    const [imageZoom, setImageZoom] = useState(1)
    const [imagePositionX, setImagePositionX] = useState(50)
    const [imagePositionY, setImagePositionY] = useState(50)
    const [showImageAdjust, setShowImageAdjust] = useState(false)

    const [isVideoTrimming, setIsVideoTrimming] = useState(false)
    const [trimmerVideoUrl, setTrimmerVideoUrl] = useState<string | null>(null)
    const [trimStart, setTrimStart] = useState(0)
    const [isTrimmingLoading, setIsTrimmingLoading] = useState(false)
    const [videoDuration, setVideoDuration] = useState(0)
    const trimmerVideoRef = useRef<HTMLVideoElement>(null)

    // Interaction State for Dragging
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const dragStartRef = useRef<{ x: number, y: number } | null>(null)
    const [isDraggingBg, setIsDraggingBg] = useState(false)
    const bgDragStartRef = useRef<{ x: number, y: number, posX: number, posY: number } | null>(null)
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
    const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
    const [showFullSummary, setShowFullSummary] = useState(false)

    // Inline feedback — reemplaza alert() y confirm() para no freezar el móvil
    const [storyError, setStoryError] = useState<string | null>(null)
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const showError = (msg: string) => {
        setStoryError(msg)
        setTimeout(() => setStoryError(null), 5000)
    }

    // On-demand viewer fetching
    const currentUserStories = selectedUserIndex !== null ? userStories[selectedUserIndex] : null
    const currentStory = currentUserStories?.stories?.[activeStoryIndex] || null
    const isOwner = currentUserStories?.user?.id === currentUser?.id

    const storyZoom = currentStory?.metadata?.imageZoom || 1
    const storyPosX = currentStory?.metadata?.imagePositionX ?? 50
    const storyPosY = currentStory?.metadata?.imagePositionY ?? 50

    useEffect(() => {
        const fetchViewers = async () => {
            if (showViewers && currentStory?.id && isOwner) {
                const res = await getStoryViewers(currentStory.id);
                if (res.viewers) {
                    const updatedUserStories = [...userStories];
                    const targetStory = updatedUserStories[selectedUserIndex as number].stories[activeStoryIndex];
                    (targetStory as any).viewer_details = res.viewers;
                    setUserStories(updatedUserStories);
                }
            }
        };
        fetchViewers();
    }, [showViewers, currentStory?.id, isOwner]);

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

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsPaused(true);
                if (audioRef.current) audioRef.current.pause();
                if (storyVideoRef.current) storyVideoRef.current.pause();
            } else if (selectedUserIndex !== null && !showViewers && !previewUrl) {
                // Return to normal state only if a story viewer is open
                setIsPaused(false);
                if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedUserIndex, showViewers, previewUrl]);

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
            const { type, url } = customEvent.detail;

            if (type === 'video' && url) {
                // Share reel directly to story as video
                setIsUploading(true);
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const file = new File([blob], "shared_reel.mp4", { type: blob.type || 'video/mp4' });
                    setupPreview(file);

                    if (customEvent.detail.postId) {
                        const linkOverlay: OverlayElement = {
                            id: Date.now().toString(),
                            type: 'text',
                            content: '🎬 VER REEL',
                            x: 50,
                            y: 85,
                            scale: 1,
                            rotation: 0,
                            color: '#FFFFFF',
                            link: `/dashboard`
                        };
                        setTimeout(() => setOverlays([linkOverlay]), 100);
                    }
                } catch (err) {
                    console.error("Error preparing video story:", err);
                } finally {
                    setIsUploading(false);
                }
            } else if (type === 'image' && url) {
                setIsUploading(true);
                try {
                    // Fetch the image to use as the main story file (full screen background)
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const file = new File([blob], "shared_story_image.jpg", { type: blob.type });

                    setupPreview(file);

                    // Add "View Post" sticker if postId is present
                    if (customEvent.detail.postId) {
                        const linkOverlay: OverlayElement = {
                            id: Date.now().toString(),
                            type: 'text',
                            content: 'VER POST 🔗',
                            x: 50,
                            y: 85,
                            scale: 1,
                            rotation: 0,
                            color: '#FFFFFF',
                            link: `/dashboard`
                        };
                        // Use setTimeout to ensure state update happens after setupPreview's state clear
                        setTimeout(() => setOverlays([linkOverlay]), 100);
                    }
                } catch (err) {
                    console.error("Error preparing shared story:", err);
                    showError("Error al cargar la imagen para la historia.");
                } finally {
                    setIsUploading(false);
                }
            } else if (['workout', 'workout_sticker', 'class_result', 'pr'].includes(type)) {
                const data = customEvent.detail.data || customEvent.detail.content;
                const backgroundImage = customEvent.detail.backgroundImage;
                const postId = customEvent.detail.postId;

                setIsUploading(true);
                try {
                    let file: File | null = null;
                    if (backgroundImage) {
                        const response = await fetch(backgroundImage);
                        const blob = await response.blob();
                        file = new File([blob], "shared_background.jpg", { type: blob.type });
                    }

                    if (file) {
                        setupPreview(file);
                    } else {
                        // Generate a background canvas if no image
                        const canvas = document.createElement('canvas');
                        canvas.width = 1080;
                        canvas.height = 1920;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            const gradient = ctx.createRadialGradient(540, 960, 0, 540, 960, 1200);
                            gradient.addColorStop(0, '#101010');
                            gradient.addColorStop(1, '#000000');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, 1080, 1920);

                            const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
                            const genFile = new File([blob], "shared_bg.jpg", { type: 'image/jpeg' });
                            setupPreview(genFile);
                        }
                    }

                    // Add the sticker
                    const finalData = typeof data === 'object' ? { ...data, image: backgroundImage } : (() => {
                        try {
                            const parsed = JSON.parse(data);
                            return { ...parsed, image: backgroundImage };
                        } catch(e) { return { image: backgroundImage }; }
                    })();

                    const stickerOverlay: OverlayElement = {
                        id: Date.now().toString(),
                        type: type === 'pr' ? 'pr_sticker' : 'workout_sticker',
                        content: JSON.stringify(finalData),
                        x: 50,
                        y: 55,
                        scale: 1,
                        rotation: 0,
                        link: postId ? `/dashboard` : undefined
                    };

                    setTimeout(() => {
                        setOverlays([stickerOverlay]);
                        setSelectedOverlayId(stickerOverlay.id);
                    }, 200);

                } catch (err) {
                    console.error("Error sharing to story:", err);
                } finally {
                    setIsUploading(false);
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

        if (file.type.startsWith('video/')) {
            // Always open VideoEditor Pro for videos
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function () {
                window.URL.revokeObjectURL(video.src);
                setVideoDuration(video.duration);
                setEditorVideoFile(file);
                setIsVideoEditing(true);
            };
            video.onerror = function () {
                alert('Error al procesar el video. Asegúrate de que sea un formato compatible.');
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

    // Dragging Logic (Stickers & Background Image/Video)
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        // e.stopPropagation(); 
        setDraggingId(id)
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
        dragStartRef.current = { x: clientX, y: clientY }
    }

    const handleBgDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (draggingId || selectedOverlayId) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        setIsDraggingBg(true);
        bgDragStartRef.current = {
            x: clientX,
            y: clientY,
            posX: imagePositionX,
            posY: imagePositionY
        };
    };

    const handleBgDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingBg || !bgDragStartRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const deltaX = clientX - bgDragStartRef.current.x;
        const deltaY = clientY - bgDragStartRef.current.y;

        const sensitivity = 0.5; // Drag sensitivity
        const newPosX = bgDragStartRef.current.posX - (deltaX / 300) * 100 * sensitivity / imageZoom;
        const newPosY = bgDragStartRef.current.posY - (deltaY / 600) * 100 * sensitivity / imageZoom;

        setImagePositionX(Math.min(Math.max(newPosX, 0), 100));
        setImagePositionY(Math.min(Math.max(newPosY, 0), 100));
        bgDragStartRef.current = {
            x: clientX,
            y: clientY,
            posX: Math.min(Math.max(newPosX, 0), 100),
            posY: Math.min(Math.max(newPosY, 0), 100)
        };
    };

    const handleBgDragEnd = () => {
        setIsDraggingBg(false);
        bgDragStartRef.current = null;
    };

    const handleBgWheel = (e: React.WheelEvent) => {
        const zoomDelta = -e.deltaY * 0.002;
        setImageZoom(prev => Math.min(Math.max(prev + zoomDelta, 1), 3));
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (draggingId && dragStartRef.current) {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

            const deltaX = clientX - dragStartRef.current.x
            const deltaY = clientY - dragStartRef.current.y

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
        } else if (isDraggingBg && bgDragStartRef.current) {
            handleBgDragMove(e);
        }
    }

    const handleDragEnd = () => {
        if (draggingId) {
            setDraggingId(null)
            dragStartRef.current = null
        }
        if (isDraggingBg) {
            handleBgDragEnd();
        }
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
                formData.append('media_type', mediaType);
            }

            if (selectedTrack) {
                formData.append('music_url', selectedTrack.url)
                formData.append('music_title', selectedTrack.title)
                formData.append('music_artist', selectedTrack.artist)
            }
            const metadataObj: any = { overlays }
            if (imageZoom !== 1 || imagePositionX !== 50 || imagePositionY !== 50) {
                metadataObj.imageZoom = imageZoom
                metadataObj.imagePositionX = imagePositionX
                metadataObj.imagePositionY = imagePositionY
            }
            formData.append('metadata', JSON.stringify(metadataObj))

            const res = await createStory(formData)
            if (res.error) {
                console.error("Upload error:", res.error);
                showError(`Error: ${res.error}`)
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
            showError("Error crítico al subir la historia. Intenta de nuevo.");
        } finally {
            setIsUploading(false)
        }
    }

    const processTrimming = async () => {
        if (!trimmerVideoRef.current || !trimmerVideoUrl) return;

        setIsTrimmingLoading(true);
        const video = trimmerVideoRef.current;

        try {
            // Check for captureStream support (it's missing in some mobile browsers like iOS Safari)
            const captureStream = (video as any).captureStream || (video as any).mozCaptureStream;

            if (!captureStream) {
                showError("Tu navegador no soporta el recorte de video. Sube un video de menos de 30 segundos o recórtalo en tu galería antes de subirlo.");
                setIsTrimmingLoading(false);
                setIsVideoTrimming(false);
                setTrimmerVideoUrl(null);
                return;
            }

            const stream = captureStream.call(video);

            const supportedTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/ogg'];
            let mimeType = '';
            for (const type of supportedTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            if (!mimeType) {
                showError("Formato de video no compatible para recorte en este navegador.");
                setIsTrimmingLoading(false);
                return;
            }

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            // Safety timeout to prevent getting stuck
            let safetyTimeout: any;

            recorder.onstop = () => {
                if (safetyTimeout) clearTimeout(safetyTimeout);

                if (chunks.length === 0) {
                    showError("No se capturaron datos del video. Intenta de nuevo.");
                    setIsTrimmingLoading(false);
                    return;
                }

                const blob = new Blob(chunks, { type: mimeType });
                const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
                const trimmedFile = new File([blob], `trimmed_video.${extension}`, { type: mimeType });

                setupPreview(trimmedFile);
                setIsVideoTrimming(false);
                setTrimmerVideoUrl(null);
                setIsTrimmingLoading(false);
                console.log("Trimming completed successfully, size:", trimmedFile.size);
            };

            recorder.onerror = (err) => {
                console.error("MediaRecorder Error:", err);
                showError("Error durante el procesamiento del video. Intenta de nuevo.");
                setIsTrimmingLoading(false);
            };

            // Prepare video for recording
            video.currentTime = trimStart;

            const startRecording = () => {
                console.log("Starting recording loop from:", trimStart);
                video.muted = true; // Ensure it can play
                video.play().then(() => {
                    recorder.start();

                    const recordingDuration = Math.min(30, (video.duration - trimStart));

                    // Main stop logic
                    safetyTimeout = setTimeout(() => {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                            video.pause();
                        }
                    }, (recordingDuration + 1) * 1000); // Wait 1s extra to be safe

                    video.onended = () => {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                        }
                    };
                }).catch(err => {
                    console.error("Video play failed:", err);
                    alert("No se pudo iniciar el video para procesarlo. Asegúrate de que tu navegador permite la reproducción.");
                    setIsTrimmingLoading(false);
                });

                video.onseeked = null; // Clean up
            };

            if (video.readyState >= 3) {
                startRecording();
            } else {
                video.onseeked = startRecording;
            }
        } catch (err) {
            console.error("Critical error in processTrimming:", err);
            alert("Error crítico al procesar el video.");
            setIsTrimmingLoading(false);
        }
    };

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
                showError(res.error)
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

        if (!confirmingDelete) {
            setConfirmingDelete(true)
            setTimeout(() => setConfirmingDelete(false), 4000)
            return
        }
        setConfirmingDelete(false)
        const res = await deleteStory(currentStory.id)
        if (res.error) {
            showError(res.error)
        } else {
            if (currentUserStories.stories.length === 1) {
                setSelectedUserIndex(null)
            } else {
                nextStory()
            }
            await refreshStories()
        }
    }

    const handleSendReply = async () => {
        if (!replyText.trim() || !currentUserStories?.user?.id || !currentStory) return

        setIsSendingReply(true)
        setIsPaused(true)
        if (storyVideoRef.current) storyVideoRef.current.pause()
        if (audioRef.current) audioRef.current.pause()

        try {
            const res = await getOrCreateConversation(currentUserStories.user.id)
            if (res.error) {
                showError("No se pudo iniciar la conversación: " + res.error)
                setIsSendingReply(false)
                setIsPaused(false)
                return
            }

            const conversationId = res.conversationId
            if (!conversationId) {
                showError("No se pudo obtener el ID de la conversación.")
                setIsSendingReply(false)
                setIsPaused(false)
                return
            }

            // Detect media to attach
            const isVideo = currentStory.media_type === 'video'
            const isImage = currentStory.media_type === 'image'
            const isPr = currentStory.media_type === 'pr'
            
            let attachImageUrl: string | undefined = undefined
            let attachVideoUrl: string | undefined = undefined

            if (isImage) {
                attachImageUrl = currentStory.media_url
            } else if (isVideo) {
                attachVideoUrl = currentStory.media_url
            } else if (isPr) {
                try {
                    const prObj = JSON.parse(currentStory.media_url)
                    if (prObj.backgroundImage) attachImageUrl = prObj.backgroundImage
                } catch (e) {}
            }

            const sendRes = await sendMessage(
                conversationId,
                `Respondió a tu historia: "${replyText.trim()}"`,
                attachImageUrl,
                attachVideoUrl
            )

            if (sendRes.error) {
                showError("Error al enviar mensaje: " + sendRes.error)
            } else {
                setReplyText("")
                setShowReactions(false)
                setIsPaused(false)
                if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {})
                if (currentStory.music_url && audioRef.current && !isMuted) audioRef.current.play().catch(() => {})
                
                const notice = document.createElement('div')
                notice.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] bg-brand-green/90 backdrop-blur-md text-white text-xs font-black px-4 py-2.5 rounded-full shadow-lg'
                notice.innerText = '¡Respuesta enviada!'
                document.body.appendChild(notice)
                setTimeout(() => notice.remove(), 2500)
            }
        } catch (err: any) {
            showError("Error crítico al enviar respuesta: " + (err.message || err))
        } finally {
            setIsSendingReply(false)
        }
    }

    const handleSendReaction = async (emoji: string) => {
        if (!currentUserStories?.user?.id || !currentStory) return

        setIsPaused(true)
        if (storyVideoRef.current) storyVideoRef.current.pause()
        if (audioRef.current) audioRef.current.pause()

        const count = 18
        const newFloating: typeof floatingEmojis = []
        for (let i = 0; i < count; i++) {
            newFloating.push({
                id: Date.now() + i + Math.random(),
                char: emoji,
                left: 10 + Math.random() * 80,
                delay: Math.random() * 0.4
            })
        }
        setFloatingEmojis(newFloating)
        setTimeout(() => {
            setFloatingEmojis([])
        }, 3000)

        setShowReactions(false)

        try {
            const res = await getOrCreateConversation(currentUserStories.user.id)
            if (res.error) {
                showError("No se pudo reaccionar: " + res.error)
                setIsPaused(false)
                return
            }

            const conversationId = res.conversationId
            if (!conversationId) {
                setIsPaused(false)
                return
            }

            const isVideo = currentStory.media_type === 'video'
            const isImage = currentStory.media_type === 'image'
            const isPr = currentStory.media_type === 'pr'
            
            let attachImageUrl: string | undefined = undefined
            let attachVideoUrl: string | undefined = undefined

            if (isImage) {
                attachImageUrl = currentStory.media_url
            } else if (isVideo) {
                attachVideoUrl = currentStory.media_url
            } else if (isPr) {
                try {
                    const prObj = JSON.parse(currentStory.media_url)
                    if (prObj.backgroundImage) attachImageUrl = prObj.backgroundImage
                } catch (e) {}
            }

            const sendRes = await sendMessage(
                conversationId,
                `Reaccionó a tu historia: ${emoji}`,
                attachImageUrl,
                attachVideoUrl
            )

            if (sendRes.error) {
                showError("Error al enviar reacción: " + sendRes.error)
            }
        } catch (err: any) {
            console.error("Reaction sending failed:", err)
        } finally {
            setTimeout(() => {
                setIsPaused(false)
                if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {})
                if (currentStory.music_url && audioRef.current && !isMuted) audioRef.current.play().catch(() => {})
            }, 1000)
        }
    }

    const nextStory = () => {
        if (selectedUserIndex === null) return
        setDirection(1)
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
        setDirection(-1)
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


    useEffect(() => {
        if (selectedUserIndex !== null && currentStory?.music_url && !showViewers && !previewUrl && !isPaused) {
            if (audioRef.current) {
                if (audioRef.current.src !== currentStory.music_url) {
                    audioRef.current.src = currentStory.music_url;
                }
                audioRef.current.currentTime = 0;
                audioRef.current.muted = isMuted;
                audioRef.current.play().catch(e => console.log("Audio play blocked by browser"));
            }
        } else {
            if (audioRef.current) audioRef.current.pause();
        }
    }, [selectedUserIndex, activeStoryIndex, showViewers, currentStory?.music_url, previewUrl, isPaused])

    // Sync mute state changes instantly without restarting the track
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
            if (!isMuted && selectedUserIndex !== null && currentStory?.music_url && !showViewers && !previewUrl && !isPaused) {
                audioRef.current.play().catch(e => console.log("Audio play blocked by browser"));
            }
        }
    }, [isMuted, selectedUserIndex, currentStory?.music_url, showViewers, previewUrl, isPaused])

    // Story Progression Logic (driven by dynamic timer for images/PRs, or video element for videos)
    useEffect(() => {
        let interval: any;
        if (selectedUserIndex !== null && !showViewers && !isPaused && !previewUrl && currentStory) {
            if (currentStory.media_type === 'video') {
                // Video progression is handled by the video element's event handlers
                return;
            }
            
            // Standard image / PR card duration (5 seconds)
            const storyDuration = 5000;
            const step = 50;

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
    }, [selectedUserIndex, activeStoryIndex, isPaused, showViewers, previewUrl, currentStory?.media_type]);

    const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const pressStartTimeRef = useRef<number>(0);
    const dragStartCoordsRef = useRef<{ x: number; y: number } | null>(null);

    const handleGestureDown = (e: React.MouseEvent | React.TouchEvent) => {
        const isTouch = 'touches' in e;
        const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStartCoordsRef.current = { x: clientX, y: clientY };
        pressStartTimeRef.current = Date.now();
        
        if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
        pressTimerRef.current = setTimeout(() => {
            setIsPressed(true);
            setIsPaused(true);
            if (storyVideoRef.current) storyVideoRef.current.pause();
            if (audioRef.current) audioRef.current.pause();
        }, 200); // 200ms of holding activates "pause" & hides UI
    };

    const handleGestureUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }

        const isTouch = 'touches' in e || 'changedTouches' in e;
        const touchEvent = e as React.TouchEvent;
        const mouseEvent = e as React.MouseEvent;
        
        const clientX = isTouch 
            ? (touchEvent.changedTouches?.[0]?.clientX ?? touchEvent.touches?.[0]?.clientX ?? 0)
            : mouseEvent.clientX;
        const clientY = isTouch 
            ? (touchEvent.changedTouches?.[0]?.clientY ?? touchEvent.touches?.[0]?.clientY ?? 0)
            : mouseEvent.clientY;

        const duration = Date.now() - pressStartTimeRef.current;

        // Check if user dragged/swiped (movement > 12px)
        let isDrag = false;
        if (dragStartCoordsRef.current) {
            const dx = Math.abs(clientX - dragStartCoordsRef.current.x);
            const dy = Math.abs(clientY - dragStartCoordsRef.current.y);
            if (dx > 12 || dy > 12) {
                isDrag = true;
            }
        }

        if (isPressed) {
            // It was a long press: release and resume
            setIsPressed(false);
            setIsPaused(false);
            if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {});
            if (currentStory?.music_url && audioRef.current && !isMuted) {
                audioRef.current.play().catch(() => {});
            }
        } else if (!isDrag) {
            // Only navigate if it was not a drag/swipe
            const rect = e.currentTarget.getBoundingClientRect();
            const xPercent = ((clientX - rect.left) / rect.width) * 100;

            if (xPercent < 30) {
                prevStory();
            } else {
                nextStory();
            }
        }
        dragStartCoordsRef.current = null;
    };

    const handleGestureLeave = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        if (isPressed) {
            setIsPressed(false);
            setIsPaused(false);
            if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {});
            if (currentStory?.music_url && audioRef.current && !isMuted) {
                audioRef.current.play().catch(() => {});
            }
        }
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
                            const wodBlocks = data.blocks || data.metrics?.blocks || [];
                            const hasWodBlocks = wodBlocks.length > 0;
                            const category = data.category || data.metrics?.type?.toUpperCase() || '';
                            const isEndurance = ['RUNNING','CYCLING','SWIMMING'].includes(category) || data.sport_type?.toLowerCase() === 'running';

                            // Endurance metrics from WodCreator block config or GPS metrics
                            const firstBlock = wodBlocks[0];
                            const endDist = firstBlock?.config?.distance || (data.metrics?.distance ? `${(data.metrics.distance / 1000).toFixed(2)} KM` : null);
                            const endPace = firstBlock?.config?.pace || data.metrics?.pace || null;
                            const endTime = data.summary?.totalTime || data.metrics?.time || null;
                            const endFormat = firstBlock?.format || null;
                            const endElevation = firstBlock?.config?.frequency || (data.metrics?.elevation ? `${data.metrics.elevation}M` : null);

                            const SPORT_META: Record<string, { label: string; icon: string; color: string; paceLabel: string; paceUnit: string }> = {
                                RUNNING:  { label: 'RUNNING',  icon: '🏃', color: '#3b82f6', paceLabel: 'RITMO',     paceUnit: '/KM'  },
                                CYCLING:  { label: 'CYCLING',  icon: '🚴', color: '#22c55e', paceLabel: 'VELOCIDAD', paceUnit: 'KM/H' },
                                SWIMMING: { label: 'SWIMMING', icon: '🏊', color: '#06b6d4', paceLabel: 'RITMO',     paceUnit: '/100M'},
                            };
                            const sportMeta = SPORT_META[category] || SPORT_META['RUNNING'];

                            return (
                                <div className="bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl w-[300px] max-w-[calc(100vw-40px)] relative overflow-hidden group select-none transition-all">
                                    {/* Top accent line */}
                                    <div className="h-[2px] w-full" style={{ background: isEndurance ? `linear-gradient(90deg, ${sportMeta.color}, transparent)` : 'linear-gradient(90deg, #ef4444, transparent)' }} />

                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center border text-lg"
                                                style={{ background: isEndurance ? `${sportMeta.color}15` : 'rgba(239,68,68,0.1)', borderColor: isEndurance ? `${sportMeta.color}30` : 'rgba(239,68,68,0.2)' }}>
                                                {isEndurance ? sportMeta.icon : '🏋️'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5"
                                                    style={{ color: isEndurance ? sportMeta.color : '#ef4444' }}>
                                                    {isEndurance ? sportMeta.label : `WOD · ${category || 'CROSS TRAINING'}`}
                                                    {endFormat && isEndurance && <span className="text-white/30 ml-1">· {endFormat}</span>}
                                                </p>
                                                <h4 className="text-white font-black italic uppercase text-base tracking-tighter truncate leading-none">
                                                    {data.title || 'WORKOUT OF THE DAY'}
                                                </h4>
                                            </div>
                                        </div>

                                        {/* ENDURANCE: Strava-style stats */}
                                        {isEndurance ? (
                                            <div className="rounded-2xl p-3 space-y-3" style={{ background: `${sportMeta.color}08`, border: `1px solid ${sportMeta.color}20` }}>
                                                {/* Distance hero */}
                                                <div className="text-center pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.4em] mb-1">DISTANCIA</p>
                                                    <div className="flex items-baseline justify-center gap-1">
                                                        <span className="text-4xl font-black italic text-white tracking-tighter leading-none">
                                                            {endDist ? endDist.replace(/[A-Za-z\s]/g, '').trim() || endDist : '--'}
                                                        </span>
                                                        <span className="text-sm font-black italic uppercase" style={{ color: sportMeta.color }}>
                                                            {endDist ? 'KM' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Pace + Time grid */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="text-center">
                                                        <p className="text-[6px] font-black text-white/30 uppercase tracking-widest">{sportMeta.paceLabel}</p>
                                                        <p className="text-base font-black italic text-white tracking-tighter">{endPace || '--'}</p>
                                                        <p className="text-[6px] font-bold uppercase" style={{ color: sportMeta.color }}>{sportMeta.paceUnit}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[6px] font-black text-white/30 uppercase tracking-widest">TIEMPO</p>
                                                        <p className="text-base font-black italic text-white tracking-tighter">{endTime || '--'}</p>
                                                        <p className="text-[6px] font-bold uppercase" style={{ color: sportMeta.color }}>MIN</p>
                                                    </div>
                                                </div>
                                                {/* Elevation if available */}
                                                {endElevation && (
                                                    <div className="text-center pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <p className="text-[6px] font-black text-white/30 uppercase tracking-widest">DESNIVEL</p>
                                                        <p className="text-sm font-black italic text-white">{endElevation} <span className="text-[8px]" style={{ color: sportMeta.color }}>D+</span></p>
                                                    </div>
                                                )}
                                                {/* Pace bars decoration */}
                                                <div className="flex items-end gap-0.5 h-4 opacity-20">
                                                    {[40,60,45,80,55,90,65,75,85,70,60,55,75,80,65,50,70,85,60,45].map((h, i) => (
                                                        <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: sportMeta.color }} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : hasWodBlocks ? (
                                            // STANDARD WOD BLOCKS
                                            <div className="space-y-1.5">
                                                {wodBlocks.slice(0, 3).map((block: any, idx: number) => (
                                                    <div key={idx} className="bg-white/[0.04] border border-white/5 p-2.5 rounded-xl">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[8px] font-black text-brand-red uppercase tracking-widest">{block.format || block.type || 'LIBRE'}</span>
                                                            {block.title && !block.title.startsWith('BLOCK') && (
                                                                <span className="text-[7px] font-bold text-gray-500 uppercase tracking-wider">{block.title}</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {(block.exercises || []).slice(0, 3).map((ex: any, eIdx: number) => {
                                                                const d2 = getExDetail(ex);
                                                                return (
                                                                    <div key={eIdx} className="flex items-center justify-between">
                                                                        <span className="text-[9px] font-bold text-white/80 uppercase tracking-tight truncate flex-1 pr-2">{ex.name}</span>
                                                                        {d2 && <span className="text-[9px] font-black text-brand-red shrink-0">{d2}</span>}
                                                                    </div>
                                                                );
                                                            })}
                                                            {(block.exercises || []).length > 3 && (
                                                                <p className="text-[7px] text-gray-600 font-bold uppercase tracking-widest">+{block.exercises.length - 3} más</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {wodBlocks.length > 3 && (
                                                    <p className="text-[8px] text-center text-brand-red/60 font-black uppercase tracking-[0.2em] pt-1">+{wodBlocks.length - 3} bloques más</p>
                                                )}
                                            </div>
                                        ) : data.exercises && data.exercises.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {data.exercises.slice(0, 4).map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                        <span className="text-[9px] font-black text-white uppercase tracking-tight truncate flex-1 pr-2">{ex.name}</span>
                                                        <span className="text-brand-red font-black text-xs italic tracking-tighter shrink-0">{ex.sets?.length || 0} SERIES</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : data.metrics?.path && data.metrics.path.length > 1 ? (
                                            <div className="bg-black/40 p-3 rounded-2xl border border-white/10 flex flex-col items-center">
                                                <RouteMap path={data.metrics.path} className="w-20 h-20 mb-2" color="#DC2626" />
                                                <div className="grid grid-cols-2 gap-3 w-full text-center">
                                                    <div>
                                                        <p className="text-white font-black italic text-[10px]">{(data.metrics.distance / 1000).toFixed(2)} km</p>
                                                        <p className="text-[6px] text-gray-500 font-black uppercase tracking-widest">Distancia</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-black italic text-[10px]">{data.metrics.pace}</p>
                                                        <p className="text-[6px] text-gray-500 font-black uppercase tracking-widest">Ritmo</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <p className="text-white/60 text-[10px] italic uppercase font-black">¡Sesión Completada!</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-4 pb-3 flex justify-center">
                                        <div className="flex items-center gap-1.5 opacity-40">
                                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isEndurance ? sportMeta.color : '#ef4444' }} />
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
                            const displayUser = currentUser?.full_name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || 'Usuario';
                            const displayAvatar = currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url || '';
                            
                            return (
                                <div className="relative group">
                                    <PRCard
                                        userName={displayUser}
                                        avatarUrl={displayAvatar}
                                        sport={prData.sport || 'Cross Training'}
                                        exerciseName={prData.exerciseName}
                                        weight={prData.weight}
                                        unit={prData.unit}
                                        backgroundImage={prData.image || prData.backgroundImage || previewUrl || ''}
                                        isStory={true}
                                    />
                                    {previewUrl && (
                                        <button
                                            onClick={(e) => removeOverlay(overlay.id, e)}
                                            className="absolute -top-4 -right-4 bg-red-600/80 backdrop-blur-md text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-[100]"
                                        >
                                            <X className="w-4 h-4" />
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
                        {overlay.content && isImageUrl(overlay.content) && (
                            <Image src={overlay.content} width={64} height={64} alt="sticker" className="drop-shadow-lg" />
                        )}
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
        <div className={clsx("relative", hideBar ? "w-0 h-0 overflow-visible" : "flex gap-4 overflow-x-auto pb-4 no-scrollbar items-center select-none")}>
            {!hideBar && (
                <>
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
                        <span className="text-[7px] font-bold text-brand-red uppercase tracking-tighter mt-1 opacity-60">+ Editor</span>
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
            {userStories.map((us, idx) => {
                const hasUnseen = us.stories.some((s: any) => !s.has_seen);
                return (
                    <div key={us.user.id} className="flex flex-col items-center gap-2 shrink-0">
                        <div className={clsx(
                            "rounded-full p-[3px] transition-all hover:scale-105 active:scale-95",
                            hasUnseen 
                                ? "bg-gradient-to-tr from-brand-red via-orange-500 to-amber-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" 
                                : "bg-zinc-800"
                        )}>
                            <button
                                onClick={() => {
                                    setDirection(0)
                                    setSelectedUserIndex(idx)
                                    setActiveStoryIndex(0)
                                    recordView(us.stories[0].id)
                                    setIsMuted(false)
                                }}
                                className="w-16 h-16 rounded-full p-0.5 bg-black relative block border-2 border-black"
                            >
                                <div className="w-full h-full rounded-full overflow-hidden relative">
                                    <Image
                                        src={us.user.avatar_url || `https://ui-avatars.com/api/?name=${us.user.full_name}&background=random`}
                                        alt={us.user?.username || us.user?.full_name || 'user'} fill className="object-cover"
                                    />
                                </div>
                                {(us.user as any).is_official && (
                                    <div className="absolute -bottom-1 -right-1 bg-brand-red p-1 rounded-full border border-black shadow-lg z-10">
                                        <Trophy className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}
                            </button>
                        </div>
                        <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest truncate max-w-[64px]",
                            (us.user as any).is_official ? "text-brand-red" : "text-gray-300"
                        )}>
                            {us.user?.username || us.user?.full_name?.split(' ')[0] || 'Usuario'}
                        </span>
                    </div>
                );
            })}
                </>
            )}

            {/* Video Trimmer Modal */}
            {isVideoTrimming && trimmerVideoUrl && (
                <div className="fixed inset-0 z-[400] bg-black/98 flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-brand-gray border border-white/10 w-full max-w-md rounded-[40px] p-8 shadow-2xl relative">
                        <button
                            onClick={() => { setIsVideoTrimming(false); setTrimmerVideoUrl(null); }}
                            className="absolute top-8 right-8 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Recortar Video</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tu video dura {Math.round(videoDuration)}s - Recorta a máximo 30s</p>
                        </div>

                        <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/10 mb-8">
                            <video
                                ref={trimmerVideoRef}
                                src={trimmerVideoUrl}
                                className="w-full h-full object-cover"
                                loop
                                muted
                                playsInline
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Punto de inicio</label>
                                    <span className="text-xl font-black text-brand-red italic">{Math.floor(trimStart)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={Math.max(0, videoDuration - 30)}
                                    step="0.5"
                                    value={trimStart}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setTrimStart(val);
                                        if (trimmerVideoRef.current) trimmerVideoRef.current.currentTime = val;
                                    }}
                                    className="w-full accent-brand-red h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[8px] font-bold text-gray-600 uppercase">
                                    <span>Inicio</span>
                                    <span>Fin - 30s</span>
                                </div>
                            </div>

                            <button
                                onClick={processTrimming}
                                disabled={isTrimmingLoading}
                                className="w-full bg-brand-red text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {isTrimmingLoading ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>
                                ) : (
                                    <><Plus className="w-5 h-5" /> Confirmar Recorte</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
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
                                <button
                                    onClick={() => {
                                        if (previewFile) {
                                            setEditorVideoFile(previewFile);
                                            setIsVideoEditing(true);
                                        }
                                    }}
                                    className="p-2 bg-brand-red rounded-full hover:bg-brand-red/80 transition-all border border-white/20 shadow-glow"
                                    title="Editar con Video Pro"
                                >
                                    <Sparkles className="w-5 h-5 text-white" />
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
                        <div 
                            className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                            onMouseDown={handleBgDragStart}
                            onTouchStart={handleBgDragStart}
                            onWheel={handleBgWheel}
                        >
                            {/* Drag & Zoom Info Badge */}
                            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 z-30 pointer-events-none flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-3 duration-500">
                                <Move className="w-3.5 h-3.5 text-brand-red animate-pulse" />
                                <span className="text-[8px] font-black text-white uppercase tracking-[0.15em]">Arrastra la foto para encuadrar • Scroll/Rueda para Zoom</span>
                            </div>

                            {previewFile?.type.startsWith('video/') ? (
                                <video
                                    src={previewUrl}
                                    autoPlay
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover pointer-events-none"
                                    style={{
                                        transform: `scale(${imageZoom}) translate(${(50 - imagePositionX) / imageZoom}%, ${(50 - imagePositionY) / imageZoom}%)`,
                                        transformOrigin: 'center center'
                                    }}
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover pointer-events-none"
                                    style={{
                                        transform: `scale(${imageZoom}) translate(${(50 - imagePositionX) / imageZoom}%, ${(50 - imagePositionY) / imageZoom}%)`,
                                        transformOrigin: 'center center'
                                    }}
                                />
                            )}

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
                                            theme={"dark" as any}
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
            <AnimatePresence>
                {selectedUserIndex !== null && currentStory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 dark-section keep-all"
                    >
                        {/* Background Blur Backdrop */}
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 select-none transition-all duration-500 blur-3xl scale-110">
                            {currentStory.media_type === 'video' ? (
                                <video src={currentStory.media_url} muted loop autoPlay className="w-full h-full object-cover" />
                            ) : (
                                <img src={currentStory.media_url} className="w-full h-full object-cover" alt="" />
                            )}
                        </div>

                        <motion.div
                            initial={{ scale: 0.9, y: 80, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 80, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0.1, bottom: 0.8 }}
                            onDragEnd={(_: any, info: any) => {
                                if (info.offset.y > 150) {
                                    setSelectedUserIndex(null)
                                    if (audioRef.current) audioRef.current.pause()
                                }
                            }}
                            className="relative w-full max-w-[400px] h-[90vh] bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/5 mx-auto flex flex-col keep-all z-10"
                        >
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
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                            className="p-2 bg-black/40 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all border border-white/5 shadow-lg group/mute"
                                        >
                                            {isMuted ? <Music className="w-5 h-5 opacity-40 shrink-0" /> : <Music className="w-5 h-5 text-brand-red shrink-0" />}
                                        </button>
                                        {isOwner && (
                                            confirmingDelete ? (
                                                <button
                                                    onClick={handleDeleteStory}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-black rounded-full backdrop-blur-md transition-all animate-pulse"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> ¿Confirmar?
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleDeleteStory}
                                                    className="p-2 bg-black/40 hover:bg-red-500/60 text-white rounded-full backdrop-blur-md transition-all group/delete"
                                                    title="Eliminar historia"
                                                >
                                                    <Trash2 className="w-5 h-5 group-hover/delete:scale-110 transition-transform" />
                                                </button>
                                            )
                                        )}
                                        <button onClick={() => setSelectedUserIndex(null)} className="p-2 bg-black/40 hover:text-brand-red text-white rounded-full backdrop-blur-md transition-colors border border-white/5 shadow-lg">
                                            <X className="w-8 h-8" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>


                        <div className="relative flex-1 w-full overflow-hidden">
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.div
                                    key={`${selectedUserIndex}-${activeStoryIndex}`}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 }
                                    }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.4}
                                    onDragEnd={(_: any, info: any) => {
                                        if (info.offset.x < -60) {
                                            setDirection(1)
                                            if (selectedUserIndex < userStories.length - 1) {
                                                setSelectedUserIndex(selectedUserIndex + 1)
                                                setActiveStoryIndex(0)
                                                recordView(userStories[selectedUserIndex + 1].stories[0].id)
                                            } else {
                                                setSelectedUserIndex(null)
                                            }
                                        } else if (info.offset.x > 60) {
                                            setDirection(-1)
                                            if (selectedUserIndex > 0) {
                                                setSelectedUserIndex(selectedUserIndex - 1)
                                                const lastStoryIdx = userStories[selectedUserIndex - 1].stories.length - 1
                                                setActiveStoryIndex(lastStoryIdx)
                                                recordView(userStories[selectedUserIndex - 1].stories[lastStoryIdx].id)
                                            }
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
                                    onMouseDown={handleGestureDown}
                                    onMouseUp={handleGestureUp}
                                    onMouseLeave={handleGestureLeave}
                                    onTouchStart={handleGestureDown}
                                    onTouchEnd={handleGestureUp}
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
                            ) : currentStory.media_type === 'video' ? (
                                <video
                                    ref={storyVideoRef}
                                    src={currentStory.media_url}
                                    autoPlay
                                    playsInline
                                    muted={isMuted}
                                    className="w-full h-full object-cover pointer-events-none animate-in fade-in duration-300"
                                    style={{
                                        transform: `scale(${storyZoom}) translate(${(50 - storyPosX) / storyZoom}%, ${(50 - storyPosY) / storyZoom}%)`,
                                        transformOrigin: 'center center'
                                    }}
                                    onTimeUpdate={(e) => {
                                        const video = e.currentTarget;
                                        if (video.duration && !isPaused) {
                                            setProgress((video.currentTime / video.duration) * 100);
                                        }
                                    }}
                                    onEnded={() => {
                                        nextStory();
                                    }}
                                    onPlay={(e) => {
                                        if (isPaused) e.currentTarget.pause();
                                    }}
                                />
                            ) : (
                                <img
                                    src={currentStory.media_url}
                                    alt="Story content"
                                    className="w-full h-full object-cover pointer-events-none animate-in fade-in duration-300"
                                    style={{
                                        transform: `scale(${storyZoom}) translate(${(50 - storyPosX) / storyZoom}%, ${(50 - storyPosY) / storyZoom}%)`,
                                        transformOrigin: 'center center'
                                    }}
                                />
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
                                                        <p className="text-sm font-black text-white italic whitespace-nowrap overflow-hidden text-ellipsis mb-1">
                                                            {(currentStory.metadata?.summary?.title) || 'Sesión de Entrenamiento'}
                                                        </p>
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
                            <div className={clsx("absolute inset-0 z-50 pointer-events-none transition-opacity duration-200", isPressed ? "opacity-0" : "opacity-100")}>
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
                                                    const wodBlocks2 = data.blocks || data.metrics?.blocks || [];
                                                    const hasBlocks = wodBlocks2.length > 0;
                                                    const isExpanded = expandedWorkoutId === overlay.id;
                                                    const category2 = data.category || data.metrics?.type?.toUpperCase() || '';
                                                    const isEnd2 = ['RUNNING','CYCLING','SWIMMING'].includes(category2) || data.sport_type?.toLowerCase() === 'running';
                                                    const fBlock2 = wodBlocks2[0];
                                                    const e2Dist = fBlock2?.config?.distance || (data.metrics?.distance ? `${(data.metrics.distance / 1000).toFixed(2)} KM` : null);
                                                    const e2Pace = fBlock2?.config?.pace || data.metrics?.pace || null;
                                                    const e2Time = data.summary?.totalTime || data.metrics?.time || null;
                                                    const e2Elev = fBlock2?.config?.frequency || (data.metrics?.elevation ? `${data.metrics.elevation}M` : null);
                                                    const SPORT_META2: Record<string, { label: string; icon: string; color: string; paceLabel: string; paceUnit: string }> = {
                                                        RUNNING:  { label: 'RUNNING',  icon: '🏃', color: '#3b82f6', paceLabel: 'RITMO',     paceUnit: '/KM'  },
                                                        CYCLING:  { label: 'CYCLING',  icon: '🚴', color: '#22c55e', paceLabel: 'VELOCIDAD', paceUnit: 'KM/H' },
                                                        SWIMMING: { label: 'SWIMMING', icon: '🏊', color: '#06b6d4', paceLabel: 'RITMO',     paceUnit: '/100M'},
                                                    };
                                                    const sMeta2 = SPORT_META2[category2] || SPORT_META2['RUNNING'];

                                                    return (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedWorkoutId(isExpanded ? null : overlay.id);
                                                                setIsPaused(!isExpanded);
                                                            }}
                                                            className={clsx(
                                                                "bg-black/70 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl relative overflow-hidden select-none",
                                                                isExpanded ? "w-[320px] max-h-[480px] overflow-y-auto no-scrollbar" : "w-[280px]"
                                                            )}
                                                        >
                                                            <div className="h-[2px] w-full" style={{ background: isEnd2 ? `linear-gradient(90deg, ${sMeta2.color}, transparent)` : 'linear-gradient(90deg, #ef4444, transparent)' }} />
                                                            <div className="p-4">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border text-base"
                                                                        style={{ background: isEnd2 ? `${sMeta2.color}15` : 'rgba(239,68,68,0.1)', borderColor: isEnd2 ? `${sMeta2.color}30` : 'rgba(239,68,68,0.2)' }}>
                                                                        {isEnd2 ? sMeta2.icon : '🏋️'}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: isEnd2 ? sMeta2.color : '#ef4444' }}>
                                                                            {isEnd2 ? sMeta2.label : 'ENTRENAMIENTO'}
                                                                        </p>
                                                                        <h4 className="text-white font-black italic uppercase text-base tracking-tighter truncate leading-none">{data.title || data.name || 'Sesión'}</h4>
                                                                    </div>
                                                                    <div className="shrink-0">{isExpanded ? <ChevronUp className="w-4 h-4 text-brand-red" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}</div>
                                                                </div>

                                                                {isEnd2 ? (
                                                                    // ENDURANCE VIEWER
                                                                    <div className="rounded-xl p-3 space-y-2" style={{ background: `${sMeta2.color}08`, border: `1px solid ${sMeta2.color}20` }}>
                                                                        <div className="text-center pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                                            <p className="text-[6px] font-black text-white/30 uppercase tracking-[0.4em] mb-1">DISTANCIA</p>
                                                                            <div className="flex items-baseline justify-center gap-1">
                                                                                <span className="text-3xl font-black italic text-white tracking-tighter">{e2Dist ? e2Dist.replace(/[A-Za-z\s]/g, '').trim() || e2Dist : '--'}</span>
                                                                                <span className="text-sm font-black italic uppercase" style={{ color: sMeta2.color }}>{e2Dist ? 'KM' : ''}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="text-center">
                                                                                <p className="text-[6px] font-black text-white/30 uppercase tracking-widest">{sMeta2.paceLabel}</p>
                                                                                <p className="text-sm font-black italic text-white">{e2Pace || '--'}</p>
                                                                                <p className="text-[6px] font-bold uppercase" style={{ color: sMeta2.color }}>{sMeta2.paceUnit}</p>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <p className="text-[6px] font-black text-white/30 uppercase tracking-widest">TIEMPO</p>
                                                                                <p className="text-sm font-black italic text-white">{e2Time || '--'}</p>
                                                                                <p className="text-[6px] font-bold uppercase" style={{ color: sMeta2.color }}>MIN</p>
                                                                            </div>
                                                                        </div>
                                                                        {e2Elev && <div className="text-center pt-1 text-xs font-black text-white">{e2Elev} <span className="text-[8px]" style={{ color: sMeta2.color }}>D+</span></div>}
                                                                        <div className="flex items-end gap-0.5 h-3 opacity-20">
                                                                            {[40,60,45,80,55,90,65,75,85,70,60,55,75,80,65].map((h, i) => (
                                                                                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: sMeta2.color }} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : hasBlocks ? (
                                                                    <div className="space-y-1.5">
                                                                        {(isExpanded ? wodBlocks2 : wodBlocks2.slice(0, 3)).map((block: any, idx: number) => (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                transition={{ delay: idx * 0.05 }}
                                                                                key={idx}
                                                                                className="flex flex-col bg-white/5 p-3 rounded-xl border border-white/5 gap-2"
                                                                            >
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <span className="text-[10px] font-black text-white uppercase">{block.title || block.type || 'BLOQUE'}</span>
                                                                                    {block.rounds && <span className="text-[9px] text-brand-red font-black">{block.rounds} RDS</span>}
                                                                                </div>
                                                                                {block.exercises?.length > 0 && (
                                                                                    <div className="grid gap-1 border-t border-white/5 pt-1.5">
                                                                                        {block.exercises.map((ex: any, eIdx: number) => {
                                                                                            const detail = getExDetail(ex);
                                                                                            return (
                                                                                                <div key={eIdx} className="flex justify-between items-center px-1.5 py-1 rounded-lg bg-black/20">
                                                                                                    <span className="text-[9px] text-gray-200 font-bold uppercase truncate max-w-[160px]">{ex.name}</span>
                                                                                                    {detail && <span className="text-[9px] text-brand-red font-black italic shrink-0 ml-2">{detail}</span>}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        ))}
                                                                        {!isExpanded && wodBlocks2.length > 3 && (
                                                                            <div className="text-[9px] text-center text-brand-red/70 font-black uppercase tracking-[0.2em] pt-2 animate-pulse">
                                                                                Tocar para ver +{wodBlocks2.length - 3} bloques
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                                        <p className="text-white/60 text-xs italic">
                                                                            {(currentStory.metadata?.summary?.title) || 'Sesión de Entrenamiento'}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="px-4 pb-3 flex justify-center">
                                                                <div className="flex items-center gap-1.5 opacity-40">
                                                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: isEnd2 ? sMeta2.color : '#ef4444' }} />
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
                            </AnimatePresence>
                        </div>

                        {/* Floating Emojis Reaction Layer */}
                        <div className="absolute inset-0 pointer-events-none z-[80] overflow-hidden rounded-[32px]">
                            {floatingEmojis.map((fe) => (
                                <span
                                    key={fe.id}
                                    className="absolute bottom-10 text-4xl animate-float-emoji select-none"
                                    style={{
                                        left: `${fe.left}%`,
                                        animationDelay: `${fe.delay}s`,
                                        '--rot': `${(Math.random() - 0.5) * 60}deg`
                                    } as any}
                                >
                                    {fe.char}
                                </span>
                            ))}
                        </div>

                        {/* Quick Reactions Panel Overlay */}
                        <AnimatePresence>
                            {showReactions && !isPressed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                    className="absolute bottom-24 left-6 right-6 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 z-50 flex flex-col gap-3 shadow-2xl pointer-events-auto"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reacciones rápidas</span>
                                        <button
                                            onClick={() => {
                                                setShowReactions(false);
                                                setIsPaused(false);
                                                if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {});
                                                if (currentStory?.music_url && audioRef.current && !isMuted) audioRef.current.play().catch(() => {});
                                            }}
                                            className="text-gray-500 hover:text-white p-0.5"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-6 gap-1 text-2xl">
                                        {['🔥', '😂', '👏', '😍', '😢', '😮'].map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleSendReaction(emoji)}
                                                className="hover:scale-125 active:scale-95 transition-transform p-2 text-center"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {!isPressed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute bottom-10 left-0 right-0 px-6 flex items-center gap-3 z-50 pointer-events-none"
                                >
                                    {isOwner ? (
                                        <div className="pointer-events-auto flex-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowViewers(true); }}
                                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 transition-all group"
                                            >
                                                <div className="flex -space-x-2">
                                                    {(currentStory as any).viewer_details?.slice(0, 3).map((v: any, i: number) => (
                                                        <div key={i} className="w-5 h-5 rounded-full border border-black overflow-hidden relative">
                                                            <Image src={v.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${v.profiles?.full_name || 'User'}`} fill alt="v" className="object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                    {(currentStory as any).views_count} {(currentStory as any).views_count === 1 ? 'Vista' : 'Vistas'}
                                                </span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2 pointer-events-auto relative">
                                            <input
                                                type="text"
                                                placeholder={`Responder a ${currentUserStories?.user?.username || 'Usuario'}...`}
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onFocus={() => {
                                                    setIsPaused(true);
                                                    if (storyVideoRef.current) storyVideoRef.current.pause();
                                                    if (audioRef.current) audioRef.current.pause();
                                                    setShowReactions(true);
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        if (!replyText.trim() && !showReactions) {
                                                            setIsPaused(false);
                                                            if (storyVideoRef.current) storyVideoRef.current.play().catch(() => {});
                                                            if (currentStory?.music_url && audioRef.current && !isMuted) audioRef.current.play().catch(() => {});
                                                        }
                                                    }, 300);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSendReply();
                                                    }
                                                }}
                                                className="w-full bg-black/60 hover:bg-black/80 focus:bg-black/90 border border-white/10 text-white rounded-full px-5 py-3 text-xs placeholder-gray-400 focus:outline-none transition-all duration-300 pr-10"
                                            />
                                            {replyText.trim() && (
                                                <button
                                                    onClick={handleSendReply}
                                                    disabled={isSendingReply}
                                                    className="absolute right-3 p-1 text-brand-red hover:text-white transition-colors"
                                                >
                                                    {isSendingReply ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLike}
                                        className={clsx(
                                            "p-3 rounded-full backdrop-blur-xl border transition-all active:scale-90 pointer-events-auto shrink-0 relative",
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
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
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

            {/* Silent Preloader for adjacent content */}
            {selectedUserIndex !== null && (
                <div className="hidden" aria-hidden="true">
                    {/* Next story in current deck */}
                    {currentUserStories?.stories?.[activeStoryIndex + 1] && (
                        currentUserStories.stories[activeStoryIndex + 1].media_type === 'video' ? (
                            <video src={currentUserStories.stories[activeStoryIndex + 1].media_url} preload="auto" muted />
                        ) : (
                            <img src={currentUserStories.stories[activeStoryIndex + 1].media_url} alt="" />
                        )
                    )}
                    {/* First story of next user's deck */}
                    {userStories[selectedUserIndex + 1]?.stories?.[0] && (
                        userStories[selectedUserIndex + 1].stories[0].media_type === 'video' ? (
                            <video src={userStories[selectedUserIndex + 1].stories[0].media_url} preload="auto" muted />
                        ) : (
                            <img src={userStories[selectedUserIndex + 1].stories[0].media_url} alt="" />
                        )
                    )}
                </div>
            )}
            
            {/* Video Editor Pro Modal */}
            {isVideoEditing && editorVideoFile && (
                <VideoEditor
                    videoFile={editorVideoFile}
                    onSave={(editedFile, dur, coverBlob) => {
                        setupPreview(editedFile);
                        setIsVideoEditing(false);
                        setEditorVideoFile(null);
                        setIsVideoTrimming(false);
                    }}
                    onCancel={() => {
                        setIsVideoEditing(false);
                        setEditorVideoFile(null);
                        if (!previewUrl && fileInputRef.current) {
                            fileInputRef.current.value = "";
                        }
                    }}
                />
            )}
            {/* Error Toast — reemplaza alert() para no freezar el móvil */}
            {storyError && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 bg-red-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl max-w-xs text-center pointer-events-none">
                    <X className="w-3.5 h-3.5 shrink-0" />
                    {storyError}
                </div>
            )}
        </div>
    )
}
