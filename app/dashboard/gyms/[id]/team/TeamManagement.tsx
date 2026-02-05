"use client";

import { useState } from "react";
import { Plus, Shield, Trash2, User, Mail, MoreHorizontal, Search, Loader2, X, Link as LinkIcon, Check, Users, Clock } from "lucide-react";
import { inviteTeamMember, removeTeamMember, updateTeamMemberRole } from "../../actions";
import { searchAthletes } from "../../management-actions";
import Image from "next/image";
import CoachShifts from "./CoachShifts";
import clsx from "clsx";

interface TeamMember {
    id: string;
    role: string;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        username: string;
        avatar_url: string;
    };
}

export default function TeamManagement({ centerId, initialTeam }: { centerId: string, initialTeam: TeamMember[] }) {
    const [team, setTeam] = useState<TeamMember[]>(initialTeam);
    const [isInviting, setIsInviting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
    const [selectedDetailMember, setSelectedDetailMember] = useState<TeamMember | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'shifts'>('members');

    // Profile search state
    const [profileSearchQuery, setProfileSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [inviteUsername, setInviteUsername] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("coach");

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

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const res = await inviteTeamMember(centerId, inviteUsername, inviteRole, selectedProfile?.id, inviteEmail);

        setLoading(false);
        if (res.error) {
            alert(res.error);
        } else {
            alert("Member added successfully!");
            setShowModal(false);
            setInviteUsername("");
            setInviteEmail("");
            setProfileSearchQuery("");
            setSelectedProfile(null);
            window.location.reload();
        }
    }

    async function handleRemove(userId: string) {
        if (!confirm("Are you sure you want to remove this member?")) return;

        const res = await removeTeamMember(centerId, userId);
        if (res.error) {
            alert(res.error);
        } else {
            setTeam(prev => prev.filter(m => m.user.id !== userId));
        }
    }

    async function handleRoleUpdate(userId: string, newRole: string) {
        setLoading(true);
        const res = await updateTeamMemberRole(centerId, userId, newRole);
        setLoading(false);

        if (res.error) {
            alert(res.error);
        } else {
            setTeam(prev => prev.map(m => m.user.id === userId ? { ...m, role: newRole } : m));
            if (selectedDetailMember?.user.id === userId) {
                setSelectedDetailMember(prev => prev ? { ...prev, role: newRole } : null);
            }
            setUpdatingMemberId(null);
        }
    }

    return (
        <div className="space-y-4 sm:space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-xl font-bold text-white">Team Members</h2>
                    <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest font-black opacity-60">Manage access and roles for your facility.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full sm:w-auto bg-white text-black px-6 py-3 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-red hover:text-white transition-all shadow-lg"
                >
                    <Plus className="w-4 h-4" /> Add Member
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-black/40 border border-white/5 p-1 rounded-2xl w-full sm:w-fit self-center sm:self-start">
                <button
                    onClick={() => setActiveTab('members')}
                    className={clsx(
                        "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        activeTab === 'members' ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Users className="w-4 h-4" /> Miembros
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={clsx(
                        "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        activeTab === 'shifts' ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Clock className="w-4 h-4" /> Horario Turnos
                </button>
            </div>

            {activeTab === 'members' ? (
                <>

                    {/* Team Grid */}
                    <div className="grid gap-3">
                        {team.map((member) => (
                            <div
                                key={member.id}
                                onClick={() => setSelectedDetailMember(member)}
                                className="bg-brand-gray border border-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between group hover:border-brand-red/30 hover:bg-white/[0.02] cursor-pointer transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/5 overflow-hidden bg-gray-900 shadow-xl shrink-0">
                                        {member.user.avatar_url ? (
                                            <img src={member.user.avatar_url} alt={member.user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <User className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white text-sm truncate">{member.user.full_name || member.user.username}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span className="bg-brand-red/10 text-brand-red px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">
                                                {member.role.replace('_', ' ')}
                                            </span>
                                            <span className="truncate opacity-50">@{member.user.username}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <MoreHorizontal className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}

                        {team.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-500 italic">No team members found.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <CoachShifts centerId={centerId} team={team} />
            )}

            {/* Member Detail Ficha Modal */}
            {selectedDetailMember && (
                <div
                    onClick={() => setSelectedDetailMember(null)}
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-brand-gray border border-white/10 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 w-full max-w-md animate-in fade-in zoom-in duration-300 relative overflow-hidden cursor-default"
                    >
                        {/* Abstract Background Element */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-red/10 rounded-full blur-[80px]" />

                        <button
                            type="button"
                            onClick={() => setSelectedDetailMember(null)}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all z-[70]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full border-4 border-brand-red p-1 mb-4 shadow-2xl shadow-brand-red/20">
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 border-2 border-brand-red/30">
                                    {selectedDetailMember.user.avatar_url ? (
                                        <img src={selectedDetailMember.user.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                                            <User className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                {selectedDetailMember.user.full_name}
                            </h3>
                            <p className="text-brand-red font-bold text-xs uppercase tracking-[0.2em] mb-8">
                                @{selectedDetailMember.user.username}
                            </p>

                            <div className="w-full space-y-6">
                                {/* Role Section */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Gestión de Rango</label>
                                    <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                                        <button
                                            disabled={selectedDetailMember.role === 'owner' || loading}
                                            onClick={() => handleRoleUpdate(selectedDetailMember.user.id, 'head_coach')}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${selectedDetailMember.role === 'head_coach' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-gray-500 hover:text-white hover:bg-white/5 cursor-pointer'}`}
                                        >
                                            <Shield className="w-3.5 h-3.5" />
                                            Head Coach
                                        </button>
                                        <button
                                            disabled={selectedDetailMember.role === 'owner' || loading}
                                            onClick={() => handleRoleUpdate(selectedDetailMember.user.id, 'coach')}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${selectedDetailMember.role === 'coach' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-gray-500 hover:text-white hover:bg-white/5 cursor-pointer'}`}
                                        >
                                            <User className="w-3.5 h-3.5" />
                                            Coach
                                        </button>
                                    </div>
                                    {selectedDetailMember.role === 'owner' && (
                                        <p className="text-[10px] text-gray-500 italic mt-2">El rol de Propietario no puede ser modificado.</p>
                                    )}
                                </div>

                                {/* Danger Zone */}
                                {selectedDetailMember.role !== 'owner' && (
                                    <div className="pt-6 border-t border-white/5">
                                        <button
                                            onClick={() => {
                                                handleRemove(selectedDetailMember.user.id);
                                                setSelectedDetailMember(null);
                                            }}
                                            className="w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Revocar Acceso del Team
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {showModal && (
                <div
                    onClick={() => setShowModal(false)}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-brand-gray border border-white/10 rounded-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200 cursor-default"
                    >
                        <h3 className="text-lg font-black text-white italic uppercase mb-4">Add Team Member</h3>
                        <form onSubmit={handleInvite} className="space-y-6">
                            <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2 text-brand-red">
                                    <LinkIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Vincular Coach Rival</span>
                                </div>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        value={profileSearchQuery}
                                        onChange={(e) => handleProfileSearch(e.target.value)}
                                        placeholder="Buscar coach por @usuario..."
                                        className="w-full bg-black/60 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white outline-none focus:border-brand-red text-xs"
                                    />
                                    {isSearching && <Loader2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-brand-red animate-spin" />}
                                </div>

                                {searchResults.length > 0 ? (
                                    <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {searchResults.map((p: any) => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedProfile(p);
                                                    setInviteUsername(p.full_name);
                                                    setProfileSearchQuery("");
                                                    setSearchResults([]);
                                                }}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-red/50 cursor-pointer transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-8 h-8 rounded-full" />
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{p.full_name}</p>
                                                        <p className="text-[10px] text-gray-500">@{p.username}</p>
                                                    </div>
                                                </div>
                                                <Plus className="w-4 h-4 text-brand-red" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    profileSearchQuery.length >= 2 && !isSearching && (
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center mt-2 animate-in fade-in zoom-in">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                No se encontró ningún usuario
                                            </p>
                                        </div>
                                    )
                                )}

                                {selectedProfile && (
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-brand-red/10 border border-brand-red/20 animate-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border-2 border-brand-red p-0.5">
                                                <img src={selectedProfile.avatar_url || `https://ui-avatars.com/api/?name=${selectedProfile.full_name}`} className="w-full h-full rounded-full" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase italic">Coach: {selectedProfile.full_name}</p>
                                                <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest">Listo para Vincular</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setSelectedProfile(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>

                            <div className={selectedProfile ? "opacity-30 pointer-events-none" : "space-y-4"}>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nombre Manual</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            required={!selectedProfile}
                                            value={inviteUsername}
                                            onChange={e => setInviteUsername(e.target.value)}
                                            placeholder="Nombre del Coach..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:border-brand-red outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Invitación</label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            placeholder="correo@ejemplo.com (Enviará link de registro)"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:border-brand-red outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('head_coach')}
                                        className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${inviteRole === 'head_coach' ? 'bg-brand-red text-white border-brand-red' : 'bg-black/40 border-white/10 text-gray-500 hover:text-white'}`}
                                    >
                                        Head Coach
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('coach')}
                                        className={`p-3 rounded-xl border text-xs font-bold uppercase transition-all ${inviteRole === 'coach' ? 'bg-brand-red text-white border-brand-red' : 'bg-black/40 border-white/10 text-gray-500 hover:text-white'}`}
                                    >
                                        Coach
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-transparent border border-white/10 text-white py-3 rounded-xl text-xs font-black uppercase hover:bg-white/5">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-white text-black py-3 rounded-xl text-xs font-black uppercase hover:bg-brand-red hover:text-white transition-colors disabled:opacity-50">
                                    {loading ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
