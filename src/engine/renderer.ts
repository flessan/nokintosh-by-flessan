import { CanvasRenderer } from "./canvasRenderer";
import { GLRenderer } from "./glRenderer";
import type { EffectParams } from "./types";

/** Anything the engine can accept as decoded pixels. */
export type ImageSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

export interface Renderer {
  readonly kind: "webgl2" | "canvas2d";
  readonly canvas: HTMLCanvasElement;
  readonly maxTextureSize: number;
  srcWidth: number;
  srcHeight: number;
  setSource(source: ImageSource, width: number, height: number): void;
  resize(width: number, height: number): void;
  render(params: EffectParams): void;
  dispose(): void;
}

/**
 * Creates a reliable renderer for a canvas element.
 *
 * A canvas can only have one rendering context. Trying WebGL first and then
 * falling back to 2D on the same canvas is not valid because a failed WebGL
 * context still claims the canvas. Keep the interactive renderer on Canvas 2D
 * for maximum browser compatibility; the WebGL renderer remains available as
 * an independent engine for a future offscreen/capability-tested path.
 */
export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  return new CanvasRenderer(canvas);
}

/** Fits (w,h) inside a square of `max` pixels without upscaling. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= max) return { width: w, height: h };
  const k = max / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}
