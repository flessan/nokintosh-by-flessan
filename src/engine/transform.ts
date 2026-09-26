export interface ImageTransform {
  mirror: boolean;
  flipVertical: boolean;
}

export const IDENTITY_TRANSFORM: ImageTransform = {
  mirror: false,
  flipVertical: false,
};

export function sameTransform(a: ImageTransform, b: ImageTransform): boolean {
  return a.mirror === b.mirror && a.flipVertical === b.flipVertical;
}

/**
 * Bakes the transform into a canvas without resizing it.
 * A temporary canvas avoids canvas-self-draw transform differences between browsers.
 */
export function applyCanvasTransform(
  canvas: HTMLCanvasElement,
  transform: ImageTransform,
): void {
  if (!transform.mirror && !transform.flipVertical) return;

  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;

  const tctx = temp.getContext("2d");
  const ctx = canvas.getContext("2d");
  if (!tctx || !ctx) {
    throw new Error("Could not create transform canvas.");
  }

  tctx.save();
  tctx.translate(
    transform.mirror ? temp.width : 0,
    transform.flipVertical ? temp.height : 0,
  );
  tctx.scale(
    transform.mirror ? -1 : 1,
    transform.flipVertical ? -1 : 1,
  );
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(canvas, 0, 0);
  tctx.restore();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(temp, 0, 0);
  ctx.restore();

  temp.width = 0;
  temp.height = 0;
}
