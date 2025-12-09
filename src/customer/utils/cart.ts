import { fromCents } from "../../lib/money";
import type { CartPreviewItem } from "../types";

export function mapServerCartToUiItems(server: { items: any[] } | null): CartPreviewItem[] {
  if (!server?.items) return [];
  return server.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    name: it.product?.name ?? "",
    image: it.product?.imageUrl ?? undefined,
    price: fromCents(it.priceCents),
    quantity: it.qty,
    category: it.product?.category?.name,
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
