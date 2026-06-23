import { CollectibleType } from '../objects/Collectible';
import * as Playables from './Playables';

const MASTER_LEVEL = 0.9;

/**
 * Lightweight WebAudio sound layer. No asset files — everything is synthesised,
 * so it adds nothing to the Playables bundle. A single AudioContext is shared
 * for the whole session (created lazily on the first user gesture, per mobile /
 * Playables autoplay policy).
 */
export class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private muted = false;
  private audioWired = false;

  // Ambient "air" wash — looping filtered noise (NOT tonal oscillators, which
  // hum/rattle on small speakers). Created once, stopped on cleanup.
  private ambientSrc?: AudioBufferSourceNode;
  private ambientGain?: GainNode;
  private ambientStarted = false;

  // Looping background-music engine (synthesised, no asset files). A lookahead
  // scheduler queues notes a little ahead of the audio clock so the loop stays
  // tight regardless of JS timer jitter.
  private musicGain?: GainNode;
  private musicFilter?: BiquadFilterNode;
  private musicStarted = false;
  private musicTimer?: number;
  private nextNoteTime = 0;
  private step = 0;
  private readonly bpm = 96;

  /** Call from any user-gesture handler. Safe to call repeatedly. */
  ensure(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      // Honour YouTube's mute setting from the very first sound.
      this.muted = !Playables.isAudioEnabled();
      this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
      // A gentle limiter on the master bus catches summed peaks (pad + music +
      // SFX) before they clip into harsh buzzing.
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 24;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    // Subscribe once to YouTube mute changes — YouTube mute always wins.
    if (!this.audioWired) {
      this.audioWired = true;
      Playables.onAudioEnabledChange((enabled) => this.setMuted(!enabled));
    }
    if (this.muted) return; // don't resume output while YouTube has us muted
    void this.ctx.resume();
  }

  /** Mute/unmute in lockstep with YouTube. Ramped to avoid clicks. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_LEVEL, now + 0.05);
  }

  /** Suspend all audio output (YouTube pause). */
  suspend(): void {
    void this.ctx?.suspend();
  }

  /** Resume audio output after a YouTube pause, unless muted. */
  resume(): void {
    if (this.muted) return;
    void this.ctx?.resume();
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

  /**
   * Soft ambient "air" — a loop of heavily-lowpassed pink-ish noise. Noise has
   * no pitch, so unlike a sustained sine pad it can never hum or rattle on a
   * phone speaker; it just reads as a faint room tone behind the music.
   */
  startAmbient(): void {
    if (this.ambientStarted || !this.ready) return;
    const ctx = this.ctx!;
    this.ambientStarted = true;

    // 2s of smoothed (low-frequency) noise, looped.
    const frames = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i += 1) {
      const white = Math.random() * 2 - 1;
      // One-pole lowpass on the noise itself → smooth, wind-like, no hiss.
      last = last * 0.985 + white * 0.015;
      data[i] = last;
    }

    this.ambientSrc = ctx.createBufferSource();
    this.ambientSrc.buffer = buffer;
    this.ambientSrc.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    lp.Q.value = 0.1;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.0001;
    this.ambientGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.5);

    this.ambientSrc.connect(lp);
    lp.connect(this.ambientGain);
    this.ambientGain.connect(this.master!);
    this.ambientSrc.start();
  }

  stopAmbient(): void {
    if (!this.ambientStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.ambientGain) {
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(Math.max(this.ambientGain.gain.value, 0.0001), now);
      this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    }
    this.ambientSrc?.stop(now + 0.6);
    this.ambientSrc = undefined;
    this.ambientGain = undefined;
    this.ambientStarted = false;
  }

  // --- Background music -----------------------------------------------------
  // A looping, lightly-swung groove: a walking bass + a bouncy plucked arpeggio
  // in A minor pentatonic — playful and a little sneaky, matching the bubble
  // thief vibe. It sits quietly under the SFX so collects/pops still cut through.

  // Note frequencies (Hz). Bass line and the bubbly arpeggio, one entry per
  // 16th step; null = rest. Tuned to A minor pentatonic (A C D E G). Bass sits
  // around A2 so it reproduces cleanly on phone speakers (sub-bass below ~80Hz
  // distorts into buzz on small drivers).
  private static readonly BASS: (number | null)[] = [
    110.0, null, 110.0, null, 164.81, null, 146.83, null,
    130.81, null, 130.81, null, 98.0, null, 110.0, null
  ];
  private static readonly LEAD: (number | null)[] = [
    440.0, 523.25, 659.25, 523.25, 587.33, 659.25, 783.99, 659.25,
    523.25, 659.25, 587.33, 523.25, 440.0, 523.25, 392.0, 329.63
  ];

  startMusic(): void {
    if (this.musicStarted || !this.ready) return;
    const ctx = this.ctx!;
    this.musicStarted = true;

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.0001;
    // Gentle fade-in so it eases under the action rather than snapping on.
    this.musicGain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 1.6);
    // Lowpass rounds off the buzzy high harmonics so the loop reads as warm.
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 1800;
    this.musicFilter.Q.value = 0.4;
    this.musicGain.connect(this.musicFilter);
    this.musicFilter.connect(this.master!);

    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.08;
    // Lookahead scheduler: every 25ms, queue any notes due within the next 120ms.
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 25);
  }

  stopMusic(): void {
    if (!this.musicStarted) return;
    if (this.musicTimer !== undefined) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = undefined;
    }
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(Math.max(this.musicGain.gain.value, 0.0001), now);
      this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      this.musicGain.disconnect();
    }
    this.musicFilter?.disconnect();
    this.musicFilter = undefined;
    this.musicGain = undefined;
    this.musicStarted = false;
  }

  private scheduleMusic(): void {
    if (!this.ready || !this.musicGain) return;
    const ctx = this.ctx!;
    const secondsPerStep = 60 / this.bpm / 4; // 16th notes

    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      const i = this.step % 16;
      // Light swing: nudge the off-beat 16ths slightly later for groove.
      const swing = i % 2 === 1 ? secondsPerStep * 0.12 : 0;
      const t = this.nextNoteTime + swing;

      const bass = AudioManager.BASS[i];
      // Sine (not triangle) + duration under the 2-step gap so consecutive bass
      // notes don't overlap and phase-beat into a buzz.
      if (bass !== null) this.musicNote(bass, secondsPerStep * 1.7, 'sine', 0.42, t);

      const lead = AudioManager.LEAD[i];
      // Drop a few lead notes so it breathes instead of machine-gunning.
      if (lead !== null && i % 4 !== 3) this.musicNote(lead, secondsPerStep * 1.3, 'sine', 0.18, t);

      this.nextNoteTime += secondsPerStep;
      this.step += 1;
    }
  }

  /**
   * A single music note routed through the (quiet) music bus. Uses a smooth
   * linear attack and a `setTargetAtTime` exponential release so the note fades
   * fully to silence before the oscillator stops — no hard cut, no phase-0
   * restart click, no sustained buzz. A per-note lowpass softens the timbre.
   */
  private musicNote(freq: number, duration: number, type: OscillatorType, gain: number, when: number): void {
    if (!this.ready || !this.musicGain) return;
    const ctx = this.ctx!;
    // Never schedule in the past (late timer ticks would bunch notes → buzz).
    const start = Math.max(when, ctx.currentTime + 0.005);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(freq * 4 + 600, 3500);
    lp.Q.value = 0.2;

    osc.type = type;
    osc.frequency.value = freq;

    const attack = 0.02;
    const releaseTau = duration * 0.35; // time-constant for the exponential tail
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    // Begin an exponential decay toward 0 after a short sustain.
    g.gain.setTargetAtTime(0, start + duration * 0.5, releaseTau);

    osc.connect(g);
    g.connect(lp);
    lp.connect(this.musicGain);
    osc.start(start);
    // Stop well after the release tail has decayed to inaudible.
    osc.stop(start + duration + releaseTau * 4 + 0.05);
  }
}

/**
 * Shared instance — one AudioContext for the whole session regardless of how
 * many times scenes restart. Scenes call `ensure()` from a gesture handler.
 */
export const audio = new AudioManager();
