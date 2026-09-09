// Renders the "gift card" wordmark from the user-supplied artwork
// (public/gift-card-wordmark.png). The image's background is removed by
// converting darkness to alpha, then the mark is tinted with the
// user-selected color — so any artwork color/background works and the
// color picker still applies.

export const WORDMARK_SRC = "/gift-card-wordmark.png";

// Pixel processing is O(width × height) and the back canvas redraws on every
// logo drag, so cache the last tinted result.
let cached: { img: HTMLImageElement; color: string; canvas: HTMLCanvasElement } | null = null;

// Turns the artwork into a solid-color mark on a transparent background:
// alpha = original alpha × pixel darkness, RGB = tint color.
export function tintGiftCardImage(
  img: HTMLImageElement,
  color: string,
): HTMLCanvasElement {
  if (cached && cached.img === img && cached.color === color) return cached.canvas;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const imageData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i + 3] = Math.round((d[i + 3] / 255) * (255 - lum));
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(imageData, 0, 0);
  cached = { img, color, canvas: c };
  return c;
}

export function drawGiftCardWordmark(
  ctx: CanvasRenderingContext2D,
  x: number, // left edge
  y: number, // top edge
  w: number,
  color: string,
  img: HTMLImageElement | null,
) {
  if (!img) return;
  const h = w * (img.naturalHeight / img.naturalWidth);
  ctx.drawImage(tintGiftCardImage(img, color), x, y, w, h);
}

// Renders the wordmark alone on a transparent canvas (used for the PDF layer).
export function renderGiftCardWordmark(
  widthPx: number,
  color: string,
  img: HTMLImageElement,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(widthPx);
  c.height = Math.round(widthPx * (img.naturalHeight / img.naturalWidth));
  drawGiftCardWordmark(c.getContext("2d")!, 0, 0, widthPx, color, img);
  return c;
}
