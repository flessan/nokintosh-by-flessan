# Adding a preset

Presets are plain data. Nothing in the rendering engine has to change.

1. Open `src/engine/presets.ts`.
2. Append an entry to the `PRESETS` array:

```ts
preset("mall-kiosk", "Mall Kiosk", "Fluorescent light, mushy detail, green cast.", {
  grain: 0.4,
  jpeg: 0.55,
  colorShift: 0.6,
  vignette: 0.28,
  softness: 0.3,
  sharpen: 0.35,
  temperature: -0.18,
  contrast: 0.12,
}),
```

Any key you leave out falls back to the neutral value in `DEFAULT_PARAMS`, so
you only describe what the look actually changes.

## Guidelines

- The result must still read as a **digital** photo, not a film emulation.
- Keep `grain` under ~0.5 unless the preset is explicitly a night/high-ISO look.
- `jpeg` above ~0.7 becomes very visible; reserve it for "cheap camera" looks.
- Pair strong `flash` values with a higher `vignette` // small flashes fall off fast.
- Give every preset a one-line `note`; it is shown in the status bar on hover.

## Parameter reference

| Key | Range | Effect |
| --- | --- | --- |
| `grain` | 0..1 | Luma speckle plus coloured shadow noise |
| `jpeg` | 0..1 | 8x8 blocking, chroma bleed, ringing |
| `colorShift` | 0..1 | CCD channel crosstalk, split shadow/highlight tint |
| `vignette` | 0..1 | Corner darkening |
| `softness` | 0..1 | Lens defocus |
| `sharpen` | 0..1 | In-camera unsharp halos |
| `bloom` | 0..1 | Highlight bleed |
| `aberration` | 0..1 | Lateral chromatic aberration |
| `flash` | 0..1 | Hot centre, fast falloff, cool cast |
| `fade` | 0..1 | Lifted blacks |
| `exposure` | -1..1 | Brightness in stops |
| `contrast` | -1..1 | Contrast and black crush |
| `saturation` | -1..1 | Colour intensity |
| `temperature` | -1..1 | Cold to warm white balance |


## Preview cache

Preset previews are cached per photo and output size after their first render. The cache uses a small least-recently-used window, so revisiting recent presets restores their pixels without rerunning the full CPU pipeline.


## Preset groups

The look browser separates generic filters from camera-character profiles. The **Filters** category contains B&W, Sepia, Negative, Warm, Cool, High Contrast, Cross Process, Chrome and Soft Flash. **Phones** contains the small-sensor / early-phone profiles Nokia, 1/4" and iPhone3gs. Other compact-camera profiles are grouped under **Cameras**.

## Photo frames

Frames are a separate document setting, not a camera preset. Select one from the
Frames panel and it is rendered into the exported image:

- `windows-98` — blue title bar, grey menu row and inset photo, based on the supplied reference
- `polaroid` — warm instant-print paper with a caption strip
- `film-strip` — dark 35mm rails and sprocket holes
- `contact-sheet` — large print plus three repeated miniature crops
- `lcd-playback` — compact-camera playback screen
- `collage` — paper mat / photo-card border

The frame preserves the source canvas dimensions and keeps the photograph at
its original aspect ratio.

Preset transforms are separate from the filter look and are committed through the same Apply/Undo workflow.


## Blur / Pixelate tool

Blur / Pixelate is intentionally separate from the camera-look preset list.

- **Gaussian Blur** uses a browser Gaussian blur pass.
- **Pixelate** uses hard nearest-neighbour blocks.
- Both support **Uniform** (whole image), **Vignette** (stronger toward the edges), and **Draw** (painted mask) modes.
- Draw mode stores normalized brush strokes in editor history, so the mask follows the document through Apply/Undo/Redo and export.
