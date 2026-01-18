import type { Product } from "../../types/api";
import { getProduct } from "../../services/catalog";

export function requiresOptionSelection(product?: Product | null) {
  const groups = product?.optionGroups ?? [];
  return groups.some((group) => {
    if (!group || group.isActive === false) return false;
    const options = group.options ?? [];
    if (!options.length) return false;
    return (group.minSelected ?? 0) > 0;
  });
}

export async function resolveQuickAddProduct(
  product: Product,
  lang: "ar" | "en",
  allowFetch = true
): Promise<{ product: Product; requiresOptions: boolean }> {
  if (Array.isArray(product.optionGroups)) {
    return { product, requiresOptions: requiresOptionSelection(product) };
  }
  if (!allowFetch) {
    return { product, requiresOptions: false };
  }
  try {
    const detail = await getProduct(product.slug || product.id, lang);
    const resolved = detail.data ?? product;
    return { product: resolved, requiresOptions: requiresOptionSelection(resolved) };
  } catch {
    return { product, requiresOptions: false };
  }
}
