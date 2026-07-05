'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isUserAdmin } from "@/utils/admin";
import { revalidatePath } from "next/cache";
import { DEFAULT_COMPETITIONS, type CompetitionTemplate, type HyroxSegment } from "@/lib/hyrox";

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE COMPETENCIAS
// ═══════════════════════════════════════════════════════════════

export async function getCompetitions(): Promise<CompetitionTemplate[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('competitions_catalog')
            .select('slug, name, description, segments, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) return DEFAULT_COMPETITIONS;
        return data as CompetitionTemplate[];
    } catch {
        // Tabla aún no migrada → la app sigue funcionando con HYROX
        return DEFAULT_COMPETITIONS;
    }
}

/** Solo admin: crear una competencia nueva desde la app */
export async function adminCreateCompetition(input: {
    name: string;
    description?: string;
    segments: { label: string; type: 'run' | 'station' }[];
}) {
    if (!(await isUserAdmin())) return { error: "Solo el administrador puede crear competencias." };

    const name = (input.name || '').trim();
    if (name.length < 2) return { error: "Ponle un nombre a la competencia." };

    const cleanSegments = (input.segments || [])
        .map(s => ({ label: (s.label || '').trim(), type: s.type === 'run' ? 'run' : 'station' }))
        .filter(s => s.label.length > 0);

    if (cleanSegments.length < 2) return { error: "Añade al menos 2 segmentos (estaciones o carreras)." };
    if (cleanSegments.length > 40) return { error: "Máximo 40 segmentos." };

    const slug = name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        .slice(0, 40) || `comp-${Date.now()}`;

    const segments: HyroxSegment[] = cleanSegments.map((s, i) => ({
        key: `seg_${i + 1}`,
        label: s.label,
        shortLabel: s.label.length > 14 ? s.label.slice(0, 13) + '…' : s.label,
        type: s.type as 'run' | 'station',
    }));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const { error } = await admin.from('competitions_catalog').insert({
        slug,
        name,
        description: (input.description || '').trim() || null,
        segments,
        is_active: true,
        created_by: user?.id || null,
    });

    if (error) {
        if (error.code === '23505') return { error: `Ya existe una competencia llamada "${name}".` };
        console.error('[adminCreateCompetition]', error);
        return { error: "No se pudo crear la competencia. ¿Ejecutaste la migración SQL del catálogo?" };
    }

    revalidatePath('/dashboard/hyrox');
    return { success: true, slug };
}

/** Solo admin: desactivar una competencia (los resultados existentes se conservan) */
export async function adminToggleCompetition(slug: string, isActive: boolean) {
    if (!(await isUserAdmin())) return { error: "Solo el administrador puede hacer esto." };
    if (slug === 'hyrox') return { error: "HYROX no se puede desactivar." };

    const admin = createAdminClient();
    const { error } = await admin
        .from('competitions_catalog')
        .update({ is_active: isActive })
        .eq('slug', slug);

    if (error) return { error: error.message };
    revalidatePath('/dashboard/hyrox');
    return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// RESULTADOS
// ═══════════════════════════════════════════════════════════════

export interface RaceResultInput {
    competition_slug: string;
    performed_at: string;           // YYYY-MM-DD
    category: string;
    is_official: boolean;
    splits: Record<string, number>; // key → segundos
    notes?: string;
}

export async function saveRaceResult(input: RaceResultInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para guardar tu marca." };

    // Plantilla de la competencia (para validar y para el snapshot)
    const competitions = await getCompetitions();
    const template = competitions.find(c => c.slug === input.competition_slug);
    if (!template) return { error: "Competencia no encontrada." };

    const keys = template.segments.map(s => s.key);
    const missing = keys.filter(k => {
        const v = input.splits?.[k];
        return typeof v !== 'number' || isNaN(v) || v <= 0;
    });
    if (missing.length > 0) {
        return { error: `Faltan tiempos válidos en ${missing.length} segmento(s). Revisa el formulario.` };
    }

    const splits: Record<string, number> = {};
    keys.forEach(k => { splits[k] = Math.round(input.splits[k]); });
    const totalSeconds = Object.values(splits).reduce((a, b) => a + b, 0);
    if (totalSeconds <= 0) return { error: "El tiempo total no es válido." };

    const validCategories = ['open', 'pro', 'doubles', 'relay'];
    const category = validCategories.includes(input.category) ? input.category : 'open';

    const baseRow = {
        user_id: user.id,
        performed_at: input.performed_at || new Date().toISOString().split('T')[0],
        category,
        is_official: !!input.is_official,
        total_seconds: totalSeconds,
        splits,
        notes: (input.notes || '').trim() || null,
    };

    // Intento completo (con columnas nuevas); si la migración no está,
    // caemos al formato antiguo solo para HYROX.
    let { data, error } = await supabase
        .from('hyrox_results')
        .insert({
            ...baseRow,
            competition_slug: template.slug,
            segments_snapshot: template.segments,
        })
        .select()
        .single();

    if (error && input.competition_slug === 'hyrox') {
        const legacy = await supabase.from('hyrox_results').insert(baseRow).select().single();
        data = legacy.data;
        error = legacy.error;
    }

    if (error) {
        console.error('[saveRaceResult]', error);
        return { error: "No se pudo guardar la marca. Inténtalo de nuevo." };
    }

    revalidatePath('/dashboard/hyrox');
    return { success: true, result: data };
}

export async function getRaceResults() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('hyrox_results')
        .select('*')
        .eq('user_id', user.id)
        .order('performed_at', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getRaceResults]', error);
        return [];
    }

    // Filas antiguas sin slug → HYROX
    return (data || []).map((r: any) => ({
        ...r,
        competition_slug: r.competition_slug || 'hyrox',
    }));
}

export async function deleteRaceResult(resultId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión." };

    const { error } = await supabase
        .from('hyrox_results')
        .delete()
        .eq('id', resultId)
        .eq('user_id', user.id);

    if (error) return { error: "No se pudo eliminar el resultado." };

    revalidatePath('/dashboard/hyrox');
    return { success: true };
}

