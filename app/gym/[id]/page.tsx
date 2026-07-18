import { getCenterPosts, getPublicCenter, checkFollowStatus, getCenterProducts, getMemberStatus, getMembershipPlans, hasUsedTrialStatus } from "../../dashboard/gyms/management-actions";
import PublicCenterProfile from "./PublicCenterProfile";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isProfessional } from "@/lib/professional-types";

export default async function PublicCenterPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id } = await params;
    const sp = await searchParams;

    // Parallel fetching
    const [org, posts, isFollowing, products, memberStatus, membershipPlans, hasUsedTrial] = await Promise.all([
        getPublicCenter(id),
        getCenterPosts(id),
        checkFollowStatus(id),
        getCenterProducts(id),
        getMemberStatus(id),
        getMembershipPlans(id),
        hasUsedTrialStatus(id)
    ]);

    if (!org) {
        notFound();
    }

    if (isProfessional(org.center_type)) {
        const query = sp ? new URLSearchParams(sp as any).toString() : "";
        redirect(`/trainer/${id}${query ? `?${query}` : ""}`);
    }

    // Get followers count
    const supabase = await createClient();
    const { count } = await supabase
        .from('center_followers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id);

    // Get staff (todo el equipo del centro: owner, head coach, coaches, admins),
    // para mostrar sus fotos en el perfil público como "destacados".
    const [{ data: rolesData }, { data: ownerProfile }] = await Promise.all([
        supabase
            .from('center_roles')
            .select('role, profiles:user_id(id, full_name, username, avatar_url, bio)')
            .eq('organization_id', id),
        org.owner_id
            ? supabase.from('profiles').select('id, full_name, username, avatar_url, bio').eq('id', org.owner_id).single()
            : Promise.resolve({ data: null }),
    ]);

    const staffMap = new Map<string, any>();
    if (ownerProfile) staffMap.set(ownerProfile.id, { ...ownerProfile, role: 'owner' });
    (rolesData || []).forEach((r: any) => {
        if (r.profiles && !staffMap.has(r.profiles.id)) {
            staffMap.set(r.profiles.id, { ...r.profiles, role: r.role });
        }
    });
    const staff = Array.from(staffMap.values());
    const coaches = staff; // compat: algunos componentes aún esperan este nombre

    const { data: { user } } = await supabase.auth.getUser();

    return (
        <PublicCenterProfile
            org={org}
            initialPosts={posts}
            isFollowing={isFollowing}
            followersCount={count || 0}
            products={products}
            currentUserId={user?.id}
            memberStatus={memberStatus}
            coaches={coaches}
            staff={staff}
            membershipPlans={membershipPlans}
            hasUsedTrial={hasUsedTrial}
        />
    );
}
