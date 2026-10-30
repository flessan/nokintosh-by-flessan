import { useCallback, useEffect, useState } from "react";
import type {
  EffectParams,
  FilterMode,
  FrameMode,
  FramePosition,
  SpecialEffectState,
} from "../engine/types";
import type { ImageTransform } from "../engine/transform";
import { DEFAULT_FRAME_POSITION, normalizeFramePosition } from "../engine/frame";

export interface SavedLook {
  id: string;
  name: string;
  createdAt: string;
  params: EffectParams;
  filter: FilterMode;
  frame: FrameMode;
  framePosition: FramePosition;
  transform: ImageTransform;
  specialEffect: SpecialEffectState;
}

const STORAGE_KEY = "nokintosh:saved-looks:v1";
const MAX_SAVED_LOOKS = 24;
const FILTERS = new Set<FilterMode>([
  "none",
  "bw",
  "sepia",
  "negative",
  "warm",
  "cool",
  "high-contrast",
  "cross-process",
  "chrome",
  "soft-flash",
]);
const FRAMES = new Set([
  "none",
  "collage",
  "windows-98",
  "polaroid",
  "film-strip",
  "contact-sheet",
  "lcd-playback",
  "date-stamp",
  "mini-dv",
  "gallery-mat",
]);

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isSavedLook(value: unknown): value is SavedLook {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const params = item.params as Record<string, unknown> | null;
  const transform = item.transform as Record<string, unknown> | null;
  const effect = item.specialEffect as Record<string, unknown> | null;
  const strokes = effect?.strokes;

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    !!item.name.trim() &&
    typeof item.createdAt === "string" &&
    !!params &&
    ["grain", "jpeg", "colorShift", "vignette", "softness", "sharpen", "bloom", "aberration", "fade", "flash", "temperature", "exposure", "contrast", "saturation"]
      .every((key) => typeof params[key] === "number" && Number.isFinite(params[key])) &&
    typeof item.filter === "string" &&
    FILTERS.has(item.filter as FilterMode) &&
    typeof item.frame === "string" &&
    FRAMES.has(item.frame) &&
    (item.framePosition === undefined ||
      (!!item.framePosition && typeof item.framePosition === "object" &&
        typeof (item.framePosition as Record<string, unknown>).zoom === "number" &&
        typeof (item.framePosition as Record<string, unknown>).x === "number" &&
        typeof (item.framePosition as Record<string, unknown>).y === "number")) &&
    !!transform &&
    typeof transform.mirror === "boolean" &&
    typeof transform.flipVertical === "boolean" &&
    !!effect &&
    (effect.kind === "none" || effect.kind === "gaussian-blur" || effect.kind === "pixelate") &&
    (effect.mode === "uniform" || effect.mode === "vignette" || effect.mode === "draw") &&
    typeof effect.amount === "number" &&
    typeof effect.brushSize === "number" &&
    Array.isArray(strokes) &&
    strokes.every((stroke) => {
      if (!stroke || typeof stroke !== "object") return false;
      const points = (stroke as Record<string, unknown>).points;
      return Array.isArray(points) && points.every((point) => {
        if (!point || typeof point !== "object") return false;
        const coordinates = point as Record<string, unknown>;
        return typeof coordinates.x === "number" && Number.isFinite(coordinates.x) &&
          typeof coordinates.y === "number" && Number.isFinite(coordinates.y);
      });
    })
  );
}

function readSavedLooks(): SavedLook[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedLook).slice(0, MAX_SAVED_LOOKS);
  } catch {
    return [];
  }
}

function cloneLook(look: Omit<SavedLook, "id" | "createdAt">): Omit<SavedLook, "id" | "createdAt"> {
  return {
    ...look,
    framePosition: normalizeFramePosition(look.framePosition ?? DEFAULT_FRAME_POSITION),
    params: { ...look.params },
    transform: { ...look.transform },
    specialEffect: {
      ...look.specialEffect,
      strokes: look.specialEffect.strokes.map((stroke) => ({
        points: stroke.points.map((point) => ({ ...point })),
      })),
    },
  };
}

/** Small browser-local library for reusable effect combinations. */
export function useSavedLooks() {
  const [looks, setLooks] = useState<SavedLook[]>(() => readSavedLooks());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(looks));
    } catch {
      // Private browsing or a full storage quota should not break editing.
    }
  }, [looks]);

  const saveLook = useCallback((look: Omit<SavedLook, "id" | "createdAt">) => {
    const next: SavedLook = {
      ...cloneLook(look),
      id: createId(),
      createdAt: new Date().toISOString(),
    };
    setLooks((current) => [next, ...current].slice(0, MAX_SAVED_LOOKS));
    return next;
  }, []);

  const deleteLook = useCallback((id: string) => {
    setLooks((current) => current.filter((look) => look.id !== id));
  }, []);

  const importLooks = useCallback((values: unknown[]) => {
    const capacity = Math.max(0, MAX_SAVED_LOOKS - looks.length);
    const imported = values
      .filter(isSavedLook)
      .slice(0, capacity)
      .map((look) => ({
        ...cloneLook(look),
        id: createId(),
        createdAt: new Date().toISOString(),
      }));
    if (imported.length) {
      setLooks((current) => [...imported, ...current].slice(0, MAX_SAVED_LOOKS));
    }
    return imported.length;
  }, [looks.length]);

  return { looks, saveLook, deleteLook, importLooks };
}
