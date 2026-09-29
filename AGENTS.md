# AGENTS.md

Static, vanilla-JS game — no build, bundler, dependencies, tests, lint, or CI. Verification is manual: open `index.html` in a browser, or run `npx serve .` and play at `http://localhost:3000`.

## Architecture

- All logic lives in `game.js` (single file, plain ES6+, no modules). New features go there.
- `index.html` is only a shell: it loads `game.js` via plain `<script>` and hosts the canvas.
- Game loop: `loop(ts)` → `update(dt)` / `draw()`. Game state machine in `state`: `'playing' | 'dead' | 'gameover'` (restart via Space on gameover).

## Gotchas

- Canvas dimensions are duplicated: `<canvas width height>` in `index.html` AND `W`/`H` constants at the top of `game.js`. Change both together.
- `RADII`, `SPEEDS`, `POINTS` are lookup tables indexed by asteroid size 1–3 (index 0 unused); smaller asteroid = more points.
- Input: `keys` (held) vs `justPressed` (single-frame) — use `justPressed`/`pressed()` for one-shot actions, `keys` for held controls (rotate/thrust).
- Space is toroidal: all entities wrap via `wrap()`; don't add wall-collision behavior.

## Conventions

- User-facing strings (HUD, overlays) and README are Spanish — keep new UI text in Spanish.
- Comments are sparse Spanish one-liners only where needed; match that.
