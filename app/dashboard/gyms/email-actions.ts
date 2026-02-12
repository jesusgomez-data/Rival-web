'use server'

import { Resend } from 'resend';
let resend: any = null;
try {
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
} catch (err) {
    console.error("Error initializing Resend client:", err);
}

export async function sendRegistrationEmail(email: string, athleteName: string, gymName: string) {
    if (!resend) {
        console.warn("⚠️ Resend client not initialized. Check RESEND_API_KEY.");
        return { error: "Configuración de correo pendiente (RESEND_API_KEY)." };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Rival Fit <notifications@rivalfit.app>',
            to: [email],
            subject: `Invitación a Rival Fit - ${gymName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://rivalfit.app/logo.png" alt="Rival Fit" style="width: 100px;" />
                    </div>
                    <h1 style="font-size: 24px; font-weight: bold; font-style: italic; color: #E11D48; margin-bottom: 20px;">¡HOLA ${athleteName.toUpperCase()}!</h1>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Tu centro deportivo, <strong>${gymName}</strong>, te invita a unirte a <strong>Rival Fit</strong>, la plataforma oficial para gestionar tus entrenamientos, clases y comunidad.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://rivalfit.app/signup" style="background-color: #E11D48; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-style: italic; text-transform: uppercase;">Regístrate Ahora</a>
                    </div>
                    <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
                        Si el botón no funciona, copia y pega este enlace: <br/>
                        <a href="https://rivalfit.app/signup" style="color: #E11D48;">https://rivalfit.app/signup</a>
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Rival Fit - Potenciado por IA. <br/>
                        © 2026 Rival Fit. Todos los derechos reservados.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend Error:", error);
            return { error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error("Send Email Error:", err);
        return { error: err.message || "Error al enviar el correo" };
    }
}

export async function sendPaymentRequestEmail(email: string, athleteName: string, gymName: string, planName: string, paymentLink: string, gymLogoUrl?: string | null) {
    if (!resend) {
        console.warn("⚠️ Resend client not initialized. Check RESEND_API_KEY.");
        return { error: "Configuración de correo pendiente (RESEND_API_KEY)." };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Rival Fit <notifications@rivalfit.app>',
            to: [email],
            subject: `Solicitud de Pago - ${gymName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111; background-color: #f9f9f9; border: 1px solid #eee; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px; background-color: #000; padding: 30px; border-radius: 12px 12px 0 0;">
                        ${gymLogoUrl ? `
                            <img src="${gymLogoUrl}" alt="${gymName}" style="max-width: 150px; max-height: 80px; margin-bottom: 10px; border-radius: 8px;" />
                        ` : `
                            <img src="https://rivalfit.app/logo.png" alt="Rival Fit" style="width: 80px;" />
                        `}
                        <div style="color: #fff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px;">${gymName}</div>
                    </div>
                    
                    <div style="padding: 20px; background-color: #fff; border-radius: 0 0 12px 12px;">
                        <h1 style="font-size: 24px; font-weight: bold; font-style: italic; color: #E11D48; margin-bottom: 20px; text-transform: uppercase;">¡HOLA ${athleteName.toUpperCase()}!</h1>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                            Tu centro deportivo, <strong>${gymName}</strong>, ha solicitado el pago de tu membresía: <strong>${planName}</strong>.
                        </p>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            Puedes completar el proceso de pago de forma segura haciendo clic en el siguiente enlace:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${paymentLink}" style="background-color: #E11D48; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-style: italic; text-transform: uppercase; display: inline-block;">Completar Pago</a>
                        </div>
                        <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
                            Si el botón no funciona, copia y pega este enlace: <br/>
                            <a href="${paymentLink}" style="color: #E11D48; word-break: break-all;">${paymentLink}</a>
                        </p>
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Rival Fit - Potenciado por IA. <br/>
                        © 2026 Rival Fit. Todos los derechos reservados.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend Payment Error:", error);
            return { error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error("Send Payment Email Error:", err);
        return { error: err.message || "Error al enviar el correo de pago" };
    }
}

export async function sendWelcomeEmail(email: string, athleteName: string, gymName: string, planName: string, gymLogoUrl?: string | null) {
    if (!resend) {
        console.warn("⚠️ Resend client not initialized. Check RESEND_API_KEY.");
        return { error: "Configuración de correo pendiente (RESEND_API_KEY)." };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Rival Fit <notifications@rivalfit.app>',
            to: [email],
            subject: `¡Bienvenido a ${gymName}!`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111; background-color: #f9f9f9; border: 1px solid #eee; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px; background-color: #000; padding: 30px; border-radius: 12px 12px 0 0;">
                        ${gymLogoUrl ? `
                            <img src="${gymLogoUrl}" alt="${gymName}" style="max-width: 150px; max-height: 80px; margin-bottom: 10px; border-radius: 8px;" />
                        ` : `
                            <img src="https://rivalfit.app/logo.png" alt="Rival Fit" style="width: 80px;" />
                        `}
                        <div style="color: #fff; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px;">${gymName}</div>
                    </div>
                    
                    <div style="padding: 20px; background-color: #fff; border-radius: 0 0 12px 12px;">
                        <h1 style="font-size: 24px; font-weight: bold; font-style: italic; color: #E11D48; margin-bottom: 20px; text-transform: uppercase;">¡MEMBRESÍA ACTIVA!</h1>
                        <p style="font-size: 18px; font-weight: bold; margin-bottom: 20px;">¡Hola ${athleteName}!</p>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                            ¡Es oficial! Tu suscripción al plan <strong>${planName}</strong> en <strong>${gymName}</strong> ha sido activada con éxito.
                        </p>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                            Ya puedes disfrutar de todos tus beneficios: reserva de clases, seguimiento de entrenamientos y acceso completo a la comunidad de tu centro.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://rivalfit.app/dashboard" style="background-color: #E11D48; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-style: italic; text-transform: uppercase; display: inline-block;">Entrar al Panel</a>
                        </div>
                        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px; text-align: center; font-style: italic;">
                            "Tu única competencia es tu yo de ayer. Hoy le has ganado."
                        </p>
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Rival Fit - Potenciado por IA. <br/>
                        © 2026 Rival Fit. Todos los derechos reservados.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend Welcome Error:", error);
            return { error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error("Send Welcome Email Error:", err);
        return { error: err.message || "Error al enviar el correo de bienvenida" };
    }
}
