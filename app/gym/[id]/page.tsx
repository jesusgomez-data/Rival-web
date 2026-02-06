import { getCenterPosts, getPublicCenter, checkFollowStatus, getCenterProducts, getMemberStatus } from "../../dashboard/gyms/management-actions";
import PublicCenterProfile from "./PublicCenterProfile";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function PublicCenterPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Parallel fetching
    const [org, posts, isFollowing, products, memberStatus] = await Promise.all([
        getPublicCenter(id),
        getCenterPosts(id),
        checkFollowStatus(id),
        getCenterProducts(id),
        getMemberStatus(id)
    ]);

    if (!org) {
        notFound();
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

    const coaches = coachesData?.map((c: any) => c.profiles) || [];

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
        />
    );
}
