"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, UserCheck, MapPin, Globe, CheckCircle2, Grid, Dumbbell, ShoppingBag, X, CreditCard, Check, Lock, Calendar, ArrowRight, ArrowLeft, Trophy, ChevronRight, ChevronLeft, Clock, ChevronDown, Zap, Flame, TrendingUp, Info, Play, Banknote, Instagram, Youtube, Facebook, Hash, Navigation, Image as ImageIcon, Star, Users, Building2, List, LayoutGrid, Loader2 } from "lucide-react";
import { toggleFollow, requestTrial, purchaseProduct, getClassesForDate, getClassesRange, enrollInClass, unenrollFromClass, getClassAttendees, saveClassResult, getDayRankings, requestMemberPayment } from "../../dashboard/gyms/management-actions";
import { requestMemberLeave } from "../../dashboard/gyms/member-actions";
import { bookTrialClass } from "../../dashboard/gyms/trial-booking-actions";
import GymPostCard from "../../dashboard/gyms/GymPostCard";
import Link from "next/link";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../../ThemeContext";

// Update function signature (line 13)
export default function PublicCenterProfile({ org, initialPosts, isFollowing, followersCount, products, currentUserId, memberStatus, coaches, membershipPlans }: any) {
    // --- STATE ---

    // Theme
    const { theme } = useTheme();

    // General
    const [activeTab, setActiveTab] = useState('feed');
    const [following, setFollowing] = useState(isFollowing);
    const [count, setCount] = useState(followersCount || 0);
    const [loading, setLoading] = useState(false);

    // Store
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Trial
    const [showTrialModal, setShowTrialModal] = useState(false);
    const [trialStep, setTrialStep] = useState(1); // 1: Info, 2: Date, 3: Class
    const [trialDate, setTrialDate] = useState("");
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);

    // Result Logging State
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultClass, setResultClass] = useState<any>(null);
    const [resultBlocks, setResultBlocks] = useState<any[]>([]);
    const [resultNotes, setResultNotes] = useState('');
    const [resultDate, setResultDate] = useState('');
    const [shareToFeed, setShareToFeed] = useState(true);
    const [isSavingResult, setIsSavingResult] = useState(false);

    // Schedule Tab State
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleViewMode, setScheduleViewMode] = useState<'day' | 'week'>('day');
    const [scheduleClasses, setScheduleClasses] = useState<any[]>([]);
    const [weeklyClasses, setWeeklyClasses] = useState<Record<string, any[]>>({});
    const [bookingClassId, setBookingClassId] = useState<string | null>(null);
    const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);
    const [attendeesList, setAttendeesList] = useState<any[] | null>(null);
    const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Membership State
    const [selectedMembership, setSelectedMembership] = useState<any>(null);
    const [showMembershipModal, setShowMembershipModal] = useState(false);
    const [isProcessingMembership, setIsProcessingMembership] = useState(false);

    // Payment Status Params
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

    // Leave Request
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveReason, setLeaveReason] = useState("");
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const [leaveRequested, setLeaveRequested] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const status = params.get('status');
            if (status) {
                setPaymentStatus(status);
                // Clear status from URL after capturing it
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, []);


    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<any>(null);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    // Toast notification
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok }); setTimeout(() => setToast(null), 4000);
    }, []);

    // WOD Expansion State
    const [expandedWods, setExpandedWods] = useState<Set<string>>(new Set());
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

    // Exercise Media Lightbox State
    const [exerciseMedia, setExerciseMedia] = useState<{ url: string, type: 'video' | 'image' } | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExerciseMedia(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleWod = (id: string) => {
        const newSet = new Set(expandedWods);
        const newBlocksSet = new Set(expandedBlocks);

        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
            // Auto-expand all blocks and warmup when opening a WOD
            const post = initialPosts.find((p: any) => p.id === id);
            if (post) {
                try {
                    const data = JSON.parse(post.content);
                    newBlocksSet.add(`${id}-warmup`);
                    if (data.blocks) {
                        data.blocks.forEach((_: any, i: number) => {
                            newBlocksSet.add(`${id}-${i}`);
                        });
                    }
                } catch {
                    newBlocksSet.add(`${id}-0`);
                    newBlocksSet.add(`${id}-warmup`);
                }
            }
        }
        setExpandedWods(newSet);
        setExpandedBlocks(newBlocksSet);
    };

    const toggleBlock = (wodId: string, blockIdx: number) => {
        const key = `${wodId}-${blockIdx}`;
        const newSet = new Set(expandedBlocks);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setExpandedBlocks(newSet);
    };

    // Helper for WOD entry icons
    const getBlockIcon = (content: string, type: string) => {
        const text = content.toLowerCase();
        if (text.includes('run') || text.includes('carrera')) return <TrendingUp className="w-4 h-4" />;
        if (text.includes('squat') || text.includes('sentadilla')) return <Flame className="w-4 h-4" />;
        if (text.includes('press') || text.includes('snatch')) return <Zap className="w-4 h-4" />;
        return type === 'wod' ? <Dumbbell className="w-4 h-4" /> : <Info className="w-4 h-4" />;
    };

    // Load schedule when tab changes or date changes
    const loadSchedule = async (date: string) => {
        setLoading(true);
        if (scheduleViewMode === 'week') {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 6);
            const classesRange = await getClassesRange(org.id, start.toISOString(), end.toISOString());

            // Group by date
            const grouped: Record<string, any[]> = {};
            // @ts-ignore
            classesRange.forEach((cls: any) => {
                const date = cls.scheduled_time.split('T')[0];
                if (!grouped[date]) grouped[date] = [];
                grouped[date].push(cls);
            });

            setWeeklyClasses(grouped);
        } else {
            const classes = await getClassesForDate(org.id, date);
            setScheduleClasses(classes);
        }
        setLoading(false);
    }

    // Auto-load schedule when tab becomes active
    useEffect(() => {
        if (activeTab === 'schedule') {
            loadSchedule(scheduleDate);
        }
    }, [activeTab, scheduleDate, scheduleViewMode]);

    // Access Logic
    const isOwner = org.owner_id === currentUserId;
    const isMember = memberStatus?.status === 'active' || isOwner;
    const isTrial = memberStatus?.status === 'trial';
    const hasAccess = isMember; // STRICT: Trial users cannot see WODs or Feed content
    const canSubscribe = memberStatus?.status !== 'active';
    const isTrainer = org.center_type === 'personal_trainer';

    // ... (Handlers remain the same, ensure they use isMember or isTrial as needed)

    // --- HANDLERS ---


    async function handleFollow() {
        setLoading(true);
        setFollowing(!following);
        setCount(following ? count - 1 : count + 1);

        const res = await toggleFollow(org.id, following);
        if (res?.error) {
            setFollowing(following);
            setCount(count);
            showToast("Inicia sesión para seguir", false);
        }
        setLoading(false);
    }

    // Trial Flow
    const handleDateSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        setTrialDate(date);
        if (date) {
            const classes = await getClassesForDate(org.id, date);
            setAvailableClasses(classes);
            setTrialStep(3);
        }
    };

    const submitTrialRequest = async () => {
        if (!trialDate) return;
        setIsSubmittingTrial(true);
        const res = await requestTrial(org.id, trialDate, selectedClass || undefined);
        setIsSubmittingTrial(false);
        if (res.error) {
            showToast(res.error, false);
        } else {
            showToast("¡Solicitud enviada! El centro te contactará pronto.");
            setShowTrialModal(false); setTrialStep(1); setTrialDate(""); setSelectedClass(null);
        }
    };

    // Store Flow
    // Store Flow
    async function handlePurchase(method: 'card' | 'cash') {
        if (!selectedProduct) return;
        const msg = method === 'card'
            ? `¿Confirmar compra con TARJETA de ${selectedProduct.name} por €${selectedProduct.price}?`
            : `¿Confirmar pago en EFECTIVO de ${selectedProduct.name} por €${selectedProduct.price}? (Debes abonarlo en recepción)`;

        if (!confirm(msg)) return;

        setIsPurchasing(true);
        // Assuming purchaseProduct signature update is deployed
        const res = await purchaseProduct(org.id, selectedProduct.id, method);
        setIsPurchasing(false);

        if (res.error) {
            showToast(res.error, false);
        } else if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl as string;
        } else {
            showToast(method === 'card' ? "¡Compra exitosa!" : "¡Pedido registrado! Paga en recepción.");
            setSelectedProduct(null);
        }
    }

    // Booking Flow - Book Trial Class or Regular Class
    async function handleBook(classId: string, isEnrolled = false) {
        if (isEnrolled) {
            if (!confirm("¿Seguro que deseas cancelar tu reserva en esta clase?")) return;
            setBookingClassId(classId);
            const res = await unenrollFromClass(org.id, classId);
            setBookingClassId(null);
            if (res.error) {
                showToast(res.error, false);
            } else {
                showToast("¡Reserva cancelada con éxito!");
                loadSchedule(scheduleDate);
            }
            return;
        }

        setBookingClassId(classId);

        // Use trial booking for non-members, regular enrollment for members
        const res = (isMember || isTrial)
            ? await enrollInClass(org.id, classId)
            : await bookTrialClass(classId, org.id);

        setBookingClassId(null);

        if (res.error) {
            showToast(res.error, false);
        } else {
            showToast((res as any).message || (isMember ? "¡Reserva confirmada!" : "¡Clase de prueba reservada!"));
            loadSchedule(scheduleDate);
        }
    }

    async function handleViewAttendees(classId: string) {
        if (!isMember) return; // Only active members can see who is training
        setIsLoadingAttendees(true);
        const list = await getClassAttendees(classId);
        setAttendeesList(list);
        setIsLoadingAttendees(false);
    }

    // Membership Subscription Handler
    async function handleSubscribeMembership(plan: any) {
        if (!currentUserId) { showToast("Inicia sesión para suscribirte", false); return; }
        if (memberStatus?.status === 'active') { showToast("Ya eres miembro de este centro"); return; }

        setSelectedMembership(plan);
        setShowMembershipModal(true);
    }

    async function confirmMembershipSubscription() {
        if (!selectedMembership || !currentUserId) return;

        setIsProcessingMembership(true);
        const res = await requestMemberPayment(org.id, selectedMembership.id, currentUserId, {
            fullName: "",  // Will be fetched from user profile
            phone: "",
            birth_date: "",
            notes: ""
        });
        setIsProcessingMembership(false);

        if (res.error) {
            showToast(res.error, false);
        } else if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl as string;
        } else {
            showToast("¡Solicitud procesada! El centro te contactará pronto.");
            setShowMembershipModal(false); setSelectedMembership(null);
        }
    }


    // Result Logging Handlers
    // --- REFACKTOR: Result Logging Handlers (Sections & Exercises) ---

    // Constants for Rx Levels
    const RX_LEVELS = ['Avanzado', 'Intermedio', 'Escalado'];

    const handleOpenResultModal = (cls: any) => {
        setResultClass(cls);
        setResultNotes(cls.my_result?.notes || '');
        setResultDate(new Date(cls.scheduled_time).toISOString().split('T')[0]);
        setShareToFeed(true);

        // Initialize blocks based on existing result OR WOD content
        // MIGRATION STRATEGY: Treat existing flat blocks as single-exercise sections
        if (cls.my_result?.data && Array.isArray(cls.my_result.data)) {
            // Check if data is already in new format (has 'exercises' array)
            const isNewFormat = cls.my_result.data.some((b: any) => Array.isArray(b.exercises));

            if (isNewFormat) {
                setResultBlocks(cls.my_result.data);
            } else {
                // Migrate old flat blocks to sections
                const migrated = cls.my_result.data.map((b: any) => ({
                    title: b.title || 'Entrenamiento',
                    type: b.type,
                    exercises: [{
                        name: b.exercise || '',
                        value: b.value || '',
                        sets: b.sets || '',
                        reps: b.reps || '',
                        rx_level: b.rx === true ? 'Avanzado' : (b.rx === false ? 'Escalado' : 'Intermedio')
                    }]
                }));
                setResultBlocks(migrated);
            }
        } else if (cls.wod) {
            // Parse WOD content
            let wodData;
            try {
                wodData = JSON.parse(cls.wod.content);
            } catch {
                wodData = { blocks: [] };
            }

            const sections = (wodData.blocks || []).map((b: any) => ({
                title: b.title || b.type,
                type: b.type === 'strength' ? 'weight' : (b.format === 'amrap' ? 'rounds' : 'time'),
                exercises: (b.exercises && b.exercises.length > 0)
                    ? b.exercises.map((ex: any) => ({
                        name: ex.name || '',
                        value: '',
                        sets: ex.sets || '',
                        reps: ex.reps || '',
                    }))
                    : [{
                        name: b.exercise || '',
                        value: '',
                        sets: '',
                        reps: '',
                    }],
                rx_level: 'Intermedio' // Default
            }));
            if (sections.length === 0) {
                sections.push({
                    title: 'Entrenamiento',
                    type: 'time',
                    exercises: [{ name: '', value: '' }],
                    rx_level: 'Intermedio'
                });
            }
            setResultBlocks(sections);
        } else {
            // Fallback
            setResultBlocks([{
                title: 'Entrenamiento',
                type: 'time',
                exercises: [{ name: '', value: '' }],
                rx_level: 'Intermedio'
            }]);
        }

        setShowResultModal(true);
    };

    // UPDATE SECTION (Title/Type)
    const handleUpdateSection = (index: number, field: string, value: string) => {
        const newBlocks = [...resultBlocks];
        newBlocks[index][field] = value;
        setResultBlocks(newBlocks);
    };

    // UPDATE EXERCISE (Row data)
    const handleUpdateExercise = (sectionIndex: number, exerciseIndex: number, field: string, value: any) => {
        const newBlocks = [...resultBlocks];
        newBlocks[sectionIndex].exercises[exerciseIndex][field] = value;
        setResultBlocks(newBlocks);
    };

    const handleAddSection = (type: string, customTitle?: string) => {
        const title = customTitle || (type === 'weight' ? 'FUERZA' : type === 'rounds' ? 'AMRAP' : 'FOR TIME');
        setResultBlocks([...resultBlocks, {
            title,
            type,
            exercises: [{ name: '', value: '', sets: '', reps: '' }],
            rx_level: 'Intermedio',
            value: '', // Global value for Time/Rounds
            wod_weight: '' // NEW: Weight used in WOD
        }]);
    };

    const handleRemoveSection = (index: number) => {
        const newBlocks = [...resultBlocks];
        newBlocks.splice(index, 1);
        setResultBlocks(newBlocks);
    };

    const handleAddExercise = (sectionIndex: number) => {
        const newBlocks = [...resultBlocks];
        newBlocks[sectionIndex].exercises.push({ name: '', value: '', sets: '', reps: '', rx_level: 'Intermedio' });
        setResultBlocks(newBlocks);
    };

    const handleRemoveExercise = (sectionIndex: number, exerciseIndex: number) => {
        const newBlocks = [...resultBlocks];
        newBlocks[sectionIndex].exercises.splice(exerciseIndex, 1);
        // If no exercises left, remove section? Or keep empty? Let's keep empty or allow user to delete section manually.
        setResultBlocks(newBlocks);
    };

    const handleSaveResult = async () => {
        const hasValue = resultBlocks.some(section => {
            if (section.type === 'weight') {
                return section.exercises.some((ex: any) => ex.value);
            }
            return !!section.value;
        });

        if (!hasValue) {
            alert("⚠️ Por favor, ingresa al menos un resultado (Peso, Tiempo o Rondas) antes de guardar.");
            return;
        }

        setIsSavingResult(true);
        const res = await saveClassResult(resultClass.id, resultBlocks, resultNotes, shareToFeed, new Date(resultDate).toISOString());
        setIsSavingResult(false);

        if (res.error) {
            alert(`⚠️ Error al guardar: ${res.error}`);
        } else {
            alert("✅ ¡Resultado guardado con éxito! Se ha publicado en el muro de la comunidad.");
            setShowResultModal(false);
            loadSchedule(scheduleDate);
        }
    };

    // Leave Request Handler
    const handleRequestLeave = async () => {
        if (!memberStatus?.id) return;
        setIsSubmittingLeave(true);
        const res = await requestMemberLeave(org.id, memberStatus.id, leaveReason || undefined);
        setIsSubmittingLeave(false);
        if ((res as any).error) {
            showToast((res as any).error, false);
        } else {
            setLeaveRequested(true);
            setShowLeaveModal(false);
            showToast("Solicitud de baja enviada. El centro te informará.");
        }
    };

    // Leaderboard Handler
    const handleViewLeaderboard = async () => {
        if (!memberStatus?.status) return;
        setShowLeaderboard(true);
        setIsLoadingLeaderboard(true);
        const rankings = await getDayRankings(org.id, scheduleDate);
        setLeaderboardData(rankings);
        setIsLoadingLeaderboard(false);
    }

    // --- STYLES ---
    const bgMain = theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';
    const bgCard = theme === 'dark' ? 'bg-brand-gray border-white/5' : 'bg-white border-gray-200 shadow-sm';
    const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const textContrast = theme === 'dark' ? 'text-white' : 'text-gray-900';

    const DAYS_FULL = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    const DAYS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
        <div className={`min-h-screen font-sans pb-20 relative transition-colors duration-300 ${bgMain}`}>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm text-white max-w-xs text-center ${toast.ok ? 'bg-green-600' : 'bg-red-500'}`}>
                    {toast.ok ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                    {toast.msg}
                </div>
            )}

            {/* Back button */}
            <Link
                href={isOwner ? `/dashboard/gyms/${org.id}` : "/dashboard"}
                className={`fixed top-4 left-4 z-50 p-3 rounded-full shadow-xl transition-all group flex items-center gap-2 ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                title={isOwner ? "Ir al Panel de Control" : "Volver al Dashboard"}
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>


            {/* Header Image */}
            <div className="h-48 md:h-80 bg-gray-900 relative overflow-hidden group">
                {org.cover_photo_url ? (
                    <img
                        src={org.cover_photo_url}
                        alt="Cover"
                        className="w-full h-full object-cover transition-all duration-700"
                        style={{ objectPosition: `center ${org.cover_position || 50}%` }}
                    />
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
                        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20" />
                    </>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black/80' : 'from-gray-50/80'} via-transparent to-transparent`} />
            </div>

            {/* Payment Status Banners */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 relative z-50">
                {paymentStatus === 'success_payment' && (
                    <div className="bg-green-500 text-white p-4 rounded-2xl mb-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-black italic uppercase text-sm">¡Pago Completado!</p>
                                <p className="text-xs opacity-90 font-bold uppercase tracking-widest text-[10px]">Tu membresía se está procesando. Debería estar activa en unos segundos.</p>
                            </div>
                        </div>
                        <button onClick={() => setPaymentStatus(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {paymentStatus === 'canceled_payment' && (
                    <div className="bg-brand-red text-white p-4 rounded-2xl mb-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <X className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-black italic uppercase text-sm">Pago Cancelado</p>
                                <p className="text-xs opacity-90 font-bold uppercase tracking-widest text-[10px]">No se ha realizado ningún cargo. Inténtalo de nuevo cuando quieras.</p>
                            </div>
                        </div>
                        <button onClick={() => setPaymentStatus(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8 relative -mt-24 md:-mt-32">
                <div className="flex flex-col md:flex-row md:items-start md:gap-10 gap-6">
                    {/* --- Avatar --- */}
                    <div className={`w-32 h-32 md:w-52 md:h-52 rounded-[3rem] border-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 shrink-0 overflow-hidden group transition-all duration-700 hover:scale-[1.03] ${theme === 'dark' ? 'border-zinc-950 bg-zinc-900' : 'border-white bg-white'}`}>
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-6xl text-brand-red select-none">
                                {org.name[0]}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* --- Info Section --- */}
                    <div className="flex-1 pt-2 md:pt-32 w-full">
                        <div className="flex flex-col gap-5">
                            {/* Title & Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <h1 className={`text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none ${textContrast}`}>
                                        {org.name}
                                    </h1>
                                    {org.plan && org.plan !== 'free' && (
                                        <div className="bg-blue-500/10 p-1 rounded-full border border-blue-500/20">
                                            <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleFollow}
                                        disabled={loading}
                                        className={`h-9 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${following ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/10' : 'bg-gray-200 text-black') : 'bg-brand-red text-white hover:bg-red-600 shadow-red-900/20'}`}
                                    >
                                        {following ? <><UserCheck className="w-3.5 h-3.5" /> Siguiendo</> : <><UserPlus className="w-3.5 h-3.5" /> Seguir</>}
                                    </button>
                                    {(!hasAccess && !isTrial) && (
                                        <button
                                            onClick={() => setActiveTab('schedule')}
                                            className={`h-9 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg bg-white text-black hover:bg-gray-100 border border-gray-200`}
                                        >
                                            {isTrainer ? "Reservar" : "Prueba Gratis"}
                                        </button>
                                    )}
                                    {memberStatus?.id && !isOwner && (memberStatus?.status === 'active' || memberStatus?.status === 'trial') && (
                                        <button
                                            onClick={() => setShowLeaveModal(true)}
                                            disabled={leaveRequested}
                                            className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${leaveRequested ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' : 'border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5'}`}
                                        >
                                            {leaveRequested ? 'Baja Solicitada' : 'Solicitar Baja'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Stats & Metadata Row */}
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pb-3 border-b border-white/5">
                                <div className="flex gap-5 items-center">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`font-black text-lg italic ${textContrast}`}>{initialPosts.length}</span>
                                        <span className={`uppercase text-[8px] font-black tracking-[0.2em] ${textMuted}`}>Posts</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 text-center cursor-pointer hover:opacity-80 transition-opacity">
                                        <span className={`font-black text-lg italic ${textContrast}`}>{count}</span>
                                        <span className={`uppercase text-[8px] font-black tracking-[0.2em] ${textMuted}`}>Seguidores</span>
                                    </div>
                                </div>

                                <div className={`flex flex-wrap items-center gap-4 text-[9px] font-black uppercase tracking-widest ${textMuted}`}>
                                    {org.city && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-brand-red" /> {org.city}
                                        </span>
                                    )}
                                    {org.website && (
                                        <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                                            <Globe className="w-3 h-3" /> {(() => { try { return new URL(org.website.startsWith('http') ? org.website : `https://${org.website}`).hostname; } catch (e) { return org.website; } })()}
                                        </a>
                                    )}
                                    {org.instagram && (
                                        <a href={`https://instagram.com/${org.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-pink-400 transition-colors">
                                            <Instagram className="w-3 h-3" /> @{org.instagram.replace('@','')}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Bio - Compacted */}
                            <div className="max-w-2xl">
                                <p className={`text-sm md:text-[15px] leading-snug font-bold italic opacity-75 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {org.bio || org.description || (isTrainer ? "Entrenador dedicado a maximizar tu rendimiento." : "Centro de entrenamiento de élite.")}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                {/* Navigation Tabs */}
                <div className={`mt-8 md:mt-16 border-t mb-8 sticky top-0 backdrop-blur-md z-40 dark-section ${theme === 'dark' ? 'border-white/10 bg-black/95' : 'border-gray-200 bg-gray-50/95'}`}>
                    <div className="flex justify-around md:justify-center gap-4 md:gap-16 px-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'feed' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                        >
                            <Grid className="w-4 h-4" /> Feed
                        </button>
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'gallery' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                        >
                            <ImageIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> Instalaciones
                        </button>
                        {!isTrainer && (
                            <button
                                onClick={() => setActiveTab('wods')}
                                className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'wods' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                            >
                                <Dumbbell className="w-3.5 h-3.5 md:w-4 md:h-4" /> WODs
                            </button>
                        )}
                        {!isTrainer && (
                            <button
                                onClick={() => setActiveTab('store')}
                                className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'store' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                            >
                                <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" /> Tienda
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('memberships')}
                            className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'memberships' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                        >
                            <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4" /> Membresías
                        </button>
                        <button
                            onClick={() => setActiveTab('schedule')}
                            className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'schedule' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                        >
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" /> Horario
                        </button>
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex items-center gap-2 py-4 border-t-2 transition-all text-[10px] md:text-sm font-black uppercase tracking-widest flex-shrink-0 ${activeTab === 'info' ? 'border-brand-red ' + textContrast : 'border-transparent text-gray-500 hover:text-gray-400'}`}
                        >
                            <Info className="w-3.5 h-3.5 md:w-4 md:h-4" /> Info
                        </button>
                    </div>
                </div>

                {/* Content Sections */}
                {activeTab === 'feed' && (
                    <div className="space-y-6 max-w-3xl mx-auto">
                        {initialPosts.filter((p: any) => p.post_type === 'post' || p.post_type === 'wod').length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                                    <Grid className="w-7 h-7 text-white/20" />
                                </div>
                                <p className={`font-black text-sm uppercase tracking-widest ${textMuted}`}>Sin publicaciones todavía</p>
                            </div>
                        ) : initialPosts.filter((p: any) => p.post_type === 'post' || p.post_type === 'wod').map((post: any) => (
                            <GymPostCard key={post.id} post={post} centerId={org.id} isAdmin={false} currentUserId={currentUserId} isMember={hasAccess} />
                        ))}
                    </div>
                )}

                {/* ── INFO TAB ── */}
                {activeTab === 'info' && (
                    <div className="max-w-4xl mx-auto space-y-8">

                        {/* Map */}
                        {org.latitude && org.longitude && (
                            <div className={`rounded-2xl overflow-hidden border ${theme === 'dark' ? 'border-white/5' : 'border-gray-200'}`}>
                                <div className="h-64 relative">
                                    <iframe
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${org.longitude-0.01}%2C${org.latitude-0.008}%2C${org.longitude+0.01}%2C${org.latitude+0.008}&layer=mapnik&marker=${org.latitude}%2C${org.longitude}`}
                                        className="w-full h-full border-0" title="Mapa del centro" />
                                </div>
                                <div className={`flex items-center justify-between px-4 py-3 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-50'}`}>
                                    <div>
                                        <p className={`font-bold text-sm ${textContrast}`}>{org.address || 'Ver ubicación'}</p>
                                        {org.city && <p className={`text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>{org.city}{org.country && `, ${org.country}`}</p>}
                                    </div>
                                    <a href={`https://maps.google.com/?q=${org.latitude},${org.longitude}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 bg-brand-red text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-600 transition-all">
                                        <Navigation className="w-3.5 h-3.5" /> Google Maps
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Opening Hours */}
                            {org.opening_hours && Object.keys(org.opening_hours).length > 0 && (
                                <div className={`rounded-2xl border p-5 ${bgCard}`}>
                                    <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 flex items-center gap-2 ${textMuted}`}>
                                        <Clock className="w-3.5 h-3.5 text-brand-red" /> Horario de Apertura
                                    </h3>
                                    <div className="space-y-2">
                                        {DAYS_FULL.map((key, i) => {
                                            const h = org.opening_hours[key];
                                            if (!h) return null;
                                            const today = new Date().toLocaleDateString('en', { weekday: 'short' }).toLowerCase().slice(0,3);
                                            const isToday = key === today || (key === 'mie' && today === 'wed') || (key === 'sab' && today === 'sat') || (key === 'dom' && today === 'sun');
                                            return (
                                                <div key={key} className={`flex items-center justify-between py-1.5 border-b last:border-0 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'} ${isToday ? 'opacity-100' : 'opacity-60'}`}>
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isToday ? (theme === 'dark' ? 'text-white' : 'text-black') : textMuted}`}>
                                                        {DAYS_LABEL[i]} {isToday && '●'}
                                                    </span>
                                                    {h.closed
                                                        ? <span className="text-[11px] font-bold text-red-400">Cerrado</span>
                                                        : <span className={`text-[11px] font-bold ${textContrast}`}>{h.open} — {h.close}</span>
                                                    }
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Center Info */}
                            <div className={`rounded-2xl border p-5 ${bgCard}`}>
                                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 flex items-center gap-2 ${textMuted}`}>
                                    <Building2 className="w-3.5 h-3.5 text-brand-red" /> Información del Centro
                                </h3>
                                <div className="space-y-3">
                                    {org.founded_year && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${textMuted}`}>Fundado</span>
                                            <span className={`text-[11px] font-bold ${textContrast}`}>{org.founded_year}</span>
                                        </div>
                                    )}
                                    {org.capacity && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${textMuted}`}>Capacidad</span>
                                            <span className={`text-[11px] font-bold ${textContrast}`}>{org.capacity} personas</span>
                                        </div>
                                    )}
                                    {org.phone && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${textMuted}`}>Teléfono</span>
                                            <a href={`tel:${org.phone}`} className={`text-[11px] font-bold ${textContrast} hover:text-brand-red transition-colors`}>{org.phone}</a>
                                        </div>
                                    )}
                                    {org.email && (
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${textMuted}`}>Email</span>
                                            <a href={`mailto:${org.email}`} className={`text-[11px] font-bold ${textContrast} hover:text-brand-red transition-colors`}>{org.email}</a>
                                        </div>
                                    )}
                                    {/* Social links */}
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                        {org.instagram && <a href={`https://instagram.com/${org.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/5 hover:bg-pink-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"><Instagram className="w-3 h-3" /> Instagram</a>}
                                        {org.tiktok && <a href={`https://tiktok.com/${org.tiktok.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"><Hash className="w-3 h-3" /> TikTok</a>}
                                        {org.youtube && <a href={`https://youtube.com/@${org.youtube.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/5 hover:bg-red-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"><Youtube className="w-3 h-3" /> YouTube</a>}
                                        {org.facebook && <a href={`https://facebook.com/${org.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/5 hover:bg-blue-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"><Facebook className="w-3 h-3" /> Facebook</a>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Amenities */}
                        {org.amenities && Object.values(org.amenities).some(Boolean) && (
                            <div className={`rounded-2xl border p-5 ${bgCard}`}>
                                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 flex items-center gap-2 ${textMuted}`}>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" /> Instalaciones y Servicios
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {[
                                        { key: 'parking', label: 'Parking', icon: '🅿️' },
                                        { key: 'lockers', label: 'Taquillas', icon: '🔐' },
                                        { key: 'showers', label: 'Duchas', icon: '🚿' },
                                        { key: 'water', label: 'Agua Gratuita', icon: '💧' },
                                        { key: 'wifi', label: 'WiFi', icon: '📶' },
                                        { key: 'cafeteria', label: 'Cafetería', icon: '☕' },
                                        { key: 'ac', label: 'Aire Acond.', icon: '❄️' },
                                        { key: 'heating', label: 'Calefacción', icon: '🔥' },
                                        { key: 'music', label: 'Música', icon: '🎵' },
                                        { key: 'crossfit_box', label: 'Box CrossFit', icon: '🏋️' },
                                        { key: 'cardio', label: 'Cardio', icon: '🏃' },
                                        { key: 'free_weights', label: 'Pesas Libres', icon: '🏋️' },
                                        { key: 'sauna', label: 'Sauna', icon: '🧖' },
                                        { key: 'pool', label: 'Piscina', icon: '🏊' },
                                        { key: 'physio', label: 'Fisioterapia', icon: '🩺' },
                                        { key: 'nutrition', label: 'Nutrición', icon: '🥗' },
                                    ].filter(a => org.amenities[a.key]).map(a => (
                                        <div key={a.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${theme === 'dark' ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-200'}`}>
                                            <span className="text-lg">{a.icon}</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide leading-tight ${textContrast}`}>{a.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {activeTab === 'wods' && (
                    <div className="space-y-6 relative max-w-3xl mx-auto w-full">
                        {!isMember ? (
                            <div className="py-12 px-4 flex items-center justify-center min-h-[400px] w-full">
                                <div className={`${theme === 'dark' ? 'bg-[#121212] border-white/5 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} w-full max-w-md p-8 rounded-[2rem] border text-center relative overflow-hidden group`}>
                                    {/* Red accent glow */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />
                                    
                                    <div className="w-16 h-16 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-red/20 shadow-glow relative z-10">
                                        <Lock className="w-8 h-8 text-brand-red animate-pulse" />
                                    </div>
                                    <h3 className={`text-2xl font-heading font-black italic uppercase mb-2 relative z-10 ${textContrast}`}>Contenido Exclusivo</h3>
                                    <p className={`text-xs font-bold uppercase tracking-wide mb-6 max-w-xs mx-auto leading-relaxed relative z-10 ${textMuted}`}>
                                        Los entrenamientos (WODs) están reservados para los atletas afiliados a {org.name}.
                                    </p>
                                    <button
                                        onClick={() => setShowTrialModal(true)}
                                        className="w-full py-4 bg-brand-red text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-glow relative z-10"
                                    >
                                        Solicitar Prueba Gratis
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* WOD Content */}
                                {initialPosts.filter((p: any) => p.post_type === 'wod').map((wod: any, idx: number) => {
                                    const isOpen = expandedWods.has(wod.id);
                                    // Community Pulse (Simulated or based on logic)
                                    const intensity = (idx % 3) + 8; // 8-10 level
                                    const athleteCount = 20 + (idx * 5);

                                    return (
                                        <div key={wod.id} className={clsx(
                                            "border rounded-2xl sm:rounded-[1.5rem] overflow-hidden group relative transition-all duration-500",
                                            bgCard,
                                            !hasAccess ? 'bg-muted/10' : 'hover:border-white/20'
                                        )}>
                                            {!hasAccess && (
                                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-6 text-center">
                                                    <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center mb-4 shadow-glow border border-brand-red/20">
                                                        <Dumbbell className="w-8 h-8 text-brand-red" />
                                                    </div>
                                                    <h3 className="font-heading font-black italic uppercase text-lg text-white mb-2 tracking-tight">WOD Exclusivo</h3>
                                                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest max-w-[200px] mb-6">
                                                        Solo los atletas inscritos en {org.name} pueden ver los detalles de los entrenamientos.
                                                    </p>
                                                    <button
                                                        onClick={() => setActiveTab('memberships')}
                                                        className="px-6 py-3 bg-brand-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg flex items-center gap-2"
                                                    >
                                                        Ver Planes <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                            {/* WOD Header / Trigger */}
                                            <button
                                                onClick={() => toggleWod(wod.id)}
                                                className="w-full text-left p-4 sm:p-5 flex items-center justify-between group/btn relative overflow-hidden"
                                            >
                                                {/* Background Glow on Hover */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-brand-red/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />

                                                <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                                                    <div className={clsx(
                                                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500",
                                                        isOpen ? "bg-brand-red text-white shadow-lg shadow-red-900/40 rotate-6" : "bg-white/5 text-gray-400 group-hover/btn:bg-white/10"
                                                    )}>
                                                        <Dumbbell className="w-5 h-5 sm:w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-brand-red/10 text-brand-red text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-brand-red/20">Official WOD</span>
                                                            <div className="flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest">
                                                                <Flame className="w-2.5 h-2.5" /> Intensity: {intensity}/10
                                                            </div>
                                                        </div>
                                                        <h4 className={clsx(
                                                            "font-black italic uppercase text-lg sm:text-2xl tracking-tighter transition-colors",
                                                            isOpen ? "text-white" : "text-gray-300 group-hover/btn:text-white"
                                                        )}>
                                                            WOD {new Date(wod.scheduled_for || wod.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                        </h4>

                                                        {/* Community Pulse */}
                                                        {!isOpen && (
                                                            <p className="text-[10px] text-gray-500 font-bold mt-1 flex items-center gap-2">
                                                                <TrendingUp className="w-3 h-3 text-brand-red" /> {athleteCount} atletas ya entrenaron hoy
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                    isOpen ? "bg-brand-red text-white" : "bg-white/5 text-gray-600"
                                                )}>
                                                    <ChevronDown className={clsx("w-5 h-5 transition-transform duration-300", isOpen ? "rotate-180" : "")} />
                                                </div>
                                            </button>

                                            {/* WOD Content / Accordion Body */}
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[3000px] border-t border-white/5 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="p-4 sm:p-6 bg-gradient-to-b from-black/40 to-transparent space-y-4">
                                                    {(() => {
                                                        let wodData;
                                                        try {
                                                            wodData = JSON.parse(wod.content);
                                                        } catch {
                                                            wodData = { workout: wod.content };
                                                        }

                                                        return (
                                                            <>
                                                                {wodData.warmup && (
                                                                    <div className={`rounded-2xl border transition-all ${expandedBlocks.has(`${wod.id}-warmup`)
                                                                        ? (theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200')
                                                                        : (theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm')}`}>
                                                                        <button
                                                                            onClick={() => toggleBlock(wod.id, 'warmup' as any)}
                                                                            className="w-full flex items-center justify-between p-3"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] shrink-0"></span>
                                                                                <h5 className="text-white font-accent font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                                                                                    <Zap className="w-3.5 h-3.5 text-orange-500" /> Calentamiento
                                                                                </h5>
                                                                            </div>
                                                                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${expandedBlocks.has(`${wod.id}-warmup`) ? 'rotate-180 text-orange-500' : ''}`} />
                                                                        </button>

                                                                        <div className={`overflow-hidden transition-all duration-300 ${expandedBlocks.has(`${wod.id}-warmup`) ? 'max-h-[1000px] opacity-100 border-t border-white/5' : 'max-h-0 opacity-0'}`}>
                                                                            <div className="p-4">
                                                                                <div className={clsx(
                                                                                    "whitespace-pre-wrap font-accent font-semibold leading-relaxed text-sm sm:text-base selection:bg-brand-red/30 tracking-tight",
                                                                                    theme === 'dark' ? "text-foreground" : "text-black"
                                                                                )}>
                                                                                    {wodData.warmup}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Render Blocks as Cards (New Style + Collapsible) */}
                                                                {(wodData.blocks || []).map((block: any, idx: number) => {
                                                                    const isBlockOpen = expandedBlocks.has(`${wod.id}-${idx}`);

                                                                    // Parse content into lines if it's a string, or use exercises array if available
                                                                    const lines = (block.exercises && block.exercises.length > 0)
                                                                        ? block.exercises
                                                                        : (block.content || '').split('\n').filter((line: string) => line.trim().length > 0);

                                                                    const title = (block.title || (block.format && block.format !== 'free' ? block.format : (block.type === 'wod' ? 'Workout' : block.type))).toUpperCase();
                                                                    const value = block.duration || block.value || "";

                                                                    return (
                                                                        <div key={idx} className={clsx(
                                                                            "border rounded-[18px] md:rounded-[24px] p-0.5 relative overflow-hidden group/card shadow-2xl transition-all duration-300",
                                                                            theme === 'dark' ? "bg-[#121212] border-white/5" : "bg-white border-gray-100 shadow-md",
                                                                            isBlockOpen ? "ring-1 ring-brand-red/30" : ""
                                                                        )}>
                                                                            {/* Accent Background Glow */}
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />

                                                                            <div className="relative z-10">
                                                                                {/* Card Trigger Header */}
                                                                                <button
                                                                                    onClick={() => toggleBlock(wod.id, idx)}
                                                                                    className="w-full text-left p-3 md:p-5 block space-y-4 focus:outline-none"
                                                                                >
                                                                                    <div className="flex items-end justify-between gap-4">
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <h3 className={clsx(
                                                                                                "text-lg md:text-2xl font-heading font-black italic uppercase tracking-tighter leading-none truncate pr-2 flex items-center gap-2",
                                                                                                theme === 'dark' ? "text-white" : "text-gray-900"
                                                                                            )}>
                                                                                                {title}
                                                                                                <ChevronDown className={clsx(
                                                                                                    "w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 text-brand-red",
                                                                                                    isBlockOpen ? "rotate-180" : ""
                                                                                                )} />
                                                                                            </h3>
                                                                                        </div>
                                                                                        {value && (
                                                                                            <div className="text-right shrink-0">
                                                                                                <span className={clsx(
                                                                                                    "text-xl md:text-4xl font-heading font-black italic tracking-tighter leading-none",
                                                                                                    theme === 'dark' ? "text-brand-red" : "text-brand-red"
                                                                                                )}>
                                                                                                    {value}
                                                                                                </span>
                                                                                                {block.format && block.format !== 'free' && !value.includes(block.format) && (
                                                                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{block.format}</p>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Progress Bar Style Decoration */}
                                                                                    <div className="w-full h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                                        <div className="bg-brand-red h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: '60%' }}></div>
                                                                                    </div>
                                                                                </button>

                                                                                {/* Expandable Body */}
                                                                                <div className={clsx(
                                                                                    "overflow-hidden transition-all duration-500 px-3 md:px-5",
                                                                                    isBlockOpen ? "max-h-[1000px] opacity-100 pb-5" : "max-h-0 opacity-0 pb-0"
                                                                                )}>
                                                                                    {/* Exercises List */}
                                                                                    {lines.length > 0 && (
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                                                                            {lines.map((lineItem: any, i: number) => {
                                                                                                let text;
                                                                                                if (typeof lineItem === 'string') {
                                                                                                    text = lineItem;
                                                                                                } else {
                                                                                                    const prefix = [lineItem.sets, lineItem.reps].filter(Boolean).join('x');
                                                                                                    const suffix = lineItem.value ? `@ ${lineItem.value}` : '';
                                                                                                    text = `${prefix ? prefix + ' ' : ''}${lineItem.name} ${suffix}`.trim();
                                                                                                }
                                                                                                const mediaUrl = typeof lineItem === 'object' ? lineItem.media_url : null;
                                                                                                const isClickable = !!mediaUrl;

                                                                                                return (
                                                                                                    <div
                                                                                                        key={i}
                                                                                                        onClick={(e) => {
                                                                                                            if (isClickable) {
                                                                                                                e.stopPropagation();
                                                                                                                setExerciseMedia({
                                                                                                                    url: mediaUrl,
                                                                                                                    type: mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
                                                                                                                });
                                                                                                            }
                                                                                                        }}
                                                                                                        className={clsx(
                                                                                                            "px-3 py-2 rounded-xl border flex items-center justify-between group/ex",
                                                                                                            theme === 'dark' ? "bg-white/5 border-white/5 text-gray-200" : "bg-gray-50 border-gray-100 text-gray-800",
                                                                                                            isClickable ? "cursor-pointer hover:border-brand-red/50 hover:bg-white/10" : ""
                                                                                                        )}
                                                                                                    >
                                                                                                        <p className="text-xs md:text-sm font-black uppercase tracking-wide truncate w-full">
                                                                                                            {text}
                                                                                                        </p>
                                                                                                        {isClickable && (
                                                                                                            <div className="bg-brand-red/10 p-1.5 rounded-lg text-brand-red opacity-0 group-hover/ex:opacity-100 transition-opacity">
                                                                                                                <Play className="w-3 h-3 fill-current" />
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Block Media */}
                                                                                    {block.media_urls && block.media_urls.length > 0 && (
                                                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                                                                                            {block.media_urls.map((url: string, i: number) => (
                                                                                                <div key={i} className={`rounded-xl overflow-hidden border ${theme === 'dark' ? 'border-white/5 bg-black' : 'border-gray-200 bg-gray-100'} aspect-video relative group`}>
                                                                                                    {url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                                                                        <video src={url} className="w-full h-full object-cover" controls />
                                                                                                    ) : (
                                                                                                        <img src={url} alt="Block Media" className="w-full h-full object-cover" />
                                                                                                    )}
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}

                                                                {/* Log this WOD Button */}
                                                                <div className="pt-6 border-t border-white/5">
                                                                    <Link
                                                                        href={`/dashboard/training/session?wodId=${wod.id}`}
                                                                        className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-xl group"
                                                                    >
                                                                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Log This Session
                                                                    </Link>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'store' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {products.map((product: any) => (
                            <div
                                key={product.id}
                                onClick={() => setSelectedProduct(product)}
                                className={`${bgCard} border rounded-3xl p-4 group hover:border-brand-red/50 transition-all flex flex-col cursor-pointer`}
                            >
                                <div className={`aspect-square ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-200'} rounded-2xl mb-4 overflow-hidden relative border`}>
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center ${textMuted}`}><ShoppingBag className="w-12 h-12 dashed" /></div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-brand-red text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg">
                                        €{product.price}
                                    </div>
                                    {product.stock_quantity === 0 && (
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-black uppercase text-xs tracking-widest">Agotado</div>
                                    )}
                                </div>
                                <h4 className={`font-bold text-sm mb-1 truncate ${textContrast}`}>{product.name}</h4>
                                <p className={`text-[10px] uppercase font-black tracking-widest mb-3 ${textMuted}`}>{product.category}</p>
                                <button className={`mt-auto w-full py-3 ${theme === 'dark' ? 'bg-white/5 hover:bg-white hover:text-black text-white' : 'bg-black/5 hover:bg-black hover:text-white text-black'} rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-transparent`}>Ver Detalles</button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'memberships' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-8">
                            <h2 className={`text-3xl font-black italic uppercase mb-2 ${textContrast}`}>Planes de Membresía</h2>
                            <p className={`text-sm ${textMuted}`}>Elige el plan que mejor se adapte a tus necesidades y comienza tu journey de fitness</p>
                        </div>

                        {membershipPlans && membershipPlans.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {membershipPlans.filter((plan: any) => plan.is_active).map((plan: any) => (
                                    <div key={plan.id} className={`${bgCard} border rounded-3xl p-6 flex flex-col justify-between hover:border-brand-red/30 transition-all group overflow-hidden relative shadow-xl`}>
                                        {/* Glow Effect */}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-brand-red/10 rounded-2xl text-brand-red">
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{plan.name}</h3>
                                            <p className="text-xs text-gray-500 mb-4 line-clamp-2">{plan.description || "Plan de membresía para el centro."}</p>

                                            <div className="flex items-baseline gap-1 mb-6">
                                                <span className="text-3xl font-black text-white italic">{plan.price}€</span>
                                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">/ {plan.duration_months === 1 ? "mes" : `${plan.duration_months} meses`}</span>
                                            </div>

                                            <div className="space-y-2 mb-6 border-t border-white/5 pt-4">
                                                {plan.features?.length > 0 ? (
                                                    plan.features.map((feature: string, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-300">
                                                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                                                            <span>{feature}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-gray-600 italic">Acceso estándar al centro.</p>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSubscribeMembership(plan)}
                                            disabled={!canSubscribe || !currentUserId}
                                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${!canSubscribe
                                                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                                : !currentUserId
                                                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                                    : 'bg-brand-red text-white hover:bg-red-600 hover:scale-105'
                                                }`}
                                        >
                                            {!canSubscribe ? 'Ya eres miembro' : !currentUserId ? 'Inicia sesión' : 'Suscribirme'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`col-span-full py-20 rounded-3xl border border-dashed ${theme === 'dark' ? 'bg-brand-gray/20 border-white/10' : 'bg-gray-50 border-gray-200'} flex flex-col items-center justify-center text-center px-10`}>
                                <div className={`p-4 rounded-full mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                                    <CreditCard className={`w-8 h-8 ${textMuted}`} />
                                </div>
                                <h4 className={`text-lg font-bold uppercase italic mb-2 ${textContrast}`}>No hay planes disponibles</h4>
                                <p className={`text-xs max-w-sm uppercase tracking-widest font-medium ${textMuted}`}>Este centro aún no ha configurado planes de membresía.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
                        {/* Header with View Toggle and Date Selection */}
                        <div className="flex flex-col gap-4 bg-brand-gray/20 p-4 md:p-6 rounded-3xl border border-white/5 shadow-xl">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className={`p-2 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                                        <Calendar className="w-5 h-5 text-brand-red" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                            {scheduleViewMode === 'day' ? 'Fecha Seleccionada' : 'Desde el día'}
                                        </span>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            className={`bg-transparent ${textContrast} font-black outline-none uppercase tracking-widest text-xs sm:text-sm cursor-pointer w-full`}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    {/* View Toggle */}
                                    <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                                        <button
                                            onClick={() => setScheduleViewMode('day')}
                                            className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${scheduleViewMode === 'day' ? 'bg-brand-red text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <List className="w-3.5 h-3.5 sm:w-4 h-4" /> Día
                                        </button>
                                        <button
                                            onClick={() => setScheduleViewMode('week')}
                                            className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${scheduleViewMode === 'week' ? 'bg-brand-red text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 h-4" /> Semana
                                        </button>
                                    </div>

                                    {memberStatus?.status === 'active' && (
                                        <button
                                            onClick={handleViewLeaderboard}
                                            className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all group"
                                        >
                                            <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Quick Day Selector for Day View */}
                            {scheduleViewMode === 'day' && (
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {Array.from({ length: 7 }).map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + i);
                                        const active = d.toISOString().split('T')[0] === scheduleDate;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setScheduleDate(d.toISOString().split('T')[0])}
                                                className={`flex-shrink-0 w-12 sm:w-14 h-16 sm:h-20 rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all border ${active
                                                    ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-red-900/40 transform scale-105'
                                                    : (theme === 'dark' ? 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400')}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {isMounted ? d.toLocaleDateString('es-ES', { weekday: 'short' }) : '...'}
                                                </span>
                                                <span className="text-xl font-black italic">{d.getDate()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin" />
                                <p className={`text-xs font-black uppercase tracking-[0.2em] ${textMuted}`}>Cargando Horarios...</p>
                            </div>
                        ) : scheduleViewMode === 'day' ? (
                            /* DAY VIEW */
                            <div className="space-y-4">
                                {scheduleClasses.length === 0 ? (
                                    <div className={`text-center py-20 rounded-3xl border border-dashed ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                                        <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                        <p className={`text-sm font-medium ${textMuted}`}>No hay clases programadas para hoy.</p>
                                    </div>
                                ) : (
                                    scheduleClasses.map((cls: any) => (
                                        <div key={cls.id} className={`${bgCard} p-4 md:p-6 rounded-[2rem] md:rounded-3xl border flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group hover:border-brand-red/30 transition-all shadow-xl`}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="bg-brand-red/10 text-brand-red text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        {isMounted ? new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                    </div>
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{cls.duration_minutes} min</span>
                                                </div>
                                                <h4 className={`text-xl md:text-2xl font-black italic uppercase tracking-tighter ${textContrast}`}>{cls.name}</h4>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <div className={`w-6 h-6 rounded-full overflow-hidden border ${theme === 'dark' ? 'border-white/10 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
                                                        {cls.coach?.avatar_url ? <img src={cls.coach.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white bg-brand-red">C</div>}
                                                    </div>
                                                    <p className={`text-[11px] font-black uppercase tracking-widest ${textContrast} opacity-80`}>Coach {cls.coach?.full_name}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 md:gap-6 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                                                <div className="text-center shrink-0">
                                                    <span className={`block font-black text-xl md:text-2xl italic ${cls.enrolled_count >= cls.max_capacity ? 'text-red-500' : 'text-green-500'}`}>
                                                        {cls.enrolled_count}/{cls.max_capacity}
                                                    </span>
                                                    <span className="text-[8px] uppercase font-black tracking-widest text-gray-500">Plazas</span>
                                                </div>

                                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                                    {/* Enroll Button */}
                                                    <button
                                                        onClick={() => handleBook(cls.id, cls.is_enrolled)}
                                                        onMouseEnter={() => setHoveredClassId(cls.id)}
                                                        onMouseLeave={() => setHoveredClassId(null)}
                                                        disabled={bookingClassId === cls.id || (cls.enrolled_count >= cls.max_capacity && !cls.is_enrolled)}
                                                        className={`w-full sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${cls.is_enrolled
                                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30'
                                                            : cls.enrolled_count >= cls.max_capacity
                                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                                                                : isMember
                                                                    ? 'bg-brand-red text-white hover:bg-red-600 shadow-xl'
                                                                    : 'bg-white text-black hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {bookingClassId === cls.id ? '...' :
                                                            cls.is_enrolled
                                                                ? (hoveredClassId === cls.id ? 'Cancelar Reserva' : 'Inscrito ✓')
                                                                : cls.enrolled_count >= cls.max_capacity ? 'Completo' :
                                                                    isMember ? 'Reservar Plaza' : (isTrainer ? 'Agendar' : 'Prueba Gratis')}
                                                    </button>

                                                    {/* Result/Attendees Actions */}
                                                    <div className="flex justify-between items-center px-1">
                                                        {isMember && (
                                                            <button
                                                                onClick={() => handleViewAttendees(cls.id)}
                                                                className="text-[9px] uppercase font-black tracking-widest text-gray-500 hover:text-brand-red transition-colors"
                                                            >
                                                                Ver Asistentes
                                                            </button>
                                                        )}

                                                        {isMember && cls.is_enrolled && (new Date() >= new Date(cls.scheduled_time) || cls.my_result) && (
                                                            <button
                                                                onClick={() => handleOpenResultModal(cls)}
                                                                className="text-[9px] uppercase font-black tracking-widest text-brand-red hover:underline"
                                                            >
                                                                {cls.my_result ? 'Mi Resultado' : 'Log WOD'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* WEEK VIEW - Grouped List */
                            <div className="space-y-12">
                                {Object.entries(weeklyClasses).map(([date, classes]) => {
                                    const d = new Date(date + 'T12:00:00'); // Use noon to avoid timezone shift
                                    return (
                                        <div key={date} className="relative">
                                            {/* Day Header */}
                                            <div className="sticky top-[100px] z-30 mb-6 flex items-center gap-4">
                                                <div className="bg-brand-red text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-red-900/30">
                                                    <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{isMounted ? d.toLocaleDateString('es-ES', { weekday: 'short' }) : '...'}</span>
                                                    <span className="text-xl font-black italic">{d.getDate()}</span>
                                                </div>
                                                <div className="flex-1 h-px bg-white/10" />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${textMuted}`}>
                                                    {isMounted ? d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '...'}
                                                </span>
                                            </div>

                                            {/* Day Classes */}
                                            <div className="space-y-4 pl-4 border-l-2 border-white/5 ml-7">
                                                {classes.length === 0 ? (
                                                    <p className={`text-xs italic ${textMuted} py-4`}>No hay clases programadas.</p>
                                                ) : (
                                                    classes.map((cls: any) => (
                                                        <div key={cls.id} className={`${bgCard} p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center gap-4 group hover:border-brand-red/30 transition-all`}>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <span className="text-brand-red text-[11px] font-black tracking-widest">
                                                                        {isMounted ? new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                                    </span>
                                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{cls.duration_minutes} MIN</span>
                                                                </div>
                                                                <h5 className={`text-lg font-black italic uppercase ${textContrast}`}>{cls.name}</h5>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${textContrast} opacity-80`}>Coach {cls.coach?.full_name}</p>
                                                            </div>

                                                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                                                                <div className="text-right">
                                                                    <span className={`block font-black text-sm ${cls.enrolled_count >= cls.max_capacity ? 'text-red-500' : 'text-green-500'}`}>
                                                                        {cls.enrolled_count}/{cls.max_capacity}
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setScheduleDate(date);
                                                                        setScheduleViewMode('day');
                                                                    }}
                                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all ${textContrast}`}
                                                                >
                                                                    Detalles
                                                                </button>

                                                                <button
                                                                    onClick={() => handleBook(cls.id, cls.is_enrolled)}
                                                                    onMouseEnter={() => setHoveredClassId(cls.id)}
                                                                    onMouseLeave={() => setHoveredClassId(null)}
                                                                    disabled={bookingClassId === cls.id || (cls.enrolled_count >= cls.max_capacity && !cls.is_enrolled)}
                                                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cls.is_enrolled
                                                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30'
                                                                        : 'bg-brand-red text-white hover:bg-red-600'
                                                                        }`}
                                                                >
                                                                    {cls.is_enrolled
                                                                        ? (hoveredClassId === cls.id ? 'Cancelar' : '✓')
                                                                        : 'Book'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── GALLERY TAB ── */}
                {activeTab === 'gallery' && (
                    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="text-center space-y-4">
                            <h2 className={`text-3xl md:text-5xl font-black italic uppercase tracking-tighter ${textContrast}`}>Nuestras Instalaciones</h2>
                            <p className={`text-sm md:text-base font-bold uppercase tracking-[0.2em] ${textMuted}`}>Equipamiento de Élite para Atletas que No Se Detienen</p>
                            <div className="w-20 h-1 bg-brand-red mx-auto rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                        </div>

                        {org.gallery_urls && org.gallery_urls.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {org.gallery_urls.map((url: string, i: number) => (
                                    <div 
                                        key={url} 
                                        onClick={() => setExerciseMedia({ url, type: 'image' })}
                                        className={clsx(
                                            "group relative rounded-[3rem] overflow-hidden cursor-pointer shadow-2xl transition-all duration-700 hover:scale-[1.02] border-[10px]",
                                            theme === 'dark' ? "border-zinc-900 bg-zinc-900" : "border-white bg-gray-100"
                                        )}
                                    >
                                        <div className="aspect-[16/11] overflow-hidden">
                                            <img 
                                                src={url} 
                                                alt={`Instalación ${i + 1}`} 
                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                            />
                                        </div>
                                        {/* Premium Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8 opacity-90 group-hover:opacity-100 transition-opacity">
                                            <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                <p className="text-white font-black italic uppercase text-2xl tracking-tighter">Área de Élite {i + 1}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="w-8 h-[2px] bg-brand-red rounded-full" />
                                                    <p className="text-white/70 font-bold uppercase tracking-[0.2em] text-[10px]">High Performance</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                                            <ImageIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center mx-auto border border-dashed border-white/10">
                                    <ImageIcon className="w-10 h-10 text-white/20" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className={`text-xl font-black italic uppercase ${textContrast}`}>Sin fotos todavía</h3>
                                    <p className={`text-sm uppercase tracking-widest font-bold ${textMuted}`}>Este centro aún no ha subido fotos de sus instalaciones.</p>
                                </div>
                            </div>
                        )}

                        {/* Stats/Highlights section */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10">
                            {[
                                { label: 'ZONA CROSS', icon: <TrendingUp className="w-6 h-6" />, color: 'from-blue-600 to-blue-400' },
                                { label: 'FREE WEIGHTS', icon: <Dumbbell className="w-6 h-6" />, color: 'from-brand-red to-red-400' },
                                { label: 'CAFÉ & SOCIAL', icon: <ShoppingBag className="w-6 h-6" />, color: 'from-orange-600 to-orange-400' },
                                { label: 'WELLNESS', icon: <Flame className="w-6 h-6" />, color: 'from-green-600 to-green-400' }
                            ].map((item, i) => (
                                <div key={i} className={clsx(
                                    "p-8 rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-2 group/card relative overflow-hidden",
                                    theme === 'dark' ? "bg-zinc-900/50 border-white/5 hover:border-brand-red/30" : "bg-white border-gray-100 shadow-xl"
                                )}>
                                    <div className={clsx(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-2xl bg-gradient-to-br transition-transform duration-500 group-hover/card:scale-110 rotate-3 group-hover/card:rotate-0",
                                        item.color
                                    )}>
                                        {item.icon}
                                    </div>
                                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${textContrast}`}>{item.label}</p>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${textMuted}`}>Top Quality</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty States */}
                {initialPosts.length === 0 && activeTab !== 'store' && (
                    <div className="py-32 text-center">
                        <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'} rounded-full flex items-center justify-center mx-auto mb-4 border`}>
                            <Grid className="w-6 h-6 text-gray-500" />
                        </div>
                        <h3 className={`font-bold text-lg mb-1 ${textContrast}`}>Sin Publicaciones</h3>
                        <p className={`text-sm ${textMuted}`}>Cuando {org.name} publique, aparecerá aquí.</p>
                    </div>
                )}

                {/* --- MODALS --- */}

                {/* Leave Request Modal */}
                {showLeaveModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className={`${theme === 'dark' ? 'bg-[#111] border-white/10 text-white' : 'bg-white border-gray-200 text-black'} border rounded-3xl w-full max-w-md p-6 relative shadow-2xl`}>
                            <button onClick={() => setShowLeaveModal(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
                                    <ArrowLeft className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-xl font-black italic uppercase tracking-tight mb-1">Solicitar Baja</h3>
                                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                    Tu solicitud será enviada a <strong>{org.name}</strong>. Ellos la revisarán y te notificarán con la decisión. Hasta que sea aprobada, tu membresía permanece activa.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Motivo (opcional)</label>
                                    <textarea
                                        value={leaveReason}
                                        onChange={(e) => setLeaveReason(e.target.value)}
                                        placeholder="Cuéntanos el motivo de tu baja..."
                                        rows={3}
                                        className={`w-full rounded-2xl p-4 text-sm resize-none border outline-none focus:border-red-400/50 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleRequestLeave}
                                        disabled={isSubmittingLeave}
                                        className="flex-[2] py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Solicitud de Baja'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Trial Modal */}
                {showTrialModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className={`${theme === 'dark' ? 'bg-[#111] border-white/10 text-white' : 'bg-white border-gray-200 text-black'} border rounded-3xl w-full max-w-lg p-6 relative shadow-2xl`}>
                            <button
                                onClick={() => { setShowTrialModal(false); setTrialStep(1); }}
                                className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-xl font-black italic uppercase mb-1">Prueba Gratis en {org.name}</h3>
                            <p className={`${textMuted} text-sm mb-6`}>Entrena con nosotros gratis por un día completo.</p>

                            {/* Step 1: Info (Implicit) -> Step 2: Date Selector */}
                            <div className="space-y-6">
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>Selecciona una fecha</label>
                                    <input
                                        type="date"
                                        value={trialDate}
                                        onChange={handleDateSelect}
                                        min={new Date().toISOString().split('T')[0]}
                                        className={`w-full p-4 rounded-xl ${theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black'} border outline-none focus:border-brand-red`}
                                    />
                                </div>

                                {/* Step 3: Class Selector (if classes found) */}
                                {trialDate && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest ${textMuted} mb-2`}>
                                            Horarios Disponibles ({availableClasses.length})
                                        </label>

                                        {availableClasses.length > 0 ? (
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {availableClasses.map((cls: any) => (
                                                    <div
                                                        key={cls.id}
                                                        onClick={() => setSelectedClass(cls.id)}
                                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedClass === cls.id
                                                            ? 'border-brand-red bg-brand-red/10'
                                                            : (theme === 'dark' ? 'border-white/5 bg-black/30 hover:bg-white/5' : 'border-gray-200 bg-gray-50 hover:bg-gray-100')}`}
                                                    >
                                                        <div>
                                                            <p className={`font-bold text-sm ${textContrast}`}>{cls.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {isMounted ? new Date(cls.scheduled_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '...'} • <span className={`${textContrast} opacity-80 font-bold`}>{cls.coach?.full_name || 'Staff'}</span>
                                                            </p>
                                                        </div>
                                                        {selectedClass === cls.id && <CheckCircle2 className="w-5 h-5 text-brand-red" />}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={`p-4 rounded-xl text-center text-sm ${theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                No hay clases programadas para este día.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={submitTrialRequest}
                                    disabled={!trialDate || isSubmittingTrial}
                                    className="w-full py-4 bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 mt-4 shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isSubmittingTrial ? 'Enviando...' : 'Confirmar Solicitud'} <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Detail Modal */}
                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className={`border rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'}`}>
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="grid md:grid-cols-2">
                                <div className={`aspect-square relative ${theme === 'dark' ? 'bg-black' : 'bg-gray-100'}`}>
                                    {selectedProduct.image_url ? (
                                        <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500"><ShoppingBag className="w-20 h-20" /></div>
                                    )}
                                    <div className="absolute bottom-4 left-4 bg-black/80 text-white text-xs font-black uppercase px-3 py-1.5 rounded-lg border border-white/10">
                                        {selectedProduct.category}
                                    </div>
                                </div>
                                <div className={`p-8 flex flex-col h-full ${theme === 'dark' ? 'bg-brand-gray/20' : 'bg-white'}`}>
                                    <div className="flex-1">
                                        <h3 className={`text-2xl font-black italic uppercase mb-2 ${textContrast}`}>{selectedProduct.name}</h3>
                                        <h4 className="text-3xl font-bold text-brand-red mb-6">€{selectedProduct.price}</h4>

                                        <div className="space-y-4 mb-8">
                                            <div>
                                                <label className={`text-[10px] uppercase font-bold tracking-widest block mb-2 ${textMuted}`}>Descripción</label>
                                                <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{selectedProduct.description || "Sin descripción."}</p>
                                            </div>

                                            <div>
                                                <label className={`text-[10px] uppercase font-bold tracking-widest block mb-2 ${textMuted}`}>Disponibilidad</label>
                                                <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {selectedProduct.stock_quantity > 0 ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-green-500" /> En Stock ({selectedProduct.stock_quantity} disp.)
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="w-4 h-4 text-red-500" /> Agotado
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`pt-6 border-t space-y-3 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                                        {!isMember ? (
                                            <div className={`text-center py-4 rounded-2xl p-4 ${theme === 'dark' ? 'bg-brand-red/5 border-brand-red/20' : 'bg-red-50 border-red-200'} border`}>
                                                <Lock className="w-5 h-5 text-brand-red mx-auto mb-2" />
                                                <p className="text-[10px] font-black text-brand-red uppercase tracking-wider mb-1">Solo para Miembros</p>
                                                <p className={`text-[11px] mb-3 leading-snug font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Debes ser miembro activo del centro para adquirir productos en la tienda.
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setSelectedProduct(null);
                                                        setActiveTab('memberships');
                                                    }}
                                                    className="px-5 py-2.5 bg-brand-red text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg hover:scale-105"
                                                >
                                                    Ver Planes de Membresía
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => handlePurchase('cash')}
                                                        disabled={isPurchasing || selectedProduct.stock_quantity === 0}
                                                        className="w-full py-4 bg-gray-700 text-white flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Banknote className="w-4 h-4" />
                                                        Efectivo
                                                    </button>
                                                    <button
                                                        onClick={() => handlePurchase('card')}
                                                        disabled={isPurchasing || selectedProduct.stock_quantity === 0}
                                                        className="w-full py-4 bg-brand-red text-white flex flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/20"
                                                    >
                                                        {isPurchasing ? '...' : (
                                                            selectedProduct.stock_quantity > 0 ? (
                                                                <><CreditCard className="w-4 h-4" /> Tarjeta</>
                                                            ) : 'Agotado'
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-center text-gray-500 font-medium leading-tight">
                                                    Tarjeta: pago automático.<br />Efectivo: pagar en mostrador.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Attendees Modal */}
                {attendeesList && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className={`border rounded-3xl w-full max-w-sm p-6 relative shadow-2xl ${theme === 'dark' ? 'bg-[#111] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
                            <button
                                onClick={() => setAttendeesList(null)}
                                className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-lg font-black italic uppercase mb-6 flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-brand-red" /> Asistentes
                            </h3>

                            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                                {attendeesList.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-4">Nadie inscrito aún.</p>
                                ) : (
                                    attendeesList.map((attendee: any, i: number) => (
                                        <div key={i} className={`flex items-center gap-3 p-2 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                                            <div className="w-10 h-10 rounded-full border-2 border-brand-red/20 overflow-hidden relative bg-gray-800">
                                                <img
                                                    src={attendee.avatar_url || `https://ui-avatars.com/api/?name=${attendee.full_name}`}
                                                    alt={attendee.full_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm leading-none mb-1">{attendee.full_name}</p>
                                                {attendee.username ? (
                                                    <Link href={`/dashboard/profile/${attendee.username}`} target="_blank" className="text-xs text-brand-red hover:underline block">@{attendee.username}</Link>
                                                ) : (
                                                    <p className="text-xs text-gray-500">Atleta</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Result Logging Modal */}
                {showResultModal && resultClass && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className={`border rounded-3xl w-full max-w-md p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-[#111] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
                            <button
                                onClick={() => setShowResultModal(false)}
                                className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-lg font-black italic uppercase mb-1">Registrar Resultados</h3>
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-gray-500 text-xs uppercase tracking-wider">{resultClass.name}</p>
                                <input
                                    type="date"
                                    value={resultDate}
                                    onChange={(e) => setResultDate(e.target.value)}
                                    className={`text-xs font-bold uppercase bg-transparent outline-none text-right ${theme === 'dark' ? 'text-gray-400 focus:text-white' : 'text-gray-500 focus:text-black'}`}
                                />
                            </div>

                            <div className="space-y-6">
                                {resultBlocks.map((section, sIdx) => (
                                    <div key={sIdx} className={`p-4 rounded-xl border relative group/block ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                        <button
                                            onClick={() => handleRemoveSection(sIdx)}
                                            className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover/block:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        {/* SECTION HEADER */}
                                        <div className="flex flex-col gap-2 w-full border-b border-white/5 pb-4 mb-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <input
                                                    value={section.title}
                                                    onChange={(e) => handleUpdateSection(sIdx, 'title', e.target.value)}
                                                    placeholder="NOMBRE SECCIÓN (Ej: FUERZA)"
                                                    className={`bg-transparent font-black uppercase text-xs tracking-widest outline-none flex-1 transition-colors cursor-text placeholder:text-gray-600 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                                                />
                                                {/* RX LEVEL TOGGLE - SECTION LEVEL */}
                                                {section.type !== 'weight' && (
                                                    <button
                                                        onClick={() => {
                                                            const currentIndex = RX_LEVELS.indexOf(section.rx_level || 'Intermedio');
                                                            const nextIndex = (currentIndex + 1) % RX_LEVELS.length;
                                                            handleUpdateSection(sIdx, 'rx_level', RX_LEVELS[nextIndex]);
                                                        }}
                                                        className={`h-7 px-3 rounded text-[10px] font-black uppercase transition-all ${(section.rx_level || 'Intermedio') === 'Avanzado' ? 'bg-blue-500 text-white' :
                                                            (section.rx_level || 'Intermedio') === 'Escalado' ? 'bg-green-500 text-white' :
                                                                'bg-gray-200 text-gray-600'
                                                            }`}
                                                    >
                                                        {section.rx_level || 'Intermedio'}
                                                    </button>
                                                )}
                                            </div>

                                            <select
                                                value={section.type}
                                                onChange={(e) => handleUpdateSection(sIdx, 'type', e.target.value)}
                                                className="text-[10px] uppercase font-bold bg-transparent outline-none text-gray-600 hover:text-white transition-colors cursor-pointer w-fit"
                                            >
                                                <option value="time">Tipo: Por Tiempo</option>
                                                <option value="rounds">Tipo: AMRAP / Rondas</option>
                                                <option value="weight">Tipo: Fuerza / Peso</option>
                                            </select>
                                        </div>

                                        {/* EXERCISES LIST */}
                                        <div className="space-y-4">
                                            {section.exercises.map((exercise: any, eIdx: number) => (
                                                <div key={eIdx} className="relative group/exercise">
                                                    {section.exercises.length > 1 && (
                                                        <button
                                                            onClick={() => handleRemoveExercise(sIdx, eIdx)}
                                                            className="absolute -left-2 top-0 text-red-500 opacity-0 group-hover/exercise:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}

                                                    {/* CONDITIONAL RENDER BASED ON TYPE */}
                                                    {section.type === 'weight' ? (
                                                        <div className="flex flex-col gap-2">
                                                            {/* Strength: Name + Details */}
                                                            <div className="flex flex-col gap-1 w-full">
                                                                <label className="text-[9px] uppercase font-bold text-gray-500">Ejercicio</label>
                                                                <input
                                                                    value={exercise.name}
                                                                    onChange={(e) => handleUpdateExercise(sIdx, eIdx, 'name', e.target.value)}
                                                                    placeholder="Ej: Back Squat"
                                                                    className={`bg-transparent font-black uppercase text-lg tracking-tight outline-none w-full transition-colors cursor-text placeholder:text-gray-700 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[9px] uppercase font-bold text-gray-500 text-center">Series</label>
                                                                    <input
                                                                        type="number"
                                                                        value={exercise.sets || ''}
                                                                        onChange={(e) => handleUpdateExercise(sIdx, eIdx, 'sets', e.target.value)}
                                                                        className={`w-full p-2 text-center rounded-lg font-bold outline-none bg-transparent border focus:border-brand-red ${theme === 'dark' ? 'border-white/20 text-white' : 'border-gray-300 text-black'}`}
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[9px] uppercase font-bold text-gray-500 text-center">Reps</label>
                                                                    <input
                                                                        type="number"
                                                                        value={exercise.reps || ''}
                                                                        onChange={(e) => handleUpdateExercise(sIdx, eIdx, 'reps', e.target.value)}
                                                                        className={`w-full p-2 text-center rounded-lg font-bold outline-none bg-transparent border focus:border-brand-red ${theme === 'dark' ? 'border-white/20 text-white' : 'border-gray-300 text-black'}`}
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-1 relative">
                                                                    <label className="text-[9px] uppercase font-bold text-gray-500 text-center">Peso (KG)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={exercise.value}
                                                                        onChange={(e) => handleUpdateExercise(sIdx, eIdx, 'value', e.target.value)}
                                                                        className={`w-full p-2 text-center rounded-lg font-bold outline-none bg-transparent border focus:border-brand-red ${theme === 'dark' ? 'border-white/20 text-white' : 'border-gray-300 text-black'}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 w-full pb-2 border-b border-dashed border-white/5 last:border-0">
                                                            {/* WOD: Name Only per exercise */}
                                                            <label className="text-[9px] uppercase font-bold text-gray-500">Ejercicio</label>
                                                            <input
                                                                value={exercise.name}
                                                                onChange={(e) => handleUpdateExercise(sIdx, eIdx, 'name', e.target.value)}
                                                                placeholder="Ej: 800m Run, 40 Wall Balls..."
                                                                className={`bg-transparent font-black uppercase text-xl leading-none tracking-tight outline-none w-full transition-colors cursor-text placeholder:text-gray-700 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => handleAddExercise(sIdx)}
                                                className="w-full py-3 border border-dashed rounded-lg text-[10px] font-bold uppercase text-gray-500 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> AÑADIR OTRO EJERCICIO A {section.title}
                                            </button>

                                            {/* GLOBAL RESULT INPUT FOR WODs (Time/Rounds) */}
                                            {section.type !== 'weight' && (
                                                <div className="mt-6 pt-4 border-t border-white/10">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-[10px] uppercase font-bold text-gray-500 text-right">
                                                                {section.title?.includes('EMOM') ? 'Rondas Completadas' :
                                                                    section.type === 'rounds' ? 'Resultado (Rondas)' :
                                                                        'Tiempo Total (MM:SS)'}
                                                            </label>
                                                            <input
                                                                value={section.value || ''}
                                                                onChange={(e) => handleUpdateSection(sIdx, 'value', e.target.value)}
                                                                placeholder={
                                                                    section.title?.includes('EMOM') ? "Rondas / Minutos" :
                                                                        section.type === 'rounds' ? "Total Rondas + Reps" :
                                                                            "MM:SS"
                                                                }
                                                                className={`w-full p-3 text-right rounded-xl font-black text-2xl outline-none bg-transparent border focus:border-brand-red transition-all ${theme === 'dark' ? 'text-white border-white/10 placeholder:text-gray-700' : 'text-black border-gray-200'}`}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-[10px] uppercase font-bold text-gray-500 text-right">
                                                                Peso / Carga (KG)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={section.wod_weight || ''}
                                                                onChange={(e) => handleUpdateSection(sIdx, 'wod_weight', e.target.value)}
                                                                placeholder="KG"
                                                                className={`w-full p-3 text-right rounded-xl font-black text-2xl outline-none bg-transparent border focus:border-brand-red transition-all ${theme === 'dark' ? 'text-white border-white/10 placeholder:text-gray-700' : 'text-black border-gray-200'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Add Block Buttons */}
                                <div className="grid grid-cols-4 gap-2">
                                    <button onClick={() => handleAddSection('weight', 'FUERZA')} className={`py-3 rounded-xl border border-dashed text-[10px] md:text-xs font-bold uppercase transition-all ${theme === 'dark' ? 'border-white/20 hover:border-brand-red hover:text-brand-red' : 'border-gray-300 hover:border-brand-red hover:text-brand-red'}`}>
                                        + Fuerza
                                    </button>
                                    <button onClick={() => handleAddSection('time', 'FOR TIME')} className={`py-3 rounded-xl border border-dashed text-[10px] md:text-xs font-bold uppercase transition-all ${theme === 'dark' ? 'border-white/20 hover:border-brand-red hover:text-brand-red' : 'border-gray-300 hover:border-brand-red hover:text-brand-red'}`}>
                                        + For Time
                                    </button>
                                    <button onClick={() => handleAddSection('rounds', 'AMRAP')} className={`py-3 rounded-xl border border-dashed text-[10px] md:text-xs font-bold uppercase transition-all ${theme === 'dark' ? 'border-white/20 hover:border-brand-red hover:text-brand-red' : 'border-gray-300 hover:border-brand-red hover:text-brand-red'}`}>
                                        + AMRAP
                                    </button>
                                    <button onClick={() => handleAddSection('rounds', 'EMOM')} className={`py-3 rounded-xl border border-dashed text-[10px] md:text-xs font-bold uppercase transition-all ${theme === 'dark' ? 'border-white/20 hover:border-brand-red hover:text-brand-red' : 'border-gray-300 hover:border-brand-red hover:text-brand-red'}`}>
                                        + EMOM
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Notas (Opcional)</label>
                                    <textarea
                                        value={resultNotes}
                                        onChange={(e) => setResultNotes(e.target.value)}
                                        rows={2}
                                        className={`w-full p-4 rounded-xl outline-none border focus:border-brand-red transition-colors text-sm ${theme === 'dark' ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black'}`}
                                        placeholder="Sensaciones, adaptaciones, etc..."
                                    />
                                </div>

                                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setShareToFeed(!shareToFeed)}>
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${shareToFeed ? 'bg-brand-red' : 'bg-gray-600'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${shareToFeed ? 'left-5' : 'left-1'}`} />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider">Publicar en el Feed</span>
                                </div>

                                <button
                                    onClick={handleSaveResult}
                                    disabled={resultBlocks.every(b => b.type === 'weight' ? !b.exercises.some((e: any) => e.value) : !b.value) || isSavingResult}
                                    className="w-full py-4 bg-brand-red text-white flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50 mt-4 shadow-lg"
                                >
                                    {isSavingResult ? 'Guardando...' : 'Guardar Resultados'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leaderboard Modal */}
                {showLeaderboard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className={`border rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[85vh] overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-[#111] border-white/10 text-white' : 'bg-white border-gray-200 text-black'}`}>
                            <button
                                onClick={() => setShowLeaderboard(false)}
                                className={`absolute top-4 right-4 p-2 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mb-6 border-b border-white/5 pb-4">
                                <h3 className="text-2xl font-black italic uppercase flex items-center gap-2 text-brand-red">
                                    <Trophy className="w-6 h-6" />
                                    Leaderboard
                                </h3>
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                                    {isMounted && scheduleDate ? new Date(scheduleDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '...'}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                                {isLoadingLeaderboard ? (
                                    <div className="flex justify-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
                                    </div>
                                ) : !leaderboardData || Object.keys(leaderboardData).length === 0 ? (
                                    <p className="text-center text-gray-500 py-10 uppercase text-xs font-bold tracking-widest">No hay resultados registrados hoy</p>
                                ) : (
                                    Object.entries(leaderboardData).map(([blockTitle, entries]: [string, any]) => (
                                        <div key={blockTitle} className="mb-8 last:mb-0">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="h-4 w-1 bg-brand-red rounded-full"></div>
                                                <h4 className="text-xs font-black uppercase tracking-[0.1em] text-white/90">{blockTitle}</h4>
                                            </div>
                                            <div className="space-y-2.5">
                                                {(entries as any[]).map((entry, idx) => (
                                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : idx === 1 ? 'bg-gray-300/10 border border-gray-300/20' : idx === 2 ? 'bg-orange-700/10 border border-orange-700/20' : (theme === 'dark' ? 'bg-white/5' : 'bg-gray-50')}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 flex items-center justify-center text-xs font-black rounded-full ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-gray-600 text-white'}`}>
                                                                {idx + 1}
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                                                                <img src={entry.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold leading-none">{entry.user.full_name}</p>
                                                                <p className="text-[10px] text-gray-500">@{entry.user.username}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <p className="font-black text-sm">{entry.value} {entry.type === 'weight' ? '' : entry.type === 'rounds' ? 'RDS' : ''}</p>
                                                            <div className="flex items-center gap-2">
                                                                {/* WOD Weight Display */}
                                                                {entry.wod_weight && <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">+{entry.wod_weight}kg</span>}
                                                                {/* Rx Level Badge */}
                                                                {entry.rx_level && (
                                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${entry.rx_level === 'Avanzado' ? 'bg-blue-500 text-white' :
                                                                        entry.rx_level === 'Escalado' ? 'bg-green-500 text-white' :
                                                                            'bg-gray-500 text-white'
                                                                        }`}>
                                                                        {entry.rx_level === 'Avanzado' ? 'RX' : entry.rx_level === 'Escalado' ? 'SC' : 'INT'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}


            {/* Membership Confirmation Modal */}
            {showMembershipModal && selectedMembership && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowMembershipModal(false)}>
                    <div className={`${bgCard} border rounded-3xl p-6 sm:p-8 w-full max-w-lg relative animate-in fade-in zoom-in duration-300`} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowMembershipModal(false)} className="absolute top-4 right-4 bg-white/5 p-2 rounded-full text-gray-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-brand-red/10 rounded-xl text-brand-red">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                    Confirmar Suscripción
                                </h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Revisa los detalles de tu membresía</p>
                            </div>
                        </div>

                        <div className={`${theme === 'dark' ? 'bg-black/40' : 'bg-gray-50'} rounded-2xl p-6 mb-6 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                            <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">{selectedMembership.name}</h4>
                            <p className="text-xs text-gray-500 mb-4">{selectedMembership.description || "Plan de membresía para el centro."}</p>

                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-3xl font-black text-white italic">{selectedMembership.price}€</span>
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">/ {selectedMembership.duration_months === 1 ? "mes" : `${selectedMembership.duration_months} meses`}</span>
                            </div>

                            {selectedMembership.features?.length > 0 && (
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    {selectedMembership.features.map((feature: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-300">
                                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className={`${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50'} border ${theme === 'dark' ? 'border-blue-500/20' : 'border-blue-200'} rounded-xl p-4 mb-6`}>
                            <p className={`text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                                <strong>Nota:</strong> Serás redirigido a una página de pago segura para completar tu suscripción.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowMembershipModal(false)}
                                className={`flex-1 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-colors ${theme === 'dark' ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmMembershipSubscription}
                                disabled={isProcessingMembership}
                                className="flex-[2] bg-brand-red text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {isProcessingMembership ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        Continuar al Pago
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exercise Media Lightbox */}
            {exerciseMedia && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setExerciseMedia(null)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white focus:outline-none transition-colors z-50">
                        <X className="w-10 h-10" />
                    </button>
                    <div className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
                        {exerciseMedia.type === 'video' ? (
                            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.2)] bg-black">
                                <video src={exerciseMedia.url} controls autoPlay className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <img src={exerciseMedia.url} alt="Exercise" className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)]" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
