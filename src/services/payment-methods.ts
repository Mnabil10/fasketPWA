import { api } from "../api/client";
import type { SavedPaymentMethod } from "../types/api";

type PaymentMethodsPayload =
  | SavedPaymentMethod[]
  | {
      data?: SavedPaymentMethod[] | { items?: SavedPaymentMethod[] | null } | null;
      items?: SavedPaymentMethod[];
      paymentMethods?: SavedPaymentMethod[];
      [key: string]: any;
    };

export type PaymentMethodInput = {
  type: "CARD" | "WALLET";
  provider?: string;
  token: string;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  walletProvider?: "VODAFONE_CASH" | "ORANGE_MONEY" | "ETISALAT_CASH";
  walletPhone?: string;
  isDefault?: boolean;
};

function normalizePaymentMethods(payload: PaymentMethodsPayload): SavedPaymentMethod[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.paymentMethods)) return payload.paymentMethods;
  const dataLayer = payload.data;
  if (Array.isArray(dataLayer)) return dataLayer;
  if (dataLayer && typeof dataLayer === "object" && Array.isArray((dataLayer as { items?: SavedPaymentMethod[] }).items)) {
    return ((dataLayer as { items?: SavedPaymentMethod[] }).items as SavedPaymentMethod[]) ?? [];
  }
  return [];
}

export async function listPaymentMethods(): Promise<SavedPaymentMethod[]> {
  const { data } = await api.get("/payment-methods");
  return normalizePaymentMethods(data);
}

export async function createPaymentMethod(body: PaymentMethodInput): Promise<SavedPaymentMethod> {
  const { data } = await api.post("/payment-methods", body);
  return (data?.data ?? data) as SavedPaymentMethod;
}

export async function deletePaymentMethod(id: string) {
  const { data } = await api.delete(`/payment-methods/${id}`);
  return data?.data ?? data;
}

export async function setDefaultPaymentMethod(id: string) {
  const { data } = await api.patch(`/payment-methods/${id}/default`);
  return data?.data ?? data;
}
