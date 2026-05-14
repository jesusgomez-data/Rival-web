/**
 * VideoManager — singleton that enforces one-video-at-a-time playback.
 * Holds direct references to every <video> element in the feed.
 * When a video wants to play it calls pauseAllExcept() first — no React
 * state, no events, no stale closures. Pure DOM control.
 */
class VideoManagerSingleton {
    private registry = new Map<string, HTMLVideoElement>();

    register(id: string, el: HTMLVideoElement) {
        this.registry.set(id, el);
    }

    unregister(id: string) {
        this.registry.delete(id);
    }

    /** Immediately pause every registered video except the active one. */
    pauseAllExcept(activeId: string) {
        this.registry.forEach((video, id) => {
            if (id !== activeId && !video.paused) {
                video.pause();
            }
        });
    }

    pauseAll() {
        this.registry.forEach(video => {
            if (!video.paused) video.pause();
        });
    }
}

export const VideoManager = new VideoManagerSingleton();
