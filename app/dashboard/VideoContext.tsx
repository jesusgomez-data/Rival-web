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
  // REGLA DE ORO DEL AUDIO:
  // La app SIEMPRE arranca en silencio. El sonido solo se activa si el
  // usuario toca el altavoz en ESTA sesión. No se persiste entre sesiones
  // (persistirlo hacía que la app abriera reproduciendo música sola).
  const [isMuted, setIsMuted] = useState(true);
  const [lastActiveVideoId, setLastActiveVideoId] = useState<string | null>(null);

  // Al salir de la app (cambiar de pestaña, bloquear el móvil, ir al home):
  // pausar TODO el audio y vídeo de la página. Nunca más música fantasma.
  useEffect(() => {
    const stopAllMedia = () => {
      document.querySelectorAll('audio, video').forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch {
          /* noop */
        }
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopAllMedia();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', stopAllMedia);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', stopAllMedia);
    };
  }, []);

  const handleSetMuted = (muted: boolean) => {
    setIsMuted(muted);
    // Al silenciar manualmente, corta también cualquier audio de música en curso
    if (muted && typeof document !== 'undefined') {
      document.querySelectorAll('audio').forEach((el) => {
        try {
          (el as HTMLAudioElement).pause();
        } catch {
          /* noop */
        }
      });
    }
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
