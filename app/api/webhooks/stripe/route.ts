import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/utils/stripe/config";
import { createAdminClient } from "@/utils/supabase/admin";

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
                // Determine the tier (you can improve this by checking the price ID)
                // Let's check line items
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                const priceId = lineItems.data[0]?.price?.id;

                // MOCK MAPPING (Replace with your actual price IDs from Stripe)
                let tier = 'free';
                if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM) tier = 'premium';
                if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE) tier = 'elite';

                const { error } = await supabase
                    .from("profiles")
                    .update({
                        subscription_tier: tier,
                        // Optionally store customerId too for future portal access
                        // stripe_customer_id: customerId 
                    })
                    .eq("id", userId);

                if (error) {
                    console.error("Error updating user tier:", error);
                } else {
                    console.log(`User ${userId} upgraded to ${tier}`);
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
