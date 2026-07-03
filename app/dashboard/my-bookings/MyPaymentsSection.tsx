"use client";

import { useState } from "react";
import { Receipt, Download, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface Payment {
    id: string;
    plan_name: string | null;
    amount: number;
    currency: string;
    invoice_url: string | null;
    invoice_pdf: string | null;
    receipt_url: string | null;
    paid_at: string;
    center_name: string;
}

export default function MyPaymentsSection({ initialPayments }: { initialPayments: Payment[] }) {
    const [expanded, setExpanded] = useState(false);

    if (!initialPayments || initialPayments.length === 0) return null;

    const visible = expanded ? initialPayments : initialPayments.slice(0, 3);

    return (
        <div className="space-y-4 mt-10">
            <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-red" /> Mis Pagos
            </h2>

            <div className="space-y-2">
                {visible.map(p => (
                    <div key={p.id} className="bg-muted/50 border border-border rounded-2xl p-4 flex items-center gap-3 sm:gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-foreground truncate">{p.plan_name || 'Cuota de membresía'}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                                {p.center_name} · {new Date(p.paid_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        <span className="font-black italic text-foreground text-sm shrink-0">
                            {Number(p.amount).toFixed(2)} {(p.currency || 'eur').toUpperCase() === 'EUR' ? '€' : (p.currency || '').toUpperCase()}
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                            {p.invoice_pdf && (
                                <a
                                    href={p.invoice_pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Descargar factura PDF"
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-red border border-brand-red/30 hover:bg-brand-red/10 rounded-lg px-2.5 py-2 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">PDF</span>
                                </a>
                            )}
                            {(p.invoice_url || p.receipt_url) && (
                                <a
                                    href={p.invoice_url || p.receipt_url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={p.invoice_url ? 'Ver factura' : 'Ver recibo'}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-border hover:text-foreground rounded-lg px-2.5 py-2 transition-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{p.invoice_url ? 'Factura' : 'Recibo'}</span>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {initialPayments.length > 3 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                    {expanded ? (<><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>) : (<><ChevronDown className="w-3.5 h-3.5" /> Ver todos ({initialPayments.length})</>)}
                </button>
            )}
        </div>
    );
}
