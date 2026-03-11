export default function DashboardLoading() {
    return (
        <div className="max-w-full mx-auto space-y-8 pb-12 px-0 sm:px-4 lg:px-8 animate-pulse">
            <div className="relative min-h-[200px] md:h-64 rounded-[32px] md:rounded-[40px] overflow-hidden bg-white/5 border border-white/5">
                <div className="relative z-10 px-6 sm:px-12 py-8 sm:py-12 space-y-3">
                    <div className="h-4 w-24 bg-white/10 rounded-full" />
                    <div className="h-10 w-64 bg-white/10 rounded-2xl" />
                    <div className="h-4 w-80 bg-white/5 rounded-full" />
                </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 h-24 bg-white/5 rounded-[1.5rem]" />
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
                    <div className="h-16 bg-white/5 rounded-[1.5rem]" />
                    <div className="h-16 bg-white/5 rounded-[1.5rem]" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 space-y-3">
                        <div className="h-3 w-16 bg-white/10 rounded-full" />
                        <div className="h-8 w-12 bg-white/10 rounded-xl" />
                        <div className="h-2 w-20 bg-white/5 rounded-full" />
                    </div>
                ))}
            </div>
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
                <div className="lg:col-span-7 space-y-6">
                    <div className="h-6 w-40 bg-white/10 rounded-full" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/[0.03] border border-white/5 rounded-[28px] p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-white/10 rounded-full w-32" />
                                    <div className="h-2 bg-white/5 rounded-full w-20" />
                                </div>
                            </div>
                            <div className="h-52 bg-white/5 rounded-2xl" />
                            <div className="flex gap-4">
                                <div className="h-3 bg-white/10 rounded-full w-12" />
                                <div className="h-3 bg-white/10 rounded-full w-12" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="lg:col-span-5 space-y-6">
                    <div className="h-48 bg-white/5 rounded-[1.5rem]" />
                    <div className="h-64 bg-white/5 rounded-[1.5rem]" />
                </div>
            </div>
        </div>
    );
}
