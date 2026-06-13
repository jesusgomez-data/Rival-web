import { createClient } from '@/utils/supabase/server';

export async function syncFeaturedRm(userId: string, exerciseName: string, weightNum: number, unit: string = 'kg') {
    try {
        const supabase = await createClient();
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('featured_rms')
            .eq('id', userId)
            .single();

        if (fetchError || !profile) {
            console.error("Error fetching profile for featured RM sync:", fetchError);
            return { error: fetchError?.message || 'Profile not found' };
        }

        const featuredRms = profile.featured_rms || [];
        let updated = false;

        const updatedFeaturedRms = featuredRms.map((rm: any) => {
            if (rm.exercise && rm.exercise.toLowerCase() === exerciseName.toLowerCase()) {
                const currentWeight = parseFloat(rm.weight) || 0;
                if (weightNum > currentWeight) {
                    updated = true;
                    return {
                        ...rm,
                        weight: weightNum.toString(),
                        unit: rm.unit || unit
                    };
                }
            }
            return rm;
        });

        if (updated) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ featured_rms: updatedFeaturedRms })
                .eq('id', userId);

            if (updateError) {
                console.error("Error updating featured RMs:", updateError);
                return { error: updateError.message };
            }
            console.log(`Successfully synced featured RM for ${exerciseName}: ${weightNum} ${unit}`);
        }
        return { success: true };
    } catch (e: any) {
        console.error("Critical error in syncFeaturedRm:", e);
        return { error: e.message || 'Unknown error' };
    }
}
