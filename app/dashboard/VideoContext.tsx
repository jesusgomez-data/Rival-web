'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface VideoContextType {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  lastActiveVideoId: string | null;
  setLastActiveVideoId: (id: string | null) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);
  const [lastActiveVideoId, setLastActiveVideoId] = useState<string | null>(null);

  // Load from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem('video-muted');
    if (saved !== null) {
      setIsMuted(saved === 'true');
    }
  }, []);

  const handleSetMuted = (muted: boolean) => {
    setIsMuted(muted);
    // Use a custom event to notify all video elements to update immediately if needed
    // although the context update should handle it in React components
    localStorage.setItem('video-muted', muted.toString());
  };

  const toggleMute = () => {
    handleSetMuted(!isMuted);
  };

  return (
    <VideoContext.Provider value={{ 
      isMuted, 
      setIsMuted: handleSetMuted, 
      toggleMute,
      lastActiveVideoId,
      setLastActiveVideoId
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}
