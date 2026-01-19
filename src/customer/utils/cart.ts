import { fromCents } from "../../lib/money";
import type { CartPreviewItem } from "../types";
import type { ProductOptionSelection } from "../../types/api";

function normalizeOptionSelections(options?: Array<Record<string, any>> | null): ProductOptionSelection[] | undefined {
  if (!Array.isArray(options)) return undefined;
  return options.map((opt) => ({
    optionId: opt.optionId ?? opt.id ?? "",
    name: opt.name ?? opt.optionNameSnapshot ?? "",
    nameAr: opt.nameAr ?? opt.optionNameArSnapshot ?? null,
    priceCents: opt.priceCents ?? opt.priceSnapshotCents ?? 0,
    qty: opt.qty ?? 1,
    groupId: opt.groupId ?? undefined,
    groupName: opt.groupName ?? undefined,
    groupNameAr: opt.groupNameAr ?? null,
    groupPriceMode: opt.groupPriceMode ?? undefined,
  }));
}

export function computeOptionTotals(options?: ProductOptionSelection[]) {
  if (!options?.length) {
    return { addOnsTotalCents: 0, baseOverrideCents: null as number | null };
  }
  let addOnsTotalCents = 0;
  let baseOverrideCents = 0;
  let hasOverride = false;
  for (const opt of options) {
    const qty = Math.max(1, Math.floor(opt.qty ?? 1));
    const price = opt.priceCents ?? 0;
    if (opt.groupPriceMode === "SET") {
      baseOverrideCents += price * qty;
      hasOverride = true;
    } else {
      addOnsTotalCents += price * qty;
    }
  }
  return { addOnsTotalCents, baseOverrideCents: hasOverride ? baseOverrideCents : null };
}

export function mapServerCartToUiItems(server: { items: any[] } | null): CartPreviewItem[] {
  if (!server?.items) return [];
  return server.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    branchId: it.branchId ?? null,
    name: it.product?.name ?? "",
    image: it.product?.imageUrl ?? undefined,
    price: fromCents(it.priceCents),
    quantity: it.qty,
    category: it.product?.category?.name,
    options: normalizeOptionSelections(it.options),
    product: it.product
      ? {
          id: it.product.id,
          name: it.product.name,
          imageUrl: it.product.imageUrl,
          priceCents: it.product.priceCents,
          salePriceCents: it.product.salePriceCents,
          pricingModel: (it.product as any).pricingModel ?? undefined,
          pricePerKg: (it.product as any).pricePerKg ?? undefined,
          unitLabel: (it.product as any).unitLabel ?? undefined,
          category: it.product.category,
          tags: (it.product as any).tags ?? undefined,
          weightBased: (it.product as any).weightBased ?? undefined,
          soldByWeight: (it.product as any).soldByWeight ?? undefined,
          isWeightBased: (it.product as any).isWeightBased ?? undefined,
        }
      : undefined,
  }));
}
