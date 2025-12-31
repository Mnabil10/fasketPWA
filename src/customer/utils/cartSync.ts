import { addItem, getCart, removeItem, updateItemQty, type ApiCart } from "../../services/cart";
import type { CartPreviewItem } from "../types";
import { mapServerCartToUiItems } from "./cart";
import { useLocalCartStore, getLocalCartPreview } from "../stores/localCart";
import { getActiveLang } from "../../lib/i18nParam";

export async function fetchServerCartPreview(
  lang?: "ar" | "en"
): Promise<{ cart: ApiCart; preview: CartPreviewItem[] }> {
  const finalLang = lang ?? getActiveLang();
  const cart = await getCart({ lang: finalLang });
  return { cart, preview: mapServerCartToUiItems(cart) };
}

export async function mergeLocalCartIntoServer(lang?: "ar" | "en") {
  const finalLang = lang ?? getActiveLang();
  const store = useLocalCartStore.getState();
  const items = Object.values(store.items);
  if (!items.length) {
    const { preview } = await fetchServerCartPreview(finalLang);
    return preview;
  }
  const existing = await getCart({ lang: finalLang }).catch(() => null);
  const serverByProduct = new Map(existing?.items?.map((item) => [item.productId, item]));
  for (const item of items) {
    const serverItem = serverByProduct.get(item.productId);
    if (serverItem) {
      await updateItemQty(serverItem.id, serverItem.qty + item.quantity);
    } else {
      await addItem({ productId: item.productId, qty: item.quantity, branchId: item.branchId ?? null });
    }
  }
  store.clear();
  const { preview } = await fetchServerCartPreview(finalLang);
  return preview;
}

export async function forceServerCartRefresh(lang?: "ar" | "en") {
  const { cart, preview } = await fetchServerCartPreview(lang);
  return { cart, preview };
}

export function getLocalCartSnapshot(): CartPreviewItem[] {
  return getLocalCartPreview();
}

export async function removeServerItemAndRefresh(itemId: string, lang?: "ar" | "en") {
  await removeItem(itemId);
  return forceServerCartRefresh(lang);
}
