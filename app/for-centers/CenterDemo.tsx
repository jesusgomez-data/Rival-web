"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Calendar,
    Users,
    Activity,
    CreditCard,
    Settings,
    Bell,
    Search,
    ChevronDown,
    Flame,
    ArrowUpRight,
    TrendingUp,
    MoreVertical,
    CheckCircle2
} from "lucide-react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

export default function CenterDemo() {
    const [activeTab, setActiveTab] = useState("Dashboard");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="w-full max-w-6xl mx-auto rounded-xl overflow-hidden border border-border shadow-2xl bg-card flex flex-col mt-8 md:mt-12 mb-12 md:mb-32 relative z-20">
            {/* Mac OS Window Header */}
            <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <div className="mx-auto text-xs font-medium text-muted-foreground flex-1 text-center -ml-8">
                    rival.app/center/dashboard
                </div>
            </div>

            <div className="flex h-[500px] md:h-[600px] overflow-hidden bg-background">
                {/* Sidebar */}
                <aside className="w-64 border-r border-border bg-card/50 flex flex-col hidden md:flex">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center font-bold text-white text-xs">
                                RC
                            </div>
                            <span className="font-heading font-bold text-foreground">RIVAL CENTER</span>
                        </div>

                        <nav className="space-y-1">
                            {[
                                { icon: LayoutDashboard, label: "Dashboard" },
                                { icon: Calendar, label: "Agenda" },
                                { icon: Users, label: "Miembros" },
                                { icon: Activity, label: "Red Social" },
                                { icon: CreditCard, label: "Pagos" },
                                { icon: Settings, label: "Ajustes" },
                            ].map((item, i) => (
                                <button
                                    key={item.label}
                                    onClick={() => setActiveTab(item.label)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.label
                                        ? "bg-brand-red/10 text-brand-red"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-auto p-4 border-t border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                                <img
                                    src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=f87171"
                                    alt="Admin"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-bold text-foreground">Juan G.</div>
                                <div className="text-xs text-muted-foreground">Admin</div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8 relative">
                    {/* Topbar */}
                    <header className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-heading font-bold text-foreground">Resumen de Hoy</h1>
                        <div className="flex items-center gap-4">
                            <div className="relative hidden lg:block">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar atletas, clases..."
                                    className="pl-9 pr-4 py-2 bg-muted border border-border rounded-full text-sm w-64 focus:outline-none focus:ring-1 focus:ring-brand-red transition-all"
                                />
                            </div>
                            <ThemeToggle className="scale-75 md:scale-90" />
                            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-red rounded-full ring-2 ring-background"></span>
                            </button>
                            <button className="bg-brand-red hover:bg-brand-accent text-white px-4 py-2 rounded-full font-bold text-sm transition-colors shadow-sm shadow-brand-red/20 hidden sm:block">
                                + Nueva Clase
                            </button>
                        </div>
                    </header>

                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[
                            { label: "Check-ins Hoy", value: "142", up: "+12%", color: "text-green-500" },
                            { label: "Trials Mensuales", value: "38", up: "+5%", color: "text-green-500" },
                            { label: "Leads (Red Rival)", value: "14", up: "+24%", color: "text-brand-red", spark: true },
                        ].map((metric, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={metric.label}
                                className={`p-5 rounded-2xl border ${metric.spark ? "border-brand-red/30 bg-brand-red/5 ring-1 ring-brand-red/10" : "border-border bg-card"
                                    }`}
                            >
                                <div className="text-sm font-medium text-muted-foreground mb-2 flex justify-between">
                                    {metric.label}
                                    {metric.spark && <Flame className="w-4 h-4 text-brand-red" />}
                                </div>
                                <div className="flex items-end gap-3">
                                    <span className="text-3xl font-heading font-bold text-foreground">{metric.value}</span>
                                    <span className={`text-xs font-bold flex items-center mb-1 ${metric.color}`}>
                                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                        {metric.up}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Upcoming Classes */}
                        <div className="col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-foreground">Clases Próximas</h3>
                                <button className="text-xs font-bold text-brand-red hover:underline">Ver Agenda</button>
                            </div>
                            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                {[
                                    { time: "17:00", name: "WOD (Cross Training)", coach: "Coach Mario", attendees: 18, capacity: 20 },
                                    { time: "18:00", name: "Halterofilia", coach: "Coach Dani", attendees: 12, capacity: 15 },
                                    { time: "19:00", name: "WOD (Cross Training)", coach: "Coach Laura", attendees: 20, capacity: 20, full: true },
                                ].map((cls, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                            <div className="w-14 text-center">
                                                <div className="text-lg font-bold text-foreground leading-none mb-1">{cls.time}</div>
                                            </div>
                                            <div className="w-1 h-10 rounded-full bg-brand-red/20 opacity-50 hidden sm:block"></div>
                                            <div>
                                                <div className="font-bold text-sm text-foreground">{cls.name}</div>
                                                <div className="text-xs text-muted-foreground">{cls.coach}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                                            <div className="text-right">
                                                <div className={`text-sm font-bold ${cls.full ? "text-red-500" : "text-foreground"}`}>
                                                    {cls.attendees}/{cls.capacity}
                                                </div>
                                                <div className="text-xs text-muted-foreground uppercase opacity-70">Atletas</div>
                                            </div>
                                            <button className="p-2 text-muted-foreground hover:text-foreground">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Leads Feed */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-foreground">Nuevos Trials</h3>
                                <span className="bg-brand-red/10 text-brand-red text-xs font-bold px-2 py-0.5 rounded-full">via Rival</span>
                            </div>
                            <div className="bg-card border border-border rounded-2xl p-2 space-y-1">
                                {[
                                    { name: "Carlos M.", time: "Hace 5 min", plan: "Starter Class", avatar: "Felix" },
                                    { name: "Andrea P.", time: "Hace 1h", plan: "Promoción Local", avatar: "Aneka" },
                                    { name: "David S.", time: "Hace 3h", plan: "Starter Class", avatar: "Jack" },
                                ].map((lead, i) => (
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        key={i}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden relative">
                                            <img
                                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${lead.avatar}&backgroundColor=transparent`}
                                                alt={lead.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-red rounded-full flex items-center justify-center border-2 border-card">
                                                <Flame className="w-2 h-2 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-foreground truncate">{lead.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{lead.plan}</div>
                                        </div>
                                        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                            Contactar
                                        </div>
                                    </motion.div>
                                ))}

                                <button className="w-full mt-2 py-3 text-sm font-bold text-brand-red hover:bg-brand-red/5 rounded-xl transition-colors border border-transparent hover:border-brand-red/10">
                                    Ver todos los Leads
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Floating Add Button for Mobile */}
                <button className="md:hidden absolute bottom-6 right-6 w-14 h-14 bg-brand-red rounded-full shadow-lg flex items-center justify-center text-white">
                    <Activity className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}
