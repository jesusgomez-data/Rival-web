import { getCenterPosts } from "../../management-actions";
import FeedManager from "./FeedManager";
import { Send } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function FeedPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const posts = await getCenterPosts(id);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-start gap-4 mb-4 sm:mb-8 border-b border-white/5 pb-4 sm:pb-8">
                <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 text-brand-red">
                    <Send className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-heading font-black text-white italic uppercase">Social Feed</h1>
                    <p className="text-gray-400">Post updates, photos, and news to your community.</p>
                </div>
            </div>

            <FeedManager centerId={id} initialPosts={posts} currentUserId={user?.id} />
        </div>
    );
}
