import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Mail, MapPin, Scale } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Aviso Legal | Rival Fit',
    description: 'Información legal sobre Rival Fit S.L. y el uso de nuestra plataforma.',
};

export default function NoticePage() {
    return (
        <div className="min-h-screen bg-black text-white font-inter">
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
                <Link href="/" className="text-xl font-black italic tracking-tight font-outfit">
                    RIVAL <span className="text-brand-red">FIT</span>
                </Link>
                <Link href="/" className="text-sm font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                    ← VOLVER
                </Link>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-5xl lg:text-7xl font-black italic text-brand-red uppercase tracking-tighter mb-4 font-outfit">Aviso Legal</h1>

                <div className="space-y-12 text-white/70 leading-relaxed text-sm lg:text-base">
                    

                    <section className="space-y-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest font-outfit">1. Propósito de la Plataforma</h2>
                        <p>
                            El sitio web <span className="text-white italic">rivalfit.app</span> y sus aplicaciones vinculadas tienen como propósito proporcionar una red social para el seguimiento de entrenamientos, la competencia deportiva y la conexión entre atletas y centros de fitness.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest font-outfit">2. Propiedad Intelectual</h2>
                        <p>
                            Rival Fit S.L. es titular de todos los derechos de propiedad intelectual e industrial de este sitio web y de los elementos contenidos en el mismo (imágenes, sonido, audio, vídeo, software o textos; marcas o logotipos, combinaciones de colores, estructura y diseño). Queda estrictamente prohibida su reproducción, distribución y comunicación pública sin la autorización expresa de Rival Fit.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest font-outfit">3. Exclusión de Responsabilidad</h2>
                        <p>
                            Rival Fit S.L. no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, falta de disponibilidad del portal o la transmisión de virus o programas maliciosos en los contenidos, a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest font-outfit">4. Enlaces</h2>
                        <p>
                            En el caso de que en la plataforma se dispusiesen enlaces o hipervínculos hacía otros sitios de Internet, Rival Fit no ejercerá ningún tipo de control sobre dichos sitios y contenidos. En ningún caso asumiremos responsabilidad alguna por los contenidos de algún enlace perteneciente a un sitio web ajeno.
                        </p>
                    </section>

                    <section className="space-y-4 border-t border-white/5 pt-12">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest font-outfit">Contacto Legal</h2>
                        <p>
                            Para cualquier comunicación relacionada con este aviso legal, puedes dirigirte a:{' '}
                            <a href="mailto:rival.app.official@gmail.com" className="text-white font-bold underline hover:text-brand-red transition-colors">
                                rival.app.official@gmail.com
                            </a>
                        </p>
                    </section>
                </div>
            </main>

            <footer className="border-t border-white/10 px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-white/20 text-[10px] font-black uppercase tracking-[0.2em] bg-white/[0.02]">
                <div className="flex items-center gap-4">
                    <Shield className="w-4 h-4 text-brand-red" />
                    <p>© 2026 Rival Fit S.L. Todos los derechos reservados.</p>
                </div>
                <div className="flex gap-10">
                    <Link href="/legal/terms" className="hover:text-white transition-colors">Términos</Link>
                    <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacidad</Link>
                </div>
            </footer>
        </div>
    );
}
