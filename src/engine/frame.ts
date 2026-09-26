import type { FrameMode } from "./types";

export function applyFrame(canvas: HTMLCanvasElement, frame: FrameMode): void {
  if (frame !== "collage") return;

  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return;

  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext("2d");
  const ctx = canvas.getContext("2d");
  if (!tctx || !ctx) throw new Error("Could not create collage frame.");

  // A restrained printed-photo/card frame. It stays inside the original
  // canvas so the export dimensions never change.
  const border = Math.max(8, Math.round(Math.min(w, h) * 0.055));
  const bottom = Math.max(border, Math.round(border * 1.65));

  tctx.fillStyle = "#f2f0e8";
  tctx.fillRect(0, 0, w, h);

  tctx.save();
  tctx.shadowColor = "rgba(0,0,0,0.16)";
  tctx.shadowBlur = Math.max(2, Math.round(border * 0.12));
  tctx.shadowOffsetY = Math.max(1, Math.round(border * 0.04));
  tctx.drawImage(
    canvas,
    border,
    border,
    Math.max(1, w - border * 2),
    Math.max(1, h - border - bottom),
  );
  tctx.restore();

  tctx.strokeStyle = "#c9c6bc";
  tctx.lineWidth = 1;
  tctx.strokeRect(
    border + 0.5,
    border + 0.5,
    Math.max(1, w - border * 2 - 1),
    Math.max(1, h - border - bottom - 1),
  );

  // Small registration marks give the frame a contact-sheet/printed-collage
  // feeling without adding editable text or UI chrome.
  const mark = Math.max(3, Math.round(border * 0.22));
  tctx.fillStyle = "#7d7a71";
  tctx.fillRect(border, h - Math.round(border * 0.52), mark, 1);
  tctx.fillRect(border + mark + 2, h - Math.round(border * 0.52), mark, 1);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(temp, 0, 0);
  ctx.restore();

  temp.width = 0;
  temp.height = 0;
}
