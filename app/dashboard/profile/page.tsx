"use client";

import { useEffect, useState, useRef } from "react";
import { getUserProfile, deleteProfile } from "../training/actions";
import { getUpcomingTrial } from "../gyms/trial-booking-actions";

import { createClient } from "@/utils/supabase/client";
import { User, Camera, Save, Loader2, Mail, Hash, MapPin, Trophy, Dumbbell, Swords, Award, ExternalLink, TrendingUp, Building2, Smile, Edit2, Move, Check, X, Calendar, LayoutGrid, Settings, Trash2, Lock, AlertTriangle, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCombatStats } from "../community/duel-actions";
import { getUserOrganizations } from "../gyms/actions";
import UserMediaGallery from "../UserMediaGallery";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { useStories } from "../stories/StoryContext";
import StoryBar from "../stories/StoryBar";
import { createStory } from "../stories/actions";
import { Plus, Brain } from "lucide-react";
import { clsx } from "clsx";
import SkillTree from "./SkillTree";
import HealthHub from "./HealthHub";

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        username: "",
        bio: "",
        main_sport: "",
        gym_home: "",
        privacy_setting: "public",
        birth_date_public: true,
    });
    const [combatStats, setCombatStats] = useState<any>({ wins: 0, losses: 0, draws: 0, total: 0 });
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [hasOrgs, setHasOrgs] = useState(false);
    const [isRepositioning, setIsRepositioning] = useState(false);
    const [coverPosition, setCoverPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startPos, setStartPos] = useState(50);
    const [mobileTab, setMobileTab] = useState<'gallery' | 'stats' | 'workouts' | 'settings' | 'intel'>('gallery');

    // Featured RMs State
    const [featuredRms, setFeaturedRms] = useState<any[]>([]);
    const [newRm, setNewRm] = useState({ exercise: 'Snatch', weight: '', unit: 'kg' });

    // New state for upcoming trial reminder
    const [upcomingTrial, setUpcomingTrial] = useState<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputCoverRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        async function loadProfile() {
            const data = await getUserProfile();
            if (data) {
                setProfile(data);
                setFormData({
                    full_name: data.full_name || "",
                    username: data.username || "",
                    bio: data.bio || "",
                    main_sport: data.main_sport || "General",
                    gym_home: data.gym_home || "",
                    privacy_setting: data.privacy_setting || "public",
                    birth_date_public: data.birth_date_public !== false,
                });

                // Load Combat Stats
                const stats = await getCombatStats(data.id);
                setCombatStats(stats);

                // Load Upcoming Trial Request via Server Action (Bypassing RLS)
                try {
                    const trial = await getUpcomingTrial();
                    if (trial) {
                        setUpcomingTrial(trial);
                    }
                } catch (e) {
                    console.error("Error loading trial:", e);
                }

                // Load Workouts
                const { data: userWorkouts, error: workoutError } = await supabase
                    .from('workouts')
                    .select('*, workout_sets(*)')
                    .eq('user_id', data.id)
                    .order('start_time', { ascending: false });

                if (workoutError) console.error("Error fetching workouts:", workoutError);
                setWorkouts(userWorkouts || []);

                // Load Organizations to check for Management access
                const orgs = await getUserOrganizations();
                setHasOrgs(orgs && orgs.length > 0);

                if (data.cover_position !== undefined) {
                    setCoverPosition(Number(data.cover_position) || 50);
                }


                if (data.featured_rms) {
                    setFeaturedRms(data.featured_rms);
                }
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setFormData(prev => ({ ...prev, bio: prev.bio + emojiData.emoji }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;
            if (!user) return;

            // Check if username is being changed
            if (formData.username !== profile?.username) {
                // Validate username uniqueness
                const { data: existingUser, error: checkError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', formData.username)
                    .neq('id', user.id) // Exclude current user
                    .maybeSingle()

                if (checkError && checkError.code !== 'PGRST116') {
                    console.error("Username check error:", checkError);
                    alert("Error al verificar el nombre de usuario. Por favor intenta de nuevo.");
                    setSaving(false);
                    return;
                }

                if (existingUser) {
                    alert(`El nombre de usuario "${formData.username}" ya está en uso. Por favor elige otro.`);
                    setSaving(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    username: formData.username,
                    bio: formData.bio,
                    main_sport: formData.main_sport,
                    gym_home: formData.gym_home,
                    privacy_setting: formData.privacy_setting,
                    birth_date_public: formData.birth_date_public,

                    featured_rms: featuredRms,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) {
                // Check if it's a unique constraint violation on username
                if (error.code === '23505' && error.message.includes('username')) {
                    alert(`El nombre de usuario "${formData.username}" ya está en uso. Por favor elige otro.`);
                } else {
                    throw error;
                }
            } else {
                // Update local profile state
                setProfile((prev: any) => ({ ...prev, username: formData.username }));
                router.refresh();
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error updating profile. Check console.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = confirm("¿ESTÁS COMPLETAMENTE SEGURO? Esta acción es irreversible. Se borrarán todos tus entrenamientos, récords, fotos y actividad en Rival Fit.");

        if (!confirmed) return;

        const secondConfirmation = confirm("Última advertencia: Perderás todo tu progreso y trofeos. ¿Confirmar baja definitiva?");
        if (!secondConfirmation) return;

        setIsDeleting(true);
        try {
            const res = await deleteProfile();
            if (res.error) {
                alert(res.error);
            } else {
                router.push("/login");
            }
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("Error al procesar la solicitud");
        } finally {
            setIsDeleting(false);
        }
    };

    const processImage = (file: File, maxSize: number = 1200): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new (window as any).Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Error al procesar la imagen"));
                    }, 'image/jpeg', 0.85);
                };
                img.onerror = () => reject(new Error("Error al cargar la imagen"));
            };
            reader.onerror = () => reject(new Error("Error al leer el archivo"));
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const processedBlob = await processImage(file, 1000);
            const fileName = `${user.id}-${Date.now()}.jpg`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, processedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
            alert("Foto de perfil actualizada correctamente");
            router.refresh();
        } catch (error: any) {
            console.error("Error uploading image:", error);
            alert("Error al subir la imagen: " + (error.message || "Por favor intenta con una imagen más pequeña o en otro formato."));
        } finally {
            setUploading(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCover(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const processedBlob = await processImage(file, 1600); // Larger for cover
            const fileName = `cover_${user.id}-${Date.now()}.jpg`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, processedBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    cover_url: publicUrl,
                    cover_position: 50,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setProfile((prev: any) => ({ ...prev, cover_url: publicUrl }));
            setCoverPosition(50);
            alert("Foto de portada actualizada");
            router.refresh();
        } catch (error: any) {
            console.error("Error uploading cover:", error);
            alert("Error al subir la portada: " + (error.message || "Desconocido"));
        } finally {
            setUploadingCover(false);
        }
    };

    const handleRemoveCover = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar la foto de portada?")) return;

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ cover_url: null, cover_position: 50 })
                .eq('id', user.id);

            if (error) throw error;

            setProfile((prev: any) => ({ ...prev, cover_url: null }));
            setCoverPosition(50);
            router.refresh();
        } catch (error) {
            console.error("Error removing cover:", error);
            alert("Error al eliminar la portada");
        } finally {
            setSaving(false);
        }
    };

    const startRepositioning = () => {
        setIsRepositioning(true);
        setStartPos(coverPosition);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isRepositioning) return;
        setIsDragging(true);
        setStartY(e.clientY);
        setStartPos(coverPosition);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const deltaY = e.clientY - startY;
        const newPos = Math.max(0, Math.min(100, startPos - (deltaY / 2)));
        setCoverPosition(newPos);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const savePosition = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('profiles').update({ cover_position: coverPosition }).eq('id', user.id);
            setIsRepositioning(false);
        } catch (error) {
            console.error("Error saving position:", error);
        } finally {
            setSaving(false);
        }
    };

    const addRm = () => {
        if (!newRm.weight) return;
        setFeaturedRms([...featuredRms, { ...newRm, id: Date.now() }]);
        setNewRm({ ...newRm, weight: '' }); // Reset weight but keep exercise/unit for convenience
    };

    const removeRm = (id: number) => {
        setFeaturedRms(featuredRms.filter(rm => rm.id !== id));
    };

    const { userStories, openStory } = useStories();
    const storyInputRef = useRef<HTMLInputElement>(null);

    const hasActiveStory = userStories.some((us: any) => us.user.id === profile?.id);

    const handleAvatarClick = () => {
        if (hasActiveStory) {
            openStory(profile?.id);
        } else {
            // En la página de edición de perfil, si no hay historia activa,
            // priorizamos cambiar la foto de perfil al hacer clic en el avatar
            fileInputRef.current?.click();
        }
    };

    const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit file size to 50MB to avoid server action timeouts
        if (file.size > 50 * 1024 * 1024) {
            alert('El archivo es demasiado grande. El límite es 50MB.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('media', file);

            const res = await createStory(formData);
            if (res.error) {
                alert(`Error al subir la historia: ${res.error}`);
            } else {
                router.refresh();
                // We should also refresh stories if there's a context or local state
            }
        } catch (err) {
            console.error("Profile story upload failed:", err);
            alert('Hubo un error inesperado al subir la historia. Inténtalo de nuevo.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
            {/* Header / Banner */}
            <div className={`relative group rounded-[40px] overflow-hidden border border-white/5 shadow-2xl dark-section ${isRepositioning ? 'cursor-ns-resize' : ''}`}>
                <div
                    className="h-64 bg-gradient-to-r from-brand-red via-brand-red/80 to-brand-gray relative group/cover select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {profile?.cover_url ? (
                        <>
                            <Image
                                src={profile.cover_url}
                                alt="Cover"
                                fill
                                className="object-cover pointer-events-none"
                                style={{ objectPosition: `center ${coverPosition}%` }}
                            />
                            {/* Red transparent overlay */}
                            <div className="absolute inset-0 bg-brand-red/10 mix-blend-multiply"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 mix-blend-overlay"></div>
                    )}

                    {!isRepositioning ? (
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                            {profile?.cover_url && (
                                <button
                                    onClick={startRepositioning}
                                    className="bg-black/50 text-white p-2 rounded-xl opacity-0 group-hover/cover:opacity-100 transition-all hover:bg-brand-red backdrop-blur-sm flex items-center gap-2 text-[10px] font-bold uppercase"
                                >
                                    <Move className="w-4 h-4" /> Reposicionar
                                </button>
                            )}
                            <button
                                onClick={() => fileInputCoverRef.current?.click()}
                                className="bg-black/50 text-white p-2 rounded-xl opacity-0 group-hover/cover:opacity-100 transition-all hover:bg-brand-red backdrop-blur-sm"
                                disabled={uploadingCover}
                            >
                                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                            {profile?.cover_url && (
                                <button
                                    onClick={handleRemoveCover}
                                    className="bg-black/50 text-white p-2 rounded-xl opacity-0 group-hover/cover:opacity-100 transition-all hover:bg-brand-red backdrop-blur-sm"
                                    title="Eliminar Portada"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
                            <div className="bg-black/80 p-2 rounded-2xl flex gap-2 border border-white/10 shadow-2xl">
                                <button
                                    onClick={savePosition}
                                    className="bg-brand-red hover:bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Guardar
                                </button>
                                <button
                                    onClick={() => { setIsRepositioning(false); setCoverPosition(startPos); }}
                                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" /> Cancelar
                                </button>
                            </div>
                            <p className="absolute bottom-4 text-xs text-white font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">Arrastra para mover la foto</p>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputCoverRef}
                        onChange={handleCoverUpload}
                        accept="image/*"
                        className="hidden"
                    />

                    {/* Avatar and Profile Info INSIDE cover */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end gap-6 z-10">
                        <div className="relative group/avatar">
                            <div
                                onClick={handleAvatarClick}
                                className={clsx(
                                    "w-32 h-32 rounded-3xl border-4 bg-brand-gray overflow-hidden relative shadow-2xl transition-all cursor-pointer",
                                    hasActiveStory ? "border-brand-red shadow-glow" : "border-black group-hover/avatar:scale-[1.02]"
                                )}
                            >
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                        <User className="w-12 h-12 text-gray-600" />
                                    </div>
                                )}

                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    </div>
                                )}

                                {!hasActiveStory && (
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                                        <Plus className="w-8 h-8 text-white drop-shadow-lg" />
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 p-2.5 bg-brand-red text-white rounded-xl shadow-xl hover:bg-red-700 transition-all border-2 border-black z-20"
                                disabled={uploading}
                                title="Cambiar Foto de Perfil"
                            >
                                <Camera className="w-4 h-4" />
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />

                            <input
                                type="file"
                                ref={storyInputRef}
                                onChange={handleStoryUpload}
                                accept="image/*,video/*"
                                className="hidden"
                            />
                        </div>

                        <div className="pb-2 flex flex-col sm:flex-row sm:items-end justify-between flex-1 gap-4">
                            <div>
                                <h1 className="text-3xl font-heading font-black text-white keep-white italic uppercase tracking-tighter drop-shadow-lg">{profile?.full_name || 'Anonymous Athlete'}</h1>
                                <p className="text-brand-red font-black tracking-widest text-xs uppercase mt-1 drop-shadow-md keep-white">@{profile?.username || 'user'}</p>
                            </div>
                            <div className="flex gap-2 mb-2">
                                <Link
                                    href={`/dashboard/profile/${profile?.username}`}
                                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-white/10 backdrop-blur-md transition-all shadow-xl"
                                >
                                    Ver Perfil <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                </Link>
                                {hasOrgs && (
                                    <Link
                                        href="/dashboard/gyms"
                                        className="flex items-center gap-1.5 bg-brand-red hover:bg-red-700 text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl shadow-xl transition-all"
                                    >
                                        <Building2 className="w-2.5 h-2.5 md:w-3 md:h-3" /> Mis Centros
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* UPCOMING TRIAL BANNER */}
            {upcomingTrial && (
                <div className="bg-gradient-to-r from-brand-red/20 to-black border border-brand-red/50 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 fade-in duration-500">
                    <div className="relative z-10 flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-brand-red text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse">Clase de Prueba Confirmada</span>
                        </div>
                        <h3 className="text-2xl font-heading font-black italic text-white uppercase">{upcomingTrial.class?.name || 'Clase'}</h3>
                        <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="w-4 h-4 text-brand-red" />
                            <p className="font-bold text-sm tracking-wide">{upcomingTrial.organization?.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 max-w-md">Has reservado tu plaza. Por favor, llega 10 minutos antes para completar tu registro.</p>
                    </div>

                    <div className="relative z-10 flex flex-col items-center md:items-end gap-0 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-md shrink-0">
                        <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                            {new Date(upcomingTrial.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-brand-red font-bold uppercase tracking-widest text-xs">
                            {new Date(upcomingTrial.scheduled_date).toLocaleDateString("es-ES", { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>

                    {/* Background Icon */}
                    <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none rotate-12">
                        <Calendar size={180} />
                    </div>
                </div>
            )}

            {/* Mobile Tabs Navigation */}
            <div className="flex lg:hidden items-center justify-around border-b border-white/5 pb-0 mb-6">
                <button
                    onClick={() => setMobileTab('gallery')}
                    className={clsx(
                        "flex flex-col items-center gap-2 pb-3 px-4 transition-all relative",
                        mobileTab === 'gallery' ? "text-brand-red" : "text-gray-500 hover:text-gray-300"
                    )}
                >
                    <LayoutGrid className="w-6 h-6" />
                    {mobileTab === 'gallery' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-t-full" />}
                </button>
                <button
                    onClick={() => setMobileTab('stats')}
                    className={clsx(
                        "flex flex-col items-center gap-2 pb-3 px-4 transition-all relative",
                        mobileTab === 'stats' ? "text-brand-red" : "text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Trophy className="w-6 h-6" />
                    {mobileTab === 'stats' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-t-full" />}
                </button>
                <button
                    onClick={() => setMobileTab('workouts')}
                    className={clsx(
                        "flex flex-col items-center gap-2 pb-3 px-4 transition-all relative",
                        mobileTab === 'workouts' ? "text-brand-red" : "text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Dumbbell className="w-6 h-6" />
                    {mobileTab === 'workouts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-t-full" />}
                </button>
                <button
                    onClick={() => setMobileTab('intel')}
                    className={clsx(
                        "flex flex-col items-center gap-2 pb-3 px-4 transition-all relative",
                        mobileTab === 'intel' ? "text-brand-red" : "text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Brain className="w-6 h-6" />
                    {mobileTab === 'intel' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-t-full" />}
                </button>
                <button
                    onClick={() => setMobileTab('settings')}
                    className={clsx(
                        "flex flex-col items-center gap-2 pb-3 px-4 transition-all relative",
                        mobileTab === 'settings' ? "text-brand-red" : "text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Settings className="w-6 h-6" />
                    {mobileTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red rounded-t-full" />}
                </button>
            </div>

            <div className="pt-2 lg:pt-8 flex flex-col lg:grid lg:grid-cols-12 gap-8">
                {/* Left side: Stats & Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className={clsx(mobileTab !== 'gallery' && "hidden lg:block")}>
                        {profile?.id && <UserMediaGallery userId={profile.id} />}
                    </div>

                    <div className={clsx("space-y-6", mobileTab !== 'stats' && "hidden lg:block")}>
                        <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Estado de Nivel</h3>
                            <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 mb-4">
                                <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-foreground dark:text-white font-bold">{profile?.level || 'Principiante'}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Rango Actual</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                                <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center text-yellow-500">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-foreground dark:text-white font-bold">{profile?.xp_points?.toLocaleString() || 0} XP</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Experiencia Total</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Registro de Combate</h3>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-black/40 p-3 rounded-2xl text-center border border-white/5">
                                    <p className="text-white font-black italic">{combatStats.wins}</p>
                                    <p className="text-[8px] text-green-500 font-black uppercase mt-1">Victorias</p>
                                </div>
                                <div className="bg-black/40 p-3 rounded-2xl text-center border border-white/5">
                                    <p className="text-white font-black italic">{combatStats.losses}</p>
                                    <p className="text-[8px] text-brand-red font-black uppercase mt-1">Derrotas</p>
                                </div>
                                <div className="bg-black/40 p-3 rounded-2xl text-center border border-white/5">
                                    <p className="text-white font-black italic text-xs leading-none mt-1">{(combatStats.total > 0 ? (combatStats.wins / combatStats.total) * 100 : 0).toFixed(0)}%</p>
                                    <p className="text-[8px] text-gray-500 font-black uppercase mt-1">Tasa</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Progreso de Trofeos</h3>
                            <div className="flex flex-wrap gap-2">
                                <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20" title="Iron Beast">
                                    <Dumbbell className="w-5 h-5" />
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${combatStats.wins > 0 ? 'bg-brand-red/10 text-brand-red border-brand-red/20' : 'bg-white/5 text-gray-700 border-white/5 opacity-50'}`} title="Arena Gladiator">
                                    <Swords className="w-5 h-5" />
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20" title="Hardened Veteran">
                                    <Award className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Form y Workouts */}
                <div className={clsx("lg:col-span-8 space-y-8", mobileTab !== 'settings' && mobileTab !== 'workouts' && mobileTab !== 'intel' && "hidden lg:block")}>
                    {/* Intelligence Section */}
                    <div className={clsx("space-y-6", mobileTab !== 'intel' && "hidden lg:block")}>
                        <SkillTree stats={{
                            power: profile?.power_stat || 0,
                            endurance: profile?.endurance_stat || 0,
                            agility: profile?.agility_stat || 0,
                            consistency: profile?.consistency_stat || 0
                        }} />
                        <HealthHub />
                    </div>

                    {/* Settings Form */}
                    <div className={clsx("bg-brand-gray/30 border border-white/5 rounded-3xl p-3 md:p-8 backdrop-blur-xl", mobileTab !== 'settings' && "hidden lg:block")}>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Nombre Completo"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="ej. Alex Sterling"
                                    icon={<User className="w-4 h-4" />}
                                />
                                <FormInput
                                    label="Nombre de Usuario"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="alex_sterling"
                                    icon={<Hash className="w-4 h-4" />}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Biografía</label>
                                <div className="relative">
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Cuéntale a la comunidad sobre tu camino fitness..."
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-brand-red transition-all resize-none placeholder:text-gray-700"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="absolute right-3 bottom-3 text-gray-400 hover:text-yellow-400 transition-colors"
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>
                                    {showEmojiPicker && (
                                        <div className="absolute right-0 top-full mt-2 z-50">
                                            <EmojiPicker
                                                theme={Theme.DARK}
                                                onEmojiClick={onEmojiClick}
                                                width={300}
                                                height={400}
                                            />
                                            {/* Backdrop to close */}
                                            <div className="fixed inset-0 z-[-1]" onClick={() => setShowEmojiPicker(false)}></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Deporte Principal</label>
                                    <select
                                        name="main_sport"
                                        value={formData.main_sport}
                                        onChange={handleChange}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-brand-red transition-all appearance-none"
                                    >
                                        <option value="General">Fitness General</option>
                                        <option value="Cross Training">Cross Training</option>
                                        <option value="Powerlifting">Powerlifting</option>
                                        <option value="Bodybuilding">Culturismo</option>
                                        <option value="Running">Running</option>
                                        <option value="Calisthenics">Calistenia</option>
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="OCR">OCR</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>
                                <FormInput
                                    label="Gimnasio Principal"
                                    name="gym_home"
                                    value={formData.gym_home}
                                    onChange={handleChange}
                                    placeholder="Gimnasio RIVAL HQ"
                                    icon={<MapPin className="w-4 h-4" />}
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Privacidad y Seguridad</label>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-red/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Perfil Privado</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Solo seguidores ven tu actividad</p>
                                            </div>
                                        </div>
                                        <select
                                            name="privacy_setting"
                                            value={formData.privacy_setting}
                                            onChange={handleChange}
                                            className="bg-transparent text-xs font-black text-brand-red uppercase outline-none cursor-pointer"
                                        >
                                            <option value="public" className="bg-black">Público</option>
                                            <option value="private" className="bg-black">Privado</option>
                                        </select>
                                    </div>

                                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-red/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Mostrar Edad</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Visible en rankings y perfil</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, birth_date_public: !prev.birth_date_public }))}
                                            className={clsx(
                                                "w-12 h-6 rounded-full transition-all relative",
                                                formData.birth_date_public ? "bg-brand-red" : "bg-gray-800"
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                formData.birth_date_public ? "right-1" : "left-1"
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Sistema de Sonido</label>
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-red/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Sonido de Notificaciones</p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Pulsa para probar el tono de identidad Rival</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            import("@/app/utils/audio").then(m => m.playNotificationSound());
                                        }}
                                        className="px-4 py-2 bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-brand-red/20 transition-all shadow-glow-sm"
                                    >
                                        Probar Sonido
                                    </button>
                                </div>
                            </div>


                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Récords Personales Destacados</label>

                                <div className="space-y-3">
                                    {featuredRms.map((rm: any) => (
                                        <div key={rm.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red">
                                                    <Dumbbell className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{rm.exercise}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{rm.weight} {rm.unit}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeRm(rm.id)}
                                                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={newRm.exercise}
                                        onChange={(e) => setNewRm({ ...newRm, exercise: e.target.value })}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-brand-red/50 min-w-0"
                                    >
                                        <option value="Snatch">Snatch</option>
                                        <option value="Clean & Jerk">Clean & Jerk</option>
                                        <option value="Deadlift">Deadlift</option>
                                        <option value="Back Squat">Back Squat</option>
                                        <option value="Front Squat">Front Squat</option>
                                        <option value="Bench Press">Bench Press</option>
                                        <option value="Overhead Press">Overhead Press</option>
                                        <option value="Strict Press">Strict Press</option>
                                        <option value="Push Press">Push Press</option>
                                        <option value="Overhead Squat">Overhead Squat</option>
                                        <option value="Squat Clean">Squat Clean</option>
                                        <option value="Power Clean">Power Clean</option>
                                        <option value="Weighted Pull-up">Weighted Pull-up</option>
                                        <option value="Murph">Murph</option>
                                        <option value="Fran">Fran</option>
                                        <option value="Grace">Grace</option>
                                        <option value="Isabel">Isabel</option>
                                        <option value="5k Run">5k Run</option>
                                        <option value="Hyrox">Hyrox</option>
                                        <option value="Deka">Deka</option>
                                        <option value="21k Run">21k Run</option>
                                        <option value="42k Run">42k Run</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={newRm.weight}
                                        onChange={(e) => setNewRm({ ...newRm, weight: e.target.value })}
                                        className="w-16 md:w-20 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center text-xs font-bold outline-none focus:border-brand-red/50"
                                    />
                                    <select
                                        value={newRm.unit}
                                        onChange={(e) => setNewRm({ ...newRm, unit: e.target.value })}
                                        className="w-16 md:w-20 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold outline-none focus:border-brand-red/50"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="lb">lb</option>
                                        <option value="min">min</option>
                                        <option value="time">time</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={addRm}
                                        className="p-3 bg-white/10 hover:bg-brand-red text-white rounded-xl transition-colors shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>


                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-white text-black px-6 py-3 md:px-10 md:py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-red hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl disabled:opacity-50 disabled:transform-none text-xs md:text-base w-full md:w-auto justify-center"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Save className="w-4 h-4 md:w-5 md:h-5" />}
                                    <span className="uppercase tracking-wider">Guardar Cambios</span>
                                </button>
                            </div>
                        </form>

                        {/* Danger Zone */}
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.3em]">Zona de Peligro</h4>
                            </div>
                            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="text-center md:text-left">
                                    <p className="text-sm font-bold text-white mb-1">Dar de baja mi cuenta</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Esto eliminará permanentemente todos tus datos y actividad.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-500/20 transition-all disabled:opacity-50"
                                >
                                    {isDeleting ? "Procesando..." : "Eliminar Cuenta de Rival"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de entrenamientos */}
                    <div className={clsx("bg-brand-gray/30 border border-white/5 rounded-3xl p-3 md:p-8 backdrop-blur-xl", mobileTab !== 'workouts' && "hidden lg:block")}>
                        <h3 className="text-lg font-bold text-white mb-4">Tus Entrenamientos</h3>
                        {workouts.length === 0 ? (
                            <p className="text-gray-400">No has registrado entrenamientos aún.</p>
                        ) : (
                            <ul className="divide-y divide-border dark:divide-white/10">
                                {workouts.map((w) => {
                                    const maxWeight = w.workout_sets?.reduce((max: number, set: any) =>
                                        Math.max(max, set.weight_kg || 0), 0) || 0;

                                    return (
                                        <li key={w.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center text-brand-red border border-white/5">
                                                    <Dumbbell className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white uppercase italic">{w.title}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{new Date(w.start_time).toLocaleDateString()} • {Math.floor(w.duration_seconds / 60)} min</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-white font-heading font-black italic">{maxWeight} <span className="text-[10px] text-gray-500 uppercase font-sans">kg máx</span></p>
                                                    {w.is_pr && <p className="text-[8px] text-brand-red font-black uppercase tracking-tighter shadow-sm">Nuevo Récord</p>}
                                                </div>
                                                <Link
                                                    href={`/dashboard/training/session?editId=${w.id}`}
                                                    className="p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center justify-between py-1 border-b border-border dark:border-white/5 last:border-0 pb-3">
            <div className="flex items-center gap-3">
                <div className="text-brand-red opacity-60">{icon}</div>
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">{label}</span>
            </div>
            <span className="text-xs font-bold text-white">{value}</span>
        </div>
    );
}

function FormInput({ label, icon, ...props }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">{label}</label>
            <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600">
                    {icon}
                </div>
                <input
                    {...props}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 pl-8 text-white focus:outline-none focus:border-brand-red transition-all placeholder:text-gray-700"
                />
            </div>
        </div>
    );
}
