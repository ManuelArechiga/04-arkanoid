# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is an Arkanoid/Breakout clone built with plain HTML, CSS, and JavaScript — zero dependencies, playable by opening `index.html` directly in a browser (or serving it with any static file server). There is no build tooling, no package manager, and no test suite; verification is done by hand-testing in a browser (or via `node -c game.js` for a quick syntax check).

Two specs are implemented so far (see `specs/`):

- **`01-mvp-arkanoid`** — single-level MVP: 8x6 grid of colored blocks, paddle control via keyboard (arrows/A-D) and mouse, ball physics with wall/paddle bounce, lives, scoring, block-explosion animation, sound effects, and start/won/game-over screens with restart.
- **`02-niveles-progresivos`** — 10 procedurally-generated levels with increasing difficulty (faster ball, indestructible material blocks). Completing level 10 wins the game. Score accumulates across levels; lives reset to 3 at the start of each level. This spec also fixed three ball-physics bugs discovered during implementation (see "Known physics gotchas" below).

Both specs' full scope, decisions, and acceptance criteria live in `specs/*.md` — read those before making significant gameplay changes, since they document *why* things work the way they do.

## Architecture

Everything lives in a single `game.js` (no modules, no bundler — matches the project's zero-dependency goal). Rough shape:

- `CONFIG` — all tunable constants (canvas size, paddle/ball/block dimensions, per-level difficulty tables, bounce-angle and anti-stuck constants).
- `game` — the single mutable state object (`status`, `level`, `score`, `lives`, `blocks`, `paddle`, `ball`, `lastProgressTime`). `status` is a finite state machine: `START → PLAYING → (LEVEL_COMPLETE → PLAYING)* → WON`, with `PLAYING → GAME_OVER` on 0 lives, and `WON`/`GAME_OVER → PLAYING` on restart.
- Entity factories: `createBlocks()` (the fixed 8x6 destructible grid), `createIndestructibleBlocks(level)` (extra rows of unbreakable material blocks, procedurally placed), `createPaddle()`, `createBall(paddle)`.
- `setupLevel()` / `initGame()` — regenerate blocks/paddle/ball for the current level vs. a full fresh game (score/lives/level reset to 1).
- `updateBall()` — per-frame physics: movement, wall bounce, paddle bounce (`applyPaddleBounce`), block collision (`handleBlockCollision`), stuck-detection (`checkStuckBall`), and life loss.
- `render()` — dispatches to the draw function matching `game.status`.
- `gameLoop()` — the single `requestAnimationFrame` loop; only updates physics while `status === 'PLAYING'`.
- Input listeners (`keydown`/`keyup`/`click`/`mousemove`) drive both paddle movement and the state-machine transitions (`startGame`/`startNextLevel`/`resetGame`).

## Known physics gotchas (read before touching ball/collision code)

During spec `02`, three distinct bugs were found through simulation and manual play, all rooted in the original "pure mirror bounce" physics (`dy = -dy`, `dx` unchanged, from spec `01`). Each has a specific fix already in place — don't remove them without understanding why they exist:

1. **Periodic trajectories.** Pure mirror bounce off walls/blocks preserves `dx` magnitude forever, so the ball's path is fully deterministic and can enter an exact repeating cycle that never revisits a remaining block, making a level permanently uncompletable. Fixed by `applyPaddleBounce()`: paddle bounces perturb the mirror angle by up to `±CONFIG.PADDLE_BOUNCE_MAX_OFFSET_DEGREES`, proportional to how far from paddle-center the ball hit (dead center = no perturbation), clamped to `[PADDLE_BOUNCE_MIN_ANGLE, PADDLE_BOUNCE_MAX_ANGLE]`. Walls and blocks still use pure mirror bounce — only the paddle perturbs.
2. **Closed pockets between indestructible-block rows.** If each extra row picked its free (walkable) column independently, the two rows' free columns could misalign, sealing the ball inside a pocket it could never escape. Fixed in `createIndestructibleBlocks()`: a single free column is chosen once per level and reused across every extra row, guaranteeing one continuous vertical corridor.
3. **Cycles that never touch the paddle.** Even with (1) fixed, the ball can get stuck in a closed loop confined entirely to walls/blocks (pure mirror bounce there is untouched), which never gives the paddle-bounce perturbation a chance to run. Fixed by `checkStuckBall()`: if `CONFIG.STUCK_TIMEOUT_MS` elapses with no block destroyed and no paddle bounce (tracked via `game.lastProgressTime`), the ball's direction gets a random nudge (`±CONFIG.STUCK_NUDGE_MAX_DEGREES`), guaranteeing no level can stall forever.

If you change collision/bounce logic, re-verify against these three failure modes — see spec `02-niveles-progresivos.md`'s "Riesgos identificados" and "Decisiones tomadas y descartadas" for the full investigation and the simulation approach used to catch them (a synthetic paddle-chasing AI run through many simulated frames with a mocked `Date.now`, checking for exact position-cycle repetition).

## Assets

- `assets/spritesheet-breakout.png` — sprite sheet image with paddle, ball, block colors, indestructible material blocks (wood, brick_red, brick_purple, gray/stone), and explosion animation frames.
- `assets/spritesheet.js` — plain-JS helper for the spritesheet, ready to use:
  - `SPRITES` / `EXPLOSION_FRAMES`: coordinate tables (`sx, sy, sw, sh`) into the sheet for the paddle, ball, colored blocks (`blocks.<color>`), and per-color explosion animation frames (4 frames each, `EXPLOSION_DURATION = 150`ms). `SPRITES.blocks` includes both the 7 destructible colors (`gray, red, yellow, cyan, magenta, hotpink, green`) and the 4 indestructible materials (`wood, brick_red, brick_purple`, plus `gray` reused for stone).
  - `loadSpritesheet(cb)`: loads the PNG once (via an offscreen canvas), then invokes `cb`. Safe to call multiple times before load completes — callbacks queue up. `game.js`'s `gameLoop` only starts once this resolves.
  - `drawSprite(ctx, name, x, y, w, h)`: draws a static sprite by name. Block sprites use the `block_<color>` naming convention (e.g. `block_wood`), mapping into `SPRITES.blocks`.
  - `drawFrame(ctx, frame, x, y, w, h)`: draws a single explosion animation frame object (one entry from `EXPLOSION_FRAMES[color]`). Indestructible blocks never explode — only `destructible: true` blocks use this.
  - Note: `loadSpritesheet` hardcodes the image path as `'assets/spritesheet-breakout.png'`, so any HTML entry point must be served/opened such that this relative path resolves correctly.
- `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` — wired in via `playBallBounceSound()`/`playBreakSound()` in `game.js`. Indestructible-block hits play the bounce sound only (never the break sound).

## Working in this repo

- The README is written in Spanish; match that language if editing it.
- Since there's no framework or build step, new game code should be plain `.js`/`.css`/`.html` files wired together with a `<script>`/`<link>` tags.
- This project follows the spec-driven workflow (`/spec` to draft, `/spec-impl` to implement). Before making non-trivial gameplay changes, check `specs/` for an existing spec covering that area — if the behavior is spec'd, update the spec first rather than changing code by surprise.
