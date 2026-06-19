import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { audio } from '../managers/AudioManager';

interface RunStats {
  score: number;
  bestScore: number;
  timeAlive: number;
  gems: number;
  coins: number;
  rubies: number;
  bestCombo: number;
}

export class GameOverScene extends Phaser.Scene {
  private stats!: RunStats;
  private floaters: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('GameOverScene');
  }

  init(data: RunStats): void {
    this.stats = data;
  }

  create(): void {
    this.cameras.main.fadeIn(300, 4, 12, 27);
    this.createBackground();
    this.createPopCard();
    this.createStats();
    this.createButtons();

    this.input.keyboard?.once('keydown-SPACE', () => this.retry());
    this.input.keyboard?.once('keydown-ENTER', () => this.retry());
  }

  update(_: number, delta: number): void {
    const dt = delta / 1000;
    this.floaters.forEach((floater, index) => {
      floater.y += (18 + index * 1.7) * dt;
      floater.rotation += (0.55 + index * 0.03) * dt;
      if (floater.y > GAME_HEIGHT + 30) floater.y = -30;
    });
  }

  private createBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.deep).setOrigin(0);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tower-panel').setTint(0x0d244b).setAlpha(0.58);
    this.add.circle(GAME_WIDTH / 2, 205, 260, 0xff4b6f, 0.09);
    this.add.circle(GAME_WIDTH / 2, 205, 164, 0x9beeff, 0.1);

    for (let i = 0; i < 26; i += 1) {
      const key = i % 5 === 0 ? 'coin' : i % 7 === 0 ? 'gem-ruby' : 'gem-blue';
      const floater = this.add.image(Phaser.Math.Between(18, GAME_WIDTH - 18), Phaser.Math.Between(-20, GAME_HEIGHT), key)
        .setScale(Phaser.Math.FloatBetween(0.18, 0.36))
        .setAlpha(Phaser.Math.FloatBetween(0.12, 0.28));
      this.floaters.push(floater);
    }
  }

  private createPopCard(): void {
    this.add.text(GAME_WIDTH / 2, 94, 'POP!', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '84px',
      color: '#ff6d8a',
      stroke: '#390712',
      strokeThickness: 12,
      shadow: { offsetY: 8, color: '#000000', blur: 12, fill: true }
    }).setOrigin(0.5);

    const message = this.pickMessage();
    this.add.text(GAME_WIDTH / 2, 174, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '23px',
      color: '#dffbff',
      align: 'center',
      wordWrap: { width: 430 }
    }).setOrigin(0.5);

    const bubble = this.add.image(GAME_WIDTH / 2, 300, 'bubble').setScale(1.12).setAlpha(0.5);
    const thief = this.add.image(GAME_WIDTH / 2, 310, 'thief').setScale(0.62).setAngle(-14);
    const sad = this.add.text(GAME_WIDTH / 2 + 80, 246, 'too greedy?', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '17px',
      color: '#ffd65d',
      stroke: '#2e1d00',
      strokeThickness: 4
    }).setOrigin(0.5).setAngle(10);

    this.tweens.add({ targets: [bubble, thief], y: '+=14', duration: 950, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: sad, angle: -8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private createStats(): void {
    const panel = this.add.rectangle(GAME_WIDTH / 2, 520, 442, 252, 0x07152b, 0.82)
      .setStrokeStyle(3, 0x62e7ff, 0.34);
    panel.setDepth(2);

    this.add.text(GAME_WIDTH / 2, 422, this.stats.score.toLocaleString(), {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '58px',
      color: '#ffffff',
      stroke: '#061730',
      strokeThickness: 9
    }).setOrigin(0.5).setDepth(3);

    const bestLabel = this.stats.score >= this.stats.bestScore ? 'NEW BEST!' : `BEST ${this.stats.bestScore.toLocaleString()}`;
    this.add.text(GAME_WIDTH / 2, 471, bestLabel, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '22px',
      color: '#ffd65d',
      stroke: '#2f2104',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(3);

    const rows = [
      ['Time Survived', `${this.stats.timeAlive.toFixed(1)}s`],
      ['Gems Stolen', `${this.stats.gems}`],
      ['Coins Pocketed', `${this.stats.coins}`],
      ['Rubies Snatched', `${this.stats.rubies}`],
      ['Best Combo', `${this.stats.bestCombo}`]
    ];

    rows.forEach(([label, value], index) => {
      const y = 520 + index * 31;
      this.add.text(94, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#bfefff'
      }).setOrigin(0, 0.5).setDepth(3);
      this.add.text(GAME_WIDTH - 94, y, value, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#061730',
        strokeThickness: 4
      }).setOrigin(1, 0.5).setDepth(3);
    });
  }

  private createButtons(): void {
    const retryButton = this.add.image(GAME_WIDTH / 2, 734, 'button').setInteractive({ useHandCursor: true });
    retryButton.setTint(0xffffff);
    const retryLabel = this.add.text(retryButton.x, retryButton.y - 1, 'RETRY', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#09284a',
      strokeThickness: 6
    }).setOrigin(0.5);

    const homeButton = this.add.image(GAME_WIDTH / 2, 830, 'button').setScale(0.82).setInteractive({ useHandCursor: true });
    homeButton.setAlpha(0.76);
    const homeLabel = this.add.text(homeButton.x, homeButton.y - 1, 'HOME', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '25px',
      color: '#bff6ff',
      stroke: '#09284a',
      strokeThickness: 5
    }).setOrigin(0.5);

    const wireButton = (button: Phaser.GameObjects.Image, label: Phaser.GameObjects.Text, callback: () => void) => {
      button.on('pointerover', () => button.setScale(button === retryButton ? 1.04 : 0.86));
      button.on('pointerout', () => button.setScale(button === retryButton ? 1 : 0.82));
      button.on('pointerdown', () => {
        button.setScale(button === retryButton ? 0.96 : 0.78);
        audio.ensure();
        audio.uiClick();
      });
      button.on('pointerup', () => {
        label.setY(button.y - 1);
        callback();
      });
    };

    wireButton(retryButton, retryLabel, () => this.retry());
    wireButton(homeButton, homeLabel, () => this.home());
  }

  private retry(): void {
    this.cameras.main.fadeOut(180, 4, 12, 27);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('GameScene'));
  }

  private home(): void {
    this.cameras.main.fadeOut(180, 4, 12, 27);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('MainMenuScene'));
  }

  private pickMessage(): string {
    const messages = [
      'The bubble filed a tiny complaint.',
      'That spike had excellent timing.',
      'You were almost rich.',
      'Shrink sooner next time.',
      'The tower remains suspiciously unrobbed.',
      'Pop happens. One more float?'
    ];
    return Phaser.Utils.Array.GetRandom(messages);
  }
}
