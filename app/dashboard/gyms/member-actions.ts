'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notifications-actions";
import { sendPaymentRequestEmail } from "./email-actions";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe-config";

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
    // Note: members.center_id FK points to organizations table in this schema.
    // So when isCenterId=false, the orgId IS the center_id to query by.
    let memberQuery = admin.from('members').select('*');
    let requestQuery = admin.from('trial_requests').select('*, classes:class_id(name, scheduled_time)').eq('status', 'pending');

    if (isCenterId) {
        memberQuery = memberQuery.eq('center_id', id);
        requestQuery = requestQuery.eq('center_id', id);
    } else {
        memberQuery = memberQuery.eq('center_id', id);
        requestQuery = requestQuery.eq('organization_id', id);
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

        // 3. Check if center has Stripe Connect configured to receive funds
        const { data: centerOrg } = await admin
            .from('organizations')
            .select('stripe_account_id, stripe_onboarding_complete')
            .eq('id', centerId)
            .single();

        const amountCents = Math.round(plan.price * 100);
        const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT / 100);
        const centerHasConnect = !!(centerOrg?.stripe_account_id && centerOrg?.stripe_onboarding_complete);

        // 4. Create Checkout Session
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
                    unit_amount: amountCents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            // Destination charge: platform deducts fee, rest goes to center's bank account
            ...(centerHasConnect && {
                payment_intent_data: {
                    application_fee_amount: platformFeeCents,
                    transfer_data: {
                        destination: centerOrg!.stripe_account_id!,
                    },
                },
            }),
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


        // 5. Create or Update Member as 'pending_payment'
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

        // 6. Notify User
        const { data: org } = await supabase.from('organizations').select('name, logo_url').eq('id', centerId).single();
        const gymName = org?.name || 'Tu Centro';
        const gymLogo = org?.logo_url || null;

        await createNotification({
            userId,
            type: 'payment_requested',
            title: `Solicitud de Pago: ${gymName}`,
            content: `Tu centro ha solicitado el pago de tu membresía (${plan.name}). Haz clic aquí para completar el proceso de forma segura.`,
            link: session.url!
        });

        // 7. Send Email Notification via Resend
        const targetEmail = extraData.email || profile.email;
        if (targetEmail) {
            sendPaymentRequestEmail(
                targetEmail,
                profile.full_name || extraData.fullName || 'Atleta',
                gymName,
                plan.name,
                session.url!,
                gymLogo
            ).catch(err => console.error("Failed to send payment email:", err));
        }

        revalidatePath(`/dashboard/gyms/${centerId}/members`);
        return { success: true, checkoutUrl: session.url };
    } catch (err: any) {
        console.error("Error in requestMemberPayment:", err);
        return { error: err.message || "Error al procesar la solicitud de pago" };
    }
}

export async function approveTrialRequest(centerId: string, requestId: string, userId: string, fullName: string, avatarUrl: string) {
    const admin = createAdminClient();

    // 1. Get Request and Profile Info
    const [{ data: request }, { data: profile }] = await Promise.all([
        admin.from('trial_requests').select('class_id').eq('id', requestId).single(),
        admin.from('profiles').select('email, birth_date').eq('id', userId).single()
    ]);

    // 2. Create Member Record
    const { data: newMember, error: memberError } = await admin
        .from('members')
        .insert({
            center_id: centerId,
            user_id: userId,
            full_name: fullName || 'Athlete',
            avatar_url: avatarUrl || null,
            email: profile?.email || `user_${userId.substring(0, 8)}@rival.app`,
            birth_date: profile?.birth_date || null,
            plan: 'trial',
            status: 'trial',
            membership_start_date: new Date().toISOString(),
            membership_end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (memberError && memberError.code !== '23505') {
        return { error: memberError.message };
    }

    // 3. Get Member ID (either new or existing)
    let memberId = newMember?.id;
    if (!memberId) {
        const { data: existing } = await admin
            .from('members')
            .select('id')
            .eq('center_id', centerId)
            .eq('user_id', userId)
            .maybeSingle();
        memberId = existing?.id;
    }

    // 4. Enroll in Class if applicable
    if (memberId && request?.class_id) {
        await admin.from('class_enrollments').insert({
            class_id: request.class_id,
            member_id: memberId,
            attended: false,
            enrollment_date: new Date().toISOString()
        });
    }

    // 5. Finalize Request and Notify
    await admin.from('trial_requests').update({ status: 'approved' }).eq('id', requestId);

    const { data: org } = await admin.from('organizations').select('name').eq('id', centerId).single();
    const gymName = org?.name || 'El Centro';

    await createNotification({
        userId: userId,
        type: 'trial_approved',
        title: `¡Solicitud Aceptada en ${gymName}!`,
        content: `Tu solicitud de prueba ha sido aprobada. Ahora puedes ver tu nombre en la lista de la clase y reservar sesiones.`,
        link: `/gym/${centerId}`
    });

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath('/dashboard/gyms');
    revalidatePath(`/dashboard/gyms/${centerId}/schedule/[classId]`, 'page');
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
    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url, birth_date, email').eq('id', userId).single();
    if (!profile) return { error: "No encontrado" };

    const { error } = await supabase.from('members').update({
        user_id: userId,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email || null,
        birth_date: profile.birth_date || null,
        updated_at: new Date().toISOString()
    }).eq('id', memberId).eq('center_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    return { success: true };
}

export async function bookTrainerSlot(classId: string, trainerId: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "Debes iniciar sesión para reservar una sesión" };
    }

    // 2. Get class details and check availability
    const { data: classData, error: classError } = await adminSupabase
        .from('classes')
        .select(`
            id,
            name,
            scheduled_time,
            max_capacity,
            organization_id,
            center_id,
            enrollments:class_enrollments(count)
        `)
        .eq('id', classId)
        .single();

    if (classError || !classData) {
        return { error: "Sesión no encontrada" };
    }

    // Check if it's already booked (pending or approved request exists)
    const { data: existingRequests } = await adminSupabase
        .from('trial_requests')
        .select('id')
        .eq('class_id', classId)
        .in('status', ['pending', 'approved']);

    const totalOccupied = (classData.enrollments?.[0]?.count || 0) + (existingRequests?.length || 0);

    if (totalOccupied >= classData.max_capacity) {
        return { error: "Esta sesión ya está reservada u ocupada." };
    }

    // 3. Check if user already has a pending/approved request for this class
    const { data: userExistingRequest } = await adminSupabase
        .from('trial_requests')
        .select('id, status')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

    if (userExistingRequest) {
        return { error: `Ya tienes una solicitud ${userExistingRequest.status === 'pending' ? 'pendiente' : 'aprobada'} para esta sesión.` };
    }

    // 4. Insert pending trial request
    const { error: insertError } = await adminSupabase
        .from('trial_requests')
        .insert({
            user_id: user.id,
            organization_id: trainerId,
            center_id: classData.center_id || trainerId,
            class_id: classId,
            scheduled_date: classData.scheduled_time,
            status: 'pending'
        });

    if (insertError) {
        console.error("Error creating booking request:", insertError);
        return { error: "No se pudo enviar la solicitud de reserva." };
    }

    // 5. Notify the trainer
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    const { data: gym } = await adminSupabase
        .from('organizations')
        .select('name, owner_id')
        .eq('id', trainerId)
        .single();

    if (gym?.owner_id) {
        const dateStr = new Date(classData.scheduled_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const timeStr = new Date(classData.scheduled_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        await createNotification({
            userId: gym.owner_id,
            type: 'trial_request',
            title: 'Nueva Solicitud de Cita',
            content: `${profile?.full_name || 'Un alumno'} ha solicitado reservar la sesión "${classData.name}" el ${dateStr} a las ${timeStr}.`,
            link: `/dashboard/gyms/${trainerId}/members`
        });
    }

    revalidatePath(`/trainer/${trainerId}`);
    revalidatePath(`/dashboard/gyms/${trainerId}/members`);
    revalidatePath(`/dashboard/gyms/${trainerId}/schedule`);
    return { success: true };
}

export async function rejectBookingRequest(centerId: string, requestId: string, reason: string) {
    const admin = createAdminClient();

    // 1. Get request details to find the user ID and class name
    const { data: request } = await admin
        .from('trial_requests')
        .select('user_id, class_id, classes:class_id(name, scheduled_time)')
        .eq('id', requestId)
        .single();

    if (!request) return { error: "Solicitud no encontrada" };

    // 2. Update status and save reason in feedback_text
    const { error } = await admin
        .from('trial_requests')
        .update({ 
            status: 'rejected', 
            feedback_text: reason, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', requestId);

    if (error) return { error: error.message };

    // 3. Notify the client
    const { data: org } = await admin.from('organizations').select('name').eq('id', centerId).single();
    const gymName = org?.name || 'El Profesional';
    const className = (request.classes as any)?.name || 'la sesión';
    const classTime = (request.classes as any)?.scheduled_time 
        ? new Date((request.classes as any).scheduled_time).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '';

    await createNotification({
        userId: request.user_id,
        type: 'trial_rejected',
        title: `Reserva rechazada: ${gymName}`,
        content: `Tu solicitud para la sesión "${className}"${classTime ? ` del ${classTime}` : ''} ha sido rechazada. Motivo: ${reason}`,
        link: `/trainer/${centerId}`
    });

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
    revalidatePath(`/trainer/${centerId}`);
    return { success: true };
}

export async function cancelPendingBooking(requestId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Debes iniciar sesión." };

    const admin = createAdminClient();
    // Verify ownership
    const { data: req } = await admin.from('trial_requests').select('user_id, organization_id').eq('id', requestId).single();
    if (!req || req.user_id !== user.id) {
        return { error: "No autorizado" };
    }

    const { error } = await admin.from('trial_requests').delete().eq('id', requestId);
    if (error) return { error: error.message };

    revalidatePath(`/trainer/${req.organization_id}`);
    revalidatePath(`/dashboard/gyms/${req.organization_id}/members`);
    revalidatePath(`/dashboard/gyms/${req.organization_id}/schedule`);
    return { success: true };
}

// ─── MEMBER LEAVE REQUESTS ────────────────────────────────────────────────────

export async function requestMemberLeave(centerId: string, memberId: string, reason?: string) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    // Check already pending
    const { data: existing } = await admin
        .from('member_leave_requests')
        .select('id')
        .eq('member_id', memberId)
        .eq('status', 'pending')
        .maybeSingle();
    if (existing) return { error: "Ya tienes una solicitud de baja pendiente." };

    const { error } = await admin.from('member_leave_requests').insert({
        member_id: memberId,
        center_id: centerId,
        user_id: user.id,
        reason: reason || null,
        status: 'pending'
    });
    if (error) return { error: error.message };

    // Notify center owner
    const { data: org } = await admin.from('organizations').select('name, owner_id').eq('id', centerId).single();
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single();
    if (org?.owner_id) {
        await createNotification({
            userId: org.owner_id,
            type: 'member_leave_requested',
            title: `Solicitud de baja — ${profile?.full_name || 'Un miembro'}`,
            content: reason ? `Motivo: ${reason}` : 'Ha solicitado darse de baja del centro.',
            link: `/dashboard/gyms/${centerId}/members`
        });
    }

    return { success: true };
}

export async function getLeaveRequests(centerId: string) {
    const admin = createAdminClient();
    const { data } = await admin
        .from('member_leave_requests')
        .select('*, profiles:user_id(full_name, avatar_url, username), members:member_id(plan, email)')
        .eq('center_id', centerId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
    return data || [];
}

export async function processLeaveRequest(requestId: string, action: 'approve' | 'reject', responseReason?: string) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { data: req } = await admin
        .from('member_leave_requests')
        .select('*, organizations:center_id(name)')
        .eq('id', requestId)
        .single();
    if (!req) return { error: "Solicitud no encontrada" };

    // Update request status
    await admin.from('member_leave_requests').update({
        status: action === 'approve' ? 'approved' : 'rejected',
        response_reason: responseReason || null,
        responded_at: new Date().toISOString()
    }).eq('id', requestId);

    if (action === 'approve') {
        // Set member as inactive
        await admin.from('members').update({ status: 'inactive', updated_at: new Date().toISOString() }).eq('id', req.member_id);
        // Notify member
        await createNotification({
            userId: req.user_id,
            type: 'member_leave_approved',
            title: `Baja aprobada — ${(req.organizations as any)?.name || 'Centro'}`,
            content: responseReason || 'Tu solicitud de baja ha sido aprobada.',
            link: `/gym/${req.center_id}`
        });
    } else {
        await createNotification({
            userId: req.user_id,
            type: 'member_leave_rejected',
            title: `Solicitud de baja rechazada — ${(req.organizations as any)?.name || 'Centro'}`,
            content: responseReason || 'El centro ha rechazado tu solicitud de baja. Contacta con ellos para más información.',
            link: `/gym/${req.center_id}`
        });
    }

    revalidatePath(`/dashboard/gyms/${req.center_id}/members`);
    return { success: true };
}

