'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath, unstable_noStore } from "next/cache";
import { createNotification } from "../notifications-actions";

export async function getCenterProducts(id: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    // "cost" (coste de compra) no se usa en ningun sitio de la UI — se lee
    // siempre de la vista publica sin esa columna, tanto para la tienda
    // publica del centro como para el panel del dueño.
    let query = supabase
        .from('center_products_public')
        .select('*');

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
}

export async function createProduct(centerId: string, formData: FormData) {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string);
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const image = formData.get('image') as File;

    let imageUrl = null;
    if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `products/${centerId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, image);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            imageUrl = publicUrl;
        }
    }

    const { error } = await supabase
        .from('center_products')
        .insert({
            organization_id: centerId,
            name,
            price,
            stock_quantity: stock,
            description,
            category,
            image_url: imageUrl
        });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function updateProduct(centerId: string, productId: string, formData: FormData) {
    const supabase = await createClient();

    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const stock = parseInt(formData.get('stock') as string);
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const image = formData.get('image') as File;

    const updateData: any = {
        name,
        price,
        stock_quantity: stock,
        description,
        category,
        updated_at: new Date().toISOString()
    };

    if (image && image.size > 0) {
        const fileExt = image.name.split('.').pop();
        const fileName = `products/${centerId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('center-media')
            .upload(fileName, image);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('center-media')
                .getPublicUrl(fileName);
            updateData.image_url = publicUrl;
        }
    }

    const { error } = await supabase
        .from('center_products')
        .update(updateData)
        .eq('id', productId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function deleteProduct(centerId: string, productId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('center_products').delete().eq('id', productId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}

export async function purchaseProduct(centerId: string, productId: string, paymentMethod: 'card' | 'cash' = 'card') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Login required" };

    // DYNAMIC IMPORT
    const { stripe } = await import("@/utils/stripe/config");

    // 1. Get Member & Profile
    const { data: member } = await supabase
        .from('members')
        .select('id, user_id')
        .eq('center_id', centerId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!member) return { error: "Debes ser miembro para comprar." };

    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, full_name, email')
        .eq('id', user.id)
        .single();

    // 2. Product Info
    const { data: product } = await supabase
        .from('center_products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) return { error: "Producto no encontrado" };
    if (product.stock_quantity <= 0) return { error: "Sin stock" };

    if (paymentMethod === 'cash') {
        const { error: saleError } = await supabase.from('sales').insert({
            center_id: centerId,
            member_id: member.id,
            product_id: productId,
            quantity: 1,
            total_amount: product.price,
            payment_status: 'pending_cash'
        });
        if (saleError) return { error: saleError.message };
        return { success: true, message: 'cash_registered' };
    }

    // 3. Card Flow (Stripe) — auto-repara customers de otro modo (test/live)
    let customerId: string;
    try {
        const { ensureStripeCustomer } = await import("@/utils/stripe/customer");
        customerId = await ensureStripeCustomer(
            stripe,
            profile?.stripe_customer_id,
            { email: user.email!, name: profile?.full_name || user.email!, metadata: { userId: user.id } },
            async (id) => {
                await supabase.from('profiles').update({ stripe_customer_id: id }).eq('id', user.id);
            }
        );
    } catch (e: any) {
        return { error: `Stripe Error: ${e.message}` };
    }

    // Check for saved cards
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    });

    const savedCard = paymentMethods.data?.[0];

    if (savedCard) {
        try {
            const intent = await stripe.paymentIntents.create({
                amount: Math.round(product.price * 100),
                currency: 'eur',
                customer: customerId,
                payment_method: savedCard.id,
                off_session: true,
                confirm: true,
                metadata: {
                    type: 'store_purchase',
                    productId: productId,
                    centerId: centerId,
                    userId: user.id,
                    memberId: member.id
                }
            });

            if (intent.status === 'succeeded') {
                await supabase.from('sales').insert({
                    center_id: centerId,
                    member_id: member.id,
                    product_id: productId,
                    quantity: 1,
                    total_amount: product.price,
                    payment_status: 'completed'
                });
                await supabase.from('center_products').update({ stock_quantity: product.stock_quantity - 1 }).eq('id', productId);

                revalidatePath(`/gym/${centerId}`);
                return { success: true };
            } else if (intent.status === 'requires_action') {
                return { checkoutUrl: intent.next_action?.redirect_to_url?.url || intent.next_action?.use_stripe_sdk?.stripe_js };
            }
        } catch (e: any) {
            console.error("Payment Intent failed", e);
        }
    }

    try {
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: product.name,
                        images: product.image_url ? [product.image_url] : [],
                    },
                    unit_amount: Math.round(product.price * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gym/${centerId}?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gym/${centerId}?status=canceled`,
            metadata: {
                type: 'store_purchase',
                productId: productId,
                centerId: centerId,
                userId: user.id,
                memberId: member.id
            }
        });

        return { checkoutUrl: session.url };
    } catch (e: any) {
        return { error: `Error: ${e.message}` };
    }
}

export async function processStoreSale(centerId: string, saleData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    // 1. Verify Stock
    const { data: product } = await supabase.from('center_products').select('*').eq('id', saleData.product_id).single();
    if (!product) return { error: "Producto no encontrado" };
    if (product.stock_quantity <= 0) return { error: "Sin stock" };

    // 2. Create Sale Record
    const { error: saleError } = await supabase.from('sales').insert({
        center_id: centerId,
        member_id: saleData.member_id || null, // Updated: allow null if not linked to a member (admin logic?)
        // Wait, original processStoreSale used saleData.member_id.
        // And it is called processStoreSale.
        // It seems to be used by ADMIN to process a sale manually.
        product_id: saleData.product_id,
        quantity: 1,
        total_amount: product.price,
        payment_status: 'completed'
    });

    if (saleError) return { error: saleError.message };

    // 3. Update Inventory
    await supabase.from('center_products').update({
        stock_quantity: product.stock_quantity - 1
    }).eq('id', product.id);

    // 4. Send Notification if Member
    if (saleData.member_id) {
        const admin = createAdminClient();
        const { data: member } = await admin.from('members').select('user_id').eq('id', saleData.member_id).single();
        if (member?.user_id) {
            await createNotification({
                userId: member.user_id,
                type: 'purchase',
                title: 'Compra Confirmada',
                content: `Has comprado ${product.name} por €${product.price}. ¡Disfrútalo!`,
                link: `/gym/${centerId}`
            });
        }
    }

    revalidatePath(`/dashboard/gyms/${centerId}/store`);
    return { success: true };
}
