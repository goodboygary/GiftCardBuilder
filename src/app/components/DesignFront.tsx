"use client";

import { useCallback, useState } from "react";
import { useGiftCard } from "../context/GiftCardContext";
import CardCanvas from "./CardCanvas";
import ColorPicker from "./ColorPicker";

export default function DesignFront() {
  const { state, updateState } = useGiftCard();
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setRemoveError(null);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalUrl = e.target?.result as string;
        updateState({ frontLogoOriginal: originalUrl });

        // Auto remove background
        setIsRemoving(true);
        try {
          const { removeBackground } = await import("@imgly/background-removal");
          const blob = await removeBackground(originalUrl, {
            output: { format: "image/png" },
          });
          const url = URL.createObjectURL(blob);
          updateState({ frontLogo: url, backLogo: url });
          setIsRemoving(false);
        } catch (err) {
          console.error("Background removal failed:", err);
          setRemoveError("Background removal failed. Using original image.");
          updateState({ frontLogo: originalUrl, backLogo: originalUrl });
          setIsRemoving(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [updateState]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Design Front</h2>
        <p className="text-gray-500 mt-1">Upload your logo and customize the front of the gift card</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Canvas preview */}
        <div>
          <CardCanvas
            bgColor={state.frontBgColor}
            logoSrc={state.frontLogo}
            logoX={state.frontLogoX}
            logoY={state.frontLogoY}
            logoScale={state.frontLogoScale}
            onLogoMove={(x, y) => updateState({ frontLogoX: x, frontLogoY: y })}
            onLogoScale={(s) => updateState({ frontLogoScale: s })}
          />
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Upload zone */}
          {!state.frontLogo && !isRemoving && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileInput}
                className="hidden"
                id="front-logo-upload"
              />
              <label htmlFor="front-logo-upload" className="cursor-pointer">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-700 font-medium">Drag & drop your logo, or click to browse</p>
                <p className="text-gray-400 text-sm mt-1">PNG, JPG, or SVG</p>
              </label>
            </div>
          )}

          {/* Loading state */}
          {isRemoving && (
            <div className="border-2 border-indigo-200 rounded-xl p-8 text-center bg-indigo-50">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-3" />
              <p className="text-indigo-700 font-medium">Removing background...</p>
              <p className="text-indigo-500 text-sm mt-1">This may take a moment on first use</p>
            </div>
          )}

          {removeError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
              {removeError}
            </div>
          )}

          {/* Re-upload button */}
          {state.frontLogo && !isRemoving && (
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-gray-200 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlN2ViIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=')] overflow-hidden">
                <img src={state.frontLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Logo uploaded</p>
                <p className="text-xs text-gray-500">Background removed. Drag to reposition.</p>
              </div>
              <label className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium">
                Replace
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Background color */}
          <ColorPicker
            color={state.frontBgColor}
            onChange={(c) => updateState({ frontBgColor: c })}
            label="Background Color"
          />

          {state.frontLogo && (
            <p className="text-xs text-gray-400">
              Tip: Click and drag the card to reposition the logo. Use the slider to resize.
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <button
          onClick={() => updateState({ currentStep: 2 })}
          disabled={!state.frontLogo}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Back Design
        </button>
      </div>
    </div>
  );
}
