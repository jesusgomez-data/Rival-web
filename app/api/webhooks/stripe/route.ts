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

                if (session.metadata?.type === 'store_purchase') {
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
                } else if (session.metadata?.type === 'membership_payment') {
                    const { centerId, userId, planId } = session.metadata;

                    // 1. Update Member status to 'active'
                    const { error: memberError } = await supabase
                        .from('members')
                        .update({
                            status: 'active',
                            membership_start_date: new Date().toISOString()
                        })
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

                        // Notification in-app
                        await createNotification({
                            userId: userId,
                            type: 'membership_activated',
                            title: '¡Membresía Activada!',
                            content: `¡Bienvenido a ${gymName}! Tu plan ${planName} ya está activo. ¡A darle duro!`,
                            link: `/gym/${centerId}`
                        });

                        // Post to Activity Feed
                        await supabase.from('posts').insert({
                            user_id: userId,
                            media_type: 'membership_activation',
                            caption: `¡Me he unido a ${gymName} con el plan ${planName}! ⚔️`
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
                    .select('id, center_id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (member) {
                    await supabase
                        .from('members')
                        .update({ status: 'active' })
                        .eq('id', member.id);
                    console.log(`Membership renewed for member ${member.id}`);
                }
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
