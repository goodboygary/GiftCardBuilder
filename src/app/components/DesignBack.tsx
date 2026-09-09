"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useGiftCard } from "../context/GiftCardContext";
import ColorPicker from "./ColorPicker";
import { getContrastFontColor } from "../utils/color";
import { drawBackCard, BACK_CW, BACK_CH } from "../utils/backRenderer";
import { WORDMARK_SRC } from "../utils/giftCardWordmark";

const ASPECT = 3.375 / 2.125;

export default function DesignBack() {
  const { state, updateState } = useGiftCard();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [giftCardImg, setGiftCardImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, logoX: 0, logoY: 0 });

  // Load "gift card" wordmark artwork
  useEffect(() => {
    const img = new Image();
    img.onload = () => setGiftCardImg(img);
    img.src = WORDMARK_SRC;
  }, []);

  // Auto font color
  useEffect(() => {
    updateState({ backFontColor: getContrastFontColor(state.backBgColor) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.backBgColor]);

  // Load logo
  useEffect(() => {
    if (!state.backLogo) { setLogoImg(null); return; }
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.src = state.backLogo;
  }, [state.backLogo]);

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

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = BACK_CW;
    canvas.height = BACK_CH;

    const startNum = (state.orderNumber - 1) * state.quantity + 1;
    const cardNum = startNum.toString().padStart(9, "0");

    drawBackCard(ctx, BACK_CW, BACK_CH, {
      bgColor: state.backBgColor,
      fontColor: state.backFontColor,
      logoImg,
      logoX: state.backLogoX,
      logoY: state.backLogoY,
      logoScale: state.backLogoScale,
      giftCardColor: state.giftCardColor,
      giftCardImg,
      qrImg,
      storeId: state.storeId || "0000000",
      cardNumber: cardNum,
    });
  }, [
    state.backBgColor, state.backFontColor, state.giftCardColor,
    state.backLogoX, state.backLogoY, state.backLogoScale,
    state.storeId, state.orderNumber, state.quantity,
    logoImg, giftCardImg, qrImg,
  ]);

  useEffect(() => { draw(); }, [draw]);

  // Drag — logo only
  const getCanvasCoords = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 50, y: 50 };
    const rect = container.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!state.backLogo) return;
    setIsDragging(true);
    const c = getCanvasCoords(e);
    dragStartRef.current = { x: c.x, y: c.y, logoX: state.backLogoX, logoY: state.backLogoY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const c = getCanvasCoords(e);
    updateState({
      backLogoX: Math.max(0, Math.min(100, dragStartRef.current.logoX + (c.x - dragStartRef.current.x))),
      backLogoY: Math.max(0, Math.min(100, dragStartRef.current.logoY + (c.y - dragStartRef.current.y))),
    });
  };

  const handleBackLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(url, { output: { format: "image/png" } });
        updateState({ backLogo: URL.createObjectURL(blob) });
      } catch { updateState({ backLogo: url }); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Design Back</h2>
        <p className="text-gray-500 mt-1">Position your logo on the back of the gift card</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs text-gray-500 font-medium">3.375&quot; &times; 2.125&quot;</div>
          <div
            ref={containerRef}
            className="relative border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg"
            style={{ aspectRatio: ASPECT, width: "100%", maxWidth: 540, cursor: state.backLogo ? (isDragging ? "grabbing" : "grab") : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
          </div>

          {state.backLogo && (
            <div className="flex items-center gap-4 w-full max-w-md">
              <label className="text-sm text-gray-600 whitespace-nowrap">Logo Size</label>
              <input type="range" min="0.1" max="2.5" step="0.05" value={state.backLogoScale}
                onChange={(e) => updateState({ backLogoScale: parseFloat(e.target.value) })}
                className="flex-1 accent-indigo-600" />
              <span className="text-sm text-gray-500 w-12 text-right">{Math.round(state.backLogoScale * 100)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-2">Back Template</p>
            <p className="text-xs text-gray-500">
              All fixed elements (terms, &quot;gift card&quot; text, QR code, card number, SID, mag stripe)
              are positioned from the standard template. Only the logo can be dragged.
              The SID and QR code will update when you enter the Store ID in Order Details.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Back Logo</label>
            <div className="flex items-center gap-3">
              {state.backLogo && (
                <div className="w-14 h-14 rounded-lg border border-gray-200 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=')] overflow-hidden">
                  <img src={state.backLogo} alt="Back logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <label className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium block">
                  {state.backLogo ? "Replace logo" : "Upload logo for back"}
                  <input type="file" accept="image/*" onChange={handleBackLogoUpload} className="hidden" />
                </label>
                {state.backLogo && <p className="text-xs text-gray-400 mt-1">Drag on the card to reposition</p>}
              </div>
            </div>
          </div>

          <ColorPicker color={state.backBgColor} onChange={(c) => updateState({ backBgColor: c })} label="Background Color" />

          <ColorPicker color={state.giftCardColor} onChange={(c) => updateState({ giftCardColor: c })} label="&quot;gift card&quot; Text Color" />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={() => updateState({ currentStep: 1 })}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button onClick={() => updateState({ currentStep: 3 })}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Continue to Order Details
        </button>
      </div>
    </div>
  );
}
