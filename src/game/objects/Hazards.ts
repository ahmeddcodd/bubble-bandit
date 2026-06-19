import Phaser from 'phaser';
import { GAME_WIDTH } from '../utils/constants';

export class SpikeOrb extends Phaser.GameObjects.Container {
  public radius = 31;
  public nearMissed = false;
  private sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);
    scene.add.existing(this);
    this.sprite = scene.add.image(0, 0, 'spike-orb').setScale(scale);
    this.radius *= scale;
    this.add(this.sprite);
    this.setDepth(70);
  }

  updateHazard(deltaMs: number, scrollSpeed: number): void {
    const dt = deltaMs / 1000;
    this.y += scrollSpeed * dt;
    this.sprite.rotation += 1.5 * dt;
  }
}

export class LaserGate extends Phaser.GameObjects.Container {
  public readonly gapX: number;
  public readonly gapWidth: number;
  public active = false;
  public readonly thickness = 22;

  private leftBeam: Phaser.GameObjects.Image;
  private rightBeam: Phaser.GameObjects.Image;
  private warningText: Phaser.GameObjects.Text;
  private startTime: number;

  constructor(scene: Phaser.Scene, y: number, gapX: number, gapWidth: number) {
    super(scene, 0, y);
    scene.add.existing(this);

    this.gapX = gapX;
    this.gapWidth = gapWidth;
    this.startTime = scene.time.now;

    const leftWidth = Math.max(0, gapX - gapWidth / 2);
    const rightStart = gapX + gapWidth / 2;
    const rightWidth = Math.max(0, GAME_WIDTH - rightStart);

    this.leftBeam = scene.add.image(leftWidth / 2, 0, 'laser-beam').setDisplaySize(leftWidth, 28);
    this.rightBeam = scene.add.image(rightStart + rightWidth / 2, 0, 'laser-beam').setDisplaySize(rightWidth, 28);
    this.warningText = scene.add.text(GAME_WIDTH / 2, -31, 'LASER GAP!', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '16px',
      color: '#ff95aa',
      stroke: '#2a0610',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add([this.leftBeam, this.rightBeam, this.warningText]);
    this.setDepth(66);
    this.setAlpha(0.52);
  }

  updateHazard(deltaMs: number, scrollSpeed: number): void {
    const dt = deltaMs / 1000;
    this.y += scrollSpeed * dt;
    const age = this.scene.time.now - this.startTime;
    this.active = age > 550;
    this.setAlpha(this.active ? 0.95 : 0.32 + Math.sin(this.scene.time.now / 70) * 0.12);
    this.leftBeam.setTint(this.active ? 0xffffff : 0xff889a);
    this.rightBeam.setTint(this.active ? 0xffffff : 0xff889a);
    this.warningText.setVisible(!this.active);
  }

  overlapsCircle(x: number, y: number, radius: number): boolean {
    if (!this.active) return false;
    if (Math.abs(y - this.y) > radius + this.thickness / 2) return false;
    const gapLeft = this.gapX - this.gapWidth / 2;
    const gapRight = this.gapX + this.gapWidth / 2;
    return x - radius < gapLeft || x + radius > gapRight;
  }
}
