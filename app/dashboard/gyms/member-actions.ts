'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notifications-actions";

// Helper
const sanitizeDate = (date: string | null | undefined) => {
    if (!date || date.trim() === "") return null;
    return date;
};

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

    // DYNAMIC IMPORT FOR STRIPE TO AVOID SERVER-ONLY BUNDLING IN CLIENT
    const { stripe } = await import("@/utils/stripe/config");

    try {
        // 1. Get plan details
        const { data: plan } = await supabase.from('membership_plans').select('*').eq('id', planId).single();
        if (!plan) return { error: "Plan no encontrado" };

        // 2. Get user profile for Stripe customer
        // We use admin client here to bypass RLS policies that might hide email/stripe_id
        console.log('[requestMemberPayment] Buscando perfil para userId:', userId);
        const { data: profile, error: profileError } = await admin.from('profiles').select('stripe_customer_id, full_name, email').eq('id', userId).single();

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
                email: extraData.email || profile.email,
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
