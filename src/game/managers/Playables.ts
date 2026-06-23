// Thin wrapper around the YouTube Playables SDK (`ytgame` global). Every call is
// guarded so the game runs identically outside the Playables environment (local
// dev / Vercel), where the SDK is absent. This is the ONLY module that touches
// `ytgame` directly.

function sdk(): YTGame | undefined {
  return typeof window !== 'undefined' ? window.ytgame : undefined;
}

/** True only when actually running inside a YouTube Playables host. */
export function isPlayables(): boolean {
  const s = sdk();
  return !!s && s.IN_PLAYABLES_ENV === true;
}

// --- Lifecycle ------------------------------------------------------------

export function firstFrameReady(): void {
  try {
    sdk()?.game.firstFrameReady();
  } catch {
    /* no-op outside Playables */
  }
}

export function gameReady(): void {
  try {
    sdk()?.game.gameReady();
  } catch {
    /* no-op outside Playables */
  }
}

// --- Cloud save (session-only fallback when SDK absent) -------------------

let memoryStore = '';

export function load(): Promise<string> {
  const s = sdk();
  if (s) return s.game.loadData().catch(() => '');
  return Promise.resolve(memoryStore);
}

export function save(data: string): Promise<void> {
  const s = sdk();
  if (s) return s.game.saveData(data);
  memoryStore = data;
  return Promise.resolve();
}

// --- System callbacks -----------------------------------------------------

export function onPause(callback: () => void): void {
  try {
    sdk()?.system.onPause(callback);
  } catch {
    /* no-op */
  }
}

export function onResume(callback: () => void): void {
  try {
    sdk()?.system.onResume(callback);
  } catch {
    /* no-op */
  }
}

/** Outside Playables audio is always considered enabled. */
export function isAudioEnabled(): boolean {
  const s = sdk();
  if (!s) return true;
  try {
    return s.system.isAudioEnabled();
  } catch {
    return true;
  }
}

export function onAudioEnabledChange(callback: (enabled: boolean) => void): void {
  try {
    sdk()?.system.onAudioEnabledChange(callback);
  } catch {
    /* no-op */
  }
}

// --- Health logging -------------------------------------------------------

export function logError(): void {
  try {
    sdk()?.health.logError();
  } catch {
    /* no-op */
  }
}
