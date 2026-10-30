import { useMemo, useState } from "react";
import { PRESETS } from "../engine/presets";
import { CheckMark } from "./icons";

type Category = "all" | "filters" | "cameras" | "phones";

const FILTER_IDS = new Set([
  "bw",
  "sepia",
  "negative",
  "warm-filter",
  "cool-filter",
  "high-contrast",
  "cross-process",
  "chrome",
  "soft-flash",
]);

const PHONE_IDS = new Set(["nokia", "quarter-inch", "iphone-3gs"]);
const CAMERAS = PRESETS.filter((preset) =>
  preset.id !== "none" &&
  preset.id !== "collage" &&
  !FILTER_IDS.has(preset.id) &&
  !PHONE_IDS.has(preset.id),
);
const FILTERS = PRESETS.filter((preset) => FILTER_IDS.has(preset.id));
const PHONES = PRESETS.filter((preset) => PHONE_IDS.has(preset.id));
const ALL = PRESETS.filter((preset) => preset.id !== "collage" && preset.id !== "none");

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "filters", label: "Filters" },
  { id: "cameras", label: "Cameras" },
  { id: "phones", label: "Phones" },
];

export function PresetList({
  presetId,
  onPick,
  onHint,
}: {
  presetId: string;
  onPick: (id: string) => void;
  onHint?: (text: string | null) => void;
}) {
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const source =
      category === "filters" ? FILTERS :
      category === "cameras" ? CAMERAS :
      category === "phones" ? PHONES :
      ALL;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return source;
    return source.filter((preset) =>
      preset.name.toLowerCase().includes(normalized) ||
      preset.note.toLowerCase().includes(normalized),
    );
  }, [category, query]);

  const selected = PRESETS.find((preset) => preset.id === presetId);
  const showOriginal =
    category === "all" &&
    (!query.trim() || "original clean starting point".includes(query.trim().toLowerCase()));
  const hasVisibleResults = entries.length > 0 || showOriginal;

  return (
    <div className="space-y-2">
      <div className="px-[5px]">
        <label htmlFor="look-search" className="sr-only">Search camera looks</label>
        <input
          id="look-search"
          type="search"
          className="bevel-sunken h-[27px] w-full bg-white px-2 text-[11px] outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[color:var(--sel)]"
          placeholder="Find a look..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 gap-[2px] px-[5px]" role="tablist" aria-label="Camera look categories">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={category === item.id}
            className="ui-btn min-h-[24px] min-w-0 px-1 text-[10px]"
            data-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-[4px] px-[5px]" aria-live="polite">
        {showOriginal && (
          <button
            type="button"
            className="look-card bevel-thin-out"
            aria-pressed={presetId === "none"}
            data-selected={presetId === "none"}
            onClick={() => onPick("none")}
            onMouseEnter={() => onHint?.("Return to an unprocessed photo.") }
            onMouseLeave={() => onHint?.(null)}
            title="No camera processing"
          >
            <span className="look-card-mark look-card-mark-original">ORIGINAL</span>
            <span className="look-card-name">Original</span>
            <span className="look-card-note">Clean starting point</span>
          </button>
        )}
        {entries.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="look-card bevel-thin-out"
            aria-pressed={presetId === preset.id}
            data-selected={presetId === preset.id}
            onClick={() => onPick(preset.id)}
            onMouseEnter={() => onHint?.(preset.note)}
            onMouseLeave={() => onHint?.(null)}
            title={preset.note}
          >
            <span className={"look-card-mark look-card-mark-" + preset.id}>
              {preset.id === "ccd" ? "CCD" :
               preset.id === "jpeg" ? "JPEG" :
               preset.id === "nokia" ? "2004" :
               preset.id === "night-flash-compact" ? "FLASH" :
               preset.id === "cross-process" ? "X-PRO" :
               preset.id === "soft-flash" ? "SOFT" :
               preset.id === "chrome" ? "CHROME" :
               preset.name.slice(0, 10).toUpperCase()}
            </span>
            <span className="look-card-name">{preset.name}</span>
            <span className="look-card-note">{preset.note}</span>
            {presetId === preset.id && <span className="look-card-check"><CheckMark size={10} /></span>}
          </button>
        ))}
        {!hasVisibleResults && (
          <p className="col-span-2 bevel-thin-in bg-white px-2 py-3 text-center text-[11px] text-[color:var(--ink-dim)]">
            No looks match “{query}”.
          </p>
        )}
      </div>

      <div className="mx-[5px] bevel-thin-in bg-white px-2 py-2 text-[10px] leading-snug text-[color:var(--ink-dim)]">
        <span className="font-bold text-[color:var(--ink)]">
          {selected?.name ?? (presetId === "custom" ? "Custom look" : "Choose a look")}
        </span>
        <span className="mt-1 block">
          {selected?.note ?? (presetId === "custom" ? "Your current adjustments are changing this look." : "Pick a camera or filter to see it on your photo.")}
        </span>
      </div>
    </div>
  );
}
