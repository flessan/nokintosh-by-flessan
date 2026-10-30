import { useCallback, useEffect, useState } from "react";
import type {
  EffectParams,
  FilterMode,
  FrameMode,
  SpecialEffectState,
} from "../engine/types";
import type { ImageTransform } from "../engine/transform";

export interface SavedLook {
  id: string;
  name: string;
  createdAt: string;
  params: EffectParams;
  filter: FilterMode;
  frame: FrameMode;
  transform: ImageTransform;
  specialEffect: SpecialEffectState;
}

const STORAGE_KEY = "nokintosh:saved-looks:v1";
const MAX_SAVED_LOOKS = 24;

function isSavedLook(value: unknown): value is SavedLook {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    !!item.params && typeof item.params === "object" &&
    typeof item.filter === "string" &&
    typeof item.frame === "string" &&
    !!item.transform && typeof item.transform === "object" &&
    !!item.specialEffect && typeof item.specialEffect === "object"
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
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
    };
    setLooks((current) => [next, ...current].slice(0, MAX_SAVED_LOOKS));
    return next;
  }, []);

  const deleteLook = useCallback((id: string) => {
    setLooks((current) => current.filter((look) => look.id !== id));
  }, []);

  return { looks, saveLook, deleteLook };
}
