import type {
  DrawPoint,
  DrawStroke,
  SpecialEffectMode,
  SpecialEffectState,
} from "./types";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function cloneSpecialEffect(effect: SpecialEffectState): SpecialEffectState {
  return {
    ...effect,
    strokes: effect.strokes.map((stroke) => ({
      points: stroke.points.map((point) => ({ ...point })),
    })),
  };
}

export function sameSpecialEffect(a: SpecialEffectState, b: SpecialEffectState): boolean {
  if (
    a.kind !== b.kind ||
    a.mode !== b.mode ||
    Math.abs(a.amount - b.amount) > 0.0005 ||
    Math.abs(a.brushSize - b.brushSize) > 0.0005 ||
    a.strokes.length !== b.strokes.length
  ) {
    return false;
  }

  for (let i = 0; i < a.strokes.length; i++) {
    const ap = a.strokes[i].points;
    const bp = b.strokes[i].points;
    if (ap.length !== bp.length) return false;

    for (let j = 0; j < ap.length; j++) {
      if (Math.abs(ap[j].x - bp[j].x) > 0.0005 || Math.abs(ap[j].y - bp[j].y) > 0.0005) {
        return false;
      }
    }
  }

  return true;
}

export function specialEffectKey(effect: SpecialEffectState): string {
  return [
    effect.kind,
    effect.mode,
    effect.amount.toFixed(3),
    effect.brushSize.toFixed(3),
    JSON.stringify(effect.strokes),
  ].join(":");
}

function effectWeight(
  mode: SpecialEffectMode,
  amount: number,
  x: number,
  y: number,
  mask: Uint8ClampedArray | null,
  width: number,
) {
  if (mode === "uniform") return amount;

  if (mode === "vignette") {
    const dx = x / width - 0.5;
    const dy = y / (mask ? Math.max(1, mask.length / width / 4) : 1) - 0.5;
    const radius = Math.hypot(dx, dy);
    return amount * smoothstep(0.28, 0.72, radius);
  }

  if (!mask) return 0;
  const i = (y * width + x) * 4;
  return amount * (mask[i + 3] / 255);
}

function buildDrawMask(width: number, height: number, strokes: DrawStroke[], brushSize: number) {
  if (!strokes.length) return null;

  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const ctx = mask.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const lineWidth = Math.max(1, brushSize * Math.min(width, height));
  ctx.lineWidth = lineWidth;

  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.x * width, first.y * height);
    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x * width, point.y * height);
    }
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, width, height).data;
}

function createPixelated(
  source: HTMLCanvasElement,
  amount: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const result = document.createElement("canvas");
  result.width = width;
  result.height = height;
  const ctx = result.getContext("2d");
  if (!ctx) return result;

  const cell = Math.max(2, Math.round(2 + amount * 38));
  const lowW = Math.max(1, Math.ceil(width / cell));
  const lowH = Math.max(1, Math.ceil(height / cell));
  const low = document.createElement("canvas");
  low.width = lowW;
  low.height = lowH;

  const lowCtx = low.getContext("2d");
  if (!lowCtx) return result;
  lowCtx.imageSmoothingEnabled = false;
  lowCtx.drawImage(source, 0, 0, lowW, lowH);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(low, 0, 0, width, height);
  return result;
}

/**
 * Applies a targeted Gaussian blur or pixelation effect.
 *
 * Uniform affects the complete image, Vignette concentrates the effect near
 * the outer edges, and Draw limits it to the brush strokes recorded in state.
 */
export function applySpecialEffect(canvas: HTMLCanvasElement, effect: SpecialEffectState) {
  if (effect.kind === "none" || effect.amount <= 0.001) return;

  const width = canvas.width;
  const height = canvas.height;
  if (width < 1 || height < 1) return;

  const base = document.createElement("canvas");
  base.width = width;
  base.height = height;
  const baseCtx = base.getContext("2d", { willReadFrequently: true });
  if (!baseCtx) return;
  baseCtx.imageSmoothingEnabled = true;
  baseCtx.imageSmoothingQuality = "high";
  baseCtx.drawImage(canvas, 0, 0);

  let effected: HTMLCanvasElement;
  if (effect.kind === "gaussian-blur") {
    effected = document.createElement("canvas");
    effected.width = width;
    effected.height = height;
    const ctx = effected.getContext("2d");
    if (!ctx) return;

    const radius = Math.max(1, (1.5 + effect.amount * 26) * Math.max(0.5, width / 1280));
    ctx.filter = `blur(${radius.toFixed(2)}px)`;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(base, 0, 0);
  } else {
    effected = createPixelated(base, effect.amount, width, height);
  }

  const baseData = baseCtx.getImageData(0, 0, width, height);
  const effectCtx = effected.getContext("2d", { willReadFrequently: true });
  if (!effectCtx) return;
  const effectData = effectCtx.getImageData(0, 0, width, height);
  const mask =
    effect.mode === "draw"
      ? buildDrawMask(width, height, effect.strokes, effect.brushSize)
      : null;

  const out = baseData.data;
  const fx = effectData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = clamp01(effectWeight(effect.mode, effect.amount, x, y, mask, width));
      if (alpha <= 0.001) continue;

      out[i] = Math.round(out[i] * (1 - alpha) + fx[i] * alpha);
      out[i + 1] = Math.round(out[i + 1] * (1 - alpha) + fx[i + 1] * alpha);
      out[i + 2] = Math.round(out[i + 2] * (1 - alpha) + fx[i + 2] * alpha);
    }
  }

  const outputCtx = canvas.getContext("2d");
  if (outputCtx) outputCtx.putImageData(baseData, 0, 0);
}

export const SPECIAL_EFFECT_LABELS = {
  "gaussian-blur": "Gaussian Blur",
  pixelate: "Pixelate",
} as const;

export const SPECIAL_EFFECT_MODES: SpecialEffectMode[] = [
  "uniform",
  "vignette",
  "draw",
];

export function appendDrawStroke(
  effect: SpecialEffectState,
  points: DrawPoint[],
): SpecialEffectState {
  if (effect.kind === "none" || effect.mode !== "draw" || points.length === 0) return effect;
  const clean: DrawPoint[] = points.map((point) => ({
    x: clamp01(point.x),
    y: clamp01(point.y),
  }));
  return {
    ...effect,
    strokes: [...effect.strokes, { points: clean }],
  };
}
