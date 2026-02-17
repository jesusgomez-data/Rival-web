"use client";

/**
 * Plays a unique "Rival Fit" notification sound using Web Audio API. 
 * This avoids dependency on external assets and ensures a consistent, high-tech identity.
 * The sound is synthesized in real-time for immediate feedback.
 */
export const playNotificationSound = async () => {
    if (typeof window === 'undefined') return;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();

        // Browsers often suspend AudioContext until a user interaction occurs.
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // 1. Digital Attack (High frequency transient for "click" feel)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

        gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);

        // 2. Harmonic Body (The main "Rival" chime)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.05); // A5
        osc2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3); // A4

        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        // Start and stop
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.15);

        osc2.start(audioCtx.currentTime + 0.05);
        osc2.stop(audioCtx.currentTime + 0.45);

    } catch (error) {
        console.warn("Notification sound could not be played:", error);
    }
};

