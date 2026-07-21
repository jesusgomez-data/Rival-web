"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Minus, Trash2, FileText, Image as ImageIcon, X, Video, ChevronDown, Check, Edit2, Search, Clock, Trophy, Calendar, Download } from "lucide-react";
import { createWod, updateWod, addExerciseToCatalog } from "../../wod-actions";
import { getExercises } from "../../actions";
import { deletePost } from "../../feed-actions";
import clsx from "clsx";
import { useTheme } from "../../../../ThemeContext";

type BlockType = 'weightlifting' | 'metcon' | 'gymnastics' | 'endurance' | 'mobility' | 'other';
type BlockFormat = 'EMOM' | 'AMRAP' | 'FOR TIME' | 'INTERVALS' | 'TABATA' | 'QUALITY' | 'REST' | 'DEATH BY' | 'FREE' | 'ROUNDS FOR TIME' | 'CHIPPER' | 'STRENGTH';

const PART_NAMES: Record<BlockType, string> = {
    weightlifting: 'Fuerza / Weightlifting',
    metcon: 'Metcon / WOD',
    gymnastics: 'Gymnastics / Skill',
    endurance: 'Endurance / Hyrox',
    mobility: 'Movilidad / Finisher',
    other: 'Otra Parte'
};

import { BENCHMARKS } from "./benchmarks";

interface WodBlock {
    id: string;
    type: BlockType;
    format?: BlockFormat;
    // Standard Config for WodCard
    config?: {
        timecap?: string;
        rounds?: number;
        work?: string;
        rest?: string;
        frequency?: string; // EMOM: "1 MIN" | "2 MIN" | "3 MIN"... — cada cuántos minutos arranca una ronda nueva
        minutes?: number;
        sets?: number;      // STRENGTH
        reps?: string;      // STRENGTH
    };
    title?: string;
    duration?: string;
    content: string;
    media_urls?: string[]; // Existing media
    // New Fields for Builder Mode
    mode?: 'text' | 'builder';
    exercises?: WodExercise[];
}

interface WodSummary {
    totalTime: string;
    scoreType: 'TIME' | 'REPS' | 'WEIGHT' | 'ROUNDS' | 'CALORIES' | 'OTHER';
    scoreLabel: string;
}

interface WodExercise {
    id: string;
    name: string;
    sets?: string;
    reps?: string;
    repUnit?: string;
    value?: string;
    weightUnit?: string;
    note?: string;
    media_url?: string;
}

const COMMON_EXERCISES = [
    "Air Squat", "Back Squat", "Front Squat", "Overhead Squat",
    "Deadlift", "Sumo Deadlift", "Sumo Deadlift High Pull",
    "Shoulder Press", "Push Press", "Push Jerk", "Split Jerk",
    "Clean", "Power Clean", "Hang Power Clean", "Squat Clean",
    "Snatch", "Power Snatch", "Hang Power Snatch", "Squat Snatch",
    "Thruster", "Wall Ball", "Burpee", "Box Jump", "Box Step Up",
    "Double Under", "Single Under", "Pull Up", "Chest to Bar", "Muscle Up", "Ring Muscle Up", "Bar Muscle Up",
    "Toes to Bar", "Knees to Elbows", "Hanging Leg Raise",
    "Handstand Push Up", "Handstand Walk", "Pistol Squat",
    "Row", "Echo Bike", "Assault Bike", "Ski Erg", "Run",
    "Kettlebell Swing", "Goblet Squat", "Turkish Get Up",
    "Lunges", "Walking Lunges", "Jumping Lunges",
    "Push Up", "Ring Dip", "Bench Press", "Dips",
    "GHD Sit Up", "Sit Up", "V-Ups", "Hollow Rock",
    "Plank", "L-Sit", "Wall Walk", "Strict Press",
    "Dumbbell Snatch", "Dumbbell Clean", "Dumbbell Thruster"
].sort();

export default function WodManager({ centerId, initialPosts, center, userRole }: any) {
    const { theme } = useTheme();
    const [posts, setPosts] = useState(initialPosts);
    const canPostAsCenter = userRole === 'owner' || userRole === 'head_coach';

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [warmup, setWarmup] = useState("");
    const [blocks, setBlocks] = useState<WodBlock[]>([]);
    const [summary, setSummary] = useState<WodSummary>({
        totalTime: '60:00',
        scoreType: 'REPS',
        scoreLabel: 'TOTAL REPS'
    });
    const getLocalDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getLocalTime = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const [date, setDate] = useState(getLocalDate());
    const [time, setTime] = useState(getLocalTime());
    const [isPosting, setIsPosting] = useState(false);
    // Default to center if allowed, otherwise force false
    const [postAsCenter, setPostAsCenter] = useState(canPostAsCenter);
    const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
    const [expandedBlocks, setExpandedBlocks] = useState<Record<string, Record<string, boolean>>>({});
    const [showBenchmarks, setShowBenchmarks] = useState(false);

    // File State: Map blockId -> File[]
    const [blockFiles, setBlockFiles] = useState<Record<string, File[]>>({});

    // Exercise Files: Map blockId -> exerciseId -> File
    const [exerciseFiles, setExerciseFiles] = useState<Record<string, Record<string, File>>>({});

    // Autocomplete State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeExercisePath, setActiveExercisePath] = useState<{ bIdx: number, eIdx: number } | null>(null);
    const [catalogExercises, setCatalogExercises] = useState<string[]>([]);
    const [isSavingExercise, setIsSavingExercise] = useState(false);
    const [showAddPartMenu, setShowAddPartMenu] = useState(false);

    // Initial Load
    useEffect(() => {
        const fetchCatalog = async () => {
            const exData = await getExercises('cross_training');
            if (exData) {
                const names = exData.map((e: any) => e.name);
                setCatalogExercises(Array.from(new Set([...COMMON_EXERCISES, ...names])).sort());
            }
        };
        fetchCatalog();
    }, []);

    // Global files (optional, attached to WOD generally? keeping simple for now)
    // We already have "Add Media" at bottom, let's keep that as "Global Attachments"? 
    // Or maybe we treat them as Warmup attachments? 
    // The user asked for "images and videos per exercise/block".

    const [globalFiles, setGlobalFiles] = useState<File[]>([]);

    // Refs for file inputs
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // --- FORM HANDLERS ---

    const resetForm = () => {
        setEditingId(null);
        setTitle("");
        setWarmup("");
        setBlocks([]);
        setSummary({
            totalTime: '60:00',
            scoreType: 'REPS',
            scoreLabel: 'TOTAL REPS'
        });
        setDate(getLocalDate());
        setTime(getLocalTime());
        setBlockFiles({});
        setExerciseFiles({});
        setGlobalFiles([]);
        setIsPosting(false);
        setPostAsCenter(canPostAsCenter);
    };

    const handleEdit = (post: any) => {
        let wodData;
        try {
            wodData = JSON.parse(post.content);
        } catch {
            wodData = { workout: post.content };
        }

        setEditingId(post.id);
        setTitle(wodData.title || "");
        setWarmup(wodData.warmup || "");
        setSummary(wodData.summary || {
            totalTime: '60:00',
            scoreType: 'REPS',
            scoreLabel: 'TOTAL REPS'
        });

        // Handle transforming old data structures to blocks if needed, 
        // typically handled in rendering but for editing we might want to normalize.
        // If it's old data, it might not have blocks.
        if (wodData.blocks) {
            // Map existing blocks to include internal IDs for exercises if needed
            const mappedBlocks = wodData.blocks.map((b: any) => ({
                ...b,
                id: b.id || Math.random().toString(36).substr(2, 9),
                mode: (b.exercises && b.exercises.length > 0) ? 'builder' : 'text',
                // Migrate duration to config if editing old post
                config: b.config || (b.duration ? { timecap: b.duration } : {}),
                exercises: b.exercises ? b.exercises.map((e: any) => ({ ...e, id: Math.random().toString(36).substr(2, 9) })) : []
            }));
            setBlocks(mappedBlocks);
        } else {
            // Migrate old 'workout' field to a block if editing
            if (wodData.workout) {
                setBlocks([{
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'metcon',
                    format: 'FREE',
                    config: {},
                    content: wodData.workout
                }]);
            } else {
                setBlocks([]);
            }
        }

        const scheduledDate = post.scheduled_for ? new Date(post.scheduled_for) : new Date();

        // Use local values to avoid UTC date shift
        const localDate = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
        const localTime = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`;

        setDate(localDate);
        setTime(localTime);
        setPostAsCenter(post.post_as_center || false);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warmup.trim() && blocks.length === 0) return;
        setIsPosting(true);

        const formData = new FormData();
        formData.append("title", title);
        formData.append("warmup", warmup);
        formData.append("blocks", JSON.stringify(blocks));
        formData.append("summary", JSON.stringify(summary));
        // Combine date and time
        const scheduledDateTime = new Date(`${date}T${time}`).toISOString();
        formData.append("scheduled_for", scheduledDateTime);
        formData.append("postAsCenter", String(postAsCenter));

        // Append Block Files
        Object.entries(blockFiles).forEach(([blockId, files]) => {
            files.forEach(file => {
                formData.append(`media_${blockId}`, file);
            });
        });

        // Append Exercise Files
        Object.entries(exerciseFiles).forEach(([blockId, exFiles]) => {
            Object.entries(exFiles).forEach(([exId, file]) => {
                formData.append(`media_block_${blockId}_ex_${exId}`, file);
            });
        });

        // Append Global Files
        globalFiles.forEach(file => {
            formData.append("media", file);
        });

        let res;
        try {
            if (editingId) {
                res = await updateWod(centerId, editingId, formData);
            } else {
                res = await createWod(centerId, formData);
            }
        } catch (e) {
            res = { error: 'Error de conexión. Inténtalo de nuevo.' };
        } finally {
            setIsPosting(false);
        }

        if (res?.error) {
            alert(res.error);
        } else {
            resetForm();
            window.location.reload();
        }
    };

    const handleDelete = async (postId: string) => {
        if (!confirm("¿Seguro que quieres eliminar este WOD?")) return;
        const res = await deletePost(centerId, postId);
        if (res.error) {
            alert(res.error);
        } else {
            setPosts(posts.filter((p: any) => p.id !== postId));
        }
    };

    const togglePost = (postId: string) => {
        setExpandedPosts(prev => {
            const isExpanding = !prev[postId];
            // If expanding for the first time, maybe we want to initialize all blocks as expanded
            if (isExpanding && !expandedBlocks[postId]) {
                const post = posts.find((p: any) => p.id === postId);
                if (post) {
                    try {
                        const data = JSON.parse(post.content);
                        const initialBlocks: Record<string, boolean> = { 'warmup': true };
                        if (data.blocks) {
                            data.blocks.forEach((_: any, i: number) => {
                                initialBlocks[`block-${i}`] = true;
                            });
                        }
                        setExpandedBlocks(prevB => ({ ...prevB, [postId]: initialBlocks }));
                    } catch { }
                }
            }
            return { ...prev, [postId]: isExpanding };
        });
    };

    const toggleInternalBlock = (postId: string, blockKey: string) => {
        setExpandedBlocks(prev => ({
            ...prev,
            [postId]: {
                ...(prev[postId] || {}),
                [blockKey]: !prev[postId]?.[blockKey]
            }
        }));
    };

    // --- BLOCK LOGIC ---

    const addBlock = (type: BlockType = 'metcon') => {
        let defaultFormat: BlockFormat = 'FREE';
        if (type === 'weightlifting') defaultFormat = 'QUALITY';
        if (type === 'metcon') defaultFormat = 'AMRAP';
        if (type === 'endurance') defaultFormat = 'INTERVALS';

        setBlocks([...blocks, {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            format: defaultFormat,
            config: { timecap: '20:00' },
            content: "",
            mode: 'builder',
            exercises: []
        }]);
    };

    const updateBlock = (index: number, updates: Partial<WodBlock>) => {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], ...updates };
        setBlocks(newBlocks);
    };

    const removeBlock = (index: number) => {
        const blockId = blocks[index].id;
        const newBlocks = blocks.filter((_, i) => i !== index);
        setBlocks(newBlocks);

        // Cleanup files
        const newBlockFiles = { ...blockFiles };
        delete newBlockFiles[blockId];
        setBlockFiles(newBlockFiles);

        const newExerciseFiles = { ...exerciseFiles };
        delete newExerciseFiles[blockId];
        setExerciseFiles(newExerciseFiles);
    };

    // --- EXERCISE LOGIC ---

    const addExercise = (blockIndex: number) => {
        setBlocks(prev => prev.map((b, i) =>
            i === blockIndex
                ? { ...b, exercises: [...(b.exercises || []), { id: Math.random().toString(36).substr(2, 9), name: '' }] }
                : b
        ));
    };

    const updateExercise = (blockIndex: number, exIndex: number, updates: Partial<WodExercise>) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIndex || !b.exercises) return b;
            const newExercises = b.exercises.map((ex, j) =>
                j === exIndex ? { ...ex, ...updates } : ex
            );
            return { ...b, exercises: newExercises };
        }));
    };

    const removeExercise = (blockIndex: number, exIndex: number) => {
        const blockId = blocks[blockIndex].id;
        const exId = blocks[blockIndex].exercises![exIndex].id;

        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIndex) return b;
            return { ...b, exercises: b.exercises!.filter((_, j) => j !== exIndex) };
        }));

        // Cleanup file
        setExerciseFiles(prev => {
            const blockFiles = { ...(prev[blockId] || {}) };
            delete blockFiles[exId];
            return { ...prev, [blockId]: blockFiles };
        });
    };

    const handleExerciseFileSelect = (blockId: string, exId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setExerciseFiles(prev => ({
                ...prev,
                [blockId]: {
                    ...(prev[blockId] || {}),
                    [exId]: file
                }
            }));
        }
    };

    const removeExerciseMedia = (blockIndex: number, exIndex: number) => {
        // Remove uploaded file from state
        const blockId = blocks[blockIndex].id;
        const exId = blocks[blockIndex].exercises![exIndex].id;

        if (exerciseFiles[blockId]?.[exId]) {
            setExerciseFiles(prev => {
                const blockFiles = { ...(prev[blockId] || {}) };
                delete blockFiles[exId];
                return { ...prev, [blockId]: blockFiles };
            });
            return;
        }

        // Or remove existing URL
        updateExercise(blockIndex, exIndex, { media_url: undefined });
    };

    // Auto-convert Content <-> Exercises when switching modes
    const toggleBlockMode = (index: number) => {
        setBlocks(prev => prev.map((block, i) => {
            if (i !== index) return block;
            const newMode = block.mode === 'builder' ? 'text' : 'builder';
            if (newMode === 'builder') {
                const lines = block.content.split('\n').filter(l => l.trim());
                const exercises = block.exercises && block.exercises.length > 0
                    ? block.exercises
                    : lines.length > 0
                        ? lines.map(line => ({ id: Math.random().toString(36).substr(2, 9), name: line }))
                        : [{ id: Math.random().toString(36).substr(2, 9), name: '' }];
                return { ...block, mode: newMode, exercises };
            } else {
                const content = !block.content.trim() && block.exercises && block.exercises.length > 0
                    ? block.exercises.map(ex => {
                        let line = ex.name;
                        if (ex.sets || ex.reps) line += ` (${ex.sets || '?'} x ${ex.reps || '?'})`;
                        if (ex.value) line += ` @ ${ex.value}`;
                        return line;
                    }).join('\n')
                    : block.content;
                return { ...block, mode: newMode, content };
            }
        }));
    };

    const handleSaveNewExercise = async (name: string, bIdx: number, exIdx: number) => {
        if (!name.trim()) return;
        setIsSavingExercise(true);
        try {
            const res = await addExerciseToCatalog(name.toUpperCase());
            
            if (res.success) {
                setCatalogExercises(prev => Array.from(new Set([...prev, name.toUpperCase()])).sort());
                updateExercise(bIdx, exIdx, { name: name.toUpperCase() });
                setActiveExercisePath(null);
                setSearchQuery("");
            } else {
                alert("Error al guardar ejercicio: " + res.error);
            }
        } catch (error) {
            console.error("Error in handleSaveNewExercise:", error);
            alert("Error inesperado al guardar el ejercicio.");
        } finally {
            setIsSavingExercise(false);
        }
    };

    const getEmomRounds = (minutes: number, exercisesCount: number) => {
        if (!minutes || !exercisesCount) return 0;
        return minutes; // In a standard EMOM, rounds = total minutes. 
        // If we want "Sets per exercise", it would be minutes / exercisesCount.
        // The user says "automatically say how many rounds it is".
        // Usually if you have 3 exercises in a 12 min EMOM, you do 4 rounds of the circuit.
    };

    // --- FILE LOGIC ---

    const handleBlockFileSelect = (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setBlockFiles(prev => ({
                ...prev,
                [blockId]: [...(prev[blockId] || []), ...files]
            }));
        }
    };

    const removeBlockFile = (blockId: string, fileIndex: number) => {
        setBlockFiles(prev => ({
            ...prev,
            [blockId]: prev[blockId].filter((_, i) => i !== fileIndex)
        }));
    };

    const removeExistingBlockMedia = (blockIndex: number, urlToDelete: string) => {
        // Just remove strictly from UI state 'blocks'
        // The server will receive the updated blocks array with the URL removed
        const newBlocks = [...blocks];
        const currentUrls = newBlocks[blockIndex].media_urls || [];
        newBlocks[blockIndex].media_urls = currentUrls.filter(url => url !== urlToDelete);
        setBlocks(newBlocks);
    };

    function downloadWod(post: any) {
        let wod: any;
        try { wod = JSON.parse(post.content); } catch { wod = { workout: post.content }; }

        const date = new Date(post.scheduled_for || post.created_at)
            .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const centerName = post.post_as_center ? (center?.name || 'Centro') : (post.author?.full_name || 'Coach');

        const lines: string[] = [];
        const line = (s = '') => lines.push(s);

        line('═'.repeat(60));
        line(`  ${wod.title || 'ENTRENAMIENTO'}`.toUpperCase());
        line(`  ${date.toUpperCase()}`);
        line(`  ${centerName.toUpperCase()}`);
        line('═'.repeat(60));

        if (wod.warmup) {
            line();
            line('── WARM UP ─────────────────────────────────────────────');
            line(wod.warmup);
        }

        if (wod.blocks?.length) {
            wod.blocks.forEach((block: WodBlock, idx: number) => {
                line();
                const partLabel = `PARTE ${String.fromCharCode(65 + idx)}: ${(PART_NAMES[block.type] || block.type || '').toUpperCase()}`;
                let formatInfo = '';
                if (block.format && block.format !== 'FREE') {
                    const cfg = block.config;
                    if (block.format === 'EMOM')              formatInfo = ` · E${(cfg?.frequency || '1 MIN').replace(' MIN', '')}MOM ${cfg?.minutes || '?'} MINS`;
                    else if (block.format === 'AMRAP')        formatInfo = ` · AMRAP ${cfg?.timecap || ''}`;
                    else if (block.format === 'FOR TIME')     formatInfo = ` · FOR TIME ${cfg?.timecap ? `(CAP: ${cfg.timecap})` : ''}`;
                    else if (block.format === 'CHIPPER')      formatInfo = ` · CHIPPER ${cfg?.timecap ? `(CAP: ${cfg.timecap})` : ''}`;
                    else if (block.format === 'ROUNDS FOR TIME') formatInfo = ` · ${cfg?.rounds || '?'} RDS FOR TIME ${cfg?.timecap ? `(CAP: ${cfg.timecap})` : ''}`;
                    else if (block.format === 'TABATA')       formatInfo = ` · TABATA ${cfg?.rounds || 8} RDS (${cfg?.work || '20S'}/${cfg?.rest || '10S'})`;
                    else if (block.format === 'INTERVALS')    formatInfo = ` · INTERVALOS ${cfg?.rounds || '?'} RDS (${cfg?.work || '?'} TRABAJO / ${cfg?.rest || '?'} DESCANSO)`;
                    else if (block.format === 'STRENGTH')     formatInfo = ` · ${cfg?.sets || '?'}x${cfg?.reps || '?'} (DESCANSO ${cfg?.rest || '90S'})`;
                    else formatInfo = ` · ${block.format}`;
                }
                line(`── ${partLabel}${formatInfo} ${'─'.repeat(Math.max(0, 57 - partLabel.length - formatInfo.length))}`);
                line();

                if (block.exercises?.length) {
                    block.exercises.forEach((ex, i) => {
                        const parts: string[] = [];
                        if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}${ex.repUnit && ex.repUnit !== 'reps' ? ' ' + ex.repUnit : ''}`);
                        else if (ex.reps)       parts.push(`${ex.reps}${ex.repUnit && ex.repUnit !== 'reps' ? ' ' + ex.repUnit : ' reps'}`);
                        if (ex.value)           parts.push(`@ ${ex.value} ${ex.weightUnit || 'kg'}`);
                        const prefix = parts.length ? parts.join(' ') + '  ' : '';
                        const note = ex.note ? `  (${ex.note})` : '';
                        lines.push(`  ${i + 1}. ${prefix}${ex.name}${note}`);
                    });
                } else if (block.content) {
                    block.content.split('\n').forEach(l => line(`  ${l}`));
                }
            });
        } else if (wod.workout) {
            line();
            line('── WOD ──────────────────────────────────────────────────');
            wod.workout.split('\n').forEach((l: string) => line(`  ${l}`));
        }

        if (wod.summary) {
            line();
            line('── OBJETIVO / SCORE ─────────────────────────────────────');
            if (wod.summary.totalTime) line(`  Tiempo estimado: ${wod.summary.totalTime}`);
            if (wod.summary.scoreType) line(`  Tipo de score:   ${wod.summary.scoreType}`);
            if (wod.summary.scoreLabel) line(`  Objetivo:        ${wod.summary.scoreLabel}`);
        }

        line();
        line('═'.repeat(60));
        line(`  Generado por RIVAL FIT · rivalfit.app`);
        line('═'.repeat(60));

        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `WOD_${(wod.title || 'entrenamiento').replace(/\s+/g, '_')}_${date.replace(/[^a-z0-9]/gi, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Create/Edit Form */}
            <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 sticky top-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-foreground italic uppercase">{editingId ? 'Edit WOD' : 'Publish WOD'}</h3>
                        {editingId && (
                            <button onClick={resetForm} className="text-xs text-brand-red font-bold uppercase hover:underline">Cancel</button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Section 0: Title */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-brand-red uppercase tracking-widest">WOD Title</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowBenchmarks(!showBenchmarks)}
                                        className="text-[10px] font-black text-muted-foreground hover:text-brand-red uppercase tracking-wider bg-muted px-2.5 py-1 rounded-lg border border-border transition-all flex items-center gap-1.5"
                                    >
                                        <Trophy className="w-3 h-3" />
                                        Cargar Benchmark
                                    </button>

                                    {showBenchmarks && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-[150] p-1 overflow-hidden backdrop-blur-2xl">
                                            <div className="p-2 border-b border-border flex items-center justify-between">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Seleccionar Benchmark</span>
                                                <button onClick={() => setShowBenchmarks(false)}><X className="w-3 h-3 text-muted-foreground" /></button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                {BENCHMARKS.map((bm, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            setTitle(bm.name);
                                                            if (bm.warmup) setWarmup(bm.warmup);
                                                            if (bm.summary) setSummary(bm.summary as any);
                                                            if (bm.blocks) {
                                                                setBlocks(bm.blocks.map(b => ({
                                                                    ...b,
                                                                    id: Math.random().toString(36).substr(2, 9),
                                                                    exercises: (b as any).exercises || []
                                                                })) as any);
                                                            }
                                                            setShowBenchmarks(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-foreground/70 hover:text-foreground hover:bg-muted border-b border-border last:border-0 transition-colors uppercase italic"
                                                    >
                                                        {bm.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                                placeholder="Ej: THE CHIEF, MURPH, PUSH & BURN..."
                                className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:border-brand-red outline-none text-sm font-black italic uppercase transition-colors"
                            />
                        </div>

                        {/* Section 1: Warm Up */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-brand-red uppercase tracking-widest">Warm Up</label>
                            <textarea
                                value={warmup}
                                onChange={(e) => setWarmup(e.target.value)}
                                placeholder="Warm up details..."
                                className="w-full h-24 bg-background border border-border rounded-xl p-3 text-foreground focus:border-brand-red outline-none text-sm resize-none transition-colors"
                            />
                        </div>

                        {/* Dynamic Blocks */}
                        {blocks.map((block, index) => (
                            <div key={block.id} className="space-y-3 relative group p-3 sm:p-4 bg-muted/30 rounded-xl border border-border hover:border-border/60 transition-colors animate-fade-in">
                                <button
                                    type="button"
                                    onClick={() => removeBlock(index)}
                                    className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Block Settings */}
                                <div className="flex flex-wrap gap-2 pr-6 items-center justify-between w-full">
                                    <div className="flex flex-wrap gap-2">
                                        <div className="relative">
                                            <select
                                                value={block.format}
                                                onChange={(e) => {
                                                    const newFormat = e.target.value as BlockFormat;
                                                    let newConfig = { ...block.config };
                                                    if (newFormat === 'EMOM') newConfig = { frequency: '1 MIN', minutes: 12 };
                                                    else if (newFormat === 'AMRAP') newConfig = { timecap: '20:00' };
                                                    else if (newFormat === 'FOR TIME' || newFormat === 'CHIPPER') newConfig = { timecap: '' };
                                                    else if (newFormat === 'ROUNDS FOR TIME') newConfig = { rounds: 5, timecap: '20:00' };
                                                    else if (newFormat === 'TABATA') newConfig = { rounds: 8, work: '20S', rest: '10S' };
                                                    else if (newFormat === 'INTERVALS') newConfig = { rounds: 5, work: '3:00', rest: '1:00' };
                                                    else if (newFormat === 'STRENGTH') newConfig = { sets: 5, reps: '5', rest: '90S' };

                                                    updateBlock(index, { format: newFormat, config: newConfig });
                                                }}
                                                className="appearance-none bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-red focus:border-brand-red outline-none cursor-pointer pr-8"
                                            >
                                                <option value="FREE">Free Style</option>
                                                <option value="EMOM">EMOM</option>
                                                <option value="FOR TIME">For Time</option>
                                                <option value="ROUNDS FOR TIME">Rounds for Time</option>
                                                <option value="CHIPPER">Chipper</option>
                                                <option value="AMRAP">AMRAP</option>
                                                <option value="INTERVALS">Intervals</option>
                                                <option value="TABATA">Tabata</option>
                                                <option value="DEATH BY">Death By</option>
                                                <option value="STRENGTH">Fuerza (Sets x Reps)</option>
                                                <option value="QUALITY">Quality</option>
                                                <option value="REST">Rest</option>
                                            </select>
                                            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>

                                        {(block.format === 'AMRAP' || block.format === 'FOR TIME' || block.format === 'ROUNDS FOR TIME' || block.format === 'TABATA' || block.format === 'CHIPPER' || block.format === 'INTERVALS') && (
                                            <div className="flex items-end gap-2">
                                                {(block.format === 'ROUNDS FOR TIME' || block.format === 'TABATA' || block.format === 'INTERVALS') && (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Rounds</span>
                                                        <input
                                                            type="number"
                                                            value={block.config?.rounds || 1}
                                                            onChange={e => updateBlock(index, { config: { ...block.config, rounds: Math.max(1, parseInt(e.target.value) || 1) } })}
                                                            className="w-16 h-9 bg-background border border-border rounded-xl text-center text-sm font-black text-foreground focus:border-brand-red outline-none"
                                                        />
                                                    </div>
                                                )}

                                                {(block.format === 'TABATA' || block.format === 'INTERVALS') && (
                                                    <>
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Work</span>
                                                            <input type="text" value={block.config?.work || (block.format === 'INTERVALS' ? '3:00' : '20S')} onChange={e => updateBlock(index, { config: { ...block.config, work: e.target.value.toUpperCase() }})} className="w-16 h-9 bg-background border border-border rounded-xl text-center text-sm font-black text-foreground focus:border-brand-red outline-none" />
                                                        </div>
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Rest</span>
                                                            <input type="text" value={block.config?.rest || (block.format === 'INTERVALS' ? '1:00' : '10S')} onChange={e => updateBlock(index, { config: { ...block.config, rest: e.target.value.toUpperCase() }})} className="w-16 h-9 bg-background border border-border rounded-xl text-center text-sm font-black text-foreground focus:border-brand-red outline-none" />
                                                        </div>
                                                    </>
                                                )}

                                                {(block.format === 'AMRAP' || block.format === 'FOR TIME' || block.format === 'ROUNDS FOR TIME' || block.format === 'CHIPPER') && (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{block.format === 'CHIPPER' ? 'Time Cap (opcional)' : 'Time Cap'}</span>
                                                        <input
                                                            type="text"
                                                            value={block.config?.timecap || ''}
                                                            placeholder="20:00"
                                                            onChange={e => updateBlock(index, { config: { ...block.config, timecap: e.target.value } })}
                                                            className="w-16 h-9 bg-background border border-brand-red/30 rounded-xl text-center text-sm font-black text-brand-red focus:border-brand-red outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {block.format === 'STRENGTH' && (
                                            <div className="flex items-end gap-2">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Sets</span>
                                                    <input
                                                        type="number"
                                                        value={block.config?.sets || 5}
                                                        onChange={e => updateBlock(index, { config: { ...block.config, sets: Math.max(1, parseInt(e.target.value) || 1) } })}
                                                        className="w-14 h-9 bg-background border border-border rounded-xl text-center text-sm font-black text-foreground focus:border-brand-red outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Reps</span>
                                                    <input
                                                        type="text"
                                                        value={block.config?.reps || '5'}
                                                        placeholder="5 o 3-5"
                                                        onChange={e => updateBlock(index, { config: { ...block.config, reps: e.target.value } })}
                                                        className="w-16 h-9 bg-background border border-border rounded-xl text-center text-sm font-black text-foreground focus:border-brand-red outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Descanso</span>
                                                    <input
                                                        type="text"
                                                        value={block.config?.rest || '90S'}
                                                        onChange={e => updateBlock(index, { config: { ...block.config, rest: e.target.value.toUpperCase() } })}
                                                        className="w-16 h-9 bg-background border border-border rounded-xl text-center text-sm font-black text-foreground focus:border-brand-red outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {block.format === 'EMOM' && (
                                            <div className="flex items-end gap-2">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Cada</span>
                                                    <select
                                                        value={block.config?.frequency || '1 MIN'}
                                                        onChange={e => updateBlock(index, { config: { ...block.config, frequency: e.target.value } })}
                                                        className="h-9 bg-background border border-border rounded-xl px-2 text-center text-sm font-black text-foreground focus:border-brand-red outline-none appearance-none cursor-pointer"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6].map(n => (
                                                            <option key={n} value={`${n} MIN`}>{n}'</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Minutos totales</span>
                                                    <input
                                                        type="number"
                                                        value={block.config?.minutes || 12}
                                                        onChange={e => updateBlock(index, { config: { ...block.config, minutes: Math.max(1, parseInt(e.target.value) || 12) } })}
                                                        className="w-16 h-9 bg-background border border-brand-red/30 rounded-xl text-center text-sm font-black text-brand-red focus:border-brand-red outline-none"
                                                    />
                                                </div>
                                                {!!block.config?.minutes && (
                                                    (() => {
                                                        const minutes = block.config.minutes!;
                                                        const exCount = Math.max(1, block.exercises?.length || 1);
                                                        // "3 MIN" → 3. Cada ejercicio de la lista ocupa un slot de
                                                        // `freq` minutos antes de pasar al siguiente (con freq=1 eso
                                                        // es el EMOM clasico: 1 ejercicio por minuto). Una "ronda" es
                                                        // una vuelta completa a la lista, así que dura freq * exCount
                                                        // minutos — con 2 ejercicios a 1 min c/u son rondas de 2 min;
                                                        // con "E3MOM x5" (freq 3, 1 slot por ronda) son rondas de 3 min.
                                                        const freq = parseInt(block.config?.frequency || '1 MIN') || 1;
                                                        const minutesPerRound = freq * exCount;
                                                        const rounds = Math.floor(minutes / minutesPerRound);
                                                        const remainder = minutes - rounds * minutesPerRound;
                                                        return (
                                                            <div className={clsx("px-2 py-1.5 rounded-xl border animate-in fade-in duration-500 flex flex-col justify-center", remainder === 0 ? "bg-brand-red/10 border-brand-red/20" : "bg-yellow-500/10 border-yellow-500/30")}>
                                                                <p className={clsx("text-[10px] font-black uppercase italic leading-none", remainder === 0 ? "text-brand-red" : "text-yellow-500")}>
                                                                    {rounds} RONDAS {freq > 1 ? `(SLOTS DE ${freq}')` : ''}
                                                                </p>
                                                                {remainder > 0 && (
                                                                    <p className="text-[8px] font-bold text-yellow-500/70 leading-none mt-0.5">+{remainder} MIN EXTRA</p>
                                                                )}
                                                            </div>
                                                        )
                                                    })()
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mode Toggle */}
                                    <div className="flex bg-background rounded-lg p-1 border border-border shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => block.mode !== 'text' && toggleBlockMode(index)}
                                            className={clsx(
                                                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                                                (!block.mode || block.mode === 'text') ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Text
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => block.mode !== 'builder' && toggleBlockMode(index)}
                                            className={clsx(
                                                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                                                block.mode === 'builder' ? "bg-brand-red text-white" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Builder
                                        </button>
                                    </div>
                                </div>

                                {(!block.mode || block.mode === 'text') ? (
                                    <textarea
                                        value={block.content}
                                        onChange={(e) => updateBlock(index, { content: e.target.value })}
                                        placeholder="Workout details..."
                                        className="w-full h-32 bg-background border border-border rounded-lg p-3 text-foreground text-sm resize-none outline-none focus:border-brand-red font-heading font-medium tracking-tight"
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {block.exercises?.map((ex, exIndex) => {
                                            const hideSets = ['AMRAP', 'FOR TIME', 'EMOM', 'TABATA', 'CHIPPER', 'INTERVALS'].includes(block.format || '');
                                            return (
                                            <div key={ex.id} className="bg-background border border-border rounded-xl p-3 sm:px-4 sm:py-3 animate-in slide-in-from-left-2 duration-200 hover:border-brand-red/30 transition-all flex flex-col gap-2 group relative">
                                                
                                                {/* Top Row: Reorder & Name */}
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 bg-muted/30 border border-transparent rounded-lg px-2 py-1.5 focus-within:border-brand-red/50 focus-within:bg-background transition-all">
                                                            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            <input
                                                                placeholder="Buscar ejercicio..."
                                                                value={ex.name}
                                                                onFocus={() => setActiveExercisePath({ bIdx: index, eIdx: exIndex })}
                                                                onChange={(e) => {
                                                                    updateExercise(index, exIndex, { name: e.target.value });
                                                                    setSearchQuery(e.target.value);
                                                                }}
                                                                className="flex-1 bg-transparent border-none text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/60 min-w-0"
                                                            />
                                                        </div>

                                                        {/* Suggestions Dropdown */}
                                                        {activeExercisePath?.bIdx === index && activeExercisePath?.eIdx === exIndex && searchQuery && (
                                                            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto overflow-x-hidden backdrop-blur-xl">
                                                                {catalogExercises.filter(ce => ce.toLowerCase().includes(searchQuery.toLowerCase())).map((ce, i) => (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updateExercise(index, exIndex, { name: ce });
                                                                            setActiveExercisePath(null);
                                                                            setSearchQuery("");
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-xs text-foreground/70 hover:text-foreground hover:bg-muted border-b border-border last:border-0 transition-colors"
                                                                    >
                                                                        {ce}
                                                                    </button>
                                                                ))}
                                                                {!catalogExercises.some(ce => ce.toLowerCase() === searchQuery.toLowerCase()) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSaveNewExercise(searchQuery, index, exIndex)}
                                                                        disabled={isSavingExercise}
                                                                        className="w-full text-left px-4 py-3 text-xs font-black text-brand-red hover:bg-brand-red/10 border-t border-border transition-colors uppercase italic flex items-center justify-between"
                                                                    >
                                                                        <span>{isSavingExercise ? 'Guardando...' : `+ Añadir "${searchQuery}" a la librería`}</span>
                                                                        {!isSavingExercise && <Plus className="w-3 h-3" />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <label className={clsx(
                                                            "w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer transition-all",
                                                            (ex.media_url || exerciseFiles[block.id]?.[ex.id])
                                                                ? "bg-brand-red/10 border-brand-red text-brand-red"
                                                                : "bg-transparent border-transparent text-muted-foreground hover:bg-muted"
                                                        )} title="Adjuntar Vídeo/Imagen">
                                                            {(ex.media_url || exerciseFiles[block.id]?.[ex.id]) ? <Check className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                                                            <input
                                                                type="file"
                                                                accept="image/*,video/*"
                                                                className="hidden"
                                                                onChange={(e) => handleExerciseFileSelect(block.id, ex.id, e)}
                                                            />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeExercise(index, exIndex)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                            title="Eliminar línea"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Bottom Row: Programming Fields */}
                                                <div className="flex flex-wrap items-end gap-2 sm:gap-4 pl-0 sm:pl-8">
                                                    
                                                    {/* Sets (Hidden for AMRAP/ForTime) */}
                                                    {!hideSets && (
                                                        <div className="flex flex-col gap-1 w-16 shrink-0">
                                                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest px-1">Sets</span>
                                                            <input
                                                                value={ex.sets || ''}
                                                                onChange={(e) => updateExercise(index, exIndex, { sets: e.target.value })}
                                                                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs font-black text-center text-foreground focus:border-brand-red outline-none transition-colors"
                                                                placeholder="Ej: 4"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Reps & Unit */}
                                                    <div className="flex flex-col gap-1 w-28 sm:w-32 shrink-0">
                                                        <span className="text-[9px] uppercase font-bold text-brand-red tracking-widest px-1">Reps/Dist</span>
                                                        <div className="flex items-center bg-brand-red/5 border border-brand-red/30 rounded-lg overflow-hidden focus-within:border-brand-red transition-colors">
                                                            <input
                                                                value={ex.reps || ''}
                                                                onChange={(e) => updateExercise(index, exIndex, { reps: e.target.value })}
                                                                className="w-full bg-transparent px-2 py-1.5 text-xs font-black text-foreground outline-none min-w-0"
                                                                placeholder="Ej: 10"
                                                            />
                                                            <select
                                                                value={ex.repUnit || 'reps'}
                                                                onChange={(e) => updateExercise(index, exIndex, { repUnit: e.target.value })}
                                                                className="bg-transparent border-l border-brand-red/20 py-1.5 px-1 text-[10px] font-bold text-brand-red outline-none cursor-pointer appearance-none text-center"
                                                            >
                                                                <option value="reps">reps</option>
                                                                <option value="m">m</option>
                                                                <option value="km">km</option>
                                                                <option value="cal">cal</option>
                                                                <option value="seg">seg</option>
                                                                <option value="min">min</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Peso & Unit */}
                                                    <div className="flex flex-col gap-1 w-28 sm:w-32 shrink-0">
                                                        <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest px-1">Peso/Obj</span>
                                                        <div className="flex items-center bg-background border border-border rounded-lg overflow-hidden focus-within:border-brand-red transition-colors">
                                                            <input
                                                                value={ex.value || ''}
                                                                onChange={(e) => updateExercise(index, exIndex, { value: e.target.value })}
                                                                className="w-full bg-transparent px-2 py-1.5 text-xs font-black text-foreground outline-none min-w-0"
                                                                placeholder="Ej: 40"
                                                            />
                                                            <select
                                                                value={ex.weightUnit || 'kg'}
                                                                onChange={(e) => updateExercise(index, exIndex, { weightUnit: e.target.value })}
                                                                className="bg-transparent border-l border-border py-1.5 px-1 text-[10px] font-bold text-muted-foreground outline-none cursor-pointer appearance-none text-center"
                                                            >
                                                                <option value="kg">kg</option>
                                                                <option value="lb">lb</option>
                                                                <option value="%RM">%RM</option>
                                                                <option value="RPE">RPE</option>
                                                                <option value="BW">BW</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Note Field (Optional visual) */}
                                                    <div className="flex-1 min-w-[120px]">
                                                        <input
                                                            value={ex.note || ''}
                                                            onChange={(e) => updateExercise(index, exIndex, { note: e.target.value })}
                                                            className="w-full bg-transparent border-b border-dashed border-border/50 px-1 py-1.5 text-[10px] italic text-muted-foreground focus:border-brand-red outline-none transition-colors"
                                                            placeholder="Añadir nota (ej. unbroken, touch&go...)"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )})}
                                        <button
                                            type="button"
                                            onClick={() => addExercise(index)}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-brand-red/50 hover:bg-brand-red/5 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                            <span className="text-xs font-black uppercase tracking-widest">Añadir Línea de Ejercicio</span>
                                        </button>
                                    </div>
                                )}

                                {/* Block Media Controls */}
                                <div className="pt-2 border-t border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
                                            <ImageIcon className="w-3 h-3" /> Attach Media (Entire Block)
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*,video/*"
                                                className="hidden"
                                                onChange={(e) => handleBlockFileSelect(block.id, e)}
                                            />
                                        </label>
                                    </div>

                                    {/* Preview Files */}
                                    <div className="flex flex-wrap gap-2">
                                        {/* Existing Media */}
                                        {block.media_urls?.map((url, i) => (
                                            <div key={`existing-${i}`} className="w-12 h-12 bg-muted rounded border border-border relative group overflow-hidden">
                                                <img src={url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingBlockMedia(index, url)}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* New Files */}
                                        {blockFiles[block.id]?.map((file, i) => (
                                            <div key={`new-${i}`} className="w-12 h-12 bg-blue-900/20 rounded border border-blue-500/30 relative group overflow-hidden">
                                                <div className="w-full h-full flex items-center justify-center text-[8px] uppercase font-bold text-blue-400">NEW</div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeBlockFile(block.id, i)}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowAddPartMenu(!showAddPartMenu)}
                                className="w-full py-4 border border-dashed border-border rounded-xl text-xs font-black text-foreground uppercase tracking-widest hover:text-white hover:border-brand-red/50 hover:bg-brand-red/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Añadir Parte al WOD
                            </button>

                            {showAddPartMenu && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-2xl z-[150] p-2 overflow-hidden flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-2 border-b border-border mb-1 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Selecciona el Tipo</span>
                                        <button onClick={() => setShowAddPartMenu(false)}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                                    </div>
                                    <button type="button" onClick={() => { addBlock('weightlifting'); setShowAddPartMenu(false); }} className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Fuerza / Weightlifting
                                    </button>
                                    <button type="button" onClick={() => { addBlock('metcon'); setShowAddPartMenu(false); }} className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-red"></div> Metcon / WOD
                                    </button>
                                    <button type="button" onClick={() => { addBlock('gymnastics'); setShowAddPartMenu(false); }} className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div> Gymnastics / Skill
                                    </button>
                                    <button type="button" onClick={() => { addBlock('endurance'); setShowAddPartMenu(false); }} className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div> Endurance / Hyrox
                                    </button>
                                    <button type="button" onClick={() => { addBlock('mobility'); setShowAddPartMenu(false); }} className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Movilidad / Finisher
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section: Summary / Goal */}
                        <div className="bg-brand-red/5 border border-brand-red/20 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center gap-2 text-foreground">
                                <Trophy className="w-4 h-4 text-brand-red" />
                                <span className="text-xs font-black uppercase italic tracking-tighter">WOD Summary & Goal</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Time</label>
                                    <input
                                        type="text"
                                        value={summary.totalTime}
                                        onChange={(e) => setSummary({ ...summary, totalTime: e.target.value.toUpperCase() })}
                                        placeholder="Ej: 60:00"
                                        className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground text-xs font-bold outline-none focus:border-brand-red"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Score Type</label>
                                    <select
                                        value={summary.scoreType}
                                        onChange={(e) => setSummary({ ...summary, scoreType: e.target.value as any })}
                                        className="w-full bg-background border border-border rounded-xl p-2.5 text-brand-red text-xs font-bold outline-none focus:border-brand-red cursor-pointer"
                                    >
                                        <option value="TIME">TIME</option>
                                        <option value="REPS">REPS</option>
                                        <option value="WEIGHT">WEIGHT</option>
                                        <option value="ROUNDS">ROUNDS</option>
                                        <option value="CALORIES">CALORIES</option>
                                        <option value="OTHER">OTHER</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Score Label / Target</label>
                                <input
                                    type="text"
                                    value={summary.scoreLabel}
                                    onChange={(e) => setSummary({ ...summary, scoreLabel: e.target.value.toUpperCase() })}
                                    placeholder="Ej: PR: 21:05 / RX: 43KG"
                                    className="w-full bg-background border border-border rounded-xl p-2.5 text-foreground text-xs font-bold outline-none focus:border-brand-red"
                                />
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Programar Publicación</label>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="relative group/date">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover/date:text-brand-red transition-colors" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        onClick={(e) => {
                                            try { (e.target as any).showPicker(); } catch (err) { }
                                        }}
                                        className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-foreground outline-none focus:border-brand-red text-sm cursor-pointer"
                                    />
                                </div>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-foreground outline-none focus:border-brand-red text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden">
                                        {postAsCenter ? (
                                            center?.logo_url ? <img src={center.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-red/20" />
                                        ) : (
                                            center?.head_coach?.avatar_url ? <img src={center.head_coach.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-500/20" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-foreground uppercase italic">{postAsCenter ? center?.name : 'Tu Perfil (Coach)'}</p>
                                        <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">{postAsCenter ? 'Perfil del Centro' : 'Publicación Personal'}</p>
                                    </div>
                                </div>
                                {canPostAsCenter && (
                                    <button
                                        type="button"
                                        onClick={() => setPostAsCenter(!postAsCenter)}
                                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${postAsCenter ? 'bg-brand-red' : 'bg-muted-foreground/30'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${postAsCenter ? 'translate-x-5' : ''}`} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isPosting}
                                className="w-full bg-brand-red text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {isPosting ? 'Saving...' : (editingId ? 'Save Changes' : 'Publish WOD')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* WOD Feed Display */}
            <div className="lg:col-span-2 space-y-6">
                {
                    posts.map((post: any) => {
                        // Try parsing content if it's JSON
                        let wodData;
                        try {
                            wodData = JSON.parse(post.content);
                        } catch {
                            // Fallback for old string content
                            wodData = { workout: post.content };
                        }

                        const isExpanded = expandedPosts[post.id];
                        const isFuture = new Date(post.scheduled_for) > new Date();

                        return (
                            <div key={post.id} className={`bg-card border rounded-2xl overflow-hidden animate-fade-in text-left transition-all ${isFuture ? 'border-brand-red/30 bg-brand-red/[0.02]' : 'border-border'}`}>
                                {/* Header / Toggle Button */}
                                <button
                                    onClick={() => togglePost(post.id)}
                                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                                            {post.post_as_center ? (
                                                center?.logo_url ? <img src={center.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-red/20" />
                                            ) : (
                                                post.author?.avatar_url ? <img src={post.author.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-red/20" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap min-w-0">
                                                <h4 className="text-foreground font-black italic uppercase text-sm sm:text-base tracking-tighter truncate min-w-0">
                                                    <span className="hidden sm:inline">ENTRENAMIENTO - </span>{new Date(post.scheduled_for || post.created_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </h4>
                                                {isFuture && (
                                                    <span className="flex items-center gap-1.5 bg-brand-red text-white text-[8px] font-black italic px-2.5 py-1 rounded-lg shadow-lg shadow-brand-red/20 border border-white/10">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        PROGRAMADO
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase flex items-center gap-2">
                                                {post.post_as_center ? (center?.name || 'Centro') : (post.author?.full_name || 'Coach')}
                                                {isFuture && <span>• {new Date(post.scheduled_for).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}hs</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-2 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); downloadWod(post); }}
                                                className="p-2 bg-muted rounded-full text-muted-foreground hover:text-brand-red transition-colors"
                                                title="Descargar entrenamiento"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                                                className="p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                className="p-2 bg-muted rounded-full text-muted-foreground hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Collapsible Content */}
                                {isExpanded && (
                                    <div className="p-5 sm:p-8 pt-0 animate-in slide-in-from-top-4 duration-300">
                                        <div className="border-t border-border pt-6 space-y-4">
                                            {wodData.warmup && (
                                                <div className="bg-muted/20 rounded-2xl border border-border overflow-hidden">
                                                    <button
                                                        onClick={() => toggleInternalBlock(post.id, 'warmup')}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                                    >
                                                        <h5 className="text-brand-red font-heading font-black text-xs uppercase tracking-widest flex items-center gap-2 italic">
                                                            <span className="w-2 h-2 rounded-full bg-brand-red"></span> Warm Up
                                                        </h5>
                                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedBlocks[post.id]?.['warmup'] ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {expandedBlocks[post.id]?.['warmup'] && (
                                                        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="text-foreground/70 text-sm whitespace-pre-wrap font-medium leading-relaxed pl-4 border-l-2 border-border">
                                                                {wodData.warmup}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Render Blocks */}
                                            {(wodData.blocks || []).map((block: WodBlock, idx: number) => {
                                                const blockKey = `block-${idx}`;
                                                const isBlockExpanded = expandedBlocks[post.id]?.[blockKey];

                                                return (
                                                    <div key={idx} className="bg-muted/20 rounded-2xl border border-border overflow-hidden">
                                                        <button
                                                            onClick={() => toggleInternalBlock(post.id, blockKey)}
                                                            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <h5 className="text-foreground font-heading font-black text-xs uppercase tracking-widest flex items-center gap-2 italic">
                                                                    <span className={`w-2 h-2 rounded-full ${block.type === 'metcon' ? 'bg-brand-red' : block.type === 'weightlifting' ? 'bg-blue-500' : 'bg-muted-foreground'}`}></span>
                                                                    <span className="text-muted-foreground mr-1">Part {String.fromCharCode(65 + idx)}:</span> 
                                                                    {PART_NAMES[block.type] || (block.type ? block.type.toUpperCase() : 'LIBRE')}

                                                                    {/* Display Config Info */}
                                                                    {(block.config?.timecap || block.config?.rounds || block.config?.minutes || block.config?.sets || block.duration) && (
                                                                        <span className="ml-1 text-brand-red text-[10px] font-black uppercase tracking-widest opacity-80 italic">
                                                                            {block.format === 'ROUNDS FOR TIME' ? (
                                                                                `${block.config?.rounds || '?'} RDS ${block.config?.timecap ? `(CAP: ${block.config.timecap})` : ''}`
                                                                            ) : block.format === 'EMOM' || block.format === 'DEATH BY' ? (
                                                                                `${block.config?.minutes || '?'} MINS (${block.config?.frequency || '1 MIN'})`
                                                                            ) : block.format === 'TABATA' || block.format === 'INTERVALS' ? (
                                                                                `${block.config?.rounds || '?'} RDS (${block.config?.work || '20S'}/${block.config?.rest || '10S'})`
                                                                            ) : block.format === 'STRENGTH' ? (
                                                                                `${block.config?.sets || '?'}x${block.config?.reps || '?'} (DESCANSO ${block.config?.rest || '90S'})`
                                                                            ) : (block.config?.timecap || block.duration) ? (
                                                                                `CAP: ${block.config?.timecap || block.duration}`
                                                                            ) : null}
                                                                        </span>
                                                                    )}
                                                                </h5>
                                                            </div>
                                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isBlockExpanded ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {isBlockExpanded && (
                                                            <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <div className="bg-muted/20 rounded-xl p-4 border border-border mb-4 shadow-inner">
                                                                    {(() => {
                                                                        const lines = (block.exercises && block.exercises.length > 0)
                                                                            ? block.exercises
                                                                            : (block.content || '').split('\n').filter(l => l.trim());

                                                                        if (lines.length === 0) return <p className="text-muted-foreground text-xs italic">No hay ejercicios registrados</p>;

                                                                        return (
                                                                            <div className="space-y-2">
                                                                                {lines.map((item: any, i: number) => {
                                                                                    let text;
                                                                                    if (typeof item === 'string') {
                                                                                        text = item;
                                                                                    } else {
                                                                                        const prefix = [item.sets, item.reps].filter(Boolean).join('x');
                                                                                        const suffix = item.value ? `@ ${item.value}` : '';
                                                                                        text = `${prefix ? prefix + ' ' : ''}${item.name} ${suffix}`.trim();
                                                                                    }
                                                                                    return (
                                                                                        <div key={i} className="flex items-center gap-2 text-foreground/70 text-sm font-medium pl-2 border-l border-border">
                                                                                            <div className="w-1 h-1 rounded-full bg-brand-red" />
                                                                                            {text}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                {/* Block Media Display */}
                                                                {block.media_urls && block.media_urls.length > 0 && (
                                                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                                                        {block.media_urls.map((url, i) => (
                                                                            <div key={i} className="rounded-lg overflow-hidden border border-border bg-muted aspect-video relative group cursor-pointer hover:border-border/60">
                                                                                {url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                                                                        <Video className="w-6 h-6 text-muted-foreground" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <img src={url} className="w-full h-full object-cover" />
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Fallback for old 'workout' field */}
                                            {wodData.workout && !wodData.blocks && (
                                                <div className="bg-muted/20 rounded-2xl border border-border overflow-hidden">
                                                    <div className="p-4">
                                                        <h5 className="text-foreground font-heading text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-foreground"></span> WOD
                                                        </h5>
                                                        <div className="whitespace-pre-wrap font-accent font-semibold text-sm sm:text-lg tracking-tight leading-relaxed text-foreground">
                                                            {wodData.workout}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                }

                {
                    posts.length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
                            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No WODs scheduled.</p>
                        </div>
                    )
                }
            </div >
        </div >
    )
}
