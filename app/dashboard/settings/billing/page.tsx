"use client";

import { motion } from "framer-motion";
import { Check, Zap, Users, Trophy, Dumbbell, BarChart2, Brain, Sword, Star, ArrowRight, Instagram, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const benefits = [
    {
        icon: <Users className="w-6 h-6" />,
        title: "Red Social Completa",
        desc: "Feed, stories, comentarios e interacciones sin límites. Conecta con toda la comunidad.",
        color: "text-blue-400"
    },
    {
        icon: <Dumbbell className="w-6 h-6" />,
        title: "Registro de Élite",
        desc: "WODs, Fuerza, Running, Calistenia, OCR, Hybrid. Todas las disciplinas, sin restricciones.",
        color: "text-green-400"
    },
    {
        icon: <Trophy className="w-6 h-6" />,
        title: "Rankings Globales",
        desc: "Compite en los leaderboards mundiales. Tu posición la decide tu rendimiento, no tu plan.",
        color: "text-yellow-400"
    },
    {
        icon: <Sword className="w-6 h-6" />,
        title: "Duelos 1vs1 Ilimitados",
        desc: "Desafía a cualquier atleta de la comunidad. Sin límite de duelos activos.",
        color: "text-brand-red"
    },
    {
        icon: <BarChart2 className="w-6 h-6" />,
        title: "Analytics Avanzado",
        desc: "Gráficas de volumen, distribución muscular, RPE, fatiga y PRs. Todo disponible desde el día 1.",
        color: "text-purple-400"
    },
    {
        icon: <Brain className="w-6 h-6" />,
        title: "Coach IA",
        desc: "Programación personalizada con inteligencia artificial. Acceso completo para todos los atletas.",
        color: "text-cyan-400"
    },
];

export default function BillingPage() {
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('payment') === 'success') {
                setShowSuccess(true);
            }
        }
    }, []);

    const handleSubscribe = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/stripe/colaborador-checkout', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Error al iniciar checkout');
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-20">
            {showSuccess && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3 justify-center text-sm font-bold uppercase tracking-widest"
                >
                    <Check className="w-5 h-5" /> ¡Gracias por colaborar con Rival Fit!
                </motion.div>
            )}
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-6"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold uppercase tracking-widest">
                    <Zap className="w-3 h-3 fill-brand-red" /> 100% Gratis. Hecho por atletas.
                </div>

                <h1 className="text-4xl lg:text-6xl font-heading font-extrabold italic uppercase tracking-tighter text-white leading-none">
                    Rival es <span className="text-brand-red">Gratis</span><br />para Siempre
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    No hay membresías restrictivas, no hay paywalls abusivos.
                    Rival es una red social de atletas gratuita. Todo lo que necesitas para entrenar y competir está disponible desde el día 1.
                </p>
            </motion.div>

            {/* Benefits Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((b, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                        whileHover={{ y: -6 }}
                        className="bg-black/40 border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-all group"
                    >
                        <div className={`${b.color} mb-4 group-hover:scale-110 transition-transform`}>
                            {b.icon}
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2 uppercase italic tracking-tight">{b.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">{b.desc}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-black text-green-500 uppercase tracking-widest">
                            <Check className="w-3 h-3" /> Incluido gratis
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Manifesto / Collaborator Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="relative bg-gradient-to-br from-brand-red/15 via-black to-black border border-brand-red/20 rounded-[3rem] p-10 overflow-hidden"
            >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.1)_0%,transparent_60%)]" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="text-7xl shrink-0">🤝</div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter mb-3">
                            Apoya a Rival y conviértete en Colaborador
                        </h2>
                        <p className="text-gray-400 leading-relaxed text-sm">
                            Mantener los servidores y el desarrollo activo cuesta. Por eso, hemos creado la insignia de <strong>Colaborador</strong>. Un pago mensual simbólico y muy accesible para quienes quieren apoyar el proyecto. A cambio: <strong>cero publicidad</strong> y acceso anticipado a nuevas funcionalidades.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 text-xs font-bold text-gray-300">
                                <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" /> Sin Anuncios
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 text-xs font-bold text-gray-300">
                                <Star className="w-3 h-3 text-brand-red fill-brand-red" /> Insignia Colaborador
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 text-xs font-bold text-gray-300">
                                <Globe className="w-3 h-3 text-blue-400" /> Funciones Extra
                            </div>
                        </div>
                    </div>
                    
                    <div className="shrink-0 flex flex-col gap-3">
                        <button 
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apoyar por 4,99€ / mes"}
                        </button>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">Cancela cuando quieras</p>
                    </div>
                </div>
            </motion.div>

            {/* CTA final */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="text-center space-y-4"
            >
                <p className="text-gray-500 text-sm">
                    ¿Quieres que Rival siga siendo gratuito? Comparte la app y haz crecer la comunidad. 💪
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                    <Link
                        href="/dashboard"
                        className="bg-brand-red text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)] flex items-center gap-2 group"
                    >
                        Volver a Entrenar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <a
                        href="https://instagram.com/rivalfit.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        <Instagram className="w-4 h-4" /> Síguenos en IG
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
