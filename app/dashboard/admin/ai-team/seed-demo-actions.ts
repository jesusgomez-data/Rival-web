'use server';

import { createClient } from '@supabase/supabase-js';
import { isUserAdmin } from '@/utils/admin';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Stable UUIDs for Demo Users (AI Team)
const DEMO_USERS = {
    ceo: '66d21f64-d4b1-4b71-968e-0b8f09b30c01',
    cmo: '77d21f64-d4b1-4b71-968e-0b8f09b30c02',
    cto: '88d21f64-d4b1-4b71-968e-0b8f09b30c03',
    coo: '99d21f64-d4b1-4b71-968e-0b8f09b30c04',
    maya_ops: 'aa000000-d4b1-4b71-968e-0b8f09b30c05', 
    cfo: 'cfd21f64-d4b1-4b71-968e-0b8f09b30c06',
    rivalfit: '00000000-0000-4000-a000-000000000000', // Valid v4-style zero UUID
};

const PROFILES_DATA = [
    {
        id: DEMO_USERS.ceo,
        username: 'jessica_ceo',
        full_name: 'Jessica Rodriguez',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop',
        is_official: true,
        bio: 'CEO @ RivalFit | Visionaria y Atleta de Corazón. ⚔️',
        level: 45,
        main_sport: 'CrossFit'
    },
    {
        id: DEMO_USERS.cmo,
        username: 'alex_marketing',
        full_name: 'Alex Torres',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&h=200&auto=format&fit=crop',
        is_official: true,
        bio: 'CMO @ RivalFit | Haciendo que el fitness sea viral. 📣',
        level: 38,
        main_sport: 'Functional Fitness'
    },
    {
        id: DEMO_USERS.cto,
        username: 'sam_tech',
        full_name: 'Sam Chen',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop',
        is_official: true,
        bio: 'CTO @ RivalFit | Optimizando cada rep con código. ⚙️',
        level: 40,
        main_sport: 'Weightlifting'
    },
    {
        id: DEMO_USERS.maya_ops,
        username: 'maya_ops',
        full_name: 'Maya Patel',
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&h=200&auto=format&fit=crop',
        is_official: true,
        bio: 'COO @ RivalFit | Experiencia y Operaciones de Élite. 🔧',
        level: 42,
        main_sport: 'Yoga / Cross Training'
    },
    {
        id: DEMO_USERS.cfo,
        username: 'david_finance',
        full_name: 'David Kim',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop',
        is_official: true,
        bio: 'CFO @ RivalFit | Escalando el éxito financiero. 💰',
        level: 30,
        main_sport: 'Running'
    },
    {
        id: DEMO_USERS.rivalfit,
        username: 'rivalfit',
        full_name: 'Rival Fit Official',
        avatar_url: '/rival_logo.png',
        is_official: true,
        bio: 'Cuenta oficial de Rival Fit. Domina la Arena. ⚔️',
        level: 100,
        main_sport: 'All Services'
    }
];

export async function seedAITeamContent() {
    if (!(await isUserAdmin())) throw new Error('Unauthorized');

    try {
        console.log("[Seeder] Iniciando sembrado dinámico...");

        // Usaremos este mapa para guardar los IDs reales que la DB nos devuelva
        const resolvedIds: Record<string, string> = {};

        // 1. Asegurar usuarios y perfiles uno por uno
        for (const profileTemplate of PROFILES_DATA) {
            const username = profileTemplate.username;
            console.log(`[Seeder] Procesando @${username}...`);
            
            const demoEmail = `${username}@rivalfit.demo`;
            let userId: string | null = null;

            // Paso A: Buscar si ya existe en Auth por email
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const existingAuth = users.find(u => u.email === demoEmail);

            if (existingAuth) {
                userId = existingAuth.id;
            } else {
                // Paso B: Crear si no existe
                const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                    email: demoEmail,
                    password: 'password_demo_123',
                    email_confirm: true,
                    user_metadata: { full_name: profileTemplate.full_name }
                });

                if (createErr) {
                    console.error(`[Seeder] Error creando Auth para @${username}:`, createErr.message);
                    continue;
                }
                userId = newUser.user.id;
            }

            // Paso C: Upsert del perfil con el ID real
            if (userId) {
                const finalProfile = { ...profileTemplate, id: userId };
                await supabaseAdmin.from('profiles').upsert(finalProfile, { onConflict: 'username' });
                resolvedIds[username] = userId;
            }
        }

        // 2. Limpieza de posts anteriores
        // Limpiamos tanto por IDs resueltos como por los IDs estables originales por si acaso
        const finalUserIds = new Set([...Object.values(resolvedIds), ...Object.values(DEMO_USERS)]);
        const distinctIds = Array.from(finalUserIds);
        
        if (distinctIds.length > 0) {
            console.log("[Seeder] Limpiando contenido antiguo...");
            await supabaseAdmin.from('stories').delete().in('user_id', distinctIds);
            await supabaseAdmin.from('posts').delete().in('user_id', distinctIds);
        }

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // 3. Insertar Contenido usando los IDs resueltos
        console.log("[Seeder] Generando contenido...");

        const postsToInsert = [];
        
        if (resolvedIds['jessica_ceo']) {
            postsToInsert.push({
                user_id: resolvedIds['jessica_ceo'],
                caption: "Nuestra comunidad crece un 18% mensual. Q2 se viene con sorpresas increíbles. ⚔️",
                media_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
                media_type: "image",
                created_at: now.toISOString()
            });
        }

        if (resolvedIds['alex_marketing']) {
            postsToInsert.push({
                user_id: resolvedIds['alex_marketing'],
                caption: "¡Lanzamos el sistema de referidos B2B! El marketing es comunidad. 📣",
                media_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop",
                media_type: "image",
                created_at: now.toISOString()
            });
        }

        if (resolvedIds['sam_tech']) {
            postsToInsert.push({
                user_id: resolvedIds['sam_tech'],
                caption: "Optimizando el feed global. Tecnología al servicio del atleta. ⚡",
                media_url: JSON.stringify({
                    exerciseName: "Squat Clean",
                    weight: "120",
                    sport: "Weightlifting",
                    unit: "kg",
                    backgroundImage: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=800&auto=format&fit=crop"
                }),
                media_type: "pr",
                created_at: now.toISOString()
            });
        }

        if (resolvedIds['rivalfit']) {
            postsToInsert.push({
                user_id: resolvedIds['rivalfit'],
                caption: "¡NUEVO HERO WOD 'MURPH' DISPONIBLE! ⚔️🔥 Probad vuestra resistencia hoy.",
                media_url: JSON.stringify({
                    title: "MURPH",
                    sport_type: "Hero WOD",
                    sections: [
                        { name: "Running", rounds: 1, reps: "1 mile Run" },
                        { name: "Bodyweight", rounds: 1, reps: "100 Pull-ups\n200 Push-ups\n300 Air Squats" },
                        { name: "Running", rounds: 1, reps: "1 mile Run" }
                    ],
                    metrics: { type: "TIME", score: "---" }
                }),
                media_type: "wod",
                created_at: now.toISOString()
            });
        }

        if (postsToInsert.length > 0) {
            const { error: pErr } = await supabaseAdmin.from('posts').insert(postsToInsert);
            if (pErr) console.error("[Seeder] Error en posts:", pErr.message);
        }

        const storiesToInsert = [];
        if (resolvedIds['jessica_ceo']) {
            storiesToInsert.push({
                user_id: resolvedIds['jessica_ceo'],
                media_url: "https://images.unsplash.com/photo-1554941068-a252680d25d9?q=80&w=400&h=800&auto=format&fit=crop",
                media_type: "image",
                duration_seconds: 30,
                expires_at: tomorrow.toISOString(),
                created_at: now.toISOString(),
                metadata: { text: "Rumbo al evento CrossFit Arena ✈️" }
            });
        }

        if (resolvedIds['maya_ops']) {
            storiesToInsert.push({
                user_id: resolvedIds['maya_ops'],
                media_url: "https://images.unsplash.com/photo-1541534741688-6078c64b591d?q=80&w=400&h=800&auto=format&fit=crop",
                media_type: "image",
                duration_seconds: 30,
                expires_at: tomorrow.toISOString(),
                created_at: now.toISOString(),
                metadata: { text: "Visitando partners en Barcelona. 🔧" }
            });
        }

        if (storiesToInsert.length > 0) {
            const { error: sErr } = await supabaseAdmin.from('stories').insert(storiesToInsert);
            if (sErr) console.error("[Seeder] Error en stories:", sErr.message);
        }

        revalidatePath('/dashboard/community');
        revalidatePath('/dashboard');

        console.log("[Seeder] Proceso finalizado.");
        return { success: true, message: "Contenido del AI Team sincronizado correctamente." };

    } catch (error: any) {
        console.error("[Seeder] Error crítico:", error);
        return { success: false, error: error.message };
    }
}
