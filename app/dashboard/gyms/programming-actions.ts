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

    // 3. Insert Scheduled Workout
    const { error } = await supabase
        .from('scheduled_workouts')
        .insert({
            user_id: studentId,
            title: workoutData.title || "Entrenamiento Asignado",
            scheduled_date: workoutData.date, // ISO Date string
            exercises: workoutData.exercises || [],
            // Metadata for context
            description: workoutData.description || `Asignado por tu entrenador`,
            // We might want to store who assigned it if the table supports it, otherwise rely on description
            // assigned_by: user.id 
        });

    if (error) {
        console.error("Error assigning workout:", error);
        return { error: "Failed to assign workout: " + error.message };
    }

    // 4. Create Notification for the student
    await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'workout_assigned',
        title: 'Nuevo Entrenamiento Asignado',
        message: `Tu entrenador ha programado una sesión para el ${new Date(workoutData.date).toLocaleDateString()}.`,
        data: { centerId, date: workoutData.date },
        read: false
    });

    revalidatePath(`/dashboard/gyms/${centerId}/programming`);
    return { success: true };
}
