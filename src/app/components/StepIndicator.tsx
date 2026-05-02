"use client";

import { useGiftCard } from "../context/GiftCardContext";

const steps = [
  { num: 1, label: "Design Front" },
  { num: 2, label: "Design Back" },
  { num: 3, label: "Order Details" },
  { num: 4, label: "Review & Export" },
];

export default function StepIndicator() {
  const { state, updateState } = useGiftCard();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center flex-1">
              <button
                onClick={() => updateState({ currentStep: step.num })}
                className="flex items-center gap-2 group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    state.currentStep === step.num
                      ? "bg-indigo-600 text-white"
                      : state.currentStep > step.num
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {state.currentStep > step.num ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    state.currentStep === step.num
                      ? "text-indigo-600"
                      : state.currentStep > step.num
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 ${
                    state.currentStep > step.num ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
