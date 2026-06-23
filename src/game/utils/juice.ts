import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, JUICE } from './constants';

type ShakePreset = keyof typeof JUICE.shake;

/**
 * Interpolate between two packed RGB ints by t (0..1). Wraps Phaser's color
 * interpolation — the same approach used for the bubble strain telegraph.
 */
export function lerpColor(a: number, b: number, t: number): number {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.IntegerToColor(a),
    Phaser.Display.Color.IntegerToColor(b),
    100,
    Math.round(Phaser.Math.Clamp(t, 0, 1) * 100)
  );
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/**
 * Tiny camera shake using named presets so magnitudes are tuned in one place
 * (replaces scattered magic numbers in GameScene).
 */
export function shake(scene: Phaser.Scene, preset: ShakePreset): void {
  const cfg = JUICE.shake[preset];
  scene.cameras.main.shake(cfg.duration, cfg.intensity);
}

/**
 * Hit-stop is implemented in GameScene itself (it integrates movement manually
 * off `delta`, so freezing means skipping that integration for a few frames —
 * see `GameScene.hitStopUntil`). Kept out of here to avoid fighting Phaser's
 * tween/time clocks. The visual helpers below are pure and scene-agnostic.
 */

/**
 * Full-screen colour flash that fades and auto-destroys. Used for pop (red) and
 * shield save (cyan). Lives above gameplay but below nothing critical.
 */
export function flash(
  scene: Phaser.Scene,
  color: number,
  alpha: number,
  duration: number
): void {
  const rect = scene.add
    .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha)
    .setOrigin(0)
    .setDepth(250);
  scene.tweens.add({
    targets: rect,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onComplete: () => rect.destroy()
  });
}

/**
 * A single expanding, fading ring at a point. Cheaper and punchier than a
 * particle burst for marking a satisfying collect / save.
 */
export function ringPulse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  depth = 124
): void {
  const ring = scene.add.circle(x, y, radius, color, 0);
  ring.setStrokeStyle(3, color, 0.85);
  ring.setDepth(depth);
  scene.tweens.add({
    targets: ring,
    scale: JUICE.ring.growth,
    alpha: 0,
    duration: JUICE.ring.duration,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy()
  });
}
