export default function CoachLoading() {
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 p-4 border-b border-white/5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 w-36 bg-white/10 rounded-full" />
                    <div className="h-3 w-24 bg-white/5 rounded-full" />
                </div>
                <div className="w-20 h-8 bg-white/5 rounded-xl" />
            </div>

            {/* Messages skeleton */}
            <div className="flex-1 p-4 space-y-6 overflow-hidden">
                {/* Assistant message */}
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-red/20 shrink-0" />
                    <div className="space-y-2 max-w-[75%]">
                        <div className="h-4 w-64 bg-white/10 rounded-2xl rounded-tl-none p-4" />
                        <div className="h-16 w-80 bg-white/10 rounded-2xl rounded-tl-none" />
                    </div>
                </div>
                {/* User message */}
                <div className="flex items-start gap-3 justify-end">
                    <div className="space-y-2 max-w-[60%]">
                        <div className="h-10 w-48 bg-white/10 rounded-2xl rounded-tr-none ml-auto" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                </div>
                {/* Another assistant */}
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-red/20 shrink-0" />
                    <div className="space-y-2">
                        <div className="h-24 w-72 bg-white/10 rounded-2xl rounded-tl-none" />
                    </div>
                </div>
            </div>

            {/* Input skeleton */}
            <div className="p-4 border-t border-white/5">
                <div className="flex gap-3 items-center">
                    <div className="flex-1 h-12 bg-white/5 rounded-2xl" />
                    <div className="w-12 h-12 bg-brand-red/20 rounded-2xl shrink-0" />
                </div>
            </div>
        </div>
    );
}
