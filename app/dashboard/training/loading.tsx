export default function TrainingLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="space-y-2">
                <div className="h-8 w-48 bg-white/10 rounded-2xl" />
                <div className="h-4 w-72 bg-white/5 rounded-full" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                        <div className="h-3 w-16 bg-white/10 rounded-full" />
                        <div className="h-7 w-10 bg-white/10 rounded-xl" />
                    </div>
                ))}
            </div>

            {/* Workout list */}
            <div className="space-y-4">
                <div className="h-5 w-32 bg-white/10 rounded-full" />
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded-full w-40" />
                            <div className="h-3 bg-white/5 rounded-full w-24" />
                        </div>
                        <div className="w-16 h-6 bg-white/5 rounded-xl shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}
