import type { EffectParams } from "./types";
import type { ImageSource, Renderer } from "./renderer";

/**
 * Canvas 2D fallback. Used when WebGL2 is unavailable (old browsers, blocked
 * GPU). It reproduces the same pipeline stages at lower fidelity and is a
 * plain CPU loop over the pixel buffer.
 */
export class CanvasRenderer implements Renderer {
  readonly kind = "canvas2d" as const;
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private work: HTMLCanvasElement;
  private workCtx: CanvasRenderingContext2D;
  private source: ImageSource | null = null;
  srcWidth = 0;
  srcHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    this.work = document.createElement("canvas");
    this.workCtx = this.work.getContext("2d", { willReadFrequently: true })!;
  }

  get maxTextureSize() {
    return 8192;
  }

  setSource(source: ImageSource, width: number, height: number) {
    this.source = source;
    this.srcWidth = width;
    this.srcHeight = height;
  }

  resize(width: number, height: number) {
    this.canvas.width = Math.max(1, Math.round(width));
    this.canvas.height = Math.max(1, Math.round(height));
    this.work.width = this.canvas.width;
    this.work.height = this.canvas.height;
  }

  render(p: EffectParams) {
    if (!this.source) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const scale = Math.max(0.25, w / 1280);
    const wc = this.workCtx;

    wc.save();
    wc.filter = p.softness > 0.01 ? `blur(${(p.softness * 2.2 * scale).toFixed(2)}px)` : "none";
    wc.clearRect(0, 0, w, h);
    wc.drawImage(this.source as CanvasImageSource, 0, 0, w, h);
    wc.restore();

    const img = wc.getImageData(0, 0, w, h);
    const d = img.data;
    const block = Math.max(4, Math.round(8 * scale));
    const gain = Math.pow(2, p.exposure * 1.1);
    const tempR = 1 + p.temperature * 0.14;
    const tempB = 1 - p.temperature * 0.15;
    const sat = Math.max(0, 1 + p.saturation * 0.85);
    const con = 1 + p.contrast * 0.55;
    const crush = 0.012 + Math.max(p.contrast, 0) * 0.045;
    const s = p.colorShift;
    const jq = 0.012 + p.jpeg * p.jpeg * 0.16;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(cx, cy);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = d[i] / 255;
        let g = d[i + 1] / 255;
        let b = d[i + 2] / 255;

        const dx = (x - cx) / maxR;
        const dy = (y - cy) / maxR;
        const rad = Math.hypot(dx, dy);

        if (p.flash > 0.001) {
          const fall = 1 - Math.min(1, Math.max(0, (rad - 0.07) / 0.9));
          const fg = 1 + 0.55 * fall * p.flash;
          const dark = 1 - p.flash * 0.85 * (1 - (0.62 + 0.38 * fall));
          r *= fg * dark;
          g *= fg * dark;
          b *= fg * dark;
        }

        r *= gain * tempR;
        g *= gain;
        b *= gain * tempB;

        if (s > 0.001) {
          const nr = r * (1 + 0.1 * s) - g * 0.045 * s - b * 0.02 * s;
          const ng = -r * 0.06 * s + g * (1 + 0.05 * s) + b * 0.045 * s;
          const nb = -r * 0.015 * s - g * 0.07 * s + b * (1 + 0.13 * s);
          r = Math.pow(Math.max(nr, 0), 1 - 0.1 * s);
          g = Math.max(ng, 0);
          b = Math.pow(Math.max(nb, 0), 1 + 0.09 * s);
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const t = Math.min(1, Math.max(0, (l - 0.15) / 0.7));
          r += (-0.012 + t * 0.042) * s;
          g += (0.012 - t * 0.002) * s;
          b += (0.028 - t * 0.054) * s;
        }

        r = Math.max(0, (r - 0.5) * con + 0.5);
        g = Math.max(0, (g - 0.5) * con + 0.5);
        b = Math.max(0, (b - 0.5) * con + 0.5);
        r = Math.max(0, (r - crush) / (1 - crush));
        g = Math.max(0, (g - crush) / (1 - crush));
        b = Math.max(0, (b - crush) / (1 - crush));

        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = lum + (r - lum) * sat;
        g = lum + (g - lum) * sat;
        b = lum + (b - lum) * sat;

        if (p.fade > 0.001) {
          r = r * (1 - 0.14 * p.fade) + 0.075 * p.fade;
          g = g * (1 - 0.14 * p.fade) + 0.075 * p.fade;
          b = b * (1 - 0.14 * p.fade) + 0.075 * p.fade;
        }

        if (p.jpeg > 0.001) {
          // coarse luma / chroma quantisation on an 8x8 grid
          const bxr = ((x % block) - block / 2) / block;
          const byr = ((y % block) - block / 2) / block;
          const damp = 1 - p.jpeg * 0.25 * (Math.abs(bxr) + Math.abs(byr));
          let yy = 0.299 * r + 0.587 * g + 0.114 * b;
          const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;
          yy = Math.round(yy / jq) * jq * damp;
          const cq = 0.02 + p.jpeg * 0.1;
          const qcb = Math.round(cb / cq) * cq;
          const qcr = Math.round(cr / cq) * cq;
          r = yy + 1.402 * qcr;
          g = yy - 0.344136 * qcb - 0.714136 * qcr;
          b = yy + 1.772 * qcb;
        }

        if (p.grain > 0.001) {
          const shadow = 1 - Math.min(1, Math.max(0, (0.2126 * r + 0.7152 * g + 0.0722 * b) / 0.85));
          const amt = p.grain * (0.35 + 0.65 * shadow);
          const n = (Math.random() - 0.5) * 0.085 * amt;
          r += n + (Math.random() - 0.5) * 0.07 * amt;
          g += n + (Math.random() - 0.5) * 0.05 * amt;
          b += n + (Math.random() - 0.5) * 0.075 * amt;
        }

        if (p.vignette > 0.001) {
          const rr = rad * 1.414;
          const t = Math.min(1, Math.max(0, (rr - 0.38) / 0.64));
          const v = 1 - p.vignette * 0.75 * (t * t * (3 - 2 * t));
          r *= v;
          g *= v;
          b *= v;
        }

        d[i] = Math.min(255, Math.max(0, r * 255));
        d[i + 1] = Math.min(255, Math.max(0, g * 255));
        d[i + 2] = Math.min(255, Math.max(0, b * 255));
        d[i + 3] = 255;
      }
    }

    this.ctx.putImageData(img, 0, 0);
  }

  dispose() {
    this.work.width = 0;
    this.work.height = 0;
  }
}
