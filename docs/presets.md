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
