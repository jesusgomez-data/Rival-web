'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getClientIp, isRateLimited, recordAttempt } from '@/utils/rate-limit'
import { verifyTurnstileToken } from '@/utils/turnstile'
import { createNotification } from '@/app/dashboard/notifications-actions'

// Avisa a la cuenta oficial "rivalfit" (con push si la tiene activada) cada
// vez que alguien completa el registro. Se busca por username en vez de
// guardar el UUID a fuego para no romperlo si esa cuenta cambia algun dia.
// Nunca bloquea el registro si algo falla aqui.
export async function notifyOfficialAccountOfSignup(fullName: string, username: string) {
    try {
        const admin = createAdminClient()
        const { data: official } = await admin
            .from('profiles')
            .select('id')
            .eq('username', 'rivalfit')
            .maybeSingle()
        if (!official) return

        await createNotification({
            userId: official.id,
            type: 'new_signup',
            title: '🎉 Nuevo usuario registrado',
            content: `${fullName} (@${username}) se acaba de unir a RIVAL FIT.`,
            link: `/dashboard/profile/${username}`,
        })
    } catch (e) {
        console.error('[notifyOfficialAccountOfSignup] error:', e)
    }
}

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const ip = await getClientIp()

    // Se limita por email Y por IP: por email evita fuerza bruta contra una
    // cuenta concreta, por IP evita credential stuffing probando muchos
    // emails distintos desde el mismo atacante.
    const [emailLimit, ipLimit] = await Promise.all([
        isRateLimited(email, 'login'),
        isRateLimited(ip, 'login'),
    ])
    if (emailLimit.limited || ipLimit.limited) {
        return { error: `Demasiados intentos. Espera ${emailLimit.retryAfterMinutes || ipLimit.retryAfterMinutes} minutos antes de volver a intentarlo.` }
    }

    const captcha = await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip)
    if (!captcha.success) {
        return { error: captcha.error }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    // If error, return it to the state
    if (error) {
        console.error("Login Error:", error);
        await Promise.all([recordAttempt(email, 'login', false), recordAttempt(ip, 'login', false)])
        return { error: error.message }
    }

    await Promise.all([recordAttempt(email, 'login', true), recordAttempt(ip, 'login', true)])

    // If success, redirect (this throws an error in Next.js to handle redirect, so it must be outside try/catch or just straight up)
    redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const username = formData.get('username') as string
    const birthDate = formData.get('birthDate') as string

    const ip = await getClientIp()
    const ipLimit = await isRateLimited(ip, 'signup')
    if (ipLimit.limited) {
        return { error: `Demasiadas cuentas creadas desde aquí. Espera ${ipLimit.retryAfterMinutes} minutos e inténtalo de nuevo.` }
    }

    const captcha = await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip)
    if (!captcha.success) {
        return { error: captcha.error }
    }

    // Política de contraseña mínima: sin esto, la única barrera era el
    // default de Supabase (6 caracteres, sin complejidad) — muy por debajo
    // de lo que exige cualquier red social seria.
    if (password.length < 8) {
        return { error: 'La contraseña debe tener al menos 8 caracteres.' }
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return { error: 'La contraseña debe incluir mayúsculas, minúsculas y al menos un número.' }
    }

    const supabase = await createClient()

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
            // IMPORTANT: Make sure NEXT_PUBLIC_APP_URL is set in your Vercel/Server variables
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
            data: {
                full_name: `${firstName} ${lastName}`,
                username: username,
                birth_date: birthDate,
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

        await recordAttempt(ip, 'signup', false)
        // Don't leak stack traces to user
        return { error: errorMessage }
    }

    await recordAttempt(ip, 'signup', true)

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
                email: email, // Added email
                birth_date: birthDate,
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

        await notifyOfficialAccountOfSignup(`${firstName} ${lastName}`, username)
    }

    if (data.session) {
        redirect('/onboarding')
    } else if (data.user) {
        // "Confirm Anytime" Flow:
        // If Supabase has "Confirm Email" ON, it returns no session. 
        // We attempt to Login immediately. If "Allow Unconfirmed Signups" is ON, this will work.
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (loginData.session) {
            redirect('/onboarding')
        }

        // If auto-login failed (e.g. "Allow Unconfirmed Signups" is OFF or other error), show message.
        return {
            success: true,
            message: "¡Cuenta creada con éxito! Hemos enviado un correo de confirmación. Por favor verifícalo."
        }
    } else {
        return {
            success: true,
            message: "¡Cuenta creada con éxito! Por favor verifica tu correo electrónico."
        }
    }
}
