
export async function getCenterMembers(centerId: string) {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    console.log(`[DEBUG] getCenterMembers called for center ${centerId} by user ${user.id}`);

    // Check if service key is available
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log(`[DEBUG] Service Key available: ${hasServiceKey}`);

    // Let's use the authenticated client for everything since RLS should allow the owner to see it
    // We'll also try the admin client just in case

    const clientToUse = hasServiceKey ? admin : supabase;

    // 1. Fetch Organization to verify it exists and we can see it
    const { data: org, error: orgError } = await clientToUse
        .from('organizations')
        .select('name, owner_id')
        .eq('id', centerId)
        .single();

    if (orgError) {
        console.error(`[DEBUG] Org fetch error: ${orgError.message}`);
    } else {
        console.log(`[DEBUG] Org found: ${org.name}, Owner: ${org.owner_id}`);
    }

    // 2. Fetch Members
    const { data: members, error: mError } = await clientToUse
        .from('members')
        .select('*')
        .eq('center_id', centerId);

    if (mError) console.error(`[DEBUG] Members fetch error: ${mError.message}`);
    console.log(`[DEBUG] Members count: ${members?.length || 0}`);

    // 3. Fetch Trial Requests
    const { data: requests, error: rError } = await clientToUse
        .from('trial_requests')
        .select('*')
        .or(`organization_id.eq.${centerId},center_id.eq.${centerId}`)
        .eq('status', 'pending');

    if (rError) console.error(`[DEBUG] Requests fetch error: ${rError.message}`);
    console.log(`[DEBUG] Requests count: ${requests?.length || 0}`);

    const pendingMembers = (requests || []).map((r: any) => ({
        ...r,
        id: r.id || `pending-${Math.random()}`,
        full_name: r.full_name || 'Solicitud de Prueba',
        status: 'trial',
        is_request: true
    }));

    const result = [...pendingMembers, ...(members || [])];

    // If still 0, we add the emergency dummy
    if (result.length === 0) {
        console.warn("[DEBUG] NO DATA FOUND. Returning emergency dummy.");
        result.push({
            id: 'emergency-dummy',
            full_name: `No se encontraron atletas (ID Gym: ${centerId.substring(0, 8)})`,
            email: 'verifica@base.de.datos',
            status: 'trial',
            plan: 'trial'
        });
    }

    return result;
}
