/**
 * Audio Chime Service for Happiness Restaurant Admin Portal
 *
 * Provides a professional, lightweight, zero-dependency browser notification
 * chime for newly placed customer pickup orders.
 *
 * Features:
 * - Clean dual-tone restaurant counter service bell (D5 587.33 Hz -> A5 880 Hz)
 * - Safe native Web Audio API synthesis (no external assets or CDNs)
 * - Autoplay policy compliance with seamless one-time interaction unlock
 * - Persisted toggle preference via localStorage (happiness_admin_audio_chime)
 * - Non-blocking error handling that never crashes the dashboard
 */

const CHIME_STORAGE_KEY = 'happiness_admin_audio_chime';

let sharedAudioContext = null;
let unlockListenersAttached = false;

/**
 * Get or create the shared AudioContext instance safely.
 */
export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioContextClass();
    } catch (e) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn('[AudioChime] Unable to create AudioContext:', e?.message || e);
      }
      return null;
    }
  }
  return sharedAudioContext;
}

/**
 * Check if the browser audio context is running and unlocked.
 */
export function isAudioUnlocked() {
  const ctx = getAudioContext();
  return Boolean(ctx && ctx.state === 'running');
}

/**
 * Unlock the browser audio context following user gesture.
 */
export async function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      // Safe ignore
    }
  }
  return isAudioUnlocked();
}

/**
 * Initialize automatic audio unlock on the first user interaction.
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined' || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const handleInteraction = () => {
    unlockAudio().then((unlocked) => {
      if (unlocked) {
        window.removeEventListener('pointerdown', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('click', handleInteraction);
      }
    });
  };

  window.addEventListener('pointerdown', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleInteraction, { passive: true });
  window.addEventListener('click', handleInteraction, { passive: true });
}

/**
 * Check if the Audio Chime setting is enabled. Default is true (ON).
 */
export function isAudioChimeEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(CHIME_STORAGE_KEY);
    if (stored === null) return true; // Default ON
    return stored === 'true';
  } catch {
    return true;
  }
}

/**
 * Update and persist the Audio Chime toggle preference.
 */
export function setAudioChimeEnabled(enabled) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHIME_STORAGE_KEY, String(enabled));
    window.dispatchEvent(
      new CustomEvent('happiness:audio_chime_toggle', { detail: { enabled: Boolean(enabled) } })
    );
  } catch (e) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.warn('[AudioChime] Failed to save chime preference:', e?.message || e);
    }
  }
}

/**
 * Synthesize and play the dual-tone restaurant counter chime once.
 * Tone 1: D5 (587.33 Hz) soft bell
 * Tone 2: A5 (880.00 Hz) harmonic chime
 * Envelope: smooth attack with exponential decay, total duration ~0.65s.
 */
export function playChimeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.32, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.warn('[AudioChime] Chime synthesis notice:', err?.message || err);
    }
  }
}

/**
 * Plays the order chime if and only if Audio Chime is enabled.
 */
export function playOrderChime() {
  if (!isAudioChimeEnabled()) {
    return false;
  }
  playChimeSound();
  return true;
}

export default {
  getAudioContext,
  isAudioUnlocked,
  unlockAudio,
  initAudioUnlock,
  isAudioChimeEnabled,
  setAudioChimeEnabled,
  playChimeSound,
  playOrderChime,
};
