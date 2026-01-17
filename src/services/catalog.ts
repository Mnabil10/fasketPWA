// src/services/catalog.ts
import { request } from "../api/client";
import { getActiveLang, withLang } from "../lib/i18nParam";
import type { Product, Category } from "../types/api";
import { withOfflineCache, type CachedResult } from "../lib/offlineCache";
import { APP_VERSION } from "../version";

function cacheKey(name: string, parts: Array<string | number | undefined | null>) {
  return [name, ...parts.map((part) => (part === undefined || part === null || part === "" ? "all" : part))].join(":");
}

const DEFAULT_PRODUCTS_PAGE_SIZE = 20;
const DEFAULT_PRODUCTS_BATCH_SIZE = 100;

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

function normalizePaginatedProducts(payload: ProductsPayload): {
  items: Product[];
  total?: number;
  page?: number;
  pageSize?: number;
} {
  const items = normalizeProducts(payload);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { items };
  }

  const meta = payload as PaginatedProducts;
  let total = typeof meta.total === "number" ? meta.total : undefined;
  let page = typeof meta.page === "number" ? meta.page : undefined;
  let pageSize = typeof meta.pageSize === "number" ? meta.pageSize : undefined;
  if (total !== undefined || page !== undefined || pageSize !== undefined) {
    return { items, total, page, pageSize };
  }

  const data = (payload as { data?: any }).data;
  if (data && typeof data === "object") {
    total = typeof data.total === "number" ? data.total : undefined;
    page = typeof data.page === "number" ? data.page : undefined;
    pageSize = typeof data.pageSize === "number" ? data.pageSize : undefined;
  }

  return { items, total, page, pageSize };
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
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? DEFAULT_PRODUCTS_PAGE_SIZE;
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
      page,
      pageSize,
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
      page,
      pageSize,
    ]),
    async () => {
      const res = await request<ProductsPayload>({ url: `/products${qs}`, method: "GET" });
      return normalizeProducts(res);
    },
    { ttlMs: 5 * 60 * 1000, version: APP_VERSION, lang }
  );
};

export const listAllProducts = (params: ListProductsParams = {}): Promise<CachedResult<Product[]>> => {
  const lang = params.lang ?? getActiveLang("en");
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PRODUCTS_BATCH_SIZE);
  const baseParams = {
    q: params.q,
    categoryId: params.categoryId,
    categorySlug: params.categorySlug,
    providerId: params.providerId,
    min: params.min,
    max: params.max,
    orderBy: params.orderBy,
    sort: params.sort,
  };
  return withOfflineCache(
    cacheKey("products-all", [
      lang,
      params.q,
      params.categoryId,
      params.categorySlug,
      params.providerId,
      params.min,
      params.max,
      params.orderBy,
      params.sort,
      pageSize,
    ]),
    async () => {
      const all: Product[] = [];
      let page = 1;
      let total: number | undefined;
      let effectivePageSize = pageSize;

      while (true) {
        const qs = withLang({ ...baseParams, page, pageSize }, lang);
        const res = await request<ProductsPayload>({ url: `/products${qs}`, method: "GET" });
        const { items, total: responseTotal, pageSize: responsePageSize } = normalizePaginatedProducts(res);
        if (typeof responseTotal === "number") total = responseTotal;
        if (typeof responsePageSize === "number" && responsePageSize > 0) {
          effectivePageSize = responsePageSize;
        }
        if (items.length) all.push(...items);
        if (!items.length) break;
        if (total !== undefined) {
          if (all.length >= total) break;
        } else if (items.length < effectivePageSize) {
          break;
        }
        page += 1;
      }

      return all;
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

