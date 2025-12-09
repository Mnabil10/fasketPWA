import type { Category, Product } from "../../types/api";
import type { UpdateAppState } from "../CustomerApp";

function setHash(hash: string) {
  if (typeof window === "undefined") return;
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function goToHome(updateAppState?: UpdateAppState) {
  setHash("#/home");
  updateAppState?.({ currentScreen: "home", selectedProduct: null });
}

export function goToCart(updateAppState?: UpdateAppState) {
  setHash("#/cart");
  updateAppState?.({ currentScreen: "cart" });
}

export function goToOrders(updateAppState?: UpdateAppState) {
  setHash("#/orders");
  updateAppState?.({ currentScreen: "orders" });
}

type CategoryNavExtras = {
  category?: Category | null;
  categoryId?: string | null;
};

export function goToCategory(slug?: string | null, updateAppState?: UpdateAppState, extras?: CategoryNavExtras) {
  const cleaned = slug?.trim() || "";
  setHash(cleaned ? `#/category/${cleaned}` : "#/products");
  updateAppState?.((prev) => ({
    currentScreen: "products",
    selectedCategory:
      extras?.category ??
      (cleaned && prev.selectedCategory?.slug === cleaned ? prev.selectedCategory : null),
    selectedCategoryId: extras?.category?.id ?? extras?.categoryId ?? (cleaned || null),
    selectedProduct: null,
  }));
}

type ProductNavExtras = {
  product?: Partial<Product> | Product | null;
};

export function goToProduct(slug?: string | null, updateAppState?: UpdateAppState, extras?: ProductNavExtras) {
  const cleaned = slug?.trim() || "";
  setHash(cleaned ? `#/product/${cleaned}` : "#/product");
  updateAppState?.((prev) => ({
    currentScreen: "product-detail",
    selectedProduct:
      extras?.product ??
      (cleaned && prev.selectedProduct?.slug === cleaned ? prev.selectedProduct : { slug: cleaned }),
  }));
}
