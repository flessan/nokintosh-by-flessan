import { FRAME_OPTIONS } from "../engine/frame";
import type { FrameMode } from "../engine/types";

export function FramePicker({
  value,
  disabled = false,
  onPick,
}: {
  value: FrameMode;
  disabled?: boolean;
  onPick: (frame: FrameMode) => void;
}) {
  return (
    <div className="p-[5px]">
      <p className="mb-2 px-[2px] text-[10px] leading-snug text-[color:var(--ink-dim)]">
        Give the finished photo a camera, print or desktop-style border. The frame is included in your export.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FRAME_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="frame-card bevel-thin-out"
            data-selected={value === option.id}
            aria-pressed={value === option.id}
            disabled={disabled}
            onClick={() => onPick(option.id)}
            title={option.note}
          >
            <span className={"frame-mini frame-mini-" + option.id}>
              <span className="frame-mini-photo" />
            </span>
            <span className="frame-card-label">{option.name}</span>
            <span className="frame-card-note">{option.note}</span>
          </button>
        ))}
      </div>
      {disabled && (
        <p className="mt-2 bevel-thin-in bg-white px-2 py-2 text-[10px] text-[color:var(--ink-dim)]">
          Open a photo to try these frames.
        </p>
      )}
    </div>
  );
}
