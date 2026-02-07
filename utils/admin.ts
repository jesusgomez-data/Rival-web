import { createClient } from "@/utils/supabase/server";

export const ADMIN_EMAILS = [
    'gomezsantiagojesus@icloud.com',
    'jesusgomez.s@hotmail.com'
];

export async function isUserAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) return false;

    return ADMIN_EMAILS.includes(user.email);
}
