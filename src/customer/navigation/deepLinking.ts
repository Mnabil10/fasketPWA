import type { Screen } from "../CustomerApp";

export type DeepLinkTarget =
  | { screen: Screen; categorySlug?: string | null; productSlug?: string | null }
  | null;

function normalizeSlug(value?: string | null) {
  return value && value.length > 0 ? value : null;
}

export function buildHashFromState(args: {
  screen: Screen;
  categorySlug?: string | null;
  productSlug?: string | null;
}) {
  const { screen, categorySlug, productSlug } = args;
  switch (screen) {
    case "categories":
      return "#/categories";
    case "products":
      return categorySlug ? `#/category/${categorySlug}` : "#/products";
    case "product-detail":
      if (productSlug) return `#/product/${productSlug}`;
      if (categorySlug) return `#/category/${categorySlug}`;
      return "#/product";
    case "home":
      return "#/home";
    case "cart":
      return "#/cart";
    case "about":
      return "#/about-fasket";
    default:
      return `#/${screen}`;
  }
}

export function parseHash(hash?: string): DeepLinkTarget {
  if (!hash) return null;
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  const [first, second, third] = normalized.split("/").filter(Boolean);
  if (!first) return null;

  if (first === "category" && second) {
    return { screen: "products", categorySlug: normalizeSlug(second), productSlug: null };
  }
  if (first === "product" && second) {
    return { screen: "product-detail", productSlug: normalizeSlug(second) };
  }
  if (first === "about-fasket" || first === "about") {
    return { screen: "about", categorySlug: null, productSlug: null };
  }
  const screen = first as Screen;
  const allowedScreens: Screen[] = [
    "splash",
    "onboarding",
    "auth",
    "register",
    "home",
    "categories",
    "products",
    "product-detail",
    "cart",
    "checkout",
    "order-success",
    "orders",
    "order-detail",
    "profile",
    "addresses",
    "loyalty-history",
    "about",
  ];
  const safeScreen = allowedScreens.includes(screen) ? screen : "home";
  return { screen: safeScreen, categorySlug: normalizeSlug(second || null), productSlug: normalizeSlug(third || null) };
}

export function hashFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hash) return parsed.hash;
    const path = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
    return `#/${path}`;
  } catch {
    if (url.startsWith("#")) return url;
    if (url.startsWith("/")) return `#${url}`;
    return null;
  }
}
