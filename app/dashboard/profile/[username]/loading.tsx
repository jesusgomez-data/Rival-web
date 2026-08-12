export default function PublicProfileLoading() {
    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-12 animate-pulse px-0 md:px-4">
            {/* Cover + avatar */}
            <div className="rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10">
                <div className="h-48 md:h-64 bg-white/5" />
                <div className="p-6 md:p-8 lg:p-12 pt-0 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 -mt-16 md:-mt-24">
                    <div className="w-28 h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full bg-white/10 border-4 border-black shrink-0" />
                    <div className="flex-1 space-y-4 w-full pt-8 md:pt-0">
                        <div className="h-8 w-56 bg-white/10 rounded-full mx-auto md:mx-0" />
                        <div className="h-3 w-32 bg-white/5 rounded-full mx-auto md:mx-0" />
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-16 w-20 bg-white/5 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content grid */}
            <div className="grid lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-6">
                    <div className="h-4 w-40 bg-white/5 rounded-full" />
                    {[1, 2].map(i => (
                        <div key={i} className="h-64 bg-white/5 rounded-[32px]" />
                    ))}
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <div className="h-48 bg-white/5 rounded-[40px]" />
                    <div className="h-32 bg-white/5 rounded-[40px]" />
                </div>
            </div>
        </div>
    );
}
