import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COMPETITIONS_DATA = [
    {
        name: 'HYROX MÁLAGA',
        type: 'HYROX',
        date: '2026-04-15',
        location: 'Málaga, España',
        image_url: 'https://images.unsplash.com/photo-1517931524326-bdd55a541177?q=80&w=2070&auto=format&fit=crop',
        description: 'La competición de fitness para todos. 8km de carrera y 8 workouts funcionales.'
    },
    {
        name: 'SPARTAN RACE MADRID',
        type: 'OCR',
        date: '2026-05-10',
        location: 'Madrid, España',
        image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop',
        description: 'Supera tus límites en la carrera de obstáculos más famosa del mundo.'
    },
    {
        name: 'IRONMAN 70.3 VALENCIA',
        type: 'TRIATHLON',
        date: '2026-06-22',
        location: 'Valencia, España',
        image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop',
        description: 'Nadando en el Mediterráneo, pedaleando por la sierra y corriendo por la Ciudad de las Artes.',
    },
    {
        name: 'CROSSFIT GAMES 2026',
        type: 'CROSSFIT',
        date: '2026-07-28',
        location: 'Fort Worth, Texas (USA)',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
        description: 'El evento más prestigioso del CrossFit mundial. Compete o sigue en vivo a los mejores atletas del planeta.'
    },
    {
        name: 'MARATÓN DE BARCELONA',
        type: 'RUNNING',
        date: '2026-03-15',
        location: 'Barcelona, España',
        image_url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=2074&auto=format&fit=crop',
        description: 'Uno de los maratones más populares de Europa, con un recorrido espectacular por la ciudad condal.',
    },
    {
        name: 'HYROX BARCELONA',
        type: 'HYROX',
        date: '2026-03-21',
        location: 'Barcelona, España',
        image_url: 'https://images.unsplash.com/photo-1517931524326-bdd55a541177?q=80&w=2070&auto=format&fit=crop',
        description: 'El World Series de Fitness llega a Barcelona. 8km de carrera + 8 estaciones funcionales.'
    },
    {
        name: 'TOUGH MUDDER VALENCIA',
        type: 'OCR',
        date: '2026-04-25',
        location: 'Valencia, España',
        image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=2070&auto=format&fit=crop',
        description: '20km de barro, agua helada y 25 obstáculos diseñados para llevarte al límite. ¿Te atreves?',
    },
    {
        name: 'TRIATLÓN DE MADRID',
        type: 'TRIATHLON',
        date: '2026-05-31',
        location: 'Madrid, España',
        image_url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2070&auto=format&fit=crop',
        description: 'Natación, ciclismo y running por las calles de Madrid. Distancia olímpica y sprint disponibles.',
    },
    {
        name: 'BOX TO BOX CHAMPIONSHIP',
        type: 'CROSSFIT',
        date: '2026-09-12',
        location: 'Madrid, España',
        image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
        description: 'El primer campeonato interboxes organizado por RivalFit. Compite con tu equipo y demuestra quién domina la arena.'
    },
];

async function run() {
    // get a user to assign as organizer (first user found)
    const { data: users } = await supabase.from('profiles').select('id').eq('is_official', true).limit(1);
    const adminId = users && users.length > 0 ? users[0].id : null;

    console.log("Migrating static competitions to database...");
    
    for (const comp of COMPETITIONS_DATA) {
        // check if already exists
        const { data: existing } = await supabase.from('competitions').select('id').eq('title', comp.name).maybeSingle();
        if (!existing) {
            await supabase.from('competitions').insert({
                title: comp.name,
                description: comp.description,
                type: comp.type,
                date: comp.date,
                location: comp.location,
                image_url: comp.image_url,
                organizer_id: adminId,
                status: 'open'
            });
            console.log(`Inserted ${comp.name}`);
        } else {
            console.log(`Skipped ${comp.name} (already exists)`);
        }
    }
    console.log("Done migrating.");
}
run();
