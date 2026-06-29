import Phaser from 'phaser';
import { DIFFICULTY, GAME_WIDTH } from '../utils/constants';
import { Collectible, CollectibleType } from '../objects/Collectible';
import { LaserGate, SpikeOrb } from '../objects/Hazards';

export interface SpawnedObjects {
  collectibles: Collectible[];
  spikeOrbs: SpikeOrb[];
  lasers: LaserGate[];
}

export class TowerManager {
  public scrollSpeed: number = DIFFICULTY.startScroll;
  public elapsedSeconds = 0;
  // Temporary scroll multiplier set externally (e.g. the slow-mo power-up). 1 = normal.
  public speedMult = 1;
  // Seconds of "gentle start" remaining (ninja perk): eases scroll speed up.
  private slowStartSeconds = 0;

  private collectibleTimer = 0;
  private hazardTimer = 0;
  private sceneryTimer = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Ninja perk: ramp the tower up more gently for the first `seconds`. */
  enableSlowStart(seconds: number): void {
    this.slowStartSeconds = seconds;
  }

  update(deltaMs: number, out: SpawnedObjects): void {
    this.elapsedSeconds += deltaMs / 1000;
    let speed = Math.min(
      DIFFICULTY.maxScroll,
      DIFFICULTY.startScroll + this.elapsedSeconds * DIFFICULTY.scrollGainPerSecond
    );
    // Slow-start perk: dampen early scroll, easing from ~0.7x back to 1x.
    if (this.slowStartSeconds > 0 && this.elapsedSeconds < this.slowStartSeconds) {
      const t = this.elapsedSeconds / this.slowStartSeconds; // 0→1
      speed *= 0.7 + 0.3 * t;
    }
    this.scrollSpeed = speed * this.speedMult;

    this.collectibleTimer += deltaMs;
    this.hazardTimer += deltaMs;
    this.sceneryTimer += deltaMs;

    const collectibleMs = Math.max(285, DIFFICULTY.collectibleSpawnMs - this.elapsedSeconds * 2.2);
    if (this.collectibleTimer > collectibleMs) {
      this.collectibleTimer = 0;
      this.spawnCollectiblePattern(out.collectibles);
    }

    const hazardMs = Math.max(640, DIFFICULTY.hazardSpawnMs - this.elapsedSeconds * 5.5);
    if (this.elapsedSeconds > 3 && this.hazardTimer > hazardMs) {
      this.hazardTimer = 0;
      this.spawnHazardPattern(out);
    }
  }

  reset(): void {
    this.scrollSpeed = DIFFICULTY.startScroll;
    this.elapsedSeconds = 0;
    this.speedMult = 1;
    this.slowStartSeconds = 0;
    this.collectibleTimer = 0;
    this.hazardTimer = 0;
    this.sceneryTimer = 0;
  }

  private spawnCollectiblePattern(target: Collectible[]): void {
    const startY = -70;
    const centerX = Phaser.Math.Between(112, GAME_WIDTH - 112);
    const rubyUnlocked = this.elapsedSeconds > DIFFICULTY.rubyFirstSecond;

    // Rare timed power-up — one at a time, only after the opening ~10s, low odds
    // so it stays a treat. Flanked by a couple of coins like the shield pattern.
    if (this.elapsedSeconds > 10 && Math.random() < 0.05) {
      const kinds: CollectibleType[] = ['magnet', 'slowmo', 'scorex2'];
      const type = kinds[Phaser.Math.Between(0, kinds.length - 1)];
      target.push(new Collectible(this.scene, { type, x: centerX, y: startY }));
      target.push(new Collectible(this.scene, { type: 'coin', x: centerX - 46, y: startY - 52 }));
      target.push(new Collectible(this.scene, { type: 'coin', x: centerX + 46, y: startY - 52 }));
      return;
    }

    const pattern = Phaser.Math.Between(0, 5);

    if (pattern === 0) {
      for (let i = 0; i < 7; i += 1) {
        const x = centerX + Math.sin(i * 0.78) * 54;
        const y = startY - i * 42;
        target.push(new Collectible(this.scene, { type: i % 4 === 0 ? 'coin' : 'gem', x, y }));
      }
      return;
    }

    if (pattern === 1) {
      const left = Phaser.Math.Between(88, 180);
      for (let i = 0; i < 6; i += 1) {
        target.push(new Collectible(this.scene, { type: i % 2 === 0 ? 'gem' : 'coin', x: left + i * 52, y: startY - Math.abs(2.5 - i) * 28 }));
      }
      return;
    }

    if (pattern === 2) {
      for (let i = 0; i < 5; i += 1) {
        target.push(new Collectible(this.scene, { type: i === 2 && rubyUnlocked ? 'ruby' : 'gem', x: centerX, y: startY - i * 48 }));
      }
      return;
    }

    if (pattern === 3 && this.elapsedSeconds > 13) {
      for (let i = 0; i < 5; i += 1) {
        target.push(new Collectible(this.scene, { type: 'pearl', x: 96 + i * 86, y: startY - Math.sin(i) * 22 }));
      }
      return;
    }

    if (pattern === 4 && this.elapsedSeconds > 16) {
      target.push(new Collectible(this.scene, { type: 'shield', x: centerX, y: startY }));
      target.push(new Collectible(this.scene, { type: 'coin', x: centerX - 44, y: startY - 55 }));
      target.push(new Collectible(this.scene, { type: 'coin', x: centerX + 44, y: startY - 55 }));
      return;
    }

    const count = Phaser.Math.Between(4, 7);
    for (let i = 0; i < count; i += 1) {
      target.push(new Collectible(this.scene, {
        type: rubyUnlocked && i === count - 1 && Math.random() < 0.3 ? 'ruby' : Math.random() < 0.35 ? 'coin' : 'gem',
        x: Phaser.Math.Clamp(centerX + (i - count / 2) * 38, 46, GAME_WIDTH - 46),
        y: startY - i * 38
      }));
    }
  }

  private spawnHazardPattern(out: SpawnedObjects): void {
    const startY = -80;
    const canLaser = this.elapsedSeconds > DIFFICULTY.laserFirstSecond;
    const choice = canLaser ? Phaser.Math.Between(0, 4) : Phaser.Math.Between(0, 3);

    if (choice === 4) {
      const gapX = Phaser.Math.Between(126, GAME_WIDTH - 126);
      const gapWidth = Phaser.Math.Between(138, 188);
      out.lasers.push(new LaserGate(this.scene, startY, gapX, gapWidth));
      return;
    }

    if (choice === 0) {
      const gapIndex = Phaser.Math.Between(0, 2);
      const lanes = [118, 270, 422];
      lanes.forEach((x, i) => {
        if (i !== gapIndex) out.spikeOrbs.push(new SpikeOrb(this.scene, x, startY, Phaser.Math.FloatBetween(0.86, 1.02)));
      });
      return;
    }

    if (choice === 1) {
      out.spikeOrbs.push(new SpikeOrb(this.scene, Phaser.Math.Between(72, 142), startY, 0.82));
      out.spikeOrbs.push(new SpikeOrb(this.scene, Phaser.Math.Between(GAME_WIDTH - 142, GAME_WIDTH - 72), startY - 78, 0.82));
      return;
    }

    if (choice === 2) {
      for (let i = 0; i < 3; i += 1) {
        out.spikeOrbs.push(new SpikeOrb(this.scene, Phaser.Math.Between(80, GAME_WIDTH - 80), startY - i * 68, 0.72));
      }
      return;
    }

    const x = Phaser.Math.Between(92, GAME_WIDTH - 92);
    out.spikeOrbs.push(new SpikeOrb(this.scene, x, startY, 1.05));
  }
}
