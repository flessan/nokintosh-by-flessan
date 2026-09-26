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
  onOpen,
  onSample,
}: {
  photo: LoadedPhoto | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  showOriginal: boolean;
  loading: boolean;
  onOpen: () => void;
  onSample: () => void;
}) {
  return (
    <div className="bevel-sunken relative min-h-0 flex-1 overflow-hidden bg-[#6e6e6e] p-[3px]">
      <div
        ref={stageRef}
        className="workspace relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className={
            "nodrag block max-h-full max-w-full " + (photo ? "opacity-100" : "pointer-events-none opacity-0 absolute")
          }
          aria-label={photo ? `Preview of ${photo.name}` : "Photo preview"}
        />

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
          <div className="pointer-events-none absolute left-2 top-2 bg-[color:var(--title)] px-2 py-[2px] text-[11px] font-bold uppercase tracking-wide text-white">
            Original
          </div>
        )}

        {dragOver && (
          <div className="pointer-events-none absolute inset-[6px] border-2 border-dashed border-white/85 bg-black/25">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--face)] px-3 py-1 text-[12px]">
              Drop image to open
            </div>
          </div>
        )}

        {loading && (
          <div className="pointer-events-none absolute bottom-2 left-2 bg-[color:var(--face)] px-2 py-[2px] text-[11px]">
            Working...
          </div>
        )}
      </div>
    </div>
  );
}
