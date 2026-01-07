// src/services/catalog.ts
import { request } from "../api/client";
import { getActiveLang, withLang } from "../lib/i18nParam";
import type { Product, Category } from "../types/api";
import { withOfflineCache, type CachedResult } from "../lib/offlineCache";
import { APP_VERSION } from "../version";

function cacheKey(name: string, parts: Array<string | number | undefined | null>) {
  return [name, ...parts.map((part) => (part === undefined || part === null || part === "" ? "all" : part))].join(":");
}

type PaginatedProducts = {
  items?: Product[];
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: any;
};

type CategoriesPayload =
  | Category[]
  | {
      items?: Category[];
      data?: Category[] | { items?: Category[] | null } | null;
      categories?: Category[];
      [key: string]: any;
    };

type ProductsPayload =
  | Product[]
  | PaginatedProducts
  | {
      items?: Product[];
      data?: Product[] | { items?: Product[] | null } | null;
      products?: Product[];
      [key: string]: any;
    };

export type ListProductsParams = {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  providerId?: string;
  min?: number;
  max?: number;
  orderBy?: "createdAt" | "priceCents" | "name";
  sort?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  lang?: "ar" | "en";
};

function normalizeCategories(payload: CategoriesPayload): Category[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.categories)) return payload.categories;

  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { items?: Category[] | null }).items)) {
    return ((data as { items?: Category[] | null }).items as Category[]) ?? [];
  }

  return [];
}

function normalizeProducts(payload: ProductsPayload): Product[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.products)) return payload.products;

  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { items?: Product[] | null }).items)) {
    return ((data as { items?: Product[] | null }).items as Product[]) ?? [];
  }

  return [];
}

type ProductPayload =
  | Product
  | {
      data?: Product | { product?: Product | null } | null;
      product?: Product | null;
      [key: string]: any;
    };

function normalizeProductEntity(payload: ProductPayload): Product | null {
  if (!payload || typeof payload !== "object") {
    return (payload as Product) ?? null;
  }
  const candidates = [
    (payload as { data?: { product?: Product | null } }).data?.product,
    (payload as { product?: Product | null }).product,
    (payload as { data?: Product | null }).data,
    payload as Product,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && candidate.id) {
      return candidate;
    }
  }
  return null;
}

// GET /products?q=&categoryId=&categorySlug=&min=&max=&orderBy=&sort=&page=&pageSize&lang=
export const listProducts = (params: ListProductsParams = {}): Promise<CachedResult<Product[]>> => {
  const lang = params.lang ?? getActiveLang("en");
  const qs = withLang(
    {
      q: params.q,
      categoryId: params.categoryId,
      categorySlug: params.categorySlug,
      providerId: params.providerId,
      min: params.min,
      max: params.max,
      orderBy: params.orderBy,
      sort: params.sort,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
    lang
  );
  return withOfflineCache(
    cacheKey("products", [
      lang,
      params.q,
      params.categoryId,
      params.categorySlug,
      params.providerId,
      params.min,
      params.max,
      params.orderBy,
      params.sort,
      params.page ?? 1,
      params.pageSize ?? 20,
    ]),
    async () => {
      const res = await request<ProductsPayload>({ url: `/products${qs}`, method: "GET" });
      return normalizeProducts(res);
    },
    { ttlMs: 5 * 60 * 1000, version: APP_VERSION, lang }
  );
};

// GET /products/:idOrSlug?lang=
export const getProduct = (
  idOrSlug: string,
  lang: "ar" | "en" = getActiveLang("en")
): Promise<CachedResult<Product>> => {
  const qs = withLang({}, lang);
  return withOfflineCache(
    cacheKey("product", [lang, idOrSlug]),
    async () => {
      const res = await request<ProductPayload>({ url: `/products/${idOrSlug}${qs}`, method: "GET" });
      const normalized = normalizeProductEntity(res);
      if (!normalized) {
        throw new Error("Product not found");
      }
      return normalized;
    },
    { ttlMs: 5 * 60 * 1000, version: APP_VERSION, lang }
  );
};

// GET /categories?q=&sort=&lang=
export const listCategories = (
  params?:
    | {
        q?: string;
        sort?: "asc" | "desc";
        page?: number;
        pageSize?: number;
        providerId?: string;
        lang?: "ar" | "en";
      }
    | "ar"
    | "en"
): Promise<CachedResult<Category[]>> => {
  const normalized = typeof params === "string" ? { lang: params } : params ?? {};
  const lang = normalized.lang ?? getActiveLang("en");
  const qs = withLang(
    {
      q: normalized.q,
      sort: normalized.sort,
      page: normalized.page ?? 1,
      pageSize: normalized.pageSize ?? 20,
      providerId: normalized.providerId,
    },
    lang
  );
  return withOfflineCache(
    cacheKey(
      "categories",
      [lang, normalized.q, normalized.sort, normalized.providerId, normalized.page ?? 1, normalized.pageSize ?? 20]
    ),
    async () => {
      const res = await request<CategoriesPayload>({ url: `/categories${qs}`, method: "GET" });
      return normalizeCategories(res);
    },
    { ttlMs: 10 * 60 * 1000, version: APP_VERSION, lang }
  );
};

// GET /products/public/best-selling?page=&pageSize=&lang=
export const bestSelling = (params?: {
  page?: number;
  pageSize?: number;
  providerId?: string;
  lang?: "ar" | "en";
}): Promise<CachedResult<Product[]>> => {
  const lang = params?.lang ?? getActiveLang("en");
  const qs = withLang({ page: params?.page ?? 1, pageSize: params?.pageSize ?? 20, providerId: params?.providerId }, lang);
  return withOfflineCache(
    cacheKey("best-selling", [lang, params?.providerId, params?.page ?? 1, params?.pageSize ?? 20]),
    async () => {
      const res = await request<ProductsPayload>({ url: `/products/public/best-selling${qs}`, method: "GET" });
      return normalizeProducts(res);
    },
    { ttlMs: 2 * 60 * 1000, version: APP_VERSION, lang }
  );
};

// GET /products/public/hot-offers?page=&pageSize=&lang=
export const hotOffers = (params?: {
  page?: number;
  pageSize?: number;
  providerId?: string;
  lang?: "ar" | "en";
}): Promise<CachedResult<Product[]>> => {
  const lang = params?.lang ?? getActiveLang("en");
  const qs = withLang({ page: params?.page ?? 1, pageSize: params?.pageSize ?? 20, providerId: params?.providerId }, lang);
  return withOfflineCache(
    cacheKey("hot-offers", [lang, params?.providerId, params?.page ?? 1, params?.pageSize ?? 20]),
    async () => {
      const res = await request<ProductsPayload>({ url: `/products/public/hot-offers${qs}`, method: "GET" });
      return normalizeProducts(res);
    },
    { ttlMs: 2 * 60 * 1000, version: APP_VERSION, lang }
  );
};

