export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;
export const SAFE_TOP = 38;
export const SAFE_BOTTOM = 24;

export const COLORS = {
  navy: 0x07172f,
  deep: 0x030711,
  gold: 0xffd35c,
  coin: 0xffc742,
  coinDark: 0xd58b21,
  cyan: 0x4fd4ff,
  cyanDark: 0x1376c8,
  bubble: 0x9beeff,
  bubbleCore: 0xd7fbff,
  ruby: 0xff4b6f,
  rubyDark: 0x9c153a,
  spike: 0xff4761,
  spikeDark: 0x7b1030,
  purple: 0x7c4dff,
  green: 0x8effbd,
  white: 0xffffff,
  black: 0x000000
} as const;

export const SAVE_KEY = 'bubble-bandit-save-v1';

export const PLAYER = {
  minScale: 0.62,
  maxScale: 1.72,
  baseRadius: 38,
  baseCollectRadius: 64,
  inflateSpeed: 1.2,
  shrinkSpeed: 1.55,
  gravity: 720,
  upwardAccel: -950,
  maxFall: 520,
  maxRise: -430,
  horizontalEase: 7.5,
  wallPadding: 54
} as const;

export const DIFFICULTY = {
  startScroll: 170,
  maxScroll: 370,
  scrollGainPerSecond: 3.1,
  collectibleSpawnMs: 455,
  hazardSpawnMs: 1080,
  laserFirstSecond: 19,
  rubyFirstSecond: 9
} as const;

// All gameplay-feel tuning lives here so juice can be dialled in one place.
export const JUICE = {
  shake: {
    light: { intensity: 0.005, duration: 110 },
    medium: { intensity: 0.008, duration: 150 },
    pop: { intensity: 0.013, duration: 280 }
  },
  hitStop: {
    rich: 70
  },
  flash: {
    popColor: 0xff3c67,
    popAlpha: 0.42,
    popDuration: 320,
    saveColor: 0x7dffdf,
    saveAlpha: 0.34,
    saveDuration: 260
  },
  ring: {
    duration: 300,
    growth: 2.6
  },
  // Amber warning the glow tints toward when the bubble is dangerously large.
  strainTint: 0xffb04a
} as const;
