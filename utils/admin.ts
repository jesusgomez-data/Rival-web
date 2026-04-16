import { createClient } from "@/utils/supabase/server";

const rawAdminEmails = process.env.ADMIN_EMAILS ?? '';
export const ADMIN_EMAILS = rawAdminEmails
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

export async function isUserAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) return false;

    return ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
}
