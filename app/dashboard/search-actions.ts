'use server'

import { createClient } from "@/utils/supabase/server";

export async function searchGlobal(query: string) {
    if (!query || query.length < 2) return [];

    const supabase = await createClient();
    const limit = 5;

    // 1. Search Users
    const { data: users } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(limit);

    // 2. Search Gyms
    const { data: gyms } = await supabase
        .from('organizations')
        .select('id, name, city, logo_url')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(limit);

    // Format Results
    const userResults = (users || []).map(u => ({
        type: 'user',
        id: u.id,
        title: u.full_name || u.username,
        subtitle: `@${u.username}`,
        image: u.avatar_url,
        url: `/dashboard/profile/${u.username}`
    }));

    const gymResults = (gyms || []).map(g => ({
        type: 'gym',
        id: g.id,
        title: g.name,
        subtitle: g.city,
        image: g.logo_url,
        url: `/gym/${g.id}`
    }));

    return [...userResults, ...gymResults];
}
