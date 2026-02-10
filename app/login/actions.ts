'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    // If error, return it to the state
    if (error) {
        console.error("Login Error:", error);
        return { error: error.message }
    }

    // If success, redirect (this throws an error in Next.js to handle redirect, so it must be outside try/catch or just straight up)
    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const username = formData.get('username') as string

    // Validate username uniqueness BEFORE attempting signup
    const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is what we want
        console.error("Username check error:", checkError);
        return { error: "Error al verificar el nombre de usuario. Por favor intenta de nuevo." }
    }

    if (existingUser) {
        return { error: `El nombre de usuario "${username}" ya está en uso. Por favor elige otro.` }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // Explicitly set the redirect URL using the environment variable
            // This ensures production uses rivalfit.app and local uses localhost
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
            data: {
                full_name: `${firstName} ${lastName}`,
                username: username,
                avatar_url: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`
            }
        }
    })

    if (error) {
        console.error("Signup Error Detail:", error);
        let errorMessage = error.message;

        // Handle rate limiting specifically
        if (error.message.includes("security purposes") || error.code === '429') {
            errorMessage = "Demasiados intentos. Por favor espera unos segundos antes de intentar de nuevo.";
        }

        // Don't leak stack traces to user
        return { error: errorMessage }
    }

    // Explicitly create profile to ensure it exists and prevent "ghost" profiles
    if (data.user) {
        // Wait a short moment for Trigger (if any) to avoid race conditions, 
        // OR use upsert to be safe.
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                full_name: `${firstName} ${lastName}`,
                username: username,
                avatar_url: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

        if (profileError) {
            console.error("Manual Profile Creation Error:", profileError);

            // Check if it's a unique constraint violation on username
            if (profileError.code === '23505' && profileError.message.includes('username')) {
                return { error: `El nombre de usuario "${username}" ya está en uso. Por favor elige otro.` }
            }

            // Don't block flow for other errors, but log it. 
            // If trigger worked, this might fail or be redundant, which is fine with upsert.
        }
    }

    if (data.session) {
        revalidatePath('/', 'layout')
        redirect('/onboarding')
    } else {
        return {
            success: true,
            message: "Account created successfully! Please check your email to confirm your registration before logging in."
        }
    }
}
