import { api, request } from "../api/client";
import type { Address } from "../types/api";

export async function listAddresses() {
  const { data } = await api.get("/addresses");
  return data;
}
export async function createAddress(body: {
  label: string; city?: string; zone?: string; street?: string;
  building?: string | null; apartment?: string | null; lat?: number | null; lng?: number | null;
}) {
  const { data } = await api.post("/addresses", body);
  return data;
}
export async function updateAddress(id: string, body: Partial<{
  label: string; city?: string; zone?: string; street?: string;
  building?: string | null; apartment?: string | null; lat?: number | null; lng?: number | null;
}>) {
  const { data } = await api.patch(`/addresses/${id}`, body);
  return data;
}
export async function deleteAddress(id: string) {
  const { data } = await api.delete(`/addresses/${id}`);
  return data;
}