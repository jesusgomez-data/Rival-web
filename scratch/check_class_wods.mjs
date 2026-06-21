import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select(`
            class_id,
            class:classes!inner (
                id,
                name,
                scheduled_time,
                organization_id,
                organization:organization_id (name)
            ),
            member:member_id!inner (
                user_id,
                profiles:user_id (full_name)
            )
        `)
        .gte('class.scheduled_time', yesterday)
        .lte('class.scheduled_time', now.toISOString());

    if (enrollError) {
        console.error("Enrollment fetch error:", enrollError);
        return;
    }

    console.log("Recent enrollments found:", enrollments.map(e => ({
        class_id: e.class_id,
        className: e.class?.name,
        scheduled_time: e.class?.scheduled_time,
        orgName: e.class?.organization?.name,
        userName: e.member?.profiles?.full_name
    })));

    const orgIds = enrollments.map(e => e.class?.organization_id).filter(Boolean);
    const uniqueOrgIds = [...new Set(orgIds)];

    console.log("Unique Org IDs:", uniqueOrgIds);

    // Let's query ALL center_posts for these orgs
    const { data: wods, error: postError } = await supabase
        .from('center_posts')
        .select('id, organization_id, post_type, scheduled_for, content')
        .eq('post_type', 'wod')
        .in('organization_id', uniqueOrgIds);

    if (postError) {
        console.error("Center posts fetch error:", postError);
    } else {
        console.log("WOD center posts found:", wods);
    }
}

check();
