import {
  CONTROLS,
  GROUP_LABELS,
  type ControlDef,
  type EffectParams,
  type ParamId,
  type SpecialEffectKind,
  type SpecialEffectMode,
  type SpecialEffectState,
} from "../engine/types";
import { SPECIAL_EFFECT_LABELS } from "../engine/specialEffect";

function displayValue(def: ControlDef, value: number): string {
  const v = Math.round(value * 100);
  if (def.bipolar) return `${v > 0 ? "+" : ""}${v}`;
  return `${v}`;
}

function Slider({
  def,
  value,
  onChange,
  onCommitStart,
  onCommitEnd,
  onHint,
  disabled,
}: {
  def: ControlDef;
  value: number;
  onChange: (id: ParamId, v: number) => void;
  onCommitStart: () => void;
  onCommitEnd: () => void;
  onHint?: (text: string | null) => void;
  disabled?: boolean;
}) {
  const id = `ctl-${def.id}`;
  return (
    <div
      className="px-[5px] py-[3px]"
      onMouseEnter={() => onHint?.(def.hint)}
      onMouseLeave={() => onHint?.(null)}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] leading-none">
          {def.label}
        </label>
        <output
          htmlFor={id}
          className="bevel-thin-in min-w-[38px] bg-white px-1 text-right font-mono text-[11px] leading-[16px] tabular-nums"
        >
          {displayValue(def, value)}
        </output>
      </div>
      <input
        id={id}
        className="ui-range mt-[1px]"
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onPointerDown={onCommitStart}
        onPointerUp={onCommitEnd}
        onKeyDown={onCommitStart}
        onKeyUp={onCommitEnd}
        onFocus={() => onHint?.(def.hint)}
        onBlur={() => onHint?.(null)}
        onChange={(e) => onChange(def.id, parseFloat(e.target.value))}
      />
      <span id={`${id}-hint`} className="sr-only">
        {def.hint}
      </span>
    </div>
  );
}

function SpecialEffectControls({
  effect,
  onChoose,
  onSetAmount,
  onSetBrushSize,
  onClearMask,
  onDisable,
  onHint,
  disabled,
}: {
  effect: SpecialEffectState;
  onChoose: (kind: SpecialEffectKind, mode: SpecialEffectMode) => void;
  onSetAmount: (amount: number) => void;
  onSetBrushSize: (size: number) => void;
  onClearMask: () => void;
  onDisable: () => void;
  onHint?: (text: string | null) => void;
  disabled?: boolean;
}) {
  if (effect.kind === "none") return null;

  const name = SPECIAL_EFFECT_LABELS[effect.kind];
  const modeLabel = effect.mode[0].toUpperCase() + effect.mode.slice(1);

  return (
    <div className="mb-2 border-b border-[color:var(--shadow)] bg-[color:var(--face)] px-[5px] pb-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--ink-dim)]">
            Special Effect
          </div>
          <div className="truncate text-[12px] font-bold">{name} // {modeLabel}</div>
        </div>
        <button
          type="button"
          className="ui-btn min-h-[21px] px-2"
          onClick={onDisable}
          disabled={disabled}
          title="Turn off blur or pixelate"
        >
          Off
        </button>
      </div>

      <div className="mb-1 grid grid-cols-3 gap-[2px]">
        {(["uniform", "vignette", "draw"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className="ui-btn min-h-[22px] px-1 text-[11px] capitalize"
            data-pressed={effect.mode === mode}
            aria-pressed={effect.mode === mode}
            disabled={disabled}
            onClick={() => onChoose(effect.kind, mode)}
            onMouseEnter={() =>
              onHint?.(
                mode === "uniform"
                  ? "Apply the effect evenly across the whole photo."
                  : mode === "vignette"
                    ? "Keep the centre clearer while the outer edges receive the effect."
                    : "Paint where the effect should appear on the photo.",
              )
            }
            onMouseLeave={() => onHint?.(null)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div
        className="px-0"
        onMouseEnter={() =>
          onHint?.(
            effect.kind === "gaussian-blur"
              ? "Blur strength from light softness to a strong Gaussian blur."
              : "Pixel block size from fine to chunky.",
          )
        }
        onMouseLeave={() => onHint?.(null)}
      >
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="special-strength" className="text-[12px]">
            Strength
          </label>
          <output
            htmlFor="special-strength"
            className="bevel-thin-in min-w-[38px] bg-white px-1 text-right font-mono text-[11px] leading-[16px] tabular-nums"
          >
            {Math.round(effect.amount * 100)}
          </output>
        </div>
        <input
          id="special-strength"
          className="ui-range mt-[1px]"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={effect.amount}
          disabled={disabled}
          onChange={(e) => onSetAmount(parseFloat(e.target.value))}
        />
      </div>

      {effect.mode === "draw" && (
        <div className="mt-1">
          <div
            onMouseEnter={() => onHint?.("Brush size used while painting the blur or pixelate mask.")}
            onMouseLeave={() => onHint?.(null)}
          >
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="special-brush" className="text-[12px]">
                Brush
              </label>
              <output
                htmlFor="special-brush"
                className="bevel-thin-in min-w-[38px] bg-white px-1 text-right font-mono text-[11px] leading-[16px] tabular-nums"
              >
                {Math.round(effect.brushSize * 100)}%
              </output>
            </div>
            <input
              id="special-brush"
              className="ui-range mt-[1px]"
              type="range"
              min="0.015"
              max="0.25"
              step="0.005"
              value={effect.brushSize}
              disabled={disabled}
              onChange={(e) => onSetBrushSize(parseFloat(e.target.value))}
            />
          </div>

          <div className="mt-1 flex gap-1">
            <button
              type="button"
              className="ui-btn flex-1 px-2 text-[11px]"
              disabled={disabled || effect.strokes.length === 0}
              onClick={onClearMask}
            >
              Clear Draw
            </button>
            <div className="flex-1 px-1 text-[10px] leading-[21px] text-[color:var(--ink-dim)]">
              Drag on photo
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EffectsPanel({
  params,
  specialEffect,
  onChange,
  onCommitStart,
  onCommitEnd,
  onHint,
  onApply,
  canApply,
  onChooseSpecialEffect,
  onSetSpecialEffectAmount,
  onSetSpecialEffectBrushSize,
  onClearSpecialEffectMask,
  onDisableSpecialEffect,
  disabled,
}: {
  params: EffectParams;
  specialEffect: SpecialEffectState;
  onChange: (id: ParamId, v: number) => void;
  onCommitStart: () => void;
  onCommitEnd: () => void;
  onHint?: (text: string | null) => void;
  onApply: () => void;
  canApply: boolean;
  onChooseSpecialEffect: (kind: SpecialEffectKind, mode: SpecialEffectMode) => void;
  onSetSpecialEffectAmount: (amount: number) => void;
  onSetSpecialEffectBrushSize: (size: number) => void;
  onClearSpecialEffectMask: () => void;
  onDisableSpecialEffect: () => void;
  disabled?: boolean;
}) {
  const groups: ControlDef["group"][] = ["core", "optics", "tone"];
  return (
    <div>
      <SpecialEffectControls
        effect={specialEffect}
        onChoose={onChooseSpecialEffect}
        onSetAmount={onSetSpecialEffectAmount}
        onSetBrushSize={onSetSpecialEffectBrushSize}
        onClearMask={onClearSpecialEffectMask}
        onDisable={onDisableSpecialEffect}
        onHint={onHint}
        disabled={disabled}
      />

      {groups.map((g, gi) => (
        <div key={g}>
          {gi > 0 && (
            <div className="mt-[6px] mb-[2px] flex items-center gap-2 px-[5px]">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--ink-dim)]">
                {GROUP_LABELS[g]}
              </span>
              <span className="h-[2px] flex-1 bevel-thin-in" />
            </div>
          )}
          {CONTROLS.filter((c) => c.group === g).map((def) => (
            <Slider
              key={def.id}
              def={def}
              value={params[def.id]}
              onChange={onChange}
              onCommitStart={onCommitStart}
              onCommitEnd={onCommitEnd}
              onHint={onHint}
              disabled={disabled}
            />
          ))}
        </div>
      ))}

      <div className="mt-2 border-t border-[color:var(--shadow)] px-[5px] pt-2">
        <button
          type="button"
          className="ui-btn w-full font-bold"
          disabled={disabled || !canApply}
          onClick={onApply}
        >
          Apply
        </button>
        <div className="mt-1 text-center text-[10px] text-[color:var(--ink-dim)]">
          Ctrl+Enter
        </div>
      </div>
    </div>
  );
}
