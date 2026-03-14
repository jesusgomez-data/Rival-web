import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Términos de Servicio | Rival Fit',
    description: 'Lee los Términos de Servicio de Rival Fit antes de usar nuestra plataforma.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white">
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <Link href="/" className="text-xl font-bold tracking-tight">
                    RIVAL <span className="text-white/40">FIT</span>
                </Link>
                <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
                    ← Volver al inicio
                </Link>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-black italic text-brand-red uppercase tracking-tighter mb-2">Términos de Servicio</h1>
                <p className="text-white/40 text-sm mb-12">Última actualización: marzo 2026</p>

                <div className="space-y-10 text-gray-300 leading-relaxed">

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">1. Aceptación de los Términos</h2>
                        <p>
                            Al acceder o utilizar Rival Fit (&quot;la Plataforma&quot;), operada por Rival Fit S.L. (&quot;nosotros&quot;), aceptas quedar vinculado por estos Términos de Servicio. Si no estás de acuerdo, no debes usar la Plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">2. Descripción del Servicio</h2>
                        <p>
                            Rival Fit es una red social orientada al fitness que permite registrar entrenamientos, competir con otros atletas, conectar con centros deportivos y acceder a contenido generado por inteligencia artificial. Incluye funcionalidades gratuitas y de pago (planes Premium, Elite, Starter y Pro).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">3. Registro y Cuenta</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Debes tener al menos 16 años para registrarte.</li>
                            <li>Eres responsable de mantener la confidencialidad de tu contraseña.</li>
                            <li>No puedes crear más de una cuenta personal.</li>
                            <li>Debes proporcionar información veraz y actualizada.</li>
                            <li>Nos reservamos el derecho de suspender cuentas que incumplan estos términos.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">4. Uso Aceptable</h2>
                        <p className="mb-3">Queda prohibido:</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Publicar contenido ofensivo, discriminatorio o ilegal.</li>
                            <li>Acosar, amenazar o intimidar a otros usuarios.</li>
                            <li>Usar bots o scripts para automatizar el uso de la Plataforma.</li>
                            <li>Intentar acceder a datos de otros usuarios sin autorización.</li>
                            <li>Reproducir o distribuir contenido de la Plataforma sin permiso.</li>
                            <li>Hacer ingeniería inversa o intentar extraer el código fuente.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">5. Suscripciones y Pagos</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Los planes de pago se facturan mensualmente a través de Stripe.</li>
                            <li>Al suscribirte, autorizas el cobro recurrente en tu método de pago.</li>
                            <li>Puedes cancelar en cualquier momento desde tu panel de configuración.</li>
                            <li>La cancelación surte efecto al final del período facturado en curso.</li>
                            <li>No realizamos reembolsos por períodos parciales, salvo que la ley lo exija.</li>
                            <li>Nos reservamos el derecho de modificar los precios con 30 días de preaviso.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">6. Propiedad Intelectual</h2>
                        <p>
                            Todo el contenido de la Plataforma — diseño, logo, código, textos e imágenes — es propiedad exclusiva de Rival Fit S.L. y está protegido por la legislación de propiedad intelectual. Queda prohibida su reproducción sin autorización escrita.
                        </p>
                        <p className="mt-3">
                            El contenido que publicas (fotos, registros, posts) sigue siendo tuyo. Nos otorgas una licencia no exclusiva para mostrarlo dentro de la Plataforma.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">7. Inteligencia Artificial</h2>
                        <p>
                            Las funcionalidades de IA (coach virtual, generador de entrenamientos) son orientativas y no sustituyen el consejo médico o de un profesional certificado. Rival Fit no se hace responsable de lesiones o perjuicios derivados del uso de estas recomendaciones.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">8. Limitación de Responsabilidad</h2>
                        <p>
                            Rival Fit no garantiza la disponibilidad ininterrumpida del servicio. En ningún caso seremos responsables por daños indirectos o consecuentes. Nuestra responsabilidad total no excederá el importe abonado en los últimos 12 meses.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">9. Modificaciones</h2>
                        <p>
                            Podemos actualizar estos Términos en cualquier momento. Te notificaremos cambios significativos por email. El uso continuado tras la notificación implica la aceptación de los nuevos términos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">10. Ley Aplicable</h2>
                        <p>
                            Estos Términos se rigen por la legislación española. Las partes se someten a la jurisdicción de los tribunales de España, sin perjuicio de los derechos que te correspondan como consumidor según la normativa de tu país.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">11. Contacto</h2>
                        <p>
                            Para consultas sobre estos Términos:{' '}
                            <a href="mailto:rival.app.official@gmail.com" className="text-white underline hover:text-white/70 transition-colors">
                                rival.app.official@gmail.com
                            </a>
                        </p>
                    </section>

                </div>
            </main>

            <footer className="border-t border-white/10 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/30 text-xs">
                <p>© 2026 Rival Fit S.L. Todos los derechos reservados.</p>
                <div className="flex gap-6">
                    <Link href="/legal/terms" className="hover:text-white transition-colors">Términos</Link>
                    <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacidad</Link>
                </div>
            </footer>
        </div>
    );
}
