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
  }));
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
          category: it.product.category,
        }
      : undefined,
  }));
}
