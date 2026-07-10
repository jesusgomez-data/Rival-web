// Definiciones del formato oficial HYROX y helpers de tiempo.
// Compartido entre server actions y componentes cliente.

export type HyroxSegmentType = 'run' | 'station';

export interface HyroxSegment {
    key: string;
    label: string;
    shortLabel: string;
    type: HyroxSegmentType;
}

// Orden oficial de carrera: 8 x (1km run + estación)
export const HYROX_SEGMENTS: HyroxSegment[] = [
    { key: 'run_1', label: 'Run 1 · 1 km', shortLabel: 'Run 1', type: 'run' },
    { key: 'ski_erg', label: '1000m SkiErg', shortLabel: 'SkiErg', type: 'station' },
    { key: 'run_2', label: 'Run 2 · 1 km', shortLabel: 'Run 2', type: 'run' },
    { key: 'sled_push', label: '50m Sled Push', shortLabel: 'Sled Push', type: 'station' },
    { key: 'run_3', label: 'Run 3 · 1 km', shortLabel: 'Run 3', type: 'run' },
    { key: 'sled_pull', label: '50m Sled Pull', shortLabel: 'Sled Pull', type: 'station' },
    { key: 'run_4', label: 'Run 4 · 1 km', shortLabel: 'Run 4', type: 'run' },
    { key: 'burpee_broad_jump', label: '80m Burpee Broad Jumps', shortLabel: 'Burpee BJ', type: 'station' },
    { key: 'run_5', label: 'Run 5 · 1 km', shortLabel: 'Run 5', type: 'run' },
    { key: 'row', label: '1000m Row', shortLabel: 'Row', type: 'station' },
    { key: 'run_6', label: 'Run 6 · 1 km', shortLabel: 'Run 6', type: 'run' },
    { key: 'farmers_carry', label: '200m Farmers Carry', shortLabel: 'Farmers', type: 'station' },
    { key: 'run_7', label: 'Run 7 · 1 km', shortLabel: 'Run 7', type: 'run' },
    { key: 'sandbag_lunges', label: '100m Sandbag Lunges', shortLabel: 'Lunges', type: 'station' },
    { key: 'run_8', label: 'Run 8 · 1 km', shortLabel: 'Run 8', type: 'run' },
    { key: 'wall_balls', label: '100 Wall Balls', shortLabel: 'Wall Balls', type: 'station' },
];

export const HYROX_SEGMENT_KEYS = HYROX_SEGMENTS.map(s => s.key);

// ── Multi-competición (Mis Marcas) ─────────────────────────────
export interface CompetitionCategory {
    value: string;
    label: string;
}

export interface CompetitionTemplate {
    slug: string;
    name: string;
    description?: string | null;
    segments: HyroxSegment[];
    categories?: CompetitionCategory[] | null;
    is_active?: boolean;
}

export const HYROX_CATEGORIES: { value: string; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'pro', label: 'Pro' },
    { value: 'doubles', label: 'Doubles' },
    { value: 'relay', label: 'Relay' },
];

/** Plantilla por defecto si el catálogo aún no existe en la BD */
export const DEFAULT_COMPETITIONS: CompetitionTemplate[] = [
    {
        slug: 'hyrox',
        name: 'HYROX',
        description: '8 runs de 1 km + 8 estaciones en orden oficial',
        segments: HYROX_SEGMENTS,
        categories: HYROX_CATEGORIES,
        is_active: true,
    },
];

/** 275 → "4:35" · 3921 → "1:05:21" */
export function secondsToClock(totalSeconds: number | null | undefined): string {
    if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds <= 0) return '—';
    const s = Math.round(totalSeconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Acepta "4:35", "04:35", "1:05:21" o segundos "275". Devuelve segundos o null si inválido. */
export function parseClock(input: string): number | null {
    const str = (input || '').trim();
    if (!str) return null;
    if (/^\d+$/.test(str)) {
        const n = parseInt(str, 10);
        return n > 0 ? n : null;
    }
    const parts = str.split(':').map(p => p.trim());
    if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d+$/.test(p))) return null;
    const nums = parts.map(p => parseInt(p, 10));
    let seconds = 0;
    if (parts.length === 2) {
        if (nums[1] >= 60) return null;
        seconds = nums[0] * 60 + nums[1];
    } else {
        if (nums[1] >= 60 || nums[2] >= 60) return null;
        seconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
    }
    return seconds > 0 ? seconds : null;
}

/** Delta formateado con signo: -12 → "-0:12" (mejora), +40 → "+0:40" */
export function formatDelta(deltaSeconds: number): string {
    const sign = deltaSeconds < 0 ? '-' : '+';
    return `${sign}${secondsToClock(Math.abs(deltaSeconds))}`;
}
