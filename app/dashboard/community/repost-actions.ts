"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRepost(originalPostId: string, caption: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No user found" };

    try {
        // We insert a new post into community_posts. 
        // We'll use media_type = 'repost', and store the original post ID in the metadata or as string in image.
        // If the table 'community_posts' later gets a 'repost_of' column, it can be added here.
        // But for now, we'll embed the original post ID in a JSON inside the image column or use the caption.
        // Let's assume we use JSON in the image column: { "type": "repost", "originalPostId": ... }
        
        const repostData = {
            type: 'repost',
            originalPostId
        };

        const { data, error } = await supabase
            .from('community_posts')
            .insert({
                user_id: user.id,
                content: caption,
                media_type: 'repost',
                image: JSON.stringify(repostData),
                likes_count: 0,
                comments_count: 0
            })
            .select()
            .single();

        if (error) throw error;
        
        revalidatePath('/dashboard');
        return { data };
    } catch (error: any) {
        console.error("Error creating repost:", error);
        return { error: error.message };
    }
}
