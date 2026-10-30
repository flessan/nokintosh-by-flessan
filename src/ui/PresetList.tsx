import { useMemo, useState } from "react";
import { CAMERA_PRESETS, COMPACT_CAMERA_PRESETS, PHONE_PRESETS } from "../engine/presets";
import type { LoadedPhoto } from "../engine/image";
import { CheckMark } from "./icons";
import { LookThumbnail } from "./LookThumbnail";

type Category = "all" | "cameras" | "phones";
const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All looks" },
  { id: "cameras", label: "Cameras" },
  { id: "phones", label: "Phones" },
];

export function PresetList({ presetId, photo, onPick, onHint }: {
  presetId: string;
  photo: LoadedPhoto | null;
  onPick: (id: string) => void;
  onHint?: (text: string | null) => void;
}) {
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const entries = useMemo(() => {
    const source = category === "cameras" ? COMPACT_CAMERA_PRESETS : category === "phones" ? PHONE_PRESETS : CAMERA_PRESETS;
    const normalized = query.trim().toLowerCase();
    return normalized ? source.filter((p) => p.name.toLowerCase().includes(normalized) || p.note.toLowerCase().includes(normalized)) : source;
  }, [category, query]);
  const selected = CAMERA_PRESETS.find((p) => p.id === presetId);
  const showOriginal = category === "all" && (!query.trim() || "original clean starting point".includes(query.trim().toLowerCase()));
  const hasResults = entries.length > 0 || showOriginal;

  return (
    <div className="look-gallery space-y-2">
      <div className="look-gallery-intro px-[5px]">
        <span className="gallery-kicker">CAMERA PROFILES</span>
        <p>Choose a camera character, then fine-tune the result.</p>
      </div>
      <div className="px-[5px]">
        <label htmlFor="look-search" className="sr-only">Search camera looks</label>
        <input id="look-search" type="search" className="gallery-search bevel-sunken w-full bg-white px-2" placeholder="Search cameras..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="gallery-filter-tabs" role="tablist" aria-label="Camera look categories">
        {CATEGORIES.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={category === item.id} className="gallery-filter-tab" data-active={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="look-gallery-grid" aria-live="polite">
        {showOriginal && (
          <button type="button" className="look-card" aria-pressed={presetId === "none"} data-selected={presetId === "none"} onClick={() => onPick("none")} onMouseEnter={() => onHint?.("Return to an unprocessed photo.")} onMouseLeave={() => onHint?.(null)} title="No camera processing">
            <span className="look-card-image"><LookThumbnail photo={photo} lookId="original" /><span className="look-card-tag">REFERENCE</span></span>
            <span className="look-card-copy"><span className="look-card-name">Original</span><span className="look-card-note">A clean starting point</span></span>
            {presetId === "none" && <span className="look-card-check"><CheckMark size={10} /></span>}
          </button>
        )}
        {entries.map((preset) => (
          <button key={preset.id} type="button" className="look-card" aria-pressed={presetId === preset.id} data-selected={presetId === preset.id} onClick={() => onPick(preset.id)} onMouseEnter={() => onHint?.(preset.note)} onMouseLeave={() => onHint?.(null)} title={preset.note}>
            <span className="look-card-image">
              <LookThumbnail photo={photo} lookId={preset.id} />
              <span className="look-card-tag">{preset.id === "jpeg" ? "LOW-RES JPEG" : preset.id === "ccd" ? "CCD SENSOR" : preset.id === "night-flash-compact" ? "NIGHT / FLASH" : preset.id === "early-camera-phone" ? "PHONE CAMERA" : "CAMERA PROFILE"}</span>
            </span>
            <span className="look-card-copy"><span className="look-card-name">{preset.name}</span><span className="look-card-note">{preset.note}</span></span>
            {presetId === preset.id && <span className="look-card-check"><CheckMark size={10} /></span>}
          </button>
        ))}
        {!hasResults && <p className="gallery-empty col-span-2">No camera looks match “{query}”.</p>}
      </div>
      <div className="gallery-selection mx-[5px]" aria-live="polite">
        <span className="gallery-kicker">SELECTED PROFILE</span>
        <strong>{selected?.name ?? (presetId === "custom" ? "Custom settings" : "Original")}</strong>
        <p>{selected?.note ?? (presetId === "custom" ? "Your current adjustments are now a custom look." : "Choose a camera profile to shape the photo.")}</p>
      </div>
    </div>
  );
}
