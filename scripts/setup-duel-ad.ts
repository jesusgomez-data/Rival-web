import { createAdminClient } from '../utils/supabase/admin';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function addDuelAd() {
    const supabase = createAdminClient();

    const adData = {
        title: "DOMINA LOS DUELOS",
        description: "Desafía a tus rivales, entrena 7 días y gana la gloria absoluta en la comunidad.",
        image_url: "https://pndkghluytndghszbeuy.supabase.co/storage/v1/object/public/posts/ads/duels_promo.png",
        link_url: "/dashboard/community",
        is_active: true
    };

    console.log("Insertando publicidad de duelos...");

    // Check if it already exists to avoid duplicates
    const { data: existing } = await supabase
        .from('advertisements')
        .select('id')
        .eq('title', adData.title)
        .single();

    if (existing) {
        console.log("El anuncio ya existe. Actualizando...");
        const { error } = await supabase
            .from('advertisements')
            .update(adData)
            .eq('id', existing.id);
        if (error) console.error("Error al actualizar:", error);
        else console.log("¡Anuncio actualizado con éxito!");
    } else {
        const { error } = await supabase
            .from('advertisements')
            .insert(adData);
        if (error) console.error("Error al insertar:", error);
        else console.log("¡Anuncio insertado con éxito!");
    }
}

addDuelAd();
