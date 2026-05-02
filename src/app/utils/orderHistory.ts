export interface OrderRecord {
  id: string;
  restaurantName: string;
  storeId: string;
  orderNumber: number;
  quantity: number;
  startNum: number;
  endNum: number;
  createdAt: string; // ISO date
}

const STORAGE_KEY = "blogic_gift_card_orders";

export function getOrderHistory(): OrderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Omit<OrderRecord, "id" | "createdAt">): OrderRecord {
  const history = getOrderHistory();
  const record: OrderRecord = {
    ...order,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  history.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return record;
}

export function getOrdersForStore(storeId: string): OrderRecord[] {
  return getOrderHistory().filter((o) => o.storeId === storeId);
}

export function getOrdersForRestaurant(name: string): OrderRecord[] {
  const lower = name.toLowerCase().trim();
  return getOrderHistory().filter((o) => o.restaurantName.toLowerCase().trim() === lower);
}

export function getNextOrderNumber(storeId: string): number {
  const orders = getOrdersForStore(storeId);
  if (orders.length === 0) return 1;
  return Math.max(...orders.map((o) => o.orderNumber)) + 1;
}

export function getLastEndNum(storeId: string): number {
  const orders = getOrdersForStore(storeId);
  if (orders.length === 0) return 0;
  return Math.max(...orders.map((o) => o.endNum));
}

export function getUniqueRestaurants(): { name: string; storeId: string; orderCount: number }[] {
  const history = getOrderHistory();
  const map = new Map<string, { name: string; storeId: string; count: number }>();
  for (const o of history) {
    const existing = map.get(o.storeId);
    if (existing) {
      existing.count++;
    } else {
      map.set(o.storeId, { name: o.restaurantName, storeId: o.storeId, count: 1 });
    }
  }
  return Array.from(map.values()).map((v) => ({
    name: v.name,
    storeId: v.storeId,
    orderCount: v.count,
  }));
}

export function deleteOrder(id: string): void {
  const history = getOrderHistory().filter((o) => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
