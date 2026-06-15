import { getCenterPosts, getPublicCenter, checkFollowStatus, getCenterProducts, getMemberStatus, getMembershipPlans } from "../../dashboard/gyms/management-actions";
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
    const [org, posts, isFollowing, products, memberStatus, membershipPlans] = await Promise.all([
        getPublicCenter(id),
        getCenterPosts(id),
        checkFollowStatus(id),
        getCenterProducts(id),
        getMemberStatus(id),
        getMembershipPlans(id)
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

    // Get Coaches
    const { data: coachesData } = await supabase
        .from('center_roles')
        .select('*, profiles:user_id(id, full_name, username, avatar_url, bio)')
        .eq('organization_id', id)
        .eq('role', 'coach');

    const coaches = coachesData?.map((c: any) => c.profiles).filter(Boolean) || [];

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
            membershipPlans={membershipPlans}
        />
    );
}
