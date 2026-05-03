"use client";
import { useEffect, useState } from "react";
import { getCenterActivity } from "../analytics-actions";
import { UserPlus, ShoppingBag, Calendar, AlertCircle, Clock } from "lucide-react";

export default function ActivityFeed({ centerId }: { centerId: string }) {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, [centerId]);

    const load = async () => {
        try {
            const data = await getCenterActivity(centerId);
            setActivities(data);
        } catch (error) {
            console.error("[ActivityFeed] Failed to load activities:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading feed...</div>;

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {activities.length === 0 && <div className="p-6 sm:p-8 text-center text-muted-foreground text-xs italic">No activity yet.</div>}
            {activities.map((item, i) => (
                <div key={i} className="p-4 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-right-4 duration-500 gap-4 flex items-start">
                    <ActivityItem item={item} />
                </div>
            ))}
        </div>
    )
}

function ActivityItem({ item }: any) {
    // Format date: "2 hours ago" or Time if today
    const date = new Date(item.date);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000 / 60; // minutes

    let timeLabel = date.toLocaleDateString();
    if (diff < 60) timeLabel = `${Math.floor(diff)}m ago`;
    else if (diff < 1440 && date.getDate() === now.getDate()) timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    else if (diff < 2880) timeLabel = 'Yesterday';

    if (item.type === 'member') {
        return (
            <>
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-500 mt-1"><UserPlus className="w-4 h-4" /></div>
                <div>
                    <p className="font-bold text-foreground text-sm">{item.data.full_name} <span className="font-normal text-muted-foreground">joined</span></p>
                    <p className="text-xs text-brand-red font-bold uppercase tracking-wider">{item.data.plan || 'Member'}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLabel}</p>
                </div>
            </>
        )
    }

    if (item.type === 'sale') {
        return (
            <>
                <div className="p-2 bg-green-500/10 rounded-full text-green-500 mt-1"><ShoppingBag className="w-4 h-4" /></div>
                <div>
                    <p className="font-bold text-foreground text-sm">{item.data.member?.full_name} <span className="font-normal text-muted-foreground">purchased</span></p>
                    <p className="text-xs text-foreground">
                        {item.data.product?.name || 'Item'}
                        <span className="text-green-500 ml-2">€{item.data.total_amount}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLabel}</p>
                </div>
            </>
        )
    }

    if (item.type === 'class') {
        return (
            <>
                <div className="p-2 bg-brand-red/10 rounded-full text-brand-red mt-1"><Calendar className="w-4 h-4" /></div>
                <div>
                    <p className="font-bold text-foreground text-sm">New Class Created</p>
                    <p className="text-xs text-muted-foreground">{item.data.name} · {new Date(item.data.scheduled_time).toLocaleDateString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLabel}</p>
                </div>
            </>
        )
    }

    if (item.type === 'trial') {
        return (
            <>
                <div className="p-2 bg-yellow-500/10 rounded-full text-yellow-500 mt-1"><AlertCircle className="w-4 h-4" /></div>
                <div>
                    <p className="font-bold text-foreground text-sm">Trial Requested</p>
                    <p className="text-xs text-yellow-500 font-bold uppercase">{item.data.status}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeLabel}</p>
                </div>
            </>
        )
    }

    return null;
}
