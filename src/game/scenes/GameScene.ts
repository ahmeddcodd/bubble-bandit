import Phaser from 'phaser';
import { BubblePlayer } from '../objects/BubblePlayer';
import { Collectible } from '../objects/Collectible';
import { LaserGate, SpikeOrb } from '../objects/Hazards';
import { ComboManager } from '../managers/ComboManager';
import { TowerManager } from '../managers/TowerManager';
import { audio } from '../managers/AudioManager';
import { BG, COLORS, GAME_HEIGHT, GAME_WIDTH, JUICE, ZONES } from '../utils/constants';
import { flash, lerpColor, ringPulse, shake } from '../utils/juice';
import { getSave, saveData, setProgressProvider } from '../utils/save';

interface RunStats {
  score: number;
  bestScore: number;
  timeAlive: number;
  gems: number;
  coins: number;
  rubies: number;
  bestCombo: number;
}

export class GameScene extends Phaser.Scene {
  private player!: BubblePlayer;
  private tower!: TowerManager;
  private combo!: ComboManager;

  private collectibles: Collectible[] = [];
  private spikeOrbs: SpikeOrb[] = [];
  private lasers: LaserGate[] = [];
  // Parallax depth layers: each is a pair of leapfrogging tower-panel images.
  private bgLayers: Phaser.GameObjects.Image[][] = [];
  private dust: Phaser.GameObjects.Image[] = [];
  private rays: Phaser.GameObjects.Rectangle[] = [];
  private fgBubbles: Phaser.GameObjects.Arc[] = [];
  private bgGlow!: Phaser.GameObjects.Rectangle;
  private topVignette!: Phaser.GameObjects.Rectangle;

  private score = 0;
  private gems = 0;
  private coins = 0;
  private rubies = 0;
  private timeAlive = 0;
  private isRunOver = false;
  // Save snapshot captured at run start, so mid-run flushes compute
  // baseline + run delta without double-counting what endRun already committed.
  private saveBaseline = { bestScore: 0, totalCoins: 0, gamesPlayed: 0 };
  private pointerDownAt = 0;
  private activePointerX: number | null = null;
  private hasInteracted = false;
  // Real-time timestamp (ms) until which gameplay integration is frozen for a
  // brief "punch". The manual game loop honours this; tween/audio keep running.
  private hitStopUntil = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private shieldIcon!: Phaser.GameObjects.Image;
  private tutorialGroup!: Phaser.GameObjects.Container;

  // Pooled, reused Text objects. Creating a Phaser Text rasterizes a new GPU
  // texture every time — expensive when pickups arrive in clusters (e.g. a row
  // of 5 pearls firing +score floats and PEARL PERFECT banners in a few frames).
  // We round-robin a fixed set instead so no allocation/texture upload happens
  // during play.
  private floatPool: Phaser.GameObjects.Text[] = [];
  private floatIndex = 0;
  private bannerPool: Phaser.GameObjects.Text[] = [];
  private bannerIndex = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.resetRunState();
    this.createBackground();
    this.createUi();
    this.createTextPools();
    this.createTutorial();

    this.tower = new TowerManager(this);
    this.combo = new ComboManager();
    this.player = new BubblePlayer(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.64);

    this.setupInput();
    this.cameras.main.fadeIn(220, 4, 12, 27);

    // While a run is live, expose its progress so a flush (e.g. on YouTube
    // pause / imminent reload) captures coins + best score earned this run.
    // Computed from the run-start baseline + current deltas so it never
    // double-counts what endRun has already committed. Once the run is over,
    // endRun owns the save and the provider contributes nothing further.
    this.saveBaseline = { ...getSave() };
    setProgressProvider(() => {
      if (this.isRunOver) return {};
      return {
        bestScore: Math.max(this.saveBaseline.bestScore, this.score),
        totalCoins: this.saveBaseline.totalCoins + this.coins
      };
    });

    // Always silence the ambient pad + music when leaving the scene (covers Home /
    // restart paths that don't run endRun), so nothing leaks across scenes.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setProgressProvider(null);
      audio.stopAmbient();
      audio.stopMusic();
    });
  }

  update(_: number, delta: number): void {
    if (this.isRunOver) return;

    // Hit-stop: freeze the manual simulation for a few frames so impacts land.
    // Background still drifts subtly so the screen never looks fully dead.
    if (this.time.now < this.hitStopUntil) {
      this.scrollBackground(delta * 0.15);
      return;
    }

    this.timeAlive += delta / 1000;
    this.scrollBackground(delta);

    this.combo.update(this.time.now);
    this.player.updatePlayer(delta, this.activePointerX);

    this.tower.update(delta, {
      collectibles: this.collectibles,
      spikeOrbs: this.spikeOrbs,
      lasers: this.lasers
    });

    this.updateCollectibles(delta);
    this.updateHazards(delta);
    this.checkCollectibles();
    this.checkHazards();
    this.updateThiefMood();
    this.updateUi();
  }

  // Drive the thief's expression: fear when a hazard is close, greed when the
  // bubble is large (lots of loot in reach), otherwise neutral. Fear wins.
  private updateThiefMood(): void {
    const px = this.player.x;
    const py = this.player.y;
    const dangerBand = this.player.getHitRadius() + 70;
    let danger = false;

    for (const hazard of this.spikeOrbs) {
      if (Phaser.Math.Distance.Between(px, py, hazard.x, hazard.y) <= dangerBand + hazard.radius) {
        danger = true;
        break;
      }
    }
    if (!danger) {
      for (const laser of this.lasers) {
        // Only worrying once it's armed and vertically near.
        if (laser.active && Math.abs(laser.y - py) <= dangerBand) {
          danger = true;
          break;
        }
      }
    }

    this.player.setMood(danger ? 'scared' : this.player.isLarge() ? 'greed' : 'neutral');
  }

  private resetRunState(): void {
    this.collectibles = [];
    this.spikeOrbs = [];
    this.lasers = [];
    this.bgLayers = [];
    this.dust = [];
    this.rays = [];
    this.fgBubbles = [];
    this.score = 0;
    this.gems = 0;
    this.coins = 0;
    this.rubies = 0;
    this.timeAlive = 0;
    this.isRunOver = false;
    this.pointerDownAt = 0;
    this.activePointerX = null;
    this.hasInteracted = false;
    this.hitStopUntil = 0;
    this.floatPool = [];
    this.floatIndex = 0;
    this.bannerPool = [];
    this.bannerIndex = 0;
  }

  private createBackground(): void {
    // Base fill + an ambient glow wash that gets recolored per altitude zone.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.deep).setOrigin(0).setDepth(-20);
    this.bgGlow = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, ZONES[0].glow, 0.06).setOrigin(0).setDepth(-19);

    // Three parallax depth layers, each a pair of leapfrogging tower-panel images.
    // Far layer is darkest/slowest, near layer brightest/fastest → depth.
    this.bgLayers = BG.parallax.map((_, layer) => {
      const depth = -18 + layer; // -18, -17, -16
      const top = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'tower-panel').setDepth(depth);
      const bottom = this.add.image(GAME_WIDTH / 2, -GAME_HEIGHT / 2, 'tower-panel').setDepth(depth);
      return [top, bottom];
    });

    // Light rays: tall, faint, gently swaying columns recolored per zone.
    for (let i = 0; i < BG.rayCount; i += 1) {
      const ray = this.add.rectangle(
        Phaser.Math.Between(60, GAME_WIDTH - 60),
        GAME_HEIGHT / 2,
        Phaser.Math.Between(40, 90),
        GAME_HEIGHT * 1.4,
        ZONES[0].ray,
        0.05
      ).setDepth(-11).setAngle(Phaser.Math.Between(-8, 8));
      this.rays.push(ray);
    }

    for (let i = 0; i < 36; i += 1) {
      const dot = this.add.image(Phaser.Math.Between(52, GAME_WIDTH - 52), Phaser.Math.Between(0, GAME_HEIGHT), 'dust-dot')
        .setScale(Phaser.Math.FloatBetween(0.24, 0.88))
        .setAlpha(Phaser.Math.FloatBetween(0.12, 0.34))
        .setDepth(-12)
        .setTint(i % 3 === 0 ? 0xffe191 : 0x8fefff);
      this.dust.push(dot);
    }

    // Foreground bubbles drift up past the camera — above gameplay (50-130),
    // below the top vignette (190) and UI (210). Large + faint so they never
    // obscure play.
    for (let i = 0; i < BG.foregroundBubbles; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.Between(26, 54),
        0xbff0ff,
        0.05
      ).setDepth(150);
      bubble.setStrokeStyle(2, 0xffffff, 0.08);
      this.fgBubbles.push(bubble);
    }

    this.topVignette = this.add.rectangle(0, 0, GAME_WIDTH, 126, 0x031024, 0.48).setOrigin(0).setDepth(190);
  }

  private scrollBackground(deltaMs: number): void {
    const dt = deltaMs / 1000;

    // Continuous altitude → fractional zone index, then a blended palette.
    const z = this.tower.elapsedSeconds / BG.secondsPerZone;
    const lo = Phaser.Math.Clamp(Math.floor(z), 0, ZONES.length - 1);
    const hi = Phaser.Math.Clamp(lo + 1, 0, ZONES.length - 1);
    const frac = Phaser.Math.Clamp(z - lo, 0, 1);
    const far = lerpColor(ZONES[lo].far, ZONES[hi].far, frac);
    const near = lerpColor(ZONES[lo].near, ZONES[hi].near, frac);
    const glow = lerpColor(ZONES[lo].glow, ZONES[hi].glow, frac);
    const ray = lerpColor(ZONES[lo].ray, ZONES[hi].ray, frac);

    this.bgGlow.setFillStyle(glow, 0.06);

    // Scroll + tint each parallax layer (far/dark/slow → near/bright/fast).
    this.bgLayers.forEach((panels, layer) => {
      const dy = this.tower.scrollSpeed * BG.parallax[layer] * dt;
      const tint = lerpColor(far, near, layer / (BG.parallax.length - 1));
      const dim = BG.layerTints[layer];
      const litTint = lerpColor(0x000000, tint, dim);
      for (const panel of panels) {
        panel.y += dy;
        if (panel.y >= GAME_HEIGHT * 1.5) panel.y -= GAME_HEIGHT * 2;
        panel.setTint(litTint);
      }
    });

    this.rays.forEach((r, index) => {
      r.setFillStyle(ray, 0.05);
      r.x += Math.sin(this.time.now / 1400 + index * 1.7) * 0.12;
      r.setAngle(Math.sin(this.time.now / 2600 + index) * 7);
    });

    this.dust.forEach((dot, index) => {
      dot.y += (this.tower.scrollSpeed * (0.18 + (index % 4) * 0.03)) * dt;
      dot.x += Math.sin(this.time.now / 700 + index) * 0.12;
      if (dot.y > GAME_HEIGHT + 12) dot.y = -12;
    });

    // Foreground bubbles rise faster than the scroll for a parallax-forward cue.
    this.fgBubbles.forEach((bubble, index) => {
      bubble.y -= (this.tower.scrollSpeed * 0.42 + index * 4) * dt;
      bubble.x += Math.sin(this.time.now / 900 + index * 2.1) * 0.25;
      if (bubble.y < -bubble.radius) {
        bubble.y = GAME_HEIGHT + bubble.radius;
        bubble.x = Phaser.Math.Between(40, GAME_WIDTH - 40);
      }
    });
  }

  private createUi(): void {
    const save = getSave();
    this.scoreText = this.add.text(28, 26, '0', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '42px',
      color: '#ffffff',
      stroke: '#05142a',
      strokeThickness: 8,
      shadow: { offsetY: 4, color: '#000000', blur: 8, fill: true }
    }).setDepth(210);

    this.bestText = this.add.text(31, 75, `BEST ${save.bestScore.toLocaleString()}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      color: '#8aefff'
    }).setDepth(210);

    this.timeText = this.add.text(GAME_WIDTH - 28, 32, '0.0s', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '28px',
      color: '#ffd65d',
      stroke: '#3a2600',
      strokeThickness: 6
    }).setOrigin(1, 0).setDepth(210);

    this.comboText = this.add.text(GAME_WIDTH / 2, 84, 'x1.00', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '25px',
      color: '#bff6ff',
      stroke: '#05142a',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(210);

    this.shieldIcon = this.add.image(GAME_WIDTH - 40, 89, 'soap-shield').setScale(0.42).setDepth(210).setAlpha(0.3);
  }

  private createTutorial(): void {
    const panel = this.add.rectangle(0, 0, 426, 114, 0x041326, 0.78).setStrokeStyle(3, 0x7deaff, 0.45);
    const title = this.add.text(0, -22, 'HOLD TO GROW', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '29px',
      color: '#ffffff',
      stroke: '#082041',
      strokeThickness: 7
    }).setOrigin(0.5);
    const body = this.add.text(0, 23, 'Release to shrink through danger.', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '21px',
      color: '#c7f8ff'
    }).setOrigin(0.5);

    this.tutorialGroup = this.add.container(GAME_WIDTH / 2, 188, [panel, title, body]).setDepth(220);
    this.tweens.add({ targets: this.tutorialGroup, y: 180, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.delayedCall(4800, () => {
      this.tweens.add({ targets: this.tutorialGroup, alpha: 0, y: 144, duration: 520, ease: 'Cubic.easeIn' });
    });
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.wakeAudio();
      this.hasInteracted = true;
      this.player.isHolding = true;
      this.pointerDownAt = this.time.now;
      this.activePointerX = pointer.x;
      this.tutorialGroup.setAlpha(Math.min(this.tutorialGroup.alpha, 0.45));
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) this.activePointerX = pointer.x;
    });

    this.input.on('pointerup', () => {
      const heldMs = this.time.now - this.pointerDownAt;
      this.player.isHolding = false;
      this.activePointerX = null;
      if (heldMs < 155 && this.hasInteracted) {
        this.player.puff();
        this.spawnBubbleBits(this.player.x, this.player.y + 20, 7, 0x9beeff);
        audio.puff();
      }
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.wakeAudio();
      this.player.isHolding = true;
      this.activePointerX = null;
    });
    this.input.keyboard?.on('keyup-SPACE', () => {
      this.player.isHolding = false;
      this.player.puff();
    });
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.player.targetX = Math.max(58, this.player.targetX - 58);
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.player.targetX = Math.min(GAME_WIDTH - 58, this.player.targetX + 58);
    });
  }

  private updateCollectibles(deltaMs: number): void {
    for (let i = this.collectibles.length - 1; i >= 0; i -= 1) {
      const item = this.collectibles[i];
      item.updateItem(deltaMs, this.tower.scrollSpeed);
      if (item.y > GAME_HEIGHT + 80 || item.collected) {
        if (item.collected && item.scene) {
          // Tween cleanup happens in collectTo; this branch simply removes references.
        } else {
          item.destroy();
        }
        this.collectibles.splice(i, 1);
      }
    }
  }

  private updateHazards(deltaMs: number): void {
    for (let i = this.spikeOrbs.length - 1; i >= 0; i -= 1) {
      const hazard = this.spikeOrbs[i];
      hazard.updateHazard(deltaMs, this.tower.scrollSpeed);
      if (hazard.y > GAME_HEIGHT + 90) {
        hazard.destroy();
        this.spikeOrbs.splice(i, 1);
      }
    }

    for (let i = this.lasers.length - 1; i >= 0; i -= 1) {
      const laser = this.lasers[i];
      laser.updateHazard(deltaMs, this.tower.scrollSpeed);
      if (laser.y > GAME_HEIGHT + 80) {
        laser.destroy();
        this.lasers.splice(i, 1);
      }
    }
  }

  private checkCollectibles(): void {
    const playerVec = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const collectRadius = this.player.getCollectRadius();

    for (const item of this.collectibles) {
      if (item.collected) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (distance <= collectRadius + item.radius) {
        this.handleCollect(item, playerVec);
      }
    }
  }

  private handleCollect(item: Collectible, playerVec: Phaser.Math.Vector2): void {
    const tint = item.type === 'ruby' ? 0xff4b6f : item.type === 'coin' ? 0xffd35c : item.type === 'shield' ? 0x7dffdf : 0x8fefff;
    item.collectTo(playerVec, () => item.destroy());

    if (item.type === 'shield') {
      this.spawnCollectBurst(item.x, item.y, tint);
      ringPulse(this, item.x, item.y, item.radius + 8, tint);
      this.player.grantShield();
      this.player.onCollect(0.5);
      this.showFloatText('SOAP SHIELD!', item.x, item.y, '#7dffdf', 23);
      audio.shieldPickup();
      return;
    }

    if (item.type === 'coin') this.coins += 1;
    if (item.type === 'gem' || item.type === 'pearl') this.gems += 1;
    if (item.type === 'ruby') this.rubies += 1;

    const result = this.combo.collect(item.type, item.value, this.player, this.time.now);
    this.score += result.score;

    // Rare, high-value pickups feel chunkier: bigger squash, ring pulse, tiny hit-stop.
    const punch = item.type === 'ruby' ? 1 : item.type === 'pearl' ? 0.65 : 0;
    this.player.onCollect(punch);

    // Collect burst escalates with combo length so a long chain visibly ramps.
    const comboBoost = Math.min(result.combo, 14) / 14;
    this.spawnCollectBurst(item.x, item.y, tint, comboBoost);
    if (punch > 0 || comboBoost > 0.5) {
      ringPulse(this, item.x, item.y, item.radius + 6, tint);
    }
    // Hit-stop only on rubies (rare, single-spawn). Pearls arrive in rows of 5,
    // so hit-stopping each would freeze the loop repeatedly and feel like lag.
    if (item.type === 'ruby') {
      this.hitStop(JUICE.hitStop.rich);
    }

    this.showFloatText(`+${result.score}`, item.x, item.y - 12, item.type === 'ruby' ? '#ff6d8a' : '#ffffff', 22 + comboBoost * 8);
    if (result.message) this.showComboBanner(result.message);

    audio.collect(item.type, result.combo);
  }

  private checkHazards(): void {
    if (this.player.isInvincible()) return;
    const hitRadius = this.player.getHitRadius();

    for (const hazard of this.spikeOrbs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);
      const hitDistance = hitRadius + hazard.radius * 0.82;
      if (d <= hitDistance) {
        this.handleHazardHit('spike');
        return;
      }
      // Near-miss: squeaked past without colliding → reward the tension once per orb.
      if (!hazard.nearMissed && d <= hitDistance + 26 && hazard.y > this.player.y) {
        hazard.nearMissed = true;
        audio.nearMiss();
      }
    }

    for (const laser of this.lasers) {
      if (laser.overlapsCircle(this.player.x, this.player.y, hitRadius * 0.92)) {
        this.handleHazardHit('laser');
        return;
      }
    }
  }

  private handleHazardHit(kind: 'spike' | 'laser'): void {
    if (this.player.consumeShield()) {
      this.showComboBanner('SOAPY SAVE!');
      this.spawnBubbleBits(this.player.x, this.player.y, 18, 0x7dffdf);
      ringPulse(this, this.player.x, this.player.y, this.player.getHitRadius(), 0x7dffdf, 120);
      flash(this, JUICE.flash.saveColor, JUICE.flash.saveAlpha, JUICE.flash.saveDuration);
      shake(this, 'light');
      this.score += 40;
      audio.shieldSave();
      return;
    }

    this.endRun(kind);
  }

  private endRun(kind: 'spike' | 'laser'): void {
    this.isRunOver = true;
    this.player.isHolding = false;
    this.player.popVisual();
    this.spawnBubbleBits(this.player.x, this.player.y, 34, kind === 'laser' ? 0xff3c67 : 0x9beeff);
    ringPulse(this, this.player.x, this.player.y, this.player.getHitRadius(), kind === 'laser' ? 0xff3c67 : 0x9beeff, 130);
    this.showComboBanner(kind === 'laser' ? 'POP ART!' : this.player.isLarge() ? 'TOO GREEDY!' : 'POP!');
    flash(this, JUICE.flash.popColor, JUICE.flash.popAlpha, JUICE.flash.popDuration);
    shake(this, 'pop');
    audio.pop();
    audio.stopAmbient();
    audio.stopMusic();

    // Compute from the run-start baseline (not the live cache) so a mid-run
    // pause-flush can't cause coins to be counted twice.
    const bestScore = Math.max(this.saveBaseline.bestScore, this.score);
    saveData({
      bestScore,
      totalCoins: this.saveBaseline.totalCoins + this.coins,
      gamesPlayed: this.saveBaseline.gamesPlayed + 1
    });

    const stats: RunStats = {
      score: this.score,
      bestScore,
      timeAlive: this.timeAlive,
      gems: this.gems,
      coins: this.coins,
      rubies: this.rubies,
      bestCombo: this.combo.bestCombo
    };

    this.time.delayedCall(900, () => {
      this.scene.start('GameOverScene', stats);
    });
  }

  private updateUi(): void {
    this.scoreText.setText(this.score.toLocaleString());
    this.comboText.setText(`x${this.combo.multiplier.toFixed(2)}  •  ${this.combo.combo}`);
    this.comboText.setAlpha(this.combo.combo > 0 ? 1 : 0.68);
    this.timeText.setText(`${this.timeAlive.toFixed(1)}s`);
    this.shieldIcon.setAlpha(this.player.shieldHits > 0 ? 1 : 0.25);
    this.shieldIcon.setScale(this.player.shieldHits > 0 ? 0.5 + Math.sin(this.time.now / 170) * 0.035 : 0.42);
  }

  // Pre-create the reusable text objects once (one-time texture cost, off the
  // hot path) so collecting clusters of pickups never allocates new Text.
  private createTextPools(): void {
    for (let i = 0; i < 12; i += 1) {
      const t = this.add.text(0, 0, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#061730',
        strokeThickness: 5
      }).setOrigin(0.5).setDepth(230).setVisible(false);
      this.floatPool.push(t);
    }
    for (let i = 0; i < 6; i += 1) {
      const b = this.add.text(0, 0, '', {
        fontFamily: 'Arial Black, Impact, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#061730',
        strokeThickness: 8
      }).setOrigin(0.5).setDepth(240).setVisible(false);
      this.bannerPool.push(b);
    }
  }

  private showComboBanner(text: string): void {
    const banner = this.bannerPool[this.bannerIndex];
    this.bannerIndex = (this.bannerIndex + 1) % this.bannerPool.length;
    this.tweens.killTweensOf(banner);

    let color = '#ffffff';
    if (text.includes('GREED') || text.includes('RISKY')) color = '#ffd65d';
    else if (text.includes('POP')) color = '#ff6d8a';
    else if (text.includes('SAVE')) color = '#7dffdf';

    banner.setText(text).setColor(color).setPosition(GAME_WIDTH / 2, 244).setScale(0.72).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: banner, y: 192, alpha: 0, scale: 1.08, duration: 820, ease: 'Cubic.easeOut', onComplete: () => banner.setVisible(false) });
  }

  private showFloatText(text: string, x: number, y: number, color: string, size = 20): void {
    const t = this.floatPool[this.floatIndex];
    this.floatIndex = (this.floatIndex + 1) % this.floatPool.length;
    this.tweens.killTweensOf(t);

    t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setScale(1).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, scale: 1.12, duration: 650, ease: 'Cubic.easeOut', onComplete: () => t.setVisible(false) });
  }

  private spawnCollectBurst(x: number, y: number, tint: number, boost = 0): void {
    // More particles flung further as the combo grows (boost 0..1).
    const count = 8 + Math.round(boost * 6);
    const reach = 1 + boost * 0.6;
    for (let i = 0; i < count; i += 1) {
      const p = this.add.image(x, y, 'dust-dot').setTint(tint).setDepth(125).setScale(Phaser.Math.FloatBetween(0.45, 0.9) * (1 + boost * 0.4));
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(18, 54) * reach;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.05,
        duration: Phaser.Math.Between(260, 480),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private spawnBubbleBits(x: number, y: number, count: number, tint: number): void {
    for (let i = 0; i < count; i += 1) {
      const bubble = this.add.circle(x, y, Phaser.Math.FloatBetween(4, 12), tint, Phaser.Math.FloatBetween(0.18, 0.52)).setDepth(126);
      bubble.setStrokeStyle(1, 0xffffff, 0.42);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(30, 132);
      this.tweens.add({
        targets: bubble,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - Phaser.Math.Between(20, 80),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(420, 800),
        ease: 'Cubic.easeOut',
        onComplete: () => bubble.destroy()
      });
    }
  }

  // Resume the shared audio context (autoplay policy) and start the ambient pad
  // plus the looping background music.
  private wakeAudio(): void {
    audio.ensure();
    audio.startAmbient();
    audio.startMusic();
  }

  // Freeze the manual simulation for `ms` of real time. The update loop checks
  // `hitStopUntil` and skips integration while frozen. Ignored if a freeze is
  // already in progress so rapid collects can't stack into a long stall.
  private hitStop(ms: number): void {
    if (this.time.now < this.hitStopUntil) return;
    this.hitStopUntil = this.time.now + ms;
  }
}
