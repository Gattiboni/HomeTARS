/*
 Simple WebAudio-based sound layer for Phase 1
 - No external assets; generated tones for click and beep
 - Auto-initializes on first user gesture (required by browsers)
*/

class AudioService {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastClickAt = 0;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        this.enabled = false;
        console.warn("Audio disabled: ", e);
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // subtle key click (short high-frequency blip)
  keyClick(volume = 0.02, freq = 440) {
    const now = Date.now();
    if (now - this.lastClickAt < 50) return; // throttle clicks
    this.lastClickAt = now;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq; // A4
    g.gain.value = volume;

    o.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    o.start(t);
    // very short envelope
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.stop(t + 0.06);
  }

  // terminal beep when a log line is printed
  beep(volume = 0.04, freq = 660, duration = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = volume;

    o.connect(g);
    g.connect(ctx.destination);

    const t = ctx.currentTime;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.stop(t + duration + 0.02);
  }
}

export const audioService = new AudioService();