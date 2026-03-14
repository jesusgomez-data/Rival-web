import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Política de Privacidad | Rival Fit',
    description: 'Consulta cómo Rival Fit recopila, usa y protege tus datos personales.',
};

export default function PrivacyPage() {
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
                <h1 className="text-4xl font-black italic text-brand-red uppercase tracking-tighter mb-2">Política de Privacidad</h1>
                <p className="text-white/40 text-sm mb-12">Última actualización: marzo 2026</p>

                <div className="space-y-10 text-gray-300 leading-relaxed">

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">1. Responsable del Tratamiento</h2>
                        <p>
                            Rival Fit S.L. es el responsable del tratamiento de tus datos personales, de conformidad con el RGPD y la LOPDGDD. Contacto:{' '}
                            <a href="mailto:rival.app.official@gmail.com" className="text-white underline hover:text-white/70 transition-colors">
                                rival.app.official@gmail.com
                            </a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">2. Datos que Recopilamos</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong className="text-white">Registro:</strong> nombre, apellidos, email, fecha de nacimiento, nombre de usuario.</li>
                            <li><strong className="text-white">Actividad:</strong> sesiones de entrenamiento, estadísticas y progreso físico que tú decides registrar.</li>
                            <li><strong className="text-white">Pagos:</strong> procesados por Stripe. No almacenamos datos de tarjetas bancarias.</li>
                            <li><strong className="text-white">Uso:</strong> páginas visitadas, interacciones, dirección IP.</li>
                            <li><strong className="text-white">Comunicaciones:</strong> mensajes entre usuarios y tickets de soporte.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">3. Finalidad del Tratamiento</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Prestación del servicio y gestión de tu cuenta.</li>
                            <li>Procesamiento de pagos y gestión de suscripciones.</li>
                            <li>Envío de notificaciones relacionadas con el servicio.</li>
                            <li>Mejora de la Plataforma mediante análisis de uso.</li>
                            <li>Cumplimiento de obligaciones legales.</li>
                            <li>Atención al cliente y resolución de incidencias.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">4. Base Legal</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong className="text-white">Ejecución de contrato:</strong> para prestarte el servicio contratado.</li>
                            <li><strong className="text-white">Consentimiento:</strong> para notificaciones push y comunicaciones de marketing.</li>
                            <li><strong className="text-white">Interés legítimo:</strong> para análisis de uso y mejora del servicio.</li>
                            <li><strong className="text-white">Obligación legal:</strong> para el cumplimiento de normativas fiscales.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">5. Compartición de Datos</h2>
                        <p className="mb-3">Solo compartimos datos con proveedores necesarios para el servicio:</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong className="text-white">Supabase:</strong> base de datos y autenticación (servidores en la UE).</li>
                            <li><strong className="text-white">Stripe:</strong> procesamiento de pagos (certificado PCI-DSS).</li>
                            <li><strong className="text-white">Google (Gemini):</strong> funcionalidades de IA. Los mensajes pueden procesarse en sus servidores.</li>
                            <li><strong className="text-white">Resend:</strong> envío de emails transaccionales.</li>
                        </ul>
                        <p className="mt-3">No vendemos ni cedemos tus datos a terceros con fines comerciales.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">6. Conservación de Datos</h2>
                        <p>
                            Conservamos tus datos mientras mantengas una cuenta activa. Tras la eliminación, los datos se borran en un máximo de 30 días, salvo los que debamos conservar por obligación legal (datos de facturación: 5 años).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">7. Tus Derechos</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong className="text-white">Acceso:</strong> solicitar una copia de tus datos.</li>
                            <li><strong className="text-white">Rectificación:</strong> corregir datos inexactos.</li>
                            <li><strong className="text-white">Supresión:</strong> solicitar el borrado de tus datos.</li>
                            <li><strong className="text-white">Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
                            <li><strong className="text-white">Oposición:</strong> oponerte a ciertos tratamientos.</li>
                            <li><strong className="text-white">Limitación:</strong> solicitar la restricción del tratamiento.</li>
                        </ul>
                        <p className="mt-3">
                            Escríbenos a{' '}
                            <a href="mailto:rival.app.official@gmail.com" className="text-white underline hover:text-white/70 transition-colors">
                                rival.app.official@gmail.com
                            </a>
                            . También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">8. Cookies</h2>
                        <p>
                            Utilizamos cookies de sesión estrictamente necesarias para el funcionamiento de la autenticación. No utilizamos cookies de rastreo publicitario de terceros.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">9. Seguridad</h2>
                        <p>
                            Implementamos cifrado en tránsito (HTTPS/TLS), autenticación segura y control de acceso por roles para proteger tus datos. En caso de brecha de seguridad, te notificaremos en el plazo legalmente establecido.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white uppercase mb-3">10. Cambios en esta Política</h2>
                        <p>
                            Podemos actualizar esta Política periódicamente. Te notificaremos cambios significativos por email. La versión vigente siempre estará disponible en esta página.
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
