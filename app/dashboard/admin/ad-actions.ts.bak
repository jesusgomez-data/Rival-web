'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isUserAdmin } from "@/utils/admin";

export async function getAds() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching ads:", error);
        return [];
    }
    return data;
}

export async function createAd(formData: { title: string, description: string, image_url: string, link_url: string }) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { error } = await supabase
        .from('advertisements')
        .insert(formData);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function updateAd(id: string, formData: { title: string, description: string, image_url: string, link_url: string }) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { error } = await supabase
        .from('advertisements')
        .update(formData)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function toggleAd(id: string, currentStatus: boolean) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function deleteAd(id: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function uploadAdMedia(formData: FormData) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();
    const file = formData.get('file') as File;
    if (!file) throw new Error("No file provided");

    const fileExt = file.name.split('.').pop();
    const fileName = `ads/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from('posts')
        .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

    return publicUrl;
}
