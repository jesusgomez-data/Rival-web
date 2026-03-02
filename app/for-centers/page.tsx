"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import CenterDemo from "./CenterDemo";

import {
  ArrowRight, Check, Zap, BarChart3, Users,
  Shield, MessageSquare, Star, Flame, Trophy,
  Sun, Moon
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const features = [
  {
    icon: Zap,
    title: 'Gestión Simple',
    description: 'Crea tu perfil en 5 minutos. Gestiona clases, miembros y horarios sin complicaciones.',
  },
  {
    icon: Users,
    title: 'Atrae Leads',
    description: 'Tu perfil visible en la red social. Usuarios descubren tu centro y solicitan clases prueba automáticamente.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Avanzado',
    description: 'Retención, churn prediction, ocupación de clases. Toma decisiones basadas en datos.',
  },
  {
    icon: MessageSquare,
    title: 'Chat Integrado',
    description: 'Comunícate con tus coaches y miembros en una sola plataforma. Sin apps externas.',
  },
  {
    icon: Shield,
    title: 'Pagos Seguros',
    description: 'Stripe integrado. Tus miembros pagan directamente en la app. Liquidaciones semanales a tu cuenta.',
  },
  {
    icon: Check,
    title: 'Tienda Incluida',
    description: 'Vende merchandising, suplementos, clases extras. Los ingresos van directamente a tu centro.',
  },
];

const plans = [
  {
    name: 'FREE',
    price: '€0',
    description: 'Prueba gratis',
    features: [
      'Perfil público',
      'Hasta 10 clases/semana',
      'Check-in manual',
      'Hasta 50 miembros',
      'Chat básico',
    ],
    cta: 'Empezar Gratis',
    ctaLink: '/center-signup',
    highlight: false,
  },
  {
    name: 'STARTER',
    price: '€49.99',
    description: 'Oferta de Lanzamiento: Primeros 50 centros',
    features: [
      'Todo de Free',
      'Clases ilimitadas',
      'Sistema de pruebas',
      'Tienda básica',
      'Google Calendar sync',
      'Notificaciones push',
    ],
    cta: 'Prueba Gratis',
    ctaLink: '/center-signup?plan=starter',
    highlight: true,
  },
  {
    name: 'PRO',
    price: '€99.99',
    description: 'Oferta de Lanzamiento: Primeros 50 centros',
    features: [
      'Todo de Starter',
      'WOD Generator',
      'Churn Prediction',
      'Benchmarking Competitivo',
      'Tienda avanzada',
      'Reportes automáticos',
    ],
    cta: 'Hablar con Ventas',
    ctaLink: 'mailto:sales@rival.app',
    highlight: false,
  },
];

export default function ForCenters() {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-red selection:text-white bg-background text-foreground transition-colors duration-300">

      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-background/90 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.svg" alt="Rival Logo" width={32} height={32} className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="font-heading font-bold text-2xl tracking-tighter text-foreground group-hover:text-brand-red transition-colors">RIVAL</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planes</a>
            <Link href="/" className="text-brand-red hover:text-red-400 transition-colors font-bold">Para Atletas</Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/center-owner/login" className="bg-brand-red hover:bg-brand-accent text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              Acceso Centro
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center min-h-[90vh]">
        <div className="absolute inset-0 z-0 hidden dark:block">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover grayscale opacity-40">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-man-working-out-in-the-gym-around-other-people-41151-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center lg:text-left grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold mb-6">
              <Shield className="w-3 h-3 fill-current" />
              PARTNER ECOSYSTEM
            </div>
            <h1 className="font-heading text-6xl lg:text-8xl font-bold leading-[0.9] mb-6 tracking-tight text-foreground">
              DOMINA <br />
              <span className="text-brand-red">TU MERCADO.</span>
            </h1>
            <p className="text-muted-foreground dark:text-gray-300 text-lg lg:text-xl mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              La plataforma de gestión para centros que no se conforman. Atrae leads de la red social <span className="text-foreground font-bold">Rival</span> y automatiza tu éxito.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/center-signup" className="bg-brand-red hover:bg-brand-accent text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] transform hover:scale-105">
                Empezar Gratis <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#features" className="px-8 py-4 rounded-full font-bold text-lg border border-border hover:bg-muted text-foreground transition-all transform hover:scale-105 text-center">
                Ver Funciones
              </Link>
            </div>
          </motion.div>

          {/* Hero Stats Card */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-2 gap-4">
            <div className="bg-card/50 backdrop-blur-md border border-border p-8 rounded-3xl text-center">
              <div className="text-4xl font-heading font-bold text-brand-red mb-1">5,000+</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Centros en EU</div>
            </div>
            <div className="bg-card/50 backdrop-blur-md border border-border p-8 rounded-3xl text-center">
              <div className="text-4xl font-heading font-bold text-brand-red mb-1">30%</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Conv. Trials</div>
            </div>
            <div className="col-span-2 bg-gradient-to-r from-brand-red/10 to-transparent backdrop-blur-md border border-border p-8 rounded-3xl flex justify-between items-center bg-card/30">
              <div className="text-left">
                <div className="text-2xl font-bold text-foreground">500K+</div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Miembros Activos</div>
              </div>
              <Flame className="w-10 h-10 text-brand-red" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-20 bg-background relative border-t border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-red/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-4 text-foreground">
              Así es <span className="text-brand-red">RIVAL CENTERS</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Explora una demostración interactiva de cómo tu centro gestionará clases, atletas y leads en tiempo real.
            </p>
          </div>
          <CenterDemo />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-background border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-6 text-foreground">Todo lo que <span className="text-brand-red">necesitas</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Herramientas diseñadas para centros deportivos que buscan la excelencia operativa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ translateY: -8 }}
                className="p-8 rounded-2xl bg-card border border-border hover:border-brand-red/50 transition-all group"
              >
                <div className="mb-6 bg-muted p-4 rounded-xl w-fit group-hover:bg-brand-red/10 transition-colors border border-border">
                  <feature.icon className="w-6 h-6 text-brand-red" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-heading text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-6 text-foreground">Planes de <span className="text-brand-red">Crecimiento</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg mb-2">Sin costes ocultos. Sin complicaciones. Cancela cuando quieras.</p>
            <p className="text-[10px] text-brand-red font-black uppercase tracking-[0.2em]">
              Facturación automática los días 1 de cada mes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                whileHover={{ translateY: -8 }}
                className={`rounded-2xl p-8 transition-all border flex flex-col ${plan.highlight
                  ? "bg-gradient-to-b from-brand-red/20 to-card border-brand-red/50 ring-2 ring-brand-red/20 relative"
                  : "bg-card border-border hover:border-brand-red/30"
                  }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-red text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Más Popular</span>
                  </div>
                )}

                <h3 className="text-2xl font-heading font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description === 'Prueba gratis' ? 'Ideal para empezar' : plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-heading font-bold text-foreground">{plan.price}</span>
                  {plan.description !== 'Prueba gratis' && <span className="text-muted-foreground ml-2">/mes</span>}
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-muted-foreground text-sm">
                      <Check className="w-4 h-4 text-brand-red flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaLink}
                  className={`w-full py-3 rounded-xl font-bold text-center transition-all transform hover:scale-105 ${plan.highlight
                    ? "bg-brand-red text-white hover:bg-brand-accent shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                    : "border border-border text-foreground hover:bg-muted"
                    }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-card/20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-heading font-bold text-foreground mb-16">Voces de la <span className="text-brand-red">Industria</span></h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-2xl bg-card border border-border italic text-muted-foreground">
              "Con Rival ganamos 25 miembros nuevos en el primer mes. El sistema de pruebas es increíble."
              <div className="mt-6 flex items-center gap-3 not-italic">
                <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center font-bold text-white">JG</div>
                <div>
                  <p className="text-foreground font-bold text-sm">Juan García</p>
                  <p className="text-muted-foreground text-xs">Head Coach, Box Madrid Elite</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-red rounded-sm" />
            <span className="font-heading font-bold text-lg text-foreground">RIVAL CENTERS</span>
          </div>
          <div className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Rival Inc. Soluciones para Centros Deportivos.
          </div>
        </div>
      </footer>
    </div>
  );
}