import { useState } from "react";
import { PRESETS } from "../engine/presets";
import { CheckMark } from "./icons";

const FILTER_IDS = new Set([
  "bw",
  "sepia",
  "negative",
  "warm-filter",
  "cool-filter",
  "high-contrast",
]);

const CAMERA2_IDS = new Set([
  "nokia",
  "quarter-inch",
  "iphone-3gs",
]);

const FILTER_PRESETS = PRESETS.filter((preset) => FILTER_IDS.has(preset.id));
const CAMERA2_PRESETS = PRESETS.filter((preset) => CAMERA2_IDS.has(preset.id));
const DIRECT_PRESETS = PRESETS.filter(
  (preset) =>
    preset.id !== "none" &&
    !FILTER_IDS.has(preset.id) &&
    !CAMERA2_IDS.has(preset.id),
);
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
  const [openMenu, setOpenMenu] = useState<"filters" | "camera2" | null>(null);

  const renderItem = (p: (typeof PRESETS)[number], nested = false) => {
    const selected = p.id === presetId;
    const active = hovered === p.id;

    return (
      <button
        key={p.id}
        type="button"
        role={nested ? "menuitem" : undefined}
        className={"ui-item text-[12px] " + (nested ? "pl-[18px]" : "")}
        style={active ? { backgroundColor: "var(--sel)", color: "#ffffff" } : undefined}
        aria-pressed={selected}
        onClick={() => {
          setOpenMenu(null);
          onPick(p.id);
        }}
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
        <span className="flex min-w-0 items-center gap-1">
          <span className="w-[12px] shrink-0">
            {selected ? <CheckMark size={10} /> : null}
          </span>
          <span className="min-w-0 flex-1 truncate">{p.name}</span>
        </span>
      </button>
    );
  };

  const renderMenu = (
    label: string,
    menu: "filters" | "camera2",
    items: typeof FILTER_PRESETS,
    selected: boolean,
  ) => (
    <div className="relative" onMouseEnter={() => setOpenMenu(menu)}>
      <button
        type="button"
        className="ui-item text-[12px]"
        style={
          openMenu === menu || selected
            ? { backgroundColor: "var(--sel)", color: "#ffffff" }
            : undefined
        }
        aria-haspopup="menu"
        aria-expanded={openMenu === menu}
        onClick={() => setOpenMenu((current) => (current === menu ? null : menu))}
        onMouseEnter={() => {
          setHovered(null);
          setOpenMenu(menu);
          onHint?.(
            menu === "filters"
              ? "B&W, sepia and other generic image filters."
              : "Small-sensor and early-phone camera profiles.",
          );
        }}
      >
        <span className="flex items-center gap-1">
          <span className="w-[12px] shrink-0" />
          <span className="min-w-0 flex-1 text-left">{label}</span>
          <span className="text-[11px]">{openMenu === menu ? "▼" : "▶"}</span>
        </span>
      </button>

      <div
        className={
          "overflow-hidden transition-[max-height,opacity] duration-150 ease-out " +
          (openMenu === menu ? "max-h-[420px] opacity-100" : "pointer-events-none max-h-0 opacity-0")
        }
        aria-hidden={openMenu !== menu}
      >
        <div
          className="bevel-sunken mx-[3px] my-[2px] bg-[color:var(--face)] p-[2px]"
          role="menu"
          aria-label={label}
        >
          {items.map((item) => renderItem(item, true))}
        </div>
      </div>
    </div>
  );

  const filtersSelected = FILTER_PRESETS.some((p) => p.id === presetId);
  const camera2Selected = CAMERA2_PRESETS.some((p) => p.id === presetId);

  return (
    <div
      className="relative bg-white"
      onMouseLeave={() => {
        setOpenMenu(null);
        setHovered(null);
        onHint?.(null);
      }}
    >
      {renderItem(ORIGINAL)}
      {renderMenu("Filters", "filters", FILTER_PRESETS, filtersSelected)}

      {DIRECT_PRESETS.map((p) => renderItem(p))}

      {renderMenu("Camera 2", "camera2", CAMERA2_PRESETS, camera2Selected)}

      {presetId === "custom" && (
        <span className="ui-item block bg-[color:var(--sel)] text-[12px] text-white">
          Custom
        </span>
      )}
    </div>
  );
}
