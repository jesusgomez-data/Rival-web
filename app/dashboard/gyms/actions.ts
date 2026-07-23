'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { isUserAdmin } from "@/utils/admin";

export type Role = 'owner' | 'head_coach' | 'coach' | 'athlete';

export async function checkIsAdmin() {
    return await isUserAdmin();
}

export async function getUserOrganizations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1. Get organizations owned by user
    const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', user.id);

    if (ownedError) {
        console.error("Error fetching owned orgs:", ownedError);
    }

    // 2. Get organizations where user is a team member
    const { data: memberOrgs, error: memberError } = await supabase
        .from('center_roles')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', user.id);

    if (memberError) {
        console.error("Error fetching member orgs:", memberError);
    }

    // Combine and deduplicate
    const allOrgs = [...(ownedOrgs || [])];

    if (memberOrgs) {
        memberOrgs.forEach((mo: any) => {
            if (!allOrgs.find(o => o.id === mo.organization_id)) {
                // Attach the role context to the organization object for easier UI usage
                const orgWithRole = { ...mo.organizations, user_role: mo.role };
                allOrgs.push(orgWithRole);
            }
        });
    }

    // Assign 'owner' role to owned orgs if not present
    const orgsWithRoles = allOrgs.map(org => ({
        ...org,
        user_role: org.owner_id === user.id ? 'owner' : (org.user_role || 'member')
    }));

    // 3. Fetch Real Member Counts
    // members.center_id FK points to organizations.id in this schema
    const orgIds = orgsWithRoles.map(o => o.id);
    if (orgIds.length > 0) {
        const { data: counts } = await supabase
            .from('members')
            .select('center_id')
            .in('center_id', orgIds)
            .eq('status', 'active');

        if (counts) {
            const countMap = counts.reduce((acc: any, curr: any) => {
                acc[curr.center_id] = (acc[curr.center_id] || 0) + 1;
                return acc;
            }, {});

            return orgsWithRoles.map(o => ({
                ...o,
                member_count: countMap[o.id] || 0
            }));
        }
    }

    return orgsWithRoles;
}

export async function createOrganization(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const address = formData.get('address') as string;
    const zipCode = formData.get('zip_code') as string;
    const phone = formData.get('phone') as string;
    const website = formData.get('website') as string;
    const instagram = formData.get('instagram') as string;
    const type = formData.get('type') as string;
    const plan = formData.get('plan') as string;
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;
    const logoFile = formData.get('logo') as File;
    const coverFile = formData.get('cover') as File;

    if (!name || !city || !country) return { error: "Faltan campos obligatorios (Nombre, Ciudad, País)" };

    let logoUrl = null;
    let coverUrl = null;

    // 1. Upload Logo if present
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `centers/${Date.now()}_logo_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, logoFile);

        if (uploadError) {
            console.error("Logo Upload Error:", uploadError);
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            logoUrl = publicUrl;
        }
    }

    // 2. Upload Cover if present
    if (coverFile && coverFile.size > 0) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `centers/${Date.now()}_cover_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, coverFile);

        if (uploadError) {
            console.error("Cover Upload Error:", uploadError);
        } else {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            coverUrl = publicUrl;
        }
    }

    const isMultiCenter = formData.get('is_multi_center') === 'true';
    const resolvedPlan = plan || 'free';

    // El plan free es una prueba de 2 meses, no gratis indefinido — se
    // registra la fecha de corte aqui mismo, en el momento de alta, para
    // que nadie pueda quedarse "gratis para siempre" sin pagar.
    const trialEndsAt = resolvedPlan === 'free'
        ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data, error } = await supabase
        .from('organizations')
        .insert({
            name,
            bio,
            city,
            country,
            address,
            zip_code: zipCode,
            phone,
            website,
            instagram,
            center_type: type,
            owner_id: user.id,
            email: user.email,
            plan: resolvedPlan,
            trial_ends_at: trialEndsAt,
            member_count: 1,
            logo_url: logoUrl,
            cover_photo_url: coverUrl,
            is_multi_center: isMultiCenter,
            latitude,
            longitude
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath('/dashboard/gyms');
    return { success: true, org: data };
}

export async function getOrganizationCenters(orgId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

    if (error) {
        console.error("Error fetching centers:", error);
        return [];
    }
    return data || [];
}

export async function getSedeDetails(sedeId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('centers')
        .select('*')
        .eq('id', sedeId)
        .single();

    if (error) {
        console.error("Error fetching sede details:", error);
        return null;
    }
    return data;
}

export async function updateSedeDetails(sedeId: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get('name') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const address = formData.get('address') as string;

    const { error } = await supabase
        .from('centers')
        .update({
            name,
            city,
            country,
            address
        })
        .eq('id', sedeId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function createCenter(orgId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const name = formData.get('name') as string;
    const city = formData.get('city') as string;
    const country = formData.get('country') as string;
    const address = formData.get('address') as string;
    const zipCode = formData.get('zip_code') as string;
    const phone = formData.get('phone') as string;
    const type = formData.get('type') as string;
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;
    const logoFile = formData.get('logo') as File;

    if (!name || !city || !country) return { error: "Faltan campos obligatorios" };

    let logoUrl = null;
    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `centers/${orgId}/${Date.now()}_logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, logoFile);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            logoUrl = publicUrl;
        }
    }

    const { data, error } = await supabase
        .from('centers')
        .insert({
            organization_id: orgId,
            name,
            city,
            country,
            address,
            zip_code: zipCode,
            phone,
            center_type: type,
            logo_url: logoUrl,
            status: 'active',
            latitude,
            longitude
        })
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${orgId}`);
    return { success: true, center: data };
}

export async function getCenterTeam(centerId: string) {
    const supabase = await createClient();

    // Get roles
    const { data: roles, error } = await supabase
        .from('center_roles')
        .select(`
            id,
            role,
            user_id,
            created_at,
            user:user_id (id, full_name, username, avatar_url)
        `)
        .eq('organization_id', centerId);

    if (error) {
        console.error("Error fetching team:", error);
        return [];
    }

    return roles || [];
}

export async function inviteTeamMember(centerId: string, username: string, role: string, explicitUserId?: string, manualEmail?: string) {
    const supabase = await createClient();

    let profile;

    if (explicitUserId) {
        const { data } = await supabase.from('profiles').select('id, full_name, username').eq('id', explicitUserId).single();
        profile = data;
    } else if (manualEmail) {
        // Check if user exists with this email
        const admin = createClient(); // Actually, standard client can't query auth.users. But we can query profiles if email is public? OR we assume they are new.
        // Let's first search in profiles by fuzzy email if possible, or just treat as new.
        // Actually, we should try to match existing profiles by email column in profiles table
        const { data: existingProfile } = await supabase.from('profiles').select('id, full_name, username').eq('email', manualEmail).maybeSingle();

        if (existingProfile) {
            profile = existingProfile;
        } else {
            // New User Invitation Flow
            // 1. Store in team_invitations table
            const { error: inviteError } = await supabase
                .from('team_invitations')
                .insert({
                    organization_id: centerId,
                    email: manualEmail,
                    role: role,
                    status: 'pending',
                    invited_by: (await supabase.auth.getUser()).data.user?.id
                });

            if (inviteError) {
                // If table doesn't exist, we might need to handle it.
                // Assuming I'll create it.
                return { error: "Error creando invitación: " + inviteError.message };
            }

            return { success: true, message: "Invitación enviada. El usuario se vinculará cuando se registre." };
        }
    } else {
        // 1. Attempt to find user by username or full name (fuzzy search)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .or(`username.ilike.%${username}%,full_name.ilike.%${username}%`)
            .limit(6);

        if (!profiles || profiles.length === 0) {
            return {
                error: `No hemos encontrado a nadie con "${username}". 
                
                IMPORTANTE: El usuario debe entrar al menos una vez en Rival para que su perfil sea visible. Si acaba de registrarse, pídale que refresque la página.`
            };
        }

        if (profiles.length === 1) {
            profile = profiles[0];
        } else {
            // Try to find an "almost exact" match first
            const exact = profiles.find(p =>
                p.username?.toLowerCase() === username.toLowerCase() ||
                p.full_name?.toLowerCase() === username.toLowerCase()
            );

            if (exact) {
                profile = exact;
            } else {
                const suggestions = profiles.map(p => `• @${p.username} (${p.full_name || 'Nombre no configurado'})`).join('\n');
                return { error: `Hemos encontrado varios usuarios similares. Escribe el @username exacto de uno de ellos:\n\n${suggestions}` };
            }
        }
    }

    if (!profile) return { error: "Perfil no encontrado." };

    // 2. Add Role
    const { error: insertError } = await supabase
        .from('center_roles')
        .insert({
            organization_id: centerId,
            user_id: profile.id,
            role: role
        });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
            return { error: "User is already in the team." };
        }
        return { error: insertError.message };
    }

    // 3. Update Organization's Head Coach reference if applicable
    if (role === 'head_coach') {
        const { error: orgError } = await supabase
            .from('organizations')
            .update({ head_coach_id: profile.id })
            .eq('id', centerId);

        if (orgError) console.error("Error updating organization head coach:", orgError);
    }

    revalidatePath(`/dashboard/gyms/${centerId}/team`);
    return { success: true };
}

export async function removeTeamMember(centerId: string, userId: string) {
    const supabase = await createClient();

    // Verify permissions: Only Head Coach or Owner can remove.
    // We trust the UI constraints but also backend RLS should handle it.

    const { error } = await supabase
        .from('center_roles')
        .delete()
        .eq('organization_id', centerId)
        .eq('user_id', userId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/team`);
    return { success: true };
}

export async function updateTeamMemberRole(centerId: string, userId: string, newRole: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('center_roles')
        .update({ role: newRole })
        .eq('organization_id', centerId)
        .eq('user_id', userId);

    if (error) return { error: error.message };

    // Update Head Coach reference if the new role is head_coach
    if (newRole === 'head_coach') {
        const { error: orgError } = await supabase
            .from('organizations')
            .update({ head_coach_id: userId })
            .eq('id', centerId);

        if (orgError) console.error("Error updating organization head coach:", orgError);
    }

    revalidatePath(`/dashboard/gyms/${centerId}/team`);
    return { success: true };
}

export async function getCenterDetails(centerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', centerId)
        .single();

    if (error) return null;
    return data;
}

export async function searchOrganizations(query: string) {
    const supabase = await createClient();

    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(10);

    if (!data || data.length === 0) return [];

    // Fetch real member counts for search results
    const orgIds = data.map(o => o.id);
    const { data: counts } = await supabase
        .from('members')
        .select('center_id')
        .in('center_id', orgIds);

    const countMap = counts?.reduce((acc: any, curr: any) => {
        acc[curr.center_id] = (acc[curr.center_id] || 0) + 1;
        return acc;
    }, {}) || {};

    return data.map(o => ({
        ...o,
        member_count: countMap[o.id] || 0
    }));
}

export async function getNearbyOrganizations(lat: number, lng: number) {
    const supabase = await createClient();

    // Fetch all public organizations that have lat/lng
    // In a production app with many orgs, we would use a PostGIS spatial query.
    const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('is_public', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

    if (error || !orgs) return [];

    // Haversine formula to calculate distance in KM
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const orgsWithDistance = orgs.map(org => ({
        ...org,
        distance: calculateDistance(lat, lng, Number(org.latitude), Number(org.longitude))
    }));

    // Sort by nearest
    orgsWithDistance.sort((a, b) => a.distance - b.distance);

    // Fetch member counts for these orgs
    const orgIds = orgsWithDistance.map(o => o.id);
    if (orgIds.length > 0) {
        const { data: counts } = await supabase
            .from('members')
            .select('center_id')
            .in('center_id', orgIds);

        const countMap = counts?.reduce((acc: any, curr: any) => {
            acc[curr.center_id] = (acc[curr.center_id] || 0) + 1;
            return acc;
        }, {}) || {};

        return orgsWithDistance.map(o => ({
            ...o,
            member_count: countMap[o.id] || 0
        }));
    }

    return orgsWithDistance;
}

export async function getAllProfessionals(centerType?: string | null) {
    const supabase = await createClient();

    const PROFESSIONAL_TYPE_KEYS = ['personal_trainer', 'physiotherapist', 'nutritionist', 'psychologist', 'sports_coach', 'strength_coach', 'yoga_instructor', 'pilates_instructor'];

    let query = supabase
        .from('organizations')
        .select('*')
        .in('center_type', centerType ? [centerType] : PROFESSIONAL_TYPE_KEYS)
        .order('created_at', { ascending: false })
        .limit(50);

    const { data } = await query;
    if (!data || data.length === 0) return [];

    const orgIds = data.map((o: any) => o.id);
    const { data: counts } = await supabase
        .from('members')
        .select('center_id')
        .in('center_id', orgIds);

    const countMap = (counts || []).reduce((acc: any, curr: any) => {
        acc[curr.center_id] = (acc[curr.center_id] || 0) + 1;
        return acc;
    }, {});

    return data.map((o: any) => ({ ...o, member_count: countMap[o.id] || 0 }));
}

export async function deleteCenter(orgId: string, centerId: string) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    // Verify ownership
    const { data: org } = await admin.from('organizations').select('owner_id').eq('id', orgId).single();
    if (!org || org.owner_id !== user.id) return { error: "Sin permisos para eliminar esta sede" };

    // Clean up child records first (FK constraints)
    const { data: centerClasses } = await admin.from('classes').select('id').eq('center_id', centerId);
    if (centerClasses?.length) {
        await admin.from('class_enrollments').delete().in('class_id', centerClasses.map(c => c.id));
    }
    await admin.from('classes').delete().eq('center_id', centerId);
    await admin.from('members').delete().eq('center_id', centerId);
    await admin.from('center_products').delete().eq('center_id', centerId);

    // Delete the center itself
    const { error } = await admin.from('centers').delete().eq('id', centerId).eq('organization_id', orgId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${orgId}`);
    return { success: true };
}

export async function deleteOrganization(orgId: string) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    // Verify ownership
    const { data: org } = await admin.from('organizations').select('owner_id').eq('id', orgId).single();
    if (!org || org.owner_id !== user.id) return { error: "Sin permisos" };

    // Cascade delete all child data
    const { data: centers } = await admin.from('centers').select('id').eq('organization_id', orgId);
    for (const center of centers || []) {
        const { data: classes } = await admin.from('classes').select('id').eq('center_id', center.id);
        if (classes?.length) {
            await admin.from('class_enrollments').delete().in('class_id', classes.map(c => c.id));
        }
        await admin.from('classes').delete().eq('center_id', center.id);
        await admin.from('members').delete().eq('center_id', center.id);
        await admin.from('center_products').delete().eq('center_id', center.id);
    }
    await admin.from('centers').delete().eq('organization_id', orgId);
    await admin.from('center_roles').delete().eq('organization_id', orgId);
    await admin.from('trial_requests').delete().eq('organization_id', orgId);
    await admin.from('memberships').delete().eq('organization_id', orgId);

    const { error } = await admin.from('organizations').delete().eq('id', orgId);
    if (error) return { error: error.message };

    revalidatePath('/dashboard/gyms');
    return { success: true };
}

export async function leaveOrganization(centerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    // 1. Remove from center_roles
    const { error: roleError } = await supabase
        .from('center_roles')
        .delete()
        .eq('organization_id', centerId)
        .eq('user_id', user.id);

    // 2. Remove from members
    const { error: memberError } = await supabase
        .from('members')
        .delete()
        .eq('center_id', centerId)
        .eq('user_id', user.id);

    if (roleError && memberError) {
        return { error: "No se pudo desafiliar: " + (roleError.message || memberError.message) };
    }

    revalidatePath('/dashboard/gyms');
    return { success: true };
}

export async function getExercises(sportType?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('exercises')
        .select('id, name, sport_type, category')
        .order('name', { ascending: true });

    if (sportType) {
        query = query.eq('sport_type', sportType);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching exercises:', error);
        return [];
    }
    return data || [];
}

