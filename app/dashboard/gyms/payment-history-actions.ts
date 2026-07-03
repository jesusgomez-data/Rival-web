'use server'

import { createClient } from "@/utils/supabase/server";

/** Historial de pagos de membresía del usuario logueado (todos sus centros). */
export async function getMyMembershipPayments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('membership_payments')
        .select('id, plan_name, amount, currency, invoice_url, invoice_pdf, receipt_url, paid_at, organization:center_id (name)')
        .eq('user_id', user.id)
        .order('paid_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[getMyMembershipPayments]', error);
        return [];
    }

    return (data || []).map((p: any) => ({
        ...p,
        center_name: (Array.isArray(p.organization) ? p.organization[0]?.name : p.organization?.name) || 'Centro'
    }));
}

/** Pagos de un miembro concreto, para la ficha del panel del centro (RLS: solo staff). */
export async function getMemberPayments(centerId: string, memberId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('membership_payments')
        .select('id, plan_name, amount, currency, invoice_url, invoice_pdf, receipt_url, paid_at')
        .eq('center_id', centerId)
        .eq('member_id', memberId)
        .order('paid_at', { ascending: false })
        .limit(24);

    if (error) {
        console.error('[getMemberPayments]', error);
        return [];
    }
    return data || [];
}
