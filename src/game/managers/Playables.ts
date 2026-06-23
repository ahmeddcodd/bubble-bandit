// Thin wrapper around the YouTube Playables SDK (`ytgame` global). Every call is
// guarded so the game runs identically outside a Playables session — whether the
// SDK is absent (local dev) or present-but-not-in-session (the SDK script also
// loads on ordinary hosts like Vercel). This is the ONLY module that touches
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

// NOTE: every call below gates on isPlayables() (IN_PLAYABLES_ENV), NOT on the
// mere presence of `ytgame`. The SDK script loads on ordinary web hosts too
// (e.g. Vercel), where the real SDK methods misbehave outside a session — so we
// must treat "SDK present but not in a Playables session" exactly like "absent".

export function firstFrameReady(): void {
  if (!isPlayables()) return;
  try {
    sdk()!.game.firstFrameReady();
  } catch {
    /* no-op */
  }
}

export function gameReady(): void {
  if (!isPlayables()) return;
  try {
    sdk()!.game.gameReady();
  } catch {
    /* no-op */
  }
}

// --- Cloud save (session-only fallback when not in Playables) -------------

let memoryStore = '';

export function load(): Promise<string> {
  if (!isPlayables()) return Promise.resolve(memoryStore);
  return sdk()!.game.loadData().catch(() => '');
}

export function save(data: string): Promise<void> {
  if (!isPlayables()) {
    memoryStore = data;
    return Promise.resolve();
  }
  return sdk()!.game.saveData(data);
}

// --- System callbacks -----------------------------------------------------

export function onPause(callback: () => void): void {
  if (!isPlayables()) return;
  try {
    sdk()!.system.onPause(callback);
  } catch {
    /* no-op */
  }
}

export function onResume(callback: () => void): void {
  if (!isPlayables()) return;
  try {
    sdk()!.system.onResume(callback);
  } catch {
    /* no-op */
  }
}

/**
 * Outside a real Playables session audio is always enabled. We gate on
 * isPlayables() (IN_PLAYABLES_ENV) — NOT mere presence of `ytgame` — because the
 * SDK script also loads on plain web hosts (e.g. Vercel) where
 * `system.isAudioEnabled()` returns false and would wrongly mute the game.
 */
export function isAudioEnabled(): boolean {
  if (!isPlayables()) return true;
  try {
    return sdk()!.system.isAudioEnabled();
  } catch {
    return true;
  }
}

export function onAudioEnabledChange(callback: (enabled: boolean) => void): void {
  if (!isPlayables()) return;
  try {
    sdk()!.system.onAudioEnabledChange(callback);
  } catch {
    /* no-op */
  }
}

// --- Health logging -------------------------------------------------------

export function logError(): void {
  if (!isPlayables()) return;
  try {
    sdk()!.health.logError();
  } catch {
    /* no-op */
  }
}
