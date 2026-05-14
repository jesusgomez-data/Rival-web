/**
 * MSN Messenger authentic sounds — recreated with Web Audio API.
 * Zero external files. Based on the original MSN/WLM sound signatures.
 */

function ctx(): AudioContext | null {
    try {
        const C = window.AudioContext || (window as any).webkitAudioContext
        return new C()
    } catch { return null }
}

// ── Core sound utilities ──────────────────────────────────────────────────────

function osc(c: AudioContext, freq: number, type: OscillatorType, start: number, dur: number, gainPeak = 0.15) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(gainPeak, start + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, start + dur)
    o.start(start); o.stop(start + dur + 0.02)
}

function noise(c: AudioContext, bandFreq: number, q: number, start: number, dur: number, gainPeak = 0.1) {
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf
    const filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = bandFreq; filt.Q.value = q
    const g = c.createGain()
    g.gain.setValueAtTime(gainPeak, start)
    g.gain.exponentialRampToValueAtTime(0.001, start + dur)
    src.connect(filt); filt.connect(g); g.connect(c.destination)
    src.start(start); src.stop(start + dur + 0.02)
}

function freqSlide(c: AudioContext, f0: number, f1: number, type: OscillatorType, start: number, dur: number, gainPeak = 0.12) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type
    o.frequency.setValueAtTime(f0, start)
    o.frequency.linearRampToValueAtTime(f1, start + dur)
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(gainPeak, start + 0.006)
    g.gain.exponentialRampToValueAtTime(0.001, start + dur)
    o.start(start); o.stop(start + dur + 0.02)
}

// ── Authentic MSN Messenger sounds ───────────────────────────────────────────

/**
 * MSN incoming message — the iconic "type" sound.
 * Two-note rising chime: G5 (784Hz) → C6 (1047Hz), sine wave, brief.
 * This was the most recognizable sound in MSN history.
 */
export function playReceiveSound() {
    try {
        const c = ctx(); if (!c) return
        const t = c.currentTime
        // First note: G5
        osc(c, 784, 'sine', t, 0.18, 0.14)
        // Second note: C6 — slightly delayed, slightly higher gain (the "ding")
        osc(c, 1047, 'sine', t + 0.11, 0.22, 0.18)
        // Subtle harmonic for richness
        osc(c, 1568, 'sine', t + 0.12, 0.18, 0.05)
    } catch {}
}

/**
 * MSN send sound — subtle "whoosh" click.
 * Very short upward frequency slide, very low gain.
 */
export function playSendSound() {
    try {
        const c = ctx(); if (!c) return
        const t = c.currentTime
        freqSlide(c, 400, 900, 'sine', t, 0.08, 0.07)
        // Tiny click transient
        noise(c, 2000, 5, t, 0.03, 0.04)
    } catch {}
}

/**
 * MSN contact comes online — two ascending notes "di-doon".
 * D5 (587Hz) → A5 (880Hz), clean bell.
 */
export function playContactOnlineSound() {
    try {
        const c = ctx(); if (!c) return
        const t = c.currentTime
        osc(c, 587, 'sine', t, 0.2, 0.12)
        osc(c, 880, 'sine', t + 0.18, 0.25, 0.15)
    } catch {}
}

/**
 * MSN contact goes offline — descending "dong".
 * A5 (880Hz) → E5 (659Hz), lower.
 */
export function playContactOfflineSound() {
    try {
        const c = ctx(); if (!c) return
        const t = c.currentTime
        osc(c, 880, 'sine', t, 0.15, 0.1)
        osc(c, 587, 'sine', t + 0.14, 0.3, 0.1)
    } catch {}
}

/**
 * MSN Nudge — the most aggressive sound.
 * Multi-frequency burst + low rumble + high whine.
 * The screen would shake and this sound would play.
 */
export function playNudgeSound() {
    try {
        const c = ctx(); if (!c) return
        const t = c.currentTime
        // Low rumble
        osc(c, 80, 'sawtooth', t, 0.12, 0.3)
        // Mid buzz
        noise(c, 400, 3, t, 0.15, 0.2)
        // High whine sweep
        freqSlide(c, 600, 2000, 'sawtooth', t, 0.1, 0.12)
        // Three rapid buzzes
        for (let i = 0; i < 3; i++) {
            noise(c, 800, 4, t + i * 0.06, 0.05, 0.15)
        }
        // Final impact
        osc(c, 120, 'sine', t + 0.12, 0.15, 0.2)
    } catch {}
}

/**
 * MSN typing sound — soft click per keypress (optional, very subtle).
 */
export function playTypingSound() {
    try {
        const c = ctx(); if (!c) return
        noise(c, 3000, 8, c.currentTime, 0.03, 0.03)
    } catch {}
}

// ── Per-emoji sounds ──────────────────────────────────────────────────────────

const EMOJI_SOUNDS: Record<string, () => void> = {
    // Love / heart — soft heartbeat
    '❤️': () => { const c = ctx(); if (!c) return; const t = c.currentTime; osc(c, 200, 'sine', t, 0.08, 0.25); osc(c, 180, 'sine', t + 0.12, 0.07, 0.22) },
    '💕': () => { const c = ctx(); if (!c) return; const t = c.currentTime; osc(c, 220, 'sine', t, 0.08, 0.22); osc(c, 200, 'sine', t + 0.12, 0.07, 0.2) },
    '😍': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [523, 659, 784].forEach((f, i) => osc(c, f, 'sine', t + i * 0.07, 0.15, 0.1)) },
    '🥰': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [523, 659, 784].forEach((f, i) => osc(c, f, 'sine', t + i * 0.07, 0.15, 0.1)) },
    '😘': () => { const c = ctx(); if (!c) return; noise(c, 800, 20, c.currentTime, 0.08, 0.1) },

    // Fire / energy — rising noise burst
    '🔥': () => { const c = ctx(); if (!c) return; const t = c.currentTime; noise(c, 300, 6, t, 0.2, 0.14); noise(c, 700, 4, t + 0.05, 0.16, 0.08) },
    '⚡': () => { const c = ctx(); if (!c) return; const t = c.currentTime; freqSlide(c, 300, 3000, 'sawtooth', t, 0.08, 0.15); noise(c, 1500, 3, t, 0.1, 0.1) },
    '💥': playNudgeSound,
    '💪': () => { const c = ctx(); if (!c) return; osc(c, 120, 'sine', c.currentTime, 0.14, 0.28); noise(c, 500, 6, c.currentTime, 0.06, 0.12) },

    // Sport / win — fanfare
    '🏆': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [523, 659, 784, 1047].forEach((f, i) => osc(c, f, 'triangle', t + i * 0.08, 0.2, 0.12)) },
    '🥇': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [659, 784, 1047].forEach((f, i) => osc(c, f, 'triangle', t + i * 0.09, 0.18, 0.11)) },
    '🎉': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [523, 784, 1047, 1319].forEach((f, i) => osc(c, f, 'triangle', t + i * 0.07, 0.15, 0.1)); noise(c, 900, 4, t, 0.15, 0.07) },
    '🥳': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [392, 523, 659, 784, 1047].forEach((f, i) => osc(c, f, 'triangle', t + i * 0.06, 0.12, 0.1)) },
    '✨': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [1047, 1319, 1568, 2093].forEach((f, i) => osc(c, f, 'sine', t + i * 0.05, 0.1, 0.08)) },
    '🌟': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [1047, 1319, 1568].forEach((f, i) => osc(c, f, 'sine', t + i * 0.06, 0.12, 0.09)) },
    '💯': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [784, 988, 1175].forEach((f, i) => osc(c, f, 'triangle', t + i * 0.07, 0.15, 0.1)) },
    '🎯': () => { const c = ctx(); if (!c) return; noise(c, 1200, 30, c.currentTime, 0.06, 0.14); osc(c, 140, 'sine', c.currentTime + 0.06, 0.1, 0.2) },

    // Laugh — rhythmic bursts
    '😂': () => { const c = ctx(); if (!c) return; const t = c.currentTime; for (let i = 0; i < 4; i++) noise(c, 600 + i * 80, 10, t + i * 0.09, 0.07, 0.09) },
    '🤣': () => { const c = ctx(); if (!c) return; const t = c.currentTime; for (let i = 0; i < 5; i++) noise(c, 550 + i * 60, 8, t + i * 0.08, 0.06, 0.08) },
    '😆': () => { const c = ctx(); if (!c) return; const t = c.currentTime; for (let i = 0; i < 3; i++) noise(c, 500 + i * 100, 10, t + i * 0.1, 0.07, 0.09) },

    // Sad — descending tones
    '😢': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [392, 330, 294].forEach((f, i) => osc(c, f, 'sine', t + i * 0.2, 0.25, 0.09)) },
    '😭': () => { const c = ctx(); if (!c) return; const t = c.currentTime; [392, 330, 294, 247].forEach((f, i) => osc(c, f, 'sine', t + i * 0.18, 0.25, 0.1)) },

    // Surprise — rising slide
    '😮': () => { const c = ctx(); if (!c) return; freqSlide(c, 300, 900, 'sine', c.currentTime, 0.18, 0.12) },
    '😱': () => { const c = ctx(); if (!c) return; freqSlide(c, 200, 1200, 'sine', c.currentTime, 0.2, 0.14) },

    // Cool — sawtooth drop
    '😎': () => { const c = ctx(); if (!c) return; freqSlide(c, 300, 80, 'sawtooth', c.currentTime, 0.22, 0.08) },

    // Clap — percussive noise
    '👏': () => { const c = ctx(); if (!c) return; const t = c.currentTime; noise(c, 500, 7, t, 0.06, 0.18); noise(c, 500, 7, t + 0.13, 0.06, 0.14) },
    '🙌': () => { const c = ctx(); if (!c) return; const t = c.currentTime; noise(c, 450, 8, t, 0.07, 0.16); noise(c, 450, 8, t + 0.12, 0.06, 0.12) },
    '👍': () => { const c = ctx(); if (!c) return; noise(c, 600, 12, c.currentTime, 0.08, 0.12) },
}

export function playEmojiSound(emoji: string) {
    try {
        const trimmed = emoji.trim()
        // Use specific sound or fall back to generic
        const fn = EMOJI_SOUNDS[trimmed]
        if (fn) { fn(); return }
        // Generic: soft ping
        const c = ctx(); if (!c) return
        osc(c, 880, 'sine', c.currentTime, 0.08, 0.08)
    } catch {}
}
