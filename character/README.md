# Fewly character

Fewly's pixel character reflects each user: their chosen look (and later their
habits) shows in every animation, from workouts to loading screens. This folder
is everything needed to draw and play that character.

Open pages through **Live Server** (http://). Opened as a plain file, the browser
blocks loading and recolouring.

## Folder layout

```
character/
  manifest.js            THE shared character: parts, variants, colours, list of animations
  README.md
  core/                  shared by every animation, never copied into animation folders
    character.js           engine: loads, stacks, recolours, plays, saves
    character.css          pixel-sharp scaling, floor, +1 popup
    generator/generate.py  makes first-draft sprites for any animation (dev only)
  animations/            one self-contained folder per animation
    running/
      animation.json       timing: frames, speed, reps, locked
      pose.py              the motion (skeleton poses for the generator)
      sprites/<part>/<variant>.png
  testing/
    check.html             validates everything: must show 0 errors
    demo.html              customiser and live preview
```

**If running looks wrong, everything specific to it is in `animations/running/`.**
Everything else is shared, so a fix in `core/` fixes every animation at once.

## Using the character on a page

```html
<link rel="stylesheet" href="character/core/character.css">
<div id="stage"></div>
<script src="character/manifest.js"></script>
<script src="character/core/character.js"></script>
<script>
  var player = FewlyCharacter.play(document.getElementById('stage'), 'running');
  // player.setCharacter(cfg)  change the look live
  // player.stop()             call when leaving the screen
</script>
```

These three lines are the only links any page needs. The engine finds
`animations/` from its own location, so pages can live in any folder.
With no `character` option it plays the user's saved character.

Other calls: `FewlyCharacter.load()`, `.save(cfg)`, `.defaults()`, `.normalize(cfg)`,
`.animation(name)`, `.validate()`.

## animation.json

```json
{ "label": "Running", "frames": 12, "frameMs": 70, "repEvery": 12, "locked": false }
```

- `frames`: columns in every sheet in this folder.
- `frameMs`: time per frame (higher is slower).
- `repEvery`: frames per rep; a +1 pops each time. 0 for none.
- `locked`: set to `true` once you hand edit the sprites in Piskel. The generator
  then refuses to overwrite them.

## Sprite sheet rules

- One frame is **32 × 48** px. Width = frames × 32. Height = 4 × 48 = **192**.
- Rows top to bottom: **far, mid, near, front**.
  - far: limbs on the far side of the body
  - mid: torso, head, hair, accessories
  - near: the near leg
  - front: the near arm
  - Leave a row transparent if the part has nothing at that depth.
- Within a depth, parts stack in `layerOrder`: body, top, bottom, shoes, hair, accessory.
- Transparent background, no anti-aliasing.
- Draw **only with key colours**:

| Part | Main | Shade |
|---|---|---|
| skin | `#FF0000` | `#800000` |
| hair | `#00FF00` | `#008000` |
| top | `#0000FF` | `#000080` |
| bottom | `#FFFF00` | `#808000` |
| shoes | `#00FFFF` | `#008080` |
| sole | `#FF00FF` | `#800080` |
| accessory | `#FF8000` | `#804000` |

Main becomes the user's colour; shade becomes 15% darker. Any other colour
(the eye is `#1C1C1C`) stays exactly as drawn.

## Editing in Piskel

1. Import `animations/<name>/sprites/<part>/<variant>.png` as a spritesheet, frame size 32 × 48.
   With 12 frames: 1 to 12 far, 13 to 24 mid, 25 to 36 near, 37 to 48 front.
2. Edit using a palette of the key colours only.
3. Export PNG with columns = the animation's `frames`, save over the same file.
4. Set `"locked": true` in that animation's `animation.json`.
5. Open `testing/check.html` (0 errors), then `testing/demo.html`.

## Adding things

**New animation (for example jumping jacks):**
1. Copy `animations/running/` to `animations/jumping-jacks/`.
2. Edit its `animation.json` (label, frames, speed) and rewrite its `pose.py`.
3. Add `'jumping-jacks'` to `animations` in `manifest.js`.
4. Run `python character/core/generator/generate.py jumping-jacks`.
5. Open `testing/check.html`.

**New variant (for example a cap):**
1. Add a painter for it in `core/generator/generate.py` (or draw it in Piskel).
2. Add `cap: 'Cap'` to that part's `variants` in `manifest.js`.
3. It needs a sheet in **every** animation folder. Regenerate unlocked animations;
   draw it by hand for locked ones. Until then, check.html warns and the app
   shows the default instead.

**Colour preset:** add a hex to that colour's `presets` in `manifest.js`.

**Renaming or removing a variant** users may have saved: add a step to `migrate()`
in `core/character.js` mapping the old name to the new one, and bump `version`
in `manifest.js`.

## Safety built in

- Saved characters are cleaned on load: unknown parts or bad colours fall back to defaults.
- A missing or wrong-sized sheet falls back to the part's default, then is skipped.
- An unknown or broken animation falls back to the first one listed.
- Locked animations can't be overwritten by the generator.
- With `prefers-reduced-motion` on, the first frame is shown still.
- Nothing throws; problems are logged to the console and listed in check.html.

## Animation status

| Animation | Sprites | Locked |
|---|---|---|
| running | generated | no |
