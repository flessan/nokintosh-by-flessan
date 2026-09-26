import { useRef, useState } from "react";
import type { RefObject } from "react";
import type { DrawPoint, SpecialEffectState } from "../engine/types";
import type { LoadedPhoto } from "../engine/image";
import { Button } from "./widgets";
import { FlipVerticalIcon, MirrorIcon } from "./icons";

function pathData(points: DrawPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function PreviewStage({
  photo,
  canvasRef,
  stageRef,
  dragOver,
  showOriginal,
  loading,
  rendering,
  presetName,
  zoom,
  pan,
  mirror,
  flipVertical,
  specialEffect,
  onZoomChange,
  onToggleZoom,
  onPanChange,
  onZoomWheel,
  onToggleMirror,
  onToggleFlipVertical,
  onDrawStroke,
  onOpen,
  onSample,
}: {
  photo: LoadedPhoto | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  showOriginal: boolean;
  loading: boolean;
  rendering: boolean;
  presetName: string;
  zoom: number;
  pan: { x: number; y: number };
  mirror: boolean;
  flipVertical: boolean;
  specialEffect: SpecialEffectState;
  onZoomChange: (value: number) => void;
  onToggleZoom: () => void;
  onPanChange: (value: { x: number; y: number }) => void;
  onZoomWheel: (delta: number) => void;
  onToggleMirror: () => void;
  onToggleFlipVertical: () => void;
  onDrawStroke: (points: DrawPoint[]) => void;
  onOpen: () => void;
  onSample: () => void;
}) {
  const zoomLabel = Math.round(zoom * 100) + "%";
  const [draftStroke, setDraftStroke] = useState<DrawPoint[] | null>(null);
  const drawRef = useRef<{ pointerId: number; points: DrawPoint[] } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const drawMode =
    specialEffect.kind !== "none" && specialEffect.mode === "draw";

  const toPoint = (event: React.PointerEvent<HTMLCanvasElement>): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  const clampPan = (next: { x: number; y: number }) => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return next;

    const maxX = Math.max(0, (canvas.clientWidth * zoom - stage.clientWidth) / 2);
    const maxY = Math.max(0, (canvas.clientHeight * zoom - stage.clientHeight) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  const canvasRect = drawMode ? canvasRef.current?.getBoundingClientRect() : null;
  const stageRect = drawMode ? stageRef.current?.getBoundingClientRect() : null;
  const drawOverlayStyle =
    canvasRect && stageRect
      ? {
          left: canvasRect.left - stageRect.left,
          top: canvasRect.top - stageRect.top,
          width: canvasRect.width,
          height: canvasRect.height,
        }
      : undefined;

  return (
    <div className="bevel-sunken relative min-h-0 flex-1 overflow-hidden bg-[#6e6e6e] p-[3px]">
      <div
        ref={stageRef}
        className="workspace group relative flex h-full w-full items-center justify-center overflow-hidden"
        onWheel={(e) => {
          if (!photo || drawMode) return;
          e.preventDefault();
          onZoomWheel(e.deltaY);
        }}
      >
        <canvas
          ref={canvasRef}
          className={
            "nodrag block max-h-full max-w-full " +
            (
              photo
                ? drawMode
                  ? "cursor-crosshair"
                  : zoom > 1
                    ? "cursor-grab"
                    : "cursor-zoom-in"
                : "pointer-events-none absolute opacity-0"
            )
          }
          style={{
            transform:
              "translate3d(" +
              pan.x +
              "px, " +
              pan.y +
              "px, 0) scale(" +
              zoom +
              ")",
            transformOrigin: "center center",
            touchAction: "none",
          }}
          onPointerDown={(e) => {
            if (!photo) return;

            if (drawMode) {
              e.preventDefault();
              e.stopPropagation();
              const point = toPoint(e);
              if (!point) return;
              drawRef.current = { pointerId: e.pointerId, points: [point] };
              setDraftStroke([point]);
              e.currentTarget.setPointerCapture(e.pointerId);
              return;
            }

            if (zoom <= 1) return;
            dragRef.current = {
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              originX: pan.x,
              originY: pan.y,
              moved: false,
            };
            suppressClickRef.current = false;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const drawing = drawRef.current;
            if (drawing && drawing.pointerId === e.pointerId) {
              const point = toPoint(e);
              if (!point) return;
              const previous = drawing.points[drawing.points.length - 1];
              if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.002) {
                return;
              }
              drawing.points.push(point);
              setDraftStroke([...drawing.points]);
              return;
            }

            const drag = dragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;

            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;
            if (Math.hypot(dx, dy) > 4) {
              drag.moved = true;
              suppressClickRef.current = true;
            }

            onPanChange(
              clampPan({
                x: drag.originX + dx,
                y: drag.originY + dy,
              }),
            );
          }}
          onPointerUp={(e) => {
            const drawing = drawRef.current;
            if (drawing && drawing.pointerId === e.pointerId) {
              drawRef.current = null;
              setDraftStroke(null);
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              onDrawStroke(drawing.points);
              return;
            }

            const drag = dragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;
            dragRef.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          }}
          onPointerCancel={(e) => {
            if (drawRef.current?.pointerId === e.pointerId) {
              drawRef.current = null;
              setDraftStroke(null);
            }
            dragRef.current = null;
          }}
          onClick={() => {
            if (!photo || drawMode) return;
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            onToggleZoom();
          }}
          aria-label={photo ? "Preview of " + photo.name : "Photo preview"}
        />

        {drawMode && draftStroke && drawOverlayStyle && (
          <svg
            className="pointer-events-none absolute z-20"
            style={drawOverlayStyle}
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={pathData(draftStroke)}
              fill="none"
              stroke="#ffffff"
              strokeWidth={specialEffect.brushSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: "drop-shadow(1px 1px 0 #000)" }}
            />
          </svg>
        )}

        {photo && (
          <>
            <div
              className="pointer-events-none group-hover:pointer-events-auto absolute bottom-2 left-2 z-10 flex items-center gap-2 bevel-raised bg-[color:var(--face)] px-2 py-1 opacity-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] transition-opacity group-hover:opacity-100"
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

            <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
              <Button
                className="h-[22px] w-[24px] min-w-0 p-0"
                aria-pressed={mirror}
                title="Mirror horizontally"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMirror();
                }}
              >
                <MirrorIcon size={14} />
              </Button>
              <Button
                className="h-[22px] w-[24px] min-w-0 p-0"
                aria-pressed={flipVertical}
                title="Flip vertically"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFlipVertical();
                }}
              >
                <FlipVerticalIcon size={14} />
              </Button>
            </div>
          </>
        )}

        {drawMode && (
          <div className="pointer-events-none absolute left-2 top-2 z-20 bg-[color:var(--face)] px-2 py-[2px] text-[11px] font-bold bevel-raised shadow-[2px_2px_0_0_rgba(0,0,0,0.25)]">
            {specialEffect.kind === "gaussian-blur" ? "Gaussian Blur" : "Pixelate"} // Draw
            <span className="ml-2 font-normal">Drag on photo</span>
          </div>
        )}

        {photo && rendering && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/15">
            <div className="bevel-raised px-4 py-2 text-[12px] font-bold shadow-[2px_2px_0_0_rgba(0,0,0,0.35)]">
              [Loading] {presetName}
              <span className="ml-1 font-normal">Rendering preview...</span>
            </div>
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
          <div className="pointer-events-none absolute left-2 top-2 z-20 bg-[color:var(--title)] px-2 py-[2px] text-[11px] font-bold uppercase tracking-wide text-white">
            Original
          </div>
        )}

        {dragOver && (
          <div className="pointer-events-none absolute inset-[6px] z-40 border-2 border-dashed border-white/85 bg-black/25">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--face)] px-3 py-1 text-[12px]">
              Drop image to open
            </div>
          </div>
        )}

        {loading && (
          <div className="pointer-events-none absolute bottom-2 right-2 z-40 bg-[color:var(--face)] px-2 py-[2px] text-[11px]">
            Working...
          </div>
        )}
      </div>
    </div>
  );
}
