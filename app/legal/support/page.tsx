import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircle, HelpCircle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Soporte | Rival Fit',
    description: '¿Necesitas ayuda con Rival Fit? Contacta con nosotros.',
};

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-black text-white font-inter">
            <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 bg-black/40">
                <Link href="/" className="text-xl font-black italic tracking-tight font-outfit">
                    RIVAL <span className="text-brand-red">FIT</span>
                </Link>
                <Link href="/" className="text-sm font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors">
                    ← VOLVER
                </Link>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16 lg:py-24">
                <div className="text-center space-y-4 mb-20">
                    <div className="flex items-center justify-center gap-2 text-brand-red mb-2">
                        <HelpCircle className="w-6 h-6 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">CENTRO DE AYUDA RIVAL</span>
                    </div>
                    <h1 className="text-6xl lg:text-[100px] font-black italic text-brand-red uppercase tracking-tighter leading-[0.85] font-outfit">¿CÓMO PODEMOS <br /> <span className="text-white text-neon-red">AYUDARTE?</span></h1>
                    <p className="max-w-xl mx-auto text-white/50 font-medium text-lg lg:text-xl leading-relaxed">Nuestro equipo de soporte está listo para asistirte con cualquier problema técnico o duda sobre tu cuenta.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                    {[
                        {
                            title: "CONSULTAS TÉCNICAS",
                            icon: Zap,
                            desc: "¿Problemas con la carga de videos o el seguimiento del WOD? Nuestro equipo técnico te ayudará de inmediato.",
                            email: "soporte@rivalfit.app"
                        },
                        {
                            title: "CUENTA Y PAGOS",
                            icon: CheckCircle2,
                            desc: "¿Dudas con tu suscripción Premium o facturación? Gestiona tu cuenta con total transparencia.",
                            email: "facturacion@rivalfit.app"
                        },
                        {
                            title: "COLABORACIONES",
                            icon: ArrowRight,
                            desc: "¿Quieres registrar tu gimnasio como centro oficial Rival Fit? Hablemos de cómo potenciar tu marca.",
                            email: "partners@rivalfit.app"
                        }
                    ].map((card, i) => (
                        <div key={i} className="group relative bg-[#050505] border border-white/5 p-10 rounded-[2.5rem] hover:border-brand-red/30 transition-all duration-500 overflow-hidden">
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center text-brand-red group-hover:scale-110 transition-transform">
                                    <card.icon className="w-6 h-6" />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white font-outfit">{card.title}</h4>
                                    <p className="text-sm text-white/40 font-medium leading-relaxed italic">{card.desc}</p>
                                </div>
                                <a 
                                    href={`mailto:${card.email}`}
                                    className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-brand-red hover:text-white transition-colors duration-300 group/link"
                                >
                                    CONTACTAR {card.email.toUpperCase()}
                                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-2 transition-transform" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                <section className="bg-brand-red/5 border border-brand-red/20 rounded-[3rem] p-12 lg:p-20 text-center space-y-12 relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-red/10 blur-[100px] rounded-full" />
                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-center -space-x-4 mb-8">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-16 h-16 rounded-full border-4 border-black overflow-hidden bg-[#111]">
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs font-black text-brand-red">H{i}</div>
                                </div>
                            ))}
                        </div>
                        <h2 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter text-white font-outfit">¿DUDAS CON LA <br /> <span className="text-brand-red underline underline-offset-8">DEMO EN VIVO?</span></h2>
                        <p className="max-w-2xl mx-auto text-white/50 font-medium text-lg">Si estás probando la plataforma por primera vez y quieres un tour guiado, nuestro equipo comercial puede ofrecerte una sesión 1:1.</p>
                        <div className="flex justify-center pt-4">
                            <Link href="/signup" className="px-12 py-5 bg-brand-red text-white font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-brand-red transition-all duration-300 italic shadow-2xl flex items-center gap-4">
                                SOLICITAR DEMO 1:1 <Zap className="w-4 h-4 fill-white group-hover:fill-brand-red" />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/10 px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-white/20 text-[10px] font-black uppercase tracking-[0.2em] bg-[#020202]">
                <div className="flex items-center gap-4">
                    <MessageCircle className="w-4 h-4 text-brand-red" />
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
