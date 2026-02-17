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

        // Resume context for mobile compatibility
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // --- RIVAL FIT SIGNATURE "VELOCITY" CHIME ---

        // 1. High Tension "Spark" (Short & Piercing)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2200, now);
        osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.04);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.5, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);

        // 2. High-Tech Harmonic Chime
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1318.51, now + 0.02); // E6
        osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.25); // E5

        gain2.gain.setValueAtTime(0, now + 0.02);
        gain2.gain.linearRampToValueAtTime(0.3, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        // 3. Sub-Pulse for Thickness
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(440, now + 0.02);
        gain3.gain.setValueAtTime(0, now + 0.02);
        gain3.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc3.connect(gain3);
        gain3.connect(audioCtx.destination);

        // Start all
        osc1.start(now);
        osc2.start(now + 0.02);
        osc3.start(now + 0.02);

        // Stop all
        osc1.stop(now + 0.1);
        osc2.stop(now + 0.35);
        osc3.stop(now + 0.4);

    } catch (error) {
        console.warn("Notification sound could not be played:", error);
    }
};

