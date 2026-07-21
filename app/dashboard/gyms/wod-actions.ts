'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function uploadMediaFiles(supabase: any, files: File[], centerId: string) {
    const urls: string[] = [];
    for (const file of files) {
        if (file.size > 0) {
            const fileName = `wods/${centerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('center-media').upload(fileName, file);
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('center-media').getPublicUrl(fileName);
                urls.push(publicUrl);
            }
        }
    }
    return urls;
}

export async function createWod(centerId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const scheduledFor = formData.get('scheduled_for') as string;
    const blocks = JSON.parse(formData.get('blocks') as string || '[]');

    for (let i = 0; i < blocks.length; i++) {
        const blockFiles = formData.getAll(`media_${blocks[i].id}`) as File[];
        if (blockFiles.length > 0) {
            const uploadedUrls = await uploadMediaFiles(supabase, blockFiles, centerId);
            blocks[i].media_urls = [...(blocks[i].media_urls || []), ...uploadedUrls];
        }

        if (blocks[i].exercises) {
            for (let j = 0; j < blocks[i].exercises.length; j++) {
                const ex = blocks[i].exercises[j];
                const fileKey = `media_block_${blocks[i].id}_ex_${ex.id}`;
                const exFiles = formData.getAll(fileKey) as File[];

                if (exFiles.length > 0) {
                    const uploadedUrls = await uploadMediaFiles(supabase, exFiles, centerId);
                    if (uploadedUrls.length > 0) {
                        blocks[i].exercises[j].media_url = uploadedUrls[0];
                    }
                }
            }
        }
    }

    let postAsCenter = formData.get('postAsCenter') === 'true';

    // SERVER-SIDE PERMISSION CHECK
    if (postAsCenter && user) {
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);

        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') {
                postAsCenter = false;
            }
        }
    }

    const structure = {
        title: formData.get('title') as string || 'WORKOUT OF THE DAY',
        warmup: formData.get('warmup') as string,
        blocks,
        summary: formData.get('summary') ? JSON.parse(formData.get('summary') as string) : {
            scoreType: 'REPS',
            scoreLabel: 'TOTAL REPS',
            totalTime: '60:00'
        }
    };

    const { error } = await supabase.from('center_posts').insert({
        organization_id: centerId,
        author_id: user?.id,
        content: JSON.stringify(structure),
        post_type: 'wod',
        scheduled_for: scheduledFor || new Date().toISOString(),
        post_as_center: postAsCenter
    });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/wods`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function updateWod(centerId: string, wodId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const scheduledFor = formData.get('scheduled_for') as string;
    const blocks = JSON.parse(formData.get('blocks') as string || '[]');

    for (let i = 0; i < blocks.length; i++) {
        const blockFiles = formData.getAll(`media_${blocks[i].id}`) as File[];
        if (blockFiles.length > 0) {
            const uploadedUrls = await uploadMediaFiles(supabase, blockFiles, centerId);
            blocks[i].media_urls = [...(blocks[i].media_urls || []), ...uploadedUrls];
        }

        if (blocks[i].exercises) {
            for (let j = 0; j < blocks[i].exercises.length; j++) {
                const ex = blocks[i].exercises[j];
                const fileKey = `media_block_${blocks[i].id}_ex_${ex.id}`;
                const exFiles = formData.getAll(fileKey) as File[];

                if (exFiles.length > 0) {
                    const uploadedUrls = await uploadMediaFiles(supabase, exFiles, centerId);
                    if (uploadedUrls.length > 0) {
                        blocks[i].exercises[j].media_url = uploadedUrls[0];
                    }
                }
            }
        }
    }

    let postAsCenter = formData.get('postAsCenter') === 'true';

    // SERVER-SIDE PERMISSION CHECK
    if (postAsCenter && user) {
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);

        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') {
                postAsCenter = false;
            }
        }
    }

    const structure = {
        title: formData.get('title') as string || 'WORKOUT OF THE DAY',
        warmup: formData.get('warmup') as string,
        blocks,
        summary: formData.get('summary') ? JSON.parse(formData.get('summary') as string) : {
            scoreType: 'REPS',
            scoreLabel: 'TOTAL REPS',
            totalTime: '60:00'
        }
    };

    const { error } = await supabase.from('center_posts').update({
        content: JSON.stringify(structure),
        scheduled_for: scheduledFor || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        post_as_center: postAsCenter
    }).eq('id', wodId).eq('organization_id', centerId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/wods`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function addExerciseToCatalog(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data, error } = await supabase
        .from('exercises_catalog')
        .insert({
            name: name,
            is_custom: true
        })
        .select()
        .single();

    if (!error) return { success: true, exercise: data };

    // El catálogo cargado en el navegador puede estar desactualizado (otro
    // coach ya lo agregó, o la lista inicial no traía el ejercicio) — en vez
    // de mostrar el error crudo de la base de datos, se busca la fila que ya
    // existe con ese nombre y se usa esa, que es lo que el usuario quería
    // de todos modos.
    if (error.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
            .from('exercises_catalog')
            .select()
            .eq('name', name)
            .single();

        if (!fetchError && existing) return { success: true, exercise: existing };
    }

    return { error: error.message };
}
