export default function ProfileLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Profile header */}
            <div className="relative">
                <div className="h-40 bg-white/5 rounded-[2rem]" />
                <div className="px-6 -mt-12 flex items-end gap-4">
                    <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-black shrink-0" />
                    <div className="pb-2 space-y-2 flex-1">
                        <div className="h-5 w-40 bg-white/10 rounded-full" />
                        <div className="h-3 w-24 bg-white/5 rounded-full" />
                    </div>
                    <div className="pb-2 w-28 h-10 bg-white/5 rounded-xl shrink-0" />
                </div>
            </div>

            {/* Bio + stats */}
            <div className="px-6 space-y-4">
                <div className="h-3 w-full bg-white/5 rounded-full" />
                <div className="h-3 w-3/4 bg-white/5 rounded-full" />
                <div className="grid grid-cols-3 gap-4 pt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="text-center space-y-1">
                            <div className="h-6 w-12 bg-white/10 rounded-xl mx-auto" />
                            <div className="h-3 w-16 bg-white/5 rounded-full mx-auto" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Posts grid */}
            <div className="grid grid-cols-3 gap-1 px-1">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="aspect-square bg-white/5 rounded-sm" />
                ))}
            </div>
        </div>
    );
}
