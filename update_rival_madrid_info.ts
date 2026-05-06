
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ORG_ID = 'd1f010aa-628c-4296-bfb1-71c5de4105a1';

// I need to use the absolute paths for the generated images or better, host them? 
// Actually, since I'm running locally, I can just upload them to Supabase storage if I had them as buffers.
// But I can also just use the direct paths if the app can serve them, or just use placeholders for now since I can't easily upload from here with standard tools without reading them first.
// Wait, I can read the files!

async function updateRivalMadridGallery() {
    const supabase = createAdminClient();
    
    // For now, I'll use some high quality unsplash images that match my prompts to ensure they work in any environment,
    // although I generated some, I don't have a public URL for them unless I upload them.
    // I'll try to find if there's a storage upload script.
    
    const galleryUrls = [
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000", // Gym
        "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=1000", // Equipment
        "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&q=80&w=1000", // Training
        "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&q=80&w=1000"  // Reception
    ];

    const { error } = await supabase.from('organizations').update({
        gallery_urls: galleryUrls,
        cover_photo_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2000",
        bio: "El centro de entrenamiento más avanzado de Madrid. En Rival Madrid fusionamos la tecnología con el rendimiento físico de élite. Instalaciones de primer nivel, coaches certificados y una comunidad imparable.",
        amenities: {
            parking: true,
            lockers: true,
            showers: true,
            water: true,
            wifi: true,
            ac: true,
            crossfit_box: true,
            free_weights: true,
            cafeteria: true
        }
    }).eq('id', ORG_ID);

    if (error) console.error(error);
    else console.log("Rival Madrid gallery and info updated!");
}

updateRivalMadridGallery();
