import { addItem, getCart, removeItem, updateItemQty, type ApiCart } from "../../services/cart";
import type { CartPreviewItem } from "../types";
import { mapServerCartToUiItems } from "./cart";
import { useLocalCartStore, getLocalCartPreview } from "../stores/localCart";
import { getActiveLang } from "../../lib/i18nParam";
import type { ProductOptionSelection } from "../../types/api";
import { formatQtyKey, roundQty } from "./quantity";

function buildOptionsKey(options?: Array<{ optionId?: string; id?: string; qty?: number }> | null) {
  if (!options?.length) return "no-options";
  return options
    .map((opt) => {
      const optionId = String(opt.optionId ?? opt.id ?? "").trim();
      const qtyValue = typeof opt.qty === "number" ? opt.qty : 1;
      if (!optionId || qtyValue <= 0) return null;
      return { optionId, qty: formatQtyKey(qtyValue, 1) };
    })
    .filter((opt): opt is { optionId: string; qty: string } => Boolean(opt))
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((opt) => `${opt.optionId}:${opt.qty}`)
    .join("|");
}

function buildItemKey(productId: string, branchId: string | null | undefined, optionsKey: string) {
  return `${productId}:${branchId ?? "none"}:${optionsKey || "no-options"}`;
}

function mapOptionSelections(options?: ProductOptionSelection[]) {
  if (!options?.length) return undefined;
  return options.map((opt) => ({ optionId: opt.optionId, qty: roundQty(opt.qty ?? 1) }));
}

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
  const serverByKey = new Map(
    existing?.items?.map((item) => {
      const key = buildItemKey(item.productId, item.branchId ?? null, buildOptionsKey((item as any).options));
      return [key, item];
    })
  );
  for (const item of items) {
    const key = buildItemKey(item.productId, item.branchId ?? null, item.optionsKey || "no-options");
    const serverItem = serverByKey.get(key);
    if (serverItem) {
      await updateItemQty(serverItem.id, roundQty(serverItem.qty + item.quantity));
    } else {
      await addItem({
        productId: item.productId,
        qty: item.quantity,
        branchId: item.branchId ?? null,
        options: mapOptionSelections(item.options),
      });
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
