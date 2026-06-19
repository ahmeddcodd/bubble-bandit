import { BubblePlayer } from '../objects/BubblePlayer';
import { CollectibleType } from '../objects/Collectible';

export interface ComboResult {
  score: number;
  message?: string;
  multiplier: number;
  combo: number;
}

export class ComboManager {
  public combo = 0;
  public bestCombo = 0;
  public multiplier = 1;
  private lastCollectAt = 0;
  private readonly comboWindowMs = 2350;

  update(now: number): void {
    if (this.combo > 0 && now - this.lastCollectAt > this.comboWindowMs) {
      this.combo = 0;
      this.multiplier = 1;
    }
  }

  collect(type: CollectibleType, baseValue: number, player: BubblePlayer, now: number): ComboResult {
    if (now - this.lastCollectAt > this.comboWindowMs) {
      this.combo = 0;
      this.multiplier = 1;
    }

    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.lastCollectAt = now;

    const step = Math.floor(this.combo / 5) * 0.25;
    const sizeBonus = player.isLarge() && type !== 'shield' ? 0.25 : 0;
    const tinyBonus = player.isTiny() && type === 'pearl' ? 0.35 : 0;
    this.multiplier = Math.min(8, 1 + step + sizeBonus + tinyBonus);

    let message: string | undefined;
    if (type === 'ruby') message = 'RISKY RICHES!';
    else if (type === 'pearl' && this.combo >= 4) message = 'PEARL PERFECT!';
    else if (player.isLarge() && this.combo % 5 === 0) message = 'BIG GREED!';
    else if (player.isTiny() && this.combo % 4 === 0) message = 'TINY SQUEEZE!';
    else if (this.combo % 10 === 0) message = 'GEM CHAIN!';

    return {
      score: Math.round(baseValue * this.multiplier),
      message,
      multiplier: this.multiplier,
      combo: this.combo
    };
  }

  reset(): void {
    this.combo = 0;
    this.multiplier = 1;
    this.lastCollectAt = 0;
  }
}
