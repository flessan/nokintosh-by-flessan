import type { FrameMode } from "./types";

export interface FrameOption {
  id: FrameMode;
  name: string;
  note: string;
}

export const FRAME_OPTIONS: FrameOption[] = [
  { id: "none", name: "No frame", note: "Keep the photo edge-to-edge." },
  { id: "windows-98", name: "Windows 98", note: "A tiny blue-titlebar photo window, inspired by classic desktop image viewers." },
  { id: "polaroid", name: "Instant print", note: "Warm paper, a generous lower border and a small print caption." },
  { id: "film-strip", name: "35mm strip", note: "Dark film borders with sprocket holes and frame markings." },
  { id: "contact-sheet", name: "Contact sheet", note: "A large print with a row of miniature contact thumbnails." },
  { id: "lcd-playback", name: "Camera LCD", note: "A compact-camera playback screen with a simple status display." },
  { id: "collage", name: "Paper collage", note: "A restrained paper mat around the photograph." },
];

function drawContain(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  ctx.drawImage(
    source,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceRatio = source.width / source.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = source.width;
  let sh = source.height;

  if (sourceRatio > targetRatio) {
    sw = source.height * targetRatio;
    sx = (source.width - sw) / 2;
  } else {
    sh = source.width / targetRatio;
    sy = (source.height - sh) / 2;
  }
  ctx.drawImage(source, sx, sy, sw, sh, x, y, width, height);
}

function bevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  light = "#ffffff",
  dark = "#404040",
) {
  ctx.strokeStyle = light;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + height - 0.5);
  ctx.lineTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + width - 0.5, y + 0.5);
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x + width - 0.5, y + 0.5);
  ctx.lineTo(x + width - 0.5, y + height - 0.5);
  ctx.lineTo(x + 0.5, y + height - 0.5);
  ctx.stroke();
}

function drawWindows98(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number) {
  const face = "#c6c6c6";
  const titleHeight = Math.max(15, Math.round(h * 0.075));
  const menuHeight = Math.max(13, Math.round(h * 0.075));
  const outer = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  const imageX = Math.round(w * 0.045);
  const imageY = titleHeight + menuHeight + Math.round(h * 0.035);
  const imageW = w - imageX * 2;
  const imageH = h - imageY - Math.round(h * 0.065);

  ctx.fillStyle = face;
  ctx.fillRect(0, 0, w, h);
  bevel(ctx, 1, 1, w - 2, h - 2, "#ffffff", "#555555");
  ctx.fillStyle = "#000080";
  ctx.fillRect(outer, outer, w - outer * 2, titleHeight);

  const fontSize = Math.max(8, Math.round(titleHeight * 0.56));
  ctx.font = `bold ${fontSize}px Tahoma, Verdana, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText("Photo Viewer", Math.max(8, Math.round(w * 0.04)), titleHeight * 0.5 + outer);

  const controlSize = Math.max(10, titleHeight - 5);
  const controlGap = 3;
  const controlsX = w - outer - controlSize * 3 - controlGap * 2 - 3;
  for (let i = 0; i < 3; i++) {
    const x = controlsX + i * (controlSize + controlGap);
    const y = outer + Math.round((titleHeight - controlSize) / 2);
    ctx.fillStyle = face;
    ctx.fillRect(x, y, controlSize, controlSize);
    bevel(ctx, x, y, controlSize, controlSize);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = Math.max(1, controlSize * 0.09);
    if (i === 0) {
      ctx.beginPath();
      ctx.moveTo(x + controlSize * 0.25, y + controlSize * 0.72);
      ctx.lineTo(x + controlSize * 0.75, y + controlSize * 0.72);
      ctx.stroke();
    } else if (i === 1) {
      ctx.strokeRect(x + controlSize * 0.25, y + controlSize * 0.22, controlSize * 0.5, controlSize * 0.52);
    } else {
      ctx.beginPath();
      ctx.moveTo(x + controlSize * 0.25, y + controlSize * 0.25);
      ctx.lineTo(x + controlSize * 0.75, y + controlSize * 0.75);
      ctx.moveTo(x + controlSize * 0.75, y + controlSize * 0.25);
      ctx.lineTo(x + controlSize * 0.25, y + controlSize * 0.75);
      ctx.stroke();
    }
  }

  const menuY = outer + titleHeight;
  ctx.fillStyle = "#d4d0c8";
  ctx.fillRect(outer, menuY, w - outer * 2, menuHeight);
  ctx.font = `${Math.max(8, Math.round(menuHeight * 0.58))}px Tahoma, Verdana, sans-serif`;
  ctx.fillStyle = "#111111";
  ctx.textBaseline = "middle";
  ctx.fillText("Edición    Ver    Ayuda", Math.round(w * 0.035), menuY + menuHeight * 0.52);
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(outer, menuY + menuHeight - 0.5);
  ctx.lineTo(w - outer, menuY + menuHeight - 0.5);
  ctx.stroke();

  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(imageX - 2, imageY - 2, imageW + 4, imageH + 4);
  bevel(ctx, imageX - 2, imageY - 2, imageW + 4, imageH + 4, "#ffffff", "#808080");
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(imageX, imageY, imageW, imageH);
  drawContain(ctx, source, imageX, imageY, imageW, imageH);

  ctx.font = `${Math.max(7, Math.round(h * 0.018))}px Tahoma, Verdana, sans-serif`;
  ctx.fillStyle = "#333333";
  ctx.textBaseline = "middle";
  ctx.fillText("Ready", imageX, h - Math.max(5, h * 0.022));
}

function drawPolaroid(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number) {
  const side = Math.round(Math.min(w, h) * 0.075);
  const top = Math.round(Math.min(w, h) * 0.065);
  const bottom = Math.round(Math.min(w, h) * 0.22);
  ctx.fillStyle = "#f5f1e7";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(side, top, w - side * 2, h - top - bottom);
  ctx.fillStyle = "#d7d1c4";
  ctx.fillRect(side, top, w - side * 2, h - top - bottom);
  drawContain(ctx, source, side, top, w - side * 2, h - top - bottom);
  ctx.strokeStyle = "#d0c9bb";
  ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.002);
  ctx.strokeRect(side + 0.5, top + 0.5, w - side * 2 - 1, h - top - bottom - 1);
  ctx.fillStyle = "#69645c";
  ctx.font = `italic ${Math.max(9, Math.round(Math.min(w, h) * 0.035))}px Georgia, serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("little moments, kept forever", side + Math.round(side * 0.25), h - bottom * 0.5);
}

function drawFilmStrip(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number) {
  const rail = Math.round(w * 0.14);
  const top = Math.round(h * 0.055);
  const photoW = w - rail * 2;
  const photoH = h - top * 2;
  ctx.fillStyle = "#171717";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#303030";
  ctx.fillRect(rail, top, photoW, photoH);
  drawContain(ctx, source, rail, top, photoW, photoH);

  const holeW = Math.max(3, Math.round(rail * 0.42));
  const holeH = Math.max(4, Math.round(h * 0.042));
  const gap = holeH * 0.7;
  ctx.fillStyle = "#d9d3c2";
  for (let y = Math.round(holeH * 0.7); y + holeH < h; y += holeH + gap) {
    ctx.fillRect(Math.round((rail - holeW) / 2), y, holeW, holeH);
    ctx.fillRect(w - rail + Math.round((rail - holeW) / 2), y, holeW, holeH);
  }
  ctx.fillStyle = "#c8c2b5";
  ctx.font = `bold ${Math.max(7, Math.round(rail * 0.22))}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("35 MM", rail / 2, h * 0.5);
  ctx.fillText("01", w - rail / 2, h * 0.5);
  ctx.textAlign = "start";
}

function drawContactSheet(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number) {
  const pad = Math.round(Math.min(w, h) * 0.055);
  const gap = Math.max(3, Math.round(pad * 0.22));
  const mainH = h * 0.68;
  const thumbTop = pad + mainH + gap;
  const thumbH = Math.max(1, h - thumbTop - pad - Math.round(h * 0.055));
  const thumbW = (w - pad * 2 - gap * 2) / 3;

  ctx.fillStyle = "#e9e7df";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad, pad, w - pad * 2, mainH);
  drawContain(ctx, source, pad, pad, w - pad * 2, mainH);

  for (let i = 0; i < 3; i++) {
    const x = pad + i * (thumbW + gap);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, thumbTop, thumbW, thumbH);
    drawCover(ctx, source, x + 2, thumbTop + 2, Math.max(1, thumbW - 4), Math.max(1, thumbH - 4));
    ctx.strokeStyle = "#a5a39c";
    ctx.strokeRect(x + 0.5, thumbTop + 0.5, thumbW - 1, thumbH - 1);
  }

  ctx.fillStyle = "#4c4a45";
  ctx.font = `bold ${Math.max(7, Math.round(pad * 0.42))}px monospace`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("CONTACT SHEET     01 / 03", pad, h - Math.max(3, pad * 0.2));
}

function drawLcd(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number) {
  const pad = Math.round(Math.min(w, h) * 0.055);
  const top = Math.round(h * 0.11);
  const bottom = Math.round(h * 0.13);
  ctx.fillStyle = "#15191a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#667071";
  ctx.lineWidth = Math.max(1, pad * 0.08);
  ctx.strokeRect(pad * 0.55, pad * 0.55, w - pad * 1.1, h - pad * 1.1);

  ctx.fillStyle = "#252d2e";
  ctx.fillRect(pad, pad, w - pad * 2, top);
  ctx.fillStyle = "#f0f0e8";
  ctx.font = `bold ${Math.max(7, Math.round(top * 0.44))}px monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText("PLAYBACK", pad * 1.5, pad + top * 0.52);
  ctx.fillStyle = "#d9362b";
  ctx.beginPath();
  ctx.arc(w - pad * 1.6, pad + top * 0.5, Math.max(2, top * 0.1), 0, Math.PI * 2);
  ctx.fill();

  const imageY = pad + top + Math.round(h * 0.025);
  const imageH = h - imageY - bottom - pad;
  ctx.fillStyle = "#000000";
  ctx.fillRect(pad, imageY, w - pad * 2, imageH);
  drawContain(ctx, source, pad, imageY, w - pad * 2, imageH);

  ctx.fillStyle = "#252d2e";
  ctx.fillRect(pad, h - bottom, w - pad * 2, bottom - pad);
  ctx.fillStyle = "#d4d9cf";
  ctx.font = `${Math.max(7, Math.round(bottom * 0.32))}px monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText("100-0001", pad * 1.4, h - bottom * 0.48);
  ctx.textAlign = "right";
  ctx.fillText("00:00", w - pad * 1.4, h - bottom * 0.48);
  ctx.textAlign = "start";
}

function drawCollage(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, w: number, h: number) {
  const border = Math.max(8, Math.round(Math.min(w, h) * 0.055));
  const bottom = Math.max(border, Math.round(border * 1.65));
  ctx.fillStyle = "#f2f0e8";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.16)";
  ctx.shadowBlur = Math.max(2, Math.round(border * 0.12));
  ctx.shadowOffsetY = Math.max(1, Math.round(border * 0.04));
  drawContain(ctx, source, border, border, w - border * 2, h - border - bottom);
  ctx.restore();
  ctx.strokeStyle = "#c9c6bc";
  ctx.lineWidth = 1;
  ctx.strokeRect(border + 0.5, border + 0.5, Math.max(1, w - border * 2 - 1), Math.max(1, h - border - bottom - 1));
  const mark = Math.max(3, Math.round(border * 0.22));
  ctx.fillStyle = "#7d7a71";
  ctx.fillRect(border, h - Math.round(border * 0.52), mark, 1);
  ctx.fillRect(border + mark + 2, h - Math.round(border * 0.52), mark, 1);
}

export function applyFrame(canvas: HTMLCanvasElement, frame: FrameMode): void {
  if (frame === "none") return;
  const w = canvas.width;
  const h = canvas.height;
  if (w < 8 || h < 8) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create photo frame.");

  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) throw new Error("Could not copy photo for frame.");
  sourceCtx.drawImage(canvas, 0, 0);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  switch (frame) {
    case "windows-98":
      drawWindows98(ctx, source, w, h);
      break;
    case "polaroid":
      drawPolaroid(ctx, source, w, h);
      break;
    case "film-strip":
      drawFilmStrip(ctx, source, w, h);
      break;
    case "contact-sheet":
      drawContactSheet(ctx, source, w, h);
      break;
    case "lcd-playback":
      drawLcd(ctx, source, w, h);
      break;
    case "collage":
      drawCollage(ctx, source, w, h);
      break;
  }

  ctx.restore();
  source.width = 0;
  source.height = 0;
}
