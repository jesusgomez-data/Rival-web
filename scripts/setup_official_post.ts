
import { createAdminClient } from '../utils/supabase/admin';

async function setupOfficialContent() {
    const adminSupabase = createAdminClient();
    const officialEmail = 'rival.app.official@gmail.com';

    // 1. Find Official User in Auth
    const { data: authUsers, error: aError } = await adminSupabase.auth.admin.listUsers();
    if (aError) {
        console.error("Error listing auth users:", aError);
        return;
    }

    const officialUser = authUsers.users.find(u => u.email === officialEmail);
    if (!officialUser) {
        console.error("Official auth user not found.");
        return;
    }

    const officialId = officialUser.id;

    // 2. Update Cover Photo
    const coverUrl = 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070&auto=format&fit=crop';
    const { error: coverError } = await adminSupabase
        .from('profiles')
        .update({
            cover_url: coverUrl,
            cover_position: 50,
            is_official: true
        })
        .eq('id', officialId);

    if (coverError) console.error("Error updating cover:", coverError);
    else console.log("Cover updated successfully.");

    // 3. Create First Post
    const postImageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop';
    const caption = "¡BIENVENIDO A LA NUEVA ERA DE RIVAL FIT! 🚀\n\nEste es el canal oficial de comunicación de Rival. Aquí encontrarás noticias, actualizaciones y consejos para llevar tu rendimiento al siguiente nivel.\n\nPrepárate para dominar la arena. #RivalFit #NextLevel #FitnessRevolution";

    // Check if post already exists to avoid duplicates
    const { data: existingPost } = await adminSupabase
        .from('posts')
        .select('id')
        .eq('user_id', officialId)
        .eq('caption', caption)
        .limit(1);

    if (existingPost && existingPost.length > 0) {
        console.log("Welcome post already exists.");
    } else {
        const { error: postError } = await adminSupabase
            .from('posts')
            .insert({
                user_id: officialId,
                caption: caption,
                media_url: postImageUrl,
                media_type: 'image',
                created_at: new Date().toISOString()
            });

        if (postError) console.error("Error creating post:", postError);
        else console.log("Welcome post created successfully.");
    }
}

setupOfficialContent();
