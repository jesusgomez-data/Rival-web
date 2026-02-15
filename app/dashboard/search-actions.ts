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
        .neq('username', 'rivalfit') // Exclude official account
        .limit(20);

    // 2. Search Gyms
    const { data: gyms } = await supabase
        .from('organizations')
        .select('id, name, city, logo_url')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(20);

    // Prioritize results that start with the query
    const sortedUsers = (users || []).sort((a, b) => {
        const aTitle = (a.full_name || a.username).toLowerCase();
        const bTitle = (b.full_name || b.username).toLowerCase();
        const aStarts = aTitle.startsWith(query.toLowerCase()) || a.username.toLowerCase().startsWith(query.toLowerCase());
        const bStarts = bTitle.startsWith(query.toLowerCase()) || b.username.toLowerCase().startsWith(query.toLowerCase());

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
    }).slice(0, 5);

    const sortedGyms = (gyms || []).sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(query.toLowerCase());
        const bStarts = bName.startsWith(query.toLowerCase());

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
    }).slice(0, 5);

    // Format Results
    const userResults = sortedUsers.map(u => ({
        type: 'user',
        id: u.id,
        title: u.full_name || u.username,
        subtitle: `@${u.username}`,
        image: u.avatar_url,
        url: `/dashboard/profile/${u.username}`
    }));

    const gymResults = sortedGyms.map(g => ({
        type: 'gym',
        id: g.id,
        title: g.name,
        subtitle: g.city,
        image: g.logo_url,
        url: `/gym/${g.id}`
    }));

    return [...userResults, ...gymResults];
}
