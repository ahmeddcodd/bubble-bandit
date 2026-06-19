import { CollectibleType } from '../objects/Collectible';

/**
 * Lightweight WebAudio sound layer. No asset files — everything is synthesised,
 * so it adds nothing to the Playables bundle. A single AudioContext is shared
 * for the whole session (created lazily on the first user gesture, per mobile /
 * Playables autoplay policy).
 */
export class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;

  // Persistent ambient pad nodes (created once, stopped on cleanup).
  private ambientOscA?: OscillatorNode;
  private ambientOscB?: OscillatorNode;
  private ambientGain?: GainNode;
  private ambientStarted = false;

  /** Call from any user-gesture handler. Safe to call repeatedly. */
  ensure(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  private get ready(): boolean {
    return !!this.ctx && !!this.master && this.ctx.state === 'running';
  }

  /** Low-level enveloped tone. attack/release ramps avoid clicks. */
  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    when = 0
  ): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Short filtered noise burst — used to give the pop a real "splat". */
  private noiseBurst(duration: number, gain: number, cutoff: number): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + duration + 0.02);
  }

  collect(type: CollectibleType, combo: number): void {
    // Pitch climbs as the chain grows so a long combo audibly escalates.
    const climb = Math.min(combo, 14) * 14;
    switch (type) {
      case 'coin':
        this.tone(560 + climb, 0.04, 'triangle', 0.05);
        this.tone(840 + climb, 0.03, 'sine', 0.025, 0.01);
        break;
      case 'ruby':
        // Rich two-note chord for the rare, high-value pickup.
        this.tone(680 + climb, 0.09, 'triangle', 0.06);
        this.tone(1020 + climb, 0.08, 'sine', 0.04, 0.015);
        break;
      case 'pearl':
        this.tone(900 + climb, 0.07, 'sine', 0.045);
        this.tone(1350 + climb, 0.06, 'sine', 0.03, 0.02);
        break;
      default: // gem
        this.tone(640 + climb, 0.045, 'triangle', 0.05);
        break;
    }
  }

  shieldPickup(): void {
    this.tone(520, 0.08, 'triangle', 0.05);
    this.tone(780, 0.1, 'sine', 0.035, 0.04);
  }

  shieldSave(): void {
    this.tone(300, 0.09, 'square', 0.04);
    this.tone(660, 0.12, 'triangle', 0.045, 0.03);
    this.tone(990, 0.1, 'sine', 0.03, 0.07);
  }

  pop(): void {
    this.noiseBurst(0.14, 0.18, 1400);
    this.tone(180, 0.16, 'sawtooth', 0.06);
    this.tone(90, 0.22, 'sine', 0.05, 0.02);
  }

  puff(): void {
    this.tone(520, 0.03, 'sine', 0.03);
  }

  nearMiss(): void {
    // Quick downward whoosh.
    this.tone(420, 0.12, 'sine', 0.02);
    this.tone(260, 0.16, 'sine', 0.018, 0.04);
  }

  uiClick(): void {
    this.tone(440, 0.04, 'triangle', 0.04);
    this.tone(660, 0.05, 'sine', 0.025, 0.015);
  }

  /** Quiet, slowly-detuning pad that gives the tower a sense of place. */
  startAmbient(): void {
    if (this.ambientStarted || !this.ready) return;
    const ctx = this.ctx!;
    this.ambientStarted = true;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.0001;
    this.ambientGain.gain.exponentialRampToValueAtTime(0.012, ctx.currentTime + 2.5);
    this.ambientGain.connect(this.master!);

    this.ambientOscA = ctx.createOscillator();
    this.ambientOscA.type = 'sine';
    this.ambientOscA.frequency.value = 110;

    this.ambientOscB = ctx.createOscillator();
    this.ambientOscB.type = 'sine';
    this.ambientOscB.frequency.value = 110.7; // slight detune → slow beating

    this.ambientOscA.connect(this.ambientGain);
    this.ambientOscB.connect(this.ambientGain);
    this.ambientOscA.start();
    this.ambientOscB.start();
  }

  stopAmbient(): void {
    if (!this.ambientStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.ambientGain) {
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(Math.max(this.ambientGain.gain.value, 0.0001), now);
      this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    }
    this.ambientOscA?.stop(now + 0.6);
    this.ambientOscB?.stop(now + 0.6);
    this.ambientOscA = undefined;
    this.ambientOscB = undefined;
    this.ambientGain = undefined;
    this.ambientStarted = false;
  }
}

/**
 * Shared instance — one AudioContext for the whole session regardless of how
 * many times scenes restart. Scenes call `ensure()` from a gesture handler.
 */
export const audio = new AudioManager();
