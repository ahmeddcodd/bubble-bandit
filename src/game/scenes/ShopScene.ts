import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/constants';
import { audio } from '../managers/AudioManager';
import { CHARACTERS, charTextureKey } from '../data/characters';
import { buyCharacter, coinBalance, equipCharacter, getSave, ownsCharacter } from '../utils/save';

export class ShopScene extends Phaser.Scene {
  private balanceText!: Phaser.GameObjects.Text;
  private cards!: Phaser.GameObjects.Container;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    this.cameras.main.fadeIn(260, 4, 12, 27);
    this.createBackground();

    this.add.text(GAME_WIDTH / 2, 70, 'SHOP', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '56px',
      color: '#ffffff',
      stroke: '#082041',
      strokeThickness: 9,
      shadow: { offsetY: 6, color: '#000814', blur: 10, fill: true }
    }).setOrigin(0.5);

    this.balanceText = this.add.text(GAME_WIDTH / 2, 120, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '24px',
      color: '#ffd65d',
      stroke: '#2b1d03',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.cards = this.add.container(0, 0);
    this.renderCards();

    this.createBackButton();
    this.input.keyboard?.once('keydown-ESC', () => this.back());
  }

  private createBackground(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.deep).setOrigin(0);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tower-panel').setTint(0x0c2750).setAlpha(0.7);
    this.add.circle(GAME_WIDTH / 2, 120, 240, 0x2bc8ff, 0.06);
  }

  private renderCards(): void {
    this.cards.removeAll(true);
    this.balanceText.setText(`Coins: ${coinBalance().toLocaleString()}`);

    const equipped = getSave().equippedCharacter;
    const startY = 200;
    const rowH = 132;

    CHARACTERS.forEach((c, index) => {
      const y = startY + index * rowH;
      const owned = ownsCharacter(c.id);
      const isEquipped = equipped === c.id;

      const panel = this.add.rectangle(GAME_WIDTH / 2, y, 452, 116, 0x07152b, 0.82)
        .setStrokeStyle(3, isEquipped ? 0x7dffdf : 0x62e7ff, isEquipped ? 0.7 : 0.3);

      // Character preview inside a small bubble.
      const bubble = this.add.image(96, y, 'bubble').setScale(0.62).setAlpha(0.85);
      const preview = this.add.image(96, y, charTextureKey(c.id)).setScale(0.52);

      const name = this.add.text(150, y - 30, c.name, {
        fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '24px', color: '#ffffff',
        stroke: '#061730', strokeThickness: 4
      }).setOrigin(0, 0.5);
      const blurb = this.add.text(150, y + 2, c.perkBlurb, {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#bfefff', wordWrap: { width: 200 }
      }).setOrigin(0, 0.5);

      // Action button: EQUIPPED / EQUIP / cost.
      const btn = this.add.rectangle(GAME_WIDTH - 92, y + 30, 132, 42, 0x152a55, 0.95)
        .setStrokeStyle(2, 0x65dcff, 0.85);
      let labelStr: string;
      let labelColor = '#ffffff';
      if (isEquipped) { labelStr = 'EQUIPPED'; labelColor = '#7dffdf'; }
      else if (owned) { labelStr = 'EQUIP'; }
      else { labelStr = `${c.cost} 🪙`; labelColor = coinBalance() >= c.cost ? '#ffd65d' : '#ff8a8a'; }
      const label = this.add.text(btn.x, btn.y, labelStr, {
        fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '18px', color: labelColor,
        stroke: '#061730', strokeThickness: 3
      }).setOrigin(0.5);

      if (!isEquipped) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => { audio.ensure(); audio.uiClick(); });
        btn.on('pointerup', () => this.onCardAction(c.id, c.cost, owned));
      }

      this.cards.add([panel, bubble, preview, name, blurb, btn, label]);
    });
  }

  private onCardAction(id: string, cost: number, owned: boolean): void {
    if (owned) {
      equipCharacter(id);
    } else if (buyCharacter(id, cost)) {
      equipCharacter(id); // auto-equip on purchase
    } else {
      return; // can't afford — leave as-is
    }
    this.renderCards();
  }

  private createBackButton(): void {
    const btn = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 64, 'button').setScale(0.82).setInteractive({ useHandCursor: true });
    const label = this.add.text(btn.x, btn.y - 1, 'BACK', {
      fontFamily: 'Arial Black, Impact, sans-serif', fontSize: '26px', color: '#bff6ff',
      stroke: '#09284a', strokeThickness: 5
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setScale(0.86));
    btn.on('pointerout', () => btn.setScale(0.82));
    btn.on('pointerdown', () => { btn.setScale(0.78); audio.ensure(); audio.uiClick(); });
    btn.on('pointerup', () => { label.setY(btn.y - 1); this.back(); });
  }

  private back(): void {
    this.cameras.main.fadeOut(180, 4, 12, 27);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('MainMenuScene'));
  }
}
