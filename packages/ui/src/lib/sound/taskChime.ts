/**
 * Plays a discrete, pleasant chime sound when a long background task completes.
 */
export function playTaskCompletionChime(options?: { volume?: number; frequency?: number }) {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const volume = options?.volume ?? 0.15;
    const baseFreq = options?.frequency ?? 587.33; // D5 note

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.15); // Ramp up to A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();

    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // AudioContext might be muted or blocked by browser gesture policies
  }
}
