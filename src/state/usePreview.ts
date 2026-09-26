import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LoadedPhoto } from "../engine/image";
import { createRenderer, type Renderer } from "../engine/renderer";
import { DEFAULT_PARAMS, type EffectParams } from "../engine/types";

/** Longest edge of the live preview buffer. Export always uses full size. */
const PREVIEW_MAX = 1600;

interface PreviewInfo {
  engine: "webgl2" | "canvas2d" | "none";
  previewWidth: number;
  previewHeight: number;
  lastRenderMs: number;
}

/**
 * Owns the preview renderer lifecycle. React only supplies parameters; all
 * pixel work happens inside the engine.
 */
export function usePreview(photo: LoadedPhoto | null, params: EffectParams, showOriginal: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const frameRef = useRef(0);
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

  // --- renderer creation ---
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendererRef.current) return;
    const r = createRenderer(canvas);
    rendererRef.current = r;
    setInfo((i) => ({ ...i, engine: r.kind }));
    return () => {
      r.dispose();
      rendererRef.current = null;
    };
  }, []);

  // --- measure the stage ---
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

  // --- upload source when the photo changes ---
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !photo) return;
    r.setSource(photo.preview, photo.width, photo.height);
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  function schedule() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      draw();
    });
  }

  function draw() {
    const r = rendererRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !photo || box.w < 8 || box.h < 8) return;

    const aspect = photo.width / photo.height;
    let cssW = box.w;
    let cssH = cssW / aspect;
    if (cssH > box.h) {
      cssH = box.h;
      cssW = cssH * aspect;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let bw = Math.round(cssW * dpr);
    let bh = Math.round(cssH * dpr);
    const cap = Math.min(PREVIEW_MAX, r.maxTextureSize, Math.max(photo.width, photo.height));
    const longest = Math.max(bw, bh);
    if (longest > cap) {
      const k = cap / longest;
      bw = Math.max(1, Math.round(bw * k));
      bh = Math.max(1, Math.round(bh * k));
    }

    canvas.style.width = `${Math.round(cssW)}px`;
    canvas.style.height = `${Math.round(cssH)}px`;

    const t0 = performance.now();
    r.resize(bw, bh);
    r.render(originalRef.current ? DEFAULT_PARAMS : paramsRef.current);
    const dt = performance.now() - t0;
    setInfo((i) =>
      i.previewWidth === bw && i.previewHeight === bh && Math.abs(i.lastRenderMs - dt) < 0.8
        ? i
        : { ...i, previewWidth: bw, previewHeight: bh, lastRenderMs: dt },
    );
  }

  // --- redraw on parameter / layout / compare changes ---
  useEffect(() => {
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, box.w, box.h, showOriginal, photo]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { canvasRef, stageRef, info };
}
