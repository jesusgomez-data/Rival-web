"use client";

import { useState, useRef } from "react";
import { Plus, Minus, Trash2, FileText, Image as ImageIcon, X, Video, ChevronDown, Check, Edit2, Search, Clock, Trophy, Calendar } from "lucide-react";
import { createWod, updateWod, addExerciseToCatalog } from "../../wod-actions";
import { getExercises } from "../../actions";
import { deletePost } from "../../feed-actions";
import clsx from "clsx";
import { useTheme } from "../../../../ThemeContext";

type BlockType = 'strength' | 'wod' | 'skill' | 'other';
type BlockFormat = 'EMOM' | 'AMRAP' | 'FOR TIME' | 'INTERVALS' | 'TABATA' | 'QUALITY' | 'REST' | 'DEATH BY' | 'FREE' | 'ROUNDS FOR TIME';

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
        frequency?: string;
        minutes?: number;
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
    value?: string;
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

    // Initial Load
    useState(() => {
        const fetchCatalog = async () => {
            const exData = await getExercises('cross_training'); // Default for WOD manager
            if (exData) {
                const names = exData.map((e: any) => e.name);
                setCatalogExercises(Array.from(new Set([...COMMON_EXERCISES, ...names])).sort());
            }
        };
        fetchCatalog();
    });

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
                    type: 'wod',
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
        if (editingId) {
            res = await updateWod(centerId, editingId, formData);
        } else {
            res = await createWod(centerId, formData);
        }

        setIsPosting(false);

        if (res.error) {
            alert(res.error);
        } else {
            resetForm();
            // Reload posts (simple reload for now)
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

    const addBlock = () => {
        setBlocks([...blocks, {
            id: Math.random().toString(36).substr(2, 9),
            type: 'wod',
            format: 'FREE',
            config: { timecap: '20:00' },
            content: "",
            mode: 'text',
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
        const newBlocks = [...blocks];
        if (!newBlocks[blockIndex].exercises) newBlocks[blockIndex].exercises = [];
        newBlocks[blockIndex].exercises!.push({
            id: Math.random().toString(36).substr(2, 9),
            name: '',
        });
        setBlocks(newBlocks);
    };

    const updateExercise = (blockIndex: number, exIndex: number, updates: Partial<WodExercise>) => {
        const newBlocks = [...blocks];
        if (newBlocks[blockIndex].exercises && newBlocks[blockIndex].exercises![exIndex]) {
            newBlocks[blockIndex].exercises![exIndex] = { ...newBlocks[blockIndex].exercises![exIndex], ...updates };
            setBlocks(newBlocks);
        }
    };

    const removeExercise = (blockIndex: number, exIndex: number) => {
        const newBlocks = [...blocks];
        const blockId = newBlocks[blockIndex].id;
        const exId = newBlocks[blockIndex].exercises![exIndex].id;

        newBlocks[blockIndex].exercises = newBlocks[blockIndex].exercises!.filter((_, i) => i !== exIndex);
        setBlocks(newBlocks);

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
        const newBlocks = [...blocks];
        const block = newBlocks[index];
        const newMode = block.mode === 'builder' ? 'text' : 'builder';

        if (newMode === 'builder') {
            // Convert Text to Exercises
            const lines = block.content.split('\n').filter(l => l.trim());
            if ((!block.exercises || block.exercises.length === 0) && lines.length > 0) {
                block.exercises = lines.map(line => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: line
                }));
            } else if (!block.exercises) {
                block.exercises = [{ id: Math.random().toString(36).substr(2, 9), name: '' }];
            }
        } else {
            // Convert Exercises to Text (if text is empty)
            if (!block.content.trim() && block.exercises && block.exercises.length > 0) {
                block.content = block.exercises.map(ex => {
                    let line = ex.name;
                    if (ex.sets || ex.reps) line += ` (${ex.sets || '?'} x ${ex.reps || '?'})`;
                    if (ex.value) line += ` @ ${ex.value}`;
                    return line;
                }).join('\n');
            }
        }

        block.mode = newMode;
        setBlocks(newBlocks);
    };

    const handleSaveNewExercise = async (name: string, bIdx: number, exIdx: number) => {
        if (!name.trim()) return;
        setIsSavingExercise(true);
        const res = await addExerciseToCatalog(name.toUpperCase());
        setIsSavingExercise(false);

        if (res.success) {
            setCatalogExercises(prev => Array.from(new Set([...prev, name.toUpperCase()])).sort());
            updateExercise(bIdx, exIdx, { name: name.toUpperCase() });
            setActiveExercisePath(null);
            setSearchQuery("");
        } else {
            alert("Error al guardar ejercicio: " + res.error);
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

    return (
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Create/Edit Form */}
            <div className="lg:col-span-1">
                <div className="bg-brand-gray border border-white/5 rounded-2xl p-4 sm:p-6 sticky top-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black text-white italic uppercase">{editingId ? 'Edit WOD' : 'Publish WOD'}</h3>
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
                                        className="text-[10px] font-black text-white/40 hover:text-brand-red uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 transition-all flex items-center gap-1.5"
                                    >
                                        <Trophy className="w-3 h-3" />
                                        Cargar Benchmark
                                    </button>

                                    {showBenchmarks && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-brand-gray border border-white/10 rounded-xl shadow-2xl z-[150] p-1 overflow-hidden backdrop-blur-2xl">
                                            <div className="p-2 border-b border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Seleccionar Benchmark</span>
                                                <button onClick={() => setShowBenchmarks(false)}><X className="w-3 h-3 text-gray-600" /></button>
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
                                                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors uppercase italic"
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
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand-red focus:bg-black/60 outline-none text-sm font-black italic uppercase transition-colors"
                            />
                        </div>

                        {/* Section 1: Warm Up */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-brand-red uppercase tracking-widest">Warm Up</label>
                            <textarea
                                value={warmup}
                                onChange={(e) => setWarmup(e.target.value)}
                                placeholder="Warm up details..."
                                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand-red focus:bg-black/60 outline-none text-sm resize-none transition-colors"
                            />
                        </div>

                        {/* Dynamic Blocks */}
                        {blocks.map((block, index) => (
                            <div key={block.id} className="space-y-3 relative group p-3 sm:p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors animate-fade-in">
                                <button
                                    type="button"
                                    onClick={() => removeBlock(index)}
                                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                                                    else if (newFormat === 'FOR TIME') newConfig = { timecap: '' };
                                                    else if (newFormat === 'ROUNDS FOR TIME') newConfig = { rounds: 5, timecap: '20:00' };
                                                    else if (newFormat === 'TABATA') newConfig = { rounds: 8, work: '20S', rest: '10S' };

                                                    updateBlock(index, { format: newFormat, config: newConfig });
                                                }}
                                                className="appearance-none bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-red focus:border-brand-red outline-none cursor-pointer pr-8"
                                            >
                                                <option value="FREE">Free Style</option>
                                                <option value="EMOM">EMOM</option>
                                                <option value="FOR TIME">For Time</option>
                                                <option value="ROUNDS FOR TIME">Rounds for Time</option>
                                                <option value="AMRAP">AMRAP</option>
                                                <option value="INTERVALS">Intervals</option>
                                                <option value="TABATA">Tabata</option>
                                                <option value="DEATH BY">Death By</option>
                                                <option value="QUALITY">Quality</option>
                                                <option value="REST">Rest</option>
                                            </select>
                                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>

                                        {(block.format === 'AMRAP' || block.format === 'FOR TIME' || block.format === 'ROUNDS FOR TIME') && (
                                            <div className="flex gap-2">
                                                {block.format === 'ROUNDS FOR TIME' && (
                                                    <input
                                                        type="number"
                                                        value={block.config?.rounds || ''}
                                                        onChange={(e) => updateBlock(index, { config: { ...block.config, rounds: parseInt(e.target.value) || 0 } })}
                                                        placeholder="Rounds"
                                                        className="w-16 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-brand-red outline-none placeholder-gray-600 font-bold"
                                                    />
                                                )}
                                                <input
                                                    value={block.config?.timecap || ''}
                                                    onChange={(e) => updateBlock(index, { config: { ...block.config, timecap: e.target.value } })}
                                                    placeholder="Time Cap"
                                                    className="w-24 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-brand-red outline-none placeholder-gray-600 font-bold"
                                                />
                                            </div>
                                        )}

                                        {block.format === 'EMOM' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={block.config?.minutes || ''}
                                                    onChange={(e) => updateBlock(index, { config: { ...block.config, minutes: parseInt(e.target.value) || 0 } })}
                                                    placeholder="Mins"
                                                    className="w-16 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-brand-red outline-none placeholder-gray-600 font-bold"
                                                />
                                                <input
                                                    value={block.config?.frequency || '1 MIN'}
                                                    onChange={(e) => updateBlock(index, { config: { ...block.config, frequency: e.target.value } })}
                                                    placeholder="Freq"
                                                    className="w-20 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-brand-red outline-none placeholder-gray-600 font-bold"
                                                />
                                                {block.config?.minutes && (block.exercises?.length || 0) > 0 && (
                                                    <div className="px-2 py-1 bg-brand-red/10 rounded-lg border border-brand-red/20 animate-in fade-in duration-500">
                                                        <p className="text-[10px] font-black text-brand-red uppercase italic leading-none">{block.config.minutes} RONDAS TOTALES</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mode Toggle */}
                                    <div className="flex bg-black/50 rounded-lg p-1 border border-white/10 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => block.mode !== 'text' && toggleBlockMode(index)}
                                            className={clsx(
                                                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                                                (!block.mode || block.mode === 'text') ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
                                            )}
                                        >
                                            Text
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => block.mode !== 'builder' && toggleBlockMode(index)}
                                            className={clsx(
                                                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all",
                                                block.mode === 'builder' ? "bg-brand-red text-white" : "text-gray-500 hover:text-white"
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
                                        className="w-full h-32 bg-black/40 border-0 rounded-lg p-3 text-white text-sm resize-none focus:ring-1 ring-white/20 font-heading font-medium tracking-tight"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {block.exercises?.map((ex, exIndex) => (
                                            <div key={ex.id} className="bg-black/60 border border-white/5 rounded-2xl p-3 sm:p-4 space-y-4 animate-in slide-in-from-left-2 duration-200">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 group-focus-within:border-brand-red transition-all">
                                                            <Search className="w-4 h-4 text-gray-500 shrink-0" />
                                                            <input
                                                                placeholder="Ejercicio..."
                                                                value={ex.name}
                                                                onFocus={() => setActiveExercisePath({ bIdx: index, eIdx: exIndex })}
                                                                onChange={(e) => {
                                                                    updateExercise(index, exIndex, { name: e.target.value });
                                                                    setSearchQuery(e.target.value);
                                                                }}
                                                                className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none placeholder-gray-600 min-w-0"
                                                            />
                                                        </div>

                                                        {/* Suggestions Dropdown */}
                                                        {activeExercisePath?.bIdx === index && activeExercisePath?.eIdx === exIndex && searchQuery && (
                                                            <div className="absolute left-0 right-0 top-full mt-2 bg-brand-gray border border-white/10 rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto overflow-x-hidden backdrop-blur-xl">
                                                                {catalogExercises.filter(ce => ce.toLowerCase().includes(searchQuery.toLowerCase())).map((ce, i) => (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updateExercise(index, exIndex, { name: ce });
                                                                            setActiveExercisePath(null);
                                                                            setSearchQuery("");
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                                                                    >
                                                                        {ce}
                                                                    </button>
                                                                ))}
                                                                {!catalogExercises.some(ce => ce.toLowerCase() === searchQuery.toLowerCase()) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSaveNewExercise(searchQuery, index, exIndex)}
                                                                        disabled={isSavingExercise}
                                                                        className="w-full text-left px-4 py-3 text-xs font-black text-brand-red hover:bg-brand-red/10 border-t border-white/10 transition-colors uppercase italic flex items-center justify-between"
                                                                    >
                                                                        <span>{isSavingExercise ? 'Guardando...' : `+ Añadir "${searchQuery}" a la librería`}</span>
                                                                        {!isSavingExercise && <Plus className="w-3 h-3" />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <label className={clsx(
                                                            "w-10 h-10 flex items-center justify-center rounded-xl border cursor-pointer transition-all",
                                                            (ex.media_url || exerciseFiles[block.id]?.[ex.id])
                                                                ? "bg-brand-red border-brand-red text-white shadow-glow"
                                                                : "bg-black/40 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
                                                        )}>
                                                            {(ex.media_url || exerciseFiles[block.id]?.[ex.id]) ? <Check className="w-4 h-4" /> : <Video className="w-4 h-4" />}
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
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    {/* Sets */}
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest ml-1">Sets</span>
                                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-xl p-1 border border-white/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = parseInt(ex.sets || '0');
                                                                    updateExercise(index, exIndex, { sets: Math.max(0, current - 1).toString() });
                                                                }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 active:scale-90 transition-transform"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <input
                                                                value={ex.sets || ''}
                                                                onChange={(e) => updateExercise(index, exIndex, { sets: e.target.value })}
                                                                className="w-full bg-transparent text-center text-base font-black text-white outline-none placeholder-gray-800"
                                                                placeholder="0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = parseInt(ex.sets || '0');
                                                                    updateExercise(index, exIndex, { sets: (current + 1).toString() });
                                                                }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-brand-red active:scale-95 transition-transform"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Reps */}
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest ml-1">Reps</span>
                                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-xl p-1 border border-brand-red/40 shadow-glow shadow-brand-red/5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = parseInt(ex.reps || '0');
                                                                    updateExercise(index, exIndex, { reps: Math.max(0, current - 1).toString() });
                                                                }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 active:scale-90 transition-transform"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <input
                                                                value={ex.reps || ''}
                                                                onChange={(e) => updateExercise(index, exIndex, { reps: e.target.value })}
                                                                className="w-full bg-transparent text-center text-lg font-black text-white outline-none placeholder-gray-800"
                                                                placeholder="0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = parseInt(ex.reps || '0');
                                                                    updateExercise(index, exIndex, { reps: (current + 1).toString() });
                                                                }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-brand-red active:scale-95 transition-transform"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Charge */}
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest ml-1">Carga</span>
                                                        <div className="flex items-center gap-0.5 bg-black/40 rounded-xl p-1 border border-white/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = parseFloat(ex.value || '0');
                                                                    updateExercise(index, exIndex, { value: (Math.max(0, current - 2.5)).toString() });
                                                                }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 active:scale-90 transition-transform"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <input
                                                                value={ex.value || ''}
                                                                onChange={(e) => updateExercise(index, exIndex, { value: e.target.value })}
                                                                className="w-full bg-transparent text-center text-base font-black text-white outline-none placeholder-gray-800"
                                                                placeholder="0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = parseFloat(ex.value || '0');
                                                                    updateExercise(index, exIndex, { value: (current + 2.5).toString() });
                                                                }}
                                                                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-brand-red active:scale-95 transition-transform"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addExercise(index)}
                                            className="w-full py-4 rounded-xl border-2 border-dashed border-white/10 text-gray-500 hover:text-white hover:border-brand-red/50 hover:bg-brand-red/5 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                            <span className="text-xs font-black uppercase tracking-widest">Añadir Línea de Ejercicio</span>
                                        </button>
                                    </div>
                                )}

                                {/* Block Media Controls */}
                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="cursor-pointer flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide hover:text-white transition-colors">
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
                                            <div key={`existing-${i}`} className="w-12 h-12 bg-black rounded border border-white/10 relative group overflow-hidden">
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

                        <button
                            type="button"
                            onClick={addBlock}
                            className="w-full py-3 border border-dashed border-white/20 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Block
                        </button>

                        {/* Section: Summary / Goal */}
                        <div className="bg-brand-red/5 border border-brand-red/20 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center gap-2 text-white">
                                <Trophy className="w-4 h-4 text-brand-red" />
                                <span className="text-xs font-black uppercase italic tracking-tighter">WOD Summary & Goal</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Estimated Time</label>
                                    <input
                                        type="text"
                                        value={summary.totalTime}
                                        onChange={(e) => setSummary({ ...summary, totalTime: e.target.value.toUpperCase() })}
                                        placeholder="Ej: 60:00"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold outline-none focus:border-brand-red"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Score Type</label>
                                    <select
                                        value={summary.scoreType}
                                        onChange={(e) => setSummary({ ...summary, scoreType: e.target.value as any })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-brand-red text-xs font-bold outline-none focus:border-brand-red cursor-pointer"
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
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Score Label / Target</label>
                                <input
                                    type="text"
                                    value={summary.scoreLabel}
                                    onChange={(e) => setSummary({ ...summary, scoreLabel: e.target.value.toUpperCase() })}
                                    placeholder="Ej: PR: 21:05 / RX: 43KG"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs font-bold outline-none focus:border-brand-red"
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-4">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Programar Publicación</label>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="relative group/date">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover/date:text-brand-red transition-colors" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        onClick={(e) => {
                                            try { (e.target as any).showPicker(); } catch (err) { }
                                        }}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-red text-sm cursor-pointer"
                                    />
                                </div>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-red text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-xl mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 overflow-hidden">
                                        {postAsCenter ? (
                                            center?.logo_url ? <img src={center.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-red/20" />
                                        ) : (
                                            center?.head_coach?.avatar_url ? <img src={center.head_coach.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-500/20" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase italic">{postAsCenter ? center?.name : 'Tu Perfil (Coach)'}</p>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{postAsCenter ? 'Perfil del Centro' : 'Publicación Personal'}</p>
                                    </div>
                                </div>
                                {canPostAsCenter && (
                                    <button
                                        type="button"
                                        onClick={() => setPostAsCenter(!postAsCenter)}
                                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${postAsCenter ? 'bg-brand-red' : 'bg-gray-700'}`}
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
                            <div key={post.id} className={`bg-brand-gray border rounded-2xl overflow-hidden animate-fade-in text-left transition-all ${isFuture ? 'border-brand-red/30 bg-brand-red/[0.02]' : 'border-white/5'}`}>
                                {/* Header / Toggle Button */}
                                <button
                                    onClick={() => togglePost(post.id)}
                                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden shrink-0">
                                            {post.post_as_center ? (
                                                center?.logo_url ? <img src={center.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-red/20" />
                                            ) : (
                                                post.author?.avatar_url ? <img src={post.author.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand-red/20" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <h4 className="text-white font-black italic uppercase text-sm sm:text-base tracking-tighter shrink-0">
                                                    ENTRENAMIENTO - {new Date(post.scheduled_for || post.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </h4>
                                                {isFuture && (
                                                    <span className="flex items-center gap-1.5 bg-brand-red text-white text-[8px] font-black italic px-2.5 py-1 rounded-lg shadow-lg shadow-brand-red/20 border border-white/10">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        PROGRAMADO
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase flex items-center gap-2">
                                                {post.post_as_center ? (center?.name || 'Centro') : (post.author?.full_name || 'Coach')}
                                                {isFuture && <span>• {new Date(post.scheduled_for).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}hs</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                                                className="p-2 bg-black/50 rounded-full text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                className="p-2 bg-black/50 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {/* Collapsible Content */}
                                {isExpanded && (
                                    <div className="p-5 sm:p-8 pt-0 animate-in slide-in-from-top-4 duration-300">
                                        <div className="border-t border-white/5 pt-6 space-y-4">
                                            {wodData.warmup && (
                                                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                                    <button
                                                        onClick={() => toggleInternalBlock(post.id, 'warmup')}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                                    >
                                                        <h5 className="text-brand-red font-heading font-black text-xs uppercase tracking-widest flex items-center gap-2 italic">
                                                            <span className="w-2 h-2 rounded-full bg-brand-red"></span> Warm Up
                                                        </h5>
                                                        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expandedBlocks[post.id]?.['warmup'] ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {expandedBlocks[post.id]?.['warmup'] && (
                                                        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="text-gray-300 text-sm whitespace-pre-wrap font-medium leading-relaxed pl-4 border-l-2 border-white/10">
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
                                                    <div key={idx} className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                                        <button
                                                            onClick={() => toggleInternalBlock(post.id, blockKey)}
                                                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <h5 className="text-white font-heading font-black text-xs uppercase tracking-widest flex items-center gap-2 italic">
                                                                    <span className={`w-2 h-2 rounded-full ${block.type === 'wod' ? 'bg-white' : 'bg-gray-500'}`}></span>
                                                                    {(block.title || (block.format && block.format !== 'FREE' ? block.format : (block.type === 'wod' ? 'Workout' : block.type))).toUpperCase()}

                                                                    {/* Display Config Info */}
                                                                    {(block.config?.timecap || block.config?.rounds || block.config?.minutes || block.duration) && (
                                                                        <span className="ml-1 text-brand-red text-[10px] font-black uppercase tracking-widest opacity-80 italic">
                                                                            {block.format === 'ROUNDS FOR TIME' ? (
                                                                                `${block.config?.rounds || '?'} RDS ${block.config?.timecap ? `(CAP: ${block.config.timecap})` : ''}`
                                                                            ) : block.format === 'EMOM' || block.format === 'DEATH BY' ? (
                                                                                `${block.config?.minutes || '?'} MINS (${block.config?.frequency || '1 MIN'})`
                                                                            ) : block.format === 'TABATA' || block.format === 'INTERVALS' ? (
                                                                                `${block.config?.rounds || '?'} RDS (${block.config?.work || '20S'}/${block.config?.rest || '10S'})`
                                                                            ) : (block.config?.timecap || block.duration) ? (
                                                                                `CAP: ${block.config?.timecap || block.duration}`
                                                                            ) : null}
                                                                        </span>
                                                                    )}
                                                                </h5>
                                                            </div>
                                                            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isBlockExpanded ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {isBlockExpanded && (
                                                            <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-4 shadow-inner">
                                                                    {(() => {
                                                                        const lines = (block.exercises && block.exercises.length > 0)
                                                                            ? block.exercises
                                                                            : (block.content || '').split('\n').filter(l => l.trim());

                                                                        if (lines.length === 0) return <p className="text-gray-500 text-xs italic">No hay ejercicios registrados</p>;

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
                                                                                        <div key={i} className="flex items-center gap-2 text-gray-300 text-sm font-medium pl-2 border-l border-white/10">
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
                                                                            <div key={i} className="rounded-lg overflow-hidden border border-white/5 bg-black aspect-video relative group cursor-pointer hover:border-white/20">
                                                                                {url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                                                                        <Video className="w-6 h-6 text-gray-500" />
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
                                                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                                    <div className="p-4">
                                                        <h5 className="text-white font-heading text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-white"></span> WOD
                                                        </h5>
                                                        <div className={clsx(
                                                            "whitespace-pre-wrap font-accent font-semibold text-sm sm:text-lg tracking-tight leading-relaxed",
                                                            theme === 'dark' ? "text-white" : "text-black"
                                                        )}>
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
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500">No WODs scheduled.</p>
                        </div>
                    )
                }
            </div >
        </div >
    )
}
