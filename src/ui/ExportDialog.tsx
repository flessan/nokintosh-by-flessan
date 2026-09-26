import { useEffect, useState } from "react";
import { supportsFormat, type ExportFormat, type ExportOptions } from "../engine/export";
import { Button } from "./widgets";

const FORMATS: { id: ExportFormat; label: string; note: string }[] = [
  { id: "avif", label: "AVIF", note: "Smallest files, best quality. Default." },
  { id: "webp", label: "WebP", note: "Widely supported lossy format." },
  { id: "png", label: "PNG", note: "Lossless, much larger files." },
];

const SIZES = [
  { label: "Full size", value: 100000 },
  { label: "4096 px", value: 4096 },
  { label: "2048 px", value: 2048 },
  { label: "1280 px", value: 1280 },
];

export function ExportDialog({
  open,
  busy,
  sourceWidth,
  sourceHeight,
  initial,
  onClose,
  onExport,
}: {
  open: boolean;
  busy: boolean;
  sourceWidth: number;
  sourceHeight: number;
  initial: ExportOptions;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>(initial.format);
  const [quality, setQuality] = useState(initial.quality);
  const [maxSize, setMaxSize] = useState(initial.maxSize);
  const [avifOk, setAvifOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    supportsFormat("avif").then((ok) => alive && setAvifOk(ok));
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const longest = Math.max(sourceWidth, sourceHeight);
  const outLongest = Math.min(longest, maxSize);
  const k = longest > 0 ? outLongest / longest : 1;
  const outW = Math.round(sourceWidth * k);
  const outH = Math.round(sourceHeight * k);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export image"
        className="bevel-raised w-[min(380px,100%)] p-[3px] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]"
      >
        <div className="title-bar">
          <span className="flex-1 text-[12px] font-bold">Export Image</span>
          <button
            type="button"
            aria-label="Close"
            className="ui-btn h-[18px] min-h-0 w-[18px] px-0 py-0 text-[11px] leading-none"
            onClick={onClose}
          >
            <span aria-hidden="true">X</span>
          </button>
        </div>

        <div className="p-3">
          <fieldset className="mb-3">
            <legend className="mb-1 text-[11px] font-bold uppercase tracking-wide">Format</legend>
            <div className="bevel-thin-in p-2">
              {FORMATS.map((f) => (
                <label key={f.id} className="mb-[3px] flex items-start gap-2 last:mb-0">
                  <input
                    type="radio"
                    name="export-format"
                    className="mt-[2px] accent-[color:var(--title)]"
                    checked={format === f.id}
                    onChange={() => setFormat(f.id)}
                  />
                  <span className="text-[12px] leading-tight">
                    <span className="font-bold">{f.label}</span>
                    <span className="block text-[11px] text-[color:var(--ink-dim)]">{f.note}</span>
                  </span>
                </label>
              ))}
              {avifOk === false && (
                <p className="mt-2 text-[11px] leading-tight text-[color:var(--ink-dim)]">
                  This browser cannot encode AVIF. WebP will be written instead.
                </p>
              )}
            </div>
          </fieldset>

          {format !== "png" && (
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <label htmlFor="export-quality" className="text-[12px]">
                  Quality
                </label>
                <output
                  htmlFor="export-quality"
                  className="bevel-thin-in min-w-[38px] bg-white px-1 text-right font-mono text-[11px] tabular-nums"
                >
                  {Math.round(quality * 100)}
                </output>
              </div>
              <input
                id="export-quality"
                type="range"
                className="ui-range"
                min={0.3}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
              />
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="export-size" className="mb-1 block text-[12px]">
              Output size
            </label>
            <select
              id="export-size"
              className="bevel-sunken w-full px-2 py-[3px] text-[12px]"
              value={maxSize}
              onChange={(e) => setMaxSize(parseInt(e.target.value, 10))}
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[color:var(--ink-dim)]">
              Writes {outW} x {outH} pixels.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="default"
              disabled={busy}
              className="min-w-[88px]"
              onClick={() => onExport({ format, quality, maxSize })}
            >
              {busy ? "Encoding..." : "Export"}
            </Button>
            <Button className="min-w-[80px]" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
