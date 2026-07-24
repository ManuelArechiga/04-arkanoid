# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a from-scratch Arkanoid/Breakout clone. Per `README.md`, the goal is to build it with plain HTML, CSS, and JavaScript — zero dependencies, playable directly in a browser. The game itself is **not implemented yet**: the repo currently only contains asset files. There is no `index.html`, no build tooling, no package manager, and no test setup. When starting implementation, keep it dependency-free (no npm packages, bundlers, or frameworks) to match the stated goal — a static HTML/CSS/JS site that runs by opening the HTML file (or serving it) directly.

## Assets already in place

- `assets/spritesheet-breakout.png` — sprite sheet image with paddle, ball, block colors, and explosion animation frames.
- `assets/spritesheet.js` — plain-JS helper for the spritesheet, already written and ready to use:
  - `SPRITES` / `EXPLOSION_FRAMES`: coordinate tables (`sx, sy, sw, sh`) into the sheet for the paddle, ball, colored blocks (`blocks.<color>`), and per-color explosion animation frames (4 frames each, `EXPLOSION_DURATION = 150`ms).
  - `loadSpritesheet(cb)`: loads the PNG once (via an offscreen canvas), then invokes `cb`. Safe to call multiple times before load completes — callbacks queue up.
  - `drawSprite(ctx, name, x, y, w, h)`: draws a static sprite by name onto a canvas context. Block sprites use the `block_<color>` naming convention (e.g. `block_red`), which maps into `SPRITES.blocks`.
  - `drawFrame(ctx, frame, x, y, w, h)`: draws a single explosion animation frame object (one entry from `EXPLOSION_FRAMES[color]`).
  - Note: `loadSpritesheet` hardcodes the image path as `'assets/spritesheet-breakout.png'`, so any HTML entry point must be served/opened such that this relative path resolves correctly.
- `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` — sound effects for ball bounces and block breaks, not yet wired into any code.

## Working in this repo

- The README is written partly in Spanish; match that language if editing it.
- Since there's no framework or build step, new game code should be plain `.js`/`.css`/`.html` files wired together with a `<script>`/`<link>` tags.
