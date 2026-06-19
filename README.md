# Bubble Bandit

A 9:16 mobile-first Phaser 3 arcade prototype built with Vite + TypeScript.

**Core rule:** Hold to inflate, release to shrink, steal treasure, don't pop.

## Features in this build

- Phaser 3 + Vite + TypeScript project structure
- 9:16 portrait canvas at 540x960 with responsive FIT scaling
- Procedural high-contrast cartoon visuals, no external art assets needed
- Hold/release bubble size control
- Bubble size affects float/fall, collection radius and hitbox risk
- Gems, coins, ruby gems, star pearls and soap shield pickup
- Spike orb hazards and timed laser gates
- Combo multiplier with BIG GREED, TINY SQUEEZE, RISKY RICHES and SOAPY SAVE popups
- Score, best score, time survived and run stats
- Fast retry game over flow
- Lightweight WebAudio chimes after first player interaction

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
```

The production output will be in `dist/`.

## Controls

- Touch/click and hold: inflate and float upward
- Release: shrink and fall downward
- Move finger/mouse horizontally while holding: soft horizontal nudge
- Quick tap: puff bounce
- Keyboard debug: Space to inflate, Left/Right to nudge

## Notes

This is the polished MVP foundation. The next production layers should be object pooling, more hazard families, fan/steam physics, cosmetic unlocks, missions, daily seeded towers and the Pop Wizard boss.
