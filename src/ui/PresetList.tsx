import { useState } from "react";
import { PRESETS } from "../engine/presets";
import { CheckMark } from "./icons";

const FILTER_IDS = new Set([
  "jpeg",
  "collage",
  "blur-pixelate",
  "ccd",
  "nokia",
  "quarter-inch",
  "iphone-3gs",
]);

const CAMERA_PRESETS = PRESETS.filter(
  (preset) => preset.id !== "none" && !FILTER_IDS.has(preset.id),
);
const FILTER_PRESETS = PRESETS.filter((preset) => FILTER_IDS.has(preset.id));
const ORIGINAL = PRESETS.find((preset) => preset.id === "none")!;

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const renderItem = (p: (typeof PRESETS)[number], nested = false) => {
    const selected = p.id === presetId;
    const active = hovered === p.id;

    return (
      <button
        key={p.id}
        type="button"
        className={"ui-item text-[12px] " + (nested ? "pl-6" : "")}
        style={
          active
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
        <span className="flex items-center gap-1">
          <span className="w-[12px] shrink-0">
            {selected ? <CheckMark size={10} /> : null}
          </span>
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
        </span>
      </button>
    );
  };

  const filtersSelected = FILTER_PRESETS.some((p) => p.id === presetId);

  return (
    <div
      className="relative bg-white"
      onMouseLeave={() => {
        setFiltersOpen(false);
        setHovered(null);
        onHint?.(null);
      }}
    >
      {renderItem(ORIGINAL)}

      <div className="relative">
        <button
          type="button"
          className="ui-item text-[12px]"
          style={
            filtersOpen || filtersSelected
              ? { backgroundColor: "var(--sel)", color: "#ffffff" }
              : undefined
          }
          aria-haspopup="menu"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
          onMouseEnter={() => {
            setHovered(null);
            setFiltersOpen(true);
            onHint?.("Reference-style digital filters.");
          }}
          onFocus={() => {
            setFiltersOpen(true);
            onHint?.("Reference-style digital filters.");
          }}
        >
          <span className="flex items-center gap-1">
            <span className="w-[12px] shrink-0" />
            <span className="min-w-0 flex-1">Filters</span>
            <span className="text-[11px]">{filtersOpen ? "▼" : "▶"}</span>
          </span>
        </button>

        {filtersOpen && (
          <div
            className="bevel-raised absolute left-full top-0 z-50 min-w-[180px] p-[2px]"
            role="menu"
            aria-label="Filters"
          >
            {FILTER_PRESETS.map((p) => renderItem(p, true))}
          </div>
        )}
      </div>

      {CAMERA_PRESETS.map((p) => renderItem(p))}

      {presetId === "custom" && (
        <span className="ui-item block bg-[color:var(--sel)] text-[12px] text-white">
          Custom
        </span>
      )}
    </div>
  );
}
