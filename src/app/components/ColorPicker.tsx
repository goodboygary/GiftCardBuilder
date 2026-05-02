"use client";

import { useState, useRef } from "react";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

export default function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(color);
  const pickerRef = useRef<HTMLInputElement>(null);
  const eyedropperSupported = typeof window !== "undefined" && "EyeDropper" in window;

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  const handlePickerChange = (val: string) => {
    setHexInput(val);
    onChange(val);
  };

  const handleEyedropper = async () => {
    if (!eyedropperSupported) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const picked = result.sRGBHex;
      setHexInput(picked);
      onChange(picked);
    } catch {
      // User cancelled
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer relative overflow-hidden"
          onClick={() => pickerRef.current?.click()}
        >
          <div className="w-full h-full" style={{ backgroundColor: color }} />
          <input
            ref={pickerRef}
            type="color"
            value={color}
            onChange={(e) => handlePickerChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900"
        />
        {eyedropperSupported && (
          <button
            onClick={handleEyedropper}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            title="Pick color from screen"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21a2 2 0 01-2-2V5a2 2 0 012-2h2l1-1h4l1 1h2a2 2 0 012 2v14a2 2 0 01-2 2H7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m-2-2h4" />
            </svg>
          </button>
        )}
        {/* Quick presets */}
        <div className="flex gap-1 ml-2">
          {["#000000", "#FFFFFF", "#1a1a2e", "#16213e", "#0f3460", "#e94560", "#533483"].map((c) => (
            <button
              key={c}
              onClick={() => { setHexInput(c); onChange(c); }}
              className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
