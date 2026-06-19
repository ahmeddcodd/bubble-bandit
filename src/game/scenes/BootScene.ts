import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scale.lockOrientation('portrait');
    this.scene.start('PreloadScene');
  }
}
