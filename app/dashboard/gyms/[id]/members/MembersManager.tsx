"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, User, CheckCircle, Trash2, Edit2, X, CreditCard, Phone, Mail, Landmark, Power, Cake, Calendar, Link as LinkIcon, Loader2, ChevronDown, Check, Send, Download, Upload, FileText, AlertCircle, Building2 } from "lucide-react";
import { addMember, addGuestMember, requestMemberPayment, approveTrialRequest, removeMember, updateMemberDetails, toggleMemberStatus, searchAthletes, linkMemberToUser, bulkImportMembers, getCenterMembers, getLeaveRequests, processLeaveRequest } from "../../member-actions";
import { isProfessional } from "@/lib/professional-types";
import { sendRegistrationEmail } from "../../email-actions";
import { getPendingCancellations } from "../../cancellation-actions";
import CancellationRequestsPanel from "./CancellationRequestsPanel";

export default function MembersManager({ centerId, initialMembers, plans = [], centers = [], orgDetails }: any) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const memberIdParam = searchParams.get('memberId');
    const centerIdParam = searchParams.get('centerId');

    const [members, setMembers] = useState(initialMembers);
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(centerIdParam || (centers.length > 0 ? centers[0].id : null));
    const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
    const isMultiCenter = orgDetails?.is_multi_center;
    const isPro = isProfessional(orgDetails?.center_type);
    const [pendingCancellations, setPendingCancellations] = useState<any[]>([]);
    useEffect(() => {
        console.log("[MembersManager] initialMembers count:", initialMembers?.length || 0);
        getPendingCancellations(centerId).then(setPendingCancellations);
    }, [initialMembers]);
    const [showModal, setShowModal] = useState(false);
    const [viewingMember, setViewingMember] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);

    useEffect(() => {
        getLeaveRequests(centerId).then(setLeaveRequests);
    }, [centerId]);

    // Profile search state
    const [profileSearchQuery, setProfileSearchQuery] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);

    // Form state
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [plan, setPlan] = useState("unlimited");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [cardNumber, setCardNumber] = useState("");

    const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
    const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);

    const [notes, setNotes] = useState("");
    const [injuries, setInjuries] = useState("");
    const [otherSports, setOtherSports] = useState("");
    const [generalNotes, setGeneralNotes] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Sync state with props when server refreshes or center changes
    useEffect(() => {
        if (!isMultiCenter) {
            setMembers(initialMembers);
            return;
        }

        const fetchByCenter = async () => {
            const idToFetch = selectedCenterId || centerId;
            const isSede = !!selectedCenterId;
            const data = await getCenterMembers(idToFetch, isSede);
            setMembers(data);
        };
        fetchByCenter();
    }, [initialMembers, selectedCenterId, centerId, isMultiCenter]);

    // Handle opening member from URL parameter
    useEffect(() => {
        if (!memberIdParam || members.length === 0 || viewingMember) return;

        console.log("Searching for member from URL:", memberIdParam);
        const member = members.find((m: any) => m.id === memberIdParam);

        if (member) {
            console.log("Found member, opening details:", member.full_name);
            setViewingMember(member);
            setUsername(member.full_name || member.user?.full_name || "");
            setEmail(member.email || member.user?.email || "");
            setPhone(member.phone || "");
            setBirthDate(member.birth_date || member.user?.birth_date || "");
            setPlan(member.plan || "unlimited");
            setPaymentMethod(member.payment_method || "cash");
            setNotes(member.notes || "");
            let inj = "";
            let sport = "";
            let genNotes = member.notes || "";
            try {
                if (member.notes && member.notes.startsWith('{')) {
                    const parsed = JSON.parse(member.notes);
                    inj = parsed.injuries || "";
                    sport = parsed.otherSports || "";
                    genNotes = parsed.generalNotes || "";
                }
            } catch (e) {
                console.error("Error parsing member notes:", e);
            }
            setInjuries(inj);
            setOtherSports(sport);
            setGeneralNotes(genNotes);

            // Open in edit mode for trials or incomplete profiles
            if (member.status === 'trial' || member.plan === 'trial' || !member.phone || !member.birth_date) {
                setIsEditing(true);
            }

            // Clean up URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete('memberId');
            const newQuery = params.toString();
            const newPath = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
            router.replace(newPath, { scroll: false });
        } else {
            console.warn("Member ID from URL not found in members list:", memberIdParam);
        }
    }, [memberIdParam, members, router, searchParams]);

    const [statusFilter, setStatusFilter] = useState("all");

    const filteredMembers = members.filter((m: any) => {
        const name = (m.user?.full_name || m.full_name || "").toLowerCase();
        const user = (m.user?.username || "").toLowerCase();
        const emailMatch = (m.email || "").toLowerCase().includes(searchQuery.toLowerCase());
        const phoneMatch = (m.phone || "").includes(searchQuery);

        const matchesSearch = name.includes(searchQuery.toLowerCase()) ||
            user.includes(searchQuery.toLowerCase()) ||
            emailMatch ||
            phoneMatch;


        const s = (m.status || "").toLowerCase();

        if (statusFilter === 'all') return matchesSearch;

        // Specific status checks
        if (statusFilter === 'active') return matchesSearch && s === 'active';
        if (statusFilter === 'pending') return matchesSearch && s === 'pending';
        if (statusFilter === 'trial') return matchesSearch && s === 'trial';
        if (statusFilter === 'paused') return matchesSearch && s === 'paused';

        // "inactive" catches everything else that isn't the above (De Baja)
        if (statusFilter === 'inactive') {
            return matchesSearch && !['active', 'pending', 'trial', 'paused'].includes(s);
        }

        return matchesSearch;
    });

    const resetForm = () => {
        setUsername("");
        setEmail("");
        setPhone("");
        setBirthDate("");
        setPlan("unlimited");
        setPaymentMethod("cash");
        setCardNumber("");
        setIsEditing(false);
        setProfileSearchQuery("");
        setSearchResults([]);
        setSelectedProfile(null);
        setNotes("");
        setInjuries("");
        setOtherSports("");
        setGeneralNotes("");
    };

    const handleProfileSearch = async (query: string) => {
        setProfileSearchQuery(query);
        if (query.length < 1) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const results = await searchAthletes(query);
        setSearchResults(results);
        setIsSearching(false);
    };

    const calculateAge = (date: string) => {
        if (!date) return null;
        const birth = new Date(date);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const month = now.getMonth() - birth.getMonth();
        if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const isBirthday = (date: string) => {
        if (!date) return false;
        const birth = new Date(date);
        const now = new Date();
        return birth.getDate() === now.getDate() && birth.getMonth() === now.getMonth();
    };

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);

        const combinedNotes = JSON.stringify({
            injuries: injuries.trim(),
            otherSports: otherSports.trim(),
            generalNotes: generalNotes.trim()
        });

        const extraData = {
            email,
            phone,
            birth_date: birthDate,
            payment_method: paymentMethod,
            auto_billing: paymentMethod === 'card',
            card_last4: paymentMethod === 'card' ? cardNumber.slice(-4) : null,
            full_name: plan === 'guest' ? username : null
        };

        let res;
        if (plan === 'guest') {
            res = await addGuestMember(centerId, username, email, {
                ...extraData,
                notes: combinedNotes,
                center_id: selectedCenterId
            });
        } else if (paymentMethod === 'payment_request') {
            if (!selectedProfile) {
                alert("Debes vincular un perfil de atleta Rival para enviar una solicitud de pago.");
                setIsSaving(false);
                return;
            }
            res = await requestMemberPayment(centerId, plan, selectedProfile.id, {
                ...extraData,
                fullName: username,
                notes: combinedNotes,
                center_id: selectedCenterId
            });
        } else {
            res = await addMember(centerId, username, plan, {
                ...extraData,
                notes: combinedNotes,
                center_id: selectedCenterId
            }, selectedProfile?.id);
        }

        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            setShowModal(false);
            window.location.reload();
        }
    }

    async function handleLinkProfile(userId: string) {
        if (!viewingMember) return;
        setIsSaving(true);
        const res = await linkMemberToUser(centerId, viewingMember.id, userId);
        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            window.location.reload();
        }
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!viewingMember) return;
        setIsSaving(true);

        const combinedNotes = JSON.stringify({
            injuries: injuries.trim(),
            otherSports: otherSports.trim(),
            generalNotes: generalNotes.trim()
        });

        const data: any = {
            full_name: username,
            email,
            phone,
            birth_date: birthDate,
            plan,
            payment_method: paymentMethod,
            notes: combinedNotes,
            auto_billing: paymentMethod === 'card',
            card_last4: paymentMethod === 'card' && cardNumber ? cardNumber.slice(-4) : viewingMember.card_last4
        };

        // If converting from trial to a real plan
        if (viewingMember.status === 'trial' && plan !== 'trial') {
            data.status = 'active';
        }

        // First, update member details
        const res = await updateMemberDetails(centerId, viewingMember.id, data);

        if (res.error) {
            setIsSaving(false);
            alert(res.error);
            return;
        }


        // If payment_method is 'payment_request', send payment link
        if (paymentMethod === 'payment_request' && (viewingMember.user_id || viewingMember.userId)) {
            // Check if the selected plan exists in membership_plans
            const selectedPlan = plans.find((p: any) => p.id === plan);

            if (!selectedPlan) {
                setIsSaving(false);
                alert('Datos actualizados, pero no se puede enviar la solicitud de pago: El plan seleccionado no está configurado en "Planes de Membresía". Por favor, ve a la sección de Planes y crea el plan primero.');
                setIsEditing(false);
                window.location.reload();
                return;
            }


            const userId = viewingMember.user_id || viewingMember.userId;
            console.log('[MembersManager] Enviando solicitud de pago para userId:', userId, 'planId:', plan);

            const paymentRes = await requestMemberPayment(centerId, plan, userId, {
                fullName: username,
                email,
                phone,
                birth_date: birthDate,
                notes: combinedNotes,
                center_id: selectedCenterId
            });

            setIsSaving(false);

            if (paymentRes.error) {
                alert('Datos actualizados, pero hubo un error al enviar la solicitud de pago: ' + paymentRes.error);
            } else {
                alert('¡Perfecto! Datos actualizados y solicitud de pago enviada al atleta.');
                setIsEditing(false);
                window.location.reload();
            }
        } else {
            setIsSaving(false);
            setIsEditing(false);
            window.location.reload();
        }
    }

    async function handleToggleStatus() {
        if (!viewingMember) return;
        const msg = viewingMember.status === 'inactive' ? '¿Quieres reactivar a este miembro?' : '¿Seguro que quieres dar de baja a este miembro? Perderá el acceso pero sus datos se conservarán.';
        if (!confirm(msg)) return;

        setIsSaving(true);
        const res = await toggleMemberStatus(centerId, viewingMember.id, viewingMember.status);
        setIsSaving(false);

        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error);
        }
    }

    async function handleConvert() {
        if (!viewingMember) return;
        setIsSaving(true);
        const data = {
            plan: 'unlimited',
            status: 'active',
            updated_at: new Date().toISOString()
        };
        const res = await updateMemberDetails(centerId, viewingMember.id, data);
        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            window.location.reload();
        }
    }

    async function handleApprove(member: any) {
        const name = member.full_name || member.user?.full_name || 'Atleta';
        if (!confirm(`¿Aprobar prueba para ${name}?`)) return;

        const userId = member.user_id || member.userId || member.user?.id;

        const res = await approveTrialRequest(
            centerId,
            member.id,
            userId,
            name,
            member.user?.avatar_url || member.avatar_url
        );

        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error);
        }
    }

    async function handleDelete(memberId: string) {
        if (!confirm(`¿Estás seguro de eliminar permanentemente este registro?`)) return;
        const res = await removeMember(centerId, memberId);
        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error);
        }
    }

    const handleExport = () => {
        if (members.length === 0) return;

        // Define headers
        const headers = ["Nombre Completo", "Email", "Telefono", "Fecha Nacimiento", "Plan", "Estado", "Metodo Pago", "Fecha Inicio"];

        // Map data
        const rows = members.map((m: any) => [
            m.full_name || m.user?.full_name || "",
            m.email || m.user?.email || "",
            m.phone || "",
            m.birth_date || m.user?.birth_date || "",
            m.plan || "",
            m.status || "",
            m.payment_method || "",
            m.membership_start_date || ""
        ]);

        // Create CSV content
        const csvContent = [
            headers.join(","),
            ...rows.map((r: any) => r.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `rival_atletas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) return;

            // Simple CSV parser that handles quotes and empty fields
            const parseCSVLine = (line: string) => {
                const result = [];
                let current = "";
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = "";
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const parsedData = lines.slice(1).map(line => {
                const cleanValues = parseCSVLine(line);

                // If first column is just a number (ID), we shift everything
                let offset = 0;
                if (!isNaN(Number(cleanValues[0])) && cleanValues[0].length < 5 && cleanValues.length > 2) {
                    offset = 1;
                }

                // Date validation helper
                const sanitizeDate = (dateStr: string | null) => {
                    if (!dateStr || dateStr.toLowerCase() === 'null') return null;
                    const dateMatch = dateStr.match(/\d{4}-\d{2}-\d{2}/);
                    return dateMatch ? dateMatch[0] : null;
                };

                return {
                    full_name: cleanValues[0 + offset] || "Atleta Importado",
                    email: cleanValues[1 + offset] || "",
                    phone: cleanValues[2 + offset] || "",
                    birth_date: sanitizeDate(cleanValues[3 + offset]),
                    plan: cleanValues[4 + offset] || "unlimited",
                    status: (cleanValues[5 + offset] || "active").toLowerCase(),
                    payment_method: cleanValues[6 + offset] || "cash",
                    membership_start_date: sanitizeDate(cleanValues[7 + offset]) || new Date().toISOString().split('T')[0]
                };
            });

            setImportData(parsedData);
        };
        reader.readAsText(file);
    };

    const processImport = async () => {
        if (importData.length === 0) return;
        setIsImporting(true);

        // Final cleaning before sending to server
        const cleanedData = importData.map(m => ({
            ...m,
            // Ensure plan is not a full name if columns were shifted
            plan: m.plan.length > 20 ? 'unlimited' : m.plan,
        }));

        const res = await bulkImportMembers(centerId, cleanedData);
        setIsImporting(false);

        if (res.success) {
            alert(`¡Éxito! Se han importado ${res.count} atletas.`);
            setShowImportModal(false);
            window.location.reload();
        } else {
            alert("Error al importar: " + res.error);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <CancellationRequestsPanel
                centerId={centerId}
                requests={pendingCancellations}
                onUpdate={() => {
                    getPendingCancellations(centerId).then(setPendingCancellations);
                    getCenterMembers(centerId).then(d => setMembers(d));
                }}
            />
            <div className="flex justify-between items-end mb-2 sm:mb-4">
                <div className="flex flex-col">
                    <h2 className="text-xl sm:text-2xl italic font-black text-foreground uppercase tracking-tighter">Gestión de {isPro ? 'Alumnos' : 'Atletas'}</h2>
                    <div className="flex items-center gap-2">
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            Registrados: {members.length} | Filtrados: {filteredMembers.length}
                        </p>
                        {isMultiCenter && (
                            <div className="relative">
                                <button
                                    onClick={() => setCenterDropdownOpen(!centerDropdownOpen)}
                                    className="flex items-center gap-1.5 text-[9px] text-purple-500 font-black uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                                >
                                    <Building2 className="w-3 h-3" />
                                    {centers.find((c: any) => c.id === selectedCenterId)?.name || 'Sede'}
                                    <ChevronDown className={`w-2.5 h-2.5 transition-transform ${centerDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {centerDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                        {centers.map((c: any) => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCenterId(c.id);
                                                    setCenterDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-between ${selectedCenterId === c.id ? 'text-purple-500 bg-purple-500/5' : 'text-muted-foreground'}`}
                                            >
                                                <span className="truncate">{c.name}</span>
                                                {selectedCenterId === c.id && <Check className="w-3 h-3" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border border-border backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1 mr-4">
                    <div className="relative w-full sm:w-auto flex-1 max-w-md">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            placeholder="Buscar por nombre o @usuario..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground focus:border-brand-red outline-none w-full shadow-inner transition-all"
                        />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground focus:border-brand-red outline-none shadow-inner w-full sm:w-40 appearance-none cursor-pointer transition-all"
                        >
                            <option value="all">Todos</option>
                            <option value="active">Activos</option>
                            <option value="inactive">De Baja</option>
                            <option value="pending">Pendientes</option>
                            <option value="trial">En Prueba</option>
                            <option value="paused">Pausados</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {!isPro && (
                        <>
                            <button
                                onClick={handleExport}
                                className="flex-1 md:flex-none bg-muted text-muted-foreground py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest hover:text-foreground border border-border transition-all flex items-center justify-center gap-2"
                                title="Exportar base de datos a CSV"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Exportar</span>
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex-1 md:flex-none bg-muted text-muted-foreground py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest hover:text-foreground border border-border transition-all flex items-center justify-center gap-2"
                                title="Importar base de datos desde CSV"
                            >
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Importar</span>
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="flex-[2] md:flex-none bg-brand-red text-white py-3 px-6 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg hover:shadow-red-900/40 w-full md:w-auto"
                    >
                        <Plus className="w-5 h-5" /> {isPro ? 'Nuevo Alumno' : 'Nueva Alta'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card/50 shadow-2xl custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[600px] sm:min-w-0">
                    <thead className="bg-muted text-muted-foreground font-bold uppercase text-[9px] sm:text-[10px] tracking-wider">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 sm:py-4">{isPro ? 'Alumno' : 'Atleta'} / Edad</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4">Tarifa</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4">Facturación</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredMembers.length > 0 ? (
                            filteredMembers.map((m: any) => (
                                <tr
                                    key={m.id}
                                    onClick={() => {
                                        setViewingMember(m);
                                        setUsername(m.full_name || m.user?.full_name || "");
                                        setEmail(m.email || m.user?.email || "");
                                        setPhone(m.phone || "");
                                        setBirthDate(m.birth_date || m.user?.birth_date || "");
                                        setPlan(m.plan || "unlimited");
                                        setPaymentMethod(m.payment_method || "cash");
                                        setNotes(m.notes || "");
                                        let inj = "";
                                        let sport = "";
                                        let genNotes = m.notes || "";
                                        try {
                                            if (m.notes && m.notes.startsWith('{')) {
                                                const parsed = JSON.parse(m.notes);
                                                inj = parsed.injuries || "";
                                                sport = parsed.otherSports || "";
                                                genNotes = parsed.generalNotes || "";
                                            }
                                        } catch (e) {
                                            console.error("Error parsing member notes:", e);
                                        }
                                        setInjuries(inj);
                                        setOtherSports(sport);
                                        setGeneralNotes(genNotes);
                                        setIsEditing(false);
                                    }}
                                    className="hover:bg-muted/50 transition-all group cursor-pointer"
                                >
                                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted overflow-hidden shadow-lg shrink-0 ${m.story_status === 'unseen' ? 'ring-2 ring-brand-red ring-offset-2 ring-offset-[#111]' : m.story_status === 'seen' ? 'ring-2 ring-gray-500 ring-offset-2 ring-offset-[#111]' : 'border border-border'}`}>
                                                    {m.user?.avatar_url || m.avatar_url ? (
                                                        <img src={m.user?.avatar_url || m.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="p-1 sm:p-2 w-full h-full text-muted-foreground" />
                                                    )}
                                                </div>
                                                {isBirthday(m.birth_date) && (
                                                    <div className="absolute -top-1 -right-1 bg-brand-red p-0.5 sm:p-1 rounded-full animate-bounce shadow-lg shadow-red-900/50">
                                                        <Cake className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-foreground group-hover:text-brand-red transition-colors truncate text-xs sm:text-sm">
                                                        {m.user?.full_name || m.full_name || 'Atleta'}
                                                        {calculateAge(m.birth_date || m.user?.birth_date) !== null && (
                                                            <span className="ml-2 text-[9px] text-muted-foreground font-medium">
                                                                {calculateAge(m.birth_date || m.user?.birth_date)} años
                                                            </span>
                                                        )}
                                                    </p>
                                                    {!m.user_id && !m.userId && (
                                                        <span title="Sin cuenta de Rival vinculada" className="text-[7px] sm:text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <LinkIcon className="w-2 h-2" /> <span className="hidden sm:inline">Sin Vincular</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                                                        {m.user?.username ? `@${m.user.username}` : (m.email || m.user?.email ? 'Miembro' : 'GUEST')}
                                                    </p>
                                                    {(m.email || m.user?.email) && (
                                                        <>
                                                            <span className="text-[7px] text-muted-foreground/50 font-bold">•</span>
                                                            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate lowercase font-medium">
                                                                {m.email || m.user?.email}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                                        <span className="bg-muted px-2 py-1 rounded text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-foreground/70 border border-border w-fit">
                                            {plans.find((p: any) => p.id === m.plan)?.name || m.membership_type || m.plan}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                                {m.payment_method === 'card' ? (
                                                    <><CreditCard className="w-3.5 h-3.5 text-blue-400" /> ****{m.card_last4 || '0000'}</>
                                                ) : m.payment_method === 'payment_request' ? (
                                                    <><Send className="w-3.5 h-3.5 text-blue-400" /> Solicitud Pago</>
                                                ) : (
                                                    <><Landmark className="w-3.5 h-3.5 text-green-400" /> Efectivo</>
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                                        {m.is_request ? (
                                            <button onClick={(e) => { e.stopPropagation(); handleApprove(m); }} className="mx-auto flex items-center gap-2 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white px-3 py-1.5 rounded-lg transition-all font-bold uppercase tracking-wider text-[9px] sm:text-[10px] shadow-sm">
                                                <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                                            </button>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${m.status === 'active' ? 'bg-green-500/10 text-green-500' : m.status === 'pending' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : m.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' : m.status === 'trial' ? 'bg-purple-500/10 text-purple-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'active' ? 'bg-green-500' : m.status === 'pending' ? 'bg-blue-400' : m.status === 'paused' ? 'bg-yellow-500' : m.status === 'trial' ? 'bg-purple-500' : 'bg-red-500'}`} />
                                                {m.status === 'active' ? 'Activo' : m.status === 'pending' ? 'Pendiente' : m.status === 'paused' ? 'Pausado' : m.status === 'trial' ? 'Prueba' : 'De Baja'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No se han encontrado {orgDetails?.center_type === 'personal_trainer' ? 'alumnos' : 'atletas'}</p>
                                        <p className="text-muted-foreground/60 text-[10px] uppercase tracking-tighter">Prueba con otro nombre o asegúrate de que el centro tiene miembros activos.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Solicitudes de Baja */}
            {leaveRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-400">Solicitudes de Baja ({leaveRequests.length})</h3>
                    </div>
                    <div className="space-y-2">
                        {leaveRequests.map((req: any) => (
                            <div key={req.id} className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 border border-orange-500/20">
                                        {req.profiles?.avatar_url ? (
                                            <img src={req.profiles.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="p-1.5 w-full h-full text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate">{req.profiles?.full_name || 'Miembro'}</p>
                                        {req.reason && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">"{req.reason}"</p>
                                        )}
                                        <p className="text-[9px] text-orange-400/60 font-bold uppercase tracking-widest mt-0.5">
                                            {new Date(req.requested_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                                    <button
                                        disabled={processingLeaveId === req.id}
                                        onClick={async () => {
                                            setProcessingLeaveId(req.id);
                                            await processLeaveRequest(req.id, 'reject');
                                            setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
                                            setProcessingLeaveId(null);
                                        }}
                                        className="flex-1 sm:flex-none bg-muted text-muted-foreground py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-foreground border border-border transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        {processingLeaveId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                        Rechazar
                                    </button>
                                    <button
                                        disabled={processingLeaveId === req.id}
                                        onClick={async () => {
                                            setProcessingLeaveId(req.id);
                                            await processLeaveRequest(req.id, 'approve');
                                            setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
                                            setMembers((prev: any[]) => prev.map(m => m.id === req.member_id ? { ...m, status: 'inactive' } : m));
                                            setProcessingLeaveId(null);
                                        }}
                                        className="flex-1 sm:flex-none bg-orange-500 text-white py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        {processingLeaveId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                        Aprobar Baja
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ficha de Miembro (View / Edit) */}
            {viewingMember && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-card border border-border rounded-2xl sm:rounded-3xl w-full max-w-md animate-in fade-in zoom-in duration-300 shadow-2xl flex flex-col max-h-[92vh]">
                        {/* Header - Fixed */}
                        <div className="flex justify-between items-start p-3 sm:p-5 border-b border-border bg-muted/30 rounded-t-2xl sm:rounded-t-3xl">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted overflow-hidden shadow-xl shrink-0 ${viewingMember.story_status === 'unseen' ? 'ring-2 ring-brand-red ring-offset-2 ring-offset-[#111]' : viewingMember.story_status === 'seen' ? 'ring-2 ring-gray-500 ring-offset-2 ring-offset-[#111]' : 'border border-border'}`}>
                                        {viewingMember.user?.avatar_url ? <img src={viewingMember.user.avatar_url} className="w-full h-full object-cover" /> : <User className="p-2 sm:p-3 w-full h-full text-muted-foreground" />}
                                    </div>
                                    {isBirthday(viewingMember.birth_date) && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-brand-red p-1 rounded-lg rotate-12 shadow-xl animate-pulse z-10">
                                            <Cake className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    {viewingMember.user?.full_name || viewingMember.full_name || username || (isPro ? 'Ficha de Alumno' : 'Ficha de Atleta')}
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest truncate">
                                                {viewingMember.user?.username ? `@${viewingMember.user.username}` : 'Miembro Externo'}
                                            </p>
                                            <span className="text-muted-foreground/50 text-[8px]">•</span>
                                            <p className="text-muted-foreground text-[9px] font-medium lowercase">
                                                {viewingMember.email || viewingMember.user?.email}
                                            </p>
                                        </div>
                                        {viewingMember.user?.username && (
                                            <div className="mt-1">
                                                <Link
                                                    href={`/dashboard/profile/${viewingMember.user.username}`}
                                                    onClick={() => setViewingMember(null)}
                                                    className="text-[9px] text-brand-red hover:underline font-bold uppercase shrink-0"
                                                >
                                                    Ver Perfil ↗
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                {!isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="bg-muted p-2 sm:p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors group">
                                        <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                )}
                                <button onClick={() => setViewingMember(null)} className="bg-muted p-2 sm:p-2.5 rounded-full text-muted-foreground hover:text-foreground transition-colors group">
                                    <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">
                            {isBirthday(viewingMember.birth_date) && (
                                <div className="mb-4 p-3 bg-brand-red/10 border border-brand-red/30 rounded-xl flex items-center gap-3">
                                    <div className="bg-brand-red p-2 rounded-lg shadow-lg">
                                        <Cake className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-brand-red uppercase">¡HOY ES SU CUMPLEAÑOS!</h4>
                                        <p className="text-[10px] text-muted-foreground">Cumple {calculateAge(viewingMember.birth_date)} años.</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={isEditing ? handleUpdate : (e) => e.preventDefault()} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    {/* Details Column */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-1.5 text-brand-red mb-0.5">
                                            <Landmark className="w-3 h-3" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Plan & Membresía</span>
                                        </div>

                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Tarifa Actual</label>
                                            <select disabled={!isEditing} value={plan} onChange={e => setPlan(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 sm:p-2.5 text-foreground outline-none focus:border-brand-red text-[11px] transition-all disabled:opacity-50 appearance-none">
                                                {plans.length > 0 ? (
                                                    plans.map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.price}€)</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option value="unlimited">Unlimited Access (60€)</option>
                                                        <option value="3x_week">3x Per Week (45€)</option>
                                                        <option value="punch_card">10 Class Pack (80€)</option>
                                                        <option value="trial">Trial Pass (Free)</option>
                                                    </>
                                                )}
                                            </select>
                                            {viewingMember.status === 'active' && plan !== 'guest' && plan !== 'trial' && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-80">
                                                    <Calendar className="w-3 h-3 text-brand-red" />
                                                    Cobro Automático: 1 de {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString('es-ES', { month: 'long' })}
                                                </div>
                                            )}
                                        </div>


                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Estado de Cuenta</label>
                                            <div className="flex gap-1.5">
                                                {/* Status Display */}
                                                <div className={`flex-1 p-1.5 rounded-lg border flex items-center justify-between ${viewingMember.status === 'active' ? 'bg-green-500/10 border-green-500/20' :
                                                    viewingMember.status === 'paused' ? 'bg-yellow-500/10 border-yellow-500/20' :
                                                        'bg-red-500/10 border-red-500/20'
                                                    }`}>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${viewingMember.status === 'active' ? 'text-green-500' :
                                                        viewingMember.status === 'paused' ? 'text-yellow-500' :
                                                            'text-red-500'
                                                        }`}>
                                                        {viewingMember.status === 'active' ? 'ACTIVO' : viewingMember.status === 'paused' ? 'PAUSADO' : 'DE BAJA'}
                                                    </span>
                                                    <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest flex items-center gap-1 ${viewingMember.status === 'active' ? 'bg-green-500/20 text-green-500' :
                                                        viewingMember.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' :
                                                            'bg-red-500/20 text-red-500'
                                                        }`}>
                                                        <span className={`w-1 h-1 rounded-full ${viewingMember.status === 'active' ? 'bg-green-500' :
                                                            viewingMember.status === 'paused' ? 'bg-yellow-500' :
                                                                'bg-red-500'
                                                            }`} />
                                                        {viewingMember.status === 'active' ? 'Online' : viewingMember.status === 'paused' ? 'En Pausa' : 'Offline'}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                {isEditing && (
                                                    <div className="flex gap-1.5">
                                                        {viewingMember.status !== 'active' ? (
                                                            <button
                                                                type="button"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm("¿Reactivar la membresía de este atleta?")) return;
                                                                    setIsSaving(true);
                                                                    const res = await toggleMemberStatus(centerId, viewingMember.id, 'active');
                                                                    if (res.error) {
                                                                        alert(res.error);
                                                                    } else {
                                                                        window.location.reload();
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center gap-1.5 shrink-0"
                                                                title="Reactivar Atleta"
                                                            >
                                                                <CheckCircle className="w-3 h-3" />
                                                                <span className="text-[8px] font-black uppercase tracking-widest">Activar Alta</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm("¿CANCELAR membresía definitivamente? El usuario perderá acceso inmediato.")) return;
                                                                    setIsSaving(true);
                                                                    const res = await toggleMemberStatus(centerId, viewingMember.id, 'inactive');
                                                                    if (res.error) {
                                                                        alert(res.error);
                                                                    } else {
                                                                        window.location.reload();
                                                                    }
                                                                }}
                                                                className="px-2 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all flex items-center gap-1 shrink-0"
                                                                title="Dar de baja"
                                                            >
                                                                <X className="w-2.5 h-2.5" />
                                                                <span className="text-[7px] font-black uppercase tracking-widest">Baja</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Trial Conversion Section for both Requests and existing Trial Members */}
                                        {(viewingMember.is_request || viewingMember.status === 'trial') && (
                                            <div className="pt-4 border-t border-green-500/20 space-y-3 bg-green-500/5 -mx-6 px-6 py-4 rounded-xl">
                                                <div className="flex items-center gap-2 text-green-500">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs font-black uppercase tracking-widest">
                                                        {viewingMember.is_request ? 'Solicitud de Prueba' : 'Atleta en Prueba'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                                    {viewingMember.is_request
                                                        ? 'Este usuario ha solicitado una prueba. ¿Quieres aprobarlo y convertirlo en miembro?'
                                                        : 'Este atleta está actualmente en periodo de prueba. ¿Quieres inscribirlo oficialmente?'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (viewingMember.is_request) {
                                                            handleApprove(viewingMember);
                                                        } else {
                                                            handleConvert();
                                                        }
                                                    }}
                                                    className="w-full bg-green-500 text-black py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    {viewingMember.is_request ? 'Aprobar y Afiliar' : 'Convertir en Miembro Oficial'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Linked Account Info (Works for both members and trial requests) */}
                                        {(viewingMember.user_id || viewingMember.userId) && (
                                            <div className="pt-4 border-t border-green-500/20 space-y-2 bg-green-500/5 rounded-xl p-3">
                                                <div className="flex items-center gap-2 text-green-500">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Cuenta Rival Vinculada</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-muted rounded-xl border border-border">
                                                    <img src={viewingMember.user?.avatar_url || `https://ui-avatars.com/api/?name=${viewingMember.user?.full_name}`} className="w-8 h-8 rounded-full border-2 border-green-500/20 p-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground tracking-tight leading-none">{viewingMember.user?.full_name}</p>
                                                        <p className="text-[9px] text-muted-foreground leading-none mt-1">@{viewingMember.user?.username}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contact Column */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-1.5 text-brand-red mb-0.5">
                                            <Phone className="w-3 h-3" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Información de Contacto</span>
                                        </div>

                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Nombre Completo</label>
                                            {isEditing ? (
                                                <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 sm:p-2.5 text-foreground outline-none focus:border-brand-red text-[11px]" />
                                            ) : (
                                                <p className="text-xs text-foreground font-semibold">{username || "No especificado"}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Fecha de Nacimiento</label>
                                            <div className="relative">
                                                {isEditing ? (
                                                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 sm:p-2.5 text-foreground outline-none focus:border-brand-red text-[11px]" />
                                                ) : (
                                                    <p className="text-xs text-foreground font-semibold">
                                                        {birthDate ? `${new Date(birthDate).toLocaleDateString('es-ES')} (${calculateAge(birthDate)} años)` : 'No especificada'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Correo Electrónico</label>
                                            {isEditing ? (
                                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 sm:p-2.5 text-foreground outline-none focus:border-brand-red text-[11px]" />
                                            ) : (
                                                <p className="text-xs text-foreground font-semibold truncate">{email || "No especificado"}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Teléfono</label>
                                            {isEditing ? (
                                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 sm:p-2.5 text-foreground outline-none focus:border-brand-red text-[11px]" />
                                            ) : (
                                                <p className="text-xs text-foreground font-semibold">{phone || "No especificado"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Linking Section for Existing Members (Moved outside grid for better space) */}
                                {!viewingMember.user_id && !viewingMember.userId && !viewingMember.is_request && (
                                    <div className="mt-4 pt-6 border-t border-brand-red/20 space-y-4 bg-brand-red/5 rounded-2xl p-6">
                                        <div className="flex items-center gap-2 text-brand-red">
                                            <LinkIcon className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-widest">Afiliar a Perfil Rival</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">Este atleta aún no tiene su cuenta de Rival vinculada. Vincúlala ahora para que pueda reservar clases y ver sus WODs desde la App.</p>
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                value={profileSearchQuery}
                                                onChange={(e) => handleProfileSearch(e.target.value)}
                                                placeholder="Buscar por @usuario o nombre..."
                                                className="w-full bg-background border border-border rounded-xl py-3 pl-11 pr-4 text-foreground outline-none focus:border-brand-red text-xs shadow-inner"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="w-4 h-4 text-brand-red animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        {searchResults.length > 0 ? (
                                            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                {searchResults.map((p: any) => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleLinkProfile(p.id)}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-brand-red/10 cursor-pointer transition-all border border-border hover:border-brand-red/30"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-8 h-8 rounded-full border border-white/10" />
                                                            <div>
                                                                <p className="text-xs font-bold text-foreground">{p.full_name}</p>
                                                                <p className="text-[10px] text-muted-foreground">@{p.username}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-brand-red text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg">
                                                            <LinkIcon className="w-3 h-3" /> Vincular
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : profileSearchQuery.length >= 2 && !isSearching && (
                                            <div className="p-4 bg-muted rounded-xl border border-border text-center">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">No se encontraron atletas</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Billing Section in Ficha */}
                                <div className="pt-3 border-t border-border">
                                    <div className="flex items-center gap-1.5 text-brand-red mb-3">
                                        <div className="text-brand-red opacity-60 bg-brand-red/10 p-1 rounded-lg"><Landmark className="w-3 h-3" /></div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Datos de Facturación</span>
                                    </div>
                                    <div className="bg-muted/50 p-2 sm:p-3 rounded-xl border border-border">
                                        <div className="flex gap-3 mb-3">
                                            <button disabled={!isEditing} type="button" onClick={() => setPaymentMethod('cash')} className={`flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg border transition-all ${paymentMethod === 'cash' ? 'bg-brand-red border-brand-red text-white' : 'bg-muted border-border text-muted-foreground hover:text-foreground'} disabled:opacity-50`}>
                                                <Landmark className="w-3 h-3" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Efectivo</span>
                                            </button>
                                            <button disabled={!isEditing} type="button" onClick={() => setPaymentMethod('payment_request')} className={`flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg border transition-all ${paymentMethod === 'payment_request' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-muted border-border text-muted-foreground hover:text-foreground'} disabled:opacity-50`}>
                                                <Send className="w-3 h-3" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Solicitud (App)</span>
                                            </button>
                                        </div>

                                        {paymentMethod === 'payment_request' && (
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center gap-2 text-blue-400 mb-1">
                                                    <Send className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Solicitud de Pago</span>
                                                </div>
                                                <p className="text-xs text-foreground/70 leading-relaxed">
                                                    Se enviará una notificación a la App del atleta para gestionar el pago.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section for Injuries, Sports & Notes */}
                                <div className="pt-3 border-t border-border space-y-3">
                                    <div className="flex items-center gap-1.5 text-brand-red">
                                        <div className="text-brand-red opacity-60 bg-brand-red/10 p-1 rounded-lg"><FileText className="w-3 h-3" /></div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Ficha Médica & Deportiva</span>
                                    </div>
                                    
                                    <div className="space-y-3 bg-muted/30 p-3 rounded-xl border border-border">
                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Lesiones / Molestias físicas</label>
                                            {isEditing ? (
                                                <input
                                                    value={injuries}
                                                    onChange={e => setInjuries(e.target.value)}
                                                    placeholder="Ej: Ninguna, dolor lumbar..."
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-foreground outline-none focus:border-brand-red text-[11px]"
                                                />
                                            ) : (
                                                <p className="text-xs text-foreground font-semibold">{injuries || "Ninguna registrada"}</p>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Otros deportes</label>
                                            {isEditing ? (
                                                <input
                                                    value={otherSports}
                                                    onChange={e => setOtherSports(e.target.value)}
                                                    placeholder="Ej: Running, Ciclismo..."
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-foreground outline-none focus:border-brand-red text-[11px]"
                                                />
                                            ) : (
                                                <p className="text-xs text-foreground font-semibold">{otherSports || "Ninguno registrado"}</p>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[7px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Notas / Observaciones generales</label>
                                            {isEditing ? (
                                                <textarea
                                                    value={generalNotes}
                                                    onChange={e => setGeneralNotes(e.target.value)}
                                                    placeholder="Cualquier otra observación..."
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-foreground outline-none focus:border-brand-red text-[11px] min-h-[60px] resize-none"
                                                />
                                            ) : (
                                                <p className="text-xs text-foreground/80 whitespace-pre-wrap">{generalNotes || "Sin observaciones adicionales"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse md:flex-row items-center justify-between pt-6 gap-4">
                                    <button type="button" onClick={() => handleDelete(viewingMember.id)} className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 text-red-500/50 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-all p-2">
                                        <Trash2 className="w-3 h-3" /> Eliminar
                                    </button>
                                    <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[240px]">
                                        {isEditing ? (
                                            <>
                                                {/* Status Actions */}
                                                <div className="flex flex-col gap-2 w-full">
                                                    {viewingMember.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                setIsSaving(true);
                                                                const res = await requestMemberPayment(centerId, plan, viewingMember.user_id || viewingMember.userId, {
                                                                    fullName: username,
                                                                    email,
                                                                    phone,
                                                                    birth_date: birthDate,
                                                                    notes,
                                                                    center_id: selectedCenterId
                                                                });
                                                                setIsSaving(false);
                                                                if (res.error) alert(res.error);
                                                                else alert("Solicitud de pago reenviada con éxito.");
                                                            }}
                                                            className="w-full bg-blue-500/10 text-blue-400 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 border border-blue-500/20 transition-all text-center"
                                                        >
                                                            <Send className="w-3 h-3 inline mr-2" /> Re-enviar Solicitud de Pago
                                                        </button>
                                                    )}
                                                    {viewingMember.status === 'active' && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!confirm("¿Pausar membresía? El usuario no podrá reservar pero se conservarán sus datos.")) return;
                                                                setIsSaving(true);
                                                                await toggleMemberStatus(centerId, viewingMember.id, 'paused');
                                                                window.location.reload();
                                                            }}
                                                            className="w-full bg-yellow-500/10 text-yellow-500 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/20 border border-yellow-500/20 transition-all text-center"
                                                        >
                                                            ⏸ Pausar (Vacaciones)
                                                        </button>
                                                    )}
                                                    {viewingMember.status === 'paused' && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!confirm("¿Reanudar membresía?")) return;
                                                                setIsSaving(true);
                                                                await toggleMemberStatus(centerId, viewingMember.id, 'active');
                                                                window.location.reload();
                                                            }}
                                                            className="w-full bg-green-500/10 text-green-500 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 border border-green-500/20 transition-all text-center"
                                                        >
                                                            ▶ Reanudar Pagos
                                                        </button>
                                                    )}
                                                    {(viewingMember.status === 'active' || viewingMember.status === 'paused') && (
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!confirm("¿CANCELAR membresía definitivamente? El usuario perderá acceso inmediato.")) return;
                                                                setIsSaving(true);
                                                                await toggleMemberStatus(centerId, viewingMember.id, 'inactive');
                                                                window.location.reload();
                                                            }}
                                                            className="w-full bg-red-500/10 text-red-500 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 border border-red-500/20 transition-all text-center"
                                                        >
                                                            ✕ Cancelar Suscripción
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Form Actions (Save / Cancel) */}
                                                <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-border">
                                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-muted text-muted-foreground py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all text-center truncate">Cancelar</button>
                                                    <button type="submit" disabled={isSaving} className="bg-brand-red text-white py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg transition-all text-center truncate">{isSaving ? '...' : 'Guardar'}</button>
                                                </div>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => setViewingMember(null)} className="w-full bg-white text-black py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg">Cerrar</button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            )
            }

            {/* Alta Nueva Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
                        <div className="bg-card border border-border rounded-2xl sm:rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-300 flex flex-col max-h-[92vh] overflow-hidden">
                            <div className="flex justify-between items-start p-4 sm:p-6 border-b border-border">
                                <h3 className="text-xl sm:text-2xl font-black text-foreground italic uppercase tracking-tighter">Nueva Alta</h3>
                                <button onClick={() => setShowModal(false)} className="bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors group">
                                    <X className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
                                <form onSubmit={handleAdd} className="space-y-4 sm:space-y-6">
                                    {plan !== 'guest' && (
                                        <div className="p-4 sm:p-6 bg-muted/30 border border-border rounded-2xl space-y-3 sm:space-y-4">
                                            <div className="flex items-center gap-2 text-brand-red">
                                                <LinkIcon className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vincular Atleta Rival (Opcional)</span>
                                            </div>
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <input
                                                    value={profileSearchQuery}
                                                    onChange={(e) => handleProfileSearch(e.target.value)}
                                                    placeholder="Buscar atleta por nombre o @usuario..."
                                                    className="w-full bg-background border border-border rounded-xl py-2.5 sm:py-3 pl-12 pr-4 text-foreground outline-none focus:border-brand-red text-xs sm:text-xs"
                                                />
                                                {isSearching && <Loader2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-brand-red animate-spin" />}

                                                {!selectedProfile && (
                                                    <button
                                                        type="button"
                                                        disabled={isSendingEmail}
                                                        onClick={async () => {
                                                            if (!email) {
                                                                alert("Por favor, introduce el correo electrónico en el campo de abajo primero.");
                                                                return;
                                                            }
                                                            setIsSendingEmail(true);
                                                            try {
                                                                const result = await sendRegistrationEmail(email, username || "Atleta", orgDetails?.name || "Tu Centro Fitness");
                                                                if (result.success) {
                                                                    alert("¡Enlace enviado con éxito!");
                                                                } else {
                                                                    alert("Error: " + (result.error || "No se pudo enviar el correo. Verifica tu configuración."));
                                                                }
                                                            } catch (error) {
                                                                console.error(error);
                                                                alert("Error de conexión al enviar el correo.");
                                                            } finally {
                                                                setIsSendingEmail(false);
                                                            }
                                                        }}
                                                        className="absolute right-0 -bottom-6 text-[9px] text-brand-red font-bold hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity disabled:opacity-50"
                                                    >
                                                        {isSendingEmail ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Mail className="w-3 h-3" />
                                                        )}
                                                        {isSendingEmail ? "Enviando..." : "¿No tiene cuenta? Enviar link de registro al correo"}
                                                    </button>
                                                )}
                                            </div>

                                            {isSearching && profileSearchQuery.length >= 2 ? (
                                                <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-center mt-2">
                                                    <Loader2 className="w-5 h-5 text-brand-red animate-spin mx-auto" />
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Buscando atletas...</p>
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                    {searchResults.map((p: any) => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => {
                                                                setSelectedProfile(p);
                                                                setUsername(p.full_name);
                                                                setEmail(p.email || "");
                                                                setPhone(p.phone || "");
                                                                setBirthDate(p.birth_date || "");
                                                                setSearchResults([]);
                                                                setProfileSearchQuery(p.full_name);
                                                            }}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-brand-red/10 cursor-pointer transition-all border border-border hover:border-brand-red/30"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-8 h-8 rounded-full border border-white/10" />
                                                                <div>
                                                                    <p className="text-xs font-bold text-foreground">{p.full_name}</p>
                                                                    <p className="text-[10px] text-muted-foreground">@{p.username}</p>
                                                                </div>
                                                            </div>
                                                            <div className="bg-brand-red text-white text-[9px] font-black uppercase px-2 py-1 rounded">Seleccionar</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : profileSearchQuery.length >= 2 && !isSearching && (
                                                <div className="p-4 bg-muted rounded-xl border border-border text-center mt-2">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">No se encontraron atletas</p>
                                                </div>
                                            )}

                                            {selectedProfile && (
                                                <div className="flex items-center justify-between p-4 rounded-xl bg-brand-red/10 border border-brand-red/20 mt-2">
                                                    <div className="flex items-center gap-3">
                                                        <img src={selectedProfile.avatar_url || `https://ui-avatars.com/api/?name=${selectedProfile.full_name}`} className="w-10 h-10 rounded-full border-2 border-brand-red/30 p-0.5" />
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">{selectedProfile.full_name}</p>
                                                            <p className="text-[10px] text-muted-foreground">@{selectedProfile.username}</p>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => setSelectedProfile(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                                                </div>
                                            )}

                                            <div className="pt-2 space-y-3">
                                                <div>
                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">¿Tiene alguna lesión o molestia física?</label>
                                                    <input
                                                        value={injuries}
                                                        onChange={e => setInjuries(e.target.value)}
                                                        placeholder="Ej: Molestias en rodilla derecha, operado de hombro en 2022..."
                                                        className="w-full bg-background border border-border rounded-xl p-3 text-foreground outline-none focus:border-brand-red text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">¿Practica otro deporte? ¿Cuál?</label>
                                                    <input
                                                        value={otherSports}
                                                        onChange={e => setOtherSports(e.target.value)}
                                                        placeholder="Ej: Running, Fútbol, Natación..."
                                                        className="w-full bg-background border border-border rounded-xl p-3 text-foreground outline-none focus:border-brand-red text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 ml-1">Notas / Observaciones generales</label>
                                                    <textarea
                                                        value={generalNotes}
                                                        onChange={e => setGeneralNotes(e.target.value)}
                                                        placeholder="Cualquier otra observación relevante sobre el atleta..."
                                                        className="w-full bg-background border border-border rounded-xl p-3 text-foreground outline-none focus:border-brand-red text-xs min-h-[70px] resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-3 sm:gap-6 pt-4">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">Nombre Completo</label>
                                            <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 sm:p-4 text-foreground outline-none focus:border-brand-red text-sm" placeholder="e.g. Santiago Gomez" />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">Fecha de Nacimiento</label>
                                            <input required type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 sm:p-4 text-foreground outline-none focus:border-brand-red text-sm" />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">Correo Electrónico</label>
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 sm:p-4 text-foreground outline-none focus:border-brand-red text-sm" placeholder="ejemplo@email.com" />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">Teléfono</label>
                                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 sm:p-4 text-foreground outline-none focus:border-brand-red text-sm" placeholder="+34 600..." />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
                                        <div className="relative">
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">Plan</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={plan}
                                                    onChange={e => setPlan(e.target.value)}
                                                    className="w-full bg-background border border-border rounded-xl p-3 sm:p-4 text-foreground outline-none focus:border-brand-red text-sm appearance-none"
                                                >
                                                    {plans.length > 0 ? (
                                                        <>
                                                            <option value="" disabled>Selecciona un plan</option>
                                                            {plans.map((p: any) => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.name} ({p.price}€)
                                                                </option>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="unlimited">Unlimited Access (60€)</option>
                                                            <option value="3x_week">3x Per Week (45€)</option>
                                                            <option value="punch_card">10 Class Pack (80€)</option>
                                                            <option value="trial">Trial Pass (Free)</option>
                                                        </>
                                                    )}
                                                </select>
                                                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-2">Método Pago</label>
                                            <div className="relative">
                                                <select
                                                    value={paymentMethod}
                                                    onChange={e => setPaymentMethod(e.target.value)}
                                                    className="w-full bg-background border border-border rounded-xl p-3 sm:p-4 text-foreground outline-none focus:border-brand-red text-sm appearance-none"
                                                >
                                                    <option value="cash">Efectivo</option>
                                                    <option value="payment_request">Solicitar Pago (App)</option>
                                                </select>
                                                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>



                                    {paymentMethod === 'payment_request' && (
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 text-blue-400 mb-1">
                                                <Send className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Solicitud de Pago</span>
                                            </div>
                                            <p className="text-xs text-foreground/70 leading-relaxed">
                                                El atleta {selectedProfile ? 'vinculado' : ''} recibirá una notificación en su App para completar el pago y el registro.
                                            </p>
                                            {!selectedProfile && (
                                                <p className="text-[10px] text-brand-red font-bold bg-brand-red/10 p-2 rounded-lg border border-brand-red/20">
                                                    ⚠️ Importante: Debes vincular un perfil de atleta Rival arriba para usar esta función.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-3 sm:gap-4 pt-4">
                                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-muted text-muted-foreground py-3 sm:py-4 rounded-xl text-xs font-black uppercase tracking-widest">Cancelar</button>
                                        <button type="submit" disabled={isSaving} className="flex-[2] bg-brand-red text-white py-3 sm:py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl">{isSaving ? 'Guardando...' : 'Registrar'}</button>
                                    </div>
                                </form>
                            </div>
                        </div >
                    </div >
                )
            }

            {/* Importar Modal */}
            {
                showImportModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-card border border-border rounded-3xl p-8 w-full max-w-2xl animate-in fade-in zoom-in duration-300">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">Importar Base de Datos</h3>
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Sube tu archivo CSV para migrar atletas</p>
                                </div>
                                <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="space-y-6">
                                {importData.length === 0 ? (
                                    <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center group hover:border-brand-red/30 transition-all cursor-pointer relative overflow-hidden">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-16 h-16 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red mb-4 group-hover:scale-110 transition-transform">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-foreground font-bold mb-1">Selecciona tu archivo .CSV</h4>
                                        <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">Arrastra tu archivo aquí para procesar los datos de tus clientes automáticamente.</p>

                                        <div className="mt-8 p-4 bg-muted rounded-xl text-left w-full text-[10px] text-muted-foreground font-mono space-y-2">
                                            <p className="text-brand-red font-bold uppercase tracking-widest mb-2 font-sans text-[9px]">Formato Recomendado:</p>
                                            <p>Nombre,Email,Telefono,FechaNacimiento,Plan,Estado,MetodoPago,FechaInicio</p>
                                            <p>Juan Perez,juan@mail.com,600123456,1990-05-15,unlimited,active,cash,2024-01-01</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-4">
                                            <div className="bg-green-500 p-2 rounded-lg text-black">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-green-500 uppercase">Archivo Procesado</h4>
                                                <p className="text-xs text-muted-foreground">Se han detectado {importData.length} registros listos para importar.</p>
                                            </div>
                                        </div>

                                        <div className="max-h-60 overflow-y-auto rounded-xl border border-border bg-muted/50 custom-scrollbar">
                                            <table className="w-full text-[10px] text-left">
                                                <thead className="bg-muted text-muted-foreground sticky top-0">
                                                    <tr>
                                                        <th className="p-3">Nombre</th>
                                                        <th className="p-3">Email</th>
                                                        <th className="p-3 text-right">Plan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {importData.slice(0, 10).map((row, i) => (
                                                        <tr key={i} className="text-foreground/70">
                                                            <td className="p-3 font-bold">{row.full_name}</td>
                                                            <td className="p-3 opacity-60">{row.email}</td>
                                                            <td className="p-3 text-right uppercase font-black text-brand-red">{row.plan}</td>
                                                        </tr>
                                                    ))}
                                                    {importData.length > 10 && (
                                                        <tr><td colSpan={3} className="p-3 text-center text-gray-600 font-bold italic">... y {importData.length - 10} registros más</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="bg-brand-red/10 border border-brand-red/30 rounded-2xl p-4 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-brand-red shrink-0" />
                                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                                <span className="text-brand-red font-black block mb-1">ATENCIÓN:</span>
                                                Al confirmar, todos estos atletas se añadirán automáticamente a tu base de datos actual. Podrás editar sus membresías individualmente después.
                                            </p>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setImportData([])}
                                                className="flex-1 bg-muted text-muted-foreground py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:text-foreground transition-all"
                                            >
                                                Cambiar Archivo
                                            </button>
                                            <button
                                                disabled={isImporting}
                                                onClick={processImport}
                                                className="flex-[2] bg-brand-red text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl flex items-center justify-center gap-2"
                                            >
                                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                {isImporting ? 'PROCESANDO...' : 'CONFIRMAR IMPORTACIÓN'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
