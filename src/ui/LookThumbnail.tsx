import { useEffect, useRef } from "react";
import type { LoadedPhoto } from "../engine/image";

export function LookThumbnail({ photo, lookId }: { photo: LoadedPhoto | null; lookId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = 176, height = 72;
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (photo) {
      const source = photo.preview as HTMLCanvasElement;
      const sr = source.width / source.height, tr = width / height;
      let sx = 0, sy = 0, sw = source.width, sh = source.height;
      if (sr > tr) { sw = source.height * tr; sx = (source.width - sw) / 2; }
      else { sh = source.width / tr; sy = (source.height - sh) / 2; }
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#c9d8d3"; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#e9dfc5"; ctx.beginPath(); ctx.arc(132, 19, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#86a29b"; ctx.beginPath(); ctx.moveTo(0,57); ctx.lineTo(44,28); ctx.lineTo(75,55); ctx.lineTo(111,35); ctx.lineTo(176,62); ctx.lineTo(176,72); ctx.lineTo(0,72); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#536f6a"; ctx.fillRect(0,62,width,10);
    }
  }, [photo?.preview]);
  return <canvas ref={canvasRef} className={"look-card-preview look-preview-" + lookId} aria-hidden="true" />;
}
