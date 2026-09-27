# Effects implementation notes

Nokintosh has two kinds of image effects.

## Camera controls

The 14 camera-look controls are declared in `src/engine/types.ts` through
`EffectParams` and `CONTROLS`. The active renderer is
`src/engine/canvasRenderer.ts`.

The camera pipeline intentionally models compact-digital characteristics such
as:

- sensor grain and chroma noise
- low-quality JPEG blocking/chroma damage
- CCD-style channel crosstalk
- lens softness
- in-camera sharpening
- bloom
- chromatic aberration
- direct flash falloff
- exposure / temperature / tone
- optical vignette and lifted blacks

An experimental WebGL2 implementation remains in `src/engine/glRenderer.ts`,
but `createRenderer()` currently selects Canvas2D.

## Blur / Pixelate

`src/engine/specialEffect.ts` contains the separate Blur / Pixelate tool.

It supports:

- `gaussian-blur`
- `pixelate`

Both can be applied as:

- `uniform` — the whole image
- `vignette` — strongest toward the outer edges
- `draw` — only inside user-painted strokes

Draw mode stores normalized points in editor state. This keeps the mask
independent of preview resolution and allows the same document state to be
re-rendered for export.

The draw mask is deliberately not part of `EffectParams`: it is a tool state,
not a camera-look characteristic.

## Rendering order

The current active path is:

```
source
  -> camera-look Canvas2D pipeline
  -> named filter
  -> mirror / flip
  -> Gaussian Blur or Pixelate
  -> Collage frame
  -> output canvas
```

The preview uses a capped working size. Export reruns the pipeline at the
selected output size.

## Design rule

Effects should remain purpose-driven. Nokintosh is a digicam utility, not a
general Photoshop-style editor, so new operations should earn their place by
contributing directly to the intended workflow.
