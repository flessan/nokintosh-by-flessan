# Adding an effect

An effect is three small edits: a parameter, a shader change, and a uniform.

## 1. Declare the parameter

In `src/engine/types.ts`:

```ts
export interface EffectParams {
  // ...
  banding: number;
}

export const DEFAULT_PARAMS: EffectParams = {
  // ...
  banding: 0,
};

export const CONTROLS: ControlDef[] = [
  // ...
  {
    id: "banding",
    label: "Banding",
    hint: "Posterised gradients of an 8 bit sensor readout.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "core", // core | optics | tone
  },
];
```

The Effects panel is generated from `CONTROLS`, so the slider appears
automatically, including its label, value read-out and status-bar hint.

## 2. Implement it in the shader

Effects live in one of the two main fragment shaders in
`src/engine/shaders.ts`:

- `FRAG_MAIN` (pass A) // optics, colour character, bloom, sensor noise.
- `FRAG_POST` (pass B) // anything that needs the already-processed image, such
  as the JPEG simulation, vignette and output dither.

Add a uniform and the code in the correct stage:

```glsl
uniform float u_banding;
// ...
if (u_banding > 0.001) {
  float steps = mix(255.0, 18.0, u_banding);
  c = floor(c * steps + 0.5) / steps;
}
```

Keep effects resolution independent: multiply pixel-space distances by
`u_scale` (render width / 1280) so the preview and the full-size export match.

## 3. Upload the uniform

In `src/engine/glRenderer.ts`, inside `render()`:

```ts
gl.uniform1f(this.loc(pm, "u_banding"), p.banding);
```

## 4. Optional: mirror it in the CPU fallback

`src/engine/canvasRenderer.ts` runs when WebGL2 is unavailable. It processes
the same stages in the same order with a plain pixel loop. A missing effect
there degrades gracefully, but matching behaviour is preferred.

## Design rules

- Every control must contribute to the *old digital camera* look.
- Do not add generic photo-editor operations (crop, curves, text, filters).
- Neutral must mean "no change": a parameter of `0` (or `0` for bipolar
  controls) has to leave the pixels untouched.
