"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useGiftCard } from "../context/GiftCardContext";
import { drawBackCard, BACK_CW, BACK_CH, BACK_POSITIONS_IN, TERMS_TEXT } from "../utils/backRenderer";
import { generateOrderDocx } from "../utils/docxTemplate";
import { saveOrder } from "../utils/orderHistory";

const CARD_W = 3.375;
const CARD_H = 2.125;
const ASPECT = CARD_W / CARD_H;
const CW = BACK_CW;
const CH = BACK_CH;

export default function ReviewExport() {
  const { state, updateState } = useGiftCard();
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [frontLogoImg, setFrontLogoImg] = useState<HTMLImageElement | null>(null);
  const [backLogoImg, setBackLogoImg] = useState<HTMLImageElement | null>(null);
  const [giftCardImg, setGiftCardImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (state.frontLogo) {
      const img = new Image(); img.onload = () => setFrontLogoImg(img); img.src = state.frontLogo;
    }
  }, [state.frontLogo]);

  useEffect(() => {
    if (state.backLogo) {
      const img = new Image(); img.onload = () => setBackLogoImg(img); img.src = state.backLogo;
    }
  }, [state.backLogo]);

  useEffect(() => {
    const img = new Image(); img.onload = () => setGiftCardImg(img); img.src = "/gift-card-text.png";
  }, []);

  // Generate QR from store ID (or "SAMPLE" as placeholder)
  useEffect(() => {
    const qrContent = state.storeId || "SAMPLE";
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(qrContent, {
          width: 400, margin: 1, color: { dark: "#000000", light: "#FFFFFF" },
        });
        const img = new Image();
        img.onload = () => setQrImg(img);
        img.src = url;
      } catch { /* ignore */ }
    })();
  }, [state.storeId]);

  const startNum = (state.orderNumber - 1) * state.quantity + 1;
  const endNum = state.orderNumber * state.quantity;
  const fmtN = (n: number) => n.toString().padStart(9, "0");
  const restaurantNoSpaces = state.restaurantName.replace(/\s+/g, "");
  const folderName = state.orderNumber > 1 ? `${state.restaurantName}-${state.orderNumber}` : state.restaurantName;

  const px = (pct: number) => (pct / 100) * CW;
  const py = (pct: number) => (pct / 100) * CH;

  // Draw front preview
  const drawFront = useCallback(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = CW; canvas.height = CH;
    ctx.fillStyle = state.frontBgColor;
    ctx.fillRect(0, 0, CW, CH);
    if (frontLogoImg) {
      const maxW = CW * 0.6, maxH = CH * 0.6;
      const fs = Math.min(maxW / frontLogoImg.naturalWidth, maxH / frontLogoImg.naturalHeight);
      const dw = frontLogoImg.naturalWidth * fs * state.frontLogoScale;
      const dh = frontLogoImg.naturalHeight * fs * state.frontLogoScale;
      ctx.drawImage(frontLogoImg, px(state.frontLogoX) - dw / 2, py(state.frontLogoY) - dh / 2, dw, dh);
    }
  }, [state.frontBgColor, state.frontLogoX, state.frontLogoY, state.frontLogoScale, frontLogoImg]);

  // Draw back preview
  const drawBack = useCallback(() => {
    const canvas = backCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = CW; canvas.height = CH;
    drawBackCard(ctx, CW, CH, {
      bgColor: state.backBgColor,
      fontColor: state.backFontColor,
      logoImg: backLogoImg,
      logoX: state.backLogoX,
      logoY: state.backLogoY,
      logoScale: state.backLogoScale,
      giftCardImg,
      qrImg,
      storeId: state.storeId || "0000000",
      cardNumber: fmtN(startNum),
    });
  }, [
    state.backBgColor, state.backFontColor,
    state.backLogoX, state.backLogoY, state.backLogoScale,
    state.storeId, startNum,
    backLogoImg, giftCardImg, qrImg,
  ]);

  useEffect(() => { drawFront(); }, [drawFront]);
  useEffect(() => { drawBack(); }, [drawBack]);

  // ============================================================
  //  EXPORT — every element as a separate PDF/AI layer
  // ============================================================
  const handleExport = async () => {
    setIsExporting(true);
    setExportDone(false);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const QRCode = (await import("qrcode")).default;
      const { jsPDF } = await import("jspdf");
      const ExcelJS = (await import("exceljs")).default;

      const zip = new JSZip();
      const folder = zip.folder(folderName)!;

      const inX = (pct: number) => (pct / 100) * CARD_W;
      const inY = (pct: number) => (pct / 100) * CARD_H;

      // Generate QR code for store ID
      const qrDataUrl = await QRCode.toDataURL(state.storeId, {
        width: 400, margin: 1, color: { dark: "#000000", light: "#FFFFFF" },
      });

      const imgToDataUrl = (img: HTMLImageElement, w: number, h: number) => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d")!.drawImage(img, 0, 0, w, h);
        return c.toDataURL("image/png");
      };

      const getLogoSize = (img: HTMLImageElement, scale: number, maxWPct: number, maxHPct: number) => {
        const maxW = CW * maxWPct, maxH = CH * maxHPct;
        const fs = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        const wPx = Math.round(img.naturalWidth * fs * scale);
        const hPx = Math.round(img.naturalHeight * fs * scale);
        return { wIn: (wPx / CW) * CARD_W, hIn: (hPx / CH) * CARD_H, wPx, hPx };
      };

      // ============================================
      //  FRONT.ai — Layer 1: background, Layer 2: logo
      // ============================================
      const frontPdf = new jsPDF({ orientation: "landscape", unit: "in", format: [CARD_W, CARD_H] });
      frontPdf.setFillColor(state.frontBgColor);
      frontPdf.rect(0, 0, CARD_W, CARD_H, "F");
      if (frontLogoImg) {
        const sz = getLogoSize(frontLogoImg, state.frontLogoScale, 0.6, 0.6);
        frontPdf.addImage(imgToDataUrl(frontLogoImg, sz.wPx, sz.hPx), "PNG",
          inX(state.frontLogoX) - sz.wIn / 2, inY(state.frontLogoY) - sz.hIn / 2, sz.wIn, sz.hIn);
      }
      folder.file("Front.ai", frontPdf.output("arraybuffer"));

      // ============================================
      //  BACK.ai — Each element is a separate PDF object / layer
      //  Layer 1: Background rect
      //  Layer 2: Logo image
      //  Layer 3: "gift card" text image
      //  Layer 4: Terms paragraph text
      //  Layer 5: SID text
      //  Layer 6: QR code image
      //  Layer 7: Card number text
      //  Layer 8: Mag stripe rect
      // ============================================
      const backPdf = new jsPDF({ orientation: "landscape", unit: "in", format: [CARD_W, CARD_H] });
      const B = BACK_POSITIONS_IN;

      const fontColor = state.backFontColor;
      const fcR = parseInt(fontColor.slice(1, 3), 16);
      const fcG = parseInt(fontColor.slice(3, 5), 16);
      const fcB = parseInt(fontColor.slice(5, 7), 16);

      // Layer 1: Background
      backPdf.setFillColor(state.backBgColor);
      backPdf.rect(0, 0, CARD_W, CARD_H, "F");

      // Layer 2: Logo
      if (backLogoImg) {
        const sz = getLogoSize(backLogoImg, state.backLogoScale, 0.25, 0.30);
        backPdf.addImage(imgToDataUrl(backLogoImg, sz.wPx, sz.hPx), "PNG",
          inX(state.backLogoX) - sz.wIn / 2, inY(state.backLogoY) - sz.hIn / 2, sz.wIn, sz.hIn);
      }

      // Layer 3: "gift card" text image
      if (giftCardImg) {
        const imgWIn = B.giftW;
        const imgHIn = imgWIn * (giftCardImg.naturalHeight / giftCardImg.naturalWidth);
        const gcPxW = Math.round((imgWIn / CARD_W) * CW);
        const gcPxH = Math.round((imgHIn / CARD_H) * CH);
        backPdf.addImage(imgToDataUrl(giftCardImg, gcPxW, gcPxH), "PNG",
          B.giftCX - imgWIn / 2, B.giftCY - imgHIn / 2, imgWIn, imgHIn);
      }

      // Layer 4: Terms paragraph text (each line is a separate text object)
      backPdf.setTextColor(fcR, fcG, fcB);
      backPdf.setFont("helvetica", "normal");
      backPdf.setFontSize(B.termsFontPt);
      TERMS_TEXT.forEach((line, i) => {
        backPdf.text(line, B.termsX, B.termsY + i * B.termsLineH);
      });

      // Layer 5: SID text
      backPdf.setTextColor(fcR, fcG, fcB);
      backPdf.setFont("helvetica", "normal");
      backPdf.setFontSize(B.termsFontPt);
      backPdf.text(`SID: ${state.storeId}`, B.sidX, B.sidY);

      // Layer 6: QR code image
      backPdf.setFillColor(255, 255, 255);
      const qrPad = 0.015;
      backPdf.rect(B.qrCX - B.qrSize / 2 - qrPad, B.qrCY - B.qrSize / 2 - qrPad,
        B.qrSize + qrPad * 2, B.qrSize + qrPad * 2, "F");
      backPdf.addImage(qrDataUrl, "PNG",
        B.qrCX - B.qrSize / 2, B.qrCY - B.qrSize / 2, B.qrSize, B.qrSize);

      // Layer 7: Card number text
      backPdf.setTextColor(fcR, fcG, fcB);
      backPdf.setFont("helvetica", "normal");
      backPdf.setFontSize(B.cardNumFontPt);
      backPdf.text(fmtN(startNum), B.cardNumCX, B.cardNumCY, { align: "center" });

      // Layer 8: Grey magnetic stripe (with bg color border below)
      const bottomMargin = CARD_H * 0.03;
      backPdf.setFillColor(128, 128, 128);
      backPdf.rect(0, B.stripeY, CARD_W, CARD_H - B.stripeY - bottomMargin, "F");

      folder.file("Back.ai", backPdf.output("arraybuffer"));

      // ============================================
      //  Gift Card Order .docx — uses original template, replaces variables
      // ============================================
      // Render card preview images for the DOCX
      const fpCanvas = document.createElement("canvas");
      fpCanvas.width = CW; fpCanvas.height = CH;
      const fCtx = fpCanvas.getContext("2d")!;
      fCtx.fillStyle = state.frontBgColor; fCtx.fillRect(0, 0, CW, CH);
      if (frontLogoImg) {
        const sz = getLogoSize(frontLogoImg, state.frontLogoScale, 0.6, 0.6);
        fCtx.drawImage(frontLogoImg, px(state.frontLogoX) - sz.wPx / 2, py(state.frontLogoY) - sz.hPx / 2, sz.wPx, sz.hPx);
      }
      const bpCanvas = document.createElement("canvas");
      bpCanvas.width = CW; bpCanvas.height = CH;
      const bCtx = bpCanvas.getContext("2d")!;
      const qrImgEl = new Image();
      await new Promise<void>(r => { qrImgEl.onload = () => r(); qrImgEl.src = qrDataUrl; });
      drawBackCard(bCtx, CW, CH, {
        bgColor: state.backBgColor, fontColor: state.backFontColor,
        logoImg: backLogoImg, logoX: state.backLogoX, logoY: state.backLogoY, logoScale: state.backLogoScale,
        giftCardImg, qrImg: qrImgEl, storeId: state.storeId, cardNumber: fmtN(startNum),
      });

      const toUint8 = (url: string) => {
        const bin = atob(url.split(",")[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
      };
      const frontU8 = toUint8(fpCanvas.toDataURL("image/png"));
      const backU8 = toUint8(bpCanvas.toDataURL("image/png"));

      // Fetch the original DOCX template and do variable replacement
      const templateResp = await fetch("/gift-card-order-template.docx");
      const templateBytes = await templateResp.arrayBuffer();

      const docxBytes = await generateOrderDocx(templateBytes, {
        storeId: state.storeId,
        orderNumber: state.orderNumber,
        restaurantName: state.restaurantName,
        restaurantNoSpaces,
        quantity: state.quantity,
        startNum,
        endNum,
      }, frontU8, backU8);
      folder.file("Gift Card Order.docx", docxBytes);

      const frontDataUrl = fpCanvas.toDataURL("image/png");
      const backDataUrl = bpCanvas.toDataURL("image/png");

      // Gift Card Order PDF — same file as the DOCX (just a copy)
      folder.file("Gift Card Order.pdf", docxBytes);

      // DesignApproval.pdf — front and back card images with labels and dashed borders
      const approvalPdf = new jsPDF({ orientation: "landscape", unit: "in", format: "letter" });
      // Letter landscape = 11 x 8.5
      const apCardW = 4.2;
      const apCardH = apCardW / (3.375 / 2.125);
      const apGap = 0.6;
      const apTotalW = apCardW * 2 + apGap;
      const apLeftX = (11 - apTotalW) / 2;
      const apRightX = apLeftX + apCardW + apGap;
      const apTopY = 1.2;

      // FRONT label
      approvalPdf.setFillColor(42, 42, 42);
      approvalPdf.rect(apLeftX, apTopY - 0.4, 1.1, 0.28, "F");
      approvalPdf.setTextColor(255, 255, 255);
      approvalPdf.setFontSize(10);
      approvalPdf.setFont("helvetica", "bold");
      approvalPdf.text("F R O N T", apLeftX + 0.1, apTopY - 0.18);

      // BACK label
      approvalPdf.setFillColor(42, 42, 42);
      approvalPdf.rect(apRightX, apTopY - 0.4, 1.1, 0.28, "F");
      approvalPdf.setTextColor(255, 255, 255);
      approvalPdf.text("B A C K", apRightX + 0.15, apTopY - 0.18);

      // Light grey background fill (border/frame around the card)
      const apPad = 0.12;
      approvalPdf.setFillColor(235, 237, 240);
      approvalPdf.rect(apLeftX, apTopY, apCardW, apCardH, "F");
      approvalPdf.rect(apRightX, apTopY, apCardW, apCardH, "F");

      // Card images — inset slightly so the grey border is visible around them
      approvalPdf.addImage(frontDataUrl, "PNG", apLeftX + apPad, apTopY + apPad, apCardW - apPad * 2, apCardH - apPad * 2);
      approvalPdf.addImage(backDataUrl, "PNG", apRightX + apPad, apTopY + apPad, apCardW - apPad * 2, apCardH - apPad * 2);

      folder.file("DesignApproval.pdf", approvalPdf.output("arraybuffer"));

      // Peel Sheet
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Sheet1");
      ws.getColumn(1).width = 55;
      for (let i = startNum; i <= endNum; i++)
        ws.addRow([`%A${fmtN(i)}^BLogicSystems^${restaurantNoSpaces}^${state.storeId}?`]);
      folder.file(`${restaurantNoSpaces}.xlsx`, await wb.xlsx.writeBuffer());

      saveAs(await zip.generateAsync({ type: "blob" }), `${folderName}.zip`);

      // Save order to history for tracking
      saveOrder({
        restaurantName: state.restaurantName,
        storeId: state.storeId,
        orderNumber: state.orderNumber,
        quantity: state.quantity,
        startNum,
        endNum,
      });

      setExportDone(true);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Check console for details.");
    } finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Review & Export</h2>
        <p className="text-gray-500 mt-1">Review your gift card design and download the package</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Front</h3>
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: ASPECT }}>
            <canvas ref={frontCanvasRef} className="w-full h-full" style={{ display: "block" }} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Back</h3>
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: ASPECT }}>
            <canvas ref={backCanvasRef} className="w-full h-full" style={{ display: "block" }} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 text-lg">Package Contents</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div><span className="text-xs text-gray-500 uppercase tracking-wide block">Folder</span>
            <span className="font-medium text-gray-900">{folderName}/</span></div>
          <div><span className="text-xs text-gray-500 uppercase tracking-wide block">Order #</span>
            <span className="font-medium text-gray-900">{state.storeId}-{state.orderNumber}</span></div>
          <div><span className="text-xs text-gray-500 uppercase tracking-wide block">Card Range</span>
            <span className="font-medium text-gray-900">{fmtN(startNum)} &rarr; {fmtN(endNum)}</span></div>
          <div><span className="text-xs text-gray-500 uppercase tracking-wide block">Quantity</span>
            <span className="font-medium text-gray-900">{state.quantity.toLocaleString()}</span></div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600 mb-2">The ZIP package will contain:</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {[`Front.ai`, `Back.ai`, `Gift Card Order.docx`, `Gift Card Order.pdf`, `DesignApproval.pdf`, `${restaurantNoSpaces}.xlsx`].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{folderName}/{f}</code>
              </li>
            ))}
          </ul>
          <p className="text-xs text-green-700 mt-3 bg-green-50 border border-green-200 rounded p-2">
            Back.ai has 8 separate layers: background, logo, &quot;gift card&quot; image, terms text, SID, QR code, card number, and mag stripe — all independently editable in Illustrator.
          </p>
        </div>
      </div>

      {exportDone && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-center font-medium">
          Package exported successfully! Check your downloads folder.
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={() => updateState({ currentStep: 3 })}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button onClick={handleExport} disabled={isExporting}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2">
          {isExporting ? (
            <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Generating Package...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>Export Package (.zip)</>
          )}
        </button>
      </div>
    </div>
  );
}
