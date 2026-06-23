"use client";

import Link from "next/link";
import {
    Trophy, Activity, Camera, X, CheckCircle, Loader2, Zap, Clock, MapPin, Youtube,
    Play, Pause, Save, ChevronRight, ChevronLeft, Map as MapIcon,
    ArrowLeft, List, Plus, Minus, Trash2, Edit2, Search, Timer,
    RefreshCw, Share2, Award, AlertTriangle, Video, Lock as LockIcon,
    Wind, Heart, TrendingUp, Download, Eye, Ban
} from 'lucide-react';
import RouteMap from '@/components/training/RouteMap';
import RunShareCard from '@/components/training/RunShareCard';
import WorkoutShareCard from '@/components/training/WorkoutShareCard';
import Image from "next/image";
import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { saveWorkout, getExercises, getExercisePreviousRecord, getWorkoutDetails, uploadWorkoutMedia, getUserProfile, getGuidedWorkoutsCount, completeScheduledWorkout } from "../actions";
import { getCenterPost } from "../../gyms/feed-actions";
import { getAiRecommendation } from "../ai-coach";
import type { TrainingPlan, WorkoutBlock, WorkoutExercise, WorkoutSet, SportType } from "../types";

import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useTheme } from "../../../ThemeContext";
import PRCelebrationModal from "./PRCelebrationModal";

// Helper for real distance calculation (Haversine Formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Returns distance in meters
};

export default function SessionPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-brand-red" /></div>}>
            <SessionContent />
        </Suspense>
    );
}

type SportMode = 'gym' | 'running' | 'cross_training' | 'hybrid' | 'calisthenics' | 'ocr' | 'other' | 'cycling' | 'swimming' | null;

function SessionContent() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // if (!mounted) return null; // Moved to avoid hook violation

    const { theme } = useTheme();
    const router = useRouter();
    const searchParams = useSearchParams();
    const wodId = searchParams.get('wodId');
    const editId = searchParams.get('editId');

    const [sportMode, setSportMode] = useState<SportMode>(null);
    // Only show loading overlay when there's real data to parse from URL
    const hasAiWorkout = searchParams.get('mode') === 'ai-coach' && !!searchParams.get('workout');
    const hasPlanData  = searchParams.get('mode') === 'recommendation' && !!searchParams.get('plan');
    const hasScheduledWorkout = searchParams.get('mode') === 'scheduled' && !!searchParams.get('workout');
    const [isLoadingData, setIsLoadingData] = useState(!!wodId || !!editId || hasAiWorkout || hasPlanData || hasScheduledWorkout);

    // Common State
    const [startTime] = useState(new Date());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    
    // Background-safe timer state references
    const accumulatedSecondsRef = useRef(0);
    const lastResumedTimeRef = useRef<number | null>(null);
    const [workoutTitle, setWorkoutTitle] = useState("Sesión de entrenamiento");
    const [locationName, setLocationName] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [shareToArena, setShareToArena] = useState(true);
    const [shareToStory, setShareToStory] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [arenaDescription, setArenaDescription] = useState("");
    const [rpe, setRpe] = useState<number>(5);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [targetDuration, setTargetDuration] = useState<number | null>(null);
    const [viewingVideo, setViewingVideo] = useState<string | null>(null);
    const [timerMode, setTimerMode] = useState<'up' | 'down'>('up');
    const [preStartPlan, setPreStartPlan] = useState<TrainingPlan | null>(null);
    const [isGuided, setIsGuided] = useState<boolean>(!!wodId || searchParams.get('mode') === 'recommendation' || searchParams.get('mode') === 'ai-coach' || searchParams.get('mode') === 'scheduled');
    const [guidedCount, setGuidedCount] = useState<number>(0);
    const [userTier, setUserTier] = useState<string>('free');
    const [gpsStatus, setGpsStatus] = useState<'idle' | 'searching' | 'tracking'>('idle');
    const lastPosRef = useRef<{ lat: number, lon: number, alt?: number | null } | null>(null);
    const lastPaceCalcTimeRef = useRef<number>(Date.now());
    const lastPaceCalcDistRef = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [manualTimeInput, setManualTimeInput] = useState<string>("");
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const lastScrollY = useRef(0);
    const [prAchievements, setPrAchievements] = useState<any[]>([]);
    const [userName, setUserName] = useState<string>("Atleta");
    const [logMode, setLogMode] = useState<'manual' | 'live'>('manual');

    // Video Trimming State
    const [isVideoTrimming, setIsVideoTrimming] = useState(false);
    const [trimmerVideoUrl, setTrimmerVideoUrl] = useState<string | null>(null);
    const [trimStart, setTrimStart] = useState(0);
    const [isTrimmingLoading, setIsTrimmingLoading] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [trimProgress, setTrimProgress] = useState(0);
    const trimmerVideoRef = useRef<HTMLVideoElement>(null);

    // Running Specific State
    const [runPath, setRunPath] = useState<{ lat: number, lon: number }[]>([]);
    const [elevationGain, setElevationGain] = useState(0);
    const [heartRate, setHeartRate] = useState(0);
    const [instantPace, setInstantPace] = useState("0:00");
    const [currentZone, setCurrentZone] = useState(1);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [instantSpeed, setInstantSpeed] = useState(0); // km/h
    const [showShareCard, setShowShareCard] = useState(false);
    const [showWorkoutShareCard, setShowWorkoutShareCard] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
    const wakeLockRef = useRef<any>(null);
    const runDistanceRef = useRef<number>(0);
    // Km splits tracking: records pace (seconds/km) for each completed km
    const kmSplitsRef = useRef<{ km: number; paceSecondsPerKm: number }[]>([]);
    const lastSplitDistRef = useRef<number>(0);
    const lastSplitTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        const fetchLimits = async () => {
            const [profile, count] = await Promise.all([
                getUserProfile(),
                getGuidedWorkoutsCount()
            ]);
            if (profile) {
                setUserTier(profile.subscription_tier || 'free');
                setUserName(profile.full_name || profile.username || "Atleta");
            }
            setGuidedCount(count);
        };
        fetchLimits();
    }, []);

    // Scroll listener for mobile controls
    useEffect(() => {
        if (!mounted || !sportMode) return;

        const container = document.getElementById('session-overlay-container');
        if (!container) return;

        const handleScroll = () => {
            const currentScrollY = container.scrollTop;

            // Show always at the top
            if (currentScrollY < 10) {
                setShowControls(true);
                lastScrollY.current = currentScrollY;
                return;
            }

            if (currentScrollY > lastScrollY.current && currentScrollY > 70) {
                setShowControls(false); // Scrolling down
            } else if (currentScrollY < lastScrollY.current - 5) {
                setShowControls(true); // Scrolling up with a small threshold
            }
            lastScrollY.current = currentScrollY;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [mounted, sportMode]);

    const startUpload = async (file: File) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadWorkoutMedia(formData);
        // @ts-ignore
        if (result.success && result.url) {
            // @ts-ignore
            setImageUrl(result.url);
            setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
        } else {
            alert("Error al subir archivo");
        }
        setIsUploading(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Video Duration Check & Trimming Trigger
        if (file.type.startsWith('video/')) {
            const docVideo = document.createElement('video');
            docVideo.preload = 'metadata';
            docVideo.onloadedmetadata = () => {
                const dur = docVideo.duration;
                setVideoDuration(dur);
                window.URL.revokeObjectURL(docVideo.src);

                if (dur > 60) {
                    setTrimStart(0);
                    setPendingFile(file);
                    setTrimmerVideoUrl(URL.createObjectURL(file));
                    setIsVideoTrimming(true);
                    return;
                }
                // If < 60s, proceed to upload
                startUpload(file);
            };
            docVideo.onerror = () => {
                alert("Error al procesar el video.");
            };
            docVideo.src = URL.createObjectURL(file);
            return;
        }

        startUpload(file);
    };

    const processTrimming = async () => {
        if (!trimmerVideoRef.current || !trimmerVideoUrl) return;

        setIsTrimmingLoading(true);
        setTrimProgress(0);
        const video = trimmerVideoRef.current;

        try {
            const captureStream = (video as any).captureStream || (video as any).mozCaptureStream;

            if (!captureStream) {
                alert("Tu navegador no soporta el recorte de video directo. Por favor, intenta subir un video de menos de 1 minuto.");
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
                alert("Formato de video no compatible para recorte en este navegador.");
                setIsTrimmingLoading(false);
                return;
            }

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            let safetyTimeout: any;
            let progressInterval: any;

            recorder.onstop = () => {
                if (safetyTimeout) clearTimeout(safetyTimeout);
                if (progressInterval) clearInterval(progressInterval);

                if (chunks.length === 0) {
                    alert("Error: No se capturaron datos del video. Por favor, intenta de nuevo y asegúrate de que el video se reproduce correctamente.");
                    setIsTrimmingLoading(false);
                    return;
                }

                const blob = new Blob(chunks, { type: mimeType });
                const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
                const fileName = pendingFile ? pendingFile.name.replace(/\.[^/.]+$/, "") : "trimmed_video";
                const trimmedFile = new File([blob], `${fileName}_trimmed.${extension}`, { type: mimeType });

                startUpload(trimmedFile);

                setIsVideoTrimming(false);
                setTrimmerVideoUrl(null);
                setIsTrimmingLoading(false);
                setTrimProgress(0);
                if (fileInputRef.current) fileInputRef.current.value = "";
            };

            const recordingDuration = Math.min(60, (video.duration - trimStart));

            const startRecording = () => {
                video.onseeked = null;
                video.play().then(() => {
                    recorder.start();

                    const startTime = Date.now();
                    progressInterval = setInterval(() => {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const percent = Math.min(99, (elapsed / recordingDuration) * 100);
                        setTrimProgress(percent);
                    }, 500);

                    safetyTimeout = setTimeout(() => {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                            video.pause();
                        }
                    }, (recordingDuration + 1) * 1000);

                    video.onended = () => {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                        }
                    };
                }).catch(err => {
                    console.error("Play failed during trimming:", err);
                    alert("No se pudo iniciar la captura del video. Intenta presionar 'Play' manualmente si es necesario.");
                    setIsTrimmingLoading(false);
                });
            };

            // Prepare for seek
            video.muted = true;
            video.currentTime = trimStart;

            // Check if seek is needed
            if (Math.abs(video.currentTime - trimStart) < 0.1) {
                startRecording();
            } else {
                video.onseeked = startRecording;
            }

        } catch (err) {
            console.error("Trimming error:", err);
            setIsTrimmingLoading(false);
        }
    };

    const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

    // Running State
    const [runDistance, setRunDistance] = useState<number>(0); // Meters

    // Wake Lock Logic
    useEffect(() => {
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && gpsStatus === 'tracking') {
                try {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                    console.log('Wake Lock is active');
                } catch (err: any) {
                    console.error(`${err.name}, ${err.message}`);
                }
            }
        };

        if (gpsStatus === 'tracking' && !isPaused) {
            requestWakeLock();
        } else {
            if (wakeLockRef.current) {
                wakeLockRef.current.release().then(() => {
                    wakeLockRef.current = null;
                });
            }
        }

        return () => {
            if (wakeLockRef.current) {
                wakeLockRef.current.release();
            }
        };
    }, [gpsStatus, isPaused]);

    // Real-time GPS Tracking Logic
    useEffect(() => {
        let watchId: number;
        if (gpsStatus !== 'idle' && typeof window !== 'undefined' && 'geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude, accuracy, speed, altitude, altitudeAccuracy } = pos.coords;

                    // Relaxed transition to tracking: < 60m is enough to start, but we prefer better
                    if (gpsStatus === 'searching' && accuracy < 60) {
                        setGpsStatus('tracking');
                        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
                    }

                    // Increased tolerance: allow points up to 50m accuracy to be processed
                    if (accuracy > 50) return;

                    setGpsAccuracy(accuracy);

                    // Update Instant Pace/Speed
                    if (speed !== null && speed >= 0) {
                        const kmh = speed * 3.6;
                        setInstantSpeed(kmh);
                        if (kmh > 1.8) { // Only calculate pace if moving > 1.8km/h
                            const minPerKm = 60 / kmh;
                            const pMin = Math.floor(minPerKm);
                            const pSec = Math.floor((minPerKm - pMin) * 60);
                            setInstantPace(`${pMin}:${pSec < 10 ? '0' + pSec : pSec}`);
                        } else {
                            setInstantPace("0:00");
                        }
                    } else {
                        // Fallback: Calculate pace based on distance covered in the last few seconds
                        const now = Date.now();
                        const timeDiff = (now - lastPaceCalcTimeRef.current) / 1000; // seconds
                        if (timeDiff >= 3) {
                            const distDiff = runDistanceRef.current - lastPaceCalcDistRef.current;
                            if (distDiff > 2) {
                                const mPerSec = distDiff / timeDiff;
                                const kmh = mPerSec * 3.6;
                                setInstantSpeed(kmh);
                                if (kmh > 1.8) {
                                    const minPerKm = 60 / kmh;
                                    const pMin = Math.floor(minPerKm);
                                    const pSec = Math.floor((minPerKm - pMin) * 60);
                                    setInstantPace(`${pMin}:${pSec < 10 ? '0' + pSec : pSec}`);
                                } else {
                                    setInstantPace("0:00");
                                }
                            } else if (distDiff < 0.5) {
                                setInstantPace("0:00");
                                setInstantSpeed(0);
                            }
                            lastPaceCalcTimeRef.current = now;
                            lastPaceCalcDistRef.current = runDistanceRef.current;
                        }
                    }

                    if (lastPosRef.current) {
                        const d = calculateDistance(
                            lastPosRef.current.lat,
                            lastPosRef.current.lon,
                            latitude,
                            longitude
                        );

                        // Only accumulate distance/path if NOT PAUSED and valid movement
                        // Filter out jitter (d < 3m) and low accuracy
                        // Relaxed filters to ensure it works even with average signal
                        const isMoving = speed !== null ? speed > 0.4 : d > 5;

                        if (!isPaused && gpsStatus === 'tracking' && d > 3 && d < 40 && isMoving && accuracy < 35) {
                            const prevKm = Math.floor(runDistanceRef.current / 1000);
                            runDistanceRef.current += d;
                            setRunDistance(runDistanceRef.current);
                            setRunPath(prev => [...prev, { lat: latitude, lon: longitude }]);

                            // Record split when each km is crossed
                            const newKm = Math.floor(runDistanceRef.current / 1000);
                            if (newKm > prevKm && newKm >= 1) {
                                const now = Date.now();
                                const elapsedMs = now - lastSplitTimeRef.current;
                                const distSinceLastSplit = runDistanceRef.current - lastSplitDistRef.current;
                                if (distSinceLastSplit > 0 && elapsedMs > 0) {
                                    const paceSecondsPerKm = (elapsedMs / 1000 / distSinceLastSplit) * 1000;
                                    kmSplitsRef.current = [...kmSplitsRef.current, { km: newKm, paceSecondsPerKm }];
                                }
                                lastSplitDistRef.current = newKm * 1000;
                                lastSplitTimeRef.current = now;
                            }

                            // Altitude Logic
                            if (altitude !== null && accuracy < 25) {
                                if (lastPosRef.current.alt !== undefined && lastPosRef.current.alt !== null) {
                                    const diff = altitude - lastPosRef.current.alt;
                                    if (diff > 0.4 && diff < 15) {
                                        setElevationGain(prev => prev + diff);
                                    }
                                }
                            }
                        }
                    }
                    lastPosRef.current = { lat: latitude, lon: longitude, alt: altitude };
                },
                (err) => {
                    console.error("GPS Tracker Error:", err);
                    if (err.code === 1) {
                        setGpsStatus('idle');
                        alert("Acceso a GPS denegado. Por favor, habilita los permisos de ubicación.");
                    } else if (err.code === 3) {
                        // Timeout - keep searching
                        console.warn("GPS timeout, retrying...");
                    }
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
        } else {
            lastPosRef.current = null;
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [gpsStatus]); // Only restart if GPS status changes, NOT on pause/resume

    const updateDistanceManual = (d: number) => {
        runDistanceRef.current += d;
        setRunDistance(runDistanceRef.current);
    }

    // Cross Training/Hybrid State
    type BlockType = 'fortime' | 'amrap' | 'emom' | 'tabata' | 'other';
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);

    // Legacy state for backward compatibility or simple views (Removing unused ones)
    const [roundsCompleted, setRoundsCompleted] = useState(0); // Used for Summary only now
    const [emomTotalTime, setEmomTotalTime] = useState(0); // Used for Summary only now

    // Safety timeout: never stay in loading state more than 6s
    useEffect(() => {
        if (!isLoadingData) return;
        const t = setTimeout(() => setIsLoadingData(false), 6000);
        return () => clearTimeout(t);
    }, []);

    // Data pre-fill effect
    useEffect(() => {
        // Pre-fill from AI Coach or Scheduled Workout
        if ((searchParams.get('mode') === 'ai-coach' || searchParams.get('mode') === 'scheduled') && searchParams.get('workout')) {
            try {
                const workout = JSON.parse(decodeURIComponent(searchParams.get('workout')!));
                setWorkoutTitle(workout.title);
                if (workout.duration_min) setTargetDuration(workout.duration_min);
                else if (workout.duration) setTargetDuration(parseInt(workout.duration));

                const sportInput = (workout.sportType || 'cross_training').toLowerCase();
                let mode: SportMode = 'cross_training';
                if (sportInput.includes('gym') || sportInput.includes('fitness')) mode = 'gym';
                else if (sportInput.includes('run')) mode = 'running';
                else if (sportInput.includes('hybrid')) mode = 'hybrid';
                else if (sportInput.includes('calisthenic')) mode = 'calisthenics';
                else if (sportInput.includes('ocr')) mode = 'ocr';

                setSportMode(mode);

                if (workout.exercises) {
                    const allMapped = workout.exercises.map((ex: any, idx: number) => {
                        let defaultUnit = 'kg';
                        let defaultMeasure = 'reps';
                        const nameLower = ex.name.toLowerCase();
                        if (nameLower.includes('run') || nameLower.includes('carrera') || nameLower.includes('row') || nameLower.includes('ski') || nameLower.includes('bike')) {
                            defaultUnit = 'm';
                            defaultMeasure = 'cal';
                        } else if (nameLower.includes('plank') || nameLower.includes('hold')) {
                            defaultUnit = 'sec';
                        }

                        // Extract clean name without prefix
                        let cleanName = ex.name;
                        let group = 'workout';
                        if (ex.name.toUpperCase().startsWith('WARM-UP:')) {
                            cleanName = ex.name.substring(8).trim();
                            group = 'warmup';
                        } else if (ex.name.toUpperCase().startsWith('WORKOUT:')) {
                            cleanName = ex.name.substring(8).trim();
                            group = 'workout';
                        } else if (ex.name.toUpperCase().startsWith('COOL-DOWN:')) {
                            cleanName = ex.name.substring(10).trim();
                            group = 'cooldown';
                        }

                        return {
                            id: `ai-${idx}`,
                            name: cleanName,
                            originalName: ex.name,
                            target: `${ex.sets} x ${ex.reps}`,
                            group,
                            sets: Array.from({ length: parseInt(ex.sets) || 1 }).map((_, sIdx) => ({
                                order: sIdx + 1,
                                weight: 0,
                                reps: parseInt(ex.reps) || 0,
                                completed: false,
                                unit: defaultUnit,
                                measure: defaultMeasure
                            }))
                        };
                    });

                    setExercises(allMapped);

                    // Create blocks based on grouping
                    const warmUpEx = allMapped.filter((e: WorkoutExercise) => e.group === 'warmup');
                    const workoutEx = allMapped.filter((e: WorkoutExercise) => e.group === 'workout');
                    const coolDownEx = allMapped.filter((e: WorkoutExercise) => e.group === 'cooldown');

                    const newBlocks = [];

                    if (warmUpEx.length > 0) {
                        newBlocks.push({
                            id: 'ai-warmup',
                            type: 'other',
                            title: 'CALENTAMIENTO (WARM-UP)',
                            exercises: warmUpEx,
                            result: { rounds: 0, time: '' }
                        });
                    }

                    if (workoutEx.length > 0) {
                        // Detect format from title: "TITLE (FORMAT)"
                        let format = 'fortime';
                        const titleUpper = workout.title.toUpperCase();
                        if (titleUpper.includes('AMRAP')) format = 'amrap';
                        else if (titleUpper.includes('EMOM')) format = 'emom';
                        else if (titleUpper.includes('TABATA')) format = 'tabata';
                        else if (titleUpper.includes('INTERVAL')) format = 'other';

                        newBlocks.push({
                            id: 'ai-workout',
                            type: format,
                            title: workout.title,
                            exercises: workoutEx,
                            result: { rounds: 0, time: '' },
                            duration: parseInt(workout.duration) || 0
                        });
                    }

                    if (coolDownEx.length > 0) {
                        newBlocks.push({
                            id: 'ai-cooldown',
                            type: 'other',
                            title: 'ENFRIAMIENTO / MOBILITY (COOL-DOWN)',
                            exercises: coolDownEx,
                            result: { rounds: 0, time: '' }
                        });
                    }

                    if (newBlocks.length > 0) {
                        setBlocks(newBlocks);
                    } else if (allMapped.length > 0) {
                        // If no groups detected but we have exercises, fallback to one block
                        setBlocks([{
                            id: 'ai-block-1',
                            type: 'fortime',
                            title: workout.title,
                            exercises: allMapped,
                            result: { rounds: 0, time: '' }
                        }]);
                    }
                }
                setIsLoadingData(false);
            } catch (e) {
                console.error("Error parsing AI workout", e);
                setIsLoadingData(false);
            }
        }

        if (searchParams.get('mode') === 'recommendation' && searchParams.get('plan')) {
            try {
                const plan = JSON.parse(decodeURIComponent(searchParams.get('plan')!)) as TrainingPlan;
                setWorkoutTitle(plan.title);
                setSportMode(plan.sport as SportMode || 'cross_training');

                // Fetch catalog to enrich with videos
                getExercises(plan.sport || 'cross_training').then(catalog => {
                    const catalogMap = new Map(catalog.map((e: any) => [e.name.toLowerCase(), e]));

                    if (plan.duration_min) setTargetDuration(plan.duration_min);

                    if (plan.sport === 'gym' && plan.exercises) {
                        const mapped = plan.exercises.map((ex: WorkoutExercise) => {
                            const found = catalogMap.get(ex.name.toLowerCase());
                            return {
                                ...ex,
                                video_url: ex.video_url || found?.video_url,
                                sets: ex.sets.map((s: WorkoutSet, i: number) => ({
                                    ...s,
                                    order: i + 1,
                                    weight: s.weight || 0,
                                    reps: s.reps || 0,
                                    completed: false,
                                    unit: s.unit || 'kg',
                                    measure: s.measure || 'reps'
                                }))
                            };
                        });
                        setExercises(mapped);
                        setBlocks([{ id: 'main', title: plan.title, exercises: mapped, type: 'other' }]);
                    } else if (plan.exercises) {
                        // For other modes that might have exercises (Cross Training blocks)
                        const mapped = plan.exercises.map((ex: WorkoutExercise, idx: number) => {
                            const found = catalogMap.get(ex.name.toLowerCase());
                            return {
                                ...ex,
                                video_url: ex.video_url || found?.video_url,
                                id: ex.id || `plan-${idx}`,
                                sets: ex.sets?.map((s: WorkoutSet, i: number) => ({
                                    ...s,
                                    order: i + 1,
                                    weight: s.weight || 0,
                                    reps: s.reps || 0,
                                    completed: false,
                                    unit: s.unit || 'kg',
                                    measure: s.measure || 'reps'
                                })) || [{ order: 1, weight: 0, reps: 0, completed: false, unit: 'kg', measure: 'reps' }]
                            };
                        });
                        setExercises(mapped);

                        // Create a block for Cross Training / OCR
                        const titleUpper = plan.title.toUpperCase();
                        let format: any = 'fortime';
                        if (titleUpper.includes('AMRAP')) format = 'amrap';
                        else if (titleUpper.includes('EMOM')) format = 'emom';
                        else if (titleUpper.includes('TABATA')) format = 'tabata';

                        setBlocks([{
                            id: 'plan-block-1',
                            type: format,
                            title: plan.title,
                            duration: plan.duration_min || 0,
                            exercises: mapped,
                            result: { rounds: 0, time: '' }
                        }]);
                    }
                    setSportMode(plan.sport);
                });

            } catch (e) { console.error("Error parsing plan", e) }
        }
    }, [searchParams]);

    const hrSamplesRef = useRef<number[]>([]);

    // Heart Rate & Zone (Simplified - only displays if updated via sync/sensor in future)
    // Removed simulation to avoid user confusion
    useEffect(() => {
        if (sportMode !== 'running' || gpsStatus !== 'tracking' || isPaused) {
            setHeartRate(0);
            return;
        }

        // Keep at 0 for now as real sensors are not yet implemented for direct web access
        // This avoids confusing "ghost" data
    }, [sportMode, gpsStatus, isPaused]);



    // Premium Sound Synthesizer (beeps/chimes)
    const playBeep = useCallback((freq = 440, type: OscillatorType = "sine", duration = 0.2) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
            osc.stop(ctx.currentTime + duration);
        } catch (e) { console.warn("Audio not supported or blocked", e) }
    }, []);

    // Sync refs when pause status changes
    useEffect(() => {
        if (!isPaused) {
            lastResumedTimeRef.current = Date.now();
        } else {
            if (lastResumedTimeRef.current) {
                accumulatedSecondsRef.current += Math.floor((Date.now() - lastResumedTimeRef.current) / 1000);
                lastResumedTimeRef.current = null;
            }
        }
    }, [isPaused]);

    // Timer Logic: Background-safe wall-clock interval
    useEffect(() => {
        if (isPaused) return;

        if (!lastResumedTimeRef.current) {
            lastResumedTimeRef.current = Date.now();
        }

        const timer = setInterval(() => {
            if (lastResumedTimeRef.current) {
                const total = accumulatedSecondsRef.current + Math.floor((Date.now() - lastResumedTimeRef.current) / 1000);
                setElapsedSeconds(total);
            }
        }, 250); // check 4 times a second for responsive segundero
        return () => clearInterval(timer);
    }, [isPaused]);

    // Visibility Listener: Sync seconds immediately when page becomes visible
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && !isPaused && lastResumedTimeRef.current) {
                const total = accumulatedSecondsRef.current + Math.floor((Date.now() - lastResumedTimeRef.current) / 1000);
                setElapsedSeconds(total);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isPaused]);

    // Auto-stop and beep when countdown timer ends (time is up)
    useEffect(() => {
        if (timerMode === 'down' && targetDuration && elapsedSeconds >= targetDuration * 60 && !isPaused) {
            setIsPaused(true);
            // Sporty triplet alarm sound
            playBeep(880, 'triangle', 0.2);
            setTimeout(() => playBeep(880, 'triangle', 0.2), 250);
            setTimeout(() => playBeep(1200, 'triangle', 0.5), 500);
        }
    }, [elapsedSeconds, timerMode, targetDuration, isPaused, playBeep]);

    // Countdown and Sound Logic
    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            playBeep(440, 'triangle', 0.12); // Short beep on 3, 2, 1
            const t = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(t);
        } else {
            playBeep(880, 'triangle', 0.45); // High beep on GO!
            setIsPaused(false);
            setCountdown(null);
        }
    }, [countdown, playBeep]);

    const toggleTimer = () => {
        if (isPaused && elapsedSeconds === 0 && countdown === null) {
            setCountdown(3);
        } else {
            setIsPaused(!isPaused);
            setCountdown(null);
        }
    };

    const handleManualTimeChange = (val: string) => {
        setManualTimeInput(val);
    };

    const commitManualTime = () => {
        const val = manualTimeInput;
        const parts = val.split(':').reverse();
        let total = 0;
        if (parts[0]) total += parseInt(parts[0]) || 0;
        if (parts[1]) total += (parseInt(parts[1]) || 0) * 60;
        if (parts[2]) total += (parseInt(parts[2]) || 0) * 3600;
        
        accumulatedSecondsRef.current = total;
        if (!isPaused) {
            lastResumedTimeRef.current = Date.now();
        } else {
            lastResumedTimeRef.current = null;
        }
        setElapsedSeconds(total);
        setIsEditingTime(false);
    };

    // Data Initialization
    useEffect(() => {
        const init = async () => {
            if (editId) {
                const workout = await getWorkoutDetails(editId);
                if (workout) {
                    setShortcutMode(workout.sport_type?.toLowerCase() || 'gym');
                    setWorkoutTitle(workout.title);
                    accumulatedSecondsRef.current = workout.duration_seconds || 0;
                    if (!isPaused) {
                        lastResumedTimeRef.current = Date.now();
                    } else {
                        lastResumedTimeRef.current = null;
                    }
                    setElapsedSeconds(workout.duration_seconds || 0);
                    if (workout.exercises) setExercises(workout.exercises);
                }
                setIsLoadingData(false);
            } else if (wodId) {
                const wod = await getCenterPost(wodId);
                if (wod) {
                    setShortcutMode('cross_training'); // WODs usually Cross Training
                    setWorkoutTitle(`WOD: ${new Date(wod.scheduled_for || wod.created_at).toLocaleDateString()}`);
                    setLocationName(wod.organization?.name || "Box Workout");

                    try {
                        const content = JSON.parse(wod.content);
                        const blocks = content.blocks || [];

                        // Flatten blocks and exercises into the session's exercise list
                        const flatterExercises: any[] = [];

                        for (let i = 0; i < blocks.length; i++) {
                            const block = blocks[i];
                            const blockTitle = block.title || block.format || 'Workout';

                            if (block.exercises && block.exercises.length > 0) {
                                for (let j = 0; j < block.exercises.length; j++) {
                                    const ex = block.exercises[j];
                                    const prev = await getExercisePreviousRecord(ex.name) || "---";
                                    flatterExercises.push({
                                        id: `wod-${i}-${j}`,
                                        name: ex.name,
                                        target: `${ex.sets || block.format || ''} ${ex.reps ? 'x ' + ex.reps : ''}`.trim() || block.format || "Custom",
                                        prev,
                                        sets: Array.from({ length: parseInt(ex.sets) || 1 }).map((_, sIdx) => ({
                                            order: sIdx + 1,
                                            weight: parseFloat(ex.value) || 0,
                                            reps: parseInt(ex.reps) || 0,
                                            completed: false
                                        }))
                                    });
                                }
                            } else if (block.content) {
                                // Fallback for text blocks
                                const lines = block.content.split('\n').filter((l: string) => l.trim());
                                for (let j = 0; j < lines.length; j++) {
                                    const line = lines[j];
                                    const prev = await getExercisePreviousRecord(line) || "---";
                                    flatterExercises.push({
                                        id: `wod-${i}-${j}`,
                                        name: line,
                                        target: block.format || "Custom",
                                        prev,
                                        sets: [{ order: 1, weight: 0, reps: 0, completed: false }]
                                    });
                                }
                            } else {
                                // Fallback for empty blocks but with title
                                const prev = await getExercisePreviousRecord(blockTitle) || "---";
                                flatterExercises.push({
                                    id: `wod-${i}`,
                                    name: blockTitle,
                                    target: block.duration || block.format || "Custom",
                                    prev,
                                    sets: [{ order: 1, weight: 0, reps: 0, completed: false }]
                                });
                            }
                        }

                        setExercises(flatterExercises);
                    } catch (e) {
                        console.error("Error parsing WOD content:", e);
                        // Default fallback
                        setWorkoutTitle("Detailed Box Workout");
                    }
                }
                setIsLoadingData(false);
            }
        };
        init();
    }, [wodId, editId]);

    const setShortcutMode = (mode: string) => {
        const m = mode.toLowerCase();
        if (m.includes('run')) setSportMode('running');
        else if (m.includes('crossfit') || m.includes('cross_training')) setSportMode('cross_training');
        else if (m.includes('hyrox') || m.includes('hybrid')) setSportMode('hybrid');
        else if (m.includes('calisthenic')) setSportMode('calisthenics');
        else if (m.includes('ocr')) setSportMode('ocr');
        else if (m.includes('other') || m.includes('otro')) setSportMode('other');
        else setSportMode('gym');
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
    };

    const closeCelebration = () => {
        setPrAchievements([]);
        router.push('/dashboard/training/logs');
    };

    const handleFinish = async () => {
        // Play upward arpeggio victory chime
        playBeep(523.25, 'sine', 0.15); // C5
        setTimeout(() => playBeep(659.25, 'sine', 0.15), 120); // E5
        setTimeout(() => playBeep(783.99, 'sine', 0.15), 240); // G5
        setTimeout(() => playBeep(1046.50, 'sine', 0.4), 360); // C6

        setIsSaving(true);
        try {
            // Calculate pace for running
            let finalPace = "0:00";
            if (sportMode === 'running' && runDistance > 0 && elapsedSeconds > 0) {
                const minPerKm = (elapsedSeconds / 60) / (runDistance / 1000);
                const pMin = Math.floor(minPerKm);
                const pSec = Math.floor((minPerKm - pMin) * 60);
                finalPace = `${pMin}:${pSec < 10 ? '0' + pSec : pSec}`;
            }

            // Calculate HR Average properly
            let avgHr = heartRate;
            if (hrSamplesRef.current.length > 0) {
                const sum = hrSamplesRef.current.reduce((a, b) => a + b, 0);
                avgHr = Math.round(sum / hrSamplesRef.current.length);
            }

            // Capture final time for Cross Training
            const finalTimeStr = formatTime(elapsedSeconds);
            setIsPaused(true);

            // Prepare exercises list (Flatten blocks if needed)
            let finalExercises = exercises;
            if (sportMode === 'cross_training' || sportMode === 'ocr' || (sportMode === 'hybrid' && blocks.length > 0)) {
                finalExercises = blocks.flatMap((b, bIdx) =>
                    b.exercises.map((ex: WorkoutExercise) => ({
                        ...ex,
                        // Add block context to note if possible or name
                        name: `${ex.name} (${b.type.toUpperCase()})`
                    }))
                );
            }

            const payload = {
                id: editId,
                title: workoutTitle,
                startTime: startTime.toISOString(),
                duration: elapsedSeconds,
                rpe: Math.max(1, Math.min(10, rpe)),
                sportType: sportMode === 'gym' ? 'Fitness' : (sportMode === 'running' ? 'Running' : (sportMode === 'hybrid' ? 'Hybrid' : (sportMode === 'calisthenics' ? 'Calistenia' : (sportMode === 'ocr' ? 'OCR' : (sportMode === 'other' ? 'Otros' : 'Cross Training'))))),
                exercises: finalExercises,
                metrics: {
                    distance: runDistance,
                    blocks: blocks, // Pass complete blocks data
                    pace: finalPace,
                    type: blocks.length > 1 ? 'mixed' : (sportMode === 'running' ? 'running' : (blocks[0]?.type || 'fortime')),
                    time: finalTimeStr,
                    elevation: elevationGain,
                    avgHeartRate: avgHr,
                    path: runPath,
                    maxZone: currentZone,
                    splits: kmSplitsRef.current  // per-km splits [{km, paceSecondsPerKm}]
                },
                locationName,
                imageUrl,
                mediaType,
                shareToArena,
                shareToStory,
                caption: arenaDescription,
                isGuided: isGuided
            };

            const result = await saveWorkout(payload);
            // @ts-ignore
            if (result?.success) {
                // Mark scheduled workout as completed if we started from a scheduled agenda item
                const scheduledId = searchParams.get('scheduledId');
                if (scheduledId) {
                    await completeScheduledWorkout(scheduledId);
                }
                
                // @ts-ignore
                if (result.prAchievements && result.prAchievements.length > 0) {
                    // @ts-ignore
                    setPrAchievements(result.prAchievements);
                } else {
                    router.push('/dashboard/training/logs');
                }
            } else {
                // @ts-ignore
                alert("Error al guardar: " + (result?.error || "Unknown"));
            }
        } catch (e) {
            console.error(e);
            alert("Error inesperado al guardar: " + (e instanceof Error ? e.message : String(e)));
        }
        setIsSaving(false);
    };

    if (!mounted) return null;

    if (isLoadingData) return <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-red" /></div>;

    // IMMERSIVE MODE: Full fixed overlay to hide dashboard sidebar/header
    const overlayClasses = "fixed inset-0 z-[201] bg-black text-white overflow-y-auto custom-scrollbar";

    const limits = { free: 2, premium: 4, elite: 6 };
    const currentLimit = limits[userTier as keyof typeof limits] || 2;
    const isLimitAlreadyReached = isGuided && guidedCount >= currentLimit && !editId;

    if (isLimitAlreadyReached) {
        return (
            <div className={overlayClasses + " flex items-center justify-center p-6"}>
                <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-[40px] p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12 translate-x-8 -translate-y-8">
                        <Zap className="w-64 h-64 text-brand-red" />
                    </div>

                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-brand-red/10 rounded-3xl flex items-center justify-center text-brand-red border border-brand-red/20 shadow-glow mx-auto mb-8">
                            <LockIcon className="w-10 h-10" />
                        </div>

                        <h2 className="text-3xl font-heading font-black italic text-white uppercase mb-4 leading-tight">
                            LÍMITE SEMANAL <span className="text-brand-red text-4xl block">ALCANZADO</span>
                        </h2>

                        <p className="text-white/60 text-sm font-medium mb-10 leading-relaxed">
                            Has completado tus <span className="text-white font-bold">{currentLimit} rutinas guiadas</span> de esta semana (Plan {userTier.toUpperCase()}).
                            <br /><br />
                            Puedes seguir entrenando en <span className="text-white font-bold italic uppercase">MODO LIBRE</span> de forma ilimitada o subir de nivel para desbloquear más acceso.
                        </p>

                        <div className="space-y-4">
                            <Link
                                href="/dashboard/billing"
                                className="block w-full py-5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
                            >
                                MEJORAR MI PLAN
                            </Link>
                            <button
                                onClick={() => { setIsGuided(false); setSportMode(null); router.push('/dashboard/training/session'); }}
                                className="block w-full py-5 rounded-2xl bg-white/5 text-white/60 text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
                            >
                                VOLVER AL SELECTOR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!sportMode) {
        return (
            <div className={overlayClasses}>
                <SportSelector
                    guidedCount={guidedCount}
                    userTier={userTier}
                    onSelect={(mode) => {
                        let defaultTitle = "Sesión de Entrenamiento";
                        if (mode === 'gym') defaultTitle = "Entrenamiento de Fuerza & Musculación";
                        else if (mode === 'running') defaultTitle = "Carrera de Resistencia";
                        else if (mode === 'cross_training') defaultTitle = "Cross Training / WOD Libre";
                        else if (mode === 'hybrid') defaultTitle = "Desafío Híbrido Individual";
                        else if (mode === 'calisthenics') defaultTitle = "Dominio Corporal (Calistenia)";
                        else if (mode === 'ocr') defaultTitle = "Simulación OCR & Trail";
                        else if (mode === 'other') defaultTitle = "Entrenamiento Complementario";

                        setWorkoutTitle(defaultTitle);
                        setSportMode(mode as SportMode);
                        setIsGuided(false);
                        setLogMode('manual');
                        setExercises([]);
                        setBlocks([]);
                        setPreStartPlan(null);
                    }}
                    onPlanSelect={(plan) => {
                        setIsGuided(true);
                        setPreStartPlan(plan);
                    }}
                />

                {preStartPlan && (
                    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] p-6 md:p-12 relative overflow-y-auto overflow-x-hidden max-h-[95vh] custom-scrollbar">
                            <div className="absolute top-0 right-0 p-12 opacity-5 -rotate-12 translate-x-12 -translate-y-12 pointer-events-none">
                                <Zap className="w-64 h-64 text-brand-red" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red border border-brand-red/20 shadow-glow-sm">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase text-brand-red tracking-[0.3em] mb-0.5">Configuración de Sesión</h3>
                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{preStartPlan.difficulty} • {preStartPlan.sport?.replace('_', ' ')}</p>
                                    </div>
                                </div>

                                <h2 className="text-2xl sm:text-3xl font-heading font-black italic text-white uppercase mb-4 leading-none tracking-tight">
                                    {preStartPlan.title}
                                </h2>

                                <div className="space-y-6 mb-10">
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Duración del Protocolo</p>
                                            {preStartPlan.id !== 'freestyle' && (
                                                <div className="flex items-center gap-1.5 bg-brand-red/10 px-2 py-1 rounded-lg border border-brand-red/20 shadow-glow-sm">
                                                    <Zap className="w-3 h-3 text-brand-red" />
                                                    <span className="text-[7px] font-black text-brand-red uppercase tracking-widest">Sugerido: {preStartPlan.duration_min} MIN</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-4 sm:p-5 focus-within:border-brand-red/50 transition-all animate-in fade-in zoom-in-95 duration-500">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                                {/* Sección Manual */}
                                                <div className="flex-1 flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red border border-brand-red/20 shadow-glow-sm shrink-0">
                                                        <Timer className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Ajuste Manual</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <input
                                                                type="number"
                                                                value={preStartPlan.duration_min}
                                                                onChange={(e) => setPreStartPlan({ ...preStartPlan, duration_min: parseInt(e.target.value) || 0 })}
                                                                className="bg-transparent text-4xl sm:text-5xl font-mono font-black text-white w-20 sm:w-24 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <span className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Minutos</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Separador Dinámico */}
                                                <div className="h-px w-full sm:h-12 sm:w-px bg-white/10" />

                                                {/* Ajustes Rápidos */}
                                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                                    <p className="sm:hidden text-[8px] font-black text-gray-600 uppercase tracking-widest">Sugeridos</p>
                                                    <div className="flex gap-2 shrink-0">
                                                        {[30, 45, 60].map(m => (
                                                            <button
                                                                key={m}
                                                                onClick={() => setPreStartPlan({ ...preStartPlan, duration_min: m })}
                                                                className={clsx(
                                                                    "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center shrink-0",
                                                                    preStartPlan.duration_min === m ? "bg-white text-black shadow-xl scale-110" : "bg-white/5 text-gray-500 hover:text-white hover:bg-white/10"
                                                                )}
                                                            >
                                                                {m}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => setTimerMode('up')}
                                            className={clsx(
                                                "p-5 rounded-2xl border transition-all text-left group",
                                                timerMode === 'up' ? "bg-white border-white" : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <p className={clsx("text-[9px] font-black uppercase tracking-widest mb-1", timerMode === 'up' ? "text-black/40" : "text-gray-500")}>Modo</p>
                                            <h4 className={clsx("text-sm font-black uppercase italic leading-none", timerMode === 'up' ? "text-black" : "text-white")}>Libre</h4>
                                            <p className={clsx("text-[8px] mt-2 font-bold uppercase", timerMode === 'up' ? "text-black/60" : "text-gray-600")}>Cronómetro</p>
                                        </button>
                                        <button
                                            onClick={() => setTimerMode('down')}
                                            className={clsx(
                                                "p-5 rounded-2xl border transition-all text-left group",
                                                timerMode === 'down' ? "bg-brand-red border-brand-red" : "bg-white/5 border-white/10 hover:border-white/50"
                                            )}
                                        >
                                            <p className={clsx("text-[9px] font-black uppercase tracking-widest mb-1", timerMode === 'down' ? "text-black/40" : "text-gray-500")}>Modo</p>
                                            <h4 className={clsx("text-sm font-black uppercase italic leading-none text-white")}>Protocolo</h4>
                                            <p className={clsx("text-[8px] mt-2 font-bold uppercase text-white/60")}>Cuenta atrás</p>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setPreStartPlan(null); setSportMode(null); }}
                                        className="flex-1 py-5 rounded-2xl bg-white/5 text-white/60 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all shadow-xl"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setWorkoutTitle(preStartPlan.title);
                                            setTargetDuration(preStartPlan.duration_min);
                                            setSportMode(preStartPlan.sport);

                                            if (preStartPlan.id !== 'freestyle') {
                                                const cleanPlan = JSON.stringify(preStartPlan);
                                                router.push(`/dashboard/training/session?mode=recommendation&plan=${encodeURIComponent(cleanPlan)}`);
                                            } else {
                                                // Freestyle setup
                                                setExercises([]);
                                                setBlocks([]);
                                            }
                                            setPreStartPlan(null);
                                        }}
                                        className="flex-[2] py-5 rounded-2xl bg-gradient-to-r from-brand-red to-orange-600 text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-red/20 flex items-center justify-center gap-2"
                                    >
                                        ⚡ Comenzar <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Dynamic styles based on sport
    const themeColor =
        sportMode === 'running' ? 'text-blue-500' :
            sportMode === 'hybrid' ? 'text-yellow-500' :
                sportMode === 'cross_training' ? 'text-orange-500' :
                    sportMode === 'ocr' ? 'text-emerald-500' :
                        sportMode === 'other' ? 'text-gray-400' :
                            'text-brand-red';

    const bgTheme =
        sportMode === 'running' ? 'bg-blue-500/10 border-blue-500/20' :
            sportMode === 'hybrid' ? 'bg-yellow-500/10 border-yellow-500/20' :
                sportMode === 'cross_training' ? 'bg-orange-500/10 border-orange-500/20' :
                    sportMode === 'ocr' ? 'bg-emerald-500/10 border-emerald-500/20' :
                        sportMode === 'other' ? 'bg-white/5 border-white/10' :
                            'bg-brand-red/10 border-brand-red/20';

    const isAiCoach = searchParams.get('mode') === 'ai-coach';

    if (isAiCoach && sportMode) {
        const displayTime = timerMode === 'down' && targetDuration
            ? Math.max(0, (targetDuration * 60) - elapsedSeconds)
            : elapsedSeconds;

        const progress = targetDuration ? Math.min(100, (elapsedSeconds / (targetDuration * 60)) * 100) : 0;

        return (
            <div id="session-overlay-container" className={overlayClasses}>
                <CoachAiView
                    showControls={showControls}
                    workoutTitle={workoutTitle}
                    blocks={blocks}
                    setBlocks={setBlocks}
                    elapsedSeconds={elapsedSeconds}
                    isPaused={isPaused}
                    toggleTimer={toggleTimer}
                    handleFinish={() => {
                        setIsPaused(true);
                        setShowFinishModal(true);
                    }}
                    isSaving={isSaving}
                    sportMode={sportMode}
                    formatTime={formatTime}
                    countdown={countdown}
                    targetDuration={targetDuration}
                    setViewingVideo={setViewingVideo}
                    timerMode={timerMode}
                    rpe={rpe}
                    setRpe={setRpe}
                    prAchievements={prAchievements}
                    closeCelebration={closeCelebration}
                    userName={userName}
                />
                {viewingVideo && <VideoModal url={viewingVideo} onClose={() => setViewingVideo(null)} />}

                {showFinishModal && (
                    <FinishModal
                        onConfirm={handleFinish}
                        onCancel={() => setShowFinishModal(false)}
                        shareToArena={shareToArena}
                        setShareToArena={setShareToArena}
                        shareToStory={shareToStory}
                        setShareToStory={setShareToStory}
                        isSaving={isSaving}
                        imageUrl={imageUrl}
                        setImageUrl={setImageUrl}
                        isUploading={isUploading}
                        onImageUpload={handleImageUpload}
                        fileInputRef={fileInputRef}
                        workoutTitle={workoutTitle}
                        rpe={rpe}
                        setRpe={setRpe}
                        distance={runDistance}
                        time={elapsedSeconds}
                        pace={instantPace}
                        elevation={elevationGain}
                        runPath={runPath}
                        onOpenShare={() => setShowShareCard(true)}
                        blocks={blocks}
                        onOpenWorkoutCard={() => setShowWorkoutShareCard(true)}
                    />
                )}

                {showShareCard && (
                    <RunShareCard
                        imageUrl={imageUrl}
                        distance={runDistance}
                        time={elapsedSeconds}
                        pace={instantPace}
                        elevation={elevationGain}
                        path={runPath}
                        date={new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        userName={userName}
                        onClose={() => setShowShareCard(false)}
                    />
                )}

                {showWorkoutShareCard && blocks.length > 0 && (
                    <WorkoutShareCard
                        blocks={blocks}
                        workoutTitle={workoutTitle}
                        sportType={sportMode === 'hybrid' ? 'Hybrid Training' : sportMode === 'ocr' ? 'OCR' : sportMode === 'running' ? 'Running' : sportMode === 'gym' ? 'Gym' : 'Cross Training'}
                        category={(sportMode as string) === 'running' ? 'RUNNING' : (sportMode as string) === 'cycling' ? 'CYCLING' : (sportMode as string) === 'swimming' ? 'SWIMMING' : undefined}
                        runMetrics={sportMode === 'running' ? {
                            distance: runDistance > 0 ? `${(runDistance / 1000).toFixed(2)} KM` : undefined,
                            pace: (() => {
                                if (runDistance > 0 && elapsedSeconds > 0) {
                                    const minPerKm = (elapsedSeconds / 60) / (runDistance / 1000);
                                    const pMin = Math.floor(minPerKm);
                                    const pSec = Math.floor((minPerKm - pMin) * 60);
                                    return `${pMin}:${pSec < 10 ? '0' + pSec : pSec}`;
                                }
                                return undefined;
                            })(),
                            elevation: elevationGain > 0 ? `${elevationGain}M` : undefined,
                        } : undefined}
                        duration={elapsedSeconds}
                        date={new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        userName={userName}
                        onClose={() => setShowWorkoutShareCard(false)}
                    />
                )}

            </div>
        );
    }

    const displayTime = timerMode === 'down' && targetDuration
        ? Math.max(0, (targetDuration * 60) - elapsedSeconds)
        : elapsedSeconds;

    const progress = targetDuration ? Math.min(100, (elapsedSeconds / (targetDuration * 60)) * 100) : 0;

    return (
        <div id="session-overlay-container" className={overlayClasses}>
            <header className={clsx(
                "sticky top-0 inset-x-0 z-[260] px-4 py-4 flex items-center justify-between backdrop-blur-2xl border-b border-white/10 transition-transform duration-300",
                !showControls && "-translate-y-full",
                sportMode === 'running' ? "bg-blue-950/80" :
                    sportMode === 'hybrid' ? "bg-yellow-950/80" :
                        sportMode === 'cross_training' ? "bg-orange-950/80" :
                            sportMode === 'ocr' ? "bg-emerald-950/80" :
                                sportMode === 'other' ? "bg-gray-900/80" :
                                    "bg-[#0a0a0a]/90"
            )}>
                {/* Header Progress Bar */}
                {targetDuration && (
                    <div className="absolute bottom-0 left-0 h-[2px] bg-brand-red transition-all duration-1000" style={{ width: `${progress}%` }} />
                )}
                <div className="flex items-center gap-4">
                    <button onClick={() => setSportMode(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isPaused ? "bg-yellow-500" : "bg-green-500")} />
                            <p className={clsx("text-[9px] font-black uppercase tracking-[0.2em]", themeColor)}>{sportMode?.replace('_', ' ')}</p>
                            {targetDuration && (
                                <div className="flex items-center gap-1 bg-brand-red/10 px-1.5 py-0.5 rounded border border-brand-red/20 ml-1">
                                    <Zap className="w-2.5 h-2.5 text-brand-red fill-current" />
                                    <span className="text-[7px] text-brand-red font-black uppercase tracking-widest pl-0.5">
                                        {timerMode === 'down' ? 'PROTOCOLO' : 'META'}: {targetDuration} MIN
                                    </span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-white font-heading font-black italic text-lg uppercase truncate max-w-[180px] sm:max-w-xs leading-none">
                            {workoutTitle}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {logMode === 'live' ? (
                        <>
                            <div className="text-right hidden sm:block">
                                <div className="flex items-center gap-2 justify-end mb-0.5">
                                    <input
                                        type="text"
                                        value={isEditingTime ? manualTimeInput : formatTime(displayTime)}
                                        onChange={(e) => handleManualTimeChange(e.target.value)}
                                        onFocus={() => { setManualTimeInput(formatTime(displayTime)); setIsEditingTime(true); }}
                                        onBlur={commitManualTime}
                                        onKeyDown={(e) => e.key === 'Enter' && commitManualTime()}
                                        disabled={!isPaused}
                                        className={clsx(
                                            "font-mono text-3xl font-black bg-transparent text-right outline-none w-32 transition-colors transition-transform",
                                            !isPaused ? (timerMode === 'down' ? "text-brand-red scale-110" : themeColor) : "text-white/40 focus:text-white"
                                        )}
                                    />
                                    {targetDuration && timerMode === 'up' && (
                                        <span className="text-xs text-white/20 font-black font-mono">/ {formatTime(targetDuration * 60)}</span>
                                    )}
                                </div>
                                <p className="text-[8px] text-white/40 font-black uppercase tracking-widest text-right">
                                    {timerMode === 'down' ? 'TIEMPO RESTANTE' : (isPaused ? "TIEMPO (EDITAR)" : "TIEMPO TRANSCURRIDO")}
                                </p>
                            </div>
                            <button
                                onClick={toggleTimer}
                                className={clsx(
                                    "p-3 rounded-xl transition-all relative",
                                    isPaused ? "bg-white/10 text-white" : "bg-white/10 text-white hover:bg-white/20"
                                )}
                            >
                                {countdown !== null ? (
                                    <span className="text-xl font-black text-brand-red animate-ping">{countdown}</span>
                                ) : isPaused ? (
                                    <Play className="w-5 h-5 fill-current" />
                                ) : (
                                    <Pause className="w-5 h-5 fill-current" />
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">✍ MANUAL</span>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setIsPaused(true);
                            setShowFinishModal(true);
                        }}
                        disabled={isSaving}
                        className={clsx("text-white p-3 rounded-xl shadow-glow hover:scale-105 active:scale-95 transition-all",
                            sportMode === 'running' ? 'bg-blue-600' :
                                sportMode === 'hybrid' ? 'bg-yellow-600' :
                                    sportMode === 'cross_training' ? 'bg-orange-600' :
                                        sportMode === 'ocr' ? 'bg-emerald-600' :
                                            sportMode === 'other' ? 'bg-gray-600' : 'bg-brand-red'
                        )}
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            <div className="pt-28 px-4 max-w-2xl mx-auto space-y-8">
                {/* Mode Selector */}
                <div className="flex justify-center mb-2 animate-in fade-in duration-300">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                setLogMode('manual');
                                setIsPaused(true);
                            }}
                            className={clsx(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                logMode === 'manual' ? "bg-brand-red text-white shadow-lg shadow-brand-red/10" : "text-gray-500 hover:text-white"
                            )}
                        >
                            ✍ Registro Rápido
                        </button>
                        <button
                            type="button"
                            onClick={() => setLogMode('live')}
                            className={clsx(
                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                logMode === 'live' ? "bg-brand-red text-white shadow-lg shadow-brand-red/10" : "text-gray-500 hover:text-white"
                            )}
                        >
                            ⏱ Cronómetro en Vivo
                        </button>
                    </div>
                </div>

                {logMode === 'live' && (
                    <div className="sm:hidden text-center mb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-center gap-2">
                            <input
                                type="text"
                                value={isEditingTime ? manualTimeInput : formatTime(displayTime)}
                                onChange={(e) => handleManualTimeChange(e.target.value)}
                                onFocus={() => { setManualTimeInput(formatTime(displayTime)); setIsEditingTime(true); }}
                                onBlur={commitManualTime}
                                onKeyDown={(e) => e.key === 'Enter' && commitManualTime()}
                                disabled={!isPaused}
                                className={clsx(
                                    "text-6xl font-mono font-black tracking-tighter bg-transparent text-center outline-none w-full",
                                    !isPaused ? (timerMode === 'down' ? 'text-brand-red' : themeColor) : "text-white/40"
                                )}
                            />
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">
                                {countdown !== null ? `INICIO EN ${countdown}...` : (timerMode === 'down' ? "Protocolo Activo" : (isPaused ? "Tiempo (Click para Editar)" : "Tiempo Transcurrido"))}
                            </p>
                            {targetDuration && (
                                <p className="text-brand-red text-[8px] font-black uppercase tracking-widest mt-1">Objetivo: {targetDuration} min</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Specific Views */}
                {(sportMode === 'gym' || sportMode === 'calisthenics') && (
                    <GymView
                        exercises={exercises}
                        setExercises={setExercises}
                        mode={sportMode}
                        workoutTitle={workoutTitle}
                        setWorkoutTitle={setWorkoutTitle}
                    />
                )}
                {sportMode === 'running' && (
                    <RunningView
                        distance={runDistance}
                        setDistance={updateDistanceManual}
                        time={elapsedSeconds}
                        workoutTitle={workoutTitle}
                        setWorkoutTitle={setWorkoutTitle}
                        isPaused={isPaused}
                        toggleTimer={toggleTimer}
                        handleFinish={handleFinish}
                        gpsStatus={gpsStatus}
                        setGpsStatus={setGpsStatus}
                        heartRate={heartRate}
                        instantPace={instantPace}
                        currentZone={currentZone}
                        elevationGain={elevationGain}
                        openSync={() => setShowSyncModal(true)}
                        accuracy={gpsAccuracy}
                        logMode={logMode}
                        setTime={setElapsedSeconds}
                    />
                )}
                {(sportMode === 'cross_training' || sportMode === 'ocr') && (
                    <CrossTrainingView
                        blocks={blocks}
                        setBlocks={setBlocks}
                        distance={runDistance}
                        setDistance={updateDistanceManual}
                        isOCR={sportMode === 'ocr'}
                        isGuided={isGuided}
                        workoutTitle={workoutTitle}
                        setWorkoutTitle={setWorkoutTitle}
                        elapsedSeconds={elapsedSeconds}
                    />
                )}
                {sportMode === 'other' && (
                    <GymView
                        exercises={exercises}
                        setExercises={setExercises}
                        workoutTitle={workoutTitle}
                        setWorkoutTitle={setWorkoutTitle}
                    />
                )}
                {sportMode === 'hybrid' && (
                    <HybridView
                        time={elapsedSeconds}
                        exercises={exercises}
                        setExercises={setExercises}
                        blocks={blocks}
                        setBlocks={setBlocks}
                        workoutTitle={workoutTitle}
                        setWorkoutTitle={setWorkoutTitle}
                    />
                )}

                {/* Final Summary Display - Only show when we have content or session is in progress */}
                {((sportMode === 'cross_training' || sportMode === 'ocr' ? blocks.length > 0 : exercises.length > 0) || elapsedSeconds > 0) && (
                    <div className="bg-[#111] border border-white/10 rounded-[40px] p-8 space-y-6">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-white font-heading font-black italic text-lg flex items-center gap-2">
                                <Activity className={clsx("w-5 h-5", themeColor)} />
                                RESUMEN DE SESIÓN
                            </h3>
                            {workoutTitle && workoutTitle !== "Sesión de entrenamiento" && (
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] ml-7">
                                    {workoutTitle}
                                </p>
                            )}
                        </div>

                        {/* General Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
                                    Tiempo Total
                                </p>
                                <input
                                    type="text"
                                    value={isEditingTime ? manualTimeInput : formatTime(elapsedSeconds)}
                                    onChange={(e) => handleManualTimeChange(e.target.value)}
                                    onFocus={() => { setManualTimeInput(formatTime(elapsedSeconds)); setIsEditingTime(true); }}
                                    onBlur={commitManualTime}
                                    onKeyDown={(e) => e.key === 'Enter' && commitManualTime()}
                                    disabled={!isPaused}
                                    className={clsx(
                                        "bg-transparent text-xl font-mono font-black outline-none w-full transition-colors",
                                        isPaused ? "text-brand-red focus:text-white cursor-edit" : "text-white"
                                    )}
                                />
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
                                    Intensidad (RPE)
                                </p>
                                <select
                                    value={rpe}
                                    onChange={(e) => setRpe(parseInt(e.target.value))}
                                    className="bg-transparent text-xl font-mono font-black text-brand-red outline-none w-full"
                                >
                                    <option value="0" className="bg-black text-gray-400">0 - N/A</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                        <option key={val} value={val} className="bg-black text-white">{val} - {val <= 3 ? 'Ligero' : val <= 6 ? 'Moderado' : val <= 8 ? 'Intenso' : 'Máximo'}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Blocks Summary */}
                        {(sportMode === 'cross_training' || sportMode === 'ocr' || (sportMode === 'hybrid' && blocks.length > 0)) && blocks.length > 0 && (
                            <div className="space-y-4">
                                {blocks.map((block: any, i: number) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-white font-bold uppercase text-xs tracking-wider">{block.title || `Bloque ${i + 1}`}</h4>
                                            <span className={clsx("text-[9px] font-black uppercase px-2 py-1 rounded bg-white/10", themeColor)}>
                                                {block.type === 'rft' ? `${block.rounds} RDS FT` : block.type}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-center">
                                            {block.result?.noResult ? (
                                                <div className="bg-black/20 p-2 rounded-lg flex flex-col items-center justify-center">
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Resultado</p>
                                                    <span className="text-gray-600 font-mono font-black text-[10px] uppercase">N/A</span>
                                                </div>
                                            ) : (block.type === 'fortime' || block.type === 'rft') ? (
                                                <div className="bg-black/20 p-2 rounded-lg flex flex-col items-center">
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Tiempo</p>
                                                    <input
                                                        type="text"
                                                        placeholder="--:--"
                                                        value={block.result?.time || ''}
                                                        onChange={(e) => {
                                                            const newBlocks = [...blocks];
                                                            newBlocks[i] = { ...newBlocks[i], result: { ...newBlocks[i].result, time: e.target.value } };
                                                            setBlocks(newBlocks);
                                                        }}
                                                        className="bg-transparent text-white font-mono font-bold text-center outline-none w-full focus:text-brand-red transition-colors"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="bg-black/20 p-2 rounded-lg flex flex-col items-center">
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Rondas</p>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={block.result?.rounds || ''}
                                                        onChange={(e) => {
                                                            const newBlocks = [...blocks];
                                                            newBlocks[i] = { ...newBlocks[i], result: { ...newBlocks[i].result, rounds: parseInt(e.target.value) || 0 } };
                                                            setBlocks(newBlocks);
                                                        }}
                                                        className="bg-transparent text-white font-mono font-bold text-center outline-none w-full focus:text-brand-red transition-colors"
                                                    />
                                                </div>
                                            )}
                                            <div className="bg-black/20 p-2 rounded-lg flex flex-col items-center">
                                                <p className="text-[9px] text-gray-500 font-bold uppercase mb-1">Notas</p>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: 60kg / RPE 8"
                                                    value={block.notes || ''}
                                                    onChange={(e) => {
                                                        const newBlocks = [...blocks];
                                                        newBlocks[i] = { ...newBlocks[i], notes: e.target.value };
                                                        setBlocks(newBlocks);
                                                    }}
                                                    className="bg-transparent text-white font-mono text-xs text-center outline-none w-full focus:text-brand-red transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {sportMode === 'running' && runDistance > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Distancia</p>
                                    <p className="text-xl font-mono font-black text-white">{(runDistance / 1000).toFixed(2)} km</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Ritmo Medio</p>
                                    <p className="text-xl font-mono font-black text-white">{(() => {
                                        const minPerKm = (elapsedSeconds / 60) / (runDistance / 1000);
                                        const pMin = Math.floor(minPerKm);
                                        const pSec = Math.floor((minPerKm - pMin) * 60);
                                        return `${pMin}:${pSec < 10 ? '0' + pSec : pSec}`;
                                    })()} /km</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Desnivel (+)</p>
                                    <p className="text-xl font-mono font-black text-white">{elevationGain} m</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Pulsaciones</p>
                                    <p className="text-xl font-mono font-black text-white">{heartRate || '--'} bpm</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Common Finish Options - Only show when we have content */}
                {((sportMode === 'cross_training' || sportMode === 'ocr' || sportMode === 'hybrid' ? blocks.length > 0 : exercises.length > 0) || elapsedSeconds > 0) && (
                    <>
                        <div className="border-t border-white/5 pt-8 mt-12 bg-white/[0.02] p-6 rounded-[40px] border border-white/5">
                            <h3 className="text-white font-heading font-black italic text-lg mb-6 flex items-center gap-2">
                                <Trophy className={clsx("w-5 h-5", themeColor)} />
                                COMPARTIR VICTORIA
                            </h3>

                            <div className="space-y-6">
                                <button
                                    onClick={() => setShareToArena(!shareToArena)}
                                    className={clsx(
                                        "w-full p-2.5 rounded-2xl border flex items-center gap-3 transition-all group",
                                        shareToArena ? bgTheme + " shadow-lg" : "bg-black/40 border-white/5"
                                    )}
                                >
                                    <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center transition-colors", shareToArena ? "bg-black/20 text-white" : "bg-white/5 text-gray-500")}>
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={clsx("font-black text-[10px] uppercase italic", shareToArena ? "text-white" : "text-gray-500")}>Publicar en Arena</p>
                                    </div>
                                    <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", shareToArena ? "border-transparent bg-white text-black" : "border-white/10")}>
                                        {shareToArena && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                </button>

                                {shareToArena && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-2">Descripción de la publicación</p>
                                        <textarea
                                            placeholder="¿Cómo te has sentido hoy? (Opcional)"
                                            value={arenaDescription}
                                            onChange={(e) => setArenaDescription(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-white/20 transition-all resize-none min-h-[100px] placeholder:text-gray-600"
                                        />
                                    </div>
                                )}

                                <div>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-2">Evidencia Visual (Opcional)</p>
                                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            accept="image/*,video/*"
                                        />

                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className={clsx(
                                                "w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 shrink-0 transition-all group",
                                                isUploading ? "border-brand-red/50 bg-brand-red/5" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30"
                                            )}
                                        >
                                            {isUploading ? (
                                                <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-colors">
                                                    <Plus className="w-5 h-5" />
                                                </div>
                                            )}
                                            <span className="text-[9px] font-black uppercase text-gray-500 group-hover:text-gray-300 transition-colors">{isUploading ? 'Subiendo...' : 'Subir Foto'}</span>
                                        </button>

                                        {imageUrl && (
                                            <div className="w-24 h-24 rounded-2xl border border-white/20 relative overflow-hidden shrink-0 group animate-in zoom-in duration-300">
                                                <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                                <button
                                                    onClick={() => setImageUrl(null)}
                                                    className="absolute top-1 right-1 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="absolute bottom-2 left-2">
                                                    <p className="text-[8px] font-black uppercase text-white bg-brand-red px-1.5 py-0.5 rounded">Media</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pb-12">
                            <button
                                onClick={handleFinish}
                                disabled={isSaving}
                                className={clsx(
                                    "w-full py-6 rounded-[32px] text-white font-heading font-black italic text-2xl uppercase tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
                                    sportMode === 'running' ? 'bg-blue-600' :
                                        sportMode === 'hybrid' ? 'bg-yellow-600' :
                                            sportMode === 'cross_training' ? 'bg-orange-600' :
                                                sportMode === 'ocr' ? 'bg-emerald-600' :
                                                    sportMode === 'other' ? 'bg-gray-600' : 'bg-brand-red'
                                )}
                            >
                                {isSaving ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Save className="w-6 h-6" /> FINALIZAR SESIÓN</>}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Mobile Fixed Controls - Dynamic hide on scroll */}
            {logMode === 'live' && ((sportMode === 'cross_training' || sportMode === 'ocr' || sportMode === 'hybrid' ? blocks.length > 0 : true) || elapsedSeconds > 0) && (
                <div className={clsx(
                    "sm:hidden fixed bottom-6 inset-x-4 z-[250] bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 transition-all duration-500 shadow-2xl",
                    showControls ? "translate-y-0 opacity-100" : "translate-y-[150%] opacity-0"
                )}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTimer}
                            className={clsx(
                                "flex-1 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-sm",
                                isPaused ? "bg-white text-black shadow-white/10 shadow-lg" : "bg-white/10 text-white"
                            )}
                        >
                            {countdown !== null ? (
                                <span className="text-xl font-black text-brand-red animate-ping">{countdown}</span>
                            ) : isPaused ? (
                                <><Play className="w-5 h-5 fill-current" /> Reanudar</>
                            ) : (
                                <><Pause className="w-5 h-5 fill-current" /> Pausa</>
                            )}
                        </button>
                        <button
                            onClick={handleFinish}
                            disabled={isSaving}
                            className={clsx(
                                "p-4 rounded-2xl shadow-glow transition-all flex items-center justify-center",
                                sportMode === 'running' ? 'bg-blue-600' :
                                    sportMode === 'hybrid' ? 'bg-yellow-600' :
                                        sportMode === 'cross_training' ? 'bg-orange-600' :
                                            sportMode === 'ocr' ? 'bg-emerald-600' :
                                                sportMode === 'other' ? 'bg-gray-600' : 'bg-brand-red'
                            )}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-6 h-6 text-white" />}
                        </button>
                    </div>
                </div>
            )}
            {/* Video Trimmer Modal */}
            {
                isVideoTrimming && trimmerVideoUrl && (
                    <div className="fixed inset-0 z-[500] bg-black/98 flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto">
                        <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[40px] p-6 md:p-10 shadow-2xl relative my-auto">
                            <button
                                onClick={() => { setIsVideoTrimming(false); setTrimmerVideoUrl(null); }}
                                className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>

                            <div className="mb-6 md:mb-8 text-center px-4">
                                <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">Recortar Video</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tu video dura {Math.round(videoDuration)}s - Recorta a máximo 60s</p>
                            </div>

                            <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 mb-6 md:mb-8 shadow-inner">
                                <video
                                    ref={trimmerVideoRef}
                                    src={trimmerVideoUrl}
                                    className="w-full h-full object-contain"
                                    loop
                                    muted
                                    playsInline
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end px-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Punto de inicio</label>
                                        <span className="text-xl font-black text-brand-red italic tracking-tighter">{Math.floor(trimStart)}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={Math.max(0, videoDuration - 60)}
                                        step="0.5"
                                        value={trimStart}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTrimStart(val);
                                            if (trimmerVideoRef.current) trimmerVideoRef.current.currentTime = val;
                                        }}
                                        className="w-full accent-brand-red h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[8px] font-bold text-gray-600 uppercase tracking-widest px-1">
                                        <span>Inicio</span>
                                        <span>Fin - 60s</span>
                                    </div>
                                </div>

                                <button
                                    onClick={processTrimming}
                                    disabled={isTrimmingLoading}
                                    className="w-full bg-brand-red text-white py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden"
                                >
                                    {isTrimmingLoading ? (
                                        <>
                                            <div className="absolute inset-0 bg-white/10" style={{ width: `${trimProgress}%`, transition: 'width 0.3s ease' }} />
                                            <div className="flex items-center gap-3 relative z-10">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Procesando {Math.round(trimProgress)}%
                                            </div>
                                        </>
                                    ) : (
                                        <><Activity className="w-4 h-4 md:w-5 md:h-5" /> Confirmar Recorte</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

const WORKOUT_POOL: Record<string, Record<string, TrainingPlan[]>> = {
    gym: {
        upper: [
            {
                id: 'g-u-1', title: 'Torso Fuerza', sport: 'gym', difficulty: 'intermediate', duration_min: 45, is_premium: false, description: 'Tracciones y empujes pesados para fuerza base.', exercises: [
                    { name: 'Bench Press', sets: [{ order: 1, reps: 6, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 6, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 6, weight: 60, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Pull Ups', sets: [{ order: 1, reps: 8, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 8, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 8, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Barbell Row', sets: [{ order: 1, reps: 10, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 10, weight: 40, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Lateral Raises', sets: [{ order: 1, reps: 15, weight: 8, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 8, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            },
            {
                id: 'g-u-2', title: 'Upper Body Pump', sport: 'gym', difficulty: 'beginner', duration_min: 35, is_premium: false, description: 'Congestión muscular rápida con alto volumen.', exercises: [
                    { name: 'Push Ups', sets: [{ order: 1, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Dips', sets: [{ order: 1, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Bicep Curls', sets: [{ order: 1, reps: 15, weight: 10, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 10, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Tricep Extension', sets: [{ order: 1, reps: 15, weight: 12, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 12, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            },
            {
                id: 'g-u-3', title: 'Hombros de Acero', sport: 'gym', difficulty: 'elite', duration_min: 50, is_premium: true, description: 'Enfoque en deltoides y trapecio para unos hombros potentes.', exercises: [
                    { name: 'Military Press', sets: [{ order: 1, reps: 6, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 6, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 6, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 4, reps: 6, weight: 40, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Face Pulls', sets: [{ order: 1, reps: 15, weight: 20, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 20, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 15, weight: 20, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Pike Pushups', sets: [{ order: 1, reps: 10, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 10, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Front Raises', sets: [{ order: 1, reps: 12, weight: 10, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 10, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            }
        ],
        lower: [
            {
                id: 'g-l-1', title: 'Pierna Potencia', sport: 'gym', difficulty: 'elite', duration_min: 60, is_premium: false, description: 'Sentadillas y peso muerto para fuerza explosiva.', exercises: [
                    { name: 'Squat', sets: [{ order: 1, reps: 5, weight: 80, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 5, weight: 80, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 5, weight: 80, completed: false, unit: 'kg', measure: 'reps' }, { order: 4, reps: 5, weight: 80, completed: false, unit: 'kg', measure: 'reps' }, { order: 5, reps: 5, weight: 80, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Deadlift', sets: [{ order: 1, reps: 5, weight: 100, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 5, weight: 100, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 5, weight: 100, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Walking Lunges', sets: [{ order: 1, reps: 20, weight: 16, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 20, weight: 16, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Calf Raises', sets: [{ order: 1, reps: 15, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 15, weight: 40, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            },
            {
                id: 'g-l-2', title: 'Glúteo & Isquios', sport: 'gym', difficulty: 'intermediate', duration_min: 45, is_premium: false, description: 'Aislamiento de cadena posterior para estabilidad y estética.', exercises: [
                    { name: 'Hip Thrust', sets: [{ order: 1, reps: 10, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 10, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 10, weight: 60, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Romanian Deadlift', sets: [{ order: 1, reps: 10, weight: 50, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 10, weight: 50, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 10, weight: 50, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Hamstring Curl', sets: [{ order: 1, reps: 12, weight: 30, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 30, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Glute Bridge', sets: [{ order: 1, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            },
            {
                id: 'g-l-3', title: 'Cuádriceps Blast', sport: 'gym', difficulty: 'intermediate', duration_min: 40, is_premium: true, description: 'Volumen alto enfocado en el desarrollo de los cuádriceps.', exercises: [
                    { name: 'Leg Press', sets: [{ order: 1, reps: 12, weight: 120, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 120, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 12, weight: 120, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Leg Extension', sets: [{ order: 1, reps: 15, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 15, weight: 40, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Bulgarian Split Squat', sets: [{ order: 1, reps: 10, weight: 12, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 10, weight: 12, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Step Ups', sets: [{ order: 1, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            }
        ],
        full: [
            {
                id: 'g-f-1', title: 'Full Body Classics', sport: 'gym', difficulty: 'beginner', duration_min: 45, is_premium: false, description: 'Cuerpo completo balanceado con ejercicios fundamentales.', exercises: [
                    { name: 'Goblet Squat', sets: [{ order: 1, reps: 12, weight: 16, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 16, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 12, weight: 16, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Push Ups', sets: [{ order: 1, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Inverted Row', sets: [{ order: 1, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 12, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Plank', sets: [{ order: 1, reps: 60, weight: 0, completed: false, unit: 'sec', measure: 'reps' }, { order: 2, reps: 60, weight: 0, completed: false, unit: 'sec', measure: 'reps' }] }
                ]
            },
            {
                id: 'g-f-2', title: 'Athlete Metabolic', sport: 'gym', difficulty: 'intermediate', duration_min: 50, is_premium: false, description: 'Entrenamiento funcional híbrido para potencia y resistencia.', exercises: [
                    { name: 'Cleans', sets: [{ order: 1, reps: 8, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 8, weight: 40, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 8, weight: 40, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Thrusters', sets: [{ order: 1, reps: 12, weight: 30, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 12, weight: 30, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 12, weight: 30, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Kettlebell Swings', sets: [{ order: 1, reps: 20, weight: 16, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 20, weight: 16, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 20, weight: 16, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Burpees', sets: [{ order: 1, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 15, weight: 0, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            },
            {
                id: 'g-f-3', title: 'Total Body Strength', sport: 'gym', difficulty: 'elite', duration_min: 55, is_premium: true, description: 'Fuerza absoluta multiarticular de alta intensidad.', exercises: [
                    { name: 'Front Squat', sets: [{ order: 1, reps: 5, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 5, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 5, weight: 60, completed: false, unit: 'kg', measure: 'reps' }, { order: 4, reps: 5, weight: 60, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Weighted Pullups', sets: [{ order: 1, reps: 5, weight: 10, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 5, weight: 10, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 5, weight: 10, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Overhead Press', sets: [{ order: 1, reps: 5, weight: 45, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 5, weight: 45, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 5, weight: 45, completed: false, unit: 'kg', measure: 'reps' }] },
                    { name: 'Deadlift', sets: [{ order: 1, reps: 5, weight: 100, completed: false, unit: 'kg', measure: 'reps' }, { order: 2, reps: 5, weight: 100, completed: false, unit: 'kg', measure: 'reps' }, { order: 3, reps: 5, weight: 100, completed: false, unit: 'kg', measure: 'reps' }] }
                ]
            }
        ]
    },
    running: {
        recovery: [
            { id: 'r-r-1', title: 'Trote Regenerativo', sport: 'running', difficulty: 'beginner', duration_min: 25, is_premium: false, description: 'Recuperación activa.', exercises: [{ name: 'Recovery Run', sets: [{ reps: 1, weight: 4000 }] }] },
            { id: 'r-r-2', title: 'Flow Aero', sport: 'running', difficulty: 'beginner', duration_min: 30, is_premium: false, description: 'Carrera suave en Z2.', exercises: [{ name: 'Soft Run', sets: [{ reps: 1, weight: 5000 }] }] },
            { id: 'r-r-3', title: 'Piernas Sueltas', sport: 'running', difficulty: 'beginner', duration_min: 20, is_premium: false, description: 'Soltar piernas sin fatiga.', exercises: [{ name: 'Easy Pace', sets: [{ reps: 1, weight: 3000 }] }] }
        ],
        intervals: [
            { id: 'r-i-1', title: 'Series de 400m', sport: 'running', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'VO2 Máx y velocidad.', exercises: [{ name: 'Intervalos 400m', sets: [{ reps: 8, weight: 400 }] }] },
            { id: 'r-i-2', title: 'Fartlek RIVAL', sport: 'running', difficulty: 'elite', duration_min: 35, is_premium: true, description: 'Cambios de ritmo bruscos.', exercises: [{ name: 'Fartlek 2x5m', sets: [{ reps: 2, weight: 2000 }] }] },
            { id: 'r-i-3', title: 'Pirámide Velocidad', sport: 'running', difficulty: 'intermediate', duration_min: 45, is_premium: false, description: 'Escalones de 200 a 800m.', exercises: [{ name: 'Speed Pyramid', sets: [{ reps: 5, weight: 800 }] }] }
        ],
        long: [
            { id: 'r-l-1', title: 'Base Aeróbica 10K', sport: 'running', difficulty: 'beginner', duration_min: 60, is_premium: false, description: 'Resistencia de base.', exercises: [{ name: 'Long Run', sets: [{ reps: 1, weight: 10000 }] }] },
            { id: 'r-l-2', title: 'Umbral 12K', sport: 'running', difficulty: 'intermediate', duration_min: 75, is_premium: false, description: 'Pase de unbral láctico.', exercises: [{ name: 'Threshold Run', sets: [{ reps: 1, weight: 12000 }] }] },
            { id: 'r-l-3', title: 'Desafío 15K', sport: 'running', difficulty: 'elite', duration_min: 90, is_premium: true, description: 'Tirada larga de domingo.', exercises: [{ name: 'Endurance Run', sets: [{ reps: 1, weight: 15000 }] }] }
        ]
    },
    cross_training: {
        endurance: [
            { id: 'c-e-1', title: 'Engine Builder (AMRAP 20)', sport: 'cross_training', difficulty: 'intermediate', duration_min: 20, is_premium: false, description: 'AMRAP 20: 400m Run, 20 KB Swings, 15 Box Jumps.', exercises: [{ name: 'Run 400m', sets: [{ reps: 1 }] }, { name: 'KB Swings', sets: [{ reps: 20 }] }, { name: 'Box Jumps', sets: [{ reps: 15 }] }] },
            { id: 'c-e-2', title: 'Row & Burpee Long (For Time)', sport: 'cross_training', difficulty: 'elite', duration_min: 30, is_premium: true, description: 'For Time: 2000m Row + 50 Burpees over Row.', exercises: [{ name: 'Row', sets: [{ reps: 1, weight: 2000 }] }, { name: 'Burpees over Row', sets: [{ reps: 50 }] }] },
            { id: 'c-e-3', title: 'Turbo EMOM (40 min)', sport: 'cross_training', difficulty: 'elite', duration_min: 40, is_premium: true, description: 'EMOM 40: Min 1: 15 Cal Row, Min 2: 15 Cal Ski, Min 3: 15 Cal Bike, Min 4: Rest.', exercises: [{ name: 'Row Cal', sets: [{ reps: 15 }] }, { name: 'Ski Cal', sets: [{ reps: 15 }] }, { name: 'Bike Cal', sets: [{ reps: 15 }] }] }
        ],
        gymnastics: [
            { id: 'c-g-1', title: 'Cindy (AMRAP 20)', sport: 'cross_training', difficulty: 'intermediate', duration_min: 20, is_premium: false, description: 'Clásico: 5 Pull-ups, 10 Push-ups, 15 Air Squats.', exercises: [{ name: 'Pull-ups', sets: [{ reps: 5 }] }, { name: 'Push-ups', sets: [{ reps: 10 }] }, { name: 'Air Squats', sets: [{ reps: 15 }] }] },
            { id: 'c-g-2', title: 'Strict Skill EMOM', sport: 'cross_training', difficulty: 'elite', duration_min: 15, is_premium: false, description: 'EMOM 12: Min 1: 5 HSPU, Min 2: 8 C2B, Min 3: 10 Pistol Squats.', exercises: [{ name: 'HSPU', sets: [{ reps: 5 }] }, { name: 'C2B Pull-ups', sets: [{ reps: 8 }] }, { name: 'Pistol Squats', sets: [{ reps: 10 }] }] },
            { id: 'c-g-3', title: 'Muscle Up Flow', sport: 'cross_training', difficulty: 'elite', duration_min: 20, is_premium: true, description: '3 Rounds: 10 Muscle Ups + 30 Double Unders + 20 Hollow Rocks.', exercises: [{ name: 'Muscle Ups', sets: [{ reps: 10 }] }, { name: 'Double Unders', sets: [{ reps: 30 }] }, { name: 'Hollow Rocks', sets: [{ reps: 20 }] }] }
        ],
        halterofilia: [
            { id: 'c-h-1', title: 'Grace (For Time)', sport: 'cross_training', difficulty: 'intermediate', duration_min: 10, is_premium: false, description: 'CrossFit Hero: 30 Clean & Jerks (60/40kg) por tiempo.', exercises: [{ name: 'Clean & Jerk', sets: [{ reps: 30, weight: 60 }] }] },
            { id: 'c-h-2', title: 'Snatch Technique & Strength', sport: 'cross_training', difficulty: 'elite', duration_min: 30, is_premium: false, description: '5 sets of: 2 Power Snatch + 1 Squat Snatch + 2 Overhead Squat.', exercises: [{ name: 'Snatch Complex', sets: [{ reps: 5 }] }] },
            { id: 'c-h-3', title: 'Hero WOD: DT', sport: 'cross_training', difficulty: 'elite', duration_min: 20, is_premium: true, description: '5 Rounds: 12 Deadlifts, 9 Hang Power Cleans, 6 Push Jerks (70/45kg).', exercises: [{ name: 'Deadlift', sets: [{ reps: 12, weight: 70 }] }, { name: 'Hang Power Clean', sets: [{ reps: 9, weight: 70 }] }, { name: 'Push Jerk', sets: [{ reps: 6, weight: 70 }] }] }
        ]
    },
    hybrid: {
        'run-focus': [
            { id: 'h-r-1', title: 'Interv. Híbridos', sport: 'hybrid', difficulty: 'intermediate', duration_min: 45, is_premium: false, description: 'Carrera intercalada con ejercicios funcionales de alta repetición.', exercises: [{ name: 'Run 1km', sets: [{ reps: 1 }] }, { name: 'Burpees', sets: [{ reps: 30 }] }, { name: 'Run 1km', sets: [{ reps: 1 }] }, { name: 'Air Squats', sets: [{ reps: 50 }] }] },
            { id: 'h-r-2', title: 'RIVAL Race Pace', sport: 'hybrid', difficulty: 'elite', duration_min: 50, is_premium: true, description: 'Ritmo de competición. Burpees, zancadas y carrera rápida.', exercises: [{ name: 'Run 2km', sets: [{ reps: 1 }] }, { name: 'Burpees', sets: [{ reps: 80 }] }, { name: 'Lunges', sets: [{ reps: 100 }] }] },
            { id: 'h-r-3', title: 'Tempo Híbrido', sport: 'hybrid', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'Zonas de potencia sostenida en remo y carrera.', exercises: [{ name: 'Row 500m', sets: [{ reps: 4 }] }, { name: 'Run 1km', sets: [{ reps: 3 }] }] }
        ],
        'strength-focus': [
            { id: 'h-s-1', title: 'Strongman Cardio', sport: 'hybrid', difficulty: 'elite', duration_min: 55, is_premium: false, description: 'Sleds, Farmer Carries y empuje de potencia.', exercises: [{ name: 'Sled Push 50m', sets: [{ reps: 4 }] }, { name: 'Farmer Carry 100m', sets: [{ reps: 4 }] }, { name: 'Run 400m', sets: [{ reps: 4 }] }] },
            { id: 'h-s-2', title: 'Burpee Broad Jump Flow', sport: 'hybrid', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'Saltos de longitud combinados con resistencia muscular.', exercises: [{ name: 'Burpee Broad Jumps', sets: [{ reps: 100 }] }, { name: 'Run 800m', sets: [{ reps: 2 }] }] },
            { id: 'h-s-3', title: 'Sandbag Carry Blast', sport: 'hybrid', difficulty: 'elite', duration_min: 45, is_premium: true, description: 'Cargas inestables para estabilidad central y potencia.', exercises: [{ name: 'Sandbag Carry 200m', sets: [{ reps: 3 }] }, { name: 'Sandbag Lunges', sets: [{ reps: 50 }] }, { name: 'Run 1km', sets: [{ reps: 1 }] }] }
        ],
        race: [
            { id: 'h-ra-1', title: 'HYROX Full Sim', sport: 'hybrid', difficulty: 'elite', duration_min: 75, is_premium: true, description: 'Simulación completa: Ski Erg, Sleds y Burpee Broad Jumps.', exercises: [{ name: 'Ski Erg 1000m', sets: [{ reps: 1 }] }, { name: 'Sled Push 50m', sets: [{ reps: 2 }] }, { name: 'Sled Pull 50m', sets: [{ reps: 2 }] }, { name: 'Burpee Broad Jumps 80m', sets: [{ reps: 1 }] }] },
            { id: 'h-ra-2', title: 'Deka Strong Prep', sport: 'hybrid', difficulty: 'intermediate', duration_min: 30, is_premium: false, description: 'Estaciones de alta intensidad para Deka Fit/Strong.', exercises: [{ name: 'Lunges', sets: [{ reps: 100 }] }, { name: 'Row 500m', sets: [{ reps: 1 }] }, { name: 'Box Jumps', sets: [{ reps: 30 }] }] },
            { id: 'h-ra-3', title: 'Hybrid Power Trail', sport: 'hybrid', difficulty: 'elite', duration_min: 60, is_premium: true, description: 'Carrera por montaña combinada con ejercicios funcionales pesados.', exercises: [{ name: 'Mountain Run 2km', sets: [{ reps: 1 }] }, { name: 'Step Ups', sets: [{ reps: 50 }] }, { name: 'Sandbag Carry', sets: [{ reps: 1 }] }] }
        ]
    },
    ocr: {
        grip: [
            { id: 'o-g-1', title: 'Monkey Bar Master', sport: 'ocr', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'Fuerza de tracción.', exercises: [{ name: 'Pull Ups', sets: [{ reps: 12 }] }] },
            { id: 'o-g-2', title: 'Dead Hang Routine', sport: 'ocr', difficulty: 'beginner', duration_min: 30, is_premium: false, description: 'Resistencia de dedos.', exercises: [{ name: 'Dead Hang', sets: [{ reps: 3 }] }] },
            { id: 'o-g-3', title: 'Suspensión Elite', sport: 'ocr', difficulty: 'elite', duration_min: 45, is_premium: true, description: 'Agarres explosivos.', exercises: [{ name: 'Muscle Ups', sets: [{ reps: 5 }] }] }
        ],
        carry: [
            { id: 'o-c-1', title: 'Sandbag Hill', sport: 'ocr', difficulty: 'elite', duration_min: 50, is_premium: true, description: 'Carga en desnivel.', exercises: [{ name: 'Sandbag Run', sets: [{ reps: 1 }] }] },
            { id: 'o-c-2', title: 'Bucket Carry Prep', sport: 'ocr', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'Peso frontal.', exercises: [{ name: 'Bucket Hold', sets: [{ reps: 2 }] }] },
            { id: 'o-c-3', title: 'Farmer OCR Force', sport: 'ocr', difficulty: 'elite', duration_min: 45, is_premium: false, description: 'Pasos de potencia.', exercises: [{ name: 'Farmer Carry', sets: [{ reps: 4 }] }] }
        ],
        trail: [
            { id: 'o-t-1', title: 'Trail Vertical', sport: 'ocr', difficulty: 'elite', duration_min: 60, is_premium: false, description: 'Subidas explosivas.', exercises: [{ name: 'Hill Repeats', sets: [{ reps: 5 }] }] },
            { id: 'o-t-2', title: 'Desnivel Técnico', sport: 'ocr', difficulty: 'intermediate', duration_min: 45, is_premium: true, description: 'Bajadas rápidas.', exercises: [{ name: 'Tech Trail', sets: [{ reps: 1 }] }] },
            { id: 'o-t-3', title: 'OCR Endurance Trail', sport: 'ocr', difficulty: 'elite', duration_min: 80, is_premium: false, description: 'Tirada larga montaña.', exercises: [{ name: 'Mountain Run', sets: [{ reps: 1 }] }] }
        ]
    },
    calisthenics: {
        upper: [
            { id: 'c-u-1', title: 'Handstand Mastery', sport: 'calisthenics', difficulty: 'intermediate', duration_min: 45, is_premium: false, description: 'Control de pino.', exercises: [{ name: 'Handstand Hold', sets: [{ reps: 3 }] }] },
            { id: 'c-u-2', title: 'Planche Progress', sport: 'calisthenics', difficulty: 'elite', duration_min: 50, is_premium: true, description: 'Fuerza de empuje.', exercises: [{ name: 'Planche Lean', sets: [{ reps: 5 }] }] },
            { id: 'c-u-3', title: 'Dips & Push Ups', sport: 'calisthenics', difficulty: 'beginner', duration_min: 35, is_premium: false, description: 'Base de empuje.', exercises: [{ name: 'Dips', sets: [{ reps: 15 }] }] }
        ],
        lower: [
            { id: 'c-l-1', title: 'Pistol Foundation', sport: 'calisthenics', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'Sentadilla a una pierna.', exercises: [{ name: 'Pistol Squat', sets: [{ reps: 5 }] }] },
            { id: 'c-l-2', title: 'Explosive Body', sport: 'calisthenics', difficulty: 'elite', duration_min: 35, is_premium: true, description: 'Saltos de potencia.', exercises: [{ name: 'Box Jumps', sets: [{ reps: 12 }] }] },
            { id: 'c-l-3', title: 'Bodyweight Legs', sport: 'calisthenics', difficulty: 'beginner', duration_min: 45, is_premium: false, description: 'Zancadas y saltos.', exercises: [{ name: 'Lunges', sets: [{ reps: 40 }] }] }
        ],
        pull: [
            { id: 'c-p-1', title: 'Muscle Up Prep', sport: 'calisthenics', difficulty: 'elite', duration_min: 50, is_premium: true, description: 'Tracción explosiva.', exercises: [{ name: 'Muscle Ups', sets: [{ reps: 5 }] }] },
            { id: 'c-p-2', title: 'Front Lever Path', sport: 'calisthenics', difficulty: 'elite', duration_min: 45, is_premium: false, description: 'Fuerza isométrica.', exercises: [{ name: 'Tuck Lever', sets: [{ reps: 3 }] }] },
            { id: 'c-p-3', title: 'Back Lever Basics', sport: 'calisthenics', difficulty: 'intermediate', duration_min: 40, is_premium: false, description: 'Control de suspensión.', exercises: [{ name: 'Skin the Cat', sets: [{ reps: 5 }] }] }
        ]
    },
    other: {
        mobility: [
            { id: 'o-m-1', title: 'Flow Articular', sport: 'other', difficulty: 'beginner', duration_min: 20, is_premium: false, description: 'Movilidad general para antes o después de entrenar.', exercises: [{ name: 'Cat-Cow', sets: [{ reps: 10 }] }, { name: 'World Greatest Stretch', sets: [{ reps: 5 }] }] },
            { id: 'o-m-2', title: 'Yoga para Atletas', sport: 'other', difficulty: 'intermediate', duration_min: 30, is_premium: false, description: 'Flexibilidad dinámica y equilibrio.', exercises: [{ name: 'Sun Salutation', sets: [{ reps: 5 }] }] },
            { id: 'o-m-3', title: 'Liberación Miofascial', sport: 'other', difficulty: 'beginner', duration_min: 15, is_premium: true, description: 'Uso de foam roller y pelota de lacrosse.', exercises: [{ name: 'Foam Roll Quads', sets: [{ reps: 1, weight: 60 }] }] }
        ],
        cardio: [
            { id: 'o-ca-1', title: 'Natación Regenerativa', sport: 'other', difficulty: 'beginner', duration_min: 40, is_premium: false, description: 'Nado suave 1000m.', exercises: [{ name: 'Swimming', sets: [{ reps: 1, weight: 1000 }] }] },
            { id: 'o-ca-2', title: 'Ciclismo Suave', sport: 'other', difficulty: 'intermediate', duration_min: 60, is_premium: false, description: 'Rodaje en Z1-Z2.', exercises: [{ name: 'Cycling', sets: [{ reps: 1, weight: 20000 }] }] },
            { id: 'o-ca-3', title: 'Caminata con Pendiente', sport: 'other', difficulty: 'intermediate', duration_min: 45, is_premium: true, description: 'Inclinación 10% a 5km/h.', exercises: [{ name: 'Incline Walk', sets: [{ reps: 1, weight: 3000 }] }] }
        ],
        core: [
            { id: 'o-co-1', title: 'Core Blast', sport: 'other', difficulty: 'intermediate', duration_min: 15, is_premium: false, description: 'Circuito abdominal intenso.', exercises: [{ name: 'Plank', sets: [{ reps: 60 }] }, { name: 'Hollow Hold', sets: [{ reps: 30 }] }] },
            { id: 'o-co-2', title: 'Isométricos de Acero', sport: 'other', difficulty: 'elite', duration_min: 20, is_premium: false, description: 'L-sit y planchas laterales pesadas.', exercises: [{ name: 'L-Sit', sets: [{ reps: 20 }] }] },
            { id: 'o-co-3', title: 'Pilates para Fuerza', sport: 'other', difficulty: 'intermediate', duration_min: 25, is_premium: true, description: 'Control central y respiración.', exercises: [{ name: 'The Hundred', sets: [{ reps: 100 }] }] }
        ]
    }
};

const SPORT_META: Record<string, { emoji: string; label: string; color: string; borderColor: string; bgColor: string }> = {
    gym:           { emoji: '🏋️', label: 'Gimnasio',      color: 'text-brand-red',  borderColor: 'border-brand-red',  bgColor: 'bg-brand-red' },
    running:       { emoji: '🏃', label: 'Running',       color: 'text-blue-400',   borderColor: 'border-blue-400',   bgColor: 'bg-blue-500' },
    cross_training:{ emoji: '⚡', label: 'Cross Training', color: 'text-orange-400', borderColor: 'border-orange-400', bgColor: 'bg-orange-500' },
    hybrid:        { emoji: '🔥', label: 'Hybrid',        color: 'text-yellow-400', borderColor: 'border-yellow-400', bgColor: 'bg-yellow-500' },
    calisthenics:  { emoji: '💪', label: 'Calistenia',    color: 'text-purple-400', borderColor: 'border-purple-400', bgColor: 'bg-purple-500' },
    ocr:           { emoji: '🧗', label: 'OCR',            color: 'text-emerald-400',borderColor: 'border-emerald-400',bgColor: 'bg-emerald-500' },
    cycling:       { emoji: '🚴', label: 'Ciclismo',      color: 'text-green-400',  borderColor: 'border-green-400',  bgColor: 'bg-green-500' },
    swimming:      { emoji: '🏊', label: 'Natación',      color: 'text-sky-400',    borderColor: 'border-sky-400',    bgColor: 'bg-sky-500' },
    other:         { emoji: '➕', label: 'Otros',          color: 'text-gray-400',   borderColor: 'border-gray-400',   bgColor: 'bg-gray-500' },
};

function SportSelector({ onSelect, onPlanSelect, guidedCount, userTier }: { onSelect: (mode: SportMode) => void, onPlanSelect: (plan: TrainingPlan) => void, guidedCount: number, userTier: string }) {
    const { theme } = useTheme();
    const [selectedSport, setSelectedSport] = useState<SportMode>(null);
    const [view, setView] = useState<'list' | 'quick-start' | 'ai'>('list');
    const [recommendations, setRecommendations] = useState<TrainingPlan[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);
    const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
    const router = useRouter();

    const handleSportClick = (mode: SportMode) => {
        setSelectedSport(mode);
        setView('quick-start');   // ← skip the "options" intermediate screen
        setSelectedFocus(null);
    }

    const fetchRecommendations = async (overrideFocus?: string) => {
        if (!selectedSport) return;
        setLoadingAi(true);
        setView('ai');
        await new Promise(r => setTimeout(r, 1500));

        const activeFocus = overrideFocus || selectedFocus;

        // Rotation Logic: Constant index that changes only when the day changes.
        const rotationIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % 3;
        let recs: TrainingPlan[] = [];

        const sportPool = WORKOUT_POOL[selectedSport];
        if (sportPool && activeFocus && sportPool[activeFocus]) {
            recs = [sportPool[activeFocus][rotationIdx]];
        } else {
            // General Fallback
            recs = await getAiRecommendation(selectedSport, 'premium');
        }

        setRecommendations(recs);
        setLoadingAi(false);
    }

    const startFreestyle = () => {
        onSelect(selectedSport);
    }

    const startPlan = (plan: TrainingPlan) => {
        onPlanSelect(plan);
    }

    // ── QUICK-START: replaces the old "options" + "guided-question" screens ─────
    if (view === 'quick-start' && selectedSport) {
        const meta = SPORT_META[selectedSport] || SPORT_META.other;
        const limits = { free: 2, premium: 4, elite: 6 };
        const currentLimit = limits[userTier as keyof typeof limits] || 2;
        const isLimitReached = guidedCount >= currentLimit;

        const OBJECTIVES: Record<string, { id: string; title: string; desc: string }[]> = {
            gym:           [{ id: 'upper', title: 'Tren Superior', desc: 'Pecho · Espalda · Brazos' }, { id: 'lower', title: 'Tren Inferior', desc: 'Pierna · Glúteo · Gemelo' }, { id: 'full', title: 'Full Body', desc: 'Cuerpo completo' }],
            calisthenics:  [{ id: 'upper', title: 'Empuje', desc: 'Handstand · Planche · Dips' }, { id: 'pull', title: 'Tracción', desc: 'Muscle Up · Front Lever' }, { id: 'lower', title: 'Pierna', desc: 'Pistol Squats · Saltos' }],
            running:       [{ id: 'recovery', title: 'Recuperación', desc: 'Trote suave' }, { id: 'intervals', title: 'Intervalos', desc: 'Velocidad · VO2 Máx' }, { id: 'long', title: 'Larga Distancia', desc: 'Resistencia base' }],
            cross_training:[{ id: 'endurance', title: 'MetCon', desc: 'Cardio · Alta repetición' }, { id: 'gymnastics', title: 'Gimnásticos', desc: 'HSPU · Pull Ups · Core' }, { id: 'halterofilia', title: 'Fuerza', desc: 'Barra · Técnica · Potencia' }],
            hybrid:        [{ id: 'run-focus', title: 'Enfoque Carrera', desc: 'Intervalos con fatiga' }, { id: 'strength-focus', title: 'Funcional', desc: 'Sleds · Lunges · Burpees' }, { id: 'race', title: 'Simulación', desc: 'Prep. de evento' }],
            ocr:           [{ id: 'grip', title: 'Agarre', desc: 'Monkey bars · Pull ups' }, { id: 'carry', title: 'Cargas', desc: 'Sandbags · Bucket carry' }, { id: 'trail', title: 'Trail', desc: 'Desnivel · Terreno irregular' }],
            other:         [{ id: 'mobility', title: 'Movilidad', desc: 'Flexibilidad y Flow' }, { id: 'cardio', title: 'Cardio LISS', desc: 'Baja intensidad' }, { id: 'core', title: 'Core', desc: 'Estabilidad central' }],
            cycling:       [{ id: 'endurance', title: 'Resistencia', desc: 'Fondo y constancia' }, { id: 'intervals', title: 'Intervalos', desc: 'Potencia y velocidad' }, { id: 'recovery', title: 'Recuperación', desc: 'Rodaje suave' }],
            swimming:      [{ id: 'technique', title: 'Técnica', desc: 'Estilo y eficiencia' }, { id: 'endurance', title: 'Resistencia', desc: 'Series largas' }, { id: 'intervals', title: 'Velocidad', desc: 'Sprints cortos' }],
        };
        const objectives = OBJECTIVES[selectedSport] || OBJECTIVES.gym;

        return (
            <div className="flex flex-col min-h-full p-5 animate-in slide-in-from-right-8 duration-300 max-w-lg mx-auto w-full">
                {/* Header */}
                <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-foreground transition-colors mb-8 w-fit">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Volver</span>
                </button>

                {/* Sport badge + what to expect inside */}
                {(() => {
                    const WHAT_INSIDE: Record<string, string> = {
                        gym:           'Añade ejercicios, registra series, repeticiones y peso levantado',
                        running:       'Activa el GPS y registra distancia, ritmo y tiempo automáticamente',
                        cross_training:'Configura bloques AMRAP/EMOM/For Time y anota tus rondas',
                        hybrid:        'Combina ejercicios de fuerza y cardio en una misma sesión',
                        calisthenics:  'Registra tus sets de peso corporal, trucos y progresiones',
                        ocr:           'Simula obstáculos y registra tu rendimiento en carrera',
                        cycling:       'Registra distancia, velocidad y tiempo de rodada',
                        swimming:      'Anota series, distancias y tiempos en piscina',
                        other:         'Registra cualquier actividad física libremente',
                    };
                    return (
                        <div className="bg-muted/50 border border-border rounded-2xl p-4 mb-6 flex items-start gap-3">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0", meta.bgColor + '/20')}>
                                {meta.emoji}
                            </div>
                            <div>
                                <p className={clsx("text-sm font-black uppercase tracking-tight", meta.color)}>{meta.label}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-relaxed">
                                    {WHAT_INSIDE[selectedSport || 'gym']}
                                </p>
                            </div>
                        </div>
                    );
                })()}

                {/* PRIMARY CTA — Start freestyle instantly */}
                <button
                    onClick={() => onSelect(selectedSport)}
                    className="w-full py-5 bg-gradient-to-r from-brand-red to-orange-600 text-white rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] active:scale-[0.98] transition-all mb-3"
                >
                    <Zap className="w-5 h-5" />
                    Empezar ahora
                </button>
                <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-8">
                    Sesión libre · sin rutina predefinida
                </p>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">O elige un objetivo</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                {/* Objective cards */}
                <div className="space-y-3">
                    {objectives.map(obj => (
                        <button
                            key={obj.id}
                            disabled={isLimitReached}
                            onClick={() => { setSelectedFocus(obj.id); fetchRecommendations(obj.id); }}
                            className={clsx(
                                "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                                isLimitReached
                                    ? "opacity-40 cursor-not-allowed bg-muted border-border"
                                    : clsx("bg-card border-border hover:bg-muted cursor-pointer", "hover:" + meta.borderColor)
                            )}
                        >
                            <div className="text-left">
                                <p className={clsx("font-black uppercase text-sm text-foreground transition-colors", !isLimitReached && "group-hover:" + meta.color)}>{obj.title}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{obj.desc}</p>
                            </div>
                            <ChevronRight className={clsx("w-4 h-4 shrink-0 transition-colors text-muted-foreground", !isLimitReached && "group-hover:" + meta.color)} />
                        </button>
                    ))}
                </div>

                {isLimitReached && (
                    <div className="mt-4 p-4 bg-muted rounded-2xl border border-border text-center">
                        <p className="text-xs text-muted-foreground font-bold mb-2">Límite semanal de rutinas guiadas alcanzado ({guidedCount}/{currentLimit})</p>
                        <Link href="/dashboard/billing" className="text-xs font-black text-brand-red uppercase tracking-widest hover:underline">Mejorar plan →</Link>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'ai') {
        return (
            <div className="flex flex-col items-center justify-center min-h-full p-6">
                {loadingAi ? (
                    <div className="text-center space-y-6 animate-in fade-in duration-700">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-brand-red/20 rounded-full animate-ping" />
                            <div className="absolute inset-0 border-4 border-t-brand-red rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-12 h-12 text-brand-red animate-pulse" />
                            </div>
                        </div>
                        <h2 className={clsx("text-2xl font-heading font-black italic uppercase animate-pulse", theme === 'dark' ? "text-white" : "text-black")}>Analizando Perfil...</h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Generando programación óptima</p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full space-y-8 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="text-center">
                            <h2 className={clsx("text-3xl font-heading font-black italic uppercase", theme === 'dark' ? "text-white" : "text-black")}>Recomendaciones <span className="text-brand-red">RIVAL</span></h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">{selectedSport}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recommendations.map((plan) => (
                                <div key={plan.id} className={clsx(
                                    "relative p-8 rounded-[32px] border transition-all overflow-hidden group",
                                    plan.is_premium
                                        ? (theme === 'dark' ? "bg-gradient-to-br from-[#1a1a1a] to-black border-yellow-500/20 hover:border-yellow-500/50" : "bg-gradient-to-br from-white to-gray-50 border-yellow-500/30 shadow-xl")
                                        : (theme === 'dark' ? "bg-[#111] border-white/10 hover:border-white/30" : "bg-white border-gray-200 hover:border-brand-red/30 shadow-lg")
                                )}>
                                    {plan.is_premium && (
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase rounded-full">Pro</div>
                                    )}
                                    <h3 className={clsx("text-2xl font-heading font-black italic uppercase mb-2", theme === 'dark' ? "text-white" : "text-black")}>{plan.title}</h3>
                                    <div className="flex gap-4 mb-6">
                                        <span className={clsx("text-[10px] font-bold uppercase px-2 py-1 rounded", theme === 'dark' ? "text-gray-500 bg-white/5" : "text-gray-600 bg-gray-100")}>{plan.difficulty}</span>
                                        <span className={clsx("text-[10px] font-bold uppercase px-2 py-1 rounded", theme === 'dark' ? "text-gray-500 bg-white/5" : "text-gray-600 bg-gray-100")}>{plan.duration_min} min</span>
                                    </div>
                                    <p className={clsx("text-sm mb-8 leading-relaxed", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>{plan.description}</p>
                                    <button onClick={() => startPlan(plan)} className={clsx("w-full py-4 rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg", theme === 'dark' ? "bg-white text-black" : "bg-brand-red text-white")}>
                                        Comenzar
                                    </button>
                                </div>
                            ))}

                            <div className="p-8 rounded-[32px] border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                                <Trophy className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-lg font-bold text-white uppercase mb-2">¿Quieres más?</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Desbloquea Rival Pro para programación de élite.</p>
                            </div>
                        </div>
                        <button onClick={() => setView('quick-start')} className="w-full text-center text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mt-8">Cancelar</button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col p-6 min-h-full">
            <div className="flex items-center gap-4 mb-2">
                <Link href="/dashboard/training" className={clsx("p-3 rounded-full transition-all", theme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-black hover:bg-gray-200 shadow-sm")}><ArrowLeft className="w-6 h-6" /></Link>
                <div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nueva Sesión</p>
                    <h1 className={clsx("text-2xl md:text-3xl font-heading font-black italic uppercase tracking-tighter", theme === 'dark' ? "text-white" : "text-black")}>
                        ¿Qué vas a <span className="text-brand-red">entrenar hoy?</span>
                    </h1>
                </div>
            </div>

            <p className={clsx("text-xs font-bold uppercase tracking-widest mb-6 ml-16", theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                Selecciona tu deporte · después elige si entrenar libre o con rutina sugerida
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full pb-20">
                <SportCard
                    title="Gimnasio 🏋️"
                    icon={<div className="w-12 h-12 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red mb-4"><Activity className="w-6 h-6" /></div>}
                    desc="Añade ejercicios → anota series, reps y kilos → guarda"
                    onClick={() => handleSportClick('gym')}
                    color="hover:border-brand-red/50"
                    image="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Running 🏃"
                    icon={<div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 mb-4"><MapPin className="w-6 h-6" /></div>}
                    desc="GPS automático → registra km, ritmo y zonas de ritmo cardíaco"
                    onClick={() => handleSportClick('running')}
                    color="hover:border-blue-500/50"
                    image="https://images.unsplash.com/photo-1530143311094-34d807799e8f?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Cross Training ⚡"
                    icon={<div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 mb-4"><Timer className="w-6 h-6" /></div>}
                    desc="Crea bloques AMRAP, EMOM o For Time → registra rondas y tiempos"
                    onClick={() => handleSportClick('cross_training')}
                    color="hover:border-orange-500/50"
                    image="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Hybrid 🔥"
                    icon={<div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 mb-4"><Trophy className="w-6 h-6" /></div>}
                    desc="Mezcla carrera + ejercicios funcionales en una sola sesión"
                    onClick={() => handleSportClick('hybrid')}
                    color="hover:border-yellow-500/50"
                    image="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Calistenia 💪"
                    icon={<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 mb-4"><Zap className="w-6 h-6" /></div>}
                    desc="Registra sets de peso corporal, trucos y progresiones"
                    onClick={() => handleSportClick('calisthenics')}
                    color="hover:border-purple-500/50"
                    image="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="OCR 🧗"
                    icon={<div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4"><Activity className="w-6 h-6" /></div>}
                    desc="Simula circuito de obstáculos y registra tu rendimiento"
                    onClick={() => handleSportClick('ocr')}
                    color="hover:border-emerald-500/50"
                    image="https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Otros ➕"
                    icon={<div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4"><Plus className="w-6 h-6" /></div>}
                    desc="Yoga, movilidad, natación, ciclismo o cualquier actividad"
                    onClick={() => handleSportClick('other')}
                    color="hover:border-white/30"
                    image="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop"
                />
            </div>
        </div>
    )
}

function SportCard({ title, icon, desc, onClick, color, image }: { title: string, icon: React.ReactNode, desc: string, onClick: () => void, color: string, image: string }) {
    const { theme } = useTheme();
    return (
        <button onClick={onClick} className={clsx(
            "text-left group relative h-64 rounded-[32px] border transition-all overflow-hidden",
            theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200 shadow-xl",
            color
        )}>
            <div className="absolute inset-0">
                <Image src={image} alt={title} fill className={clsx(
                    "object-cover transition-all duration-500",
                    theme === 'dark' ? "opacity-20 group-hover:opacity-30 group-hover:scale-105" : "opacity-10 group-hover:opacity-20 group-hover:scale-105"
                )} />
                <div className={clsx(
                    "absolute inset-0 bg-gradient-to-t",
                    theme === 'dark' ? "from-black via-black/80 to-transparent" : "from-white/60 via-white/20 to-transparent"
                )} />
            </div>

            <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8">
                <div className={clsx(
                    "backdrop-blur-md p-2 rounded-2xl w-fit border mb-auto self-end opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0",
                    theme === 'dark' ? "bg-black/50 border-white/5" : "bg-white/50 border-gray-200"
                )}>
                    <Plus className={clsx("w-6 h-6", theme === 'dark' ? "text-white" : "text-brand-red")} />
                </div>

                {icon}
                <h3 className={clsx("text-3xl font-heading font-black italic uppercase mb-2 tracking-tighter shadow-black/10 text-shadow-sm", theme === 'dark' ? "text-white" : "text-black")}>{title}</h3>
                <p className={clsx("text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-[200px]", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>{desc}</p>
            </div>
        </button>
    )
}

/* ================= SPECIFIC VIEWS ================= */

function RunningView({
    distance,
    setDistance,
    time,
    workoutTitle,
    setWorkoutTitle,
    isPaused,
    toggleTimer,
    handleFinish,
    gpsStatus,
    setGpsStatus,
    heartRate,
    instantPace,
    currentZone,
    elevationGain,
    openSync,
    accuracy,
    logMode,
    setTime
}: {
    distance: number,
    setDistance: (d: number) => void,
    time: number,
    workoutTitle?: string,
    setWorkoutTitle?: (t: string) => void,
    isPaused: boolean,
    toggleTimer: () => void,
    handleFinish: () => void,
    gpsStatus: 'idle' | 'searching' | 'tracking',
    setGpsStatus: (val: 'idle' | 'searching' | 'tracking') => void,
    heartRate: number,
    instantPace: string,
    currentZone: number,
    elevationGain: number,
    openSync: () => void,
    accuracy: number | null,
    logMode: 'manual' | 'live',
    setTime: (t: number) => void
}) {
    const { theme } = useTheme();

    if (logMode === 'manual') {
        const kms = distance / 1000;
        const mins = Math.floor(time / 60);
        const secs = time % 60;

        return (
            <div className="space-y-6 animate-in fade-in duration-500 pb-32 max-w-md mx-auto">
                <div className={clsx(
                    "rounded-[32px] border p-6 space-y-6",
                    theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-100 shadow-md"
                )}>
                    <div className="text-center border-b border-white/5 pb-4">
                        <h3 className="text-lg font-black uppercase italic text-white font-heading">Ingresar Combate de Carrera</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Escribe tu distancia y tiempo final</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">Distancia</label>
                            <div className="flex items-baseline justify-center gap-1.5">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={kms || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setDistance(val * 1000);
                                    }}
                                    placeholder="0.00"
                                    className="bg-transparent text-3xl font-mono font-black text-center w-24 outline-none text-white focus:text-brand-red [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-xs font-black text-gray-500 uppercase">KM</span>
                            </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                            <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">Tiempo Total</label>
                            <div className="flex items-baseline justify-center gap-1">
                                <input
                                    type="number"
                                    min="0"
                                    value={mins || ''}
                                    onChange={(e) => {
                                        const m = parseInt(e.target.value) || 0;
                                        const s = time % 60;
                                        setTime(m * 60 + s);
                                    }}
                                    placeholder="00"
                                    className="bg-transparent text-3xl font-mono font-black text-center w-12 outline-none text-white focus:text-brand-red [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-gray-600 font-bold">:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={secs || ''}
                                    onChange={(e) => {
                                        const m = Math.floor(time / 60);
                                        const s = parseInt(e.target.value) || 0;
                                        setTime(m * 60 + s);
                                    }}
                                    placeholder="00"
                                    className="bg-transparent text-3xl font-mono font-black text-center w-12 outline-none text-white focus:text-brand-red [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[9px] font-black text-gray-500 uppercase ml-1">Min</span>
                            </div>
                        </div>
                    </div>

                    {distance > 0 && time > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-center animate-in zoom-in-95 duration-200">
                            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">Ritmo Medio Calculado</p>
                            <p className="text-2xl font-mono font-black text-white">
                                {(() => {
                                    const minPerKm = (time / 60) / (distance / 1000);
                                    const pMin = Math.floor(minPerKm);
                                    const pSec = Math.floor((minPerKm - pMin) * 60);
                                    return `${pMin}:${pSec < 10 ? '0' + pSec : pSec}`;
                                })()}
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">/km</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    const [view, setView] = useState<'stats' | 'zones'>('stats');

    // Smooth average pace calculation
    const avgPace = distance > 10 ? (time / 60) / (distance / 1000) : 0;
    const avgPaceMin = Math.floor(avgPace);
    const avgPaceSec = Math.round((avgPace - avgPaceMin) * 60);

    const zones = [
        { n: 1, label: 'Warm up', color: 'bg-blue-500', range: '< 130' },
        { n: 2, label: 'Fat Burn', color: 'bg-green-500', range: '130-145' },
        { n: 3, label: 'Aerobic', color: 'bg-yellow-500', range: '145-160' },
        { n: 4, label: 'Threshold', color: 'bg-orange-500', range: '160-170' },
        { n: 5, label: 'Max Effort', color: 'bg-red-500', range: '> 170' },
    ];

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700 pb-32 max-w-2xl mx-auto">
            {/* Action Bar (GPS & Sync) */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setGpsStatus(gpsStatus === 'idle' ? 'searching' : 'idle')}
                    className={clsx(
                        "group relative overflow-hidden p-5 rounded-[28px] border transition-all duration-300",
                        gpsStatus !== 'idle'
                            ? (gpsStatus === 'tracking' ? "bg-blue-600 border-transparent text-white shadow-xl shadow-blue-600/20" : "bg-blue-600/10 border-blue-500/30 text-blue-500 animate-pulse")
                            : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                    )}
                >
                    <div className="flex flex-col items-center gap-1.5 relative z-10">
                        {gpsStatus === 'searching' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                            gpsStatus === 'tracking' ? <Activity className="w-5 h-5" /> : <MapPin className="w-5 h-5 opacity-50" />}
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                            {gpsStatus === 'searching' ? 'Enlazando GPS...' :
                                gpsStatus === 'tracking' ? 'GPS Conectado' : 'Conectar GPS'}
                        </span>
                        {(gpsStatus === 'tracking' || gpsStatus === 'searching') && accuracy !== null && (
                            <div className="flex flex-col items-center gap-1 mt-1">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4].map(bar => (
                                        <div
                                            key={bar}
                                            className={clsx(
                                                "w-1 h-2 rounded-full",
                                                accuracy < (100 - bar * 20) ? (accuracy < 30 ? "bg-white" : "bg-white/50") : "bg-white/10"
                                            )}
                                        />
                                    ))}
                                </div>
                                {gpsStatus === 'searching' && accuracy > 60 && (
                                    <span className="text-[6px] font-bold text-white/40 uppercase">Señal Débil ({Math.round(accuracy)}m)</span>
                                )}
                            </div>
                        )}
                    </div>
                </button>

                <button
                    onClick={openSync}
                    className="p-5 rounded-[28px] border border-white/10 bg-white/5 text-gray-400 hover:border-white/20 transition-all flex flex-col items-center gap-1.5"
                >
                    <div className="flex -space-x-1.5 mb-0.5">
                        <div className="w-6 h-6 rounded-full border border-black bg-orange-500 flex items-center justify-center text-[7px] font-black text-white">S</div>
                        <div className="w-6 h-6 rounded-full border border-black bg-blue-500 flex items-center justify-center text-[7px] font-black text-white">G</div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sincronizar Reloj</span>
                </button>
            </div>

            {/* Principal Value: Instant Pace */}
            <div className={clsx(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-500",
                theme === 'dark' ? "bg-black border-white/5" : "bg-white border-gray-100 shadow-xl"
            )}>
                {/* Background Decoration */}
                <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <Wind className="w-64 h-64 text-blue-500" />
                </div>

                <div className="relative z-10 text-center space-y-2">
                    <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4 flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Ritmo Actual
                    </p>
                    <div className="flex items-end justify-center gap-1">
                        <span className={clsx(
                            "text-7xl xs:text-8xl md:text-9xl font-heading font-black italic tracking-tighter leading-none",
                            theme === 'dark' ? "text-white" : "text-blue-900"
                        )}>
                            {instantPace || "0:00"}
                        </span>
                        <span className="text-xl md:text-2xl text-gray-500 font-black italic mb-2 md:mb-4 uppercase">/km</span>
                    </div>

                    <div className="h-px bg-white/5 w-24 mx-auto my-6" />

                    <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto">
                        <div className="text-center group/metric">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover/metric:text-blue-400 transition-colors">Distancia</p>
                            <p className="text-3xl font-mono font-black italic text-white flex items-end justify-center">
                                {(distance / 1000).toFixed(2)}
                                <span className="text-[10px] ml-1 mb-1 opacity-40">km</span>
                            </p>
                        </div>
                        <div className="text-center group/metric">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover/metric:text-blue-400 transition-colors">Media</p>
                            <p className="text-3xl font-mono font-black italic text-white flex items-end justify-center">
                                {avgPaceMin}:{avgPaceSec < 10 ? '0' + avgPaceSec : avgPaceSec}
                                <span className="text-[10px] ml-1 mb-1 opacity-40">/km</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terrain Data */}
            <div className="grid grid-cols-1 gap-4">
                <div className={clsx(
                    "relative overflow-hidden p-6 rounded-[32px] border transition-all",
                    theme === 'dark' ? "bg-black border-white/5 hover:border-emerald-500/20" : "bg-white border-gray-100 shadow-lg"
                )}>
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest">Elevación Ganada</p>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-mono font-black text-white">{elevationGain.toFixed(1)}</span>
                        <span className="text-[10px] font-black text-gray-500 uppercase">metros</span>
                    </div>
                </div>
            </div>

            {/* Distribution View - Hidden for now as it depends on HR */}
            {view === 'zones' && (
                <div className="p-8 rounded-[32px] bg-[#111] border border-white/10 space-y-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] italic">Zonas de Intensidad</h4>
                        <button onClick={() => setView('stats')} className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase text-center py-4">Conecta un sensor cardiaco para ver el desglose</p>
                </div>
            )}

            {/* Manual Controls (Only if idle) */}
            {gpsStatus === 'idle' && (
                <div className="p-8 rounded-[40px] border border-white/5 bg-white/[0.02] text-center space-y-6">
                    <div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Entrada Manual</p>
                        <p className="text-xs text-white/40">Si no usas GPS, ajusta la distancia aquí</p>
                    </div>
                    <div className="flex justify-center flex-wrap gap-2">
                        {[400, 800, 1000, 5000].map(d => (
                            <button key={d} onClick={() => setDistance(d)} className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                                + {d >= 1000 ? `${d / 1000}km` : `${d}m`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Fixed Bottom Controls moved to parent for consistency, but here we can add a mini-map or track preview */}
        </div>
    );
}

function SyncWatchModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { theme } = useTheme();
    return (
        <div className={clsx("fixed inset-0 z-[400] flex items-center justify-center p-4 transition-all duration-300", isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className={clsx("relative w-full max-w-sm rounded-[40px] border p-8 space-y-8 animate-in zoom-in-95 duration-300",
                theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white shadow-2xl"
            )}>
                <div className="text-center">
                    <h3 className="text-2xl font-heading font-black italic uppercase text-white mb-2">Sync <span className="text-brand-red">Reloj</span></h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Importa tus datos de carrera automáticamente</p>
                </div>

                <div className="space-y-3">
                    <button
                        className="w-full p-6 rounded-3xl bg-orange-600/10 border border-orange-600/20 hover:bg-orange-600 hover:border-orange-600 transition-all flex items-center justify-between group"
                        onClick={() => { alert('Conectando con Strava...'); onClose(); }}
                    >
                        <div className="flex items-center gap-4 text-orange-600 group-hover:text-white transition-colors">
                            <span className="font-black italic text-xl">STRAVA</span>
                        </div>
                        <Plus className="w-5 h-5 text-orange-600 group-hover:text-white" />
                    </button>

                    <button
                        className="w-full p-6 rounded-3xl bg-blue-600/10 border border-blue-600/20 hover:bg-blue-600 hover:border-blue-600 transition-all flex items-center justify-between group"
                        onClick={() => { alert('Conectando con Garmin...'); onClose(); }}
                    >
                        <div className="flex items-center gap-4 text-blue-600 group-hover:text-white transition-colors">
                            <span className="font-black italic text-xl uppercase">Garmin Connect</span>
                        </div>
                        <Plus className="w-5 h-5 text-blue-600 group-hover:text-white" />
                    </button>

                    <button
                        className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all flex items-center justify-between group"
                        onClick={() => { alert('Abre la App Rival en tu Apple Watch para sincronizar.'); onClose(); }}
                    >
                        <div className="flex items-center gap-4 text-white group-hover:text-black transition-colors">
                            <span className="font-black italic text-xl uppercase">Apple Watch</span>
                        </div>
                        <Activity className="w-5 h-5 text-white group-hover:text-black" />
                    </button>

                    <div className="relative py-4 flex items-center gap-4">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[8px] font-black text-gray-600 uppercase">Ó importa archivo</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <button
                        className="w-full p-4 rounded-2xl bg-gray-900 border border-white/5 hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
                        onClick={() => alert('Selecciona archivo .GPX o .FIT')}
                    >
                        <Download className="w-4 h-4 text-gray-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Importar GPX / FIT</span>
                    </button>
                </div>

                <button onClick={onClose} className="w-full text-center text-gray-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em]">Cancelar</button>
            </div>
        </div>
    )
}


// ── GuidedWODView — clean WOD display for recommendation/plan mode ────────────
// Replaces the complex editor when a pre-built WOD is loaded.
// User sees: WOD format + exercises checklist + result entry. That's it.
function GuidedWODView({ blocks, setBlocks, workoutTitle, elapsedSeconds }: {
    blocks: WorkoutBlock[];
    setBlocks: (b: WorkoutBlock[]) => void;
    workoutTitle?: string;
    elapsedSeconds?: number;
}) {
    const { theme } = useTheme();
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [resultMin, setResultMin] = useState('');
    const [resultSec, setResultSec] = useState('');
    const [resultRounds, setResultRounds] = useState('');
    const [isRx, setIsRx] = useState(true);

    if (!blocks.length) return null;

    const block = blocks[0];
    const isForTime = block.type === 'fortime' || block.type === 'for_time';
    const isAmrap   = block.type === 'amrap';
    const isEmom    = block.type === 'emom';

    const formatBadge: Record<string, string> = {
        fortime:  'FOR TIME', for_time: 'FOR TIME',
        amrap:    'AMRAP', emom: 'EMOM', tabata: 'TABATA', other: 'WOD'
    };
    const badge = formatBadge[block.type] || 'WOD';
    const timeCap = block.duration ? `${block.duration} MIN` : null;

    // Format each exercise into a readable line
    const formatExercise = (ex: WorkoutExercise): string => {
        if (!ex.sets?.length) return ex.name;
        const s = ex.sets[0];
        const unit = s.unit || 'kg';
        const measure = s.measure || 'reps';

        if (measure === 'distance' || unit === 'm' || unit === 'km') {
            return `${s.weight || s.reps} ${unit}`;
        }
        if (s.weight && s.weight > 0) {
            return `${s.reps} reps @ ${s.weight}${unit}`;
        }
        return `${s.reps} reps`;
    };

    const allChecked = checked.size >= block.exercises.length && block.exercises.length > 0;

    const saveResult = () => {
        const time = isForTime
            ? `${resultMin.padStart(2, '0')}:${(resultSec || '00').padStart(2, '0')}`
            : '';
        const updated = [...blocks];
        updated[0] = { ...updated[0], result: { time, rounds: parseInt(resultRounds) || 0 } };
        setBlocks(updated);
    };

    // Check beep sound feedback
    const playCheckBeep = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 600; // sporty chirp
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) { console.warn("Audio error", e) }
    };

    return (
        <div className="max-w-lg mx-auto w-full px-4 pb-32 space-y-5">

            {/* WOD Header */}
            <div className={clsx(
                "rounded-3xl p-5 border",
                theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200 shadow-sm"
            )}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="bg-brand-red text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        {badge}
                    </span>
                    {timeCap && (
                        <span className={clsx("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                            theme === 'dark' ? "border-white/10 text-gray-400" : "border-gray-200 text-gray-500")}>
                            ⏱ {timeCap}
                        </span>
                    )}
                    {/* Rx / Scaled toggle */}
                    <button
                        onClick={() => setIsRx(v => !v)}
                        className={clsx("ml-auto text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-colors",
                            isRx
                                ? "bg-brand-red/10 border-brand-red/30 text-brand-red"
                                : "border-gray-400/30 text-gray-400"
                        )}
                    >
                        {isRx ? 'Rx' : 'Scaled'}
                    </button>
                </div>
                <h2 className={clsx("text-xl font-heading font-black italic uppercase tracking-tighter leading-tight",
                    theme === 'dark' ? "text-white" : "text-black")}>
                    {workoutTitle || block.title}
                </h2>
            </div>

            {/* Exercises checklist */}
            <div className={clsx("rounded-3xl border overflow-hidden",
                theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200 shadow-sm")}>
                <div className={clsx("px-5 py-3 border-b text-[10px] font-black uppercase tracking-widest",
                    theme === 'dark' ? "border-white/5 text-gray-500" : "border-gray-100 text-gray-400")}>
                    Ejercicios — marca cada uno cuando lo completes
                </div>
                <div className="divide-y divide-white/[0.04]">
                    {block.exercises.map((ex, i) => {
                        const key = `${i}-${ex.name}`;
                        const done = checked.has(key);
                        return (
                            <button
                                key={key}
                                onClick={() => {
                                    setChecked(prev => {
                                        const next = new Set(prev);
                                        if (done) {
                                            next.delete(key);
                                        } else {
                                            next.add(key);
                                            playCheckBeep();
                                        }
                                        return next;
                                    });
                                }}
                                className={clsx(
                                    "w-full flex items-center gap-4 px-5 py-4 transition-colors text-left",
                                    done
                                        ? theme === 'dark' ? "bg-green-500/5" : "bg-green-50"
                                        : "hover:bg-white/5"
                                )}
                            >
                                {/* Checkbox */}
                                <div className={clsx(
                                    "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                    done ? "bg-green-500 border-green-500" : theme === 'dark' ? "border-white/20" : "border-gray-300"
                                )}>
                                    {done && <CheckCircle className="w-4 h-4 text-white" />}
                                </div>
                                {/* Exercise info */}
                                <div className="flex-1 min-w-0">
                                    <p className={clsx(
                                        "font-black uppercase text-sm leading-tight",
                                        done
                                            ? "line-through text-gray-500"
                                            : theme === 'dark' ? "text-white" : "text-black"
                                    )}>
                                        {ex.name}
                                    </p>
                                    <p className={clsx("text-[11px] font-bold mt-0.5",
                                        done ? "text-gray-600" : "text-brand-red")}>
                                        {formatExercise(ex)}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Progress indicator */}
            {block.exercises.length > 0 && (
                <div className={clsx("rounded-2xl p-4 flex items-center gap-3 border",
                    theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200")}>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-brand-red to-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${(checked.size / block.exercises.length) * 100}%` }}
                        />
                    </div>
                    <span className={clsx("text-[11px] font-black uppercase tracking-widest shrink-0",
                        allChecked ? "text-green-500" : "text-gray-500")}>
                        {checked.size}/{block.exercises.length}
                        {allChecked && ' ✓'}
                    </span>
                </div>
            )}

            {/* Result entry */}
            <div className={clsx("rounded-3xl border p-5 space-y-4",
                theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <p className={clsx("text-[10px] font-black uppercase tracking-widest",
                        theme === 'dark' ? "text-gray-500" : "text-gray-400")}>
                        {isForTime ? '⏱ ¿Cuál fue tu tiempo?' : isAmrap || isEmom ? '🔄 ¿Cuántas rondas completaste?' : '📝 Tu resultado'}
                    </p>
                    {isForTime && elapsedSeconds !== undefined && elapsedSeconds > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                const mins = Math.floor(elapsedSeconds / 60);
                                const secs = elapsedSeconds % 60;
                                setResultMin(String(mins));
                                setResultSec(String(secs).padStart(2, '0'));
                                // Trigger result update
                                const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                                const updated = [...blocks];
                                updated[0] = { ...updated[0], result: { ...updated[0].result, time: timeStr } };
                                setBlocks(updated);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 shadow-md shadow-orange-600/10 animate-in zoom-in-95 duration-200"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Usar cronómetro ({Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60) < 10 ? '0' + (elapsedSeconds % 60) : (elapsedSeconds % 60)})
                        </button>
                    )}
                </div>

                {isForTime ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <input
                                type="number" min="0" max="99" placeholder="00"
                                value={resultMin}
                                onChange={e => { setResultMin(e.target.value); saveResult(); }}
                                className={clsx(
                                    "w-full text-center text-4xl font-mono font-black rounded-2xl py-4 outline-none border transition-colors",
                                    theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-brand-red" : "bg-gray-50 border-gray-200 text-black focus:border-brand-red"
                                )}
                            />
                            <p className={clsx("text-center text-[9px] font-black uppercase tracking-widest mt-1",
                                theme === 'dark' ? "text-gray-600" : "text-gray-400")}>MIN</p>
                        </div>
                        <span className={clsx("text-3xl font-black pb-5",
                            theme === 'dark' ? "text-gray-600" : "text-gray-400")}>:</span>
                        <div className="flex-1">
                            <input
                                type="number" min="0" max="59" placeholder="00"
                                value={resultSec}
                                onChange={e => { setResultSec(e.target.value); saveResult(); }}
                                className={clsx(
                                    "w-full text-center text-4xl font-mono font-black rounded-2xl py-4 outline-none border transition-colors",
                                    theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-brand-red" : "bg-gray-50 border-gray-200 text-black focus:border-brand-red"
                                )}
                            />
                            <p className={clsx("text-center text-[9px] font-black uppercase tracking-widest mt-1",
                                theme === 'dark' ? "text-gray-600" : "text-gray-400")}>SEG</p>
                        </div>
                    </div>
                ) : (
                    <div>
                        <input
                            type="number" min="0" placeholder="0"
                            value={resultRounds}
                            onChange={e => { setResultRounds(e.target.value); saveResult(); }}
                            className={clsx(
                                "w-full text-center text-5xl font-mono font-black rounded-2xl py-4 outline-none border transition-colors",
                                theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-brand-red" : "bg-gray-50 border-gray-200 text-black focus:border-brand-red"
                            )}
                        />
                        <p className={clsx("text-center text-[9px] font-black uppercase tracking-widest mt-1",
                            theme === 'dark' ? "text-gray-600" : "text-gray-400")}>RONDAS</p>
                    </div>
                )}

                <p className={clsx("text-[10px] text-center font-medium",
                    theme === 'dark' ? "text-gray-600" : "text-gray-400")}>
                    Pulsa <span className="font-black">💾 Guardar</span> arriba cuando termines
                </p>
            </div>
        </div>
    );
}

// Helper var for mock
let isPausedGlobal = false;

function CrossTrainingView({ blocks, setBlocks, distance, setDistance, isOCR, isGuided, workoutTitle, setWorkoutTitle, elapsedSeconds }: {
    blocks: WorkoutBlock[];
    setBlocks: (b: WorkoutBlock[]) => void;
    distance?: number;
    setDistance?: (d: number) => void;
    isOCR?: boolean;
    isGuided?: boolean;
    workoutTitle?: string;
    setWorkoutTitle?: (t: string) => void;
    elapsedSeconds?: number;
}) {
    // ── Guided mode: show simple WOD checklist instead of complex editor ─────
    if (isGuided && blocks.length > 0) {
        return <GuidedWODView blocks={blocks} setBlocks={setBlocks} workoutTitle={workoutTitle} elapsedSeconds={elapsedSeconds} />;
    }

    const { theme } = useTheme();
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeBlockIndex, setActiveBlockIndex] = useState(0);
    const [catalog, setCatalog] = useState<WorkoutExercise[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showPresets, setShowPresets] = useState(false);
    const [replacingExIndex, setReplacingExIndex] = useState<number | null>(null);
    const [viewingVideo, setViewingVideo] = useState<string | null>(null);

    const WOD_PRESETS = [
        {
            name: 'FRAN',
            type: 'fortime',
            desc: '21-15-9 Thrusters + Pull Ups',
            exercises: [
                { name: 'Thruster', weight: 43, reps: [21, 15, 9] },
                { name: 'Pull Up', weight: 0, reps: [21, 15, 9] }
            ]
        },
        {
            name: 'GRACE',
            type: 'fortime',
            desc: '30 Clean & Jerks for time',
            exercises: [
                { name: 'Clean & Jerk', weight: 61, reps: [30] }
            ]
        },
        {
            name: 'ISABEL',
            type: 'fortime',
            desc: '30 Snatches for time',
            exercises: [
                { name: 'Snatch', weight: 61, reps: [30] }
            ]
        },
        {
            name: 'DIANE',
            type: 'fortime',
            desc: '21-15-9 Deadlift + HSPU',
            exercises: [
                { name: 'Deadlift', weight: 102, reps: [21, 15, 9] },
                { name: 'Handstand Push Up', weight: 0, reps: [21, 15, 9] }
            ]
        },
        {
            name: '21-15-9',
            type: 'fortime',
            desc: 'Plantilla genérica 21-15-9',
            exercises: [
                { name: 'Ejercicio_1', weight: 0, reps: [21, 15, 9] },
                { name: 'Ejercicio_2', weight: 0, reps: [21, 15, 9] }
            ]
        },
        {
            name: 'MURPH',
            type: 'fortime',
            desc: 'Run, 100 Pull, 200 Push, 300 Squat, Run',
            exercises: [
                { name: 'Run', unit: 'm', weight: 1600, reps: [1] },
                { name: 'Pull Up', reps: [100] },
                { name: 'Push Up', reps: [200] },
                { name: 'Air Squat', reps: [300] },
                { name: 'Run', unit: 'm', weight: 1600, reps: [1] }
            ]
        }
    ];

    const loadPreset = (preset: { name: string; type: string; desc: string; exercises: any[] }) => {
        const newExercises = preset.exercises.map((ex: any) => {
            const sets = (Array.isArray(ex.reps) ? ex.reps : [ex.reps]).map((r: number, i: number) => ({
                order: i + 1,
                weight: ex.weight || 0,
                reps: r || 0,
                completed: false,
                unit: ex.unit || 'kg',
                measure: 'reps'
            }));

            return {
                id: Math.random().toString(36).substr(2, 9),
                name: ex.name,
                target: preset.desc,
                prev: '-',
                sets: sets
            };
        });

        const newBlocks = [...blocks];
        newBlocks[activeBlockIndex] = {
            ...newBlocks[activeBlockIndex],
            title: preset.name,
            type: preset.type,
            exercises: newExercises,
            result: { time: '', rounds: 0 }
        };
        if (blocks.length <= 1 && (workoutTitle === "Sesión de entrenamiento" || !workoutTitle) && setWorkoutTitle) {
            setWorkoutTitle(preset.name);
        }

        setBlocks(newBlocks);
        setShowPresets(false);
    };

    // Load catalog only when modal opens
    useEffect(() => {
        if (showAddModal && catalog.length === 0) {
            getExercises(isOCR ? 'ocr' : 'cross_training').then(setCatalog);
        }
    }, [showAddModal, catalog.length]);

    const filteredCatalog = useMemo(() => {
        if (!searchQuery) return catalog;
        return catalog.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [catalog, searchQuery]);

    // Initial State Check (Moved here to avoid Hook Violation)
    if (blocks.length === 0) {
        return <FreeTrainingWizard onComplete={(block: any) => {
            setBlocks([block]);
            setActiveBlockIndex(0);
            // Si el bloque es de tipo 'other', es probable que quieran añadir ejercicios inmediatamente
            if (block.type === 'other') {
                setTimeout(() => setShowAddModal(true), 300);
            }
        }} />;

        // If OCR/CrossTraining and no blocks (e.g. loading or error), show loader
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-red shimmer" />
            </div>
        );
    }

    const addBlock = () => {
        const newBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'fortime',
            title: `BLOCK ${blocks.length + 1}`,
            duration: 0,
            exercises: [],
            result: { rounds: 0, time: '' }
        };
        setBlocks([...blocks, newBlock]);
        setActiveBlockIndex(blocks.length); // Switch to new block
    };

    const removeBlock = (index: number) => {
        if (blocks.length <= 1) return;
        const newBlocks = blocks.filter((_: WorkoutBlock, i: number) => i !== index);
        setBlocks(newBlocks);
        setActiveBlockIndex(Math.max(0, index - 1));
    };

    const updateBlock = (index: number, field: string, value: any, noTitleUpdate?: boolean) => {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], [field]: value };

        // Auto-calc EMOM rounds
        const block = newBlocks[index];
        if (block.type === 'emom' && (field === 'duration' || field === 'type')) {
            const numExercises = block.exercises.length;
            const dur = block.duration || 0;
            if (numExercises > 0 && dur > 0) {
                block.result = { ...block.result, rounds: Math.floor(dur / numExercises) };
            }
        }

        // Update block title if generic
        if (field === 'type' && (block.title.startsWith('Bloque ') || block.title === 'For Time' || block.title === 'AMRAP' || block.title === 'EMOM' || block.title === 'TABATA')) {
            const typeLabel = value === 'fortime' ? 'For Time' : (value as string).toUpperCase();
            block.title = (block.duration || 0) > 0 ? `${typeLabel} (${block.duration} min)` : typeLabel;
        } else if (field === 'duration' && (block.title.includes(' min)') || block.title === 'For Time' || block.title === 'AMRAP' || block.title === 'EMOM' || block.title === 'TABATA')) {
            // Update duration in title if it was automatically set
            const typeLabel = block.type === 'fortime' ? 'For Time' : (block.type || '').toUpperCase();
            block.title = value > 0 ? `${typeLabel} (${value} min)` : typeLabel;
        }

        setBlocks(newBlocks);
    };

    const addExerciseToBlock = async (template: any) => {
        const prev = await getExercisePreviousRecord(template.name) || "-";

        // Auto-detect unit type based on exercise name
        let defaultUnit = 'kg';
        let defaultMeasure = 'reps';
        const nameLower = template.name.toLowerCase();

        if (nameLower.includes('run') || nameLower.includes('carrera') || nameLower.includes('row') || nameLower.includes('ski') || nameLower.includes('bike')) {
            defaultUnit = 'm'; // Distance
            defaultMeasure = 'cal'; // Or calories/time
        } else if (nameLower.includes('plank') || nameLower.includes('hold') || nameLower.includes('isometric')) {
            defaultUnit = 'sec'; // Time
            defaultMeasure = 'rep';
        } else if (nameLower.includes('walk') || nameLower.includes('carry') || nameLower.includes('yoke') || nameLower.includes('lunges')) {
            defaultUnit = 'm';
            defaultMeasure = 'reps';
        }

        if (replacingExIndex !== null) {
            const newBlocks = [...blocks];
            const oldEx = newBlocks[activeBlockIndex].exercises[replacingExIndex];

            newBlocks[activeBlockIndex].exercises[replacingExIndex] = {
                ...oldEx,
                name: template.name,
                prev: prev || oldEx.prev,
                video_url: template.video_url
            };

            setBlocks(newBlocks);
            setReplacingExIndex(null); // Reset
            setShowAddModal(false);
            return;
        }

        const newEx = {
            id: Math.random().toString(36).substr(2, 9),
            name: template.name,
            target: "-",
            prev: prev,
            sets: [{ order: 1, weight: 0, reps: 0, completed: false, unit: defaultUnit, measure: defaultMeasure }],
            video_url: template.video_url
        };

        const newBlocks = [...blocks];
        newBlocks[activeBlockIndex].exercises.push(newEx);

        // Auto-calc EMOM rounds on Add Exercise
        const block = newBlocks[activeBlockIndex];
        const dur = block.duration || 0;
        if (block.type === 'emom' && dur > 0) {
            const numExercises = block.exercises.length;
            block.result = { ...block.result, rounds: Math.floor(dur / numExercises) };
        }

        setBlocks(newBlocks);
        setShowAddModal(false);
    };

    const updateSet = (blockIndex: number, exIndex: number, setIndex: number, field: string, val: any) => {
        const newBlocks = [...blocks];
        (newBlocks[blockIndex].exercises[exIndex].sets[setIndex] as any)[field] = val;
        setBlocks(newBlocks);
    };

    const addSet = (blockIndex: number, exIndex: number) => {
        const newBlocks = [...blocks];
        const lastSet = newBlocks[blockIndex].exercises[exIndex].sets[newBlocks[blockIndex].exercises[exIndex].sets.length - 1];
        newBlocks[blockIndex].exercises[exIndex].sets.push({
            order: newBlocks[blockIndex].exercises[exIndex].sets.length + 1,
            weight: lastSet ? lastSet.weight : 0,
            reps: lastSet ? lastSet.reps : 0,
            completed: false,
            unit: lastSet?.unit || 'kg',
            measure: lastSet?.measure || 'reps'
        });
        setBlocks(newBlocks);
    };

    const removeSet = (blockIndex: number, exIndex: number, setIndex: number) => {
        const newBlocks = [...blocks];
        if (newBlocks[blockIndex].exercises[exIndex].sets.length > 1) {
            newBlocks[blockIndex].exercises[exIndex].sets.splice(setIndex, 1);
        } else {
            // Remove exercise if last set
            newBlocks[blockIndex].exercises.splice(exIndex, 1);

            // Auto-calc EMOM rounds on Remove Exercise
            const block = newBlocks[blockIndex];
            const dur = block.duration || 0;
            if (block.type === 'emom' && dur > 0) {
                const numExercises = block.exercises.length;
                // Avoid division by zero, though unlikely to be displayed if 0 exercises
                block.result = { ...block.result, rounds: numExercises > 0 ? Math.floor(dur / numExercises) : 0 };
            }
        }
        setBlocks(newBlocks);
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {viewingVideo && <VideoModal url={viewingVideo} onClose={() => setViewingVideo(null)} />}

            {/* Main Tabs for Blocks */}
            <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                {blocks.map((block: WorkoutBlock, i: number) => (
                    <button
                        key={i}
                        onClick={() => setActiveBlockIndex(i)}
                        className={clsx(
                            "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2",
                            activeBlockIndex === i ? "bg-orange-600 text-white shadow-lg scale-105" : "bg-[#111] text-gray-500 border border-white/10 hover:bg-white/5"
                        )}
                    >
                        <span>{block.title || `Bloque ${i + 1}`}</span>
                        {block.type === 'fortime' && <Timer className="w-3 h-3" />}
                        {block.type === 'amrap' && <RefreshCw className="w-3 h-3" />}
                        {block.type === 'emom' && <Clock className="w-3 h-3" />}
                    </button>
                ))}
                <button
                    onClick={addBlock}
                    className="px-4 py-3 rounded-xl bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 border border-white/5 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                >
                    <Plus className="w-3 h-3" /> Agregar
                </button>
            </div>

            {/* Active Block Editing Area */}
            <div className="space-y-6">

                {/* Block Type & Settings */}
                <div className="bg-[#111] border border-white/10 p-4 sm:p-6 rounded-[32px] space-y-4 sm:space-y-6 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <input
                            value={blocks[activeBlockIndex].title}
                            onChange={(e) => updateBlock(activeBlockIndex, 'title', e.target.value)}
                            className="bg-transparent text-xl font-heading font-black italic text-white uppercase outline-none placeholder-gray-600 w-full"
                            placeholder={`BLOQUE ${activeBlockIndex + 1}`}
                        />
                        {blocks.length > 1 && (
                            <button onClick={() => removeBlock(activeBlockIndex)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Presets Button for Cross Training */}
                    {!isOCR && !isGuided && (
                        <div className="relative">
                            <button
                                onClick={() => setShowPresets(!showPresets)}
                                className="w-full py-2 bg-gradient-to-r from-orange-900/20 to-orange-600/10 border border-orange-500/20 rounded-xl text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trophy className="w-3 h-3" />
                                {showPresets ? 'Cerrar Benchmarks' : 'Cargar WOD / Benchmark'}
                            </button>

                            {showPresets && (
                                <div className={clsx(
                                    "absolute top-full left-0 right-0 mt-2 z-50 border rounded-2xl shadow-2xl p-2 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2",
                                    theme === 'dark' ? "bg-[#1a1a1a] border-white/20" : "bg-white border-gray-200"
                                )}>
                                    <div className="grid grid-cols-1 gap-1">
                                        {WOD_PRESETS.map((p) => (
                                            <button
                                                key={p.name}
                                                onClick={() => loadPreset(p)}
                                                className={clsx(
                                                    "text-left p-3 rounded-xl transition-colors group",
                                                    theme === 'dark' ? "hover:bg-white/10" : "hover:bg-gray-100"
                                                )}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className={clsx("font-black italic uppercase", theme === 'dark' ? "text-white" : "text-black")}>{p.name}</span>
                                                    <span className={clsx("text-[9px] px-1.5 py-0.5 rounded", theme === 'dark' ? "bg-white/10 text-gray-400" : "bg-gray-100 text-gray-500")}>{p.type}</span>
                                                </div>
                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">{p.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Type Selector and Inputs - Hidden if guided and already configured */}
                    {!isGuided && (
                        <div className={clsx("grid grid-cols-3 gap-2 p-1.5 rounded-2xl", theme === 'dark' ? "bg-black/20" : "bg-gray-100")}>
                            {['fortime', 'amrap', 'emom'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => updateBlock(activeBlockIndex, 'type', t)}
                                    className={clsx(
                                        "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        blocks[activeBlockIndex].type === t
                                            ? (theme === 'dark' ? "bg-white/10 text-white shadow-lg" : "bg-white text-black shadow-md")
                                            : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    {t === 'fortime' ? 'For Time' : t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className={clsx("p-4 rounded-2xl text-center", theme === 'dark' ? "bg-white/5" : "bg-gray-50")}>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">
                                {blocks[activeBlockIndex].type === 'fortime' ? 'Time Cap (min)' :
                                    blocks[activeBlockIndex].type === 'amrap' ? 'Tiempo (min)' : 'Duración (min)'}
                            </p>
                            <input
                                type="number"
                                value={blocks[activeBlockIndex].duration || ''}
                                onChange={(e) => updateBlock(activeBlockIndex, 'duration', parseFloat(e.target.value))}
                                placeholder="0"
                                disabled={isGuided}
                                className={clsx("bg-transparent text-3xl font-mono font-black text-center w-full outline-none transition-opacity", theme === 'dark' ? "text-white" : "text-black", isGuided && "opacity-50")}
                            />
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl text-center relative">
                            <button
                                onClick={() => {
                                    const res = { ...blocks[activeBlockIndex].result, noResult: !blocks[activeBlockIndex].result?.noResult };
                                    updateBlock(activeBlockIndex, 'result', res, true); // true for no title update
                                }}
                                className={clsx(
                                    "absolute -top-1 -right-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tighter transition-all z-10",
                                    blocks[activeBlockIndex].result?.noResult
                                        ? "bg-orange-600 text-white shadow-glow"
                                        : (theme === 'dark' ? "bg-white/10 text-gray-500" : "bg-gray-200 text-gray-600")
                                )}
                            >
                                {blocks[activeBlockIndex].result?.noResult ? "Con Resultado" : "Sin Resultado"}
                            </button>
                            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-2">
                                Resultado
                            </p>
                            {blocks[activeBlockIndex].result?.noResult ? (
                                <div className="flex flex-col items-center justify-center py-2">
                                    <Ban className="w-6 h-6 text-orange-500/30 mb-1" />
                                    <p className="text-[10px] text-orange-500/50 font-black uppercase tracking-tighter">No Aplica</p>
                                </div>
                            ) : (
                                blocks[activeBlockIndex].type === 'fortime' ? (
                                    <input
                                        type="text"
                                        placeholder="00:00"
                                        value={blocks[activeBlockIndex].result?.time || ''}
                                        onChange={(e) => {
                                            const res = { ...blocks[activeBlockIndex].result, time: e.target.value };
                                            updateBlock(activeBlockIndex, 'result', res);
                                        }}
                                        className={clsx("bg-transparent text-3xl font-mono font-black text-center w-full outline-none", theme === 'dark' ? "text-white placeholder-white/20" : "text-black placeholder-gray-300")}
                                    />
                                ) : (
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => {
                                            const r = (blocks[activeBlockIndex].result?.rounds || 0) > 0 ? (blocks[activeBlockIndex].result?.rounds || 0) - 1 : 0;
                                            const res = { ...blocks[activeBlockIndex].result, rounds: r };
                                            updateBlock(activeBlockIndex, 'result', res);
                                        }} className={clsx("w-8 h-8 rounded-full font-bold transition-colors", theme === 'dark' ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>-</button>
                                        <span className={clsx("text-3xl font-mono font-black", theme === 'dark' ? "text-white" : "text-black")}>
                                            {blocks[activeBlockIndex].result?.rounds || 0}
                                        </span>
                                        <button onClick={() => {
                                            const r = (blocks[activeBlockIndex].result?.rounds || 0) + 1;
                                            const res = { ...blocks[activeBlockIndex].result, rounds: r };
                                            updateBlock(activeBlockIndex, 'result', res);
                                        }} className="w-8 h-8 rounded-full bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20">+</button>
                                    </div>
                                )
                            )}
                            {!blocks[activeBlockIndex].result?.noResult && (
                                <p className="text-[9px] text-orange-500/60 font-bold uppercase mt-1">
                                    {blocks[activeBlockIndex].type === 'fortime' ? 'Tiempo Final' : 'Rondas'}
                                </p>
                            )}
                        </div>
                    </div>

                </div>

                <div className={clsx("border rounded-[32px] p-4 sm:p-6", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                    <h3 className={clsx("font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2", theme === 'dark' ? "text-white" : "text-black")}>
                        <CheckCircle className="w-4 h-4 text-orange-500" /> Notas del Bloque
                    </h3>
                    <textarea
                        value={blocks[activeBlockIndex].notes || ''}
                        onChange={(e) => updateBlock(activeBlockIndex, 'notes', e.target.value)}
                        placeholder="Escribe aquí notas específicas de este bloque..."
                        className={clsx("w-full bg-transparent font-mono text-sm min-h-[80px] outline-none resize-none p-2 border border-transparent rounded-xl transition-all", theme === 'dark' ? "text-gray-300 placeholder-white/20 focus:border-white/10" : "text-gray-700 placeholder-gray-400 focus:border-gray-200")}
                    />
                </div>

                {/* Exercises List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs">Ejercicios del Bloque</h3>
                        <button onClick={() => setShowAddModal(true)} className="text-orange-500 text-xs font-bold uppercase hover:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Agregar Ejercicio
                        </button>
                    </div>

                    {blocks[activeBlockIndex].exercises.map((ex: any, i: number) => (
                        <div key={ex.id || i} className={clsx(
                            "border rounded-3xl p-4 sm:p-6 relative overflow-hidden group shadow-md",
                            theme === 'dark' ? "bg-[#111] border-white/5" : "bg-white border-gray-100"
                        )}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setReplacingExIndex(i);
                                            setShowAddModal(true);
                                        }}
                                        className={clsx("group/title flex items-center gap-2 rounded-lg pr-3 transition-colors text-left", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-gray-100")}
                                    >
                                        <h4 className={clsx(
                                            "font-heading font-black italic text-xl uppercase tracking-tighter transition-colors",
                                            ex.name.startsWith('Ejercicio_') ? "text-orange-500 animate-pulse" : (theme === 'dark' ? "text-white group-hover/title:text-orange-500" : "text-black group-hover/title:text-orange-600")
                                        )}>
                                            {ex.name.startsWith('Ejercicio_') ? "SELECCIONAR EJERCICIO" : ex.name}
                                        </h4>
                                        <Edit2 className="w-4 h-4 text-gray-600 group-hover/title:text-orange-500 opacity-0 group-hover/title:opacity-100 transition-all" />
                                    </button>

                                    {ex.video_url && (
                                        <button
                                            onClick={() => setViewingVideo(ex.video_url)}
                                            className="p-1.5 bg-white/5 hover:bg-red-600 rounded-full text-gray-400 hover:text-white transition-all flex items-center justify-center"
                                            title="Ver Demo"
                                        >
                                            <Youtube className="w-4 h-4 fill-current" />
                                        </button>
                                    )}
                                </div>

                                <button onClick={() => {
                                    const newBlocks = [...blocks];
                                    newBlocks[activeBlockIndex].exercises.splice(i, 1);
                                    setBlocks(newBlocks);
                                }} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>

                            <div className="space-y-2">
                                {ex.sets.map((set: any, j: number) => (
                                    <div key={j} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                        <span className="text-gray-600 font-mono text-xs w-4">{j + 1}</span>

                                        {/* Weight / Value Input */}
                                        <div className={clsx("flex items-center gap-2 rounded-xl p-1.5 flex-1 min-w-[130px]", theme === 'dark' ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100 shadow-sm")}>
                                            <input
                                                type="number"
                                                value={set.weight || ''}
                                                onChange={(e) => updateSet(activeBlockIndex, i, j, 'weight', e.target.value)}
                                                className={clsx("bg-transparent font-black text-xl w-full text-center outline-none py-3", theme === 'dark' ? "text-white" : "text-black")}
                                                placeholder="0"
                                            />
                                            <select
                                                value={set.unit || 'kg'}
                                                onChange={(e) => updateSet(activeBlockIndex, i, j, 'unit', e.target.value)}
                                                className={clsx("bg-transparent text-[10px] font-black uppercase outline-none border-none cursor-pointer", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black")}
                                            >
                                                <option value="kg">KG</option>
                                                <option value="lb">LB</option>
                                                <option value="bw">BW</option>
                                                <option value="%">%</option>
                                                <option value="m">M</option>
                                                <option value="km">KM</option>
                                                <option value="sec">SEC</option>
                                                <option value="cal">CAL</option>
                                            </select>
                                        </div>

                                        {/* Reps / Measure Input */}
                                        <div className={clsx("flex items-center gap-2 rounded-xl p-1.5 flex-1 min-w-[130px]", theme === 'dark' ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100 shadow-sm")}>
                                            <input
                                                type="number"
                                                value={set.reps || ''}
                                                onChange={(e) => updateSet(activeBlockIndex, i, j, 'reps', e.target.value)}
                                                className={clsx("bg-transparent font-black text-xl w-full text-center outline-none py-3", theme === 'dark' ? "text-white" : "text-black")}
                                                placeholder="0"
                                            />
                                            <select
                                                value={set.measure || 'reps'}
                                                onChange={(e) => updateSet(activeBlockIndex, i, j, 'measure', e.target.value)}
                                                className={clsx("bg-transparent text-[10px] font-black uppercase outline-none border-none cursor-pointer", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black")}
                                            >
                                                <option value="reps">REPS</option>
                                                <option value="sec">SEC</option>
                                                <option value="min">MIN</option>
                                                <option value="m">M</option>
                                                <option value="cal">CAL</option>
                                            </select>
                                        </div>

                                        <button onClick={() => removeSet(activeBlockIndex, i, j)} className="p-2 text-gray-700 hover:text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => addSet(activeBlockIndex, i)} className={clsx("w-full py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 mt-2", theme === 'dark' ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black shadow-sm")}>
                                    <Plus className="w-3 h-3" /> Añadir Serie
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Exercise Selector Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-[#111] w-full max-w-lg rounded-[40px] border border-white/10 overflow-hidden h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-white/10 flex items-center gap-4">
                            <Search className="w-5 h-5 text-gray-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar ejercicio..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent flex-1 text-white outline-none font-bold uppercase placeholder-gray-600"
                            />
                            <button onClick={() => { setShowAddModal(false); setReplacingExIndex(null); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {searchQuery && filteredCatalog.length === 0 && (
                                <button
                                    onClick={() => addExerciseToBlock({ name: searchQuery })}
                                    className="w-full text-left p-6 rounded-2xl bg-brand-red/10 border border-brand-red/30 hover:bg-brand-red/20 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-white font-bold uppercase text-sm">Crear "{searchQuery}"</h4>
                                        <Plus className="w-5 h-5 text-brand-red" />
                                    </div>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">¿No encuentras el ejercicio? Créalo ahora mismo.</p>
                                </button>
                            )}
                            {filteredCatalog.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => addExerciseToBlock(ex)}
                                    className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-brand-red/30 transition-all group flex items-center justify-between"
                                >
                                    <div>
                                        <h4 className="text-white font-bold uppercase text-sm group-hover:text-brand-red transition-colors">{ex.name}</h4>
                                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">{ex.muscle_group}</p>
                                    </div>
                                    {ex.video_url && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingVideo(ex.video_url || null);
                                            }}
                                            className="p-2 bg-white/5 rounded-full hover:bg-red-600 hover:text-white text-gray-500 transition-colors z-20"
                                        >
                                            <Video className="w-4 h-4 fill-current" />
                                        </button>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function HybridView({ time, exercises, setExercises, blocks, setBlocks, workoutTitle, setWorkoutTitle }: {
    time: number;
    exercises: WorkoutExercise[];
    setExercises: (ex: WorkoutExercise[]) => void;
    blocks: WorkoutBlock[];
    setBlocks: (b: WorkoutBlock[]) => void;
    workoutTitle?: string;
    setWorkoutTitle?: (t: string) => void;
}) {
    const { theme } = useTheme();
    const searchParams = useSearchParams();
    const [hybridMode, setHybridMode] = useState<'race' | 'pft' | 'any'>(searchParams.get('mode') === 'ai-coach' ? 'any' : 'race');
    const [initialized, setInitialized] = useState(false);
    const [viewingVideo, setViewingVideo] = useState<string | null>(null);
    const [activeBlockIndex, setActiveBlockIndex] = useState(0);

    // Initialize first block for 'any' mode if empty
    useEffect(() => {
        if (hybridMode === 'any' && blocks.length === 0) {
            setBlocks([{
                id: Math.random().toString(36).substr(2, 9),
                type: 'fortime',
                title: 'Bloque 1',
                exercises: [],
                result: { time: '', rounds: 0 }
            }]);
        }
    }, [hybridMode, blocks.length]);

    const addBlock = () => {
        const newBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'fortime',
            title: `Bloque ${blocks.length + 1}`,
            exercises: [],
            result: { time: '', rounds: 0 }
        };
        setBlocks([...blocks, newBlock]);
        setActiveBlockIndex(blocks.length);
    };

    const removeBlock = (index: number) => {
        if (blocks.length <= 1) return;
        const newBlocks = blocks.filter((_, i) => i !== index);
        setBlocks(newBlocks);
        setActiveBlockIndex(Math.max(0, index - 1));
    };

    const updateBlock = (index: number, field: string, value: any, noTitleUpdate?: boolean) => {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], [field]: value };

        // Auto-generate title if it's currently generic
        const block = newBlocks[index];
        const isGeneric = !block.title || block.title.startsWith('Bloque ') ||
            ['FOR TIME', 'RFT', 'AMRAP', 'EMOM'].includes(block.title.toUpperCase()) ||
            block.title.includes(' MIN');

        if (isGeneric && (field === 'type' || field === 'duration')) {
            const typeLabel = block.type === 'fortime' ? 'For Time' : (block.type === 'rft' ? 'RFT' : (block.type || '').toUpperCase());
            const duration = block.duration || 0;
            newBlocks[index].title = duration > 0 ? `${typeLabel} ${duration} MIN` : typeLabel;
        }

        setBlocks(newBlocks);
    };

    // Sync session title with hybrid mode
    useEffect(() => {
        if (!setWorkoutTitle || !workoutTitle) return;
        if (workoutTitle === "Desafío Híbrido Individual" || workoutTitle === "Simulación de Carrera Híbrida" || workoutTitle === "Hybrid PFT Challenge" || workoutTitle === "Entrenamiento Híbrido Libre" || workoutTitle === "Entrenamiento Híbrido") {
            if (hybridMode === 'race') setWorkoutTitle("Simulación de Carrera Híbrida");
            else if (hybridMode === 'pft') setWorkoutTitle("Hybrid PFT Challenge");
            else if (hybridMode === 'any') setWorkoutTitle("Entrenamiento Híbrido");
        }
    }, [hybridMode]);

    // Templates
    const raceTemplate = [
        { name: '1km Run', target: '1000m' }, { name: '1km Ski Erg', target: '1000m' },
        { name: '1km Run', target: '1000m' }, { name: 'Sled Push', target: '50m' },
        { name: '1km Run', target: '1000m' }, { name: 'Sled Pull', target: '50m' },
        { name: '1km Run', target: '1000m' }, { name: 'Burpees Broad Jump', target: '80m' },
        { name: '1km Run', target: '1000m' }, { name: 'Row', target: '1000m' },
        { name: '1km Run', target: '1000m' }, { name: 'Farmers Carry', target: '200m' },
        { name: '1km Run', target: '1000m' }, { name: 'Sandbag Lunges', target: '100m' },
        { name: '1km Run', target: '1000m' }, { name: 'Wall Balls', target: '100 reps' }
    ];

    const pftTemplate = [
        { name: '1km Run', target: '1000m' },
        { name: 'Burpee Broad Jump', target: '50 reps' },
        { name: 'Stationary Lunges', target: '100 reps' },
        { name: 'Row', target: '1000m' },
        { name: 'Wall Balls', target: '30 reps' }
    ];

    // Initialize exercises based on mode
    useEffect(() => {
        if (!initialized && exercises.length === 0) {
            loadTemplate(hybridMode);
            setInitialized(true);
        }
    }, [hybridMode, initialized]);

    const loadTemplate = (mode: string) => {
        let template = [];
        if (mode === 'race') template = raceTemplate;
        else if (mode === 'pft') template = pftTemplate;
        else return; // 'any' mode starts empty

        const newExercises = template.map(t => ({
            id: Math.random().toString(36).substr(2, 9),
            name: t.name,
            target: t.target,
            sets: [{ order: 1, weight: 0, reps: 0, completed: false, notes: '' }] // using notes for split time?
        }));
        setExercises(newExercises);
    };

    const toggleStation = (index: number) => {
        const copy = [...exercises];
        if (copy[index] && copy[index].sets[0]) {
            copy[index].sets[0].completed = !copy[index].sets[0].completed;
            // Auto-record split time if completing and time is recorded? 
            // For now just toggle.
            setExercises(copy);
        }
    };

    const updateSplit = (index: number, val: string) => {
        const copy = [...exercises];
        if (copy[index] && copy[index].sets[0]) {
            // We can use the 'reps' field to store numeric split or just 'notes' field for text
            // Let's use specific metadata if possible, but strict typing might prevent it.
            // We'll stick to 'weight' for data value if needed, or just let them complete it.
            // Simplest: Just toggle completion for now as per user request "doy clic y no hace nada".
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {viewingVideo && <VideoModal url={viewingVideo} onClose={() => setViewingVideo(null)} />}
            {/* Mode Selector */}
            <div className={clsx("grid grid-cols-3 gap-2 p-1.5 rounded-2xl border", theme === 'dark' ? "bg-[#111] border-white/10" : "bg-gray-100 border-gray-200 shadow-sm")}>
                {['race', 'pft', 'any'].map(m => (
                    <button
                        key={m}
                        onClick={() => { setHybridMode(m as any); setExercises([]); setBlocks([]); setInitialized(false); }}
                        className={clsx(
                            "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            hybridMode === m
                                ? "bg-yellow-500 text-black shadow-lg"
                                : "text-gray-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        {m === 'any' ? 'HÍBRIDO / INTERVALOS' : m.toUpperCase()}
                    </button>
                ))}
            </div>

            {hybridMode === 'any' ? (
                <div className="mt-4 space-y-6 animate-in fade-in duration-500">
                    {/* Blocks Tabs */}
                    <div className="flex overflow-x-auto gap-2 pb-2 px-1 custom-scrollbar">
                        {blocks.map((block, i) => (
                            <button
                                key={block.id || i}
                                onClick={() => setActiveBlockIndex(i)}
                                className={clsx(
                                    "px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border",
                                    activeBlockIndex === i
                                        ? "bg-yellow-500 border-yellow-500 text-black shadow-lg scale-105"
                                        : "bg-[#111] text-gray-500 border-white/5 hover:border-white/10"
                                )}
                            >
                                <span>{block.title || `Bloque ${i + 1}`}</span>
                                {block.type === 'fortime' && <Timer className="w-3 h-3" />}
                                {block.type === 'amrap' && <RefreshCw className="w-3 h-3" />}
                                {block.type === 'emom' && <Clock className="w-3 h-3" />}
                            </button>
                        ))}
                        <button
                            onClick={addBlock}
                            className="px-4 py-3 rounded-2xl bg-white/5 border border-dashed border-white/20 text-gray-500 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Añadir
                        </button>
                    </div>

                    {blocks[activeBlockIndex] && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Format & Settings for Active Block */}
                            <div className={clsx("p-4 sm:p-6 rounded-[32px] border space-y-4 sm:space-y-6", theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-100 shadow-sm")}>
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <input
                                        value={blocks[activeBlockIndex].title}
                                        onChange={(e) => updateBlock(activeBlockIndex, 'title', e.target.value)}
                                        className="bg-transparent text-xl font-heading font-black italic text-white uppercase outline-none placeholder-gray-600 w-full"
                                        placeholder={`BLOQUE ${activeBlockIndex + 1}`}
                                    />
                                    {blocks.length > 1 && (
                                        <button onClick={() => removeBlock(activeBlockIndex)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="px-1">
                                    <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-3">Formato del Bloque</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {['fortime', 'rft', 'amrap', 'emom'].map((f) => {
                                            const isActive = blocks[activeBlockIndex].type === f;
                                            return (
                                                <button
                                                    key={f}
                                                    onClick={() => {
                                                        const newBlocks = [...blocks];
                                                        newBlocks[activeBlockIndex] = {
                                                            ...newBlocks[activeBlockIndex],
                                                            type: f as any,
                                                            rounds: f === 'rft' ? 3 : 1
                                                        };
                                                        setBlocks(newBlocks);
                                                    }}
                                                    className={clsx(
                                                        "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                        isActive
                                                            ? "bg-yellow-500 border-yellow-500 text-black shadow-lg"
                                                            : "bg-black/40 border-white/5 text-gray-500 hover:text-white"
                                                    )}
                                                >
                                                    {f === 'fortime' ? 'For Time' : f === 'rft' ? 'Rds for Time' : f.toUpperCase()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Rounds Selector for RFT */}
                                {blocks[activeBlockIndex].type === 'rft' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Rondas a completar</p>
                                                <p className="text-white font-black italic uppercase text-lg">Rounds for Time</p>
                                            </div>
                                            <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                                <button
                                                    onClick={() => {
                                                        const val = Math.max(1, (blocks[activeBlockIndex].rounds || 1) - 1);
                                                        updateBlock(activeBlockIndex, 'rounds', val);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="text-2xl font-mono font-black text-yellow-500 min-w-[2ch] text-center">{blocks[activeBlockIndex].rounds || 1}</span>
                                                <button
                                                    onClick={() => {
                                                        const val = (blocks[activeBlockIndex].rounds || 1) + 1;
                                                        updateBlock(activeBlockIndex, 'rounds', val);
                                                    }}
                                                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div className={clsx("p-4 rounded-2xl text-center", theme === 'dark' ? "bg-white/5" : "bg-gray-50")}>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">
                                            {blocks[activeBlockIndex].type === 'fortime' ? 'Time Cap (min)' :
                                                blocks[activeBlockIndex].type === 'amrap' ? 'Tiempo (min)' : 'Duración (min)'}
                                        </p>
                                        <input
                                            type="number"
                                            value={blocks[activeBlockIndex].duration || ''}
                                            onChange={(e) => updateBlock(activeBlockIndex, 'duration', parseFloat(e.target.value))}
                                            placeholder="0"
                                            className={clsx("bg-transparent text-3xl font-mono font-black text-center w-full outline-none", theme === 'dark' ? "text-white" : "text-black")}
                                        />
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl text-center relative">
                                        <button
                                            onClick={() => {
                                                const res = { ...blocks[activeBlockIndex].result, noResult: !blocks[activeBlockIndex].result?.noResult };
                                                updateBlock(activeBlockIndex, 'result', res);
                                            }}
                                            className={clsx(
                                                "absolute -top-1 -right-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tighter transition-all z-10",
                                                blocks[activeBlockIndex].result?.noResult
                                                    ? "bg-yellow-600 text-black shadow-glow shadow-yellow-500/20"
                                                    : (theme === 'dark' ? "bg-white/10 text-gray-500" : "bg-gray-200 text-gray-600")
                                            )}
                                        >
                                            {blocks[activeBlockIndex].result?.noResult ? "Con Resultado" : "Sin Resultado"}
                                        </button>
                                        <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-2">
                                            Resultado
                                        </p>
                                        {blocks[activeBlockIndex].result?.noResult ? (
                                            <div className="flex flex-col items-center justify-center py-2">
                                                <Ban className="w-6 h-6 text-yellow-500/30 mb-1" />
                                                <p className="text-[10px] text-yellow-500/50 font-black uppercase tracking-tighter">No Aplica</p>
                                            </div>
                                        ) : (
                                            blocks[activeBlockIndex].type === 'fortime' || blocks[activeBlockIndex].type === 'rft' ? (
                                                <input
                                                    type="text"
                                                    placeholder="00:00"
                                                    value={blocks[activeBlockIndex].result?.time || ''}
                                                    onChange={(e) => {
                                                        const res = { ...blocks[activeBlockIndex].result, time: e.target.value };
                                                        updateBlock(activeBlockIndex, 'result', res);
                                                    }}
                                                    className={clsx("bg-transparent text-3xl font-mono font-black text-center w-full outline-none", theme === 'dark' ? "text-white placeholder-white/20" : "text-black placeholder-gray-300")}
                                                />
                                            ) : (
                                                <div className="flex justify-center items-center gap-2">
                                                    <button onClick={() => {
                                                        const r = (blocks[activeBlockIndex].result?.rounds || 0) > 0 ? (blocks[activeBlockIndex].result?.rounds || 0) - 1 : 0;
                                                        const res = { ...blocks[activeBlockIndex].result, rounds: r };
                                                        updateBlock(activeBlockIndex, 'result', res);
                                                    }} className={clsx("w-8 h-8 rounded-full font-bold transition-colors", theme === 'dark' ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>-</button>
                                                    <span className={clsx("text-3xl font-mono font-black", theme === 'dark' ? "text-white" : "text-black")}>
                                                        {blocks[activeBlockIndex].result?.rounds || 0}
                                                    </span>
                                                    <button onClick={() => {
                                                        const r = (blocks[activeBlockIndex].result?.rounds || 0) + 1;
                                                        const res = { ...blocks[activeBlockIndex].result, rounds: r };
                                                        updateBlock(activeBlockIndex, 'result', res);
                                                    }} className="w-8 h-8 rounded-full bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20">+</button>
                                                </div>
                                            )
                                        )}
                                        {!blocks[activeBlockIndex].result?.noResult && (
                                            <p className="text-[9px] text-yellow-500/60 font-bold uppercase mt-1">
                                                {blocks[activeBlockIndex].type === 'fortime' || blocks[activeBlockIndex].type === 'rft' ? 'Tiempo Final' : 'Rondas'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-white/5" />

                                <div className="pt-2">
                                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-4">Ejercicios del Bloque</p>
                                    <GymView
                                        exercises={blocks[activeBlockIndex].exercises}
                                        setExercises={(newEx) => {
                                            const newBlocks = [...blocks];
                                            newBlocks[activeBlockIndex].exercises = newEx;
                                            setBlocks(newBlocks);
                                        }}
                                        mode="hybrid"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className={clsx("border p-6 rounded-[32px] shadow-sm", theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-100")}>
                    <p className="text-yellow-600 dark:text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-2">
                        {hybridMode === 'race' ? 'Estaciones Hybrid (Race)' : 'Hybrid PFT'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {exercises.map((ex: any, i: number) => {
                            const isCompleted = ex.sets[0]?.completed;
                            const isRun = ex.name.includes('Run');

                            return (
                                <div
                                    key={ex.id || i}
                                    onClick={() => toggleStation(i)}
                                    className={clsx(
                                        "p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer group relative overflow-hidden",
                                        isCompleted
                                            ? (isRun ? (theme === 'dark' ? "bg-white/10 border-white/20" : "bg-gray-100 border-gray-300") : "bg-yellow-500/20 border-yellow-500/40")
                                            : (isRun ? (theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-gray-50 border-gray-100 hover:bg-gray-100") : "bg-yellow-500/5 border-yellow-500/10 hover:bg-yellow-500/10 shadow-sm")
                                    )}
                                >
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors",
                                            isCompleted ? "bg-white text-black" : "bg-black/40 text-gray-500"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className={clsx("font-bold text-[10px] uppercase tracking-wide", isRun ? "text-gray-300" : "text-yellow-500")}>
                                                {ex.name}
                                            </p>
                                            {ex.target && ex.target !== "-" && <p className="text-[9px] text-gray-500 font-mono mt-0.5">{ex.target}</p>}
                                        </div>
                                        {ex.video_url && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingVideo(ex.video_url);
                                                }}
                                                className="p-1.5 bg-white/5 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-all z-20"
                                                title="Ver Video"
                                            >
                                                <Youtube className="w-4 h-4 fill-current" />
                                            </button>
                                        )}
                                    </div>

                                    <div className={clsx(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all relative z-10",
                                        isCompleted
                                            ? (isRun ? "border-white bg-white text-black" : "border-yellow-500 bg-yellow-500 text-black")
                                            : "border-white/10 group-hover:border-white/30"
                                    )}>
                                        {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                                    </div>

                                    {isCompleted && <div className={clsx("absolute inset-0 opacity-10 z-0", isRun ? "bg-white" : "bg-yellow-500")} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function GymView({ exercises, setExercises, mode = 'gym', workoutTitle, setWorkoutTitle }: {
    exercises: WorkoutExercise[];
    setExercises: (ex: WorkoutExercise[]) => void;
    mode?: string;
    workoutTitle?: string;
    setWorkoutTitle?: (t: string) => void;
}) {
    const { theme } = useTheme();
    const [showAddModal, setShowAddModal] = useState(false);
    const [catalog, setCatalog] = useState<WorkoutExercise[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewingVideo, setViewingVideo] = useState<string | null>(null);

    // Update title based on muscle focus if possible
    useEffect(() => {
        if (!setWorkoutTitle || !workoutTitle) return;
        if (workoutTitle === "Entrenamiento de Fuerza & Musculación" || workoutTitle === "Sesión de Entrenamiento") {
            const muscleGroups = exercises.map((ex: WorkoutExercise) => ex.muscle_group).filter(Boolean);
            if (muscleGroups.length > 0) {
                const unique = Array.from(new Set(muscleGroups));
                if (unique.length === 1) setWorkoutTitle(`Entrenamiento de ${unique[0]}`);
                else if (unique.length > 1) setWorkoutTitle(`Rutina de ${unique.slice(0, 2).join(" & ")}`);
            }
        }
    }, [exercises.length]);

    // Load catalog only when modal opens
    useEffect(() => {
        if (showAddModal && catalog.length === 0) {
            getExercises(mode).then(setCatalog);
        }
    }, [showAddModal, catalog.length, mode]);

    const filteredCatalog = useMemo(() => {
        if (!searchQuery) return catalog;
        return catalog.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [catalog, searchQuery]);

    const addExercise = async (template: any) => {
        const prev = await getExercisePreviousRecord(template.name) || "0kg x 0";

        // Auto-detect unit type based on exercise name
        let defaultUnit = 'kg';
        let defaultMeasure = 'reps';
        const nameLower = template.name.toLowerCase();

        if (nameLower.includes('run') || nameLower.includes('carrera') || nameLower.includes('row') || nameLower.includes('ski') || nameLower.includes('bike')) {
            defaultUnit = 'm'; // Distance
            defaultMeasure = 'cal';
        } else if (nameLower.includes('plank') || nameLower.includes('hold') || nameLower.includes('isometric') || nameLower.includes('handstand')) {
            defaultUnit = 'sec'; // Time
            defaultMeasure = 'rep';
        } else if (nameLower.includes('walk') || nameLower.includes('carry') || nameLower.includes('yoke') || nameLower.includes('lunges')) {
            defaultUnit = 'm';
            defaultMeasure = 'reps';
        }

        const newEx = {
            id: Math.random().toString(36).substr(2, 9),
            name: template.name,
            target: mode === 'gym' ? "3 series x 8-12 reps" : "-",
            prev: prev,
            sets: [{ order: 1, weight: 0, reps: 0, completed: false, unit: defaultUnit, measure: defaultMeasure }],
            video_url: template.video_url
        };
        setExercises([...exercises, newEx]);
        setShowAddModal(false);
    };

    const updateSet = (widthIndex: number, setIndex: number, field: string, val: any) => {
        const copy = [...exercises];
        const s = copy[widthIndex].sets[setIndex];
        // @ts-ignore
        s[field] = val;
        setExercises(copy);
    }

    const toggleSet = (exIdx: number, sIdx: number) => {
        const copy = [...exercises];
        copy[exIdx].sets[sIdx].completed = !copy[exIdx].sets[sIdx].completed;
        setExercises(copy);
    }

    const addSet = (exIdx: number) => {
        const copy = [...exercises];
        const prev = copy[exIdx].sets[copy[exIdx].sets.length - 1] || { weight: 0, reps: 0 };
        copy[exIdx].sets.push({
            order: copy[exIdx].sets.length + 1,
            weight: prev.weight,
            reps: prev.reps,
            completed: false,
            unit: prev.unit || 'kg',
            measure: prev.measure || 'reps'
        });
        setExercises(copy);
    }

    // Simple remove set handler
    const removeSet = (exIdx: number) => {
        const copy = [...exercises];
        if (copy[exIdx].sets.length > 0) {
            copy[exIdx].sets.pop();
            setExercises(copy);
        }
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {viewingVideo && <VideoModal url={viewingVideo} onClose={() => setViewingVideo(null)} />}
            {exercises.map((ex: WorkoutExercise, i: number) => (
                <div key={ex.id} className={clsx(
                    "border rounded-[32px] overflow-hidden shadow-sm transition-all",
                    theme === 'dark' ? "bg-[#111] border-white/5" : "bg-white border-gray-100"
                )}>
                    <div className={clsx(
                        "p-6 border-b flex justify-between items-start",
                        theme === 'dark' ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50/50"
                    )}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <input
                                    value={ex.name}
                                    onChange={(e) => {
                                        const copy = [...exercises];
                                        copy[i].name = e.target.value;
                                        setExercises(copy);
                                    }}
                                    className={clsx("bg-transparent text-xl font-heading font-black italic uppercase outline-none w-full", theme === 'dark' ? "text-white placeholder-white/20" : "text-black placeholder-gray-300")}
                                />
                                {ex.video_url && (
                                    <button
                                        onClick={() => setViewingVideo(ex.video_url || null)}
                                        className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-600 rounded-full text-gray-400 hover:text-white transition-all shrink-0 border border-white/10 hover:border-red-600 shadow-sm"
                                    >
                                        <Youtube className="w-4 h-4 fill-current" />
                                        <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">Video</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                {ex.target && ex.target !== "-" && (
                                    <p className="text-[10px] text-brand-red font-black uppercase tracking-[0.2em]">{ex.target}</p>
                                )}
                                {ex.prev && <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">PR: {ex.prev}</p>}
                            </div>
                        </div>
                        <button onClick={() => {
                            const copy = exercises.filter((_: any, idx: number) => idx !== i);
                            setExercises(copy);
                        }} className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-40 hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <div className="p-4 space-y-2">
                        {ex.sets.map((set: any, j: number) => (
                            <div key={j} className={clsx(
                                "grid grid-cols-12 gap-2 p-3 rounded-[24px] items-center transition-all duration-300 relative",
                                set.completed ? "bg-green-500/10 border border-green-500/30" : "bg-white/5 border border-white/5 hover:bg-white/[0.08]"
                            )}>
                                {/* Float Index */}
                                <div className="absolute top-2 left-3 font-black text-[8px] opacity-30 pointer-events-none">
                                    #{j + 1}
                                </div>

                                <div className={clsx(
                                    "col-span-4 flex items-center rounded-2xl px-2 border transition-all",
                                    theme === 'dark' ? "bg-black/40 border-white/5 focus-within:border-brand-red/50" : "bg-gray-100 border-gray-200 focus-within:border-brand-red/30"
                                )}>
                                    <input type="number" placeholder="0" className={clsx("w-full bg-transparent text-center font-black py-4 outline-none text-xl", theme === 'dark' ? "text-white placeholder-white/10" : "text-black placeholder-gray-400")}
                                        value={set.weight === 0 ? '0' : (set.weight || '')} onChange={(e) => updateSet(i, j, 'weight', e.target.value === '' ? null : parseFloat(e.target.value))} />
                                    <select
                                        value={set.unit || 'kg'}
                                        onChange={(e) => updateSet(i, j, 'unit', e.target.value)}
                                        className={clsx("bg-transparent text-[8px] font-black uppercase outline-none border-none cursor-pointer", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black")}
                                    >
                                        <option value="kg">KG</option>
                                        <option value="lb">LB</option>
                                        <option value="bw">BW</option>
                                        <option value="sec">SEC</option>
                                        <option value="m">M</option>
                                    </select>
                                </div>
                                <div className={clsx(
                                    "col-span-4 flex items-center rounded-2xl px-2 border transition-all",
                                    theme === 'dark' ? "bg-black/40 border-white/5 focus-within:border-brand-red/50" : "bg-gray-100 border-gray-200 focus-within:border-brand-red/30"
                                )}>
                                    <input type="number" placeholder="0" className={clsx("w-full bg-transparent text-center font-black py-4 outline-none text-xl", theme === 'dark' ? "text-white placeholder-white/10" : "text-black placeholder-gray-400")}
                                        value={set.reps === 0 ? '0' : (set.reps || '')} onChange={(e) => updateSet(i, j, 'reps', e.target.value === '' ? null : parseFloat(e.target.value))} />
                                    <select
                                        value={set.measure || 'reps'}
                                        onChange={(e) => updateSet(i, j, 'measure', e.target.value)}
                                        className={clsx("bg-transparent text-[8px] font-black uppercase outline-none border-none cursor-pointer", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black")}
                                    >
                                        <option value="reps">REPS</option>
                                        <option value="sec">SEC</option>
                                        <option value="min">MIN</option>
                                        <option value="cal">CAL</option>
                                        <option value="m">M</option>
                                    </select>
                                </div>
                                <div className="col-span-4 flex justify-center">
                                    <button onClick={() => toggleSet(i, j)} className={clsx(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all transform active:scale-90",
                                        set.completed ? "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]" : "bg-white/10 text-gray-500 hover:bg-white/20 hover:text-white"
                                    )}>
                                        <CheckCircle className={clsx("w-6 h-6", set.completed ? "fill-current" : "stroke-current")} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={clsx("p-2 flex border-t", theme === 'dark' ? "bg-black/40 border-white/5" : "bg-gray-50/50 border-gray-100")}>
                        <button onClick={() => removeSet(i)} className="flex-1 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-red-500 transition-colors">- Serie</button>
                        <div className={clsx("w-px my-2", theme === 'dark' ? "bg-white/5" : "bg-gray-200")}></div>
                        <button onClick={() => addSet(i)} className="flex-1 py-3 text-[10px] font-black text-brand-red uppercase tracking-widest hover:bg-brand-red/10 transition-colors">+ Serie</button>
                    </div>
                </div>
            ))}

            <button onClick={() => setShowAddModal(true)} className="w-full py-6 border-2 border-dashed border-white/10 rounded-[32px] text-gray-500 font-black uppercase tracking-[0.2em] hover:border-brand-red/50 hover:text-white hover:bg-white/5 transition-all">
                + Añadir Ejercicio
            </button>

            {/* Add Modal */}
            {showAddModal && (
                <div className={clsx(
                    "fixed inset-0 backdrop-blur-xl z-[100] flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200",
                    theme === 'dark' ? "bg-black/90" : "bg-white/95"
                )}>
                    <div className="flex items-center justify-between mb-6 pt-4">
                        <h2 className={clsx("text-2xl font-heading font-black italic uppercase", theme === 'dark' ? "text-white" : "text-black")}>Añadir Movimiento</h2>
                        <button onClick={() => setShowAddModal(false)} className={clsx("p-3 rounded-full transition-colors", theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-black hover:bg-gray-200 shadow-sm")}><X className="w-6 h-6" /></button>
                    </div>
                    <div className={clsx("p-4 rounded-2xl mb-4 border transition-all shadow-sm focus-within:ring-2 ring-brand-red/20", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100")}>
                        <input autoFocus type="text" placeholder="Buscar ejercicio, máquina o grupo muscular..." className={clsx("w-full bg-transparent font-bold outline-none text-lg", theme === 'dark' ? "text-white placeholder-gray-500" : "text-black placeholder-gray-400")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pb-10">
                        {searchQuery && filteredCatalog.length === 0 && (
                            <button
                                onClick={() => addExercise({ name: searchQuery })}
                                className="w-full text-left p-6 bg-brand-red/10 rounded-2xl border border-brand-red/30 hover:bg-brand-red/20 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-white font-bold uppercase text-lg">Cargar "{searchQuery}"</h4>
                                    <Plus className="w-6 h-6 text-brand-red" />
                                </div>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Crear ejercicio personalizado ahora.</p>
                            </button>
                        )}
                        {filteredCatalog.map(item => (
                            <button key={item.id} onClick={() => addExercise(item)} className="w-full text-left p-5 bg-[#111] rounded-2xl border border-white/5 hover:border-brand-red hover:bg-white/5 transition-all group flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-white uppercase text-lg group-hover:text-brand-red transition-colors">{item.name}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{item.muscle_group} • {item.category}</p>
                                </div>
                                {item.video_url && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingVideo(item.video_url || null);
                                        }}
                                        className="p-2 bg-white/5 rounded-full hover:bg-red-600 hover:text-white text-gray-500 transition-colors z-20"
                                    >
                                        <Video className="w-4 h-4 fill-current" />
                                    </button>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// --- Sharing Components ---

function FinishModal({
    onConfirm,
    onCancel,
    shareToArena,
    setShareToArena,
    shareToStory,
    setShareToStory,
    isSaving,
    imageUrl,
    setImageUrl,
    isUploading,
    onImageUpload,
    fileInputRef,
    workoutTitle,
    rpe,
    setRpe,
    // New props for stats
    distance = 0,
    time = 0,
    pace = "0:00",
    elevation = 0,
    runPath = [],
    onOpenShare,
    blocks = [],
    onOpenWorkoutCard,
}: {
    onConfirm: () => void;
    onCancel: () => void;
    shareToArena: boolean;
    setShareToArena: (v: boolean) => void;
    shareToStory: boolean;
    setShareToStory: (v: boolean) => void;
    isSaving: boolean;
    imageUrl: string | null;
    setImageUrl: (url: string | null) => void;
    isUploading: boolean;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    workoutTitle: string;
    rpe: number;
    setRpe: (r: number) => void;
    distance?: number;
    time?: number;
    pace?: string;
    elevation?: number;
    runPath?: { lat: number; lon: number }[];
    onOpenShare?: () => void;
    blocks?: WorkoutBlock[];
    onOpenWorkoutCard?: () => void;
}) {

    const { theme } = useTheme();
    const rpeLabels: Record<number, string> = {
        0: 'Sin definir',
        1: 'Recuperación',
        2: 'Muy Ligero',
        3: 'Ligero',
        4: 'Moderado',
        5: 'Esfuerzo Estable',
        6: 'Algo Intenso',
        7: 'Intenso',
        8: 'Muy Intenso',
        9: 'Casi Máximo',
        10: 'Esfuerzo Máximo'
    };

    return (
        <div className={clsx("fixed inset-0 z-[200] backdrop-blur-xl flex items-center justify-center p-4", theme === 'dark' ? "bg-black/95" : "bg-white/90")}>
            <div className={clsx(
                "w-full max-w-md rounded-[40px] border overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300",
                theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-100"
            )}>
                <div className="p-6 md:p-8 text-center space-y-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-red/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-brand-red/30">
                        <Trophy className="w-8 h-8 md:w-10 md:h-10 text-brand-red" />
                    </div>
                    <div>
                        <h2 className={clsx("text-2xl md:text-3xl font-heading font-black italic uppercase tracking-tighter", theme === 'dark' ? "text-white" : "text-black")}>Victoria Lograda</h2>
                        <p className="text-brand-red text-xs font-black uppercase tracking-[0.2em] mt-2 mb-1">{workoutTitle}</p>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Misión Completada, Atleta.</p>
                    </div>

                    {/* Image Upload Area / Strava Style Preview */}
                    <div className="relative group">
                        {imageUrl ? (
                            <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/10 group/card shadow-2xl">
                                <img src={imageUrl} alt="Workout" className="w-full h-full object-cover opacity-80" />

                                {/* Strava-style Overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-6 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none">
                                    <div className="text-center">
                                        <h4 className="text-white font-heading font-black italic text-xl uppercase tracking-tighter">RIVAL <span className="text-brand-red">FIT</span></h4>
                                        <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>

                                    <div className="space-y-4 text-center">
                                        <div className="space-y-0">
                                            <p className="text-6xl font-heading font-black text-white italic tracking-tighter">{(distance / 1000).toFixed(2)}</p>
                                            <p className="text-xs font-black text-white/60 uppercase tracking-widest">Kilómetros</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-xl font-heading font-black text-white italic">{Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}</p>
                                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Tiempo</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-heading font-black text-white italic">{pace}</p>
                                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Ritmo /km</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full px-8">
                                        <RouteMap path={runPath} className="w-32 h-32 mx-auto filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" color="white" />
                                    </div>

                                    {/* Action to customize/share */}
                                    <div className="absolute bottom-6 left-0 right-0 px-8">
                                        <button
                                            onClick={onOpenShare}
                                            className="w-full py-3 bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/30 transition-all flex items-center justify-center gap-2 pointer-events-auto"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Ver Tarjeta Full
                                        </button>
                                    </div>
                                </div>


                                <button
                                    onClick={() => setImageUrl(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-brand-red transition-all pointer-events-auto"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className={clsx(
                                        "w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden relative",
                                        theme === 'dark' ? "border-white/10 bg-white/5 hover:border-brand-red/50 hover:bg-white/10" : "border-gray-200 bg-gray-50 hover:border-brand-red/30 hover:bg-gray-100"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                                    ) : (
                                        <>
                                            {runPath.length > 0 && (
                                                <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                                                    <RouteMap path={runPath} className="w-full h-full p-8" />
                                                </div>
                                            )}
                                            <Camera className="w-8 h-8 text-gray-400 group-hover:text-brand-red transition-colors relative z-10" />
                                            <div className={clsx("text-[10px] font-black uppercase tracking-widest transition-colors relative z-10", theme === 'dark' ? "text-gray-500 group-hover:text-white" : "text-gray-400 group-hover:text-black")}>Añadir Foto y Crear Mapa</div>
                                            <p className="text-[8px] text-gray-600 font-bold uppercase relative z-10">Sube una foto para generar tu tarjeta de carrera</p>
                                        </>
                                    )}
                                </button>

                                {distance > 0 && (
                                    <button
                                        onClick={onOpenShare}
                                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MapIcon className="w-4 h-4" />
                                        Generar Tarjeta con Mapa
                                    </button>
                                )}
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={onImageUpload}
                        />
                    </div>
                </div>

                {/* WOD Share Card Button (Cross Training / Hybrid / OCR) */}
                {blocks && blocks.length > 0 && onOpenWorkoutCard && (
                    <button
                        onClick={onOpenWorkoutCard}
                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Ver Tarjeta del WOD
                    </button>
                )}

                {/* RPE Selector */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Esfuerzo Percibido (RPE)</p>
                        <span className="text-xs font-black text-brand-red uppercase italic">{rpe > 0 ? `${rpe}/10 - ${rpeLabels[rpe]}` : 'Selecciona'}</span>
                    </div>
                    <div className="flex justify-between gap-1 overflow-x-auto pb-2 px-1 scrollbar-hide">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                            <button
                                key={val}
                                onClick={() => setRpe(val)}
                                className={clsx(
                                    "w-8 h-8 rounded-lg text-[10px] font-black transition-all flex items-center justify-center shrink-0 border",
                                    rpe === val
                                        ? "bg-brand-red border-brand-red text-white shadow-glow-sm scale-110"
                                        : "bg-white/5 border-white/10 text-gray-500 hover:border-white/20"
                                )}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => setShareToArena(!shareToArena)}
                        className={clsx(
                            "w-full p-4 rounded-2xl border flex items-center gap-4 transition-all",
                            shareToArena
                                ? "bg-brand-red border-transparent text-white shadow-lg shadow-brand-red/20"
                                : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-500" : "bg-gray-50 border-gray-100 text-gray-400")
                        )}
                    >
                        <Activity className="w-5 h-5" />
                        <div className="text-left flex-1">
                            <p className="font-black text-xs uppercase italic">Publicar en el Muro</p>
                            <p className="text-[10px] opacity-70">Comparte tu hazaña con la comunidad.</p>
                        </div>
                        <div className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center", shareToArena ? "bg-white text-black" : "border-white/10")}>
                            {shareToArena && <CheckCircle className="w-4 h-4 fill-current" />}
                        </div>
                    </button>

                    <button
                        onClick={() => setShareToStory(!shareToStory)}
                        className={clsx(
                            "w-full p-4 rounded-2xl border flex items-center gap-4 transition-all",
                            shareToStory
                                ? "bg-purple-600 border-transparent text-white shadow-lg shadow-purple-900/20"
                                : (theme === 'dark' ? "bg-white/5 border-white/10 text-gray-500" : "bg-gray-50 border-gray-100 text-gray-400")
                        )}
                    >
                        <Camera className="w-5 h-5" />
                        <div className="text-left flex-1">
                            <p className="font-black text-xs uppercase italic">Añadir a Historia</p>
                            <p className="text-[10px] opacity-70">Desaparece en 24 horas.</p>
                        </div>
                        <div className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center", shareToStory ? "bg-white text-black" : "border-white/10")}>
                            {shareToStory && <CheckCircle className="w-4 h-4 fill-current" />}
                        </div>
                    </button>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-3 pb-6">
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className={clsx(
                            "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all font-heading",
                            theme === 'dark' ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                    >
                        Volver
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSaving || isUploading}
                        className={clsx(
                            "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-glow font-heading",
                            theme === 'dark' ? "bg-white text-black hover:bg-brand-red hover:text-white" : "bg-black text-white hover:bg-brand-red"
                        )}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar Ahora"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CoachAiView({
    showControls,
    workoutTitle,
    blocks,
    setBlocks,
    elapsedSeconds,
    isPaused,
    toggleTimer,
    handleFinish,
    isSaving,
    formatTime,
    countdown,
    sportMode,
    targetDuration,
    setViewingVideo,
    timerMode,
    rpe,
    setRpe,
    prAchievements,
    closeCelebration,
    userName,
}: {
    showControls: boolean;
    workoutTitle: string;
    blocks: WorkoutBlock[];
    setBlocks: (b: WorkoutBlock[]) => void;
    elapsedSeconds: number;
    isPaused: boolean;
    toggleTimer: () => void;
    handleFinish: () => void;
    isSaving: boolean;
    formatTime: (s: number) => string;
    countdown: number | null;
    sportMode: string | null;
    targetDuration: number | null;
    setViewingVideo: (url: string | null) => void;
    timerMode: 'up' | 'down';
    rpe: number;
    setRpe: (r: number) => void;
    prAchievements: any[];
    closeCelebration: () => void;
    userName: string;
}) {
    const { theme } = useTheme();
    const displayTime = timerMode === 'down' && targetDuration
        ? Math.max(0, (targetDuration * 60) - elapsedSeconds)
        : elapsedSeconds;

    const progress = targetDuration ? Math.min(100, (elapsedSeconds / (targetDuration * 60)) * 100) : 0;

    // Calculate completed exercises across blocks
    const totalExercises = blocks.reduce((acc, b) => acc + (b.exercises?.length || 0), 0);
    const completedExercises = blocks.reduce((acc, b) => acc + (b.exercises?.filter(ex => ex.sets?.[0]?.completed)?.length || 0), 0);
    const exerciseProgressPercent = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

    // Check beep sound feedback
    const playCheckBeep = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 600; // sporty chirp
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) { console.warn("Audio error", e) }
    };

    return (
        <div className={clsx("min-h-screen flex flex-col pt-12 md:pt-20 pb-40 px-4 max-w-xl mx-auto space-y-8 md:space-y-12 relative", theme === 'dark' ? "bg-black" : "bg-white")}>
            {/* Header / Coach Intro */}
            <div className="text-center space-y-3 md:space-y-4 pt-4 md:pt-8">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="flex items-center gap-2 text-brand-red">
                        <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">{timerMode === 'down' ? 'Protocolo Activo' : 'Sesión Libre'}</span>
                    </div>
                    {targetDuration && (
                        <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full border", theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-200")}>
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{targetDuration} MIN</span>
                        </div>
                    )}
                </div>
                <h2 className={clsx("text-3xl md:text-4xl font-heading font-black italic uppercase leading-none tracking-tighter", theme === 'dark' ? "text-white" : "text-black")}>
                    {workoutTitle}
                </h2>

                {/* Sporty Progress Dashboard */}
                <div className={clsx(
                    "max-w-md mx-auto rounded-3xl p-5 border space-y-4 shadow-xl",
                    theme === 'dark' ? "bg-[#111] border-white/10" : "bg-gray-50 border-gray-200"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="text-left">
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Ejercicios</p>
                            <h4 className="text-xl font-heading font-black italic text-brand-red">
                                {completedExercises} de {totalExercises}
                            </h4>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Entrenamiento</p>
                            <h4 className={clsx("text-xl font-heading font-black italic", theme === 'dark' ? "text-white" : "text-black")}>
                                {exerciseProgressPercent}% completado
                            </h4>
                        </div>
                    </div>

                    {/* Gradient Progress Bar */}
                    <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                        <div
                            className="h-full bg-gradient-to-r from-brand-red to-orange-500 transition-all duration-500 rounded-full"
                            style={{ width: `${exerciseProgressPercent}%` }}
                        />
                    </div>

                    {/* Mini Exercises Step Map */}
                    <div className="flex flex-wrap gap-2 justify-center pt-1">
                        {blocks.flatMap((b, bIdx) => b.exercises.map((ex, eIdx) => {
                            const isCompleted = !!ex.sets?.[0]?.completed;
                            return (
                                <div
                                    key={ex.id || `${bIdx}-${eIdx}`}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 border",
                                        isCompleted
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                            : (theme === 'dark' ? "bg-white/5 border-white/5 text-white/40" : "bg-black/5 border-black/5 text-black/40")
                                    )}
                                >
                                    <span className={clsx("w-1.5 h-1.5 rounded-full", isCompleted ? "bg-emerald-400" : "bg-white/20")} />
                                    {eIdx + 1}
                                </div>
                            );
                        }))}
                    </div>
                </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-12 md:space-y-16">
                {blocks.map((block: any, bIdx: number) => (
                    <div key={block.id || bIdx} className="space-y-4 md:space-y-6">
                        {/* Block Title Header */}
                        {!(blocks.length === 1 && block.title === workoutTitle) ? (
                            <div className="flex items-center gap-3 md:gap-4 px-2">
                                <div className={clsx("h-px flex-1 bg-gradient-to-r from-transparent", theme === 'dark' ? "to-white/10" : "to-gray-200")} />
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] md:text-[10px] text-brand-red font-black uppercase tracking-[0.4em] mb-1">Bloque {bIdx + 1}</span>
                                    <h3 className={clsx("text-lg md:text-xl font-heading font-black italic uppercase tracking-tighter", theme === 'dark' ? "text-white" : "text-black")}>
                                        {block.title}
                                    </h3>
                                </div>
                                <div className={clsx("h-px flex-1 bg-gradient-to-l from-transparent", theme === 'dark' ? "to-white/10" : "to-gray-200")} />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 md:gap-4 px-2 opacity-40">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                <span className="text-[8px] md:text-[10px] text-white font-black uppercase tracking-[0.4em]">Estructura del Protocolo</span>
                                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                            </div>
                        )}

                        {/* Exercises in Block */}
                        <div className="space-y-3 md:space-y-4">
                            {block.exercises.map((ex: any, eIdx: number) => (
                                <div key={ex.id || eIdx} className={clsx(
                                    "border rounded-[28px] md:rounded-[32px] p-5 md:p-6 space-y-4 shadow-xl relative overflow-hidden group transition-all duration-500",
                                    ex.sets?.[0]?.completed
                                        ? (theme === 'dark' ? "bg-emerald-950/5 border-emerald-500/30 shadow-emerald-500/5" : "bg-emerald-50/20 border-emerald-500/20")
                                        : (theme === 'dark' ? "bg-[#111] border-white/5 hover:border-brand-red/30" : "bg-white border-gray-100 hover:border-brand-red/25")
                                )}>
                                    <div className="absolute top-0 right-0 p-6 opacity-0 md:group-hover:opacity-5 transition-opacity pointer-events-none">
                                        <Activity className="w-16 h-16 text-brand-red" />
                                    </div>

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className={clsx(
                                                "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-heading font-black italic text-xs md:text-sm border transition-all",
                                                ex.sets?.[0]?.completed
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                    : (theme === 'dark' ? "bg-white/5 border-white/5 text-brand-red" : "bg-gray-50 border-gray-100 text-brand-red")
                                            )}>
                                                {eIdx + 1}
                                            </div>
                                            <div>
                                                <h4 className={clsx(
                                                    "text-base md:text-lg font-heading font-black italic uppercase tracking-tight leading-none transition-all",
                                                    ex.sets?.[0]?.completed
                                                        ? "line-through text-white/40"
                                                        : (theme === 'dark' ? "text-white" : "text-black")
                                                )}>{ex.name}</h4>
                                                <p className="text-brand-red text-[8px] md:text-[9px] font-black uppercase tracking-widest mt-1 opacity-70">{ex.target}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ex.video_url && (
                                                <button
                                                    onClick={() => setViewingVideo(ex.video_url)}
                                                    className="p-2 bg-white/5 hover:bg-red-600 rounded-xl text-gray-400 hover:text-white transition-all border border-white/10 hover:border-red-600"
                                                >
                                                    <Youtube className="w-4 h-4 fill-current" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const newBlocks = [...blocks];
                                                    if (!newBlocks[bIdx].exercises[eIdx].sets) {
                                                        newBlocks[bIdx].exercises[eIdx].sets = [];
                                                    }
                                                    if (newBlocks[bIdx].exercises[eIdx].sets.length === 0) {
                                                        newBlocks[bIdx].exercises[eIdx].sets.push({ order: 1, weight: 0, reps: 0, completed: false });
                                                    }
                                                    const currentCompleted = !!newBlocks[bIdx].exercises[eIdx].sets[0].completed;
                                                    newBlocks[bIdx].exercises[eIdx].sets[0].completed = !currentCompleted;
                                                    setBlocks(newBlocks);
                                                    if (!currentCompleted) {
                                                        playCheckBeep();
                                                    }
                                                }}
                                                className={clsx(
                                                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                                    ex.sets?.[0]?.completed
                                                        ? "bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                                                        : (theme === 'dark' ? "border-white/20 hover:border-brand-red text-white" : "border-gray-300 hover:border-brand-red text-black")
                                                )}
                                            >
                                                {ex.sets?.[0]?.completed ? (
                                                    <CheckCircle className="w-5 h-5 fill-current" />
                                                ) : (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-transparent hover:bg-brand-red/50 transition-colors" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 md:gap-3 relative z-10">
                                        <div className={clsx(
                                            "border p-2.5 md:p-3 rounded-xl md:rounded-2xl focus-within:border-brand-red/50 transition-all",
                                            theme === 'dark' ? "bg-black/40 border-white/5" : "bg-gray-100 border-gray-200"
                                        )}>
                                            <p className="text-[7px] md:text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">Peso</p>
                                            <div className="flex items-end gap-1">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={ex.sets?.[0]?.weight || ''}
                                                    onChange={(e) => {
                                                        const newBlocks = [...blocks];
                                                        if (!newBlocks[bIdx].exercises[eIdx].sets) {
                                                            newBlocks[bIdx].exercises[eIdx].sets = [];
                                                        }
                                                        if (newBlocks[bIdx].exercises[eIdx].sets.length === 0) {
                                                            newBlocks[bIdx].exercises[eIdx].sets.push({ order: 1, weight: 0, reps: 0, completed: false });
                                                        }
                                                        newBlocks[bIdx].exercises[eIdx].sets[0].weight = parseFloat(e.target.value) || 0;
                                                        setBlocks(newBlocks);
                                                    }}
                                                    className={clsx("bg-transparent text-lg md:text-xl font-mono font-black w-full outline-none", theme === 'dark' ? "text-white" : "text-black")}
                                                />
                                                <span className="text-[9px] md:text-[10px] font-black text-gray-600 mb-0.5">KG</span>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "border p-2.5 md:p-3 rounded-xl md:rounded-2xl focus-within:border-brand-red/50 transition-all",
                                            theme === 'dark' ? "bg-black/40 border-white/5" : "bg-gray-100 border-gray-200"
                                        )}>
                                            <p className="text-[7px] md:text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1">
                                                {ex.target.toLowerCase().includes('reps') ? 'Reps' : 'Log'}
                                            </p>
                                            <div className="flex items-end gap-1">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={ex.sets?.[0]?.reps || ''}
                                                    onChange={(e) => {
                                                        const newBlocks = [...blocks];
                                                        if (!newBlocks[bIdx].exercises[eIdx].sets) {
                                                            newBlocks[bIdx].exercises[eIdx].sets = [];
                                                        }
                                                        if (newBlocks[bIdx].exercises[eIdx].sets.length === 0) {
                                                            newBlocks[bIdx].exercises[eIdx].sets.push({ order: 1, weight: 0, reps: 0, completed: false });
                                                        }
                                                        newBlocks[bIdx].exercises[eIdx].sets[0].reps = parseInt(e.target.value) || 0;
                                                        setBlocks(newBlocks);
                                                    }}
                                                    className={clsx("bg-transparent text-lg md:text-xl font-mono font-black w-full outline-none", theme === 'dark' ? "text-white" : "text-black")}
                                                />
                                                <span className="text-[9px] md:text-[10px] font-black text-gray-600 mb-0.5 uppercase">VAL</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Motivational Footer */}
            <div className="py-6 md:py-10 text-center">
                <p className="text-gray-600 text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em]">Sin excusas. Finaliza el protocolo para registrar puntos.</p>
            </div>

            {/* Sticky Timer Bar */}
            <div className={clsx(
                "fixed bottom-0 inset-x-0 z-[250] backdrop-blur-2xl border-t p-5 pb-8 md:p-8 animate-in slide-in-from-bottom duration-500 transition-transform duration-300",
                !showControls && "translate-y-full",
                theme === 'dark' ? "bg-black/90 border-white/10" : "bg-white/95 border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]"
            )}>
                <div className="max-w-xl mx-auto flex items-center justify-between gap-4 md:gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3 h-3 text-brand-red" />
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Tiempo Activo</span>
                        </div>
                        <div className={clsx(
                            "text-3xl md:text-4xl font-mono font-black transition-colors leading-none",
                            isPaused
                                ? "text-gray-400 opacity-40"
                                : (timerMode === 'down' ? "text-brand-red" : (theme === 'dark' ? "text-white" : "text-black"))
                        )}>
                            {formatTime(displayTime)}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={toggleTimer}
                            className={clsx(
                                "w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-[24px] flex items-center justify-center transition-all active:scale-90",
                                isPaused
                                    ? (theme === 'dark' ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg")
                                    : (theme === 'dark' ? "bg-white/10 text-white" : "bg-gray-100 text-gray-600")
                            )}
                        >
                            {countdown !== null ? (
                                <span className="text-xl md:text-2xl font-black text-brand-red">{countdown}</span>
                            ) : isPaused ? (
                                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                            ) : (
                                <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                            )}
                        </button>

                        <button
                            onClick={handleFinish}
                            disabled={isSaving}
                            className="bg-brand-red text-white px-6 md:px-8 h-14 md:h-16 rounded-[20px] md:rounded-[24px] font-black text-[10px] md:text-xs uppercase tracking-widest shadow-glow hover:bg-red-600 transition-all flex items-center justify-center gap-2 md:gap-3"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                                    <span>Finalizar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {prAchievements.length > 0 && (
                <PRCelebrationModal
                    achievements={prAchievements}
                    onClose={closeCelebration}
                    userName={userName}
                />
            )}
        </div>
    );
}

function VideoModal({ url, onClose }: { url: string, onClose: () => void }) {
    const { theme } = useTheme();
    // Extract video ID from youtube url (e.g. v=VIDEO_ID)
    let videoId = '';
    try {
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        }
    } catch (e) { console.error("Invalid URL", e) }

    if (!videoId) return null;

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

    return (
        <div className={clsx("fixed inset-0 z-[200] backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300", theme === 'dark' ? "bg-black/90" : "bg-white/80")}>
            <div className={clsx("w-full max-w-4xl aspect-video rounded-3xl overflow-hidden relative border shadow-2xl", theme === 'dark' ? "bg-black border-white/20" : "bg-gray-100 border-gray-200")}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-red-600 p-2 rounded-full text-white transition-colors backdrop-blur-md"
                >
                    <X className="w-6 h-6" />
                </button>
                <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    )
}

function FreeTrainingWizard({ onComplete }: { onComplete: (block: WorkoutBlock) => void }) {
    const { theme } = useTheme();
    const [step, setStep] = useState<'type' | 'config'>('type');
    const [type, setType] = useState<string>('fortime');
    const [duration, setDuration] = useState<number>(0);

    const types = [
        { id: 'fortime', label: 'For Time', desc: 'Completa la tarea lo más rápido posible.', icon: <Timer className={clsx("w-8 h-8", theme === 'dark' ? "text-white" : "text-black")} /> },
        { id: 'amrap', label: 'AMRAP', desc: 'As Many Rounds As Possible.', icon: <RefreshCw className={clsx("w-8 h-8", theme === 'dark' ? "text-white" : "text-black")} /> },
        { id: 'emom', label: 'EMOM', desc: 'Every Minute On the Minute.', icon: <Clock className={clsx("w-8 h-8", theme === 'dark' ? "text-white" : "text-black")} /> },
        { id: 'tabata', label: 'Tabata', desc: 'Intervalos de Alta Intensidad (20s/10s).', icon: <Zap className={clsx("w-8 h-8", theme === 'dark' ? "text-white" : "text-black")} /> },
        { id: 'other', label: 'Libre / Mix', desc: 'Añadir ejercicios sin temporizador o personalizados.', icon: <Plus className={clsx("w-8 h-8", theme === 'dark' ? "text-white" : "text-black")} /> },
    ];

    const handleTypeSelect = (t: string) => {
        setType(t);
        setStep('config');
    };

    const handleCreate = () => {
        const typeLabel = types.find(t => t.id === type)?.label || type.toUpperCase();
        const newBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            title: `BLOCK 1`,
            duration: duration,
            exercises: [],
            result: { rounds: 0, time: '' }
        };
        onComplete(newBlock);
    };

    if (step === 'type') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-500 px-4">
                <h2 className={clsx("text-3xl font-heading font-black italic uppercase mb-8 text-center", theme === 'dark' ? "text-white" : "text-black")}>
                    Tipo de <span className="text-brand-red">Entrenamiento</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mx-auto">
                    {types.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => handleTypeSelect(t.id)}
                            className={clsx(
                                "border p-6 rounded-[32px] text-left transition-all group relative overflow-hidden",
                                theme === 'dark' ? "bg-[#111] border-white/10 hover:border-brand-red/50 hover:bg-white/5" : "bg-white border-gray-100 hover:border-brand-red/30 shadow-sm"
                            )}
                        >
                            <div className={clsx("mb-4 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-brand-red/20 transition-colors", theme === 'dark' ? "bg-white/5" : "bg-gray-100")}>
                                {t.icon}
                            </div>
                            <h3 className={clsx("text-xl font-heading font-black italic uppercase mb-1", theme === 'dark' ? "text-white" : "text-black")}>{t.label}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide leading-relaxed">{t.desc}</p>
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-5 h-5 text-brand-red" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in slide-in-from-right duration-500 max-w-md mx-auto w-full">
            <div className="w-full flex justify-start mb-8">
                <button
                    onClick={() => setStep('type')}
                    className={clsx("flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors", theme === 'dark' ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-black")}
                >
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>
            </div>

            <h2 className={clsx("text-3xl font-heading font-black italic uppercase mb-2 text-center", theme === 'dark' ? "text-white" : "text-black")}>
                Configuración <span className="text-brand-red">{type.toUpperCase()}</span>
            </h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-12 text-center">
                {type === 'fortime' ? 'Introduce el Time Cap (Límite de Tiempo)' :
                    type === 'amrap' ? 'Duración total del AMRAP' :
                        type === 'emom' ? 'Duración total del EMOM' : 'Duración estimada'}
            </p>

            <div className={clsx("w-full border rounded-[40px] p-8 text-center mb-8 relative group", theme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-gray-100 shadow-xl")}>
                <input
                    type="number"
                    autoFocus
                    value={duration || ''}
                    onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={clsx("w-full bg-transparent text-6xl md:text-8xl font-mono font-black text-center outline-none", theme === 'dark' ? "text-white placeholder-white/10" : "text-black placeholder-gray-100")}
                />
                <span className="text-gray-500 font-black uppercase tracking-[0.2em] text-sm mt-4 block">Minutos</span>

                <div className="absolute inset-x-0 bottom-full mb-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {[5, 10, 15, 20, 30].map(m => (
                        <button key={m} onClick={() => setDuration(m)} className={clsx("px-3 py-1 rounded-full text-xs font-bold transition-colors", theme === 'dark' ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-black")}>{m}´</button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleCreate}
                disabled={(duration <= 0 && type !== 'fortime' && type !== 'other')}
                className="w-full py-5 bg-brand-red rounded-2xl text-white font-black uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-heading"
            >
                Comenzar a Crear <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
