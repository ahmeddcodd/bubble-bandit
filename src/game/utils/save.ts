import * as Playables from '../managers/Playables';

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

// Cloud-only store. All persistence goes through the YouTube Playables cloud
// (Playables.load/save); there is no localStorage. A cached snapshot backs the
// synchronous getSave() so scenes can render immediately, while writes are
// gated on the initial load completing — the SDK rejects saveData before
// loadData has resolved.
let cache: SaveData = { ...fallback };
let loaded = false;

// Optional provider that folds in-progress run state into the snapshot right
// before a flush, so a reload mid-run (e.g. on YouTube pause) doesn't lose the
// coins/best-score earned so far. The active GameScene registers it; clearing
// it (null) on shutdown avoids stale references.
let progressProvider: (() => Partial<SaveData>) | null = null;

export function setProgressProvider(fn: (() => Partial<SaveData>) | null): void {
  progressProvider = fn;
}

function parse(raw: string): SaveData {
  if (!raw) return { ...fallback };
  try {
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

/**
 * Load the cloud snapshot once at boot. MUST resolve before any saveData call
 * is allowed to reach the SDK. Tolerant of empty / old-shape payloads.
 */
export async function initSave(): Promise<SaveData> {
  try {
    cache = parse(await Playables.load());
  } catch {
    cache = { ...fallback };
  }
  loaded = true;
  return cache;
}

/** Synchronous read of the cached snapshot (safe to call from scene create). */
export function getSave(): SaveData {
  return cache;
}

/**
 * Merge a patch into the snapshot and persist it. No-ops the cloud write until
 * the initial load has completed (per the SDK's await-loadData-first rule); the
 * cache still updates so in-session reads stay correct.
 */
export function saveData(patch: Partial<SaveData>): void {
  cache = { ...cache, ...patch };
  if (!loaded) return;
  Playables.save(JSON.stringify(cache)).catch(() => Playables.logError());
}

/**
 * Force an immediate persist of the current snapshot. Returns the save Promise
 * so callers (e.g. an onPause handler) can await the flush before teardown.
 * No-op until the initial load has completed.
 */
export function flushSave(): Promise<void> {
  if (!loaded) return Promise.resolve();
  if (progressProvider) cache = { ...cache, ...progressProvider() };
  return Playables.save(JSON.stringify(cache)).catch(() => Playables.logError());
}
