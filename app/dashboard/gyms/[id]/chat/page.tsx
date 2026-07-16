import TeamChat from "../TeamChat";
import { MessageSquareText } from "lucide-react";

export default async function CenterChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-8 border-b border-white/5 pb-4 sm:pb-8">
                <div className="p-2 sm:p-3 bg-brand-red/10 rounded-xl sm:rounded-2xl border border-brand-red/20 text-brand-red shrink-0">
                    <MessageSquareText className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-black text-white italic uppercase leading-tight">Chat de Empresa</h1>
                    <p className="text-sm sm:text-base text-gray-400">Canal operativo del centro, solo para personal autorizado.</p>
                </div>
            </div>

            <TeamChat centerId={id} standalone className="h-[75vh]" />
        </div>
    );
}
