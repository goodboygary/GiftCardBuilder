"use client";

import { useEffect, useState } from "react";
import { useGiftCard } from "../context/GiftCardContext";
import {
  getOrdersForStore,
  getNextOrderNumber,
  getUniqueRestaurants,
  type OrderRecord,
} from "../utils/orderHistory";

export default function OrderDetails() {
  const { state, updateState } = useGiftCard();
  const [pastOrders, setPastOrders] = useState<OrderRecord[]>([]);
  const [knownRestaurants, setKnownRestaurants] = useState<{ name: string; storeId: string; orderCount: number }[]>([]);

  // Load known restaurants on mount
  useEffect(() => {
    setKnownRestaurants(getUniqueRestaurants());
  }, []);

  // When store ID changes, look up past orders and auto-set order number
  useEffect(() => {
    if (!state.storeId) {
      setPastOrders([]);
      return;
    }
    const orders = getOrdersForStore(state.storeId);
    setPastOrders(orders);
    if (orders.length > 0) {
      const nextNum = getNextOrderNumber(state.storeId);
      updateState({ orderNumber: nextNum });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.storeId]);

  const startNum = (state.orderNumber - 1) * state.quantity + 1;
  const endNum = state.orderNumber * state.quantity;
  const formatCardNum = (n: number) => n.toString().padStart(9, "0");
  const restaurantNoSpaces = state.restaurantName.replace(/\s+/g, "");
  const firstCard = `%A${formatCardNum(startNum)}^BLogicSystems^${restaurantNoSpaces}^${state.storeId}?`;
  const lastCard = `%A${formatCardNum(endNum)}^BLogicSystems^${restaurantNoSpaces}^${state.storeId}?`;
  const folderName = state.orderNumber > 1 ? `${state.restaurantName}-${state.orderNumber}` : state.restaurantName;
  const isValid = state.restaurantName.trim() && state.storeId.trim();

  const handleSelectRestaurant = (storeId: string) => {
    const restaurant = knownRestaurants.find((r) => r.storeId === storeId);
    if (restaurant) {
      updateState({ storeId: restaurant.storeId, restaurantName: restaurant.name });
    }
  };

  const ordinalSuffix = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
        <p className="text-gray-500 mt-1">Enter the restaurant and order information</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Returning customer quick-select */}
        {knownRestaurants.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Returning Customer?</label>
            <div className="flex flex-wrap gap-2">
              {knownRestaurants.map((r) => (
                <button
                  key={r.storeId}
                  onClick={() => handleSelectRestaurant(r.storeId)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    state.storeId === r.storeId
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r.name}
                  <span className="ml-1 text-xs text-gray-400">({r.orderCount} order{r.orderCount > 1 ? "s" : ""})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Restaurant Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant / Business Name</label>
          <input
            type="text"
            value={state.restaurantName}
            onChange={(e) => updateState({ restaurantName: e.target.value })}
            placeholder="e.g. Super Taqueria"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Store ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
          <input
            type="text"
            value={state.storeId}
            onChange={(e) => updateState({ storeId: e.target.value })}
            placeholder="e.g. 2020996"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Past orders for this store */}
        {pastOrders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-800 mb-2">
              Previous Orders for {state.restaurantName || `Store ${state.storeId}`}
            </h4>
            <div className="space-y-1.5">
              {pastOrders
                .sort((a, b) => a.orderNumber - b.orderNumber)
                .map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-xs text-amber-700">
                    <span>
                      <span className="font-semibold">{ordinalSuffix(o.orderNumber)} Order</span>
                      {" — "}
                      {o.quantity.toLocaleString()} cards
                      <span className="text-amber-500 ml-2">
                        ({new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                      </span>
                    </span>
                    <span className="font-mono">
                      {formatCardNum(o.startNum)} → {formatCardNum(o.endNum)}
                    </span>
                  </div>
                ))}
            </div>
            <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
              Auto-set to <span className="font-semibold">{ordinalSuffix(state.orderNumber)} Order</span> (next available)
            </p>
          </div>
        )}

        {/* Order Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
          <select
            value={state.orderNumber}
            onChange={(e) => updateState({ orderNumber: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {ordinalSuffix(n)} Order
                {pastOrders.some((o) => o.orderNumber === n) ? " (already ordered)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <select
            value={state.quantity}
            onChange={(e) => updateState({ quantity: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {[500, 1000, 1500, 2000, 2500, 3000, 5000].map((q) => (
              <option key={q} value={q}>{q.toLocaleString()} cards</option>
            ))}
          </select>
        </div>

        {/* Preview info */}
        {isValid && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">Order Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">Order #</span>
                <span className="font-medium text-gray-900">{state.storeId}-{state.orderNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">Folder Name</span>
                <span className="font-medium text-gray-900">{folderName}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">Card Range</span>
                <span className="font-medium text-gray-900">{formatCardNum(startNum)} &rarr; {formatCardNum(endNum)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wide">Quantity</span>
                <span className="font-medium text-gray-900">{state.quantity.toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-1">
              <p className="text-xs text-gray-500">
                <span className="font-medium">First card:</span>{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">{firstCard}</code>
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Last card:</span>{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">{lastCard}</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={() => updateState({ currentStep: 2 })}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => updateState({ currentStep: 4 })}
          disabled={!isValid}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Review & Export
        </button>
      </div>
    </div>
  );
}
