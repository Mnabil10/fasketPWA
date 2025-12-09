// src/services/catalog.ts
import { request } from "../api/client";
import { withLang } from "../lib/i18nParam";
import type { Product, Category } from "../types/api";

// GET /products?q=&categoryId=&min=&max=&lang=
export const listProducts = (
  q?: string,
  categoryId?: string,
  min?: number,
  max?: number,
  lang: "ar" | "en" = "ar"
) => {
  const qs = withLang({ q, categoryId, min, max }, lang); // يفترض بيرجع مثل "?q=..&lang=.."
  return request<Product[]>({ url: `/products${qs}`, method: "GET" });
};

// GET /products/:idOrSlug?lang=
export const getProduct = (idOrSlug: string, lang: "ar" | "en" = "ar") => {
  const qs = withLang({}, lang);
  return request<Product>({ url: `/products/${idOrSlug}${qs}`, method: "GET" });
};

// GET /categories?lang=
export const listCategories = (lang: "ar" | "en" = "ar") => {
  const qs = withLang({}, lang);
  return request<Category[]>({ url: `/categories${qs}`, method: "GET" });
};

// GET /products/public/best-selling?limit=&lang=
export const bestSelling = (limit = 10, lang: "ar" | "en" = "ar") => {
  const qs = withLang({ limit }, lang);
  return request<Product[]>({ url: `/products/public/best-selling${qs}`, method: "GET" });
};

// GET /products/public/hot-offers?limit=&lang=
export const hotOffers = (limit = 10, lang: "ar" | "en" = "ar") => {
  const qs = withLang({ limit }, lang);
  return request<Product[]>({ url: `/products/public/hot-offers${qs}`, method: "GET" });
};
