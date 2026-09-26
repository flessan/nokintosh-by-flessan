import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LoadedPhoto } from "../engine/image";
import { createRenderer, type Renderer } from "../engine/renderer";
import type { EffectParams } from "../engine/types";

/** Longest edge of the live preview buffer. Export always uses full size. */
const PREVIEW_MAX = 1200;
const MAX_CACHED_FRAMES = 6;

type RenderPhase = "idle" | "loading" | "cached" | "rendered";

interface CachedFrame {
  width: number;
  height: number;
  data: ImageData;
  lastUsed: number;
}

interface PreviewInfo {
  engine: "webgl2" | "canvas2d" | "none";
  previewWidth: number;
  previewHeight: number;
  lastRenderMs: number;
  phase: RenderPhase;
}

function paramsKey(params: EffectParams): string {
  return [
    params.grain,
    params.jpeg,
    params.colorShift,
    params.vignette,
    params.softness,
    params.sharpen,
    params.bloom,
    params.aberration,
    params.fade,
    params.flash,
    params.temperature,
    params.exposure,
    params.contrast,
    params.saturation,
  ]
    .map((v) => v.toFixed(3))
    .join(",");
}

/**
 * Owns the preview renderer lifecycle.
 *
 * Preset previews are cached per photo + preset + output size. Switching back
 * to a previously rendered preset therefore becomes a cheap ImageData restore
 * instead of running the whole CPU pipeline again.
 */
export function usePreview(
  photo: LoadedPhoto | null,
  params: EffectParams,
  presetId: string,
  showOriginal: boolean,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const prepareFrameRef = useRef<number | null>(null);
  const renderFrameRef = useRef<number | null>(null);
  const renderSerialRef = useRef(0);
  const paramsRef = useRef(params);
  const originalRef = useRef(showOriginal);
  const presetRef = useRef(presetId);

  // WeakMap prevents cached pixels from keeping old photo objects alive after
  // a new photo is opened or the current photo is closed.
  const cacheRef = useRef(new WeakMap<LoadedPhoto, Map<string, CachedFrame>>());

  const [info, setInfo] = useState<PreviewInfo>({
    engine: "none",
    previewWidth: 0,
    previewHeight: 0,
    lastRenderMs: 0,
    phase: "idle",
  });
  const [box, setBox] = useState({ w: 0, h: 0 });

  paramsRef.current = params;
  originalRef.current = showOriginal;
  presetRef.current = presetId;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;
    const r = createRenderer(canvas);
    rendererRef.current = r;
    setInfo((i) => ({ ...i, engine: r.kind }));
    return () => {
      if (prepareFrameRef.current !== null) cancelAnimationFrame(prepareFrameRef.current);
      if (renderFrameRef.current !== null) cancelAnimationFrame(renderFrameRef.current);
      renderSerialRef.current += 1;
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setBox({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function getOutputSize() {
    if (!photo || box.w < 8 || box.h < 8) return null;

    const aspect = photo.width / photo.height;
    let cssW = box.w;
    let cssH = cssW / aspect;
    if (cssH > box.h) {
      cssH = box.h;
      cssW = cssH * aspect;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let bw = Math.max(1, Math.round(cssW * dpr));
    let bh = Math.max(1, Math.round(cssH * dpr));
    const r = rendererRef.current;
    const cap = Math.min(
      PREVIEW_MAX,
      r?.maxTextureSize ?? PREVIEW_MAX,
      Math.max(photo.width, photo.height),
    );
    const longest = Math.max(bw, bh);

    if (longest > cap) {
      const k = cap / longest;
      bw = Math.max(1, Math.round(bw * k));
      bh = Math.max(1, Math.round(bh * k));
    }

    return { cssW, cssH, bw, bh };
  }

  function paintSource(canvas: HTMLCanvasElement, bw: number, bh: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Preview canvas context unavailable.");
    ctx.clearRect(0, 0, bw, bh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (photo) ctx.drawImage(photo.preview as CanvasImageSource, 0, 0, bw, bh);
  }

  function cacheKey(bw: number, bh: number) {
    if (!photo || presetRef.current === "custom") return null;
    return [
      presetRef.current,
      bw,
      bh,
      paramsKey(paramsRef.current),
    ].join("|");
  }

  function getCachedFrame(key: string, bw: number, bh: number): CachedFrame | null {
    if (!photo) return null;
    const map = cacheRef.current.get(photo);
    const frame = map?.get(key);
    if (!frame || frame.width !== bw || frame.height !== bh) return null;
    frame.lastUsed = performance.now();
    return frame;
  }

  function storeCachedFrame(key: string, bw: number, bh: number, data: ImageData) {
    if (!photo) return;

    let map = cacheRef.current.get(photo);
    if (!map) {
      map = new Map();
      cacheRef.current.set(photo, map);
    }

    map.set(key, {
      width: bw,
      height: bh,
      data,
      lastUsed: performance.now(),
    });

    while (map.size > MAX_CACHED_FRAMES) {
      let oldestKey: string | null = null;
      let oldest = Infinity;
      for (const [entryKey, entry] of map) {
        if (entry.lastUsed < oldest) {
          oldest = entry.lastUsed;
          oldestKey = entryKey;
        }
      }
      if (oldestKey === null) break;
      map.delete(oldestKey);
    }
  }

  function prepare() {
    prepareFrameRef.current = null;
    const r = rendererRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !photo) return null;

    const size = getOutputSize();
    if (!size) return null;

    canvas.style.width = Math.round(size.cssW) + "px";
    canvas.style.height = Math.round(size.cssH) + "px";

    r.setSource(photo.preview, photo.preview.width, photo.preview.height);
    r.resize(size.bw, size.bh);

    // Paint a valid source frame immediately, before yielding to the expensive
    // CPU pass. This avoids a black canvas during large-image processing.
    paintSource(canvas, size.bw, size.bh);

    setInfo((i) =>
      i.previewWidth === size.bw && i.previewHeight === size.bh
        ? { ...i, phase: originalRef.current ? "idle" : "loading" }
        : {
            ...i,
            previewWidth: size.bw,
            previewHeight: size.bh,
            phase: originalRef.current ? "idle" : "loading",
          },
    );

    return size;
  }

  function renderFiltered(serial: number) {
    renderFrameRef.current = null;
    if (serial !== renderSerialRef.current) return;

    const r = rendererRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !photo || originalRef.current) return;

    const bw = canvas.width;
    const bh = canvas.height;
    const key = cacheKey(bw, bh);

    if (key) {
      const cached = getCachedFrame(key, bw, bh);
      if (cached) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.putImageData(cached.data, 0, 0);
          setInfo((i) => ({ ...i, lastRenderMs: 0, phase: "cached" }));
          return;
        }
      }
    }

    const t0 = performance.now();
    try {
      r.render(paramsRef.current);

      if (key) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          storeCachedFrame(key, bw, bh, ctx.getImageData(0, 0, bw, bh));
        }
      }
    } catch (error) {
      console.error("Nokintosh preview renderer failed:", error);
      const size = getOutputSize();
      if (size) {
        try {
          paintSource(canvas, size.bw, size.bh);
        } catch (fallbackError) {
          console.error("Nokintosh source preview fallback failed:", fallbackError);
        }
      }
    }

    const dt = performance.now() - t0;
    setInfo((i) => ({ ...i, lastRenderMs: dt, phase: "rendered" }));
  }

  function schedule() {
    renderSerialRef.current += 1;

    if (renderFrameRef.current !== null) {
      cancelAnimationFrame(renderFrameRef.current);
      renderFrameRef.current = null;
    }
    if (prepareFrameRef.current !== null) return;

    setInfo((i) => ({ ...i, phase: photo && !originalRef.current ? "loading" : "idle" }));

    prepareFrameRef.current = requestAnimationFrame(() => {
      if (!prepare()) return;
      if (originalRef.current) return;

      const serial = renderSerialRef.current;
      renderFrameRef.current = requestAnimationFrame(() => renderFiltered(serial));
    });
  }

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, presetId, box.w, box.h, showOriginal, photo]);

  useEffect(() => {
    return () => {
      if (prepareFrameRef.current !== null) cancelAnimationFrame(prepareFrameRef.current);
      if (renderFrameRef.current !== null) cancelAnimationFrame(renderFrameRef.current);
      prepareFrameRef.current = null;
      renderFrameRef.current = null;
      renderSerialRef.current += 1;
    };
  }, []);

  return { canvasRef, stageRef, info };
}
