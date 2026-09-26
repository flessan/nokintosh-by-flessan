import type { RefObject } from "react";
import type { LoadedPhoto } from "../engine/image";
import { Button } from "./widgets";

export function PreviewStage({
  photo,
  canvasRef,
  stageRef,
  dragOver,
  showOriginal,
  loading,
  zoom,
  onZoomChange,
  onToggleZoom,
  onZoomWheel,
  onOpen,
  onSample,
}: {
  photo: LoadedPhoto | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  showOriginal: boolean;
  loading: boolean;
  zoom: number;
  onZoomChange: (value: number) => void;
  onToggleZoom: () => void;
  onZoomWheel: (delta: number) => void;
  onOpen: () => void;
  onSample: () => void;
}) {
  const zoomLabel = Math.round(zoom * 100) + "%";

  return (
    <div className="bevel-sunken relative min-h-0 flex-1 overflow-hidden bg-[#6e6e6e] p-[3px]">
      <div
        ref={stageRef}
        className="workspace group relative flex h-full w-full items-center justify-center overflow-hidden"
        onWheel={(e) => {
          if (!photo) return;
          e.preventDefault();
          onZoomWheel(e.deltaY);
        }}
      >
        <canvas
          ref={canvasRef}
          className={
            "nodrag block max-h-full max-w-full " +
            (photo ? "opacity-100 cursor-zoom-in" : "pointer-events-none absolute opacity-0")
          }
          style={{
            transform: "scale(" + zoom + ")",
            transformOrigin: "center center",
          }}
          onClick={() => photo && onToggleZoom()}
          aria-label={photo ? "Preview of " + photo.name : "Photo preview"}
        />

        {photo && (
          <div
            className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-2 bevel-raised bg-[color:var(--face)] px-2 py-1 opacity-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="Preview zoom controls"
          >
            <span className="shrink-0 text-[11px] font-bold">{zoomLabel}</span>
            <input
              type="range"
              min="1"
              max="4"
              step="0.25"
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="ui-range w-[120px]"
              aria-label="Zoom"
            />
            <Button
              className="min-w-[42px] px-2"
              onClick={(e) => {
                e.stopPropagation();
                onZoomChange(1);
              }}
            >
              Fit
            </Button>
          </div>
        )}

        {!photo && (
          <div className="bevel-raised m-3 w-[min(420px,92%)] p-4 text-center">
            <p className="text-[12px] font-bold">No photo open</p>
            <p className="mt-1 text-[12px] leading-snug text-[color:var(--ink-dim)]">
              Drop an image here, paste from the clipboard, or choose a file.
              JPG, PNG and WebP are supported.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button variant="default" onClick={onOpen} className="min-w-[96px]">
                Open Photo
              </Button>
              <Button onClick={onSample} className="min-w-[96px]">
                Use Sample
              </Button>
            </div>
          </div>
        )}

        {photo && showOriginal && (
          <div className="pointer-events-none absolute left-2 top-2 z-10 bg-[color:var(--title)] px-2 py-[2px] text-[11px] font-bold uppercase tracking-wide text-white">
            Original
          </div>
        )}

        {dragOver && (
          <div className="pointer-events-none absolute inset-[6px] z-20 border-2 border-dashed border-white/85 bg-black/25">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--face)] px-3 py-1 text-[12px]">
              Drop image to open
            </div>
          </div>
        )}

        {loading && (
          <div className="pointer-events-none absolute bottom-2 right-2 z-20 bg-[color:var(--face)] px-2 py-[2px] text-[11px]">
            Working...
          </div>
        )}
      </div>
    </div>
  );
}
