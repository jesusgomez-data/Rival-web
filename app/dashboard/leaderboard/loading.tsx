export default function LeaderboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 w-48 bg-white/10 rounded-2xl" />
                <div className="h-4 w-64 bg-white/5 rounded-full" />
            </div>

            {/* Top 3 podium */}
            <div className="grid grid-cols-3 gap-4 items-end">
                <div className="bg-white/5 rounded-2xl p-4 space-y-3 h-36">
                    <div className="w-12 h-12 rounded-full bg-white/10 mx-auto" />
                    <div className="h-3 w-16 bg-white/10 rounded-full mx-auto" />
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-3 h-44">
                    <div className="w-14 h-14 rounded-full bg-white/10 mx-auto" />
                    <div className="h-3 w-20 bg-white/10 rounded-full mx-auto" />
                    <div className="h-4 w-12 bg-white/5 rounded-full mx-auto" />
                </div>
                <div className="bg-white/5 rounded-2xl p-4 space-y-3 h-32">
                    <div className="w-12 h-12 rounded-full bg-white/10 mx-auto" />
                    <div className="h-3 w-16 bg-white/10 rounded-full mx-auto" />
                </div>
            </div>

            {/* Rankings list */}
            <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                        <div className="w-6 h-6 bg-white/10 rounded-full shrink-0" />
                        <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded-full w-32" />
                            <div className="h-2 bg-white/5 rounded-full w-20" />
                        </div>
                        <div className="h-5 w-16 bg-white/5 rounded-xl shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}
