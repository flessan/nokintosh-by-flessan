import { DEFAULT_PARAMS, type EffectParams, type Preset } from "./types";

/**
 * Preset library based on recognisable early-digital-camera character:
 * CCD-era compacts, consumer point-and-shoots, small flash cameras and
 * early camera phones. These are look profiles, not claims of exact hardware
 * calibration for a specific camera body.
 */
function preset(id: string, name: string, note: string, params: Partial<EffectParams>): Preset {
  return { id, name, note, params: { ...DEFAULT_PARAMS, ...params } };
}

export const PRESETS: Preset[] = [
  preset("none", "Original", "No processing applied.", {}),

  preset(
    "sony-cybershot",
    "Sony Cyber-shot",
    "Cool CCD colour, crisp JPEG detail and a slightly blue daylight balance.",
    {
      grain: 0.22,
      jpeg: 0.24,
      colorShift: 0.5,
      vignette: 0.16,
      softness: 0.08,
      sharpen: 0.72,
      bloom: 0.1,
      aberration: 0.13,
      fade: 0.06,
      temperature: -0.18,
      contrast: 0.22,
      saturation: 0.16,
    },
  ),

  preset(
    "canon-powershot",
    "Canon PowerShot",
    "Warm skin tones, punchy contrast and familiar early-2000s compact sharpness.",
    {
      grain: 0.25,
      jpeg: 0.22,
      colorShift: 0.42,
      vignette: 0.18,
      softness: 0.09,
      sharpen: 0.62,
      bloom: 0.12,
      aberration: 0.11,
      fade: 0.05,
      temperature: 0.22,
      exposure: 0.04,
      contrast: 0.28,
      saturation: 0.22,
    },
  ),

  preset(
    "canon-ixus",
    "Canon Digital IXUS",
    "Tiny-pocket flash camera: clean daylight, hard direct flash and clipped highlights.",
    {
      grain: 0.2,
      jpeg: 0.28,
      colorShift: 0.36,
      vignette: 0.34,
      softness: 0.06,
      sharpen: 0.64,
      bloom: 0.26,
      aberration: 0.14,
      flash: 0.58,
      temperature: 0.08,
      exposure: 0.06,
      contrast: 0.3,
      saturation: 0.14,
    },
  ),

  preset(
    "nikon-coolpix",
    "Nikon COOLPIX",
    "Neutral-to-cool CCD, deeper shadows, strong edge processing and modest grain.",
    {
      grain: 0.28,
      jpeg: 0.3,
      colorShift: 0.48,
      vignette: 0.2,
      softness: 0.12,
      sharpen: 0.68,
      bloom: 0.08,
      aberration: 0.16,
      fade: 0.04,
      temperature: -0.14,
      contrast: 0.32,
      saturation: 0.08,
    },
  ),

  preset(
    "fujifilm-finepix",
    "Fujifilm FinePix",
    "Soft CCD rendering with lively greens, blue skies and a gentle highlight glow.",
    {
      grain: 0.24,
      jpeg: 0.2,
      colorShift: 0.6,
      vignette: 0.12,
      softness: 0.16,
      sharpen: 0.4,
      bloom: 0.2,
      aberration: 0.12,
      fade: 0.08,
      temperature: 0.04,
      exposure: 0.03,
      contrast: 0.12,
      saturation: 0.3,
    },
  ),

  preset(
    "casio-exilim",
    "Casio Exilim",
    "Bright pocket-camera processing: saturated colour, crisp edges and clean faces.",
    {
      grain: 0.14,
      jpeg: 0.18,
      colorShift: 0.34,
      vignette: 0.1,
      softness: 0.05,
      sharpen: 0.78,
      bloom: 0.12,
      aberration: 0.1,
      temperature: 0.12,
      exposure: 0.08,
      contrast: 0.2,
      saturation: 0.3,
    },
  ),

  preset(
    "olympus-camedia",
    "Olympus CAMEDIA",
    "Warm consumer CCD with greenish shadows, visible JPEG texture and soft corners.",
    {
      grain: 0.3,
      jpeg: 0.38,
      colorShift: 0.62,
      vignette: 0.24,
      softness: 0.18,
      sharpen: 0.5,
      bloom: 0.14,
      aberration: 0.2,
      fade: 0.1,
      temperature: 0.18,
      exposure: 0.02,
      contrast: 0.2,
      saturation: 0.16,
    },
  ),

  preset(
    "panasonic-lumix",
    "Panasonic Lumix",
    "Cooler compact colour, high micro-contrast and a slightly clinical digital finish.",
    {
      grain: 0.18,
      jpeg: 0.22,
      colorShift: 0.4,
      vignette: 0.14,
      softness: 0.07,
      sharpen: 0.84,
      bloom: 0.07,
      aberration: 0.11,
      temperature: -0.24,
      contrast: 0.3,
      saturation: 0.12,
    },
  ),

  preset(
    "kodak-easyshare",
    "Kodak EasyShare",
    "Warm yellow bias, forgiving highlights and the unmistakable consumer JPEG crunch.",
    {
      grain: 0.3,
      jpeg: 0.36,
      colorShift: 0.54,
      vignette: 0.2,
      softness: 0.15,
      sharpen: 0.46,
      bloom: 0.22,
      aberration: 0.15,
      fade: 0.14,
      temperature: 0.3,
      exposure: 0.05,
      contrast: 0.16,
      saturation: 0.2,
    },
  ),

  preset(
    "pentax-optio",
    "Pentax Optio",
    "Small-sensor compact look: soft detail, slightly odd white balance and muddy blacks.",
    {
      grain: 0.34,
      jpeg: 0.44,
      colorShift: 0.58,
      vignette: 0.28,
      softness: 0.3,
      sharpen: 0.48,
      bloom: 0.12,
      aberration: 0.22,
      fade: 0.16,
      temperature: -0.06,
      contrast: 0.12,
      saturation: 0.04,
    },
  ),

  preset(
    "samsung-digimax",
    "Samsung Digimax",
    "Budget compact character with green-magenta colour errors and chunky JPEG detail.",
    {
      grain: 0.42,
      jpeg: 0.56,
      colorShift: 0.74,
      vignette: 0.3,
      softness: 0.26,
      sharpen: 0.52,
      bloom: 0.1,
      aberration: 0.26,
      fade: 0.18,
      temperature: -0.12,
      contrast: 0.18,
      saturation: 0.08,
    },
  ),

  preset(
    "early-camera-phone",
    "Early Camera Phone",
    "Tiny-sensor mush: high shadow noise, weak dynamic range and heavy JPEG damage.",
    {
      grain: 0.78,
      jpeg: 0.66,
      colorShift: 0.52,
      vignette: 0.24,
      softness: 0.48,
      sharpen: 0.36,
      bloom: 0.05,
      aberration: 0.3,
      fade: 0.24,
      temperature: -0.08,
      exposure: -0.08,
      contrast: 0.16,
      saturation: -0.12,
    },
  ),

  preset(
    "night-flash-compact",
    "Night Flash Compact",
    "2000s party snapshot: direct flash, black backgrounds, blown skin and sensor noise.",
    {
      grain: 0.5,
      jpeg: 0.42,
      colorShift: 0.38,
      vignette: 0.52,
      softness: 0.1,
      sharpen: 0.74,
      bloom: 0.32,
      aberration: 0.2,
      flash: 0.9,
      temperature: -0.1,
      exposure: 0.1,
      contrast: 0.38,
      saturation: 0.02,
    },
  ),
];

export const PRESET_MAP: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p]),
);

export function paramsEqual(a: EffectParams, b: EffectParams): boolean {
  return (Object.keys(a) as (keyof EffectParams)[]).every(
    (k) => Math.abs(a[k] - b[k]) < 0.0005,
  );
}
