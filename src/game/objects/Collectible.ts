import Phaser from 'phaser';

export type CollectibleType = 'gem' | 'coin' | 'ruby' | 'pearl' | 'shield';

export interface CollectibleConfig {
  type: CollectibleType;
  x: number;
  y: number;
}

const TEXTURE_BY_TYPE: Record<CollectibleType, string> = {
  gem: 'gem-blue',
  coin: 'coin',
  ruby: 'gem-ruby',
  pearl: 'pearl',
  shield: 'soap-shield'
};

const VALUE_BY_TYPE: Record<CollectibleType, number> = {
  gem: 15,
  coin: 5,
  ruby: 85,
  pearl: 35,
  shield: 0
};

const RADIUS_BY_TYPE: Record<CollectibleType, number> = {
  gem: 19,
  coin: 18,
  ruby: 22,
  pearl: 21,
  shield: 25
};

export class Collectible extends Phaser.GameObjects.Container {
  public readonly type: CollectibleType;
  public readonly value: number;
  public readonly radius: number;
  public collected = false;

  private sprite: Phaser.GameObjects.Image;
  private aura: Phaser.GameObjects.Arc;
  private baseY: number;
  private spinSpeed: number;

  constructor(scene: Phaser.Scene, config: CollectibleConfig) {
    super(scene, config.x, config.y);
    scene.add.existing(this);

    this.type = config.type;
    this.value = VALUE_BY_TYPE[config.type];
    this.radius = RADIUS_BY_TYPE[config.type];
    this.baseY = config.y;
    this.spinSpeed = Phaser.Math.FloatBetween(-2.2, 2.2);

    const auraColor = config.type === 'ruby' ? 0xff4b6f : config.type === 'shield' ? 0x7dffdf : 0x86e9ff;
    this.aura = scene.add.circle(0, 0, this.radius + 13, auraColor, config.type === 'coin' ? 0.07 : 0.12);
    this.sprite = scene.add.image(0, 0, TEXTURE_BY_TYPE[config.type]);
    this.sprite.setScale(config.type === 'coin' ? 0.76 : config.type === 'ruby' ? 0.78 : config.type === 'shield' ? 0.72 : 0.82);
    this.add([this.aura, this.sprite]);
    this.setDepth(config.type === 'ruby' ? 58 : 52);
  }

  updateItem(deltaMs: number, scrollSpeed: number): void {
    const dt = deltaMs / 1000;
    this.y += scrollSpeed * dt;
    this.baseY += scrollSpeed * dt;
    this.sprite.rotation += this.spinSpeed * dt;
    this.sprite.y = Math.sin((this.scene.time.now + this.x * 7) / 310) * 3;
    this.aura.setScale(1 + Math.sin(this.scene.time.now / 260 + this.x) * 0.08);
  }

  collectTo(target: Phaser.Math.Vector2, onComplete: () => void): void {
    if (this.collected) return;
    this.collected = true;
    this.scene.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      scale: 0.18,
      alpha: 0.2,
      duration: 180,
      ease: 'Cubic.easeIn',
      onComplete
    });
  }
}
