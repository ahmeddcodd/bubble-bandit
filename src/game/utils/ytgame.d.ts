// Minimal ambient declarations for the YouTube Playables SDK global, loaded via
// <script src="https://www.youtube.com/game_api/v1"></script> in index.html.
// Only the surface this game uses is declared. See:
// https://developers.google.com/youtube/gaming/playables/reference/sdk

interface YTGameGame {
  firstFrameReady(): void;
  gameReady(): void;
  saveData(data: string): Promise<void>;
  loadData(): Promise<string>;
}

interface YTGameSystem {
  /** Returns an unsubscribe function. */
  onPause(callback: () => void): () => void;
  /** Returns an unsubscribe function. */
  onResume(callback: () => void): () => void;
  isAudioEnabled(): boolean;
  /** Returns an unsubscribe function. */
  onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): () => void;
  getLanguage(): Promise<string>;
}

interface YTGameHealth {
  logError(): void;
  logWarning(): void;
}

interface YTGame {
  readonly IN_PLAYABLES_ENV: boolean;
  readonly SDK_VERSION: string;
  game: YTGameGame;
  system: YTGameSystem;
  health: YTGameHealth;
}

declare const ytgame: YTGame | undefined;

interface Window {
  ytgame?: YTGame;
}
