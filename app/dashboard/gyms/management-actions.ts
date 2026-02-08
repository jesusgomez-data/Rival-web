'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath, unstable_noStore } from "next/cache";
import { createNotification } from "../notifications-actions";
import { updateMissionProgress } from "../training/actions";
import { stripe } from "@/utils/stripe/config";
// --- HELPERS ---
const sanitizeDate = (date: string | null | undefined) => {
    if (!date || date.trim() === "") return null;
    return date;
};

// --- SCHEDULE & CLASSES ---

export async function getCenterClasses(id: string, date?: string, isCenterId: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
        .from('classes')
        .select(`
            *,
            coach:profiles!coach_id (full_name, avatar_url),
            enrollments:class_enrollments(count)
        `)
        .order('scheduled_time', { ascending: true });

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    if (date) {
        const startOfDay = new Date(date).toISOString();
        const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999)).toISOString();
        query = query.gte('scheduled_time', startOfDay).lte('scheduled_time', endOfDay);
    } else {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        query = query.gte('scheduled_time', startOfToday.toISOString());
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching classes:", error);
        return [];
    }

    // Fetch user's results for these classes
    let userResults: any[] = [];
    let userEnrollments: any[] = [];
    if (user && data.length > 0) {
        const classIds = data.map(c => c.id);

        const { data: results } = await supabase
            .from('class_results')
            .select('*')
            .eq('user_id', user.id)
            .in('class_id', classIds);
        userResults = results || [];

        // Check if user is enrolled
        const { data: enrollments } = await supabase
            .from('class_enrollments')
            .select('class_id')
            .eq('member.user_id', user.id) // This requires join, but we can't do member.user_id easily on 'class_enrollments' directly without joining members.
            // Alternative: Find member_id for user first.
            // But let's try the direct approach if we can join members
            .select('class_id, member!inner(user_id)')
            .eq('member.user_id', user.id)
            .in('class_id', classIds);

        userEnrollments = enrollments || [];
    }

    return data.map((c: any) => ({
        ...c,
        enrolled_count: c.enrollments?.[0]?.count || 0,
        my_result: userResults.find(r => r.class_id === c.id) || null,
        is_enrolled: userEnrollments.some(e => e.class_id === c.id)
    }));
}

export async function getClassesRange(id: string, startDate: string, endDate: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    let query = supabase
        .from('classes')
        .select(`
            *,
            enrollments:class_enrollments(count)
        `);

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    const { data, error } = await query
        .gte('scheduled_time', startDate)
        .lte('scheduled_time', endDate)
        .order('scheduled_time', { ascending: true });

    if (error) {
        console.error("Error fetching classes range:", error);
        return [];
    }

    if (!data) return [];

    const coachIds = [...new Set(data.map(c => c.coach_id).filter(Boolean))];
    let coaches: any[] = [];
    if (coachIds.length > 0) {
        const { data: coachData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', coachIds);
        coaches = coachData || [];
    }

    return data.map((c: any) => {
        const coach = coaches.find(coach => coach.id === c.coach_id);
        return {
            ...c,
            enrolled_count: c.enrollments?.[0]?.count || 0,
            coach: coach || { full_name: 'Staff' }
        };
    });
}

export async function getClassDetails(classId: string) {
    const supabase = await createClient();

    // 1. Fetch Class Data (Simple select)
    const { data: classData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

    if (error || !classData) {
        console.error("Error fetching class details:", error);
        return null;
    }

    // 2. Fetch Coach Profile separately
    let coach = null;
    if (classData.coach_id) {
        const { data: coachData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', classData.coach_id)
            .single();
        coach = coachData;
    }

    const finalClassData = { ...classData, coach };

    const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select(`
            id,
            enrollment_date,
            attended,
            member:member_id (
                id,
                full_name,
                email,
                avatar_url,
                plan,
                status,
                user_id,
                birth_date
            )
        `)
        .eq('class_id', classId);

    return {
        ...finalClassData,
        enrollments: enrollments || []
    };
}

export async function createClass(centerId: string, data: any) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        // PERMISSION CHECK & PLAN LIMITS
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id, plan').eq('id', centerId).single();

        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);
        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') return { error: "Unauthorized: Only Owners and Head Coaches can manage classes." };
        }

        // Check Free Plan Limits (10 classes/week)
        if (org?.plan === 'free') {
            const targetDate = new Date(data.scheduled_time);
            const day = targetDate.getDay(); // 0 (Sun) to 6 (Sat)
            // Adjust to Monday start
            const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);

            const startOfWeek = new Date(targetDate);
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            const { count } = await supabase
                .from('classes')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', centerId)
                .gte('scheduled_time', startOfWeek.toISOString())
                .lte('scheduled_time', endOfWeek.toISOString());

            if ((count || 0) >= 10) {
                return { error: "Plan Gratuito limitado a 10 clases/semana. Mejora a Starter para clases ilimitadas." };
            }
        }

        const scheduledDate = new Date(data.scheduled_time);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[scheduledDate.getUTCDay()];

        const hours = String(scheduledDate.getUTCHours()).padStart(2, '0');
        const minutes = String(scheduledDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(scheduledDate.getUTCSeconds()).padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;

        const { error } = await supabase
            .from('classes')
            .insert({
                organization_id: centerId,
                center_id: data.center_id || null, // Allow linking to specific center
                name: data.name || 'Unnamed Class',
                description: data.description || '',
                coach_id: data.coach_id || null,
                day_of_week: dayOfWeek,
                time: timeString,
                capacity: parseInt(data.capacity) || 20,
                max_capacity: parseInt(data.capacity) || 20,
                duration_minutes: parseInt(data.duration) || 60,
                scheduled_time: data.scheduled_time,
                class_type: data.type || 'general',
                difficulty: data.difficulty || 'intermediate'
            });

        if (error) return { error: error.message };

        revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
        revalidatePath(`/dashboard/gyms/${centerId}/schedule/[classId]`, 'page');
        revalidatePath(`/gym/${centerId}`);
        return { success: true };
    } catch (err: any) {
        return { error: err.message || 'Unknown error' };
    }
}

export async function updateClass(centerId: string, classId: string, data: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // PERMISSION CHECK
    const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
    const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);
    if (!isOwnerOrHead) {
        const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
        if (roleData?.role !== 'head_coach') return { error: "Unauthorized: Only Owners and Head Coaches can manage classes." };
    }

    const d = new Date(data.scheduled_time);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[d.getUTCDay()];

    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    const { error } = await supabase
        .from('classes')
        .update({
            name: data.name,
            coach_id: data.coach_id || null,
            scheduled_time: data.scheduled_time,
            duration_minutes: parseInt(data.duration),
            capacity: parseInt(data.capacity),
            max_capacity: parseInt(data.capacity),
            class_type: data.type,
            difficulty: data.difficulty,
            day_of_week: dayOfWeek,
            time: timeString,
            description: data.description || ''
        })
        .eq('id', classId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
    revalidatePath(`/dashboard/gyms/${centerId}/schedule/${classId}`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function deleteClass(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // PERMISSION CHECK
    const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
    const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);
    if (!isOwnerOrHead) {
        const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
        if (roleData?.role !== 'head_coach') return { error: "Unauthorized: Only Owners and Head Coaches can manage classes." };
    }

    const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
    return { success: true };
}

// ... (previous code)

export async function saveClassResult(classId: string, resultData: any, notes: string, shareToFeed: boolean = false, datePerformed: string = new Date().toISOString()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Debes iniciar sesión" };

    // 1. Get Class & Org Info (Moved up for permission check)
    const { data: classData } = await supabase
        .from('classes')
        .select(`
            organization_id, 
            scheduled_time
        `)
        .eq('id', classId)
        .single();

    if (!classData) return { error: "Clase no encontrada" };

    // Fetch Organization Name explicitly to ensure it exists
    const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', classData.organization_id)
        .single();

    // @ts-ignore
    classData.organizations = orgData;

    // 2. Check if enrolled
    const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`id, member:member_id!inner(user_id)`)
        .eq('class_id', classId)
        .eq('member.user_id', user.id);

    if (enrollmentError || !enrollments || enrollments.length === 0) {
        return { error: "No estás inscrito en esta clase" };
    }

    // 3. Check if class time has passed/started
    const now = new Date();
    const classTime = new Date(classData.scheduled_time);
    if (now < classTime) {
        return { error: "No puedes registrar resultados antes de la clase" };
    }
    // 3. Save result
    const { error } = await supabase
        .from('class_results')
        .upsert({
            class_id: classId,
            user_id: user.id,
            result_type: 'custom',
            result_value: 'Detailed Result',
            data: resultData,
            notes: notes,
            date_performed: datePerformed, // Save the selected date
            updated_at: new Date().toISOString()
        }, { onConflict: 'class_id, user_id' });

    if (error) return { error: error.message };

    // 4. Update Missions & XP
    // Track session count
    await updateMissionProgress(user.id, 'sessions_count', 1);

    // Calculate Volume from resultData
    let totalVolume = 0;
    if (resultData && Array.isArray(resultData)) {
        resultData.forEach((block: any) => {
            if (block.type === 'weight' && block.exercises) {
                block.exercises.forEach((ex: any) => {
                    const w = parseFloat(ex.value) || 0;
                    const r = parseInt(ex.reps) || 0;
                    const s = parseInt(ex.sets) || 1;
                    totalVolume += w * r * s;
                });
            } else if (block.wod_weight) {
                totalVolume += parseFloat(block.wod_weight) || 0;
            }
        });
    }

    if (totalVolume > 0) {
        await updateMissionProgress(user.id, 'volume_kg', totalVolume);
    }

    // Give XP
    await supabase.rpc('increment_xp', { amount: 100, profile_id: user.id });

    // 5. Share to Feed
    if (shareToFeed) {
        let caption = `🔥 ¡WOD FINALIZADO!\n\n`;

        if (resultData && Array.isArray(resultData)) {
            resultData.forEach((block: any) => {
                const title = (block.title || 'RESULTADOS').toUpperCase();
                caption += `\n ${title}\n`;
                caption += ` ----------------------------\n`;

                if (block.type === 'weight') {
                    if (block.exercises) {
                        block.exercises.forEach((ex: any) => {
                            if (ex.name) {
                                let line = ` • ${ex.name.trim().toUpperCase()}`;
                                if (ex.sets && ex.reps) line += ` (${ex.sets} X ${ex.reps})`;
                                if (ex.value) line += `: ${ex.value}KG`;
                                caption += line + '\n';
                            }
                        });
                    }
                } else {
                    if (block.value) {
                        caption += ` RESULTADO: ${block.value.trim().toUpperCase()}`;
                        if (block.wod_weight) caption += ` (${block.wod_weight}KG)`;
                        caption += '\n';
                    }
                    if (block.exercises && block.exercises.length > 0) {
                        block.exercises.forEach((ex: any) => {
                            if (ex.name) caption += ` - ${ex.name.trim().toUpperCase()}\n`;
                        });
                    }
                }
            });
        }

        if (notes) caption += `\n📝 COMENTARIO: ${notes}`;

        // Inject Metadata for FeedPost
        const feedData = Array.isArray(resultData) ? [...resultData] : [];
        // @ts-ignore
        const centerName = classData.organizations?.name || 'Centro Deportivo';

        feedData.push({
            type: 'metadata',
            centerName: centerName
        });

        await supabase.from('posts').insert({
            user_id: user.id,
            caption: caption,
            media_type: 'class_result',
            media_url: JSON.stringify(feedData)
        });
    }

    // Revalidate relevant paths
    const { data: c } = await supabase.from('classes').select('organization_id').eq('id', classId).single();
    if (c) {
        revalidatePath(`/gym/${c.organization_id}`);
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/community');
    }

    return { success: true };
}

export async function getClassResults(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('class_results')
        .select(`
            *,
            user:user_id (full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data;
}

export async function markAttendance(enrollmentId: string, attended: boolean, path: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('class_enrollments')
        .update({ attended: attended })
        .eq('id', enrollmentId);

    if (error) return { error: error.message };
    revalidatePath(path);
    return { success: true };
}

// --- MEMBERS ---

export async function getCenterMembers(id: string, isCenterId: boolean = false) {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Check if user has access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Fetch Members & Requests
    let memberQuery = admin.from('members').select('*');
    let requestQuery = admin.from('trial_requests').select('*').eq('status', 'pending');

    if (isCenterId) {
        memberQuery = memberQuery.eq('center_id', id);
        requestQuery = requestQuery.eq('center_id', id);
    } else {
        // Fallback: assume the ID is the primary center_id for now as most centers are single-location
        // If we had org_id on members table we would use it, but it seems we don't.
        memberQuery = memberQuery.eq('center_id', id);
        requestQuery = requestQuery.eq('center_id', id);
    }

    const [{ data: rawMembers }, { data: rawRequests }] = await Promise.all([
        memberQuery.order('created_at', { ascending: false }),
        requestQuery
    ]);

    // 2. Collect User IDs
    const userIds = new Set<string>();
    rawMembers?.forEach((m) => { if (m.user_id) userIds.add(m.user_id); });
    rawRequests?.forEach((r) => { if (r.user_id) userIds.add(r.user_id); });

    let userProfiles: Record<string, any> = {};
    let userStoryStatus: Record<string, 'none' | 'seen' | 'unseen'> = {};

    if (userIds.size > 0) {
        // Fetch profiles
        const { data: profiles } = await admin
            .from('profiles')
            .select('*')
            .in('id', Array.from(userIds));

        if (profiles) {
            profiles.forEach(p => { userProfiles[p.id] = p; });
        }

        // Fetch stories
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: activeStories } = await admin
            .from('stories')
            .select('id, user_id')
            .in('user_id', Array.from(userIds))
            .gte('created_at', oneDayAgo);

        if (activeStories && activeStories.length > 0) {
            const userIdsWithStories = new Set(activeStories.map(s => s.user_id));

            // Check views
            const { data: views } = await admin
                .from('story_views')
                .select('story_id')
                .eq('viewer_id', user.id)
                .in('story_id', activeStories.map(s => s.id));

            const viewedStoryIds = new Set(views?.map(v => v.story_id));

            userIdsWithStories.forEach(uid => {
                const userStories = activeStories.filter(s => s.user_id === uid);
                const allSeen = userStories.every(s => viewedStoryIds.has(s.id));
                userStoryStatus[uid] = allSeen ? 'seen' : 'unseen';
            });
        }
    }

    // 3. Assemble
    const members = (rawMembers || []).map(m => ({
        ...m,
        user: userProfiles[m.user_id] || null,
        story_status: userStoryStatus[m.user_id] || 'none'
    }));

    const requests = (rawRequests || []).map(r => ({
        ...r,
        is_request: true,
        status: 'trial',
        user: userProfiles[r.user_id] || null,
        story_status: userStoryStatus[r.user_id] || 'none'
    }));

    return [...members, ...requests];
}



export async function removeMember(centerId: string, memberId: string) {
    const admin = createAdminClient();

    // 1. Delete associated enrollments first (to avoid FK constraints)
    await admin
        .from('class_enrollments')
        .delete()
        .eq('member_id', memberId);

    // 2. Delete the member
    const { error } = await admin
        .from('members')
        .delete()
        .eq('id', memberId)
        .eq('center_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath('/dashboard/gyms');
    return { success: true };
}

export async function addMember(centerId: string, fullName: string, plan: string, extraData: any, userId?: string) {
    const admin = createAdminClient();

    // 1. Check Plan Limits
    const { data: org } = await admin.from('organizations').select('plan').eq('id', centerId).single();
    if (org?.plan === 'free') {
        const { count } = await admin
            .from('members')
            .select('id', { count: 'exact', head: true })
            .eq('center_id', centerId)
            .in('status', ['active', 'trial', 'pending']); // Count all active-ish members

        if ((count || 0) >= 50) {
            return { error: "Plan Gratuito limitado a 50 miembros. Mejora a Starter para miembros ilimitados." };
        }
    }

    const { error } = await admin
        .from('members')
        .insert({
            center_id: centerId,
            user_id: userId || null,
            full_name: fullName,
            email: extraData.email,
            phone: extraData.phone,
            birth_date: sanitizeDate(extraData.birth_date),
            plan: plan,
            status: 'active',
            membership_start_date: sanitizeDate(extraData.membership_start_date) || new Date().toISOString(),
            payment_method: extraData.payment_method,
            auto_billing: extraData.auto_billing,
            card_last4: extraData.card_last4,
            notes: extraData.notes
        });

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath('/dashboard/gyms');
    return { success: true };
}

export async function addGuestMember(centerId: string, fullName: string, email: string, extraData: any) {
    const admin = createAdminClient();

    const { error } = await admin
        .from('members')
        .insert({
            center_id: centerId,
            full_name: fullName,
            email: email,
            phone: extraData.phone,
            birth_date: sanitizeDate(extraData.birth_date),
            plan: 'guest',
            status: 'active',
            membership_start_date: new Date().toISOString(),
            payment_method: 'cash',
            notes: extraData.notes
        });

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath('/dashboard/gyms');
    return { success: true };
}

export async function requestMemberPayment(centerId: string, planId: string, userId: string, extraData: any) {
    const supabase = await createClient();
    const admin = createAdminClient();

    try {
        // 1. Get plan details
        const { data: plan } = await supabase.from('membership_plans').select('*').eq('id', planId).single();
        if (!plan) return { error: "Plan no encontrado" };

        // 2. Get user profile for Stripe customer
        // We use admin client here to bypass RLS policies that might hide email/stripe_id
        console.log('[requestMemberPayment] Buscando perfil para userId:', userId);
        const { data: profile, error: profileError } = await admin.from('profiles').select('stripe_customer_id, full_name').eq('id', userId).single();

        if (profileError) {
            console.error('[requestMemberPayment] Error al buscar perfil:', profileError);
            return { error: `Error al buscar perfil: ${profileError.message}` };
        }

        if (!profile) {
            console.error('[requestMemberPayment] Perfil no encontrado para userId:', userId);
            return { error: `Perfil no encontrado para el usuario. Verifica que el atleta tenga una cuenta Rival vinculada.` };
        }

        console.log('[requestMemberPayment] Perfil encontrado:', profile.full_name);

        let customerId = profile.stripe_customer_id;
        if (!customerId) {
            const stripeCustomer = await stripe.customers.create({
                email: extraData.email,
                name: profile.full_name || extraData.fullName,
                metadata: { userId }
            });
            customerId = stripeCustomer.id;
            await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // 3. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Membresía: ${plan.name}`,
                        description: `Pago de membresía para el centro`,
                    },
                    unit_amount: Math.round(plan.price * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gym/${centerId}?status=success_payment`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gym/${centerId}?status=canceled_payment`,
            metadata: {
                type: 'membership_payment',
                centerId,
                planId,
                userId,
                extraData: JSON.stringify(extraData)
            }
        });


        // 4. Create or Update Member as 'pending_payment'
        const { data: existingMember } = await admin
            .from('members')
            .select('id, status')
            .eq('center_id', centerId)
            .eq('user_id', userId)
            .single();

        let memberError;

        if (existingMember) {
            if (existingMember.status === 'active') {
                return { error: "El usuario ya es un miembro activo de este centro." };
            }

            const { error: updateError } = await admin
                .from('members')
                .update({
                    plan: plan.name,
                    status: 'pending',
                    payment_method: 'payment_request',
                    notes: extraData.notes,
                    full_name: extraData.fullName || profile.full_name,
                    phone: extraData.phone,
                    birth_date: sanitizeDate(extraData.birth_date)
                })
                .eq('id', existingMember.id);
            memberError = updateError;
        } else {
            const { error: insertError } = await admin.from('members').insert({
                center_id: centerId,
                user_id: userId,
                full_name: extraData.fullName || profile.full_name,
                email: extraData.email || profile.email,
                phone: extraData.phone,
                birth_date: sanitizeDate(extraData.birth_date),
                plan: plan.name,
                status: 'pending',
                payment_method: 'payment_request',
                notes: extraData.notes
            });
            memberError = insertError;
        }

        if (memberError) return { error: memberError.message };

        // 5. Notify User
        const { data: org } = await supabase.from('organizations').select('name').eq('id', centerId).single();
        const gymName = org?.name || 'Tu Centro';

        await createNotification({
            userId,
            type: 'payment_requested',
            title: `Solicitud de Pago: ${gymName}`,
            content: `Tu centro ha solicitado el pago de tu membresía (${plan.name}). Haz clic aquí para completar el proceso de forma segura.`,
            link: session.url!
        });

        revalidatePath(`/dashboard/gyms/${centerId}/members`);
        return { success: true, checkoutUrl: session.url };
    } catch (err: any) {
        console.error("Error in requestMemberPayment:", err);
        return { error: err.message || "Error al procesar la solicitud de pago" };
    }
}

export async function approveTrialRequest(centerId: string, requestId: string, userId: string, fullName: string, avatarUrl: string) {
    const admin = createAdminClient();



    const { error: memberError } = await admin
        .from('members')
        .insert({
            center_id: centerId,
            user_id: userId,
            full_name: fullName || 'Athlete',
            avatar_url: avatarUrl || null,
            email: `user_${userId.substring(0, 8)}@rival.app`,
            plan: 'trial',
            status: 'trial',
            membership_start_date: new Date().toISOString(),
            membership_end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        });

    if (memberError) {
        if (memberError.code === '23505') {
            await admin.from('trial_requests').update({ status: 'approved' }).eq('id', requestId);

            // Notify
            const { data: org } = await admin.from('organizations').select('name').eq('id', centerId).single();
            const gymName = org?.name || 'El Centro';

            await createNotification({
                userId: userId,
                type: 'trial_approved',
                title: `¡Solicitud Aceptada en ${gymName}!`,
                content: `Tu solicitud de prueba ha sido aprobada. Ahora eres miembro oficial. Accede al horario para reservar tus clases.`,
                link: `/gym/${centerId}`
            });

            revalidatePath(`/dashboard/gyms/${centerId}/members`);
            return { success: true };
        }
        return { error: memberError.message };
    }

    await admin.from('trial_requests').update({ status: 'approved' }).eq('id', requestId);

    // Notify the user
    const { data: org } = await admin.from('organizations').select('name').eq('id', centerId).single();
    const gymName = org?.name || 'El Centro';

    await createNotification({
        userId: userId,
        type: 'trial_approved',
        title: `¡Solicitud Aceptada en ${gymName}!`,
        content: `Tu solicitud de prueba ha sido aprobada. Ahora eres miembro oficial. Accede al horario para reservar tus clases.`,
        link: `/gym/${centerId}`
    });

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath('/dashboard/gyms');
    return { success: true };
}

// --- STORE ---

export async function getCenterProducts(id: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    let query = supabase
        .from('center_products')
        .select('*');

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return [];
    return data;
}

export async function createProduct(centerId: string, formData: FormData) {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string);
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const image = formData.get('image') as File;

    let imageUrl = null;
    if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `products/${centerId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, image);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
    }

    const { error } = await supabase
        .from('center_products')
        .insert({
            organization_id: centerId,
            name,
            price,
            stock_quantity: stock,
            description,
            category,
            image_url: imageUrl
        });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function updateProduct(centerId: string, productId: string, formData: FormData) {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string);
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const image = formData.get('image') as File;

    const updateData: any = {
        name,
        price,
        stock_quantity: stock,
        description,
        category,
        updated_at: new Date().toISOString()
    };

    if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `products/${centerId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, image);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            updateData.image_url = publicUrl;
        }
    }

    const { error } = await supabase
        .from('center_products')
        .update(updateData)
        .eq('id', productId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function deleteProduct(centerId: string, productId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('center_products').delete().eq('id', productId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function purchaseProduct(centerId: string, productId: string, paymentMethod: 'card' | 'cash' = 'card') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Login required" };

    // 1. Get Member & Profile
    const { data: member } = await supabase
        .from('members')
        .select('id, user_id')
        .eq('center_id', centerId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!member) return { error: "Debes ser miembro para comprar." };

    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, full_name, email')
        .eq('id', user.id)
        .single();

    // 2. Product Info
    const { data: product } = await supabase
        .from('center_products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) return { error: "Producto no encontrado" };
    if (product.stock_quantity <= 0) return { error: "Sin stock" };

    if (paymentMethod === 'cash') {
        const { error: saleError } = await supabase.from('sales').insert({
            center_id: centerId,
            member_id: member.id,
            product_id: productId,
            quantity: 1,
            total_amount: product.price,
            payment_status: 'pending_cash'
        });
        if (saleError) return { error: saleError.message };
        return { success: true, message: 'cash_registered' };
    }

    // 3. Card Flow (Stripe)
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
        try {
            const customer = await stripe.customers.create({
                email: user.email!,
                name: profile?.full_name || user.email!,
                metadata: { userId: user.id }
            });
            customerId = customer.id;
            await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
        } catch (e: any) {
            return { error: `Stripe Error: ${e.message}` };
        }
    }

    // Check for saved cards
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });

    const savedCard = paymentMethods.data?.[0];

    if (savedCard) {
        try {
            const intent = await stripe.paymentIntents.create({
                amount: Math.round(product.price * 100),
                currency: 'eur',
                customer: customerId,
                payment_method: savedCard.id,
                off_session: true,
                confirm: true,
                metadata: {
                    type: 'store_purchase',
                    productId: productId,
                    centerId: centerId,
                    userId: user.id,
                    memberId: member.id
                }
            });

            if (intent.status === 'succeeded') {
                await supabase.from('sales').insert({
                    center_id: centerId,
                    member_id: member.id,
                    product_id: productId,
                    quantity: 1,
                    total_amount: product.price,
                    payment_status: 'completed'
                });
                await supabase.from('center_products').update({ stock_quantity: product.stock_quantity - 1 }).eq('id', productId);

                revalidatePath(`/gym/${centerId}`);
                return { success: true };
            } else if (intent.status === 'requires_action') {
                return { checkoutUrl: intent.next_action?.redirect_to_url?.url || intent.next_action?.use_stripe_sdk?.stripe_js };
            }
        } catch (e: any) {
            console.error("Payment Intent failed", e);
        }
    }

    try {
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: product.name,
                        images: product.image_url ? [product.image_url] : [],
                    },
                    unit_amount: Math.round(product.price * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gym/${centerId}?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gym/${centerId}?status=canceled`,
            metadata: {
                type: 'store_purchase',
                productId: productId,
                centerId: centerId,
                userId: user.id,
                memberId: member.id
            }
        });

        return { checkoutUrl: session.url };
    } catch (e: any) {
        return { error: `Error: ${e.message}` };
    }
}

// --- ANALYTICS ---

export async function getCenterAnalytics(id: string, isCenterId: boolean = false) {
    const supabase = createAdminClient();

    let membersQuery = supabase.from('members').select('created_at, status, plan, membership_start_date');
    let salesQuery = supabase.from('sales').select('total_amount, created_at');

    if (isCenterId) {
        membersQuery = membersQuery.eq('center_id', id);
        salesQuery = salesQuery.eq('center_id', id);
    } else {
        // Simplified query
        membersQuery = membersQuery.eq('center_id', id);
        salesQuery = salesQuery.eq('organization_id', id);
    }

    const [{ data: members }, { data: sales }] = await Promise.all([
        membersQuery,
        salesQuery
    ]);

    const analytics = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

        // Members joined before the end of this month
        const monthlyMembersCount = (members || []).filter((m: any) => {
            const joinedDate = new Date(m.membership_start_date || m.created_at);
            // Count if they joined before nextMonth and are currently active (Simplification for history)
            // For a more accurate historic chart, we would need a status history table.
            return joinedDate < nextMonth && m.status === 'active';
        }).length;

        // 1. Revenue from Sales (One-off purchases, pos, etc)
        const salesRevenue = (sales || []).filter((s: any) => {
            const date = new Date(s.created_at);
            return date >= d && date < nextMonth;
        }).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

        // 2. Revenue from Active Memberships (MRR Estimation)
        // We calculate this for the SPECIFIC month `d`.
        const membershipRevenue = (members || []).filter((m: any) => {
            const joinedDate = new Date(m.membership_start_date || m.created_at);
            // Member contributes to revenue if they joined before this month ends and are active
            // (Again, using current status as proxy for past active status)
            return m.status === 'active' && joinedDate < nextMonth;
        }).reduce((acc: number, m: any) => {
            const plan = (m.plan || '').toLowerCase();
            let price = 0;
            if (plan.includes('trial') || plan.includes('prueba')) price = 0;
            else if (plan.includes('unlimited') || plan.includes('ilimitada')) price = 75; // Estimated Price
            else price = 60; // Default Standard Price
            return acc + price;
        }, 0);

        // Total Revenue = Sales + Membership MRR
        // Note: If you implement automated billing that creates 'sales' records for memberships, remove membershipRevenue to avoid double counting.
        // Assuming currently no auto-billing creating sales records:
        const totalRevenue = salesRevenue + membershipRevenue;

        analytics.push({
            name: monthName,
            members: monthlyMembersCount,
            revenue: totalRevenue
        });
    }

    return analytics;
}

export async function getCenterActivity(id: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    // Fetch members, trial requests, sales, and classes
    let membersQuery = supabase.from('members').select('full_name, created_at, plan').order('created_at', { ascending: false }).limit(5);
    let trialsQuery = supabase.from('trial_requests').select('full_name, created_at, status').order('created_at', { ascending: false }).limit(5);
    let salesQuery = supabase.from('sales').select('total_amount, created_at, member:member_id(full_name), product:product_id(name)').order('created_at', { ascending: false }).limit(5);
    let classesQuery = supabase.from('classes').select('name, scheduled_time, created_at').order('created_at', { ascending: false }).limit(5);

    if (isCenterId) {
        membersQuery = membersQuery.eq('center_id', id);
        trialsQuery = trialsQuery.eq('center_id', id);
        salesQuery = salesQuery.eq('center_id', id);
        classesQuery = classesQuery.eq('center_id', id);
    } else {
        membersQuery = membersQuery.eq('center_id', id);
        trialsQuery = trialsQuery.eq('organization_id', id);
        salesQuery = salesQuery.eq('organization_id', id);
        classesQuery = classesQuery.eq('organization_id', id);
    }

    const [{ data: members }, { data: trials }, { data: sales }, { data: classes }] = await Promise.all([
        membersQuery,
        trialsQuery,
        salesQuery,
        classesQuery
    ]);

    const activity = [
        ...(members || []).map(m => ({ type: 'member', date: m.created_at, data: m })),
        ...(trials || []).map(t => ({ type: 'trial', date: t.created_at, data: t })),
        ...(sales || []).map(s => ({ type: 'sale', date: s.created_at, data: s })),
        ...(classes || []).map(c => ({ type: 'class', date: c.created_at || c.scheduled_time, data: c }))
    ];

    return activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
}

// --- POSTS, LIKES & COMMENTS ---

export async function getCenterPosts(id: string, allowFuture: boolean = false, isCenterId: boolean = false) {
    unstable_noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
        .from('center_posts')
        .select(`
            *,
            author:author_id (full_name, avatar_url),
            organization:organization_id (name, logo_url),
            likes:center_post_likes(user_id)
        `);

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    const now = new Date().toISOString();

    if (!allowFuture) {
        query = query.or(`scheduled_for.lte."${now}",scheduled_for.is.null`);
    }

    const { data, error } = await query
        .order('scheduled_for', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((post: any) => ({
        ...post,
        is_liked: user ? post.likes.some((l: any) => l.user_id === user.id) : false,
        likes: undefined
    }));
}

export async function getCenterPost(postId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('center_posts')
        .select(`
            *,
            author:author_id (full_name, avatar_url),
            organization:organization_id (name, logo_url),
            likes:center_post_likes(user_id)
        `)
        .eq('id', postId)
        .single();

    if (error) return null;

    return {
        ...data,
        is_liked: user ? data.likes.some((l: any) => l.user_id === user.id) : false,
        likes: undefined
    };
}

export async function deletePost(centerId: string, postId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('center_posts').delete().eq('id', postId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/wods`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function toggleCenterPostLike(centerId: string, postId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Login required" };

    const { data: existingLike } = await supabase
        .from('center_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

    if (existingLike) {
        await supabase.from('center_post_likes').delete().eq('id', existingLike.id);
        await supabase.rpc('decrement_center_post_likes', { post_id: postId });
    } else {
        await supabase.from('center_post_likes').insert({ post_id: postId, user_id: user.id });
        await supabase.rpc('increment_center_post_likes', { post_id: postId });

        // Notification
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();

        if (org) {
            const notifications = [];
            const message = `${profile?.full_name || 'Alguien'} le dio like a tu publicación.`;
            const link = `/dashboard/gyms/${centerId}/feed`;

            if (org.owner_id && org.owner_id !== user.id) {
                notifications.push({ user_id: org.owner_id, type: 'post_like', title: 'Nuevo Me Gusta', content: message, link, is_read: false });
            }
            if (org.head_coach_id && org.head_coach_id !== user.id && org.head_coach_id !== org.owner_id) {
                notifications.push({ user_id: org.head_coach_id, type: 'post_like', title: 'Nuevo Me Gusta', content: message, link, is_read: false });
            }
            if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
        }
    }

    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    return { success: true };
}

export async function getCenterPostComments(postId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('center_post_comments')
        .select(`
            *,
            user:user_id (id, full_name, avatar_url, username)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) return [];
    return data;
}

export async function addCenterPostComment(centerId: string, postId: string, content: string, postAsCenter: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !content.trim()) return { error: "Invalid data" };

    const { error } = await supabase.from('center_post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        post_as_center: postAsCenter
    });
    if (error) return { error: error.message };

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();

    if (org) {
        const notifications = [];
        const truncated = content.length > 30 ? content.substring(0, 30) + '...' : content;
        const message = `${profile?.full_name || 'Un usuario'} comentó: "${truncated}"`;
        const link = `/dashboard/gyms/${centerId}/feed`;

        if (org.owner_id && org.owner_id !== user.id) {
            notifications.push({ user_id: org.owner_id, type: 'post_comment', title: 'Nuevo Comentario', content: message, link, is_read: false });
        }
        if (org.head_coach_id && org.head_coach_id !== user.id && org.head_coach_id !== org.owner_id) {
            notifications.push({ user_id: org.head_coach_id, type: 'post_comment', title: 'Nuevo Comentario', content: message, link, is_read: false });
        }
        if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
    }

    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    return { success: true };
}

export async function deleteCenterPostComment(centerId: string, commentId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('center_post_comments').delete().eq('id', commentId);
    if (error) return { error: error.message };
    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    return { success: true };
}

// --- WODS ---

async function uploadMediaFiles(supabase: any, files: File[], centerId: string) {
    const urls: string[] = [];
    for (const file of files) {
        if (file.size > 0) {
            const fileName = `wods/${centerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('center-media').upload(fileName, file);
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('center-media').getPublicUrl(fileName);
                urls.push(publicUrl);
            }
        }
    }
    return urls;
}

export async function createWod(centerId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const scheduledFor = formData.get('scheduled_for') as string;
    const blocks = JSON.parse(formData.get('blocks') as string || '[]');

    for (let i = 0; i < blocks.length; i++) {
        const blockFiles = formData.getAll(`media_${blocks[i].id}`) as File[];
        if (blockFiles.length > 0) {
            const uploadedUrls = await uploadMediaFiles(supabase, blockFiles, centerId);
            blocks[i].media_urls = [...(blocks[i].media_urls || []), ...uploadedUrls];
        }

        if (blocks[i].exercises) {
            for (let j = 0; j < blocks[i].exercises.length; j++) {
                const ex = blocks[i].exercises[j];
                const fileKey = `media_block_${blocks[i].id}_ex_${ex.id}`;
                const exFiles = formData.getAll(fileKey) as File[];

                if (exFiles.length > 0) {
                    const uploadedUrls = await uploadMediaFiles(supabase, exFiles, centerId);
                    if (uploadedUrls.length > 0) {
                        blocks[i].exercises[j].media_url = uploadedUrls[0];
                    }
                }
            }
        }
    }

    let postAsCenter = formData.get('postAsCenter') === 'true';

    // SERVER-SIDE PERMISSION CHECK
    if (postAsCenter && user) {
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);

        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') {
                postAsCenter = false;
            }
        }
    }

    const structure = { warmup: formData.get('warmup') as string, blocks };
    const { error } = await supabase.from('center_posts').insert({
        organization_id: centerId,
        author_id: user?.id,
        content: JSON.stringify(structure),
        post_type: 'wod',
        scheduled_for: scheduledFor || new Date().toISOString(),
        post_as_center: postAsCenter
    });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/wods`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function updateWod(centerId: string, wodId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const scheduledFor = formData.get('scheduled_for') as string;
    const blocks = JSON.parse(formData.get('blocks') as string || '[]');

    for (let i = 0; i < blocks.length; i++) {
        const blockFiles = formData.getAll(`media_${blocks[i].id}`) as File[];
        if (blockFiles.length > 0) {
            const uploadedUrls = await uploadMediaFiles(supabase, blockFiles, centerId);
            blocks[i].media_urls = [...(blocks[i].media_urls || []), ...uploadedUrls];
        }

        if (blocks[i].exercises) {
            for (let j = 0; j < blocks[i].exercises.length; j++) {
                const ex = blocks[i].exercises[j];
                const fileKey = `media_block_${blocks[i].id}_ex_${ex.id}`;
                const exFiles = formData.getAll(fileKey) as File[];

                if (exFiles.length > 0) {
                    const uploadedUrls = await uploadMediaFiles(supabase, exFiles, centerId);
                    if (uploadedUrls.length > 0) {
                        blocks[i].exercises[j].media_url = uploadedUrls[0];
                    }
                }
            }
        }
    }

    let postAsCenter = formData.get('postAsCenter') === 'true';

    // SERVER-SIDE PERMISSION CHECK
    if (postAsCenter && user) {
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);

        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') {
                postAsCenter = false;
            }
        }
    }

    const structure = { warmup: formData.get('warmup') as string, blocks };
    const { error } = await supabase.from('center_posts').update({
        content: JSON.stringify(structure),
        scheduled_for: scheduledFor,
        updated_at: new Date().toISOString(),
        post_as_center: postAsCenter
    }).eq('id', wodId).eq('organization_id', centerId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/wods`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

// --- PUBLIC PROFILE ACTIONS ---

export async function getPublicCenter(centerId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('organizations').select('*, head_coach:head_coach_id (id, full_name, avatar_url, username)').eq('id', centerId).single();
    return data;
}

export async function checkFollowStatus(centerId: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await adminSupabase.from('center_followers').select('id').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
    return !!data;
}

export async function createPost(centerId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const content = formData.get('content') as string;
    const media = formData.get('media') as File;
    let postAsCenter = formData.get('postAsCenter') === 'true';
    let images: string[] = [];

    // SERVER-SIDE PERMISSION CHECK
    if (postAsCenter && user) {
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);

        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') {
                postAsCenter = false;
            }
        }
    }

    if (media && media.size > 0) {
        const fileName = `posts/${centerId}/${Date.now()}.${media.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('center-media').upload(fileName, media);
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('center-media').getPublicUrl(fileName);
            images = [publicUrl];
        }
    }

    const { error } = await supabase.from('center_posts').insert({
        organization_id: centerId,
        author_id: user?.id,
        content,
        post_type: 'post',
        image_urls: images,
        post_as_center: postAsCenter
    });
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function checkCenterFollowing(centerId: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await adminSupabase.from('center_followers').select('id').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
    return !!data;
}

export async function getMemberStatus(centerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('members').select('status, plan').eq('center_id', centerId).eq('user_id', user.id).maybeSingle();
    return data;
}

export async function toggleFollow(centerId: string, isFollowing: boolean) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para seguir." };

    if (isFollowing) {
        await adminSupabase.from('center_followers').delete().eq('organization_id', centerId).eq('user_id', user.id);
    } else {
        await adminSupabase.from('center_followers').insert({ organization_id: centerId, user_id: user.id });
    }
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function getClassesForDate(centerId: string, date: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // Get user

    const d = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[d.getDay()];
    const startOfDay = new Date(date).toISOString();
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999)).toISOString();

    const { data, error } = await supabase
        .from('classes')
        .select(`id, name, scheduled_time, day_of_week, time, duration_minutes, max_capacity, coach_id, enrollments:class_enrollments(count)`)
        .eq('organization_id', centerId)
        .gte('scheduled_time', startOfDay)
        .lte('scheduled_time', endOfDay);

    if (error) return [];

    const coachIds = [...new Set(data.map(c => c.coach_id).filter(Boolean))];
    let coaches: any[] = [];
    if (coachIds.length > 0) {
        const { data: coachData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', coachIds);
        coaches = coachData || [];
    }

    const filtered = data; // Already filtered by date in the query

    const sorted = [...filtered].sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""));

    const { data: wods } = await supabase
        .from('center_posts')
        .select('*')
        .eq('organization_id', centerId)
        .eq('post_type', 'wod')
        .gte('scheduled_for', startOfDay)
        .lte('scheduled_for', endOfDay);

    const dailyWod = wods && wods.length > 0 ? wods[0] : null;

    const finalClasses = sorted.map((c: any) => ({
        ...c,
        coach: coaches.find(coach => coach.id === c.coach_id) || { full_name: 'Staff' },
        scheduled_time: c.scheduled_time || `${date}T${c.time || '00:00:00'}`,
        enrolled_count: (c.scheduled_time && c.scheduled_time.split('T')[0] === date) ? (c.enrollments?.[0]?.count || 0) : 0,
        wod: dailyWod // Attach WOD
    })).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    // Fetch User Data for these classes
    // Fetch User Data for these classes
    if (user && finalClasses.length > 0) {
        const classIds = finalClasses.map(c => c.id);

        const { data: results } = await supabase
            .from('class_results')
            .select('*')
            .eq('user_id', user.id)
            .in('class_id', classIds);

        // Get Member ID for this center first
        const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('user_id', user.id)
            .eq('center_id', centerId)
            .maybeSingle();

        let myEnrollments: any[] = [];
        if (member) {
            const { data: enrollments } = await supabase
                .from('class_enrollments')
                .select('class_id')
                .eq('member_id', member.id)
                .in('class_id', classIds);
            myEnrollments = enrollments || [];
        }

        const myResults = results || [];

        return finalClasses.map((c: any) => ({
            ...c,
            my_result: myResults.find((r: any) => r.class_id === c.id) || null,
            is_enrolled: myEnrollments.some((e: any) => e.class_id === c.id)
        }));
    }

    return finalClasses;
}

export async function getDayRankings(centerId: string, date: string) {
    const admin = createAdminClient();

    // Find all classes for this organization
    const { data: classes } = await admin
        .from('classes')
        .select('id')
        .eq('organization_id', centerId);

    if (!classes || classes.length === 0) return {};
    const classIds = classes.map(c => c.id);

    // Use a slightly wider range to mitigate timezone-shift issues, then filter precisely
    const searchDate = new Date(date);
    const startRange = new Date(searchDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const endRange = new Date(searchDate.getTime() + 48 * 60 * 60 * 1000).toISOString();

    console.log(`[Leaderboard] Fetching for ${date}. Range: ${startRange} to ${endRange}`);

    const { data: results, error } = await admin
        .from('class_results')
        .select(`
            *,
            user:profiles (full_name, avatar_url, username)
        `)
        .in('class_id', classIds)
        .gte('date_performed', startRange)
        .lte('date_performed', endRange);

    if (error) {
        console.error("Leaderboard Query Error:", error);
        return {};
    }

    if (!results || results.length === 0) {
        console.log(`[Leaderboard] No hay resultados en DB para center ${centerId} en el periodo.`);
        return {};
    }

    console.log(`[Leaderboard] Resultados crudos encontrados: ${results.length}`);

    const leaderboard: Record<string, any[]> = {};

    results.forEach((res: any) => {
        // Filtrado preciso por fecha (YYYY-MM-DD)
        // Usamos una regex o split para manejar tanto 'T' como espacio
        const resDateStr = res.date_performed ? res.date_performed.split(/[T ]/)[0] : '';
        if (resDateStr !== date) {
            console.log(`[Leaderboard] Ignorando resultado de fecha ${resDateStr} (buscando ${date})`);
            return;
        }

        if (!res.data || !Array.isArray(res.data)) return;

        res.data.forEach((block: any) => {
            const blockType = block.type || 'time';
            const blockTitle = (block.title || (blockType === 'weight' ? 'FUERZA' : 'WOD')).toUpperCase().trim();

            if (blockType === 'weight' && block.exercises) {
                block.exercises.forEach((ex: any) => {
                    if (!ex.value || !ex.name) return;
                    const key = ex.name.toUpperCase().trim();
                    if (!leaderboard[key]) leaderboard[key] = [];

                    leaderboard[key].push({
                        user: res.user,
                        value: `${ex.value}KG`,
                        score: parseFloat(ex.value) || 0,
                        type: 'weight',
                        notes: `${ex.sets || '?'}X${ex.reps || '?'}`,
                        rx_level: block.rx_level || 'Intermedio',
                        wod_weight: 0
                    });
                });
            } else if (block.value) {
                const key = blockTitle;
                if (!leaderboard[key]) leaderboard[key] = [];

                let score = 0;
                if (blockType === 'rounds') {
                    // Soporte para formato "5 + 2" (Rondas + Reps)
                    if (typeof block.value === 'string' && block.value.includes('+')) {
                        const [rds, reps] = block.value.split('+').map((s: string) => parseFloat(s.trim()) || 0);
                        score = rds + (reps / 1000);
                    } else {
                        score = parseFloat(block.value) || 0;
                    }
                } else if (blockType === 'time') {
                    const parts = String(block.value).split(':');
                    if (parts.length === 2) {
                        score = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    } else {
                        score = parseFloat(block.value) || 99999;
                    }
                }

                leaderboard[key].push({
                    user: res.user,
                    value: String(block.value).toUpperCase(),
                    score: score,
                    weight_score: parseFloat(block.wod_weight) || 0,
                    wod_weight: parseFloat(block.wod_weight) || 0,
                    type: blockType,
                    notes: res.notes || '',
                    rx_level: block.rx_level || 'Intermedio'
                });
            }
        });
    });

    // Ordenar rankings
    Object.keys(leaderboard).forEach(key => {
        leaderboard[key].sort((a, b) => {
            const levelMap: any = { 'Avanzado': 3, 'Intermedio': 2, 'Escalado': 1 };
            const levelA = levelMap[a.rx_level] || 0;
            const levelB = levelMap[b.rx_level] || 0;
            if (levelA !== levelB) return levelB - levelA;

            if (a.type === 'time') {
                if (a.score !== b.score) return a.score - b.score;
            } else {
                if (a.score !== b.score) return b.score - a.score;
            }
            return (b.weight_score || 0) - (a.weight_score || 0);
        });
    });

    return leaderboard;
}

export async function getClassesForRange(centerId: string, startDate: string, endDate: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch all classes for the organization
    const { data: allClasses, error } = await supabase
        .from('classes')
        .select(`
            id, 
            name, 
            scheduled_time, 
            day_of_week, 
            time, 
            duration_minutes, 
            max_capacity, 
            coach_id, 
            enrollments:class_enrollments(count)
        `)
        .eq('organization_id', centerId)
        .gte('scheduled_time', startDate)
        .lte('scheduled_time', endDate);

    if (error) return {};

    // 2. Fetch all coaches
    const coachIds = [...new Set(allClasses.map(c => c.coach_id).filter(Boolean))];
    let coaches: any[] = [];
    if (coachIds.length > 0) {
        const { data: coachData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', coachIds);
        coaches = coachData || [];
    }

    // 3. Fetch WODs for the range
    const { data: wods } = await supabase
        .from('center_posts')
        .select('*')
        .eq('organization_id', centerId)
        .eq('post_type', 'wod')
        .gte('scheduled_for', startDate)
        .lte('scheduled_for', endDate);

    // 4. Fetch User Data (Enrollments & Results)
    let myEnrollments: any[] = [];
    let myResults: any[] = [];
    if (user) {
        const { data: member } = await supabase
            .from('members')
            .select('id')
            .eq('user_id', user.id)
            .eq('center_id', centerId)
            .maybeSingle();

        if (member) {
            const { data: enrolls } = await supabase
                .from('class_enrollments')
                .select('class_id, enrollment_date')
                .eq('member_id', member.id);
            myEnrollments = enrolls || [];

            const { data: results } = await supabase
                .from('class_results')
                .select('*')
                .eq('user_id', user.id);
            myResults = results || [];
        }
    }

    // 5. Expand and filter by date range
    const days: Record<string, any[]> = {};
    const curr = new Date(startDate);
    const last = new Date(endDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    while (curr <= last) {
        const dateStr = curr.toISOString().split('T')[0];
        const dayOfWeek = dayNames[curr.getDay()];

        const dayClasses: any[] = [];
        const unique = new Map();

        allClasses.forEach((c: any) => {
            const isSpecific = c.scheduled_time && c.scheduled_time.split('T')[0] === dateStr;

            if (isSpecific) {
                const timeKey = c.time || (c.scheduled_time ? new Date(c.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '00:00:00');
                const key = `${c.name}-${timeKey}`;

                if (!unique.has(key)) {
                    unique.set(key, {
                        ...c,
                        coach: coaches.find(coach => coach.id === c.coach_id) || { full_name: 'Staff' },
                        scheduled_time: c.scheduled_time,
                        enrolled_count: c.enrollments?.[0]?.count || 0,
                        wod: wods?.find(w => w.scheduled_for?.split('T')[0] === dateStr) || null,
                        is_enrolled: myEnrollments.some(e => e.class_id === c.id && e.enrollment_date?.split('T')[0] === dateStr),
                        my_result: myResults.find(r => r.class_id === c.id && r.date_performed?.split('T')[0] === dateStr) || null
                    });
                }
            }
        });

        days[dateStr] = Array.from(unique.values()).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
        curr.setDate(curr.getDate() + 1);
    }

    return days;
}

export async function requestTrial(centerId: string, date?: string, classId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para solicitar una prueba." };

    const { data: existingMember } = await supabase.from('members').select('id').eq('center_id', centerId).eq('user_id', user.id).maybeSingle();
    if (existingMember) return { error: "Ya eres miembro." };

    const { data: existingReq } = await supabase.from('trial_requests').select('id').eq('organization_id', centerId).eq('user_id', user.id).eq('status', 'pending').maybeSingle();
    if (existingReq) return { error: "Ya tienes una solicitud." };

    const { error } = await supabase.from('trial_requests').insert({ organization_id: centerId, user_id: user.id, status: 'pending', request_date: new Date().toISOString(), scheduled_date: date || null, class_id: classId || null });
    if (error) return { error: error.message };

    // Trigger Notification for Staff
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const { data: org } = await supabase.from('organizations').select('name, owner_id, head_coach_id').eq('id', centerId).single();

    if (org) {
        const notifications = [];
        const message = `${profile?.full_name || 'Un usuario'} ha solicitado una prueba gratuita.`;
        const link = `/dashboard/gyms/${centerId}/members`;

        if (org.owner_id && org.owner_id !== user.id) {
            notifications.push({ user_id: org.owner_id, type: 'trial_request', title: 'Solicitud de Prueba', content: message, link, is_read: false });
        }
        if (org.head_coach_id && org.head_coach_id !== user.id && org.head_coach_id !== org.owner_id) {
            notifications.push({ user_id: org.head_coach_id, type: 'trial_request', title: 'Solicitud de Prueba', content: message, link, is_read: false });
        }
        if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
    }

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    return { success: true };
}

export async function getClassAttendees(classId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('class_enrollments')
        .select(`
            member:member_id (
                full_name,
                avatar_url,
                user_id
            )
        `)
        .eq('class_id', classId);

    // We also want to fetch usernames if possible for linking
    if (!data) return [];

    const attendees = data.map((d: any) => d.member);

    // Enrich with usernames from profiles if they have user_id
    const userIds = attendees.filter((a: any) => a.user_id).map((a: any) => a.user_id);
    if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
        if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            attendees.forEach((a: any) => {
                const profile = profileMap.get(a.user_id);
                if (a.user_id && profile) {
                    a.username = profile.username;
                }
            });
        }
    }

    return attendees;
}

export async function enrollInClass(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión." };

    const { data: member } = await supabase.from('members').select('id, status').eq('center_id', centerId).eq('user_id', user.id).single();
    if (!member || (member.status !== 'active' && member.status !== 'trial')) return { error: "Membresía no válida." };

    const { data: classData } = await supabase.from('classes').select('max_capacity, class_enrollments(count)').eq('id', classId).single();
    if (!classData || (classData.class_enrollments?.[0]?.count || 0) >= classData.max_capacity) return { error: "Sin cupo." };

    const { data: existing } = await supabase.from('class_enrollments').select('id').eq('class_id', classId).eq('member_id', member.id).maybeSingle();
    if (existing) return { error: "Ya inscrito." };

    await supabase.from('class_enrollments').insert({ class_id: classId, member_id: member.id, enrollment_date: new Date().toISOString(), attended: false });

    // Notification
    const { data: classInfo } = await supabase.from('classes').select('name, organization:organization_id(name)').eq('id', classId).single();
    if (classInfo) {
        await createNotification({
            userId: user.id,
            type: 'class_reservation',
            title: 'Reserva Confirmada',
            // @ts-ignore
            content: `Has reservado tu lugar en ${classInfo.name} en ${classInfo.organization?.name || 'el centro'}.`,
            link: `/gym/${centerId}`
        });
    }

    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function updateMemberPlan(centerId: string, memberId: string, newPlan: string) {
    const admin = createAdminClient();
    await admin.from('members').update({ plan: newPlan, updated_at: new Date().toISOString() }).eq('id', memberId).eq('center_id', centerId);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function updateMemberDetails(centerId: string, memberId: string, data: any) {
    const admin = createAdminClient();

    // Sanitize dates
    const sanitizedData = { ...data };
    if ('birth_date' in sanitizedData) sanitizedData.birth_date = sanitizeDate(sanitizedData.birth_date);
    if ('membership_start_date' in sanitizedData) sanitizedData.membership_start_date = sanitizeDate(sanitizedData.membership_start_date);
    if ('membership_end_date' in sanitizedData) sanitizedData.membership_end_date = sanitizeDate(sanitizedData.membership_end_date);
    if ('notes' in sanitizedData) sanitizedData.notes = sanitizedData.notes; // Explicitly keep notes

    const { error } = await admin.from('members').update({ ...sanitizedData, updated_at: new Date().toISOString() }).eq('id', memberId).eq('center_id', centerId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function toggleMemberStatus(centerId: string, memberId: string, newStatus: string) {
    const admin = createAdminClient();
    // Allow setting specific status (active, paused, inactive, trial, banned)
    const statusToSet = ['active', 'inactive', 'paused', 'trial', 'banned'].includes(newStatus) ? newStatus : 'active';

    const { error } = await admin.from('members').update({ status: statusToSet, updated_at: new Date().toISOString() }).eq('id', memberId).eq('center_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function searchAthletes(query: string) {
    // Switch to standard client to use the authenticated user's context
    const supabase = await createClient();
    if (!query || query.trim().length < 1) return [];

    const searchQuery = query.trim();
    console.log(`[searchAthletes] Searching for (RPC): "${searchQuery}"`);

    // Use RPC function for robust searching (bypasses potential RLS/Query Builder issues)
    const { data, error } = await supabase.rpc('search_profiles_rpc', { search_query: searchQuery });

    if (error) {
        console.error("[searchAthletes] Error searching profiles (RPC):", error);
        return [];
    }

    console.log(`[searchAthletes] Found ${data?.length || 0} results for "${searchQuery}"`);
    return data || [];
}

export async function linkMemberToUser(centerId: string, memberId: string, userId: string) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url, birth_date').eq('id', userId).single();
    if (!profile) return { error: "No encontrado" };

    const { error } = await supabase.from('members').update({
        user_id: userId,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        birth_date: profile.birth_date || null,
        updated_at: new Date().toISOString()
    }).eq('id', memberId).eq('center_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

// --- MEMBERSHIP PLANS ---

export async function getMembershipPlans(centerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('organization_id', centerId)
        .order('price', { ascending: true });

    if (error) {
        console.error("Error fetching membership plans:", error);
        return [];
    }
    return data || [];
}

export async function createMembershipPlan(centerId: string, data: any) {
    const admin = createAdminClient();
    const { error } = await admin
        .from('membership_plans')
        .insert({
            organization_id: centerId,
            name: data.name,
            description: data.description || '',
            price: parseFloat(data.price) || 0,
            duration_months: parseInt(data.duration) || 1,
            features: data.features || [],
            is_active: true
        });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function updateMembershipPlan(centerId: string, planId: string, data: any) {
    console.log(`Updating plan ${planId} for center ${centerId}`);
    const admin = createAdminClient();
    const { data: updatedData, error } = await admin
        .from('membership_plans')
        .update({
            name: data.name,
            description: data.description,
            price: parseFloat(data.price),
            duration_months: parseInt(data.duration),
            features: data.features,
            is_active: data.is_active ?? true,
            updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('organization_id', centerId)
        .select();

    console.log("Update result:", { updatedData, error });
    if (error) return { error: error.message };
    if (!updatedData || updatedData.length === 0) return { error: "No se encontró el plan o no tienes permisos." };
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function deleteMembershipPlan(centerId: string, planId: string) {
    console.log(`Deleting plan ${planId} for center ${centerId}`);
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('membership_plans')
        .delete()
        .eq('id', planId)
        .eq('organization_id', centerId)
        .select();

    console.log("Delete result:", { data, error });
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: "No se pudo eliminar el plan. Puede que ya no exista o no tengas permisos." };
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function bulkImportMembers(centerId: string, membersData: any[]) {
    const supabase = await createClient();

    const membersToInsert = membersData.map(m => ({
        center_id: centerId,
        full_name: m.full_name || 'Nuevo Atleta',
        email: m.email || null,
        phone: m.phone || null,
        birth_date: sanitizeDate(m.birth_date),
        plan: m.plan || 'unlimited',
        status: m.status || 'active',
        payment_method: m.payment_method || 'cash',
        membership_start_date: sanitizeDate(m.membership_start_date) || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('members')
        .insert(membersToInsert);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true, count: membersToInsert.length };
}

export async function getPendingClassReviews() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    // Look back 48 hours. If they haven't logged it by then, maybe they don't care.
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    // 1. Get recent enrollments for classes that have started
    // We fetch enrollments where user is the member
    const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select(`
            id,
            attended,
            class:classes!inner(
                id, 
                name, 
                scheduled_time, 
                organization_id,
                coach:profiles!coach_id(full_name),
                organization:organizations(name, logo_url)
            ),
            member:member_id!inner(user_id)
        `)
        .eq('member.user_id', user.id)
        .lt('classes.scheduled_time', nowISO)
        .gte('classes.scheduled_time', twoDaysAgo);

    if (error) {
        console.error("Error fetching pending reviews:", error);
        return [];
    }

    if (!enrollments || enrollments.length === 0) return [];

    // 2. Check for existing results
    const classIds = enrollments.map((e: any) => {
        const c = Array.isArray(e.class) ? e.class[0] : e.class;
        return c?.id;
    }).filter(Boolean);

    const { data: results } = await supabase
        .from('class_results')
        .select('class_id')
        .eq('user_id', user.id)
        .in('class_id', classIds);

    const completedClassIds = new Set(results?.map(r => r.class_id));

    // 3. Filter pending
    // Sort by most recent finished class first
    const pendingEnrollments = enrollments
        .filter((e: any) => {
            const c = Array.isArray(e.class) ? e.class[0] : e.class;
            return c && !completedClassIds.has(c.id);
        })
        .sort((a: any, b: any) => {
            const ca = Array.isArray(a.class) ? a.class[0] : a.class;
            const cb = Array.isArray(b.class) ? b.class[0] : b.class;
            return new Date(cb.scheduled_time).getTime() - new Date(ca.scheduled_time).getTime();
        });

    if (pendingEnrollments.length === 0) return [];

    // 4. Fetch WODs for these classes
    const enrichedClasses = await Promise.all(pendingEnrollments.map(async (e: any) => {
        const c = Array.isArray(e.class) ? e.class[0] : e.class;
        const dateStr = new Date(c.scheduled_time).toISOString().split('T')[0];

        // Fetch WOD
        const { data: wods } = await supabase
            .from('center_posts')
            .select('*')
            .eq('organization_id', c.organization_id)
            .eq('post_type', 'wod')
            .gte('scheduled_for', `${dateStr}T00:00:00`)
            .lte('scheduled_for', `${dateStr}T23:59:59`)
            .limit(1);

        const wod = wods && wods.length > 0 ? wods[0] : null;

        return {
            ...c,
            wod,
            enrollment_id: e.id,
            attended: e.attended
        };
    }));

    return enrichedClasses;
}

export async function processStoreSale(centerId: string, saleData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    // 1. Verify Stock
    const { data: product } = await supabase.from('center_products').select('*').eq('id', saleData.product_id).single();
    if (!product) return { error: "Producto no encontrado" };
    if (product.stock_quantity <= 0) return { error: "Sin stock" };

    // 2. Create Sale Record
    const { error: saleError } = await supabase.from('sales').insert({
        center_id: centerId,
        member_id: saleData.member_id || null,
        product_id: saleData.product_id,
        quantity: 1,
        total_amount: product.price,
        payment_status: 'completed'
    });

    if (saleError) return { error: saleError.message };

    // 3. Update Inventory
    await supabase.from('center_products').update({
        stock_quantity: product.stock_quantity - 1
    }).eq('id', product.id);

    // 4. Send Notification if Member
    if (saleData.member_id) {
        const { data: member } = await supabase.from('members').select('user_id').eq('id', saleData.member_id).single();
        if (member?.user_id) {
            await createNotification({
                userId: member.user_id,
                type: 'purchase',
                title: 'Compra Confirmada',
                content: `Has comprado ${product.name} por €${product.price}. ¡Disfrútalo!`,
                link: `/gym/${centerId}`
            });
        }
    }

    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function getDashboardMetrics(centerId: string) {
    const admin = createAdminClient();
    const now = new Date();

    // Week calc: Monday as start of week
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekISO = startOfWeek.toISOString();
    const monthISO = startOfMonth.toISOString();

    // 1. Attendance this week (unique members who attended at least one class)
    // We need to query class_enrollments joined with classes to filter by date and center
    const { data: attendanceData, error: attError } = await admin
        .from('class_enrollments')
        .select(`
            member_id,
            class:classes!inner(
                organization_id,
                scheduled_time
            )
        `)
        .eq('attended', true)
        .eq('class.organization_id', centerId)
        .gte('class.scheduled_time', weekISO);

    const weeklyAttendance = new Set(attendanceData?.map((a: any) => a.member_id)).size;

    // 2. New Enrollments (Week & Month)
    // We use createAdminClient to ensure we count all members
    const { count: newMembersWeek } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .gte('created_at', weekISO);

    const { count: newMembersMonth } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .gte('created_at', monthISO);

    // 3. Cancellations (Week & Month)
    // Approximate using updated_at + numeric status check if historical data isn't available
    const { count: cancelledWeek } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .in('status', ['inactive', 'cancelled', 'banned'])
        .gte('updated_at', weekISO);

    const { count: cancelledMonth } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .in('status', ['inactive', 'cancelled', 'banned'])
        .gte('updated_at', monthISO);

    return {
        weeklyAttendance,
        newMembersWeek: newMembersWeek || 0,
        newMembersMonth: newMembersMonth || 0,
        cancelledWeek: cancelledWeek || 0,
        cancelledMonth: cancelledMonth || 0
    };
}
