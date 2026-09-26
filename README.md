# Nokintosh // Digicam Utility

Turn an ordinary modern photo into something that looks like it came off a
compact digital camera from the early 2000s: CCD colour crosstalk, sensor
noise, JPEG blocking, over-eager in-camera sharpening, harsh built-in flash and
a restrained vignette.

Everything runs in the browser. No account, no upload, no backend // the photo
never leaves the device.

```
Open → Add photo → Pick a look → Adjust a few controls → Export AVIF
```

## Features

- WebGL2 rendering pipeline with a Canvas 2D fallback
- Data-driven preset library (27 looks)
- 14 controls grouped as Core / Optics / Tone
- File picker, drag & drop and clipboard paste input
- Hold-to-compare against the original, explicit Apply workflow, plus undo / redo and reset
- AVIF export (first-class), with WebP and PNG as secondary formats
- Installable PWA, works offline after first load
- Click-to-zoom preview, mouse-wheel zoom and classic zoom slider

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

Requires Node 18+.

## Editing workflow

Preset selection, filter selection and slider changes are live draft edits. Press **Apply** (or `Ctrl+Enter`) to commit the current combination as one undoable history step. This lets a preset and several manual adjustments travel together through undo/redo. Previously rendered preset combinations are kept in a small per-photo LRU cache for fast revisits. Generic filters are grouped under Filters, while small-sensor/early-phone profiles are grouped under Camera 2.

## Architecture

```
src/
  engine/        image engine // no React imports anywhere in here
    types.ts        EffectParams, ControlDef, CONTROLS metadata
    presets.ts      preset data
    shaders.ts      GLSL ES 3.00 sources
    glRenderer.ts   WebGL2 renderer (multi-pass)
    canvasRenderer.ts  CPU fallback
    renderer.ts     Renderer interface + factory
    export.ts       full-resolution render and encoding
    image.ts        decoding helpers
  state/         React state: useEditor (document state), usePreview (renderer lifecycle)
  ui/            presentational Windows-2000-style components
```

Render order:

```
source
  → bright pass → blur H → blur V            (bloom chain, quarter resolution)
  → PASS A  optics (aberration, softness, sharpening)
            colour character (white balance, CCD crosstalk, tone, fade)
            bloom composite, sensor noise
  → PASS B  JPEG simulation (block DC estimate, luma/chroma quantisation,
            ringing, seams) + vignette + output dither
  → canvas
```

The preview renders at most 1200 px on the long edge; preset preview frames are cached per photo, while export re-renders the photo at the requested full output size in a throwaway context and encodes it there.

## Documentation

- [docs/presets.md](docs/presets.md) // adding a preset
- [docs/effects.md](docs/effects.md) // adding an effect

## License

MIT // see [LICENSE](LICENSE).
