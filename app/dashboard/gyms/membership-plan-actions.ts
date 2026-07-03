'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getMembershipPlans(centerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', centerId)
        .order('price', { ascending: true });

    if (error) {
        console.error("Error fetching membership plans:", error);
        return [];
    }
    return data || [];
}

export async function createMembershipPlan(centerId: string, data: any) {
    const admin = createAdminClient();
    const { error } = await admin
        .from('membership_plans')
        .insert({
            organization_id: centerId,
            name: data.name,
            description: data.description || '',
            price: parseFloat(data.price) || 0,
            duration_months: parseInt(data.duration) || 1,
            features: data.features || [],
            is_recurring: !!data.is_recurring,
            is_active: true
        });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function updateMembershipPlan(centerId: string, planId: string, data: any) {
    console.log(`Updating plan ${planId} for center ${centerId}`);
    const admin = createAdminClient();
    const { data: updatedData, error } = await admin
        .from('membership_plans')
        .update({
            name: data.name,
            description: data.description,
            price: parseFloat(data.price),
            duration_months: parseInt(data.duration),
            features: data.features,
            is_recurring: !!data.is_recurring,
            is_active: data.is_active ?? true,
            updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('organization_id', centerId)
        .select();

    console.log("Update result:", { updatedData, error });
    if (error) return { error: error.message };
    if (!updatedData || updatedData.length === 0) return { error: "No se encontró el plan o no tienes permisos." };
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function deleteMembershipPlan(centerId: string, planId: string) {
    console.log(`Deleting plan ${planId} for center ${centerId}`);
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('membership_plans')
        .delete()
        .eq('id', planId)
        .eq('organization_id', centerId)
        .select();

    console.log("Delete result:", { data, error });
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: "No se pudo eliminar el plan. Puede que ya no exista o no tengas permisos." };
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}
