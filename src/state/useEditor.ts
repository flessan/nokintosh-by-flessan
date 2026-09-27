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
import { DEFAULT_PARAMS, type EffectParams, type FilterMode, type FrameMode, type ParamId } from "../engine/types";
import { IDENTITY_TRANSFORM, sameTransform, type ImageTransform } from "../engine/transform";
import {
  appendDrawStroke,
  cloneSpecialEffect,
  sameSpecialEffect,
} from "../engine/specialEffect";
import {
  DEFAULT_SPECIAL_EFFECT,
  type DrawPoint,
  type SpecialEffectKind,
  type SpecialEffectMode,
  type SpecialEffectState,
} from "../engine/types";

interface Snapshot {
  params: EffectParams;
  presetId: string;
  filter: FilterMode;
  frame: FrameMode;
  transform: ImageTransform;
  specialEffect: SpecialEffectState;
}

const MAX_HISTORY = 40;

const INITIAL_PRESET = PRESETS.find((preset) => preset.id === "ccd") ?? PRESETS[0];
const INITIAL_PARAMS = { ...INITIAL_PRESET.params };
const INITIAL_PRESET_ID = INITIAL_PRESET.id;
const INITIAL_FILTER = INITIAL_PRESET.filter ?? "none";
const INITIAL_FRAME = INITIAL_PRESET.frame ?? "none";
const INITIAL_SPECIAL_EFFECT = cloneSpecialEffect(DEFAULT_SPECIAL_EFFECT);

export function useEditor() {
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);

  // params/presetId are the live draft shown in the preview.
  const [params, setParams] = useState<EffectParams>({ ...INITIAL_PARAMS });
  const [presetId, setPresetId] = useState<string>(INITIAL_PRESET_ID);
  const [filter, setFilter] = useState<FilterMode>(INITIAL_FILTER);
  const [frame, setFrame] = useState<FrameMode>(INITIAL_FRAME);
  const [transform, setTransform] = useState<ImageTransform>({ ...IDENTITY_TRANSFORM });
  const [specialEffect, setSpecialEffect] = useState<SpecialEffectState>({
    ...INITIAL_SPECIAL_EFFECT,
  });

  // applied* are the last explicitly committed settings. Apply turns this
  // draft into one undoable history step.
  const [appliedParams, setAppliedParams] = useState<EffectParams>({ ...INITIAL_PARAMS });
  const [appliedPresetId, setAppliedPresetId] = useState<string>(INITIAL_PRESET_ID);
  const [appliedFilter, setAppliedFilter] = useState<FilterMode>(INITIAL_FILTER);
  const [appliedFrame, setAppliedFrame] = useState<FrameMode>(INITIAL_FRAME);
  const [appliedTransform, setAppliedTransform] = useState<ImageTransform>({ ...IDENTITY_TRANSFORM });
  const [appliedSpecialEffect, setAppliedSpecialEffect] = useState<SpecialEffectState>({
    ...INITIAL_SPECIAL_EFFECT,
  });

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
        filter: snap.filter,
        frame: snap.frame,
        transform: { ...snap.transform },
        specialEffect: cloneSpecialEffect(snap.specialEffect),
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
    setFilter(preset.filter ?? "none");
    setFrame(preset.frame ?? "none");
    setSpecialEffect(cloneSpecialEffect(DEFAULT_SPECIAL_EFFECT));
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
      !paramsEqual(params, appliedParams) ||
      presetId !== appliedPresetId ||
      filter !== appliedFilter ||
      frame !== appliedFrame ||
      !sameTransform(transform, appliedTransform) ||
      !sameSpecialEffect(specialEffect, appliedSpecialEffect);

    if (!dirty) {
      setStatus("No unapplied changes.");
      return;
    }

    pushHistory({
      params: appliedParams,
      presetId: appliedPresetId,
      filter: appliedFilter,
      frame: appliedFrame,
      transform: appliedTransform,
      specialEffect: appliedSpecialEffect,
    });
    setAppliedParams({ ...params });
    setAppliedPresetId(presetId);
    setAppliedFilter(filter);
    setAppliedFrame(frame);
    setAppliedTransform({ ...transform });
    setAppliedSpecialEffect(cloneSpecialEffect(specialEffect));

    const name = PRESET_MAP[presetId]?.name ?? "Custom";
    setStatus("Applied: " + name);
  }, [
    appliedParams,
    appliedPresetId,
    appliedFilter,
    appliedFrame,
    appliedTransform,
    appliedSpecialEffect,
    filter,
    frame,
    params,
    presetId,
    pushHistory,
    specialEffect,
    transform,
  ]);

  // Slider interaction changes only the draft. These callbacks remain here
  // so the existing EffectsPanel interface does not need special cases.
  const beginAdjust = useCallback(() => {}, []);
  const endAdjust = useCallback(() => {}, []);

  const setParam = useCallback((id: ParamId, value: number) => {
    setParams((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
    setPresetId((prev) => (prev === "custom" ? prev : "custom"));
  }, []);

  const toggleMirror = useCallback(() => {
    setTransform((prev) => ({ ...prev, mirror: !prev.mirror }));
    setPresetId("custom");
  }, []);

  const toggleFlipVertical = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipVertical: !prev.flipVertical }));
    setPresetId("custom");
  }, []);

  const chooseSpecialEffect = useCallback(
    (kind: SpecialEffectKind, mode: SpecialEffectMode) => {
      setSpecialEffect((prev) => ({
        ...prev,
        kind,
        mode,
        amount: prev.kind === kind ? prev.amount : 0.65,
      }));
      setPresetId("custom");
      setStatus(
        (kind === "gaussian-blur" ? "Gaussian Blur" : "Pixelate") +
          " // " +
          mode,
      );
    },
    [],
  );

  const setSpecialEffectAmount = useCallback((amount: number) => {
    setSpecialEffect((prev) => ({
      ...prev,
      amount: Math.min(1, Math.max(0, amount)),
    }));
    setPresetId("custom");
  }, []);

  const setSpecialEffectBrushSize = useCallback((brushSize: number) => {
    setSpecialEffect((prev) => ({
      ...prev,
      brushSize: Math.min(0.25, Math.max(0.015, brushSize)),
    }));
    setPresetId("custom");
  }, []);

  const addSpecialEffectStroke = useCallback((points: DrawPoint[]) => {
    setSpecialEffect((prev) => {
      const next = appendDrawStroke(prev, points);
      return next === prev ? prev : next;
    });
    setPresetId("custom");
  }, []);

  const clearSpecialEffectMask = useCallback(() => {
    setSpecialEffect((prev) =>
      prev.strokes.length ? { ...prev, strokes: [] } : prev,
    );
    setPresetId("custom");
    setStatus("Draw mask cleared.");
  }, []);

  const disableSpecialEffect = useCallback(() => {
    setSpecialEffect(cloneSpecialEffect(DEFAULT_SPECIAL_EFFECT));
    setPresetId("custom");
    setStatus("Blur / Pixelate disabled.");
  }, []);

  const resetAll = useCallback(() => {
    const dirty =
      !paramsEqual(params, DEFAULT_PARAMS) ||
      presetId !== "none" ||
      filter !== "none" ||
      frame !== "none" ||
      !sameTransform(transform, IDENTITY_TRANSFORM) ||
      !sameSpecialEffect(specialEffect, DEFAULT_SPECIAL_EFFECT);

    if (!dirty) {
      setStatus("All effects are already reset.");
      return;
    }

    pushHistory({
      params: appliedParams,
      presetId: appliedPresetId,
      filter: appliedFilter,
      frame: appliedFrame,
      transform: appliedTransform,
      specialEffect: appliedSpecialEffect,
    });
    const reset = { ...DEFAULT_PARAMS };
    setParams(reset);
    setPresetId("none");
    setFilter("none");
    setFrame("none");
    setTransform({ ...IDENTITY_TRANSFORM });
    setAppliedParams({ ...reset });
    setAppliedPresetId("none");
    setAppliedFilter("none");
    setAppliedFrame("none");
    setAppliedTransform({ ...IDENTITY_TRANSFORM });
    setAppliedSpecialEffect(cloneSpecialEffect(DEFAULT_SPECIAL_EFFECT));
    setStatus("All effects reset.");
  }, [
    appliedParams,
    appliedPresetId,
    appliedFilter,
    appliedFrame,
    appliedTransform,
    filter,
    frame,
    params,
    presetId,
    pushHistory,
    specialEffect,
    appliedSpecialEffect,
    transform,
  ]);

  const undo = useCallback(() => {
    // First undo cancels an uncommitted draft without consuming history.
    if (
      !paramsEqual(params, appliedParams) ||
      presetId !== appliedPresetId ||
      filter !== appliedFilter ||
      frame !== appliedFrame ||
      !sameTransform(transform, appliedTransform) ||
      !sameSpecialEffect(specialEffect, appliedSpecialEffect)
    ) {
      setParams({ ...appliedParams });
      setPresetId(appliedPresetId);
      setFilter(appliedFilter);
      setFrame(appliedFrame);
      setTransform({ ...appliedTransform });
      setSpecialEffect(cloneSpecialEffect(appliedSpecialEffect));
      setStatus("Draft changes undone.");
      return;
    }

    const snap = past.current.pop();
    if (!snap) return;

    future.current.push({
      params: { ...appliedParams },
      presetId: appliedPresetId,
      filter: appliedFilter,
      frame: appliedFrame,
      transform: { ...appliedTransform },
      specialEffect: cloneSpecialEffect(appliedSpecialEffect),
    });

    const restored = { ...snap.params };
    setParams(restored);
    setPresetId(snap.presetId);
    setFilter(snap.filter);
    setFrame(snap.frame);
    setAppliedParams({ ...restored });
    setAppliedPresetId(snap.presetId);
    setAppliedFilter(snap.filter);
    setAppliedFrame(snap.frame);
    setTransform({ ...snap.transform });
    setAppliedTransform({ ...snap.transform });
    setSpecialEffect(cloneSpecialEffect(snap.specialEffect));
    setAppliedSpecialEffect(cloneSpecialEffect(snap.specialEffect));
    setStatus("Undo.");
    setHistoryTick((t) => t + 1);
  }, [appliedParams, appliedPresetId, appliedFilter, appliedFrame, appliedTransform, appliedSpecialEffect, filter, frame, params, presetId, specialEffect, transform]);

  const redo = useCallback(() => {
    // If the user is sitting on a draft, redo first has no committed meaning.
    if (
      !paramsEqual(params, appliedParams) ||
      presetId !== appliedPresetId ||
      filter !== appliedFilter ||
      frame !== appliedFrame ||
      !sameTransform(transform, appliedTransform) ||
      !sameSpecialEffect(specialEffect, appliedSpecialEffect)
    ) {
      setStatus("Apply the current draft before using Redo.");
      return;
    }

    const snap = future.current.pop();
    if (!snap) return;

    past.current.push({
      params: { ...appliedParams },
      presetId: appliedPresetId,
      filter: appliedFilter,
      frame: appliedFrame,
      transform: { ...appliedTransform },
      specialEffect: cloneSpecialEffect(appliedSpecialEffect),
    });

    const restored = { ...snap.params };
    setParams(restored);
    setPresetId(snap.presetId);
    setFilter(snap.filter);
    setFrame(snap.frame);
    setAppliedParams({ ...restored });
    setAppliedPresetId(snap.presetId);
    setAppliedFilter(snap.filter);
    setAppliedFrame(snap.frame);
    setTransform({ ...snap.transform });
    setAppliedTransform({ ...snap.transform });
    setSpecialEffect(cloneSpecialEffect(snap.specialEffect));
    setAppliedSpecialEffect(cloneSpecialEffect(snap.specialEffect));
    setStatus("Redo.");
    setHistoryTick((t) => t + 1);
  }, [appliedParams, appliedPresetId, appliedFilter, appliedFrame, appliedTransform, appliedSpecialEffect, params, presetId, filter, frame, specialEffect, transform]);

  const hasUnappliedChanges =
    !paramsEqual(params, appliedParams) ||
    presetId !== appliedPresetId ||
    filter !== appliedFilter ||
    frame !== appliedFrame ||
    !sameTransform(transform, appliedTransform) ||
    !sameSpecialEffect(specialEffect, appliedSpecialEffect);

  return {
    photo,
    params,
    presetId,
    filter,
    frame,
    transform,
    specialEffect,
    status,
    loading,
    canUndo:
      past.current.length > 0 ||
      !paramsEqual(params, appliedParams) ||
      presetId !== appliedPresetId ||
      filter !== appliedFilter ||
      frame !== appliedFrame ||
      !sameTransform(transform, appliedTransform) ||
      !sameSpecialEffect(specialEffect, appliedSpecialEffect),
    canRedo: future.current.length > 0,
    historyTick,
    hasUnappliedChanges,
    setStatus,
    openFile,
    openSample,
    closePhoto,
    applyPreset,
    applyChanges,
    toggleMirror,
    toggleFlipVertical,
    chooseSpecialEffect,
    setSpecialEffectAmount,
    setSpecialEffectBrushSize,
    addSpecialEffectStroke,
    clearSpecialEffectMask,
    disableSpecialEffect,
    setParam,
    beginAdjust,
    endAdjust,
    resetAll,
    undo,
    redo,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
