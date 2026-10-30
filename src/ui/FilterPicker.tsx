import { useMemo, useState } from "react";
import { FILTER_PRESETS } from "../engine/presets";
import type { LoadedPhoto } from "../engine/image";
import { CheckMark } from "./icons";
import { LookThumbnail } from "./LookThumbnail";

type Family = "all" | "color" | "mono" | "digital";
const FILTER_FAMILIES: { id: Family; label: string }[] = [
  { id: "all", label: "All" },
  { id: "color", label: "Colour" },
  { id: "mono", label: "Mono" },
  { id: "digital", label: "Digital" },
];
const FAMILY_IDS: Record<Exclude<Family, "all">, string[]> = {
  color: ["warm-filter", "cool-filter", "chrome"],
  mono: ["bw", "sepia", "negative"],
  digital: ["high-contrast", "cross-process", "soft-flash"],
};

export function FilterPicker({ presetId, photo, onPick, onHint }: {
  presetId: string;
  photo: LoadedPhoto | null;
  onPick: (id: string) => void;
  onHint?: (text: string | null) => void;
}) {
  const [family, setFamily] = useState<Family>("all");
  const [query, setQuery] = useState("");
  const entries = useMemo(() => {
    const source = family === "all" ? FILTER_PRESETS : FILTER_PRESETS.filter((p) => FAMILY_IDS[family].includes(p.id));
    const normalized = query.trim().toLowerCase();
    return normalized ? source.filter((p) => p.name.toLowerCase().includes(normalized) || p.note.toLowerCase().includes(normalized)) : source;
  }, [family, query]);
  const selected = FILTER_PRESETS.find((p) => p.id === presetId);

  return (
    <div className="filter-gallery space-y-2">
      <div className="look-gallery-intro px-[5px]">
        <span className="gallery-kicker">COLOUR ROOM</span>
        <p>Try a colour treatment. Every card previews the same photo.</p>
      </div>
      <div className="px-[5px]">
        <label htmlFor="filter-search" className="sr-only">Search filters</label>
        <input id="filter-search" type="search" className="gallery-search bevel-sunken w-full bg-white px-2" placeholder="Search filters..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="gallery-filter-tabs" role="tablist" aria-label="Filter categories">
        {FILTER_FAMILIES.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={family === item.id} className="gallery-filter-tab" data-active={family === item.id} onClick={() => setFamily(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="look-gallery-grid" aria-live="polite">
        {family === "all" && (
          <button type="button" className="look-card" aria-pressed={presetId === "none"} data-selected={presetId === "none"} onClick={() => onPick("none")} onMouseEnter={() => onHint?.("Remove the selected filter and camera profile.")} onMouseLeave={() => onHint?.(null)}>
            <span className="look-card-image"><LookThumbnail photo={photo} lookId="original" /><span className="look-card-tag">NO FILTER</span></span>
            <span className="look-card-copy"><span className="look-card-name">Original</span><span className="look-card-note">No colour treatment</span></span>
            {presetId === "none" && <span className="look-card-check"><CheckMark size={10} /></span>}
          </button>
        )}
        {entries.map((preset) => (
          <button key={preset.id} type="button" className="look-card" aria-pressed={presetId === preset.id} data-selected={presetId === preset.id} onClick={() => onPick(preset.id)} onMouseEnter={() => onHint?.(preset.note)} onMouseLeave={() => onHint?.(null)} title={preset.note}>
            <span className="look-card-image"><LookThumbnail photo={photo} lookId={preset.id} /><span className="look-card-tag">{FAMILY_IDS.color.includes(preset.id) ? "COLOUR" : FAMILY_IDS.mono.includes(preset.id) ? "MONOCHROME" : "DIGITAL TONE"}</span></span>
            <span className="look-card-copy"><span className="look-card-name">{preset.name}</span><span className="look-card-note">{preset.note}</span></span>
            {presetId === preset.id && <span className="look-card-check"><CheckMark size={10} /></span>}
          </button>
        ))}
        {entries.length === 0 && <p className="gallery-empty col-span-2">No filters match “{query}”.</p>}
      </div>
      <div className="gallery-selection mx-[5px]" aria-live="polite">
        <span className="gallery-kicker">SELECTED FILTER</span>
        <strong>{selected?.name ?? "Original"}</strong>
        <p>{selected?.note ?? "No dedicated filter is selected."}</p>
      </div>
    </div>
  );
}
