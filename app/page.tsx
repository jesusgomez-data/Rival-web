"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Activity, Users, Play, BarChart3, Dumbbell, Flame, Check, Star, TrendingUp, Zap, Layout, CalendarCheck, UploadCloud, Building2, ShoppingBag, Globe, Mail, Instagram } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/app/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";


export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [viewMode, setViewMode] = useState<'choice' | 'athlete' | 'business'>('choice');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1024);
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-red selection:text-white transition-colors duration-300 bg-background text-foreground overflow-x-hidden">

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowVideoModal(false)}>
          <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Video Rival"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed w-full z-50 backdrop-blur-md border-b border-border bg-background/90 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Image src="/logo.svg" alt="Logo de Rival" width={40} height={40} className="w-10 h-10 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-brand-red blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
            <span className="font-heading font-black text-3xl tracking-[-0.05em] italic group-hover:text-brand-red transition-all text-foreground drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">RIVAL</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-brand-red transition-colors">{t.nav.features}</a>
            <a href="#stats" className="hover:text-brand-red transition-colors">{t.nav.whyRival}</a>
            <a href="#pricing" className="hover:text-brand-red transition-colors">{t.nav.pricing}</a>
            <Link href="/for-centers" className="text-red-600 hover:text-red-400 transition-colors font-bold">{t.nav.forCenters}</Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />

            <Link href="/login" className="hidden sm:block text-sm font-medium hover:text-brand-red transition-colors text-muted-foreground">
              {t.nav.login}
            </Link>
            <Link href="/signup" className="bg-brand-red hover:bg-brand-accent text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              {t.nav.join}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Choice Overlay */}
      <div className={`lg:hidden fixed inset-0 z-[60] bg-black transition-all duration-1000 ${viewMode !== 'choice' ? 'translate-y-[-100%] pointer-events-none opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover grayscale opacity-60">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-boxer-training-with-a-punching-bag-in-a-dark-gym-40537-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>

        <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 justify-center mb-6">
              <Image src="/logo.svg" alt="Logo" width={60} height={60} className="w-16 h-16 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
              <span className="font-heading font-black text-5xl tracking-tighter italic text-white drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">RIVAL</span>
            </div>
            <h2 className="text-xl font-bold text-white/80 uppercase tracking-[0.2em] mb-2 px-4 italic">{t.choice.title}</h2>
            <div className="h-0.5 w-12 bg-brand-red mx-auto mt-4" />
          </motion.div>

          <div className="w-full max-w-sm space-y-4">
            <button
              onClick={() => setViewMode('athlete')}
              className="w-full py-6 rounded-2xl bg-brand-red text-white font-black text-xl uppercase tracking-widest shadow-[0_0_40px_rgba(239,68,68,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <Dumbbell className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              {t.choice.athlete}
            </button>
            <button
              onClick={() => setViewMode('business')}
              className="w-full py-6 rounded-2xl bg-white/5 border border-white/20 text-white font-black text-xl uppercase tracking-widest backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <Building2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {t.choice.business}
            </button>
          </div>

          <div className="mt-8 animate-pulse">
            <Link href="/login" className="text-white/60 text-sm font-medium hover:text-white transition-colors">
              {t.choice.alreadyMember} <span className="text-brand-red font-bold underline underline-offset-4">{t.choice.login}</span>
            </Link>
          </div>

          <p className="absolute bottom-12 text-white/40 text-xs font-bold uppercase tracking-widest">
            {t.choice.footer}
          </p>
        </div>
      </div>

      {/* Hero Section Athlete / Desktop */}
      <div className={(viewMode === 'athlete' || isDesktop) ? 'block' : 'lg:block hidden'}>
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center min-h-[90vh]">


          {/* Cinematic Background Video */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover grayscale opacity-40"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-boxer-training-with-a-punching-bag-in-a-dark-gym-40537-large.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold mb-8 animate-pulse">
                <Zap className="w-4 h-4 fill-brand-red" />
                {t.hero.future}
              </div>
              <h1 className="font-heading text-4xl sm:text-7xl lg:text-8xl font-black leading-[0.9] mb-8 tracking-tighter text-white break-words sm:break-normal">
                {t.hero.title} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-brand-neon-orange drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  {t.hero.subtitle}
                </span>
              </h1>
              <p className="text-muted-foreground text-lg lg:text-xl mb-8 leading-relaxed max-w-lg">
                {t.hero.descPrefix}
                {t.hero.descHighlight && <span className="text-brand-red font-bold">{t.hero.descHighlight}</span>}
                {t.hero.descSuffix}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  aria-label={t.hero.ctaStart}
                  className="bg-brand-red hover:bg-brand-accent text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] transform hover:scale-105 active:scale-95"
                >
                  {t.hero.ctaStart} <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setShowVideoModal(true)}
                  aria-label={t.hero.ctaDemo}
                  className="px-8 py-4 rounded-full font-bold text-lg border hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 border-border text-foreground"
                >
                  <Play className="w-5 h-5 fill-current" /> {t.hero.ctaDemo}
                </button>
              </div>

            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              {/* App UI Concept */}
              <div className="relative z-10 w-full max-w-[320px] sm:max-w-md mx-auto aspect-[9/16] bg-black rounded-[2.5rem] sm:rounded-[3rem] border-4 sm:border-8 shadow-2xl overflow-hidden ring-1 ring-white/10 border-gray-900">
                <Image
                  src="/assets/hero-cinematic.png"
                  alt="Background workout"
                  fill
                  className="object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full border-2 border-brand-red overflow-hidden relative">
                        <Image src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop" alt="User" fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">Alex Sterling</p>
                        <p className="text-xs text-brand-red font-bold uppercase tracking-wider">Nuevo PR • CrossFit</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 mb-4 sm:mb-6">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <span className="text-gray-400 text-[10px] font-bold uppercase">Ejercicio</span>
                        <div className="text-xl sm:text-2xl font-heading font-bold text-white whitespace-nowrap">Back Squat</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-heading font-bold text-brand-red">140kg</div>
                      </div>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-brand-neon-green to-emerald-400 h-full w-[85%] shadow-[0_0_10px_rgba(57,255,20,0.5)]"></div>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4">
                    <button className="flex-1 bg-brand-red text-white py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-sm">Chocala 👊</button>
                    <button className="flex-1 bg-white/10 text-white py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-sm backdrop-blur-md">Comentar</button>
                  </div>
                </div>
              </div>

              {/* Floating Stats */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute top-4 -right-2 sm:top-20 sm:-right-4 border p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-xl z-20 w-28 sm:w-48 bg-card/90 backdrop-blur-md border-border scale-90 sm:scale-100"
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-brand-neon-orange">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  <span className="font-bold text-[8px] sm:text-xs uppercase tracking-widest whitespace-nowrap">Rango Global</span>
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black text-white italic">#42</div>
                <div className="text-[10px] sm:text-xs text-brand-neon-green font-bold mt-0.5 sm:mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> ▲ 3 lugares
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Hero Section Business (Mobile Only) */}
      <div className={(viewMode === 'business') ? 'block lg:hidden' : 'hidden'}>
        <section className="relative pt-32 pb-20 overflow-hidden flex items-center min-h-[90vh] bg-black">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-red/20 via-transparent to-transparent opacity-50" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale opacity-20" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-bold mb-8 uppercase tracking-widest leading-none">
                <Building2 className="w-3 h-3" /> Partner Program 2026
              </div>
              <h1 className="font-heading text-5xl font-black leading-[0.9] mb-8 tracking-tighter text-white uppercase italic">
                DOMINA TU <br />
                <span className="text-brand-red drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  CIUDAD.
                </span>
              </h1>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                Convierte tu box o gimnasio en una potencia digital. Atrae nuevos leads, automatiza tus clases y fideliza a tu comunidad con la tecnología de <span className="text-white font-bold tracking-tight italic">RIVAL</span>.
              </p>
              <div className="flex flex-col gap-4">
                <Link
                  href="/center-signup"
                  className="bg-white text-black px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-[0_10px_40px_rgba(255,255,255,0.1)]"
                >
                  Registra tu centro <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-4 py-4 px-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800" />
                    ))}
                  </div>
                  <p className="text-xs text-white/60 font-medium">+150 Centros ya están escalando</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Secciones de Atleta (Visibles en desktop o cuando se elige Athlete en móvil) */}

      <div className={(viewMode === 'athlete' || isDesktop) ? 'block' : 'lg:block hidden'}>
        {/* Sección de Estadísticas */}
        <section id="stats" className="py-12 sm:py-20 border-y border-border bg-gradient-to-b from-background to-card/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
              {[
                { val: "850K+", label: "Atletas activos" },
                { val: "45M+", label: "Entrenamientos" },
                { val: "180+", label: "Países" },
                { val: "4.9⭐", label: "Valoración" }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileInView={{ scale: 1, opacity: 1 }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <div className="text-4xl lg:text-5xl font-heading font-bold text-brand-red mb-2">{stat.val}</div>
                  <p className="text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Cuadrícula de Características */}
        <section id="features" className="py-32 border-t border-border bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4 sm:mb-6 text-foreground">Hecho para los <span className="text-brand-red">Obsesionados</span></h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg px-4 sm:px-0">Deja de usar 5 apps distintas. Rival combina registro, comunidad y coaching en un solo ecosistema poderoso.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard icon={<Activity className="w-6 h-6 text-brand-red" />} title="Registro Inteligente" desc="Registra tus entrenamientos en segundos. Nuestro sistema aprende tus curvas de fuerza y ajusta tu próxima sesión automáticamente." />
              <FeatureCard icon={<Users className="w-6 h-6 text-brand-red" />} title="Comunidad de Tribu" desc="Conecta con atletas que comparten tu pasión. Filtra el feed por deporte, nivel o ubicación." />
              <FeatureCard icon={<Dumbbell className="w-6 h-6 text-brand-red" />} title="Coach Online" desc="Obtén un programa personalizado que evoluciona contigo. Desde hipertrofia hasta preparación para Hyrox." />
              <FeatureCard icon={<Trophy className="w-6 h-6 text-brand-red" />} title="Rankings en Vivo" desc="Compite en desafíos en tiempo real. Mira tu posición en tu ciudad, país o globalmente." />
              <FeatureCard icon={<BarChart3 className="w-6 h-6 text-brand-red" />} title="Analíticas Pro" desc="Visualiza tu progreso con gráficos profesionales. Volumen, intensidad y gestión de fatiga." />
              <FeatureCard icon={<Zap className="w-6 h-6 text-brand-red" />} title="Duelos en Tiempo Real" desc="Reta a tus rivales a duelos de 7 días. Compara volumen, fuerza y constancia cara a cara." />
            </div>
          </div>
        </section>

        {/* Sección de Testimonios */}
        <section className="py-32 border-y border-border bg-card/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4 sm:mb-6 text-foreground">Amado por <span className="text-brand-red">Atletas de Élite</span></h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard name="Marcus Johnson" role="Powerlifter Competitivo" avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80" text="Rival cambió cómo registro mi progreso. La comunidad me mantiene motivado. He logrado 3 PRs desde que me uní." rating={5} />
              <TestimonialCard name="Sofía Rodríguez" role="Coach de CrossFit" avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80" text="A mis atletas les encanta el aspecto competitivo. Los rankings los motivan como nada más." rating={5} />
              <TestimonialCard name="Alex Chen" role="Influencer Fitness" avatar="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80" text="Por fin una plataforma que combina analíticas, comunidad y competencia. Esto es otro nivel." rating={5} />
            </div>
          </div>
        </section>

        {/* Sección de Precios */}
        <section id="pricing" className="py-32 border-t border-border bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4 sm:mb-6 text-foreground">Precios <span className="text-brand-red">claros y simples</span></h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg px-4 sm:px-0">Empieza gratis. Mejora cuando quieras. No se requiere tarjeta de crédito.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <PricingCard name="Atleta" price="Gratis" description="Perfecto para comenzar" features={["Registro ilimitado", "Acceso a comunidad", "Analíticas básicas", "Rankings"]} cta="Empieza gratis" ctaHref="/signup" />
              <PricingCard name="Premium" price="$4.99" period="por mes" description="Oferta de Lanzamiento" features={["Todo lo de Atleta", "Coaching de Élite", "Analíticas avanzadas", "Duelos ilimitados", "Sin anuncios"]} cta="Mejorar ahora" ctaHref="/signup" featured />
              <PricingCard name="Élite" price="$9.99" period="por mes" description="Oferta de Lanzamiento" features={["Todo lo de Premium", "Sesiones 1-a-1", "Acceso global a gimnasios", "Soporte prioritario", "Programas personalizados"]} cta="Obtener Élite" ctaHref="/signup" />
            </div>
          </div>
        </section>

        {/* Sección CTA Final para Atleta */}
        <section className="py-20 border-t border-border bg-gradient-to-b from-transparent to-brand-red/5">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4 sm:mb-6 text-foreground">¿Listo para <span className="text-brand-red">Enfrentarte a Ti Mismo?</span></h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 px-4 sm:px-0">Únete a más de 850K atletas que superan sus límites cada día.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup" className="bg-brand-red hover:bg-brand-accent text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] transform hover:scale-105 active:scale-95">
                  Comienza tu viaje <ArrowRight className="w-5 h-5 inline ml-2" />
                </Link>
                <Link href="/login" className="border border-border hover:border-brand-red/50 px-10 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 active:scale-95 text-foreground hover:bg-foreground/5">
                  Iniciar sesión
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Secciones de B2B (Visibles en desktop o cuando se elige Business en móvil) */}
      <div className={(viewMode === 'business' || isDesktop) ? 'block' : 'lg:block hidden'}>
        <section className="py-32 border-t border-border bg-gradient-to-b from-card/50 to-background relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-red/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4 text-foreground">
                Para <span className="text-brand-red">Centros, Boxes y Coaches</span>
              </h2>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto">
                La herramienta todo-en-uno que hace crecer tu negocio mientras tus alumnos se obsesionan.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
              <FeatureCard
                icon={<Layout className="w-6 h-6 text-brand-red" />}
                title="Perfiles Red Social"
                desc="Tu gimnasio no es solo un local, es una comunidad. Sube fotos, vídeos, comparte la bio de tus coaches y consigue seguidores que se conviertan en leads."
              />
              <FeatureCard
                icon={<CalendarCheck className="w-6 h-6 text-brand-red" />}
                title="Reserva de Pruebas"
                desc="Automatización total: el alumno solicita una clase de prueba, el sistema agenda el hueco y tú recibes la notificación al instante."
              />
              <FeatureCard
                icon={<UploadCloud className="w-6 h-6 text-brand-red" />}
                title="Importación Instantánea"
                desc="Cámbiate en minutos. Importa tu base de datos actual desde un archivo CSV o si ya usas otro software de gestión, sin perder un solo dato."
              />
              <FeatureCard
                icon={<Building2 className="w-6 h-6 text-brand-red" />}
                title="Gestión Multicentro"
                desc="¿Tienes varias sedes? Controla el rendimiento, los pagos y los socios de todos tus centros desde un panel de control unificado."
              />
              <FeatureCard
                icon={<Trophy className="w-6 h-6 text-brand-red" />}
                title="WODs y Eventos"
                desc="Publica programaciones grupales, organiza competencias internas y gestiona inscripciones directas desde la app de tus alumnos."
              />
              <FeatureCard
                icon={<ShoppingBag className="w-6 h-6 text-brand-red" />}
                title="Tienda con Stripe"
                desc="Vende merch, suplementos y bonos de clases extra. Pagos seguros integrados para que nunca dejes de facturar."
              />
              <FeatureCard
                icon={<TrendingUp className="w-6 h-6 text-brand-red" />}
                title="Embudos de Conversión"
                desc="Tracking real de leads: desde la clase de prueba hasta el primer mes pagado. Visualiza tu funnel y optimiza tus ventas."
              />
            </div>

            <div className="max-w-3xl mx-auto bg-muted/30 backdrop-blur-sm border border-border p-8 rounded-3xl text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-bold mb-4 uppercase tracking-widest">
                <Zap className="w-3 h-3" /> Ecosistema Profesional
              </div>
              <p className="text-lg text-foreground font-medium mb-8">
                Escala tu negocio con la tecnología de la élite fitness. Gestiona tu comunidad, aumenta tus ingresos y digitaliza tu centro en un solo lugar.
              </p>
              <Link
                href="/center-signup"
                className="bg-brand-red hover:bg-brand-accent text-white px-10 py-5 rounded-full font-bold text-xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] transform hover:scale-105 inline-flex items-center gap-2 group"
              >
                Registra tu centro gratis
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Sección de Precios para Centros */}
        <section className="py-32 border-t border-border bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold mb-4 sm:mb-6 text-foreground">Precios para <span className="text-brand-red">Centros</span></h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg px-4 sm:px-0">Escala tu negocio con planes flexibles. Sin permanencia.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <PricingCard
                name="FREE"
                price="€0"
                description="Ideal para empezar"
                features={["Perfil público", "Hasta 10 clases/semana", "Check-in manual", "Hasta 50 miembros", "Chat básico"]}
                cta="Empezar Gratis"
                ctaHref="/center-signup"
              />
              <PricingCard
                name="STARTER"
                price="€49.99"
                period="por mes"
                description="Oferta Lanzamiento: Primeros 50 centros"
                features={["Todo de Free", "Clases ilimitadas", "Sistema de pruebas", "Tienda básica", "Google Calendar sync"]}
                cta="Prueba Gratis"
                ctaHref="/center-signup"
                featured
              />
              <PricingCard
                name="PRO"
                price="€99.99"
                period="por mes"
                description="Oferta Lanzamiento: Primeros 50 centros"
                features={["Todo de Starter", "WOD Generator", "Churn Prediction", "Tienda avanzada", "Reportes automáticos"]}
                cta="Hablar con Ventas"
                ctaHref="/center-signup"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Botón flotante para cambiar de modo en móvil */}
      {viewMode !== 'choice' && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setViewMode('choice')}
          className="lg:hidden fixed bottom-6 right-6 z-[70] bg-white text-black p-4 rounded-full shadow-2xl border border-white/20 font-bold text-xs uppercase tracking-tighter"
        >
          Cambiar Modo
        </motion.button>
      )}

      {/* Pie de página */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo de Rival" width={24} height={24} className="w-6 h-6 grayscale hover:grayscale-0 transition-all" />
            <span className="font-heading font-bold text-lg cursor-pointer text-muted-foreground hover:text-foreground">RIVAL</span>
          </div>
          <div className="text-sm flex gap-6 text-muted-foreground">
            <a href="#features" className="hover:text-brand-red transition-colors">Características</a>
            <a href="#pricing" className="hover:text-brand-red transition-colors">Precios</a>
            <Link href="/legal/terms" className="hover:text-brand-red transition-colors">Términos</Link>
            <Link href="/legal/privacy" className="hover:text-brand-red transition-colors">Privacidad</Link>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Rival Inc. Todos los derechos reservados.
          </div>
          <div className="flex gap-4 items-center order-first md:order-last">
            <a href="https://instagram.com/rivalfit.app" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 hover:bg-brand-red text-white transition-all transform hover:scale-110">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="mailto:rival.app.official@gmail.com" className="p-2 rounded-full bg-white/5 hover:bg-brand-red text-white transition-all transform hover:scale-110">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <motion.div
      whileHover={{ translateY: -8 }}
      className="p-8 rounded-2xl border border-border bg-card transition-all group cursor-pointer hover:border-brand-red/30 shadow-sm"
    >
      <div className="mb-6 p-4 rounded-xl w-fit group-hover:bg-brand-red/10 transition-colors border border-border bg-muted">{icon}</div>
      <h3 className="text-xl font-bold mb-3 font-heading text-foreground">{title}</h3>
      <p className="leading-relaxed text-sm text-muted-foreground">{desc}</p>
    </motion.div>
  )
}

function TestimonialCard({ name, role, avatar, text, rating }: any) {
  return (
    <motion.div
      whileHover={{ translateY: -4 }}
      className="p-8 rounded-2xl border border-border bg-card/50 transition-all backdrop-blur-sm hover:border-brand-red/20"
    >
      <div className="flex gap-1 mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
        ))}
      </div>
      <p className="mb-6 italic text-muted-foreground">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden relative">
          <Image src={avatar} alt={name} fill className="object-cover" />
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </motion.div>
  )
}

function PricingCard({ name, price, period, description, features, cta, ctaHref, featured }: any) {
  return (
    <motion.div
      whileHover={{ translateY: -8 }}
      className={`rounded-2xl p-6 sm:p-8 transition-all border ${featured
        ? "bg-gradient-to-b from-brand-red/20 to-card border-brand-red/50 ring-2 ring-brand-red/20 relative"
        : "bg-card border-border hover:border-brand-red/30"
        }`}
    >
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-brand-red text-white px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">Más Popular</span>
        </div>
      )}

      <h3 className="text-2xl font-heading font-bold mb-2 text-foreground">{name}</h3>
      <p className="text-sm mb-4 text-muted-foreground">{description}</p>

      <div className="mb-6">
        <span className="text-4xl font-heading font-bold text-foreground">{price}</span>
        {period && <span className="ml-2 text-muted-foreground">/{period}</span>}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-brand-red flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={`w-full py-3 rounded-xl font-bold text-center transition-all transform hover:scale-105 active:scale-95 ${featured
          ? "bg-brand-red text-white hover:bg-brand-accent shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          : "border border-border text-foreground hover:bg-muted"
          }`}
      >
        {cta}
      </Link>
    </motion.div>
  )
}
