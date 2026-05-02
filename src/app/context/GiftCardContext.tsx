"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface GiftCardState {
  // Front design
  frontLogo: string | null;
  frontLogoOriginal: string | null;
  frontBgColor: string;
  frontLogoX: number;
  frontLogoY: number;
  frontLogoScale: number;

  // Back design — only logo is movable, everything else is from the template
  backLogo: string | null;
  backBgColor: string;
  backLogoX: number;
  backLogoY: number;
  backLogoScale: number;
  backFontColor: string;

  // Order details
  restaurantName: string;
  storeId: string;
  orderNumber: number;
  quantity: number;

  // Current step
  currentStep: number;
}

const defaultState: GiftCardState = {
  frontLogo: null,
  frontLogoOriginal: null,
  frontBgColor: "#000000",
  frontLogoX: 50,
  frontLogoY: 50,
  frontLogoScale: 1,

  backLogo: null,
  backBgColor: "#000000",
  backLogoX: 26,
  backLogoY: 25,
  backLogoScale: 0.5,
  backFontColor: "#FFFFFF",

  restaurantName: "",
  storeId: "",
  orderNumber: 1,
  quantity: 1000,

  currentStep: 1,
};

interface GiftCardContextType {
  state: GiftCardState;
  setState: React.Dispatch<React.SetStateAction<GiftCardState>>;
  updateState: (partial: Partial<GiftCardState>) => void;
}

const GiftCardContext = createContext<GiftCardContextType | null>(null);

export function GiftCardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GiftCardState>(defaultState);

  const updateState = (partial: Partial<GiftCardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  return (
    <GiftCardContext.Provider value={{ state, setState, updateState }}>
      {children}
    </GiftCardContext.Provider>
  );
}

export function useGiftCard() {
  const ctx = useContext(GiftCardContext);
  if (!ctx) throw new Error("useGiftCard must be used within GiftCardProvider");
  return ctx;
}
