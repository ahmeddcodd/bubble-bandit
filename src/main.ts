import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config';
import { initSave, flushSave } from './game/utils/save';
import { audio } from './game/managers/AudioManager';
import * as Playables from './game/managers/Playables';

// Full-screen "PAUSED" overlay shown while YouTube has the game paused. It's a
// DOM element (not a Phaser object) because the Phaser loop is asleep during
// pause and would not render a canvas overlay. No resume control — only YouTube
// can resume the game.
function createPauseOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.textContent = 'PAUSED';
  Object.assign(el.style, {
    position: 'fixed',
    inset: '0',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(3, 7, 17, 0.72)',
    color: '#bff6ff',
    font: '700 44px Arial Black, Impact, sans-serif',
    letterSpacing: '4px',
    textShadow: '0 4px 12px rgba(0,0,0,0.6)',
    zIndex: '9999',
    pointerEvents: 'none'
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  return el;
}

window.addEventListener('load', async () => {
  // Cloud snapshot must be loaded before any scene reads best score, and before
  // any saveData can be issued (SDK rejects saves made before loadData resolves).
  await initSave();

  const game = new Phaser.Game(gameConfig);
  const pauseOverlay = createPauseOverlay();

  // Pause: halt the whole Phaser loop (update + render, all scenes), silence
  // audio, show the overlay. MUST NOT use the Page Visibility API.
  // YouTube pause is also the sanctioned "you may be torn down" signal, so we
  // flush a cloud save here — this is what makes progress survive a reload.
  Playables.onPause(() => {
    void flushSave();
    game.loop.sleep();
    audio.suspend();
    pauseOverlay.style.display = 'flex';
  });

  Playables.onResume(() => {
    game.loop.wake();
    audio.resume();
    pauseOverlay.style.display = 'none';
  });
});
