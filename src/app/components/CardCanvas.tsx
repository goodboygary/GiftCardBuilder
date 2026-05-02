"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface CardCanvasProps {
  bgColor: string;
  logoSrc: string | null;
  logoX: number; // 0-100 percentage
  logoY: number;
  logoScale: number;
  onLogoMove: (x: number, y: number) => void;
  onLogoScale: (scale: number) => void;
  children?: React.ReactNode; // for overlaying back-side elements
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

// Gift card dimensions: 3.375" x 2.125" = aspect ratio 3.375/2.125 ≈ 1.588
const ASPECT = 3.375 / 2.125;
const CANVAS_WIDTH = 675; // 3.375 * 200 DPI
const CANVAS_HEIGHT = 425; // 2.125 * 200 DPI

export default function CardCanvas({
  bgColor,
  logoSrc,
  logoX,
  logoY,
  logoScale,
  onLogoMove,
  onLogoScale,
  children,
  canvasRef: externalCanvasRef,
}: CardCanvasProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, logoX: 0, logoY: 0 });

  // Load logo image
  useEffect(() => {
    if (!logoSrc) {
      setLogoImg(null);
      return;
    }
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.src = logoSrc;
  }, [logoSrc]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Logo
    if (logoImg) {
      const maxW = CANVAS_WIDTH * 0.6;
      const maxH = CANVAS_HEIGHT * 0.6;
      let drawW = logoImg.naturalWidth;
      let drawH = logoImg.naturalHeight;

      // Scale to fit within max bounds
      const fitScale = Math.min(maxW / drawW, maxH / drawH);
      drawW *= fitScale * logoScale;
      drawH *= fitScale * logoScale;

      const x = (logoX / 100) * CANVAS_WIDTH - drawW / 2;
      const y = (logoY / 100) * CANVAS_HEIGHT - drawH / 2;

      ctx.drawImage(logoImg, x, y, drawW, drawH);
    }
  }, [bgColor, logoImg, logoX, logoY, logoScale, canvasRef]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse handlers for dragging
  const getCanvasCoords = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 50, y: 50 };
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!logoSrc) return;
    setIsDragging(true);
    const coords = getCanvasCoords(e);
    dragStartRef.current = { x: coords.x, y: coords.y, logoX, logoY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const coords = getCanvasCoords(e);
    const dx = coords.x - dragStartRef.current.x;
    const dy = coords.y - dragStartRef.current.y;
    onLogoMove(
      Math.max(0, Math.min(100, dragStartRef.current.logoX + dx)),
      Math.max(0, Math.min(100, dragStartRef.current.logoY + dy))
    );
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-xs text-gray-500 font-medium">
        3.375&quot; &times; 2.125&quot;
      </div>
      <div
        ref={containerRef}
        className="relative border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg"
        style={{ aspectRatio: ASPECT, width: "100%", maxWidth: 540, cursor: logoSrc ? "grab" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />
        {children && (
          <div className="absolute inset-0 pointer-events-none">
            {children}
          </div>
        )}
      </div>

      {logoSrc && (
        <div className="flex items-center gap-4 w-full max-w-md">
          <label className="text-sm text-gray-600 whitespace-nowrap">Logo Size</label>
          <input
            type="range"
            min="0.1"
            max="2.5"
            step="0.05"
            value={logoScale}
            onChange={(e) => onLogoScale(parseFloat(e.target.value))}
            className="flex-1 accent-indigo-600"
          />
          <span className="text-sm text-gray-500 w-12 text-right">
            {Math.round(logoScale * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

export { CANVAS_WIDTH, CANVAS_HEIGHT, ASPECT };
