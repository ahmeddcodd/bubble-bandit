import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, JUICE, PLAYER } from '../utils/constants';

export class BubblePlayer extends Phaser.GameObjects.Container {
  public isHolding = false;
  public targetX = GAME_WIDTH / 2;
  public bubbleScale = 1;
  public velocityY = 0;
  public shieldHits = 0;
  public invincibleUntil = 0;

  private bubble: Phaser.GameObjects.Image;
  private thief: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Arc;
  private shadow: Phaser.GameObjects.Ellipse;
  private pulse = 0;

  // Small pooled trail of bubble bits emitted while rising fast. Reused, never
  // re-allocated, to stay allocation-free in the hot loop.
  private trail: Phaser.GameObjects.Arc[] = [];
  private trailIndex = 0;
  private trailTimer = 0;

  // Transient squash applied on collect; decays each frame and is folded into
  // the per-frame setScale so it isn't overwritten by the wobble.
  private collectSquash = 0;

  // Thief mood — swaps the baked face texture and drives pose reactions.
  private mood: 'neutral' | 'greed' | 'scared' = 'neutral';
  private sweat: Phaser.GameObjects.Arc;
  // Decaying "happy collect" pop, blended into the thief's vertical bob.
  private collectHop = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.shadow = scene.add.ellipse(0, 56, 86, 24, 0x000000, 0.18);
    this.glow = scene.add.circle(0, 0, 58, 0x76eaff, 0.16);
    this.bubble = scene.add.image(0, 0, 'bubble');
    this.thief = scene.add.image(0, 6, 'thief').setScale(0.63);
    // Sweat drop near the thief's temple; only visible when scared.
    this.sweat = scene.add.circle(11, -2, 3, 0x9fe4ff, 0.95).setVisible(false);
    this.sweat.setStrokeStyle(1, 0xffffff, 0.6);

    this.add([this.shadow, this.glow, this.bubble, this.thief, this.sweat]);
    this.setDepth(100);

    // Pre-create a tiny trail pool (added to the scene, behind the bubble).
    for (let i = 0; i < 8; i += 1) {
      const bit = scene.add.circle(x, y, 7, 0x9beeff, 0).setDepth(96);
      this.trail.push(bit);
    }
  }

  updatePlayer(deltaMs: number, pointerWorldX: number | null): void {
    const dt = deltaMs / 1000;
    this.pulse += dt;

    if (this.isHolding) {
      this.bubbleScale = Phaser.Math.Clamp(
        this.bubbleScale + PLAYER.inflateSpeed * dt,
        PLAYER.minScale,
        PLAYER.maxScale
      );
      this.velocityY += PLAYER.upwardAccel * dt;
      if (pointerWorldX !== null) this.targetX = Phaser.Math.Clamp(pointerWorldX, PLAYER.wallPadding, GAME_WIDTH - PLAYER.wallPadding);
    } else {
      this.bubbleScale = Phaser.Math.Clamp(
        this.bubbleScale - PLAYER.shrinkSpeed * dt,
        PLAYER.minScale,
        PLAYER.maxScale
      );
      this.velocityY += PLAYER.gravity * dt;
    }

    this.velocityY = Phaser.Math.Clamp(this.velocityY, PLAYER.maxRise, PLAYER.maxFall);
    this.y += this.velocityY * dt;

    const floatMarginTop = 126;
    const floatMarginBottom = GAME_HEIGHT - 156;
    if (this.y < floatMarginTop) {
      this.y = floatMarginTop;
      this.velocityY = Math.max(this.velocityY, 90);
    }
    if (this.y > floatMarginBottom) {
      this.y = floatMarginBottom;
      this.velocityY = Math.min(this.velocityY, -180);
    }

    this.x += (this.targetX - this.x) * Math.min(1, PLAYER.horizontalEase * dt);
    this.x = Phaser.Math.Clamp(this.x, PLAYER.wallPadding, GAME_WIDTH - PLAYER.wallPadding);

    // Strain telegraph: the closer to max size, the more the bubble shudders —
    // a feel cue that "you're greedy / at risk". 0 below isLarge(), ramps to 1 at max.
    const strain = Phaser.Math.Clamp(
      (this.bubbleScale - 1.38) / (PLAYER.maxScale - 1.38),
      0,
      1
    );
    this.collectSquash = Math.max(0, this.collectSquash - dt * 2.4);
    const wobble = Math.sin(this.pulse * 9) * (0.024 + strain * 0.05);
    const squash = this.isHolding ? 1.04 : 0.98;
    this.bubble.setScale(
      this.bubbleScale * (squash + wobble + this.collectSquash),
      this.bubbleScale * (1 / squash - wobble - this.collectSquash * 0.7)
    );

    this.glow.setScale(this.bubbleScale * 1.12);
    // Glow colour by state priority: shield/invincible > strain warning > calm.
    if (this.isInvincible() || this.shieldHits > 0) {
      this.glow.setFillStyle(COLORS.green, this.isInvincible() ? 0.34 : 0.28);
    } else if (strain > 0.01) {
      const warn = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(0x76eaff),
        Phaser.Display.Color.IntegerToColor(JUICE.strainTint),
        100,
        Math.round(strain * 100)
      );
      this.glow.setFillStyle(
        Phaser.Display.Color.GetColor(warn.r, warn.g, warn.b),
        0.16 + strain * 0.16
      );
    } else {
      this.glow.setFillStyle(0x76eaff, 0.16);
    }

    this.shadow.setScale(Phaser.Math.Linear(0.66, 1.45, (this.bubbleScale - PLAYER.minScale) / (PLAYER.maxScale - PLAYER.minScale)), 1);
    this.shadow.setAlpha(Phaser.Math.Linear(0.1, 0.28, (this.bubbleScale - PLAYER.minScale) / (PLAYER.maxScale - PLAYER.minScale)));

    // Mood-driven pose. Collect "hop" decays and lifts the thief on each grab.
    this.collectHop = Math.max(0, this.collectHop - dt * 5.2);
    const hop = -this.collectHop * 6;
    if (this.mood === 'scared') {
      // Cower lower + fast nervous tremble.
      this.thief.setY(11 + Math.sin(this.pulse * 22) * 1.6 + hop);
      this.thief.setAngle(Math.sin(this.pulse * 26) * 2.4);
    } else if (this.mood === 'greed') {
      // Eager faster, springier bob.
      this.thief.setY(8 + Math.sin(this.pulse * 8) * 3 + hop);
      this.thief.setAngle(Math.sin(this.pulse * 3.4) * 4);
    } else {
      this.thief.setY(8 + Math.sin(this.pulse * 5) * 2 + hop);
      this.thief.setAngle(Math.sin(this.pulse * 2.4) * 3);
    }
    if (this.sweat.visible) {
      this.sweat.y = -2 + Math.sin(this.pulse * 9) * 1.5;
      this.sweat.setAlpha(0.6 + Math.sin(this.pulse * 14) * 0.35);
    }

    this.updateTrail(deltaMs);
  }

  /**
   * Set the thief's mood. Swaps the baked face texture only on change (cheap),
   * and toggles the sweat drop. Fear overrides greed (handled by the caller).
   */
  setMood(mood: 'neutral' | 'greed' | 'scared'): void {
    if (mood === this.mood) return;
    this.mood = mood;
    this.thief.setTexture(mood === 'greed' ? 'thief-greed' : mood === 'scared' ? 'thief-scared' : 'thief');
    this.sweat.setVisible(mood === 'scared');
  }

  /** Emit a faded bubble bit at intervals while rising fast. Pool-based, no allocs. */
  private updateTrail(deltaMs: number): void {
    this.trailTimer += deltaMs;
    const risingFast = this.velocityY < -150;
    if (!risingFast || this.trailTimer < 55) return;
    this.trailTimer = 0;

    const bit = this.trail[this.trailIndex];
    this.trailIndex = (this.trailIndex + 1) % this.trail.length;

    this.scene.tweens.killTweensOf(bit);
    bit.setPosition(this.x, this.y + 28);
    bit.setScale(this.bubbleScale * Phaser.Math.FloatBetween(0.5, 0.9));
    bit.setAlpha(0.4);
    this.scene.tweens.add({
      targets: bit,
      y: bit.y + 40,
      alpha: 0,
      scale: 0.1,
      duration: 420,
      ease: 'Cubic.easeOut'
    });
  }

  puff(): void {
    this.velocityY = Math.min(this.velocityY, -250);
    this.bubbleScale = Phaser.Math.Clamp(this.bubbleScale + 0.08, PLAYER.minScale, PLAYER.maxScale);
    // Route the squash through the decaying offset so the per-frame setScale
    // doesn't immediately overwrite it (same reason as onCollect).
    this.collectSquash = Math.min(0.26, this.collectSquash + 0.12);
  }

  /**
   * Quick "gulp" squash when collecting. `punch` (0..1) scales the squeeze so
   * rare high-value pickups (ruby/pearl) feel chunkier than common coins/gems.
   * Stored as a decaying offset (folded into the per-frame setScale) so the
   * wobble doesn't immediately overwrite it.
   */
  onCollect(punch: number): void {
    this.collectSquash = Math.min(0.26, this.collectSquash + 0.1 + punch * 0.14);
    // Happy little hop on every grab, bigger for high-value loot.
    this.collectHop = Math.min(1.4, this.collectHop + 0.7 + punch * 0.5);
  }

  getHitRadius(): number {
    return PLAYER.baseRadius * this.bubbleScale;
  }

  getCollectRadius(): number {
    return PLAYER.baseCollectRadius * this.bubbleScale;
  }

  isLarge(): boolean {
    return this.bubbleScale > 1.38;
  }

  isTiny(): boolean {
    return this.bubbleScale < 0.78;
  }

  grantShield(): void {
    this.shieldHits = 1;
    this.glow.setFillStyle(0x7dffdf, 0.32);
  }

  consumeShield(): boolean {
    if (this.shieldHits <= 0) return false;
    this.shieldHits -= 1;
    this.invincibleUntil = this.scene.time.now + 900;
    this.velocityY = -280;
    this.scene.tweens.add({ targets: this, alpha: 0.46, yoyo: true, repeat: 4, duration: 80 });
    return true;
  }

  isInvincible(): boolean {
    return this.scene.time.now < this.invincibleUntil;
  }

  popVisual(): void {
    this.bubble.setVisible(false);
    this.glow.setVisible(false);
    this.shadow.setVisible(false);
    this.sweat.setVisible(false);
    this.thief.setAngle(0);
    this.scene.tweens.add({ targets: this.thief, y: this.thief.y + 92, angle: 720, alpha: 0, duration: 740, ease: 'Back.in' });
  }
}
