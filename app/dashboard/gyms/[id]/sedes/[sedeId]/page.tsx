import {
    Activity,
    Users,
    Calendar,
    ShoppingBag,
    Dumbbell,
    Zap,
    MapPin,
    ArrowLeft,
    Building2,
    Settings,
    ChevronRight,
    Clock
} from "lucide-react";
import Link from "next/link";
import { getSedeDetails } from "../../../actions";

export default async function SedeDashboard({ params }: { params: Promise<{ id: string, sedeId: string }> }) {
    const { id: orgId, sedeId } = await params;

    // Fetch data on the server
    const center = await getSedeDetails(sedeId);

    if (!center) {
        return (
            <div className="p-8 text-center text-white">
                <h2 className="text-xl font-bold mb-4">Sede no encontrada</h2>
                <Link href={`/dashboard/gyms/${orgId}`} className="text-brand-red font-bold uppercase tracking-widest text-xs">
                    Volver al Panel
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/dashboard/gyms/${orgId}`}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-muted-foreground hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-heading font-black italic uppercase text-white">
                            {center.name}
                        </h1>
                        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> {center.city}, {center.country}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Configurar Sede
                    </button>
                    <Link
                        href={`/gym/${orgId}?center=${sedeId}`}
                        target="_blank"
                        className="bg-brand-red hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-glow"
                    >
                        <Zap className="w-4 h-4" /> Ver Perfil Público
                    </Link>
                </div>
            </div>

            {/* Warning Message */}
            <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500">
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-black uppercase italic text-white mb-1">Modo Multi-sede Activo</h4>
                    <p className="text-xs text-muted-foreground">
                        Estás gestionando específicamente la sede <strong>{center.name}</strong>.
                        Toda la configuración de clases, entrenadores y muro social que realices aquí se aplicará a este centro.
                    </p>
                </div>
            </div>

            {/* Quick Actions for Sede */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SedeQuickAction
                    icon={Dumbbell}
                    title="WODs de Sede"
                    description="Programar entrenamientos para este centro"
                    href={`/dashboard/gyms/${orgId}/wods?centerId=${sedeId}`}
                />
                <SedeQuickAction
                    icon={Calendar}
                    title="Horario Local"
                    description="Clases y eventos de esta sede"
                    href={`/dashboard/gyms/${orgId}/schedule?centerId=${sedeId}`}
                />
                <SedeQuickAction
                    icon={Users}
                    title="Staff de Sede"
                    description="Gestionar coaches de esta ubicación"
                    href={`/dashboard/gyms/${orgId}/team?centerId=${sedeId}`}
                />
                <SedeQuickAction
                    icon={ShoppingBag}
                    title="Tienda Local"
                    description="Ventas físicas en este centro"
                    href={`/dashboard/gyms/${orgId}/store?centerId=${sedeId}`}
                />
            </div>

            {/* Placeholder Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border p-6 rounded-2xl md:col-span-2">
                    <h3 className="text-lg font-black italic uppercase text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-red" /> Rendimiento de Sede
                    </h3>
                    <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-tighter">Analíticas de sede próximamente</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-card border border-border p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <Users className="w-5 h-5 text-purple-500" />
                            <span className="text-[10px] font-black text-green-500 uppercase">+2 hoy</span>
                        </div>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1">Atletas en Sede</p>
                        <h4 className="text-xl font-black text-white italic">--</h4>
                    </div>
                    <div className="bg-card border border-border p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                            <Clock className="w-5 h-5 text-brand-red" />
                        </div>
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1">Clases hoy</p>
                        <h4 className="text-xl font-black text-white italic">--</h4>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SedeQuickAction({ icon: Icon, title, description, href }: any) {
    return (
        <Link
            href={href}
            className="bg-card border border-border p-5 rounded-2xl hover:border-brand-red/50 transition-all group"
        >
            <div className="flex justify-between items-start">
                <div className="p-2.5 bg-brand-red/5 rounded-xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-red transition-transform translate-x-0 group-hover:translate-x-1" />
            </div>
            <div className="mt-4">
                <h4 className="text-sm font-black italic uppercase text-white mb-1">{title}</h4>
                <p className="text-[10px] text-muted-foreground font-bold leading-tight line-clamp-2">{description}</p>
            </div>
        </Link>
    );
}
