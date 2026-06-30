"use server";

import { createClient } from "@/utils/supabase/server";

export async function uploadOrganizationMedia(organizationId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autenticado' };
    }

    // Verify admin
    const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single();

    if (!member) {
        return { error: 'No tienes permisos para subir contenido.' };
    }

    const file = formData.get('file') as File;
    const mediaType = formData.get('media_type') as string;
    const caption = formData.get('caption') as string;

    if (!file || !mediaType) {
        return { error: 'Archivo o tipo de medio faltante.' };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organization-media')
        .upload(fileName, file);

    if (uploadError) {
        return { error: `Error subiendo archivo: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
        .from('organization-media')
        .getPublicUrl(uploadData.path);

    const mediaUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase
        .from('organization_media')
        .insert({
            organization_id: organizationId,
            media_type: mediaType,
            media_url: mediaUrl,
            caption: caption || null,
            uploader_id: user.id
        });

    if (insertError) {
        // Rollback storage upload
        await supabase.storage.from('organization-media').remove([uploadData.path]);
        return { error: `Error guardando registro: ${insertError.message}` };
    }

    return { success: true };
}

export async function getOrganizationMedia(organizationId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('organization_media')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching organization media:', error);
        return [];
    }
    return data || [];
}

export async function deleteOrganizationMedia(mediaId: string, mediaUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'No autenticado' };
    }

    // Get the media record
    const { data: mediaRecord } = await supabase
        .from('organization_media')
        .select('organization_id')
        .eq('id', mediaId)
        .single();

    if (!mediaRecord) {
        return { error: 'Medio no encontrado.' };
    }

    // Verify admin
    const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', mediaRecord.organization_id)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .single();

    if (!member) {
        return { error: 'No tienes permisos para borrar contenido.' };
    }

    // Extract path from url
    const pathParts = mediaUrl.split('/organization-media/');
    if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from('organization-media').remove([filePath]);
    }

    const { error: deleteError } = await supabase
        .from('organization_media')
        .delete()
        .eq('id', mediaId);

    if (deleteError) {
        return { error: `Error borrando registro: ${deleteError.message}` };
    }

    return { success: true };
}
