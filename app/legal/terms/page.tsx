export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 md:p-16 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-4xl md:text-5xl font-heading font-black italic text-brand-red uppercase tracking-tighter">Términos y Condiciones</h1>
                <p className="text-gray-400">Última actualización: {new Date().toLocaleDateString()}</p>

                <div className="space-y-6 text-gray-300 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">1. Introducción</h2>
                        <p>Bienvenido a Rival. Al acceder a nuestra plataforma, aceptas estos términos en su totalidad. Rival es una plataforma de software diseñada para atletas, entrenadores y gimnasios para gestionar y mejorar el rendimiento físico.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">2. Uso de la Plataforma</h2>
                        <p>Te comprometes a utilizar Rival solo para fines legales. No está permitido el uso de bots, scraping o cualquier intento de ingeniería inversa de nuestra API.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">3. Suscripciones y Pagos</h2>
                        <p>Ofrecemos planes gratuitos y de pago. Los pagos se procesan de forma segura a través de Stripe. Las suscripciones se renuevan automáticamente a menos que se cancelen con 24 horas de antelación.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white uppercase mb-2">4. Responsabilidad</h2>
                        <p>Rival no se hace responsable de lesiones sufridas durante la realización de los entrenamientos sugeridos o registrados en la app. Consulta siempre con un profesional de la salud antes de comenzar cualquier régimen de ejercicio.</p>
                    </section>
                </div>
            </div>
        </div>
    )
}
