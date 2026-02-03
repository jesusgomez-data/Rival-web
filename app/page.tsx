"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Trophy, Activity, Users, Play, BarChart3, Dumbbell, Flame, Check, Star, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";


export default function Home() {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-red selection:text-white transition-colors duration-300 bg-background text-foreground">

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
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.svg" alt="Logo de Rival" width={32} height={32} className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="font-heading font-bold text-2xl tracking-tighter group-hover:text-brand-red transition-colors text-foreground">RIVAL</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-brand-red transition-colors">Características</a>
            <a href="#stats" className="hover:text-brand-red transition-colors">¿Por qué Rival?</a>
            <a href="#pricing" className="hover:text-brand-red transition-colors">Precios</a>
            <Link href="/for-centers" className="text-red-600 hover:text-red-400 transition-colors font-bold">Para Centros</Link>
          </div>
          <div className="flex items-center gap-4">

            <Link href="/login" className="hidden sm:block text-sm font-medium hover:text-brand-red transition-colors text-muted-foreground">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="bg-brand-red hover:bg-brand-accent text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
              Únete a Rival
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
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

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold mb-6">
              <Flame className="w-3 h-3 fill-current" />
              EL FUTURO DEL FITNESS
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] mb-6 tracking-tight text-foreground">
              ENFRÉNTATE <br />
              <span className="text-brand-red">A TI MISMO.</span>
            </h1>
            <p className="text-muted-foreground text-lg lg:text-xl mb-8 leading-relaxed max-w-lg">
              La primera red social creada para la <span className="text-foreground font-bold">mentalidad del 1%</span>. Registra cada repetición, compite globalmente y <span className="text-brand-red font-bold">proximamente</span> accede a gimnasios de élite en todo el mundo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup" className="bg-brand-red hover:bg-brand-accent text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] transform hover:scale-105 active:scale-95">
                Empieza gratis <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => setShowVideoModal(true)}
                className="px-8 py-4 rounded-full font-bold text-lg border hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 border-border text-foreground"
              >
                <Play className="w-5 h-5 fill-current" /> Ver demo
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
              {/* Background Image of Athlete */}
              <Image
                src="/assets/hero-cinematic.png"
                alt="Background workout"
                fill
                className="object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6">
                {/* Feed Item */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full border-2 border-brand-red overflow-hidden relative">
                      <Image src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop" alt="User" fill className="object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">Sarah Jenkins</p>
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
                  <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                    <div className="bg-brand-red h-full w-[85%]"></div>
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
              className="absolute top-10 -right-2 sm:top-20 sm:-right-4 border p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-xl z-20 w-32 sm:w-48 bg-card border-border scale-90 sm:scale-100"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                <span className="font-bold text-[8px] sm:text-xs uppercase tracking-widest text-muted-foreground whitespace-nowrap">Rango Global</span>
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-foreground">#42</div>
              <div className="text-[10px] sm:text-xs text-green-500 font-bold mt-0.5 sm:mt-1">▲ 3 lugares </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sección de Estadísticas */}
      <section id="stats" className="py-20 border-y border-border bg-gradient-to-b from-background to-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
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

      {/* Sección CTA */}
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
            <a href="#" className="hover:text-brand-red transition-colors">Términos</a>
            <a href="#" className="hover:text-brand-red transition-colors">Privacidad</a>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Rival Inc. Todos los derechos reservados.
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
