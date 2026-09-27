# Nokintosh // Digicam Utility

Nokintosh is a focused, local-first browser editor for turning modern photos into
the character of early compact digital cameras.

It is intentionally **not** a general-purpose photo editor. The workflow is:

`Open → Pick a look → Adjust a few controls → Apply → Export`

There are no accounts, image-upload APIs, or server-side image-processing
requirements. Local photos are decoded and processed in the browser and stay on
the device. The optional **Use Sample** action fetches one sample image from the
configured public Telegraph Cloud file URL.

## What is actually in the app

### Digicam looks

The preset library currently contains **26 looks**:

- **Original**
- **JPEG**
- **CCD**
- **Filters:** B&W, Sepia, Negative, Warm, Cool, High Contrast
- **Camera 2:** Nokia, 1/4", iPhone3gs
- **Compact-camera profiles:** Sony Cyber-shot, Canon PowerShot, Canon Digital IXUS,
  Nikon COOLPIX, Fujifilm FinePix, Casio Exilim, Olympus CAMEDIA, Panasonic Lumix,
  Kodak EasyShare, Pentax Optio, Samsung Digimax, Early Camera Phone,
  Night Flash Compact
- **Collage** — a presentation/frame effect rather than a camera look

The named camera profiles are character presets, not claims of exact hardware
color-science replication.

### Core controls

The Effects panel exposes 14 digicam-oriented controls grouped as:

**Core**

`Grain`, `JPEG`, `Color Shift`, `Vignette`

**Optics**

`Softness`, `Sharpening`, `Bloom`, `Aberration`, `Flash`

**Tone**

`Exposure`, `Contrast`, `Saturation`, `Temperature`, `Fade`

These controls are deliberately narrower than a professional photo editor:
there are no layers, masks, curves, HSL, brushes, typography, crop tools,
selection tools, or timeline/compositing systems.

### Blur / Pixelate

**Blur / Pixelate** is a separate utility, not another camera preset.

It has two effect types:

- **Gaussian Blur**
- **Pixelate**

Each type has three application modes:

- **Uniform** — apply across the whole photo
- **Vignette** — keep the centre clearer and concentrate the effect toward the edges
- **Draw** — paint the affected area directly on the preview

Draw mode also has a brush-size control and a **Clear Draw** action. Draw strokes
are stored as normalized document state, so they participate in Apply, Undo, Redo,
and export.

### Image transforms and framing

The preview also supports:

- **Mirror horizontally**
- **Flip vertically**
- Click-to-toggle zoom
- Mouse-wheel zoom
- 100%–400% classic slider zoom with pan
- **Collage** frame, rendered inside the exported canvas

The mirror/flip state is part of the document history rather than a visual-only
CSS transform.

### Export

Export is client-side and renders the current document again at the requested
output size.

- **AVIF** — primary
- **WebP** — secondary
- **PNG** — compatibility fallback

The active Canvas2D renderer reports an 8192 px longest-edge ceiling. Touch
devices additionally use a 4096 px device cap to reduce memory pressure.

## Preview and performance

The interactive preview is intentionally limited to **1200 px on the longest
edge**. A small per-photo LRU cache stores recently rendered combinations so
switching back to recent looks can restore pixels without rerunning the complete
pipeline.

Rendering is staged:

1. Paint the source image immediately.
2. Yield to the browser.
3. Run the camera-look pipeline.
4. Apply named filters.
5. Apply mirror/flip.
6. Apply Gaussian Blur or Pixelate.
7. Apply the Collage frame.
8. Cache the finished preview when eligible.

The current renderer factory uses **Canvas 2D**. A separate WebGL2 implementation
is still present in `src/engine/glRenderer.ts` as an experimental/future path;
it is not the renderer currently selected by `createRenderer()`.

## Editing workflow

Preset, filter, blur/pixelate, transform, and slider changes are treated as a
live draft.

Press **Apply** (or `Ctrl+Enter`) to commit the current combination as one
history step.

- `Ctrl+Z` first cancels an unapplied draft, then undoes committed history.
- `Ctrl+Y` redoes committed history.
- `Ctrl+0` resets the document.
- The preview can be compared to the original by holding **Space** or using
  **Hold: Original**.

## Input support

The file loader accepts:

`JPEG`, `PNG`, `WebP`, `AVIF`, `GIF`, and `BMP`.

Input can come from the file picker, drag-and-drop, or clipboard paste.

## Project structure

```
src/
  engine/
    types.ts             core editor/effect types and control metadata
    presets.ts           data-driven camera-look presets
    canvasRenderer.ts    active Canvas2D camera-look renderer
    glRenderer.ts       experimental WebGL2 renderer
    renderer.ts          renderer interface + active factory
    specialEffect.ts     Gaussian Blur / Pixelate + Draw mask
    transform.ts         mirror / flip helpers
    frame.ts             Collage frame renderer
    export.ts            full-resolution render + encoding
    image.ts             image decoding and local preview source creation
    shaders.ts            GLSL sources for the experimental WebGL path
  state/
    useEditor.ts          document state, Apply, Undo/Redo
    usePreview.ts         renderer lifecycle, preview sizing, cache
  ui/
    App-facing Windows-style controls and panels
```

The engine layer does not import React UI code.

## Local development

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Serve the built output locally:

```bash
npm run preview
```

Use a Node.js version compatible with Vite 7. The project currently uses
React 19, Vite 7, TypeScript, and Tailwind CSS 4.

## Sample image and CORS

The built-in sample is loaded from:

`SAMPLE_IMAGE_URL` in `src/engine/image.ts`.

The sample URL currently points at the public `/file/*` endpoint of
Telegraph Cloud. Because that request crosses origins, the Telegraph Cloud
deployment must return an `Access-Control-Allow-Origin` value matching the
Nokintosh origin.

For local Vite development, the current Telegraph Cloud file handler includes:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

For a deployed Nokintosh instance, add its exact origin to the Telegraph Cloud
`CORS_ALLOWED_ORIGINS` configuration.

Nokintosh's service worker intentionally does **not** intercept cross-origin
requests, so the browser can apply the normal CORS rules directly.

## Design direction

The interface intentionally follows a compact Windows 2000 / early-XP utility
language: grey surfaces, hard borders, beveled controls, a classic title bar,
small practical menus, and restrained blue selection states.

It avoids gradients, glassmorphism, neon glow, cyberpunk styling, and generic
SaaS dashboard patterns.

## Documentation

- [docs/presets.md](docs/presets.md) // preset data and effect references
- [docs/effects.md](docs/effects.md) // engine/effect implementation notes

## License

MIT — see [LICENSE](LICENSE).
