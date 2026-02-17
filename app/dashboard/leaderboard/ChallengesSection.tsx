"use client";

import { useState } from "react";
import { Flame, Plus } from "lucide-react";
import ChallengeCard from "./ChallengeCard";
import ChallengeAdminModal from "./ChallengeAdminModal";
import { useRouter } from "next/navigation";

interface ChallengesSectionProps {
    challenges: any[];
    userId: string | undefined;
    isAdmin: boolean;
}

export default function ChallengesSection({ challenges, userId, isAdmin }: ChallengesSectionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState<any>(null);
    const router = useRouter();

    const handleCreate = () => {
        setEditingChallenge(null);
        setIsModalOpen(true);
    };

    const handleEdit = (challenge: any) => {
        setEditingChallenge(challenge);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" /> Retos de la Comunidad
                </h3>
                {isAdmin && (
                    <button
                        onClick={handleCreate}
                        className="p-2 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red rounded-lg border border-brand-red/20 transition-all active:scale-95 group"
                        title="Crear Nuevo Reto"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}
            </div>

            {challenges && challenges.length > 0 ? challenges.map((challenge: any) => (
                <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    userId={userId}
                    isParticipatingInitial={challenge.participants?.some((p: any) => p.user_id === userId)}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                />
            )) : (
                <p className="text-gray-500 text-xs px-4">No hay retos activos en este momento.</p>
            )}

            <ChallengeAdminModal
                isOpen={isModalOpen}
                challenge={editingChallenge}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => router.refresh()}
            />
        </div>
    );
}
