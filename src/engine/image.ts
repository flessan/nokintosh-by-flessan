import { fitWithin, type ImageSource } from "./renderer";

export interface LoadedPhoto {
  /** Full resolution pixels, used for export. */
  source: ImageSource;
  /** Downscaled copy used by the live preview (may be the same object). */
  preview: ImageSource;
  width: number;
  height: number;
  name: string;
  bytes: number;
}

/** Long edge of the buffer kept around for the interactive preview. */
const PREVIEW_SOURCE_MAX = 2400;

const ACCEPTED = /^image\/(jpeg|jpg|png|webp|avif|gif|bmp)$/i;

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED.test(file.type) || /\.(jpe?g|png|webp|avif|bmp|gif)$/i.test(file.name);
}

type Decoded = ImageSource & { width: number; height: number };

async function decode(blob: Blob): Promise<Decoded> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Builds a smaller copy so the preview never uploads a 26 MP texture. */
async function makePreview(source: Decoded): Promise<ImageSource> {
  const { width, height } = fitWithin(source.width, source.height, PREVIEW_SOURCE_MAX);
  if (width === source.width && height === source.height) return source;
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(source as ImageBitmap, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
      });
    } catch {
      /* fall through to canvas scaling */
    }
  }
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  return c;
}

async function build(blob: Blob, name: string, bytes: number): Promise<LoadedPhoto> {
  const decoded = await decode(blob);
  const preview = await makePreview(decoded);
  return {
    source: decoded,
    preview,
    width: decoded.width,
    height: decoded.height,
    name,
    bytes,
  };
}

export async function loadFromFile(file: File): Promise<LoadedPhoto> {
  return build(file, file.name || "pasted-image.png", file.size);
}

export async function loadFromUrl(url: string, name: string): Promise<LoadedPhoto> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Could not load sample image (${res.status}).`);
  const blob = await res.blob();
  return build(blob, name, blob.size);
}

function release(src: ImageSource | undefined) {
  if (!src) return;
  if (typeof ImageBitmap !== "undefined" && src instanceof ImageBitmap) src.close();
  else if (src instanceof HTMLCanvasElement) {
    src.width = 0;
    src.height = 0;
  }
}

export function releasePhoto(photo: LoadedPhoto | null) {
  if (!photo) return;
  if (photo.preview !== photo.source) release(photo.preview);
  release(photo.source);
}

export const SAMPLE_IMAGE_URL =
  "https://images.pexels.com/photos/34318011/pexels-photo-34318011.jpeg?auto=compress&cs=tinysrgb&w=1800";
