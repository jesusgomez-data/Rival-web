"use client";

/**
 * RIVALFIT - Página de Videos Estilo Instagram/TikTok
 * Feed vertical con scroll automático
 */

import { useEffect, useState } from "react";
import VideoFeed from "@/components/VideoFeed";
import { createClient } from "@/utils/supabase/client";

interface VideoPost {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  author: {
    id: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  likes: number;
  comments: number;
  shares: number;
  hasLiked: boolean;
  timestamp: string;
  music?: {
    title: string;
    artist: string;
  };
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    try {
      // Obtener posts con videos del feed
      const { data: posts, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          content,
          media_url,
          media_type,
          likes_count,
          comments_count,
          created_at,
          user:user_id (
            id,
            username,
            avatar_url,
            is_official
          )
        `
        )
        .eq("media_type", "video")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transformar a formato VideoPost
      const transformedVideos: VideoPost[] = (posts || []).map((post: any) => ({
        id: post.id,
        videoUrl: post.media_url,
        thumbnailUrl: undefined, // TODO: Generar thumbnails
        caption: post.content || "",
        author: {
          id: post.user?.id || "",
          username: post.user?.username || "Usuario",
          avatar:
            post.user?.avatar_url || `https://ui-avatars.com/api/?name=${post.user?.username || "U"}`,
          isVerified: post.user?.is_official || false,
        },
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        shares: 0, // TODO: Implementar shares
        hasLiked: false, // TODO: Verificar si el usuario dio like
        timestamp: getTimeAgo(post.created_at),
        music: undefined, // TODO: Extraer música si existe
      }));

      setVideos(transformedVideos);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  }

  function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Ahora";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}s`;
  }

  function handleLoadMore() {
    // TODO: Implementar paginación
    console.log("Load more videos...");
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Cargando videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <VideoFeed videos={videos} onLoadMore={handleLoadMore} />
    </div>
  );
}
