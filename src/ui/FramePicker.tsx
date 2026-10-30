import { useEffect, useMemo, useRef, useState } from "react";
import { applyFrame, FRAME_OPTIONS } from "../engine/frame";
import type { LoadedPhoto } from "../engine/image";
import type { FrameMode, FramePosition } from "../engine/types";
import { DEFAULT_FRAME_POSITION, normalizeFramePosition } from "../engine/frame";

type Family = "all" | "Desktop" | "Print" | "Camera";

const THUMBNAIL_WIDTH = 176;
const THUMBNAIL_HEIGHT = 106;

function drawSample(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#c9d8d3";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#e9dfc5";
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.23, Math.max(4, width * 0.055), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#86a29b";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.lineTo(width * 0.28, height * 0.34);
  ctx.lineTo(width * 0.48, height * 0.74);
  ctx.lineTo(width * 0.69, height * 0.47);
  ctx.lineTo(width, height * 0.78);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#536f6a";
  ctx.fillRect(0, height * 0.88, width, height * 0.12);
}

function drawPhotoContain(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
) {
  if (!source.width || !source.height) return;
  const scale = Math.min(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  ctx.drawImage(
    source,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function FrameThumbnail({
  photo,
  frame,
  position,
}: {
  photo: LoadedPhoto | null;
  frame: FrameMode;
  position: FramePosition;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const source = photo?.preview as HTMLCanvasElement | undefined;
    // Keep the source photo's orientation while fitting the card proof inside
    // a fixed preview box. Portrait frames stay portrait instead of being
    // letterboxed into a forced landscape canvas.
    const sourceWidth = source?.width ?? THUMBNAIL_WIDTH;
    const sourceHeight = source?.height ?? THUMBNAIL_HEIGHT;
    const scale = Math.min(THUMBNAIL_WIDTH / sourceWidth, THUMBNAIL_HEIGHT / sourceHeight);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#c9d8d3";
    ctx.fillRect(0, 0, width, height);

    if (source) {
      drawPhotoContain(ctx, source, width, height);
    } else {
      drawSample(ctx, width, height);
    }

    try {
      applyFrame(canvas, frame, position);
    } catch {
      // A single decorative preview must never break the whole Frames tab.
      // Restore the source image as a safe fallback if a frame renderer fails.
      const fallback = canvas.getContext("2d");
      if (!fallback) return;
      fallback.setTransform(1, 0, 0, 1, 0, 0);
      fallback.clearRect(0, 0, width, height);
      if (source) {
        drawPhotoContain(fallback, source, width, height);
      } else {
        drawSample(fallback, width, height);
      }
    }
  }, [photo?.preview, frame, position.zoom, position.x, position.y]);

  return <canvas ref={canvasRef} className="frame-card-preview" aria-hidden="true" />;
}

export function FramePicker({ value, photo, position, onPick, onChangePosition }: {
  value: FrameMode;
  photo: LoadedPhoto | null;
  position: FramePosition;
  onPick: (frame: FrameMode) => void;
  onChangePosition: (position: FramePosition) => void;
}) {
  const [family, setFamily] = useState<Family>("all");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return FRAME_OPTIONS.filter((option) => {
      const inFamily = family === "all" || option.family === family;
      const matches =
        !normalized ||
        option.name.toLowerCase().includes(normalized) ||
        option.note.toLowerCase().includes(normalized);
      return inFamily && matches;
    });
  }, [family, query]);

  const selected = FRAME_OPTIONS.find((option) => option.id === value);

  return (
    <div className="frame-gallery p-[5px]">
      <div className="frame-gallery-intro">
        <span className="gallery-kicker">FINISHING TOUCH</span>
        <p>Frames are part of the photo and travel with your export.</p>
      </div>

      <div className="px-[2px]">
        <label htmlFor="frame-search" className="sr-only">Search photo frames</label>
        <input
          id="frame-search"
          type="search"
          className="gallery-search bevel-sunken w-full bg-white px-2"
          placeholder="Find a frame..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="gallery-filter-tabs" role="tablist" aria-label="Frame families">
        {(["all", "Desktop", "Print", "Camera"] as Family[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={family === id}
            className="gallery-filter-tab"
            data-active={family === id}
            onClick={() => setFamily(id)}
          >
            {id === "all" ? "All" : id === "Print" ? "Prints" : id}
          </button>
        ))}
      </div>

      <div className="frame-gallery-grid" aria-live="polite">
        {entries.map((option) => (
          <button
            key={option.id}
            type="button"
            className="frame-card"
            data-selected={value === option.id}
            aria-pressed={value === option.id}
            onClick={() => onPick(option.id)}
            title={option.note}
          >
            <span className="frame-card-stage">
              <FrameThumbnail
                photo={photo}
                frame={option.id}
                position={option.id === value ? position : DEFAULT_FRAME_POSITION}
              />
            </span>
            <span className="frame-card-meta">
              <span className="frame-card-label">{option.name}</span>
              <span className="frame-card-family">{option.family}</span>
            </span>
            <span className="frame-card-note">{option.note}</span>
          </button>
        ))}

        {entries.length === 0 && (
          <p className="gallery-empty col-span-2">No frames match “{query}”.</p>
        )}
      </div>

      <div className="gallery-selection" aria-live="polite">
        <span className="gallery-kicker">CURRENT FRAME</span>
        <strong>{selected?.name ?? "Original"}</strong>
        <p>{selected?.note ?? "No additional border is applied."}</p>
      </div>

      <section className="frame-adjustments" aria-label="Frame photo placement">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="gallery-kicker">PHOTO PLACEMENT</span>
            <strong className="block text-[11px]">Scale</strong>
          </div>
          <output className="frame-scale-value">{Math.round(position.zoom * 100)}%</output>
        </div>
        <input
          aria-label="Photo scale inside frame"
          className="ui-range mt-1"
          type="range"
          min="1"
          max="4"
          step="0.05"
          value={position.zoom}
          disabled={!photo || value === "none"}
          onChange={(event) => onChangePosition(normalizeFramePosition({
            ...position,
            zoom: Number(event.target.value),
          }))}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="frame-adjustment-hint">
            Drag the photo in the main preview to reposition it.
          </p>
          <button
            type="button"
            className="ui-btn shrink-0 px-2"
            disabled={!photo || value === "none" || (position.zoom === 1 && position.x === 0 && position.y === 0)}
            onClick={() => onChangePosition({ ...DEFAULT_FRAME_POSITION })}
          >
            Reset
          </button>
        </div>
        <p className="frame-adjustment-safety">
          The photo stays clipped inside its frame, even while dragging.
        </p>
      </section>
    </div>
  );
}
