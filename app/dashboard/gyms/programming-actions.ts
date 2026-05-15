'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignWorkoutToStudent(centerId: string, studentId: string, workoutData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // 1. Verify Permission: Is the current user an admin/coach of the center?
    // Simplified specific check for Personal Trainer ownership
    const { data: org } = await supabase
        .from('organizations')
        .select('owner_id, head_coach_id, center_type')
        .eq('id', centerId)
        .single();

    if (!org) {
        return { error: "Organization not found" };
    }

    const isAuthorized = org.owner_id === user.id || org.head_coach_id === user.id;
    if (!isAuthorized) {
        // Double check roles if not owner
        const { data: role } = await supabase
            .from('center_roles')
            .select('role')
            .eq('organization_id', centerId)
            .eq('user_id', user.id)
            .single();

        if (!role || !['owner', 'head_coach', 'coach'].includes(role.role)) {
            return { error: "You do not have permission to assign workouts in this organization." };
        }
    }

    // 2. Verify Student Membership
    const { data: membership } = await supabase
        .from('members')
        .select('id')
        .eq('center_id', centerId)
        .eq('user_id', studentId)
        .in('status', ['active', 'trial'])
        .single();

    if (!membership) {
        return { error: "The selected user is not an active member/student of this organization." };
    }

    // 3. Insert Scheduled Workout — try with optional columns first, fall back to base columns
    const fullPayload = {
        user_id:        studentId,
        title:          workoutData.title || "Entrenamiento Asignado",
        scheduled_date: workoutData.date,
        exercises:      workoutData.exercises || [],
        description:    workoutData.description || `Entrenamiento asignado por tu entrenador`,
        duration:       workoutData.duration   || null,
        sport_type:     workoutData.sportType  || null,
        assigned_by:    user.id,
    };

    let { error } = await supabase.from('scheduled_workouts').insert(fullPayload);

    // Fallback: retry with only the base columns if optional ones don't exist yet
    if (error && error.message?.includes('column')) {
        const basePayload = {
            user_id:        studentId,
            title:          workoutData.title || "Entrenamiento Asignado",
            scheduled_date: workoutData.date,
            exercises:      workoutData.exercises || [],
        };
        const retry = await supabase.from('scheduled_workouts').insert(basePayload);
        error = retry.error;
    }

    if (error) {
        console.error("Error assigning workout:", error);
        return { error: "Failed to assign workout: " + error.message };
    }

    // 4. Create Notification for the student (best-effort — don't block if it fails)
    try {
        await supabase.from('notifications').insert({
            user_id: studentId,
            type:    'workout_assigned',
            title:   'Nuevo Entrenamiento Asignado',
            content: `Tu entrenador ha programado una sesión para el ${new Date(workoutData.date).toLocaleDateString('es-ES')}.`,
            link:    `/dashboard`,
            is_read: false
        });
    } catch { /* ignore notification errors */ }

    revalidatePath(`/dashboard/gyms/${centerId}/programming`);
    return { success: true };
}
