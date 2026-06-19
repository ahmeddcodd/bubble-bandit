import { SAVE_KEY } from './constants';

export interface SaveData {
  bestScore: number;
  totalCoins: number;
  gamesPlayed: number;
}

const fallback: SaveData = {
  bestScore: 0,
  totalCoins: 0,
  gamesPlayed: 0
};

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...fallback };
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestScore: Number(data.bestScore ?? 0),
      totalCoins: Number(data.totalCoins ?? 0),
      gamesPlayed: Number(data.gamesPlayed ?? 0)
    };
  } catch {
    return { ...fallback };
  }
}

export function saveData(data: SaveData): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // localStorage can be blocked in embedded browsers. The game still runs.
  }
}
