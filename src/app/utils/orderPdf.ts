// Generates "Gift Card Order.pdf" — a real PDF mirroring the Gift Card Order
// DOCX sheet (previously the .pdf in the export ZIP was just the DOCX bytes
// renamed, which no PDF viewer could open).

export interface OrderPdfVars {
  storeId: string;
  orderNumber: number;
  restaurantName: string;
  restaurantNoSpaces: string;
  quantity: number;
  startNum: number;
  endNum: number;
}

const RED: [number, number, number] = [220, 0, 0];
const BLACK: [number, number, number] = [0, 0, 0];

async function loadPng(src: string) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return { url: c.toDataURL("image/png"), aspect: img.naturalHeight / img.naturalWidth };
}

export async function generateOrderPdf(
  vars: OrderPdfVars,
  frontDataUrl: string,
  backDataUrl: string,
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "in", format: "letter" }); // 8.5 x 11

  const fmtN = (n: number) => n.toString().padStart(9, "0");

  // Draws a line of mixed-style segments starting at x; returns nothing.
  type Seg = { t: string; color?: [number, number, number]; bold?: boolean; size?: number };
  const segs = (parts: Seg[], x: number, y: number, defaultSize: number) => {
    let cx = x;
    for (const p of parts) {
      pdf.setFont("helvetica", p.bold ? "bold" : "normal");
      pdf.setFontSize(p.size ?? defaultSize);
      const [r, g, b] = p.color ?? BLACK;
      pdf.setTextColor(r, g, b);
      pdf.text(p.t, cx, y);
      cx += pdf.getTextWidth(p.t);
    }
  };

  // 1. Blogic logo + GIFT CARD ORDER banner, centered
  const logo = await loadPng("/blogic-logo-full.png");
  const banner = await loadPng("/gift-card-order-banner.png");
  const logoW = 2.4;
  pdf.addImage(logo.url, "PNG", (8.5 - logoW) / 2, 0.45, logoW, logoW * logo.aspect);
  const bannerW = 2.5;
  pdf.addImage(banner.url, "PNG", (8.5 - bannerW) / 2, 0.45 + logoW * logo.aspect + 0.25, bannerW, bannerW * banner.aspect);

  // 2. Order info table
  const tX = 1.0;
  const tY = 3.15;
  const cols = [
    { w: 1.35, header: "ORDER #", value: `${vars.storeId}-${vars.orderNumber}`, bold: true },
    { w: 2.1, header: "BUSINESS NAME", value: vars.restaurantName, bold: false },
    { w: 0.8, header: "QTY", value: String(vars.quantity), bold: false },
  ];
  const rowH = 0.52;
  let cx = tX;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.01);
  for (const col of cols) {
    pdf.rect(cx, tY, col.w, rowH, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(60, 70, 110);
    pdf.text(col.header, cx + 0.05, tY + 0.15);
    pdf.setFont("helvetica", col.bold ? "bold" : "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(0, 0, 0);
    pdf.text(col.value, cx + 0.05, tY + 0.42);
    cx += col.w;
  }

  // 3. Track / card range
  let y = tY + rowH + 0.5;
  segs([{ t: "Track1 magnetic & QR Code", bold: true }], tX, y, 12);
  y += 0.28;
  segs([
    { t: "Starting from " },
    { t: fmtN(vars.startNum), color: RED, bold: true },
    { t: " ->  ending at " }, // (jsPDF's built-in fonts can't render "→")
    { t: fmtN(vars.endNum), color: RED, bold: true },
  ], tX, y, 12);

  y += 0.45;
  segs([
    { t: "First card:  ", color: [90, 90, 90] },
    { t: "%A" },
    { t: fmtN(vars.startNum), color: RED, bold: true },
    { t: `^BLogicSystems^${vars.restaurantNoSpaces}^${vars.storeId}?` },
  ], tX, y, 11);
  y += 0.26;
  segs([
    { t: "Last card:  ", color: [90, 90, 90] },
    { t: "%A" },
    { t: fmtN(vars.endNum), color: RED, bold: true },
    { t: `^BLogicSystems^${vars.restaurantNoSpaces}^${vars.storeId}?` },
  ], tX, y, 11);

  // 4. Front / back card previews
  y += 0.35;
  const cardW = 3.0;
  const cardH = cardW / (3.375 / 2.125);
  const leftX = tX;
  const rightX = tX + cardW + 0.5;
  for (const [x, label] of [[leftX, "F R O N T"], [rightX, "B A C K"]] as const) {
    pdf.setFillColor(42, 42, 42);
    pdf.rect(x, y, 0.95, 0.26, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(label, x + 0.08, y + 0.18);
  }
  const imgY = y + 0.36;
  pdf.addImage(frontDataUrl, "PNG", leftX, imgY, cardW, cardH);
  pdf.addImage(backDataUrl, "PNG", rightX, imgY, cardW, cardH);

  // 5. Card number + magnetic string
  y = imgY + cardH + 0.5;
  segs([
    { t: "Card number:  ", bold: true },
    { t: fmtN(vars.startNum), color: RED, bold: true },
  ], tX, y, 12);
  y += 0.28;
  segs([{ t: "QR Code & Magnetic:", bold: true }], tX, y, 12);
  y += 0.28;
  segs([
    { t: "%A" },
    { t: fmtN(vars.startNum), color: RED, bold: true },
    { t: `^BLogicSystems^${vars.restaurantNoSpaces}^${vars.storeId}?` },
  ], tX, y, 12);

  return pdf.output("arraybuffer");
}
