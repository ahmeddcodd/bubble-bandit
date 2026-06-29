import Phaser from 'phaser';
import { COLORS } from '../utils/constants';

// Small, additive-only gameplay perks tied to a character.
export type Perk = 'none' | 'startShield' | 'collectRadius' | 'slowStart';

export interface Character {
  id: string;
  name: string;
  cost: number; // coins; 0 = free/owned by default
  perk: Perk;
  perkBlurb: string;
  /**
   * Paint the character into a 96x104 texture (same canvas as the thief so it
   * sits identically inside the bubble). `null` means "use the existing
   * mood-variant `thief` textures" — the thief is special-cased in PreloadScene.
   */
  draw: ((g: Phaser.GameObjects.Graphics) => void) | null;
}

// All characters render at this size, matching createThiefTexture.
export const CHAR_W = 96;
export const CHAR_H = 104;

export const CHARACTERS: Character[] = [
  {
    id: 'thief',
    name: 'Bandit',
    cost: 0,
    perk: 'none',
    perkBlurb: 'The classic. No frills.',
    draw: null // uses the existing thief / thief-greed / thief-scared textures
  },
  {
    id: 'robot',
    name: 'Bolt',
    cost: 150,
    perk: 'startShield',
    perkBlurb: 'Starts each run with a shield.',
    draw: (g) => {
      // Metal head + antenna.
      g.fillStyle(0x9fb4c9, 1);
      g.fillRoundedRect(24, 30, 48, 50, 14);
      g.fillStyle(0x6c8299, 1);
      g.fillRoundedRect(24, 62, 48, 18, 10); // jaw shadow
      g.fillStyle(0xc7d6e6, 1);
      g.fillRoundedRect(28, 28, 40, 22, 10); // forehead highlight
      g.lineStyle(3, 0xc7d6e6, 1);
      g.strokeLineShape(new Phaser.Geom.Line(48, 30, 48, 16));
      g.fillStyle(COLORS.cyan, 1);
      g.fillCircle(48, 13, 5); // antenna bulb
      // Visor + glowing eyes.
      g.fillStyle(0x0b1422, 1);
      g.fillRoundedRect(30, 44, 36, 16, 8);
      g.fillStyle(COLORS.cyan, 1);
      g.fillCircle(40, 52, 4);
      g.fillCircle(56, 52, 4);
      g.fillStyle(COLORS.white, 0.9);
      g.fillCircle(40, 51, 1.6);
      g.fillCircle(56, 51, 1.6);
      // Mouth grille.
      g.lineStyle(2, 0x6c8299, 1);
      for (let i = 0; i < 4; i += 1) g.strokeLineShape(new Phaser.Geom.Line(40 + i * 5, 70, 40 + i * 5, 76));
      // Bolts.
      g.fillStyle(0x6c8299, 1);
      g.fillCircle(28, 36, 2.5);
      g.fillCircle(68, 36, 2.5);
    }
  },
  {
    id: 'cat',
    name: 'Whiskers',
    cost: 250,
    perk: 'collectRadius',
    perkBlurb: 'Wider reach — grabs more loot.',
    draw: (g) => {
      // Head.
      g.fillStyle(0xffb066, 1);
      g.fillRoundedRect(26, 34, 44, 44, 18);
      // Ears.
      g.fillStyle(0xffb066, 1);
      g.fillTriangle(28, 36, 24, 16, 42, 30);
      g.fillTriangle(68, 36, 72, 16, 54, 30);
      g.fillStyle(0xffd9b3, 1);
      g.fillTriangle(30, 34, 29, 22, 39, 31); // inner ears
      g.fillTriangle(66, 34, 67, 22, 57, 31);
      // Eyes.
      g.fillStyle(0x123012, 1);
      g.fillEllipse(39, 52, 7, 10);
      g.fillEllipse(57, 52, 7, 10);
      g.fillStyle(COLORS.green, 1);
      g.fillEllipse(39, 52, 4, 8);
      g.fillEllipse(57, 52, 4, 8);
      g.fillStyle(0x081008, 1);
      g.fillEllipse(39, 53, 1.6, 6);
      g.fillEllipse(57, 53, 1.6, 6);
      // Nose + whiskers.
      g.fillStyle(0xff7a9c, 1);
      g.fillTriangle(48, 62, 44, 59, 52, 59);
      g.lineStyle(1.5, 0xfff1e0, 0.8);
      g.strokeLineShape(new Phaser.Geom.Line(48, 64, 24, 60));
      g.strokeLineShape(new Phaser.Geom.Line(48, 65, 24, 66));
      g.strokeLineShape(new Phaser.Geom.Line(48, 64, 72, 60));
      g.strokeLineShape(new Phaser.Geom.Line(48, 65, 72, 66));
    }
  },
  {
    id: 'ninja',
    name: 'Shade',
    cost: 400,
    perk: 'slowStart',
    perkBlurb: 'Gentler start — tower speeds up slower.',
    draw: (g) => {
      // Hood.
      g.fillStyle(0x2a2140, 1);
      g.fillRoundedRect(22, 24, 52, 60, 22);
      g.fillStyle(0x1c1530, 1);
      g.fillRoundedRect(22, 40, 52, 22, 6); // mask band
      // Face slit.
      g.fillStyle(0xf6d8b8, 1);
      g.fillRoundedRect(28, 46, 40, 12, 6);
      // Eyes (sharp).
      g.fillStyle(0x101018, 1);
      g.fillTriangle(34, 49, 46, 49, 34, 55);
      g.fillTriangle(62, 49, 50, 49, 62, 55);
      // Headband tails.
      g.fillStyle(COLORS.ruby, 1);
      g.fillRoundedRect(20, 40, 6, 5, 2);
      g.fillTriangle(20, 40, 6, 44, 20, 50);
      g.fillTriangle(20, 45, 8, 58, 22, 52);
      // Headband across.
      g.fillStyle(COLORS.ruby, 1);
      g.fillRoundedRect(22, 38, 52, 6, 2);
    }
  }
];

export function getCharacter(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** Texture key the player/menu uses for a character's neutral look. */
export function charTextureKey(id: string): string {
  // The thief reuses its existing mood textures (key 'thief'); others use char-<id>.
  return id === 'thief' ? 'thief' : `char-${id}`;
}
