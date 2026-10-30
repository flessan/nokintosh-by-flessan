import { useEffect, useMemo, useRef, useState } from "react";
import { applyFrame, FRAME_OPTIONS } from "../engine/frame";
import type { LoadedPhoto } from "../engine/image";
import type { FrameMode } from "../engine/types";

type Family = "all" | "Desktop" | "Print" | "Camera";

function FrameThumbnail({ photo, frame }: { photo: LoadedPhoto | null; frame: FrameMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const source = photo?.preview as HTMLCanvasElement | undefined;
    const sourceWidth = source?.width ?? 4;
    const sourceHeight = source?.height ?? 3;
    const scale = Math.min(176 / sourceWidth, 106 / sourceHeight);
    const width = Math.max(48, Math.round(sourceWidth * scale));
    const height = Math.max(40, Math.round(sourceHeight * scale));
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (source) ctx.drawImage(source, 0, 0, width, height);
    else {
      ctx.fillStyle = "#c9d8d3"; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#e9dfc5"; ctx.beginPath(); ctx.arc(width * .72, height * .23, Math.max(4, width * .055), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#86a29b"; ctx.beginPath(); ctx.moveTo(0,height*.72); ctx.lineTo(width*.28,height*.34); ctx.lineTo(width*.48,height*.74); ctx.lineTo(width*.69,height*.47); ctx.lineTo(width,height*.78); ctx.lineTo(width,height); ctx.lineTo(0,height); ctx.closePath(); ctx.fill();
    }
    applyFrame(canvas, frame);
  }, [photo?.preview, frame]);
  return <canvas ref={canvasRef} className="frame-card-preview" aria-hidden="true" />;
}

export function FramePicker({ value, photo, onPick }: {
  value: FrameMode;
  photo: LoadedPhoto | null;
  onPick: (frame: FrameMode) => void;
}) {
  const [family, setFamily] = useState<Family>("all");
  const [query, setQuery] = useState("");
  const entries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return FRAME_OPTIONS.filter((option) => {
      const inFamily = family === "all" || option.family === family;
      const matches = !normalized || option.name.toLowerCase().includes(normalized) || option.note.toLowerCase().includes(normalized);
      return inFamily && matches;
    });
  }, [family, query]);
  const selected = FRAME_OPTIONS.find((option) => option.id === value);

  return (
    <div className="frame-gallery p-[5px]">
      <div className="frame-gallery-intro"><span className="gallery-kicker">FINISHING TOUCH</span><p>Frames are part of the photo and travel with your export.</p></div>
      <div className="px-[2px]">
        <label htmlFor="frame-search" className="sr-only">Search photo frames</label>
        <input id="frame-search" type="search" className="gallery-search bevel-sunken w-full bg-white px-2" placeholder="Find a frame..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="gallery-filter-tabs" role="tablist" aria-label="Frame families">
        {(["all", "Desktop", "Print", "Camera"] as Family[]).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={family === id} className="gallery-filter-tab" data-active={family === id} onClick={() => setFamily(id)}>{id === "all" ? "All" : id === "Print" ? "Prints" : id}</button>
        ))}
      </div>
      <div className="frame-gallery-grid" aria-live="polite">
        {entries.map((option) => (
          <button key={option.id} type="button" className="frame-card" data-selected={value === option.id} aria-pressed={value === option.id} onClick={() => onPick(option.id)} title={option.note}>
            <span className="frame-card-stage"><FrameThumbnail photo={photo} frame={option.id} /></span>
            <span className="frame-card-meta"><span className="frame-card-label">{option.name}</span><span className="frame-card-family">{option.family}</span></span>
            <span className="frame-card-note">{option.note}</span>
          </button>
        ))}
        {entries.length === 0 && <p className="gallery-empty col-span-2">No frames match “{query}”.</p>}
      </div>
      <div className="gallery-selection" aria-live="polite"><span className="gallery-kicker">CURRENT FRAME</span><strong>{selected?.name ?? "Original"}</strong><p>{selected?.note ?? "No additional border is applied."}</p></div>
    </div>
  );
}
