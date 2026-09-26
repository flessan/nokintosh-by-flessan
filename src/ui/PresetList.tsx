import { useState } from "react";
import { PRESETS } from "../engine/presets";
import type {
  SpecialEffectKind,
  SpecialEffectMode,
  SpecialEffectState,
} from "../engine/types";
import { SPECIAL_EFFECT_LABELS } from "../engine/specialEffect";
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

const MODES: SpecialEffectMode[] = ["uniform", "vignette", "draw"];
const SPECIAL_KINDS = ["gaussian-blur", "pixelate"] as const;

export function PresetList({
  presetId,
  specialEffect,
  onPick,
  onChooseSpecialEffect,
  onHint,
}: {
  presetId: string;
  specialEffect: SpecialEffectState;
  onPick: (id: string) => void;
  onChooseSpecialEffect: (kind: SpecialEffectKind, mode: SpecialEffectMode) => void;
  onHint?: (text: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<
    "filters" | "camera2" | "special" | "gaussian" | "pixelate" | null
  >(null);

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

  const renderSpecialMenu = () => {
    const selected = specialEffect.kind !== "none";
    return (
      <div className="relative" onMouseEnter={() => setOpenMenu("special")}>
        <button
          type="button"
          className="ui-item text-[12px]"
          style={
            selected || openMenu === "special" || openMenu === "gaussian" || openMenu === "pixelate"
              ? { backgroundColor: "var(--sel)", color: "#ffffff" }
              : undefined
          }
          aria-haspopup="menu"
          aria-expanded={openMenu === "special" || openMenu === "gaussian" || openMenu === "pixelate"}
          onClick={() =>
            setOpenMenu((current) =>
              current === "special" || current === "gaussian" || current === "pixelate"
                ? null
                : "special",
            )
          }
          onMouseEnter={() => {
            setHovered(null);
            setOpenMenu("special");
            onHint?.("Gaussian blur and pixelation, each with Uniform, Vignette or Draw.");
          }}
        >
          <span className="flex items-center gap-1">
            <span className="w-[12px] shrink-0">
              {selected ? <CheckMark size={10} /> : null}
            </span>
            <span className="min-w-0 flex-1 text-left">Blur / Pixelate</span>
            <span className="text-[11px]">
              {openMenu === "special" || openMenu === "gaussian" || openMenu === "pixelate" ? "▼" : "▶"}
            </span>
          </span>
        </button>

        <div
          className={
            "overflow-hidden transition-[max-height,opacity] duration-150 ease-out " +
            (openMenu === "special" || openMenu === "gaussian" || openMenu === "pixelate"
              ? "max-h-[500px] opacity-100"
              : "pointer-events-none max-h-0 opacity-0")
          }
          aria-hidden={openMenu !== "special" && openMenu !== "gaussian" && openMenu !== "pixelate"}
        >
          <div
            className="bevel-sunken mx-[3px] my-[2px] bg-[color:var(--face)] p-[2px]"
            role="menu"
            aria-label="Blur / Pixelate"
          >
            {SPECIAL_KINDS.map((kind) => {
              const open = openMenu === kind;
              const active = specialEffect.kind === kind;
              return (
                <div key={kind}>
                  <button
                    type="button"
                    className="ui-item text-[12px] pl-[18px]"
                    style={
                      open || active
                        ? { backgroundColor: "var(--sel)", color: "#ffffff" }
                        : undefined
                    }
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpenMenu((current) => (current === kind ? "special" : kind))}
                    onMouseEnter={() => {
                      setHovered(null);
                      setOpenMenu(kind);
                      onHint?.(
                        kind === "gaussian-blur"
                          ? "Gaussian blur with three application modes."
                          : "Hard-edged pixel blocks with three application modes.",
                      );
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <span className="w-[12px] shrink-0">
                        {active ? <CheckMark size={10} /> : null}
                      </span>
                      <span className="flex-1 text-left">{SPECIAL_EFFECT_LABELS[kind]}</span>
                      <span className="text-[11px]">{open ? "▼" : "▶"}</span>
                    </span>
                  </button>

                  <div
                    className={
                      "overflow-hidden transition-[max-height,opacity] duration-150 ease-out " +
                      (open ? "max-h-[160px] opacity-100" : "pointer-events-none max-h-0 opacity-0")
                    }
                    aria-hidden={!open}
                  >
                    <div className="mx-[6px] my-[1px] border-l border-[color:var(--shadow)]">
                      {MODES.map((mode) => {
                        const modeActive = specialEffect.kind === kind && specialEffect.mode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            role="menuitem"
                            className="ui-item pl-[24px] text-[12px]"
                            style={
                              modeActive
                                ? { backgroundColor: "var(--sel)", color: "#ffffff" }
                                : undefined
                            }
                            aria-pressed={modeActive}
                            onClick={() => {
                              onChooseSpecialEffect(kind, mode);
                              setOpenMenu(null);
                              onHint?.(
                                mode === "draw"
                                  ? "Drag over the photo to paint the effect."
                                  : mode === "vignette"
                                    ? "The effect is strongest near the edges."
                                    : "The effect covers the complete photo.",
                              );
                            }}
                          >
                            <span className="flex items-center gap-1">
                              <span className="w-[12px] shrink-0">
                                {modeActive ? <CheckMark size={10} /> : null}
                              </span>
                              <span className="capitalize">{mode}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

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
      {renderSpecialMenu()}
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
