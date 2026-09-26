/**
 * Core types for the Nokintosh image engine.
 *
 * The engine is intentionally decoupled from React: a renderer receives a
 * source bitmap plus a plain `EffectParams` object and draws the result into a
 * canvas. Nothing in this folder imports UI code.
 */

/** Every adjustable value of the pipeline, normalised to 0..1 unless noted. */
export interface EffectParams {
  /** Sensor noise: luma + chroma speckle, stronger in shadows. */
  grain: number;
  /** Block artifacts, chroma bleed and ringing of a low quality JPEG. */
  jpeg: number;
  /** Cheap-sensor colour crosstalk / odd white balance. */
  colorShift: number;
  /** Optical darkening towards the frame corners. */
  vignette: number;
  /** Lens softness (defocus of a small plastic lens). */
  softness: number;
  /** In-camera sharpening halos. */
  sharpen: number;
  /** Highlight bleed around bright areas. */
  bloom: number;
  /** Lateral chromatic aberration at the edges. */
  aberration: number;
  /** Washed-out lifted blacks of an 8-bit JPEG pipeline. */
  fade: number;
  /** On-camera flash: hot centre, falloff, clipped highlights. */
  flash: number;
  /** Colour temperature, -1 (cold) .. +1 (warm). */
  temperature: number;
  /** Exposure in stops, -1 .. +1. */
  exposure: number;
  /** Contrast / black crush, -1 .. +1. */
  contrast: number;
  /** Colour saturation, -1 .. +1. */
  saturation: number;
}

export type ParamId = keyof EffectParams;

export type FilterMode =
  | "none"
  | "bw"
  | "sepia"
  | "negative"
  | "warm"
  | "cool"
  | "high-contrast";

export type FrameMode = "none" | "collage";

export interface ControlDef {
  id: ParamId;
  label: string;
  /** Short hint shown in the status bar on hover / focus. */
  hint: string;
  min: number;
  max: number;
  step: number;
  group: "core" | "optics" | "tone";
  /** true when the neutral position is the centre of the track. */
  bipolar?: boolean;
}

export interface Preset {
  id: string;
  name: string;
  /** One-line description shown under the preset list. */
  note: string;
  params: EffectParams;
  filter?: FilterMode;
  frame?: FrameMode;
}

export const DEFAULT_PARAMS: EffectParams = {
  grain: 0,
  jpeg: 0,
  colorShift: 0,
  vignette: 0,
  softness: 0,
  sharpen: 0,
  bloom: 0,
  aberration: 0,
  fade: 0,
  flash: 0,
  temperature: 0,
  exposure: 0,
  contrast: 0,
  saturation: 0,
};

/**
 * UI metadata for every parameter. Adding a control here makes it appear in the
 * Effects panel automatically; the renderer reads the value by the same id.
 */
export const CONTROLS: ControlDef[] = [
  {
    id: "grain",
    label: "Grain",
    hint: "Sensor noise. Luma speckle plus coloured shadow noise.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "core",
  },
  {
    id: "jpeg",
    label: "JPEG",
    hint: "Compression artifacts: 8x8 blocking, chroma bleed, ringing.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "core",
  },
  {
    id: "colorShift",
    label: "Color Shift",
    hint: "CCD-style channel crosstalk and imperfect white balance.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "core",
  },
  {
    id: "vignette",
    label: "Vignette",
    hint: "Optical darkening towards the corners of the frame.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "core",
  },
  {
    id: "softness",
    label: "Softness",
    hint: "Small plastic lens defocus.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "optics",
  },
  {
    id: "sharpen",
    label: "Sharpening",
    hint: "In-camera edge sharpening halos.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "optics",
  },
  {
    id: "bloom",
    label: "Bloom",
    hint: "Highlight bleed around bright areas.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "optics",
  },
  {
    id: "aberration",
    label: "Aberration",
    hint: "Lateral chromatic aberration towards the frame edges.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "optics",
  },
  {
    id: "flash",
    label: "Flash",
    hint: "Built-in flash: hot centre, fast falloff, clipped skin.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "optics",
  },
  {
    id: "exposure",
    label: "Exposure",
    hint: "Overall brightness in stops.",
    min: -1,
    max: 1,
    step: 0.01,
    group: "tone",
    bipolar: true,
  },
  {
    id: "contrast",
    label: "Contrast",
    hint: "Contrast and black crush.",
    min: -1,
    max: 1,
    step: 0.01,
    group: "tone",
    bipolar: true,
  },
  {
    id: "saturation",
    label: "Saturation",
    hint: "Colour intensity.",
    min: -1,
    max: 1,
    step: 0.01,
    group: "tone",
    bipolar: true,
  },
  {
    id: "temperature",
    label: "Temperature",
    hint: "White balance: cold to warm.",
    min: -1,
    max: 1,
    step: 0.01,
    group: "tone",
    bipolar: true,
  },
  {
    id: "fade",
    label: "Fade",
    hint: "Lifted blacks of a cheap 8-bit JPEG pipeline.",
    min: 0,
    max: 1,
    step: 0.01,
    group: "tone",
  },
];

export const GROUP_LABELS: Record<ControlDef["group"], string> = {
  core: "Core",
  optics: "Optics",
  tone: "Tone",
};
