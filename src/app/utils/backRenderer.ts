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
  giftCX: 2.515, giftCY: 0.552, giftW: 0.706,
  termsX: 0.257, termsY: 0.893, termsLineH: 0.077, termsFontPt: 5.0,
  sidX: 0.257, sidY: 1.531,
  qrCX: 2.519, qrCY: 1.150, qrSize: 0.683,
  cardNumCX: 2.543, cardNumCY: 1.602, cardNumFontPt: 6.5,
  stripeY: 1.786,
  logoCX: 0.879, logoCY: 0.530,
};

// Convert to fractions for canvas rendering
const F = {
  giftCX: IN.giftCX / CARD_W,
  giftCY: IN.giftCY / CARD_H,
  giftW: IN.giftW / CARD_W,
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

  // 3. "gift card" image
  if (p.giftCardImg) {
    const imgW = F.giftW * w;
    const imgH = imgW * (p.giftCardImg.naturalHeight / p.giftCardImg.naturalWidth);
    ctx.drawImage(p.giftCardImg, F.giftCX * w - imgW / 2, F.giftCY * h - imgH / 2, imgW, imgH);
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
  const qrT = F.qrCY * h - qrPx / 2;
  ctx.fillStyle = "#FFFFFF";
  const pad = Math.round(qrPx * 0.04);
  ctx.fillRect(qrL - pad, qrT - pad, qrPx + pad * 2, qrPx + pad * 2);
  if (p.qrImg) {
    ctx.drawImage(p.qrImg, qrL, qrT, qrPx, qrPx);
  }

  // 7. Card number
  const numFontPx = Math.round(0.0427 * h); // ~6.5pt on 2.125"
  ctx.fillStyle = p.fontColor;
  ctx.font = `${numFontPx}px 'Helvetica Neue', Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(p.cardNumber, F.cardNumCX * w, F.cardNumCY * h);

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
