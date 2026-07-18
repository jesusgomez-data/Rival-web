"use client";

/**
 * RIVALFIT - Video Feed Estilo Instagram/TikTok
 * Videos fullscreen con scroll vertical automático
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Share2, MoreVertical, Volume2, VolumeX, Play, Pause } from "lucide-react";
import LikeFist from "@/components/LikeFist";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

interface VideoFeedProps {
  videos: VideoPost[];
  onLoadMore?: () => void;
}

function VideoCard({ video, isActive, isNear }: { video: VideoPost; isActive: boolean; isNear: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Auto-play cuando el video está activo
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Progress bar
  useEffect(() => {
    if (!videoRef.current) return;

    const updateProgress = () => {
      if (videoRef.current) {
        const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(percent);
      }
    };

    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      className="relative w-full h-screen snap-start snap-always flex-shrink-0 bg-black overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={isNear ? video.videoUrl : undefined}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={isMuted}
        preload={isNear ? "auto" : "none"}
        poster={video.thumbnailUrl}
        onClick={togglePlay}
      />

      {/* OVERLAY GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* PROGRESS BAR */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20">
        <motion.div
          className="h-full bg-brand-red"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* PLAY/PAUSE OVERLAY (centrado) */}
      <AnimatePresence>
        {showControls && !isPlaying && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-black/50 backdrop-blur-sm p-6 rounded-full">
              <Play className="w-16 h-16 text-white" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDE - USER INFO & CAPTION */}
      <div className="absolute bottom-0 left-0 right-20 p-6 z-10 pointer-events-none">
        {/* User Info */}
        <Link
          href={`/dashboard/profile/${video.author.username}`}
          className="flex items-center gap-3 mb-4 pointer-events-auto"
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20">
            <Image
              src={video.author.avatar}
              alt={video.author.username}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm drop-shadow-lg">
                @{video.author.username}
              </span>
              {video.author.isVerified && (
                <svg className="w-4 h-4 text-brand-red" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
              )}
            </div>
            <p className="text-white/70 text-xs drop-shadow-lg">{video.timestamp}</p>
          </div>
        </Link>

        {/* Caption */}
        <p className="text-white text-sm leading-relaxed drop-shadow-lg pointer-events-auto line-clamp-3">
          {video.caption}
        </p>

        {/* Music */}
        {video.music && (
          <div className="mt-3 flex items-center gap-2 text-white text-xs pointer-events-auto">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            <span className="truncate">
              {video.music.title} • {video.music.artist}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT SIDE - ACTIONS */}
      <div className="absolute bottom-0 right-0 top-1/3 flex flex-col items-center justify-end gap-6 p-4 z-10">
        {/* Like Button */}
        <button className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 0.8 }}
            className={`p-3 rounded-full backdrop-blur-md ${
              video.hasLiked
                ? "bg-brand-red/20 text-brand-red"
                : "bg-black/20 text-white hover:bg-black/40"
            }`}
          >
            <LikeFist active={video.hasLiked} size={28} />
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {video.likes > 999 ? `${(video.likes / 1000).toFixed(1)}k` : video.likes}
          </span>
        </button>

        {/* Comment Button */}
        <button className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 0.8 }}
            className="p-3 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {video.comments > 999 ? `${(video.comments / 1000).toFixed(1)}k` : video.comments}
          </span>
        </button>

        {/* Share Button */}
        <button className="flex flex-col items-center gap-1 group">
          <motion.div
            whileTap={{ scale: 0.8 }}
            className="p-3 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40"
          >
            <Share2 className="w-7 h-7 text-white" />
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {video.shares > 999 ? `${(video.shares / 1000).toFixed(1)}k` : video.shares}
          </span>
        </button>

        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1 mt-2"
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            className="p-3 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40"
          >
            {isMuted ? (
              <VolumeX className="w-7 h-7 text-white" />
            ) : (
              <Volume2 className="w-7 h-7 text-white" />
            )}
          </motion.div>
        </button>

        {/* More Options */}
        <button className="flex flex-col items-center gap-1 mt-2">
          <motion.div
            whileTap={{ scale: 0.8 }}
            className="p-3 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40"
          >
            <MoreVertical className="w-7 h-7 text-white" />
          </motion.div>
        </button>
      </div>
    </div>
  );
}

export default function VideoFeed({ videos, onLoadMore }: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Scroll snapping + detección de video activo
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / windowHeight);

      if (newIndex !== activeIndex && newIndex < videos.length) {
        setActiveIndex(newIndex);
      }

      // Load more cuando llega al final
      const scrollPercentage = (scrollTop + windowHeight) / container.scrollHeight;
      if (scrollPercentage > 0.9 && onLoadMore) {
        onLoadMore();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, videos.length, onLoadMore]);

  // Keyboard navigation (arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && activeIndex < videos.length - 1) {
        containerRef.current?.scrollTo({
          top: (activeIndex + 1) * window.innerHeight,
          behavior: "smooth",
        });
      } else if (e.key === "ArrowUp" && activeIndex > 0) {
        containerRef.current?.scrollTo({
          top: (activeIndex - 1) * window.innerHeight,
          behavior: "smooth",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, videos.length]);

  if (videos.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <p className="text-white/50 text-lg">No hay videos disponibles</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollBehavior: "smooth" }}
    >
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          isActive={index === activeIndex}
          isNear={Math.abs(index - activeIndex) <= 1}
        />
      ))}
    </div>
  );
}
