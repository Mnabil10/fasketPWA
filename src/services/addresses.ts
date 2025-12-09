import { api } from "../api/client";
import type { Address } from "../types/api";

type AddressesPayload =
  | Address[]
  | {
      data?: Address[] | { items?: Address[] | null } | null;
      items?: Address[];
      addresses?: Address[];
      [key: string]: any;
    };

function normalizeAddresses(payload: AddressesPayload): Address[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.addresses)) return payload.addresses;
  const dataLayer = payload.data;
  if (Array.isArray(dataLayer)) return dataLayer;
  if (dataLayer && typeof dataLayer === "object" && Array.isArray((dataLayer as { items?: Address[] }).items)) {
    return ((dataLayer as { items?: Address[] }).items as Address[]) ?? [];
  }
  return [];
}

export async function listAddresses(): Promise<Address[]> {
  const { data } = await api.get("/addresses");
  return normalizeAddresses(data);
}
export type AddressInput = {
  zoneId: string;
  label?: string;
  city?: string;
  region?: string | null;
  street?: string;
  building?: string | null;
  apartment?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
};

export async function createAddress(body: AddressInput) {
  if (!body.zoneId) {
    throw new Error("zoneId is required to create an address");
  }
  const { data } = await api.post("/addresses", body);
  return data?.data ?? data;
}
export async function updateAddress(id: string, body: Partial<AddressInput>) {
  const { data } = await api.patch(`/addresses/${id}`, body);
  return data?.data ?? data;
}
export async function deleteAddress(id: string) {
  const { data } = await api.delete(`/addresses/${id}`);
  return data?.data ?? data;
}

export async function setDefaultAddress(id: string) {
  const { data } = await api.patch(`/addresses/${id}`, { isDefault: true });
  return data?.data ?? data;
}
