import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_PRICES } from "@/utils/stripe/config";
import { createAdminClient } from "@/utils/supabase/admin";
import { createNotification } from "@/app/dashboard/notifications-actions";
import { sendWelcomeEmail } from "@/app/dashboard/gyms/email-actions";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            console.error("Missing Stripe Signature or Webhook Secret");
            return new NextResponse("Webhook Secret Missing", { status: 400 });
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabase = createAdminClient();

    // Handle the event
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const customerId = session.customer as string;

            // Here we would ideally map Price ID to a plan name
            // For now, we'll assume the session was for a subscription upgrade
            // You can get line items to be more specific

            if (userId) {
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                const priceId = lineItems.data[0]?.price?.id;
                const organizationId = session.metadata?.organizationId;

                if (session.metadata?.type === 'service_booking') {
                    const { bookingId, organizationId: orgId } = session.metadata

                    // Mark booking as paid
                    const { error: bookingErr } = await supabase
                        .from('service_bookings')
                        .update({ status: 'paid', stripe_payment_intent_id: session.payment_intent as string })
                        .eq('id', bookingId)
                        .eq('status', 'accepted')

                    if (bookingErr) {
                        console.error('Error updating service_booking to paid:', bookingErr)
                    } else {
                        // Notify professional
                        const { data: booking } = await supabase
                            .from('service_bookings')
                            .select('client_id, service_name, organization:professional_id(owner_id)')
                            .eq('id', bookingId)
                            .single()

                        if (booking) {
                            const ownerIdRaw = (booking.organization as any)?.owner_id
                            if (ownerIdRaw) {
                                await createNotification({
                                    userId: ownerIdRaw,
                                    type: 'booking_paid',
                                    title: 'Pago recibido',
                                    content: `El cliente ha pagado la sesión de ${booking.service_name}. Ya puedes confirmar el servicio cuando lo realices.`,
                                    link: `/dashboard/gyms/${orgId}/bookings`,
                                })
                            }
                        }
                        console.log(`Service booking ${bookingId} marked as paid`)
                    }
                } else if (session.metadata?.type === 'store_purchase') {
                    const { productId, centerId, userId, memberId } = session.metadata;

                    // 1. Create Sale Record (Admin Client)
                    const { error: saleError } = await supabase.from('sales').insert({
                        center_id: centerId,
                        member_id: memberId || null,
                        product_id: productId,
                        quantity: 1,
                        total_amount: session.amount_total ? session.amount_total / 100 : 0,
                        payment_status: 'completed'
                    });

                    if (saleError) console.error("Error saving store sale:", saleError);

                    // 2. Decrement Stock
                    const { data: product } = await supabase.from('center_products').select('name, stock_quantity').eq('id', productId).single();
                    if (product) {
                        await supabase.from('center_products').update({ stock_quantity: product.stock_quantity - 1 }).eq('id', productId);
                    }

                    // 3. Notify User
                    if (userId) {
                        await createNotification({
                            userId: userId,
                            type: 'purchase',
                            title: 'Compra Confirmada',
                            content: `Tu compra de ${product?.name || 'producto'} ha sido procesada con éxito.`,
                            link: `/gym/${centerId}`
                        });
                    }

                    console.log(`Store purchase completed for user ${userId}, product ${productId}`);
                } else if (session.metadata?.type === 'colaborador_subscription') {
                    const { userId } = session.metadata;
                    if (userId) {
                        const { error: colabError } = await supabase
                            .from('profiles')
                            .update({ is_colaborador: true })
                            .eq('id', userId);
                        
                        if (colabError) console.error("Error setting colaborador:", colabError);
                    }
                } else if (session.metadata?.type === 'membership_payment') {
                    const { centerId, userId, planId } = session.metadata;

                    // 1. Update Member status to 'active' + set expiry from plan duration
                    const { data: planData } = await supabase
                        .from('membership_plans')
                        .select('duration_months')
                        .eq('id', planId)
                        .single();

                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + (planData?.duration_months || 1));

                    const memberUpdate: Record<string, any> = {
                        status: 'active',
                        membership_start_date: new Date().toISOString(),
                        membership_end_date: endDate.toISOString().split('T')[0]
                    };

                    // Recurring plan → keep the subscription id to renew on each invoice
                    if (session.mode === 'subscription' && session.subscription) {
                        memberUpdate.stripe_subscription_id = session.subscription as string;
                    }

                    const { error: memberError } = await supabase
                        .from('members')
                        .update(memberUpdate)
                        .eq('center_id', centerId)
                        .eq('user_id', userId);

                    if (memberError) console.error("Error activating member:", memberError);

                    // 2. Notify & Welcome User
                    if (userId) {
                        // Fetch details for personalization
                        const [{ data: userProfile }, { data: org }, { data: plan }] = await Promise.all([
                            supabase.from('profiles').select('full_name, email').eq('id', userId).single(),
                            supabase.from('organizations').select('name, logo_url').eq('id', centerId).single(),
                            supabase.from('membership_plans').select('name').eq('id', planId).single()
                        ]);

                        const athleteName = userProfile?.full_name || 'Atleta';
                        const gymName = org?.name || 'Tu Centro';
                        const planName = plan?.name || 'Membresía';

                        // Registrar el pago con su recibo descargable (solo pagos únicos;
                        // las suscripciones se registran vía invoice.payment_succeeded)
                        if (session.mode !== 'subscription') {
                            let receiptUrl: string | null = null;
                            try {
                                if (session.payment_intent) {
                                    const pi = await stripe.paymentIntents.retrieve(
                                        session.payment_intent as string,
                                        { expand: ['latest_charge'] }
                                    );
                                    receiptUrl = (pi.latest_charge as any)?.receipt_url || null;
                                }
                            } catch (e) {
                                console.error('Error fetching receipt url:', e);
                            }

                            const { data: memberRow } = await supabase
                                .from('members')
                                .select('id')
                                .eq('center_id', centerId)
                                .eq('user_id', userId)
                                .single();

                            const { error: payLogError } = await supabase
                                .from('membership_payments')
                                .upsert({
                                    center_id: centerId,
                                    member_id: memberRow?.id || null,
                                    user_id: userId,
                                    plan_name: planName,
                                    amount: session.amount_total ? session.amount_total / 100 : 0,
                                    currency: session.currency || 'eur',
                                    stripe_ref: session.id,
                                    receipt_url: receiptUrl,
                                    paid_at: new Date().toISOString()
                                }, { onConflict: 'stripe_ref', ignoreDuplicates: true });

                            if (payLogError) console.error('Error logging membership payment:', payLogError);
                        }

                        // Notification in-app
                        await createNotification({
                            userId: userId,
                            type: 'membership_activated',
                            title: '¡Membresía Activada!',
                            content: `¡Bienvenido a ${gymName}! Tu plan ${planName} ya está activo. ¡A darle duro!`,
                            link: `/gym/${centerId}`
                        });

                        // Post to Activity Feed
                        // media_url guarda el centerId (no lo llevaba antes) para que la
                        // tarjeta del feed pueda enlazar al perfil público del centro.
                        await supabase.from('posts').insert({
                            user_id: userId,
                            media_type: 'membership_activation',
                            caption: `¡Me he unido a ${gymName} con el plan ${planName}! ⚔️`,
                            media_url: JSON.stringify({ centerId })
                        });

                        // Welcome Email via Resend
                        if (userProfile?.email) {
                            sendWelcomeEmail(
                                userProfile.email,
                                athleteName,
                                gymName,
                                planName,
                                org?.logo_url
                            ).catch(err => console.error("Error sending welcome email:", err));
                        }
                    }

                    console.log(`Membership payment completed for user ${userId}, center ${centerId}`);
                } else if (organizationId) {
                    // CENTER UPGRADE
                    let planName = 'free';
                    if (priceId === STRIPE_PRICES.center.starter) planName = 'starter';
                    if (priceId === STRIPE_PRICES.center.pro) planName = 'pro';

                    const { error } = await supabase
                        .from("organizations")
                        .update({ plan: planName })
                        .eq("id", organizationId);

                    if (error) console.error("Error updating organization plan:", error);
                    else console.log(`Organization ${organizationId} upgraded to ${planName}`);
                } else {
                    // ATHLETE UPGRADE
                    let tier = 'free';
                    if (priceId === STRIPE_PRICES.athlete.premium) tier = 'premium';
                    if (priceId === STRIPE_PRICES.athlete.elite) tier = 'elite';

                    const { error } = await supabase
                        .from("profiles")
                        .update({ subscription_tier: tier })
                        .eq("id", userId);

                    if (error) console.error("Error updating user tier:", error);
                    else console.log(`User ${userId} upgraded to ${tier}`);
                }
            }
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;

            // Cuota de miembro de centro → limpiar y avisar, NO tocar el tier del perfil
            if (subscription.metadata?.type === 'membership_subscription') {
                const { data: member } = await supabase
                    .from('members')
                    .select('id, center_id, user_id, full_name')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (member) {
                    await supabase
                        .from('members')
                        .update({ stripe_subscription_id: null })
                        .eq('id', member.id);

                    // Avisar al dueño del centro
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('owner_id, name')
                        .eq('id', member.center_id)
                        .single();

                    if (org?.owner_id) {
                        await createNotification({
                            userId: org.owner_id,
                            type: 'subscription_cancelled',
                            title: 'Renovación automática finalizada',
                            content: `La cuota recurrente de ${member.full_name || 'un alumno'} ha finalizado. Mantiene el acceso hasta su fecha de vencimiento.`,
                            link: `/dashboard/gyms/${member.center_id}/members`
                        });
                    }
                    console.log(`Member subscription ${subscription.id} cleaned for member ${member.id}`);
                }
                break;
            }

            // Suscripciones de la plataforma (tier de atleta)
            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", subscription.customer)
                .single();

            if (profile) {
                await supabase
                    .from("profiles")
                    .update({ subscription_tier: "free" })
                    .eq("id", profile.id);
                console.log(`User ${profile.id} downgraded due to cancellation`);
            }
            break;
        }

        case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const priceId = subscription.items.data[0]?.price?.id;
            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", subscription.customer)
                .single();

            if (profile && priceId) {
                let tier = 'free';
                if (priceId === STRIPE_PRICES.athlete.premium) tier = 'premium';
                if (priceId === STRIPE_PRICES.athlete.elite) tier = 'elite';
                await supabase
                    .from("profiles")
                    .update({ subscription_tier: tier })
                    .eq("id", profile.id);
                console.log(`User ${profile.id} subscription updated to ${tier}`);
            }
            break;
        }

        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const failedSubId = (invoice as any).subscription as string | null;

            // ¿Es la cuota recurrente de un miembro? → avisar a alumno y dueño
            if (failedSubId) {
                const { data: failedMember } = await supabase
                    .from('members')
                    .select('id, center_id, user_id, full_name')
                    .eq('stripe_subscription_id', failedSubId)
                    .single();

                if (failedMember) {
                    if (failedMember.user_id) {
                        await createNotification({
                            userId: failedMember.user_id,
                            type: 'payment_failed',
                            title: 'No pudimos cobrar tu cuota',
                            content: 'El cobro automático de tu membresía ha fallado. Revisa tu tarjeta; Stripe lo reintentará en los próximos días.',
                            link: `/gym/${failedMember.center_id}`
                        });
                    }

                    const { data: failedOrg } = await supabase
                        .from('organizations')
                        .select('owner_id')
                        .eq('id', failedMember.center_id)
                        .single();

                    if (failedOrg?.owner_id) {
                        await createNotification({
                            userId: failedOrg.owner_id,
                            type: 'payment_failed',
                            title: 'Cobro de cuota fallido',
                            content: `El cobro automático de ${failedMember.full_name || 'un alumno'} ha fallado. Stripe lo reintentará automáticamente.`,
                            link: `/dashboard/gyms/${failedMember.center_id}/members`
                        });
                    }

                    console.warn(`Membership payment failed for member ${failedMember.id}, invoice ${invoice.id}`);
                    break;
                }
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", invoice.customer)
                .single();

            if (profile) {
                console.warn(`Payment failed for user ${profile.id}, invoice ${invoice.id}`);
            }
            break;
        }

        // Center Stripe Connect onboarding completed
        case "account.updated": {
            const account = event.data.object as Stripe.Account;
            const isReady = account.details_submitted && (account.payouts_enabled ?? false);

            const { error } = await supabase
                .from('organizations')
                .update({ stripe_onboarding_complete: isReady })
                .eq('stripe_account_id', account.id);

            if (error) {
                console.error('Error updating org stripe status:', error);
            } else {
                console.log(`Organization with account ${account.id} onboarding_complete=${isReady}`);
            }
            break;
        }

        // Member membership renewal success — extend membership_end_date
        case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId = (invoice as any).subscription as string | null;
            if (subscriptionId) {
                const { data: member } = await supabase
                    .from('members')
                    .select('id, center_id, user_id, full_name')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (member) {
                    // The paid period end IS the new expiry date
                    const periodEndEpoch = invoice.lines?.data?.[0]?.period?.end;
                    const newEndDate = periodEndEpoch
                        ? new Date(periodEndEpoch * 1000).toISOString().split('T')[0]
                        : null;

                    await supabase
                        .from('members')
                        .update({
                            status: 'active',
                            ...(newEndDate && { membership_end_date: newEndDate })
                        })
                        .eq('id', member.id);

                    // Registrar el cobro con la factura descargable de Stripe
                    const { error: invLogError } = await supabase
                        .from('membership_payments')
                        .upsert({
                            center_id: member.center_id,
                            member_id: member.id,
                            user_id: member.user_id || null,
                            plan_name: invoice.lines?.data?.[0]?.description || 'Cuota de membresía',
                            amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
                            currency: invoice.currency || 'eur',
                            stripe_ref: invoice.id,
                            invoice_url: (invoice as any).hosted_invoice_url || null,
                            invoice_pdf: (invoice as any).invoice_pdf || null,
                            paid_at: new Date().toISOString()
                        }, { onConflict: 'stripe_ref', ignoreDuplicates: true });

                    if (invLogError) console.error('Error logging subscription payment:', invLogError);

                    console.log(`Membership renewed for member ${member.id} until ${newEndDate}`);
                }
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
