import { useState } from "react";
import { PRESETS } from "../engine/presets";

export function PresetList({
  presetId,
  onPick,
  onHint,
}: {
  presetId: string;
  onPick: (id: string) => void;
  onHint?: (text: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <ul
      className="scroll-thin max-h-[38vh] min-h-[120px] overflow-y-auto bg-white lg:max-h-[340px]"
      role="listbox"
      aria-label="Presets"
    >
      {PRESETS.map((p) => {
        const selected = p.id === presetId;
        return (
          <li key={p.id} role="option" aria-selected={selected}>
            <button
              type="button"
              className="ui-item text-[12px]"
              style={
                hovered === p.id
                  ? { backgroundColor: "var(--sel)", color: "#ffffff" }
                  : undefined
              }
              aria-pressed={selected}
              onClick={() => onPick(p.id)}
              onMouseEnter={() => {
                setHovered(p.id);
                onHint?.(p.note);
              }}
              onMouseLeave={() => {
                setHovered(null);
                onHint?.(null);
              }}
              onFocus={() => onHint?.(p.note)}
              onBlur={() => onHint?.(null)}
            >
              {p.name}
            </button>
          </li>
        );
      })}
      {presetId === "custom" && (
        <li role="option" aria-selected>
          <span className="ui-item block bg-[color:var(--sel)] text-[12px] text-white">
            Custom
          </span>
        </li>
      )}
    </ul>
  );
}
