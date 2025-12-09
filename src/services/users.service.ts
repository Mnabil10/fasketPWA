import { api } from "../api/client";
import type { UserProfile } from "../types/api";

function normalizeProfile(payload: any): UserProfile {
  const candidates = [
    payload?.data?.user,
    payload?.data?.profile,
    payload?.user,
    payload?.profile,
    payload?.data,
    payload,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as UserProfile;
    }
  }
  return payload as UserProfile;
}

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await api.get("/users/me");
  return normalizeProfile(data);
}

export async function updateProfile(body: Partial<UserProfile> & { avatarUrl?: string | null }) {
  const { data } = await api.patch("/users/me", body);
  return normalizeProfile(data);
}

export async function changePassword(body: { currentPassword: string; newPassword: string }) {
  // TODO: adjust endpoint to match backend capabilities.
  const { data } = await api.post("/users/change-password", body);
  return data;
}
