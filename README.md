# Construction Diorama — Animated Isometric Building Time-Lapse

A premium animated SVG asset for a construction / architecture / interior-design
website hero. A miniature isometric diorama in which the **same crew of four
workers** builds the **same house** through one continuous 23.5-second
time-lapse: survey → excavation → delivery → **planning & 3D preview** (the
crew gathers around a plan table while a holographic sketch of the house
materialises on the plot) → foundation → columns → brick walls →
scaffolding → roof → finishes → landscaping → furnished interior → compound
wall & gate → car parking → the family arrives, parks, and walks into their
new home.

No dependencies. No build step. Works on any static host (including
Cloudflare Pages Free).

## Quick start

Open `index.html` in a browser — that's it. For a local server:

```bash
npx serve .        # or: python3 -m http.server
```

## Project structure

```
Project-1/
├── index.html        # Standalone preview page (scene + controls)
├── css/scene.css     # Scene styling, controls, walk-cycle/sway CSS animations
├── js/scene.js       # Scene generator + parametric timeline engine (~23.5s loop)
├── README.md
└── INTEGRATION.md    # Ready-to-copy prompt for integrating into another site
```

## Controls

| Control | Action |
|---|---|
| ▶ / ❚❚ | Play / pause (or `Space`) |
| ↺ | Replay (or `R`) |
| Slider | Scrub / inspect any moment of the timeline |
| 0.5× 1× 2× | Playback speed |
| Phase badge | Shows the current construction phase |

URL parameters for embedding/testing: `?t=0.5` (jump to 50 %, paused),
`?autoplay=0` (load paused), `?autoplay=1` (force play).

## How it works

- The whole scene is generated as **one SVG** from a shared isometric
  coordinate system (`x → down-right`, `y → down-left`, `z → up`), so every
  building part, worker, vehicle and prop stays spatially consistent.
- A small **parametric timeline engine** (`js/scene.js`) maps a master clock
  to ~150 keyframe tracks (grow, pop, drop-in, fade, waypoint walkers for the
  workers/lorry/car/family). Because state is recomputed from the clock every
  frame — and elements with no active track snap back to their initial
  state — scrubbing and looping are exact and never leave stale frames.
- Continuity details: the brick pallet visibly shrinks as walls rise; sand and
  cement are consumed by the foundation pour; the lorry reverses out and later
  returns with furniture crates; the front shell turns into a ghost cutaway to
  reveal the furnished interior, then closes up for the handover; the crew
  walks the compound-wall line as it rises, clocks out through the gate, and
  the family car steers up the driveway onto the parking pad before the
  family enters the house and the windows glow warm.
- Ambient CSS animations (walking legs, tree sway, drifting clouds, mixer
  drum, lorry wheels) run on the compositor and pause automatically with the
  scene.

## Embedding in your own page

Minimal version — three lines:

```html
<link rel="stylesheet" href="css/scene.css">
<div id="construction-scene"></div>
<script src="js/scene.js"></script>
```

A small JS API is exposed for host pages:

```js
ConstructionScene.play();  ConstructionScene.pause();
ConstructionScene.replay(); ConstructionScene.setTime(7.5); // seconds (0–23.5)
```

`prefers-reduced-motion` is respected (scene loads paused).

Tested: 60 fps on desktop and mobile viewports, responsive from 390 px up.
