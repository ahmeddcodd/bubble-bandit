import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { audio } from '../managers/AudioManager';
import { getSave, coinBalance } from '../utils/save';
import { charTextureKey } from '../data/characters';
import * as Playables from '../managers/Playables';

export class MainMenuScene extends Phaser.Scene {
  private floatingBits: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.fadeIn(350, 4, 12, 27);
    this.createBackground();
    this.createTitle();
    this.createHeroBubble();
    this.createPlayButton();
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());

    // The interactive menu is up — safe to tell YouTube the game is ready
    // (this hides YouTube's loading spinner). Must NOT be called earlier.
    Playables.gameReady();
  }

  update(_: number, delta: number): void {
    const dt = delta / 1000;
    this.floatingBits.forEach((bit, index) => {
      bit.y += (14 + index * 1.8) * dt;
      bit.x += Math.sin(this.time.now / 700 + index) * 0.18;
      bit.rotation += 0.32 * dt;
      if (bit.y > GAME_HEIGHT + 30) bit.y = -30;
    });
  }

  private createBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.deep).setOrigin(0);

    const panelA = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tower-panel').setAlpha(0.8);
    panelA.setTint(0x0a2750);
    const panelB = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tower-panel').setAlpha(0.18);
    panelB.setTint(0xffc76b);

    for (let i = 0; i < 44; i += 1) {
      const type = i % 5 === 0 ? 'coin' : i % 7 === 0 ? 'gem-ruby' : 'gem-blue';
      const bit = this.add.image(
        Phaser.Math.Between(22, GAME_WIDTH - 22),
        Phaser.Math.Between(-20, GAME_HEIGHT + 20),
        type
      );
      bit.setScale(Phaser.Math.FloatBetween(0.18, 0.42));
      bit.setAlpha(Phaser.Math.FloatBetween(0.16, 0.36));
      bit.setDepth(1);
      this.floatingBits.push(bit);
    }

    this.add.circle(GAME_WIDTH / 2, 208, 260, 0x2bc8ff, 0.08);
    this.add.circle(GAME_WIDTH / 2, 208, 154, 0xffd15c, 0.08);
  }

  private createTitle(): void {
    this.add.text(GAME_WIDTH / 2, 94, 'BUBBLE', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '64px',
      color: '#dffbff',
      stroke: '#082041',
      strokeThickness: 10,
      shadow: { offsetY: 8, color: '#000814', blur: 12, fill: true }
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 155, 'BANDIT', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '68px',
      color: '#ffd65d',
      stroke: '#5c2b08',
      strokeThickness: 10,
      shadow: { offsetY: 8, color: '#000814', blur: 12, fill: true }
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 218, 'Grow greedy. Shrink sneaky. Don’t pop.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#bff6ff',
      align: 'center'
    }).setOrigin(0.5);
  }

  private createHeroBubble(): void {
    const hero = this.add.container(GAME_WIDTH / 2, 424);
    const glow = this.add.circle(0, 0, 136, 0x77eaff, 0.12);
    const bubble = this.add.image(0, 0, 'bubble').setScale(1.82);
    const thief = this.add.image(0, 7, charTextureKey(getSave().equippedCharacter)).setScale(1.0);
    const coinL = this.add.image(-126, -18, 'coin').setScale(0.82).setAngle(-18);
    const gemR = this.add.image(126, 24, 'gem-ruby').setScale(0.75).setAngle(14);
    const gemB = this.add.image(90, -98, 'gem-blue').setScale(0.78).setAngle(-10);
    hero.add([glow, coinL, gemR, gemB, bubble, thief]);

    this.tweens.add({ targets: hero, y: hero.y - 16, duration: 1300, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
    this.tweens.add({ targets: bubble, scaleX: 1.94, scaleY: 1.73, duration: 1050, ease: 'Sine.inOut', yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [coinL, gemR, gemB], angle: '+=18', duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private createPlayButton(): void {
    const save = getSave();
    const hint = this.add.text(GAME_WIDTH / 2, 632, 'Hold anywhere to inflate. Release to shrink.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '23px',
      color: '#e9fcff',
      align: 'center',
      wordWrap: { width: 430 }
    }).setOrigin(0.5);
    hint.setAlpha(0.9);

    this.add.text(GAME_WIDTH / 2, 684, `Best Score: ${save.bestScore.toLocaleString()}`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '22px',
      color: '#ffd65d',
      stroke: '#2b1d03',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 716, `Coins: ${coinBalance().toLocaleString()}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      color: '#bff6ff'
    }).setOrigin(0.5);

    // PLAY
    const button = this.add.image(GAME_WIDTH / 2, 784, 'button').setInteractive({ useHandCursor: true });
    const label = this.add.text(button.x, button.y - 2, 'PLAY', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#09284a',
      strokeThickness: 6
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setScale(1.03));
    button.on('pointerout', () => button.setScale(1));
    button.on('pointerdown', () => {
      button.setScale(0.96);
      label.setY(button.y + 1);
      audio.ensure();
      audio.uiClick();
    });
    button.on('pointerup', () => this.startGame());

    // SHOP
    const shop = this.add.image(GAME_WIDTH / 2, 864, 'button').setScale(0.82).setInteractive({ useHandCursor: true });
    shop.setAlpha(0.92);
    const shopLabel = this.add.text(shop.x, shop.y - 1, 'SHOP', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '26px',
      color: '#ffe08a',
      stroke: '#09284a',
      strokeThickness: 5
    }).setOrigin(0.5);
    shop.on('pointerover', () => shop.setScale(0.86));
    shop.on('pointerout', () => shop.setScale(0.82));
    shop.on('pointerdown', () => {
      shop.setScale(0.78);
      shopLabel.setY(shop.y + 1);
      audio.ensure();
      audio.uiClick();
    });
    shop.on('pointerup', () => this.openShop());
  }

  private openShop(): void {
    this.cameras.main.fadeOut(180, 4, 12, 27);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('ShopScene'));
  }

  private startGame(): void {
    this.cameras.main.fadeOut(180, 4, 12, 27);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameScene');
    });
  }
}
