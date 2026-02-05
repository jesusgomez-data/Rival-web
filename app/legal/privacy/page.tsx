export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 md:p-16 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-4xl md:text-5xl font-heading font-black italic text-brand-red uppercase tracking-tighter">Política de Privacidad</h1>
                <p className="text-gray-400">Última actualización: {new Date().toLocaleDateString()}</p>

                <div className="space-y-6 text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">1. Datos que Recopilamos</h2>
                        <p>Recopilamos información personal como tu nombre, correo electrónico y datos de entrenamiento (WODs, PRs, tiempos) para ofrecerte métricas y rankings precisos.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">2. Uso de la Información</h2>
                        <p>Utilizamos tus datos para mejorar la experiencia de usuario, personalizar tus entrenamientos y facilitar la competencia en los Leaderboards. No vendemos tus datos a terceros.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">3. Cookies</h2>
                        <p>Utilizamos cookies esenciales para mantener tu sesión activa y cookies de análisis para entender cómo usas nuestra plataforma y mejorarla.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">4. Tus Derechos</h2>
                        <p>Tienes derecho a acceder, rectificar o eliminar tus datos personales en cualquier momento. Puedes hacerlo desde la configuración de tu perfil o contactando a soporte.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
