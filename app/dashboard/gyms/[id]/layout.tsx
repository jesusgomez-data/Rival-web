import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import GymLayoutClient from "./GymLayoutClient";


export default async function CenterLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch Organization
    const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !org) {
        notFound();
    }

    // Verify Access (Role check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const isOwner = org.owner_id === user.id;
    let userRole: string = isOwner ? 'owner' : 'coach';

    if (!isOwner) {
        const { data: roleData } = await supabase
            .from('center_roles')
            .select('role')
            .eq('organization_id', id)
            .eq('user_id', user.id)
            .single();

        if (!roleData) {
            redirect('/dashboard/gyms'); // No access
        }
        userRole = roleData.role;
    }

    // Fetch User Profile for Header
    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();

    const isAdmin = userRole === 'owner' || userRole === 'head_coach';
    const roleLabel = userRole === 'owner' ? 'VISTA DE PROPIETARIO' : userRole === 'head_coach' ? 'VISTA DE HEAD COACH' : 'VISTA DE COACH';

    return (
        <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div></div>}>
            <GymLayoutClient
                org={org}
                isAdmin={isAdmin}
                roleLabel={roleLabel}
                userRole={userRole}
                profile={profile}
            >
                {children}
            </GymLayoutClient>
        </Suspense>
    );
}
