"use client";

import { GiftCardProvider, useGiftCard } from "./context/GiftCardContext";
import StepIndicator from "./components/StepIndicator";
import Header from "./components/Header";
import DesignFront from "./components/DesignFront";
import DesignBack from "./components/DesignBack";
import OrderDetails from "./components/OrderDetails";
import ReviewExport from "./components/ReviewExport";

function StepContent() {
  const { state } = useGiftCard();

  switch (state.currentStep) {
    case 1:
      return <DesignFront />;
    case 2:
      return <DesignBack />;
    case 3:
      return <OrderDetails />;
    case 4:
      return <ReviewExport />;
    default:
      return <DesignFront />;
  }
}

export default function Home() {
  return (
    <GiftCardProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <StepIndicator />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <StepContent />
        </main>
      </div>
    </GiftCardProvider>
  );
}
