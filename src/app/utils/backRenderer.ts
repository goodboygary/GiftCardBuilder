import { drawGiftCardWordmark } from "./giftCardWordmark";

// Shared renderer for the back of the gift card.
// All positions derived from the original Back.ai (255.6 x 165.6 pts).
// Converted to fractions of card dimensions for canvas rendering,
// and to inches for PDF export.

export const BACK_CW = 1534;
export const BACK_CH = 994;

// Card size in inches
const CARD_W = 3.375;
const CARD_H = 2.125;

// Exact positions from Back.ai analysis (in inches on a 3.375x2.125 card)
const IN = {
  termsX: 0.257, termsY: 0.893, termsLineH: 0.077, termsFontPt: 5.0,
  sidX: 0.257, sidY: 1.531,
  qrCX: 2.519, qrCY: 1.150, qrSize: 0.683,
  cardNumCX: 2.543, cardNumCY: 1.602, cardNumFontPt: 6.5,
  stripeY: 1.786,
  logoCX: 0.879, logoCY: 0.530,
};

// "gift card" wordmark: matches the QR code's VISIBLE width, edges aligned
// with it, sitting just above the QR's white pad. The QR image is generated
// with a 1-module quiet zone (store IDs are short numerics → always a
// version-1 code, 21 modules), so its black area spans 21/23 of the drawn box.
const QR_VISIBLE_FRACTION = 21 / 23;
const QR_PAD_IN = 0.015;
const GIFT_QR_GAP_IN = 0.008; // wordmark hugs the QR's white pad
const NUM_DESCENT_IN = 0.03; // descender allowance below the number baseline

// Aspect of public/gift-card-wordmark.png — used for layout before it loads
export const DEFAULT_WORDMARK_ASPECT = 674 / 800;

// Layout of the right column (wordmark + QR + card number). The whole group
// is vertically centered between the card top and the mag stripe.
export function backColumnLayoutIn(imgAspect: number) {
  const w = IN.qrSize * QR_VISIBLE_FRACTION;
  const h = w * imgAspect;
  const wmY = IN.qrCY - IN.qrSize / 2 - QR_PAD_IN - GIFT_QR_GAP_IN - h;
  const colBottom = IN.cardNumCY + NUM_DESCENT_IN;
  const dy = (IN.stripeY - (colBottom - wmY)) / 2 - wmY;
  return {
    wordmark: { x: IN.qrCX - w / 2, y: wmY + dy, w, h },
    qrCY: IN.qrCY + dy,
    cardNumCY: IN.cardNumCY + dy,
  };
}

// Convert to fractions for canvas rendering
const F = {
  termsX: IN.termsX / CARD_W,
  termsY: IN.termsY / CARD_H,
  termsLineH: IN.termsLineH / CARD_H,
  sidX: IN.sidX / CARD_W,
  sidY: IN.sidY / CARD_H,
  qrCX: IN.qrCX / CARD_W,
  qrCY: IN.qrCY / CARD_H,
  qrSize: IN.qrSize / CARD_W,
  cardNumCX: IN.cardNumCX / CARD_W,
  cardNumCY: IN.cardNumCY / CARD_H,
  stripeY: IN.stripeY / CARD_H,
};

const TERMS_LINES = [
  "Your use of this card constitutes acceptance",
  "of the following terms and conditions.",
  "This is not a credit or debit card and carries no implied",
  "warranties. The merchant is not responsible for lost,",
  "stolen, or damaged cards, or for any unauthorized use.",
  "This card is redeemable for purchase only.",
  "Unused value remains on card and is not",
  "redeemable for cash. We look forward to serving you.",
];

export interface BackCardParams {
  bgColor: string;
  fontColor: string;
  logoImg: HTMLImageElement | null;
  logoX: number;
  logoY: number;
  logoScale: number;
  giftCardColor: string;
  giftCardImg: HTMLImageElement | null;
  qrImg: HTMLImageElement | null;
  storeId: string;
  cardNumber: string;
}

export function drawBackCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: BackCardParams,
) {
  // 1. Background
  ctx.fillStyle = p.bgColor;
  ctx.fillRect(0, 0, w, h);

  // 2. Logo (user-movable)
  if (p.logoImg) {
    const maxW = w * 0.25, maxH = h * 0.30;
    const fitScale = Math.min(maxW / p.logoImg.naturalWidth, maxH / p.logoImg.naturalHeight);
    const dw = p.logoImg.naturalWidth * fitScale * p.logoScale;
    const dh = p.logoImg.naturalHeight * fitScale * p.logoScale;
    ctx.drawImage(p.logoImg, (p.logoX / 100) * w - dw / 2, (p.logoY / 100) * h - dh / 2, dw, dh);
  }

  // 3. "gift card" wordmark
  const colAspect = p.giftCardImg
    ? p.giftCardImg.naturalHeight / p.giftCardImg.naturalWidth
    : DEFAULT_WORDMARK_ASPECT;
  const L = backColumnLayoutIn(colAspect);
  if (p.giftCardImg) {
    const r = L.wordmark;
    drawGiftCardWordmark(ctx, (r.x / CARD_W) * w, (r.y / CARD_H) * h, (r.w / CARD_W) * w, p.giftCardColor, p.giftCardImg);
  }

  // 4. Terms text — scale font to match 5pt on the physical card
  // At 5pt on 2.125" card → 5/72 = 0.0694" per em → fraction = 0.0327 of card height
  const termsFontPx = Math.round(0.0327 * h);
  const termsLineHPx = Math.round(F.termsLineH * h);
  ctx.fillStyle = p.fontColor;
  ctx.font = `${termsFontPx}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  TERMS_LINES.forEach((line, i) => {
    ctx.fillText(line, F.termsX * w, F.termsY * h + i * termsLineHPx);
  });

  // 5. SID
  ctx.fillText(`SID: ${p.storeId}`, F.sidX * w, F.sidY * h);

  // 6. QR code
  const qrPx = Math.round(F.qrSize * w);
  const qrL = F.qrCX * w - qrPx / 2;
  const qrT = (L.qrCY / CARD_H) * h - qrPx / 2;
  ctx.fillStyle = "#FFFFFF";
  const pad = Math.round(qrPx * 0.04);
  ctx.fillRect(qrL - pad, qrT - pad, qrPx + pad * 2, qrPx + pad * 2);
  if (p.qrImg) {
    ctx.drawImage(p.qrImg, qrL, qrT, qrPx, qrPx);
  }

  // 7. Card number — letter-spaced to span the QR's visible width
  const numFontPx = Math.round(0.0427 * h); // ~6.5pt on 2.125"
  ctx.fillStyle = p.fontColor;
  ctx.font = `${numFontPx}px 'Helvetica Neue', Helvetica, sans-serif`;
  ctx.textAlign = "left";
  const numY = (L.cardNumCY / CARD_H) * h;
  const numSpanL = (L.wordmark.x / CARD_W) * w;
  const numSpanW = (L.wordmark.w / CARD_W) * w;
  const numChars = p.cardNumber.split("");
  const numWidths = numChars.map((c) => ctx.measureText(c).width);
  const numExtra = (numSpanW - numWidths.reduce((a, b) => a + b, 0)) / Math.max(1, numChars.length - 1);
  let numX = numSpanL;
  numChars.forEach((c, i) => {
    ctx.fillText(c, numX, numY);
    numX += numWidths[i] + numExtra;
  });

  // 8. Mag stripe — grey stripe with background color border below
  const stripeTop = F.stripeY * h;
  const bottomMargin = Math.round(h * 0.03); // leave ~3% of card height as bg border at bottom
  const stripeH = h - stripeTop - bottomMargin;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, stripeTop, w, stripeH);
}

// Exported for PDF generation (exact inch values)
export const BACK_POSITIONS_IN = IN;
export const TERMS_TEXT = TERMS_LINES;
