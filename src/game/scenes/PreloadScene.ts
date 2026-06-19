import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // Procedural game art. No external assets: faster loading, cleaner Playables packaging.
  }

  create(): void {
    this.createTextures();
    this.scene.start('MainMenuScene');
  }

  private createTextures(): void {
    this.createBubbleTexture();
    this.createThiefTexture();
    this.createGemTexture('gem-blue', COLORS.cyan, COLORS.cyanDark, 44, 52);
    this.createGemTexture('gem-ruby', COLORS.ruby, COLORS.rubyDark, 48, 58);
    this.createPearlTexture();
    this.createCoinTexture();
    this.createSpikeOrbTexture();
    this.createLaserTexture();
    this.createPowerTexture();
    this.createBackgroundDust();
    this.createButtonTexture();
  }

  private withGraphics(callback: (g: Phaser.GameObjects.Graphics) => void): void {
    const g = this.add.graphics();
    callback(g);
    g.destroy();
  }

  private createBubbleTexture(): void {
    this.withGraphics((g) => {
      const cx = 72;
      const cy = 72;
      g.clear();
      g.fillStyle(COLORS.bubble, 0.18);
      g.fillCircle(cx, cy, 60);
      g.fillStyle(COLORS.bubbleCore, 0.12);
      g.fillCircle(cx, cy, 46);
      g.lineStyle(6, COLORS.bubbleCore, 0.72);
      g.strokeCircle(cx, cy, 56);
      g.lineStyle(2, COLORS.white, 0.82);
      g.beginPath();
      g.arc(cx - 10, cy - 8, 41, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(318));
      g.strokePath();
      g.fillStyle(COLORS.white, 0.72);
      g.fillEllipse(cx - 23, cy - 31, 20, 11);
      g.fillStyle(COLORS.white, 0.34);
      g.fillEllipse(cx + 27, cy + 30, 13, 8);
      g.generateTexture('bubble', 144, 144);
    });
  }

  private createThiefTexture(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(0x111827, 1);
      g.fillRoundedRect(23, 25, 50, 64, 20);
      g.fillStyle(0x222a3a, 1);
      g.fillRoundedRect(17, 37, 62, 28, 14);
      g.fillStyle(0x060914, 1);
      g.fillTriangle(22, 34, 38, 14, 34, 38);
      g.fillTriangle(74, 34, 58, 14, 62, 38);
      g.fillStyle(0xffd7a6, 1);
      g.fillRoundedRect(28, 34, 40, 38, 14);
      g.fillStyle(0x111827, 1);
      g.fillRoundedRect(25, 30, 46, 19, 9);
      g.fillStyle(COLORS.white, 1);
      g.fillCircle(39, 54, 4);
      g.fillCircle(57, 54, 4);
      g.fillStyle(0x121827, 1);
      g.fillCircle(40, 54, 2);
      g.fillCircle(58, 54, 2);
      g.lineStyle(3, 0x5b2b1e, 1);
      g.beginPath();
      g.arc(49, 63, 8, Phaser.Math.DegToRad(18), Phaser.Math.DegToRad(162));
      g.strokePath();
      g.fillStyle(COLORS.gold, 1);
      g.fillCircle(48, 82, 8);
      g.lineStyle(2, 0xfff1b0, 0.9);
      g.strokeCircle(48, 82, 5);
      g.generateTexture('thief', 96, 104);
    });
  }

  private createGemTexture(key: string, color: number, dark: number, width: number, height: number): void {
    this.withGraphics((g) => {
      const cx = width / 2;
      g.clear();
      g.fillStyle(color, 0.2);
      g.fillCircle(cx, height / 2, Math.max(width, height) * 0.46);
      g.fillStyle(dark, 1);
      g.fillPoints([
        new Phaser.Geom.Point(cx, 2),
        new Phaser.Geom.Point(width - 4, height * 0.32),
        new Phaser.Geom.Point(width - 10, height - 6),
        new Phaser.Geom.Point(cx, height - 2),
        new Phaser.Geom.Point(10, height - 6),
        new Phaser.Geom.Point(4, height * 0.32)
      ], true);
      g.fillStyle(color, 1);
      g.fillPoints([
        new Phaser.Geom.Point(cx, 5),
        new Phaser.Geom.Point(width - 8, height * 0.34),
        new Phaser.Geom.Point(cx, height - 7),
        new Phaser.Geom.Point(8, height * 0.34)
      ], true);
      g.fillStyle(COLORS.white, 0.55);
      g.fillTriangle(cx - 8, 9, cx + 9, 11, cx - 2, height * 0.34);
      g.lineStyle(2, COLORS.white, 0.42);
      g.strokePoints([
        new Phaser.Geom.Point(cx, 5),
        new Phaser.Geom.Point(width - 8, height * 0.34),
        new Phaser.Geom.Point(cx, height - 7),
        new Phaser.Geom.Point(8, height * 0.34)
      ], true);
      g.generateTexture(key, width, height);
    });
  }

  private createPearlTexture(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(0xb8fff7, 0.22);
      g.fillCircle(28, 28, 27);
      g.fillStyle(0xf7ffff, 1);
      g.fillCircle(28, 28, 18);
      g.fillStyle(0x86dfff, 0.55);
      g.fillCircle(31, 32, 12);
      g.fillStyle(COLORS.white, 0.82);
      g.fillCircle(21, 20, 5);
      g.fillStyle(COLORS.gold, 1);
      const star = new Phaser.Geom.Point(28, 11);
      g.fillTriangle(star.x, star.y, 33, 27, 23, 27);
      g.fillTriangle(star.x, 45, 33, 29, 23, 29);
      g.fillTriangle(11, 28, 27, 23, 27, 33);
      g.fillTriangle(45, 28, 29, 23, 29, 33);
      g.generateTexture('pearl', 56, 56);
    });
  }

  private createCoinTexture(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(COLORS.coinDark, 0.55);
      g.fillCircle(28, 31, 23);
      g.fillStyle(COLORS.coin, 1);
      g.fillCircle(28, 28, 23);
      g.lineStyle(4, 0xfff0a1, 0.88);
      g.strokeCircle(28, 28, 18);
      g.fillStyle(0xfff7bd, 0.95);
      g.fillRoundedRect(24, 14, 8, 27, 4);
      g.generateTexture('coin', 56, 60);
    });
  }

  private createSpikeOrbTexture(): void {
    this.withGraphics((g) => {
      const cx = 44;
      const cy = 44;
      g.clear();
      g.fillStyle(COLORS.spikeDark, 0.34);
      g.fillCircle(cx, cy + 6, 34);
      g.fillStyle(COLORS.spike, 1);
      for (let i = 0; i < 12; i += 1) {
        const a = (Math.PI * 2 * i) / 12;
        const a1 = a - 0.15;
        const a2 = a + 0.15;
        const p1 = new Phaser.Geom.Point(cx + Math.cos(a1) * 24, cy + Math.sin(a1) * 24);
        const p2 = new Phaser.Geom.Point(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
        const p3 = new Phaser.Geom.Point(cx + Math.cos(a2) * 24, cy + Math.sin(a2) * 24);
        g.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      }
      g.fillStyle(COLORS.spikeDark, 1);
      g.fillCircle(cx, cy, 25);
      g.fillStyle(COLORS.spike, 1);
      g.fillCircle(cx, cy, 19);
      g.fillStyle(COLORS.white, 0.5);
      g.fillEllipse(cx - 9, cy - 11, 13, 7);
      g.generateTexture('spike-orb', 88, 88);
    });
  }

  private createLaserTexture(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(0xff265b, 0.22);
      g.fillRoundedRect(0, 0, 240, 28, 14);
      g.fillStyle(0xff315f, 0.88);
      g.fillRoundedRect(0, 8, 240, 12, 6);
      g.fillStyle(COLORS.white, 0.92);
      g.fillRoundedRect(0, 12, 240, 4, 2);
      g.generateTexture('laser-beam', 240, 28);
    });
  }

  private createPowerTexture(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(0x72f6ff, 0.18);
      g.fillCircle(32, 32, 30);
      g.fillStyle(0x2ff6b8, 1);
      g.fillCircle(32, 32, 22);
      g.fillStyle(COLORS.white, 0.78);
      g.fillCircle(24, 23, 7);
      g.lineStyle(5, COLORS.white, 0.8);
      g.strokeCircle(32, 32, 17);
      g.generateTexture('soap-shield', 64, 64);
    });
  }

  private createBackgroundDust(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(COLORS.white, 0.42);
      g.fillCircle(5, 5, 5);
      g.generateTexture('dust-dot', 10, 10);
    });

    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(0x113761, 1);
      g.fillRoundedRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 28);
      g.lineStyle(2, 0x2db8ff, 0.08);
      for (let y = 22; y < GAME_HEIGHT; y += 58) {
        g.strokeLineShape(new Phaser.Geom.Line(28, y, GAME_WIDTH - 28, y + 12));
      }
      g.lineStyle(5, 0xffcf72, 0.12);
      g.strokeRoundedRect(18, 18, GAME_WIDTH - 36, GAME_HEIGHT - 36, 28);
      g.generateTexture('tower-panel', GAME_WIDTH, GAME_HEIGHT);
    });
  }

  private createButtonTexture(): void {
    this.withGraphics((g) => {
      g.clear();
      g.fillStyle(0x152a55, 0.95);
      g.fillRoundedRect(0, 0, 290, 78, 32);
      g.lineStyle(4, 0x65dcff, 0.88);
      g.strokeRoundedRect(4, 4, 282, 70, 30);
      g.fillStyle(0xffffff, 0.08);
      g.fillRoundedRect(16, 10, 258, 20, 12);
      g.generateTexture('button', 290, 78);
    });
  }
}
