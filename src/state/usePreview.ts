import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LoadedPhoto } from "../engine/image";
import { createRenderer, type Renderer } from "../engine/renderer";
import type { EffectParams } from "../engine/types";

/** Longest edge of the live preview buffer. Export always uses full size. */
const PREVIEW_MAX = 1200;

interface PreviewInfo {
  engine: "webgl2" | "canvas2d" | "none";
  previewWidth: number;
  previewHeight: number;
  lastRenderMs: number;
}

/**
 * Owns the preview renderer lifecycle. React only supplies parameters; all
 * pixel work happens inside the engine.
 *
 * The preview is deliberately progressive: resize + paint the source first,
 * yield one frame, then run the expensive effect pass. This prevents the UI
 * from looking like a black/empty canvas while the CPU renderer is working.
 */
export function usePreview(photo: LoadedPhoto | null, params: EffectParams, showOriginal: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const prepareFrameRef = useRef<number | null>(null);
  const renderFrameRef = useRef<number | null>(null);
  const renderSerialRef = useRef(0);
  const paramsRef = useRef(params);
  const originalRef = useRef(showOriginal);
  const [info, setInfo] = useState<PreviewInfo>({
    engine: "none",
    previewWidth: 0,
    previewHeight: 0,
    lastRenderMs: 0,
  });
  const [box, setBox] = useState({ w: 0, h: 0 });

  paramsRef.current = params;
  originalRef.current = showOriginal;

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

  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !photo) return;
    r.setSource(photo.preview, photo.preview.width, photo.preview.height);
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

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
    const cap = Math.min(PREVIEW_MAX, r?.maxTextureSize ?? PREVIEW_MAX, Math.max(photo.width, photo.height));
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

  function prepare() {
    prepareFrameRef.current = null;
    const r = rendererRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !photo) return false;

    const size = getOutputSize();
    if (!size) return false;

    canvas.style.width = `${Math.round(size.cssW)}px`;
    canvas.style.height = `${Math.round(size.cssH)}px`;

    r.setSource(photo.preview, photo.preview.width, photo.preview.height);
    r.resize(size.bw, size.bh);

    // The active renderer is currently Canvas2D, so we can paint an immediate
    // source frame before yielding. If that ever changes to a GPU renderer,
    // this branch can be replaced by a renderer-native source pass.
    paintSource(canvas, size.bw, size.bh);

    setInfo((i) =>
      i.previewWidth === size.bw && i.previewHeight === size.bh
        ? i
        : { ...i, previewWidth: size.bw, previewHeight: size.bh },
    );

    return true;
  }

  function renderFiltered(serial: number) {
    renderFrameRef.current = null;
    if (serial !== renderSerialRef.current) return;

    const r = rendererRef.current;
    if (!r || !canvasRef.current || !photo) return;

    const t0 = performance.now();
    try {
      if (originalRef.current) {
        return;
      }
      r.render(paramsRef.current);
    } catch (error) {
      console.error("Nokintosh preview renderer failed:", error);
      const size = getOutputSize();
      if (size) {
        try {
          paintSource(canvasRef.current, size.bw, size.bh);
        } catch (fallbackError) {
          console.error("Nokintosh source preview fallback failed:", fallbackError);
        }
      }
    }

    const dt = performance.now() - t0;
    setInfo((i) => ({ ...i, lastRenderMs: dt }));
  }

  function schedule() {
    renderSerialRef.current += 1;

    if (renderFrameRef.current !== null) {
      cancelAnimationFrame(renderFrameRef.current);
      renderFrameRef.current = null;
    }
    if (prepareFrameRef.current !== null) return;

    prepareFrameRef.current = requestAnimationFrame(() => {
      if (!prepare()) return;
      if (originalRef.current) return;

      // Read the newest serial after the preparation step. Multiple React
      // effects can coalesce into this same frame.
      const serial = renderSerialRef.current;
      renderFrameRef.current = requestAnimationFrame(() => renderFiltered(serial));
    });
  }

  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, box.w, box.h, showOriginal, photo]);

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
