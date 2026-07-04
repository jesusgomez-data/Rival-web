/**
 * Esqueleto de carga instantáneo para las secciones del dashboard.
 * Aparece en el mismo frame en que el usuario toca el enlace (loading.tsx
 * de Next), eliminando la sensación de "app congelada" mientras el
 * servidor prepara la sección.
 */
export default function SectionSkeleton() {
    return (
        <div className="p-4 sm:p-8 space-y-6 animate-pulse max-w-5xl mx-auto w-full">
            {/* Título */}
            <div className="space-y-2">
                <div className="h-3 w-24 bg-muted rounded-full" />
                <div className="h-8 w-56 bg-muted rounded-xl" />
            </div>

            {/* Tarjetas de stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="h-24 bg-muted rounded-2xl" />
                <div className="h-24 bg-muted rounded-2xl" />
                <div className="h-24 bg-muted rounded-2xl" />
            </div>

            {/* Bloques de contenido */}
            <div className="h-44 bg-muted rounded-3xl" />
            <div className="space-y-3">
                <div className="h-16 bg-muted rounded-2xl" />
                <div className="h-16 bg-muted rounded-2xl" />
                <div className="h-16 bg-muted rounded-2xl" />
            </div>
        </div>
    );
}
