import type { EffectParams, FilterMode } from "./types";
import type { ImageSource, Renderer } from "./renderer";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function hashNoise(x: number, y: number, seed = 0): number {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295 - 0.5;
}

function pixelIndex(x: number, y: number, w: number) {
  return (y * w + x) * 4;
}

function sampleChannel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
): number {
  const sx = Math.min(width - 1, Math.max(0, Math.round(x)));
  const sy = Math.min(height - 1, Math.max(0, Math.round(y)));
  return data[pixelIndex(sx, sy, width) + channel] / 255;
}

function sampleLuma(data: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const i = pixelIndex(
    Math.min(width - 1, Math.max(0, Math.round(x))),
    Math.min(height - 1, Math.max(0, Math.round(y))),
    width,
  );
  return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
}

/**
 * Browser-safe digicam renderer.
 *
 * The pipeline intentionally models digital compact-camera behaviour instead
 * of film emulation:
 * source -> optics -> exposure/white balance -> CCD colour -> sharpening ->
 * bloom -> tone -> JPEG damage -> sensor noise -> vignette -> dither.
 */
export class CanvasRenderer implements Renderer {
  readonly kind = "canvas2d" as const;
  readonly canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;
  private work: HTMLCanvasElement;
  private workCtx: CanvasRenderingContext2D;
  private bloom: HTMLCanvasElement;
  private bloomCtx: CanvasRenderingContext2D;
  private bloomBlur: HTMLCanvasElement;
  private bloomBlurCtx: CanvasRenderingContext2D;
  private source: ImageSource | null = null;

  srcWidth = 0;
  srcHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d", { alpha: false });
    const workCtx = (this.work = document.createElement("canvas")).getContext("2d", {
      willReadFrequently: true,
    });
    const bloomCtx = (this.bloom = document.createElement("canvas")).getContext("2d", {
      willReadFrequently: true,
    });
    const bloomBlurCtx = (this.bloomBlur = document.createElement("canvas")).getContext("2d", {
      willReadFrequently: true,
    });

    if (!ctx || !workCtx || !bloomCtx || !bloomBlurCtx) {
      throw new Error("Canvas 2D is unavailable.");
    }

    this.ctx = ctx;
    this.workCtx = workCtx;
    this.bloomCtx = bloomCtx;
    this.bloomBlurCtx = bloomBlurCtx;
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
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));

    this.canvas.width = w;
    this.canvas.height = h;
    this.work.width = w;
    this.work.height = h;

    // Bloom is deliberately quarter-resolution so it remains cheap on phones.
    const bw = Math.max(1, Math.ceil(w / 4));
    const bh = Math.max(1, Math.ceil(h / 4));
    this.bloom.width = bw;
    this.bloom.height = bh;
    this.bloomBlur.width = bw;
    this.bloomBlur.height = bh;
  }

  render(p: EffectParams, filter: FilterMode = "none") {
    if (!this.source) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w < 1 || h < 1) return;

    const scale = Math.max(0.25, w / 1280);
    const wc = this.workCtx;

    // Neutral mode should be instant. Apart from being cheaper, this makes
    // "Original" a reliable baseline for slow/mobile Canvas2D implementations.
    const neutral =
      p.grain === 0 &&
      p.jpeg === 0 &&
      p.colorShift === 0 &&
      p.vignette === 0 &&
      p.softness === 0 &&
      p.sharpen === 0 &&
      p.bloom === 0 &&
      p.aberration === 0 &&
      p.fade === 0 &&
      p.flash === 0 &&
      p.temperature === 0 &&
      p.exposure === 0 &&
      p.contrast === 0 &&
      p.saturation === 0 &&
      filter === "none";

    if (neutral) {
      this.ctx.clearRect(0, 0, w, h);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = "high";
      this.ctx.drawImage(this.source as CanvasImageSource, 0, 0, w, h);
      return;
    }

    // ---- source + plastic-lens softness ----
    wc.save();
    wc.clearRect(0, 0, w, h);
    wc.imageSmoothingEnabled = true;
    wc.imageSmoothingQuality = "high";
    wc.filter =
      p.softness > 0.001 ? `blur(${(p.softness * 2.4 * scale).toFixed(2)}px)` : "none";
    wc.drawImage(this.source as CanvasImageSource, 0, 0, w, h);
    wc.restore();

    const baseImage = wc.getImageData(0, 0, w, h);
    const sourceData = new Uint8ClampedArray(baseImage.data);
    const d = baseImage.data;

    // ---- highlight bloom pass (quarter resolution) ----
    let bloomData: ImageData | null = null;
    if (p.bloom > 0.001) {
      const bw = this.bloom.width;
      const bh = this.bloom.height;

      this.bloomCtx.save();
      this.bloomCtx.clearRect(0, 0, bw, bh);
      this.bloomCtx.imageSmoothingEnabled = true;
      this.bloomCtx.imageSmoothingQuality = "medium";
      this.bloomCtx.drawImage(this.work, 0, 0, bw, bh);
      this.bloomCtx.restore();

      const bright = this.bloomCtx.getImageData(0, 0, bw, bh);
      const bd = bright.data;
      for (let i = 0; i < bd.length; i += 4) {
        const r = bd[i] / 255;
        const g = bd[i + 1] / 255;
        const b = bd[i + 2] / 255;
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const weight = clamp01((l - 0.58) / 0.42) * p.bloom;
        bd[i] = Math.min(255, r * weight * 255);
        bd[i + 1] = Math.min(255, g * weight * 255);
        bd[i + 2] = Math.min(255, b * weight * 255);
        bd[i + 3] = 255;
      }
      this.bloomCtx.putImageData(bright, 0, 0);

      this.bloomBlurCtx.save();
      this.bloomBlurCtx.clearRect(0, 0, bw, bh);
      this.bloomBlurCtx.filter = `blur(${(2.5 + p.bloom * 7).toFixed(2)}px)`;
      this.bloomBlurCtx.drawImage(this.bloom, 0, 0);
      this.bloomBlurCtx.restore();

      bloomData = this.bloomBlurCtx.getImageData(0, 0, bw, bh);
    }

    const cx = w * 0.5;
    const cy = h * 0.5;
    const invDiag = 1 / Math.hypot(w * 0.5, h * 0.5);

    // ---- optics + sensor/tone pass ----
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = pixelIndex(x, y, w);

        const nx = (x - cx) * invDiag;
        const ny = (y - cy) * invDiag;
        const rad = Math.hypot(nx, ny);

        // Cheap compact-camera lens: aberration expands toward corners.
        const aberrationShift = p.aberration * rad * rad * 2.6 * scale;
        let r = sampleChannel(sourceData, w, h, x + nx * aberrationShift, y + ny * aberrationShift, 0);
        let g = sampleChannel(sourceData, w, h, x, y, 1);
        let b = sampleChannel(sourceData, w, h, x - nx * aberrationShift, y - ny * aberrationShift, 2);

        // In-camera sharpening. The 4-neighbour estimate creates the slight
        // crunchy edge halos common to older JPEG cameras.
        if (p.sharpen > 0.001) {
          const blur =
            (sampleLuma(sourceData, w, h, x - 1.5 * scale, y) +
              sampleLuma(sourceData, w, h, x + 1.5 * scale, y) +
              sampleLuma(sourceData, w, h, x, y - 1.5 * scale) +
              sampleLuma(sourceData, w, h, x, y + 1.5 * scale)) *
            0.25;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const edge = lum - blur;
          const sharp = p.sharpen * 1.25;
          r += edge * sharp;
          g += edge * sharp;
          b += edge * sharp;
        }

        // On-camera flash: hot centre, fast falloff, slight cool cast.
        if (p.flash > 0.001) {
          const fall = 1 - Math.min(1, Math.max(0, (rad - 0.05) / 0.9));
          const hotspot = 1 + 0.72 * fall * p.flash;
          r *= hotspot * (1 - 0.06 * p.flash);
          g *= hotspot;
          b *= hotspot * (1 + 0.055 * p.flash);
        }

        // Exposure and imperfect white balance.
        const gain = Math.pow(2, p.exposure * 1.1);
        r *= gain * (1 + p.temperature * 0.14);
        g *= gain * (1 - Math.abs(p.temperature) * 0.012);
        b *= gain * (1 - p.temperature * 0.15);

        // CCD-style crosstalk / nonlinear channel response.
        const s = p.colorShift;
        if (s > 0.001) {
          const nr = r * (1 + 0.10 * s) - g * 0.045 * s - b * 0.020 * s;
          const ng = -r * 0.060 * s + g * (1 + 0.050 * s) + b * 0.045 * s;
          const nb = -r * 0.015 * s - g * 0.070 * s + b * (1 + 0.130 * s);
          r = Math.pow(Math.max(0, nr), 1 - 0.10 * s);
          g = Math.max(0, ng);
          b = Math.pow(Math.max(0, nb), 1 + 0.09 * s);

          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const t = clamp01((l - 0.15) / 0.7);
          r += (-0.012 + t * 0.042) * s;
          g += (0.012 - t * 0.002) * s;
          b += (0.028 - t * 0.054) * s;
        }

        // Old compact cameras commonly had strong contrast with clipped
        // highlights and very slightly crushed blacks.
        const contrast = 1 + p.contrast * 0.55;
        r = Math.max(0, (r - 0.5) * contrast + 0.5);
        g = Math.max(0, (g - 0.5) * contrast + 0.5);
        b = Math.max(0, (b - 0.5) * contrast + 0.5);

        const crush = Math.max(p.contrast, 0) * 0.045;
        if (crush > 0) {
          r = Math.max(0, (r - crush) / (1 - crush));
          g = Math.max(0, (g - crush) / (1 - crush));
          b = Math.max(0, (b - crush) / (1 - crush));
        }

        // Short digital shoulder before the hard sensor/JPEG clip.
        const clip = (v: number) => Math.min(1.05, v - Math.max(v - 0.86, 0) * 0.42);
        r = Math.max(0, clip(r));
        g = Math.max(0, clip(g));
        b = Math.max(0, clip(b));

        // Saturation.
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const sat = 1 + p.saturation * 0.85;
        r = lum + (r - lum) * sat;
        g = lum + (g - lum) * sat;
        b = lum + (b - lum) * sat;

        // JPEG-style lifted blacks / camera fade.
        if (p.fade > 0.001) {
          const f = p.fade;
          r = r * (1 - 0.14 * f) + 0.075 * f;
          g = g * (1 - 0.14 * f) + 0.075 * f;
          b = b * (1 - 0.14 * f) + 0.075 * f;
        }

        // Highlight bloom is screen-like, not a white overlay.
        if (bloomData) {
          const bx = Math.min(this.bloom.width - 1, Math.max(0, Math.round((x / w) * this.bloom.width)));
          const by = Math.min(this.bloom.height - 1, Math.max(0, Math.round((y / h) * this.bloom.height)));
          const bi = pixelIndex(bx, by, this.bloom.width);
          const br = (bloomData.data[bi] / 255) * p.bloom * 1.1;
          const bg = (bloomData.data[bi + 1] / 255) * p.bloom * 1.1;
          const bb = (bloomData.data[bi + 2] / 255) * p.bloom * 1.1;
          r = 1 - (1 - clamp01(r)) * (1 - clamp01(br));
          g = 1 - (1 - clamp01(g)) * (1 - clamp01(bg));
          b = 1 - (1 - clamp01(b)) * (1 - clamp01(bb));
        }

        d[i] = Math.round(clamp01(r) * 255);
        d[i + 1] = Math.round(clamp01(g) * 255);
        d[i + 2] = Math.round(clamp01(b) * 255);
        d[i + 3] = 255;
      }
    }

    // ---- JPEG simulation: block quantisation + chroma subsampling ----
    if (p.jpeg > 0.001) {
      const block = Math.max(4, Math.round(8 * scale));
      const qLuma = 0.0025 + p.jpeg * p.jpeg * 0.055;
      const qChroma = 0.008 + p.jpeg * 0.085;
      const preJpeg = new Uint8ClampedArray(d);

      // Work block-by-block so the expensive block statistics are calculated
      // once instead of once per pixel.
      for (let by = 0; by < h; by += block) {
        for (let bx = 0; bx < w; bx += block) {
          const sx0 = Math.min(w - 1, bx + Math.floor(block * 0.25));
          const sx1 = Math.min(w - 1, bx + Math.floor(block * 0.75));
          const sy0 = Math.min(h - 1, by + Math.floor(block * 0.25));
          const sy1 = Math.min(h - 1, by + Math.floor(block * 0.75));

          const s0 = pixelIndex(sx0, sy0, w);
          const s1 = pixelIndex(sx1, sy0, w);
          const s2 = pixelIndex(sx0, sy1, w);
          const s3 = pixelIndex(sx1, sy1, w);
          const samples = [s0, s1, s2, s3];

          let yMean = 0;
          let cbMean = 0;
          let crMean = 0;

          for (const si of samples) {
            const sr = preJpeg[si] / 255;
            const sg = preJpeg[si + 1] / 255;
            const sb = preJpeg[si + 2] / 255;
            yMean += 0.299 * sr + 0.587 * sg + 0.114 * sb;
            cbMean += -0.168736 * sr - 0.331264 * sg + 0.5 * sb;
            crMean += 0.5 * sr - 0.418688 * sg - 0.081312 * sb;
          }

          yMean *= 0.25;
          cbMean *= 0.25;
          crMean *= 0.25;

          const maxX = Math.min(w, bx + block);
          const maxY = Math.min(h, by + block);

          for (let y = by; y < maxY; y++) {
            for (let x = bx; x < maxX; x++) {
              const i = pixelIndex(x, y, w);
              const r0 = preJpeg[i] / 255;
              const g0 = preJpeg[i + 1] / 255;
              const b0 = preJpeg[i + 2] / 255;

              let yy = 0.299 * r0 + 0.587 * g0 + 0.114 * b0;
              let cb = -0.168736 * r0 - 0.331264 * g0 + 0.5 * b0;
              let cr = 0.5 * r0 - 0.418688 * g0 - 0.081312 * b0;

              // Quantise luma while pulling chroma toward the block average.
              yy = Math.round((yy + (yMean - yy) * p.jpeg * 0.45) / qLuma) * qLuma;
              cb = Math.round((cb + (cbMean - cb) * p.jpeg) / qChroma) * qChroma;
              cr = Math.round((cr + (crMean - cr) * p.jpeg) / qChroma) * qChroma;

              // Slight block-edge ringing/seam.
              const fx = (x - bx) / block;
              const fy = (y - by) / block;
              const edge = Math.min(fx, fy, 1 - fx, 1 - fy);
              yy *= 1 - Math.max(0, 0.018 - edge * 0.018) * p.jpeg;

              d[i] = Math.round(clamp01(yy + 1.402 * cr) * 255);
              d[i + 1] = Math.round(clamp01(yy - 0.344136 * cb - 0.714136 * cr) * 255);
              d[i + 2] = Math.round(clamp01(yy + 1.772 * cb) * 255);
            }
          }
        }
      }
    }

    // ---- sensor noise / chroma speckle ----
    if (p.grain > 0.001) {
      const seed = Math.round(p.grain * 997);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = pixelIndex(x, y, w);
          const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          const shadowWeight = 0.35 + (1 - smoothstep(lum, 0, 0.85)) * 0.65;
          const amount = p.grain * shadowWeight;

          const n = hashNoise(x, y, seed) * 0.12 * amount;
          const chroma = hashNoise(Math.floor(x * 0.35), Math.floor(y * 0.35), seed + 17) * 0.09 * amount;

          d[i] = Math.round(clamp01(d[i] / 255 + n + chroma * 0.9) * 255);
          d[i + 1] = Math.round(clamp01(d[i + 1] / 255 + n + chroma * 0.7) * 255);
          d[i + 2] = Math.round(clamp01(d[i + 2] / 255 + n + chroma) * 255);
        }
      }
    }

    // ---- optical vignette ----
    if (p.vignette > 0.001) {
      for (let y = 0; y < h; y++) {
        const ny = (y - cy) * invDiag;
        for (let x = 0; x < w; x++) {
          const nx = (x - cx) * invDiag;
          const rad = Math.hypot(nx, ny);
          const t = clamp01((rad - 0.35) / 0.72);
          const smooth = t * t * (3 - 2 * t);
          const factor = 1 - p.vignette * 0.75 * smooth;
          const i = pixelIndex(x, y, w);
          d[i] = Math.round(d[i] * factor);
          d[i + 1] = Math.round(d[i + 1] * factor);
          d[i + 2] = Math.round(d[i + 2] * factor);
        }
      }
    }

    // ---- named digital filter ----
    // Applied after the camera character so the filter changes the final
    // image appearance without pretending to be a physical sensor effect.
    if (filter !== "none") {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = pixelIndex(x, y, w);
          let r = d[i] / 255;
          let g = d[i + 1] / 255;
          let b = d[i + 2] / 255;

          if (filter === "bw") {
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const c = (lum - 0.5) * 1.08 + 0.5;
            r = g = b = clamp01(c);
          } else if (filter === "sepia") {
            const nr = 0.393 * r + 0.769 * g + 0.189 * b;
            const ng = 0.349 * r + 0.686 * g + 0.168 * b;
            const nb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = clamp01(nr);
            g = clamp01(ng);
            b = clamp01(nb);
          } else if (filter === "negative") {
            r = 1 - r;
            g = 1 - g;
            b = 1 - b;
          } else if (filter === "warm") {
            r = clamp01(r * 1.08 + 0.018);
            g = clamp01(g * 1.02 + 0.006);
            b = clamp01(b * 0.92);
          } else if (filter === "cool") {
            r = clamp01(r * 0.93);
            g = clamp01(g * 0.99 + 0.004);
            b = clamp01(b * 1.08 + 0.012);
          } else if (filter === "high-contrast") {
            r = clamp01((r - 0.5) * 1.32 + 0.5);
            g = clamp01((g - 0.5) * 1.32 + 0.5);
            b = clamp01((b - 0.5) * 1.32 + 0.5);
          }

          d[i] = Math.round(r * 255);
          d[i + 1] = Math.round(g * 255);
          d[i + 2] = Math.round(b * 255);
        }
      }
    }

    // Tiny digital dither prevents large flat quantisation steps from looking
    // like a synthetic posterisation filter.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = pixelIndex(x, y, w);
        const dither = hashNoise(x, y, 41) * 0.7;
        d[i] = Math.min(255, Math.max(0, Math.round(d[i] + dither)));
        d[i + 1] = Math.min(255, Math.max(0, Math.round(d[i + 1] + dither)));
        d[i + 2] = Math.min(255, Math.max(0, Math.round(d[i + 2] + dither)));
        d[i + 3] = 255;
      }
    }

    this.ctx.putImageData(baseImage, 0, 0);
  }

  dispose() {
    this.work.width = 0;
    this.work.height = 0;
    this.bloom.width = 0;
    this.bloom.height = 0;
    this.bloomBlur.width = 0;
    this.bloomBlur.height = 0;
  }
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
