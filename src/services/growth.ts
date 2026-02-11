import { api } from "../api/client";
import { getActiveLang } from "../lib/i18nParam";
import type { FirstOrderWizardResponse, LastOrderSummary, Product } from "../types/api";

function normalizeList<T>(payload: any): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload.items)) return payload.items as T[];
  if (Array.isArray(payload.data)) return payload.data as T[];
  if (Array.isArray(payload.data?.items)) return payload.data.items as T[];
  return [];
}

export async function getLastOrders(limit = 2): Promise<LastOrderSummary[]> {
  const search = new URLSearchParams({ limit: String(limit) });
  const { data } = await api.get(`/me/orders/last?${search.toString()}`);
  const payload = data?.data ?? data;
  return normalizeList<LastOrderSummary>(payload).map((item) => ({
    id: item.id,
    code: item.code ?? item.id,
    createdAt: item.createdAt,
    totalCents: item.totalCents,
    status: item.status,
    providerId: item.providerId ?? null,
    providerName: item.providerName ?? null,
    providerNameAr: item.providerNameAr ?? null,
    itemsCount: item.itemsCount ?? 0,
  }));
}

type FrequentProductPayload = Partial<Product> & {
  etag?: string;
  pricingModel?: string;
  isWeightBased?: boolean;
  weightBased?: boolean;
};

export async function getFrequentlyBought(limit = 8): Promise<Product[]> {
  const lang = getActiveLang() ?? "en";
  const search = new URLSearchParams({ limit: String(limit), lang });
  const { data } = await api.get(`/me/products/frequently-bought?${search.toString()}`);
  const payload = data?.data ?? data;
  const list = normalizeList<FrequentProductPayload>(payload);
  return list.map((item) => ({
    id: item.id ?? "",
    name: item.name ?? "",
    nameAr: item.nameAr ?? undefined,
    slug: item.slug ?? item.id ?? "",
    imageUrl: item.imageUrl ?? null,
    gallery: item.gallery ?? null,
    images: item.images ?? null,
    tags: item.tags ?? null,
    weightBased: item.weightBased ?? item.isWeightBased ?? false,
    soldByWeight: item.soldByWeight ?? null,
    isWeightBased: item.isWeightBased ?? item.weightBased ?? false,
    description: item.description ?? null,
    descriptionAr: item.descriptionAr ?? null,
    priceCents: item.priceCents ?? 0,
    pricingModel: (item.pricingModel as "unit" | "weight" | undefined) ?? undefined,
    pricePerKg: item.pricePerKg ?? null,
    unitLabel: item.unitLabel ?? null,
    salePriceCents: item.salePriceCents ?? null,
    stock: item.stock ?? 0,
    status: item.status ?? "ACTIVE",
    isHotOffer: item.isHotOffer ?? false,
    deliveryEstimateMinutes: item.deliveryEstimateMinutes ?? null,
    providerId: item.providerId ?? null,
    branchId: item.branchId ?? null,
    categoryId: item.categoryId ?? item.category?.id,
    category: item.category ?? undefined,
    rating: item.rating ?? null,
    optionGroups: item.optionGroups ?? undefined,
  }));
}

function normalizeWizard(payload: any): FirstOrderWizardResponse {
  const node = payload?.data ?? payload ?? {};
  const steps = Array.isArray(node.steps) ? node.steps : [];
  return {
    show: Boolean(node.show),
    once: Boolean(node.once ?? true),
    steps,
    incentive: node.incentive ?? null,
  } as FirstOrderWizardResponse;
}

export async function getFirstOrderWizard(): Promise<FirstOrderWizardResponse> {
  const { data } = await api.get("/me/growth/first-order-wizard");
  return normalizeWizard(data);
}

export async function dismissFirstOrderWizard(): Promise<{ success: boolean }> {
  const { data } = await api.post("/me/growth/first-order-wizard/dismiss");
  return (data?.data ?? data) as { success: boolean };
}
