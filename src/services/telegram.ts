import { api } from "../api/client";

export type TelegramLinkTokenResponse = { deeplink: string; expiresInMinutes?: number };

export async function getTelegramLinkToken(): Promise<TelegramLinkTokenResponse> {
  const { data } = await api.post("/telegram/link-token");
  return {
    deeplink: (data as any)?.deeplink || "",
    expiresInMinutes: (data as any)?.expiresInMinutes,
  };
}
