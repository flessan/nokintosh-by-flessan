import { createRenderer, fitWithin, type ImageSource } from "./renderer";
import type { EffectParams, FilterMode } from "./types";
import { applyCanvasTransform, IDENTITY_TRANSFORM, type ImageTransform } from "./transform";

export type ExportFormat = "avif" | "webp" | "png";

export const FORMAT_MIME: Record<ExportFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
  png: "image/png",
};

export const FORMAT_LABEL: Record<ExportFormat, string> = {
  avif: "AVIF",
  webp: "WebP",
  png: "PNG",
};

function toBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

const supportCache = new Map<string, boolean>();

/** Feature-detects a canvas encoder by actually encoding two pixels. */
export async function supportsFormat(format: ExportFormat): Promise<boolean> {
  const mime = FORMAT_MIME[format];
  if (supportCache.has(mime)) return supportCache.get(mime)!;
  let ok = false;
  try {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 2;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, 2, 2);
      const blob = await toBlob(c, mime, 0.8);
      ok = !!blob && blob.type === mime;
    }
  } catch {
    ok = false;
  }
  supportCache.set(mime, ok);
  return ok;
}

export interface ExportResult {
  blob: Blob;
  format: ExportFormat;
  /** True when the requested format was unavailable and a fallback was used. */
  fellBack: boolean;
  width: number;
  height: number;
}

export interface ExportOptions {
  format: ExportFormat;
  /** 0..1, ignored for PNG. */
  quality: number;
  /** Longest edge of the exported image. */
  maxSize: number;
}

/**
 * Renders the photo at full quality in an offscreen context and encodes it.
 * The temporary renderer is disposed immediately so no GPU memory leaks.
 */
export async function exportImage(
  source: ImageSource,
  srcWidth: number,
  srcHeight: number,
  params: EffectParams,
  filter: FilterMode = "none",
  transform: ImageTransform = IDENTITY_TRANSFORM,
  options: ExportOptions,
): Promise<ExportResult> {
  const canvas = document.createElement("canvas");
  const renderer = createRenderer(canvas);
  // phones and tablets cannot hold two full resolution RGBA buffers
  const deviceCap =
    typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches ? 4096 : 16384;
  const limit = Math.min(options.maxSize, renderer.maxTextureSize, deviceCap);
  const { width, height } = fitWithin(srcWidth, srcHeight, limit);
  try {
    renderer.setSource(source, srcWidth, srcHeight);
    renderer.resize(width, height);
    renderer.render(params, filter);
    applyCanvasTransform(canvas, transform);

    let format = options.format;
    let fellBack = false;
    if (format !== "png" && !(await supportsFormat(format))) {
      format = (await supportsFormat("webp")) ? "webp" : "png";
      fellBack = true;
    }
    const quality = format === "png" ? undefined : options.quality;
    let blob = await toBlob(canvas, FORMAT_MIME[format], quality);
    if (!blob) {
      blob = await toBlob(canvas, "image/png");
      format = "png";
      fellBack = true;
    }
    if (!blob) throw new Error("Encoding failed.");
    return { blob, format, fellBack, width, height };
  } finally {
    renderer.dispose();
    canvas.width = 0;
    canvas.height = 0;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function buildFilename(base: string, presetName: string, format: ExportFormat): string {
  const clean = base.replace(/\.[^./\\]+$/, "").replace(/[^\w-]+/g, "-").slice(0, 48) || "photo";
  const tag = presetName.toLowerCase().replace(/[^\w]+/g, "-");
  return `${clean}_${tag}.${format}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
