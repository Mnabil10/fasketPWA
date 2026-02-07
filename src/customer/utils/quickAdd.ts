import type { CartPreviewItem } from "../types";

export type QuickAddItem = {
  itemId: string;
  qty: number;
};

export function buildQuickAddMap(items: CartPreviewItem[]) {
  const map = new Map<string, QuickAddItem | null>();
  for (const item of items) {
    if (!item?.productId) continue;
    if (item.options && item.options.length > 0) continue;
    const existing = map.get(item.productId);
    if (existing) {
      map.set(item.productId, null);
      continue;
    }
    map.set(item.productId, { itemId: item.id, qty: item.quantity });
  }
  return map;
}
