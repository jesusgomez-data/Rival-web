'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { HYROX_SEGMENT_KEYS } from "@/lib/hyrox";

export interface HyroxResultInput {
    performed_at: string;           // YYYY-MM-DD
    category: string;               // open | pro | doubles | relay
    is_official: boolean;
    splits: Record<string, number>; // key → segundos
    notes?: string;
}

export async function saveHyroxResult(input: HyroxResultInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para guardar tu simulacro." };

    // Validación: los 16 segmentos con tiempo válido
    const missing = HYROX_SEGMENT_KEYS.filter(k => {
        const v = input.splits?.[k];
        return typeof v !== 'number' || isNaN(v) || v <= 0;
    });
    if (missing.length > 0) {
        return { error: `Faltan tiempos válidos en ${missing.length} segmento(s). Revisa el formulario.` };
    }

    // Sanea: solo claves conocidas, enteros
    const splits: Record<string, number> = {};
    HYROX_SEGMENT_KEYS.forEach(k => { splits[k] = Math.round(input.splits[k]); });
    const totalSeconds = Object.values(splits).reduce((a, b) => a + b, 0);

    if (totalSeconds < 600) {
        return { error: "El tiempo total es demasiado bajo para una carrera HYROX. Revisa los splits." };
    }

    const validCategories = ['open', 'pro', 'doubles', 'relay'];
    const category = validCategories.includes(input.category) ? input.category : 'open';

    const { data, error } = await supabase
        .from('hyrox_results')
        .insert({
            user_id: user.id,
            performed_at: input.performed_at || new Date().toISOString().split('T')[0],
            category,
            is_official: !!input.is_official,
            total_seconds: totalSeconds,
            splits,
            notes: (input.notes || '').trim() || null
        })
        .select()
        .single();

    if (error) {
        console.error('[saveHyroxResult]', error);
        return { error: "No se pudo guardar el resultado. Inténtalo de nuevo." };
    }

    revalidatePath('/dashboard/hyrox');
    return { success: true, result: data };
}

export async function getHyroxResults() {
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
        console.error('[getHyroxResults]', error);
        return [];
    }
    return data || [];
}

export async function deleteHyroxResult(resultId: string) {
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
