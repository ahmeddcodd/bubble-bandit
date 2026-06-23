import Phaser from 'phaser';
import * as Playables from '../managers/Playables';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scale.lockOrientation('portrait');
    // Rendering has begun — tell YouTube the first frame is up (its loading
    // spinner stays until gameReady, called once the menu is interactive).
    Playables.firstFrameReady();
    this.scene.start('PreloadScene');
  }
}
