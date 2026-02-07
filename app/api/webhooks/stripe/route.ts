import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/config";
import { createAdminClient } from "@/utils/supabase/admin";
import { createNotification } from "@/app/dashboard/notifications-actions";

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

                    // 2. Notify User
                    if (userId) {
                        await createNotification({
                            userId: userId,
                            type: 'membership_activated',
                            title: 'Membresía Activada',
                            content: `¡Bienvenido! Tu membresía ha sido activada correctamente tras confirmar tu pago.`,
                            link: `/gym/${centerId}`
                        });
                    }

                    console.log(`Membership payment completed for user ${userId}, center ${centerId}`);
                } else if (organizationId) {
                    // CENTER UPGRADE
                    const starterPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_1SxdaPCpwHwK9MuevBVancPf'; // Placeholder
                    const proPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_1SxdavCpwHwK9Mueeesvlq6T'; // Placeholder

                    let planName = 'free';
                    if (priceId === starterPrice) planName = 'starter';
                    if (priceId === proPrice) planName = 'pro';

                    const { error } = await supabase
                        .from("organizations")
                        .update({ plan: planName })
                        .eq("id", organizationId);

                    if (error) console.error("Error updating organization plan:", error);
                    else console.log(`Organization ${organizationId} upgraded to ${planName}`);
                } else {
                    // ATHLETE UPGRADE
                    // Add fallbacks to match stripe-actions.ts
                    const premiumPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || 'price_1SxdaPCpwHwK9MuevBVancPf';
                    const elitePrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || 'price_1SxdavCpwHwK9Mueeesvlq6T';

                    let tier = 'free';
                    if (priceId === premiumPrice) tier = 'premium';
                    if (priceId === elitePrice) tier = 'elite';

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
            // Handle cancellation -> Downgrade to 'free'
            // We need to find the user by Stripe Customer ID
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

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
