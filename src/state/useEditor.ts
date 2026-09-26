import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAcceptedFile,
  loadFromFile,
  loadFromUrl,
  releasePhoto,
  SAMPLE_IMAGE_URL,
  type LoadedPhoto,
} from "../engine/image";
import { paramsEqual, PRESET_MAP, PRESETS } from "../engine/presets";
import { DEFAULT_PARAMS, type EffectParams, type ParamId } from "../engine/types";

interface Snapshot {
  params: EffectParams;
  presetId: string;
}

const MAX_HISTORY = 40;

const INITIAL_PARAMS = { ...PRESETS[1].params };
const INITIAL_PRESET_ID = PRESETS[1].id;

export function useEditor() {
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);

  // params/presetId are the live draft shown in the preview.
  const [params, setParams] = useState<EffectParams>({ ...INITIAL_PARAMS });
  const [presetId, setPresetId] = useState<string>(INITIAL_PRESET_ID);

  // applied* are the last explicitly committed settings. Apply turns this
  // draft into one undoable history step.
  const [appliedParams, setAppliedParams] = useState<EffectParams>({ ...INITIAL_PARAMS });
  const [appliedPresetId, setAppliedPresetId] = useState<string>(INITIAL_PRESET_ID);

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
      past.current.push({
        params: { ...snap.params },
        presetId: snap.presetId,
      });
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
    setStatus(next.name + " // " + next.width + " x " + next.height);
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      if (!isAcceptedFile(file)) {
        setStatus("Unsupported file type. Use JPG, PNG, WebP or AVIF.");
        return;
      }
      setLoading(true);
      setStatus("Opening " + file.name + "...");
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

  /**
   * Selects a preset for live preview only. It does not touch history;
   * Apply is the explicit commit point.
   */
  const applyPreset = useCallback((id: string) => {
    const preset = PRESET_MAP[id];
    if (!preset) return;
    setParams({ ...preset.params });
    setPresetId(id);
    setStatus("[Loading] " + preset.name + " // " + preset.note);
  }, []);

  /**
   * Commits the current draft as one undoable operation.
   *
   * This deliberately commits the whole current state instead of each slider
   * event, so a preset plus several manual adjustments can be undone together.
   */
  const applyChanges = useCallback(() => {
    const dirty =
      !paramsEqual(params, appliedParams) || presetId !== appliedPresetId;

    if (!dirty) {
      setStatus("No unapplied changes.");
      return;
    }

    pushHistory({ params: appliedParams, presetId: appliedPresetId });
    setAppliedParams({ ...params });
    setAppliedPresetId(presetId);

    const name = PRESET_MAP[presetId]?.name ?? "Custom";
    setStatus("Applied: " + name);
  }, [
    appliedParams,
    appliedPresetId,
    params,
    presetId,
    pushHistory,
  ]);

  // Slider interaction changes only the draft. These callbacks remain here
  // so the existing EffectsPanel interface does not need special cases.
  const beginAdjust = useCallback(() => {}, []);
  const endAdjust = useCallback(() => {}, []);

  const setParam = useCallback((id: ParamId, value: number) => {
    setParams((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
    setPresetId((prev) => (prev === "custom" ? prev : "custom"));
  }, []);

  const resetAll = useCallback(() => {
    const dirty =
      !paramsEqual(params, DEFAULT_PARAMS) || presetId !== "none";

    if (!dirty) {
      setStatus("All effects are already reset.");
      return;
    }

    pushHistory({ params: appliedParams, presetId: appliedPresetId });
    const reset = { ...DEFAULT_PARAMS };
    setParams(reset);
    setPresetId("none");
    setAppliedParams({ ...reset });
    setAppliedPresetId("none");
    setStatus("All effects reset.");
  }, [
    appliedParams,
    appliedPresetId,
    params,
    presetId,
    pushHistory,
  ]);

  const undo = useCallback(() => {
    // First undo cancels an uncommitted draft without consuming history.
    if (!paramsEqual(params, appliedParams) || presetId !== appliedPresetId) {
      setParams({ ...appliedParams });
      setPresetId(appliedPresetId);
      setStatus("Draft changes undone.");
      return;
    }

    const snap = past.current.pop();
    if (!snap) return;

    future.current.push({
      params: { ...appliedParams },
      presetId: appliedPresetId,
    });

    const restored = { ...snap.params };
    setParams(restored);
    setPresetId(snap.presetId);
    setAppliedParams({ ...restored });
    setAppliedPresetId(snap.presetId);
    setStatus("Undo.");
    setHistoryTick((t) => t + 1);
  }, [appliedParams, appliedPresetId, params, presetId]);

  const redo = useCallback(() => {
    // If the user is sitting on a draft, redo first has no committed meaning.
    if (!paramsEqual(params, appliedParams) || presetId !== appliedPresetId) {
      setStatus("Apply the current draft before using Redo.");
      return;
    }

    const snap = future.current.pop();
    if (!snap) return;

    past.current.push({
      params: { ...appliedParams },
      presetId: appliedPresetId,
    });

    const restored = { ...snap.params };
    setParams(restored);
    setPresetId(snap.presetId);
    setAppliedParams({ ...restored });
    setAppliedPresetId(snap.presetId);
    setStatus("Redo.");
    setHistoryTick((t) => t + 1);
  }, [appliedParams, appliedPresetId, params, presetId]);

  const hasUnappliedChanges =
    !paramsEqual(params, appliedParams) || presetId !== appliedPresetId;

  return {
    photo,
    params,
    presetId,
    status,
    loading,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    historyTick,
    hasUnappliedChanges,
    setStatus,
    openFile,
    openSample,
    closePhoto,
    applyPreset,
    applyChanges,
    setParam,
    beginAdjust,
    endAdjust,
    resetAll,
    undo,
    redo,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
