export default function MessagesLoading() {
    return (
        <div className="flex h-[calc(100vh-80px)] animate-pulse">
            {/* Conversations sidebar */}
            <div className="w-80 border-r border-white/5 flex flex-col">
                <div className="p-4 space-y-3">
                    <div className="h-10 bg-white/5 rounded-xl" />
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-white/10 rounded-full w-28" />
                                <div className="h-2 bg-white/5 rounded-full w-40" />
                            </div>
                            <div className="h-2 w-8 bg-white/5 rounded-full shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
            {/* Chat area */}
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="h-4 w-32 bg-white/10 rounded-full" />
                </div>
                <div className="flex-1 p-4 space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
                            {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />}
                            <div className={`h-10 rounded-2xl bg-white/10 ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/5">
                    <div className="h-12 bg-white/5 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}
