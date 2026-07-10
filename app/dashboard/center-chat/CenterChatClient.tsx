"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MessageSquareText, Radio, ShieldCheck, ChevronRight, LayoutDashboard, Lock } from "lucide-react";
import clsx from "clsx";
import TeamChat from "../gyms/[id]/TeamChat";

type CenterChatSummary = {
    id: string;
    name: string | null;
    logo_url: string | null;
    city: string | null;
    center_type: string | null;
    role: string | null;
};

const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    head_coach: "Head coach",
    coach: "Coach",
};

export default function CenterChatClient({
    centers,
    initialCenterId,
    error,
}: {
    centers: CenterChatSummary[];
    initialCenterId: string | null;
    error: string | null;
}) {
    const router = useRouter();
    const firstCenterId = centers[0]?.id || null;
    const safeInitial = initialCenterId && centers.some(center => center.id === initialCenterId)
        ? initialCenterId
        : firstCenterId;
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(safeInitial);

    const selectedCenter = useMemo(
        () => centers.find(center => center.id === selectedCenterId) || null,
        [centers, selectedCenterId]
    );

    const selectCenter = (centerId: string) => {
        setSelectedCenterId(centerId);
        router.replace(`/dashboard/center-chat?center=${centerId}`, { scroll: false });
    };

    if (error) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="max-w-md w-full rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                    <Lock className="w-10 h-10 text-brand-red mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-white uppercase italic">Chat de Empresa</h1>
                    <p className="text-sm text-white/50 mt-2">No se pudo cargar tu acceso: {error}</p>
                </div>
            </div>
        );
    }

    if (!centers.length) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-card p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-5">
                        <MessageSquareText className="w-8 h-8 text-brand-red" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase italic">Chat de Empresa</h1>
                    <p className="text-sm text-white/50 mt-3 leading-relaxed">
                        Esta zona es solo para owners, admins, head coaches y coaches asignados a un centro.
                    </p>
                    <Link href="/dashboard/gyms" className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-2xl bg-brand-red text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all">
                        Ver centros <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100dvh-140px)] space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-red/25 bg-brand-red/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-brand-red mb-3">
                        <Radio className="w-3.5 h-3.5" /> Canal interno live
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic leading-tight">Chat de Empresa</h1>
                    <p className="text-sm text-white/45 mt-2 max-w-2xl">
                        Acceso rapido para comunicar avisos operativos del centro sin entrar al dashboard completo.
                    </p>
                </div>
                {selectedCenter && (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
                            {ROLE_LABELS[selectedCenter.role || ""] || selectedCenter.role || "Staff"}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-[310px_1fr] gap-5 items-stretch">
                <aside className="rounded-3xl border border-white/10 bg-card overflow-hidden shadow-2xl">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Tus centros</p>
                            <p className="text-sm text-white/70 font-bold">{centers.length} chat{centers.length === 1 ? "" : "s"} disponible{centers.length === 1 ? "" : "s"}</p>
                        </div>
                        <MessageSquareText className="w-5 h-5 text-brand-red" />
                    </div>
                    <div className="p-2 max-h-[38vh] lg:max-h-[calc(100dvh-290px)] overflow-y-auto custom-scrollbar">
                        {centers.map(center => {
                            const active = center.id === selectedCenterId;
                            return (
                                <button
                                    key={center.id}
                                    type="button"
                                    onClick={() => selectCenter(center.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border group",
                                        active
                                            ? "bg-brand-red text-white border-brand-red shadow-[0_0_24px_rgba(220,38,38,0.25)]"
                                            : "bg-white/[0.025] border-transparent hover:border-white/10 hover:bg-white/[0.05] text-white/70"
                                    )}
                                >
                                    <div className={clsx("w-11 h-11 rounded-2xl overflow-hidden border flex items-center justify-center shrink-0", active ? "border-white/25 bg-black/20" : "border-white/10 bg-white/[0.04]") }>
                                        {center.logo_url ? (
                                            <img src={center.logo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className={clsx("w-5 h-5", active ? "text-white" : "text-brand-red")} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black uppercase truncate">{center.name || "Centro"}</p>
                                        <p className={clsx("text-[10px] font-bold uppercase tracking-widest truncate", active ? "text-white/65" : "text-white/35") }>
                                            {center.city || center.center_type || "Equipo interno"}
                                        </p>
                                    </div>
                                    <ChevronRight className={clsx("w-4 h-4 shrink-0", active ? "text-white" : "text-white/20 group-hover:text-white/50")} />
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <section className="min-w-0 space-y-3">
                    {selectedCenter && (
                        <div className="rounded-3xl border border-white/10 bg-card/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center shrink-0">
                                    <Building2 className="w-5 h-5 text-brand-red" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-white uppercase truncate">{selectedCenter.name}</p>
                                    <p className="text-[10px] text-white/35 font-black uppercase tracking-widest">Mensajeria interna del staff</p>
                                </div>
                            </div>
                            <Link href={`/dashboard/gyms/${selectedCenter.id}`} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 text-white/55 hover:text-white hover:bg-white/[0.05] text-[10px] font-black uppercase tracking-widest transition-all">
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>
                        </div>
                    )}

                    {selectedCenterId && (
                        <TeamChat
                            centerId={selectedCenterId}
                            standalone
                            className="h-[calc(100dvh-310px)] min-h-[560px] lg:h-[calc(100dvh-260px)]"
                        />
                    )}
                </section>
            </div>
        </div>
    );
}

