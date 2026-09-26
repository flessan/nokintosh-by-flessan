import { CONTROLS, GROUP_LABELS, type ControlDef, type EffectParams, type ParamId } from "../engine/types";

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

export function EffectsPanel({
  params,
  onChange,
  onCommitStart,
  onCommitEnd,
  onHint,
  disabled,
}: {
  params: EffectParams;
  onChange: (id: ParamId, v: number) => void;
  onCommitStart: () => void;
  onCommitEnd: () => void;
  onHint?: (text: string | null) => void;
  disabled?: boolean;
}) {
  const groups: ControlDef["group"][] = ["core", "optics", "tone"];
  return (
    <div>
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
    </div>
  );
}
