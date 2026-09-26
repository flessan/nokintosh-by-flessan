import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAcceptedFile,
  loadFromFile,
  loadFromUrl,
  releasePhoto,
  SAMPLE_IMAGE_URL,
  type LoadedPhoto,
} from "../engine/image";
import { PRESET_MAP, PRESETS } from "../engine/presets";
import { DEFAULT_PARAMS, type EffectParams, type ParamId } from "../engine/types";

interface Snapshot {
  params: EffectParams;
  presetId: string;
}

const MAX_HISTORY = 40;

export function useEditor() {
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [params, setParams] = useState<EffectParams>({ ...PRESETS[1].params });
  const [presetId, setPresetId] = useState<string>(PRESETS[1].id);
  const [status, setStatus] = useState("Ready. Open a photo to begin.");
  const [loading, setLoading] = useState(false);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const photoRef = useRef<LoadedPhoto | null>(null);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    return () => releasePhoto(photoRef.current);
  }, []);

  const pushHistory = useCallback(
    (snap: Snapshot) => {
      past.current.push(snap);
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      setHistoryTick((t) => t + 1);
    },
    [],
  );

  const commitPhoto = useCallback((next: LoadedPhoto) => {
    setPhoto((prev) => {
      if (prev && prev !== next) releasePhoto(prev);
      return next;
    });
    setStatus(`${next.name} // ${next.width} x ${next.height}`);
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      if (!isAcceptedFile(file)) {
        setStatus("Unsupported file type. Use JPG, PNG, WebP or AVIF.");
        return;
      }
      setLoading(true);
      setStatus(`Opening ${file.name}...`);
      try {
        const loaded = await loadFromFile(file);
        commitPhoto(loaded);
      } catch {
        setStatus("Could not read that image file.");
      } finally {
        setLoading(false);
      }
    },
    [commitPhoto],
  );

  const openSample = useCallback(async () => {
    setLoading(true);
    setStatus("Loading sample photo...");
    try {
      const loaded = await loadFromUrl(SAMPLE_IMAGE_URL, "sample.jpg");
      commitPhoto(loaded);
    } catch {
      setStatus("Sample photo unavailable. Open a file instead.");
    } finally {
      setLoading(false);
    }
  }, [commitPhoto]);

  const closePhoto = useCallback(() => {
    setPhoto((prev) => {
      releasePhoto(prev);
      return null;
    });
    setStatus("Ready. Open a photo to begin.");
  }, []);

  const applyPreset = useCallback(
    (id: string) => {
      const preset = PRESET_MAP[id];
      if (!preset) return;
      pushHistory({ params, presetId });
      setParams({ ...preset.params });
      setPresetId(id);
      setStatus(`Preset: ${preset.name} // ${preset.note}`);
    },
    [params, presetId, pushHistory],
  );

  const dragging = useRef(false);

  const beginAdjust = useCallback(() => {
    if (dragging.current) return;
    dragging.current = true;
    pushHistory({ params, presetId });
  }, [params, presetId, pushHistory]);

  const endAdjust = useCallback(() => {
    dragging.current = false;
  }, []);

  const setParam = useCallback((id: ParamId, value: number) => {
    setParams((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
    setPresetId((prev) => (prev === "custom" ? prev : "custom"));
  }, []);

  const resetAll = useCallback(() => {
    pushHistory({ params, presetId });
    setParams({ ...DEFAULT_PARAMS });
    setPresetId("none");
    setStatus("All effects reset.");
  }, [params, presetId, pushHistory]);

  const undo = useCallback(() => {
    const snap = past.current.pop();
    if (!snap) return;
    future.current.push({ params, presetId });
    setParams(snap.params);
    setPresetId(snap.presetId);
    setStatus("Undo.");
    setHistoryTick((t) => t + 1);
  }, [params, presetId]);

  const redo = useCallback(() => {
    const snap = future.current.pop();
    if (!snap) return;
    past.current.push({ params, presetId });
    setParams(snap.params);
    setPresetId(snap.presetId);
    setStatus("Redo.");
    setHistoryTick((t) => t + 1);
  }, [params, presetId]);

  return {
    photo,
    params,
    presetId,
    status,
    loading,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    historyTick,
    setStatus,
    openFile,
    openSample,
    closePhoto,
    applyPreset,
    setParam,
    beginAdjust,
    endAdjust,
    resetAll,
    undo,
    redo,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
