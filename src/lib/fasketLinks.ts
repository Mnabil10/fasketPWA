import { App as CapacitorApp } from "@capacitor/app";
import { FASKET_CONFIG } from "../config/fasketConfig";

export function digitsOnly(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function buildWhatsappUrl(message: string, phoneOverride?: string) {
  const number = digitsOnly(phoneOverride ?? FASKET_CONFIG.whatsappNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

export async function openExternalUrl(url: string) {
  const maybeApp = CapacitorApp as unknown as { openUrl?: (options: { url: string }) => Promise<void> };
  try {
    if (maybeApp.openUrl) {
      await maybeApp.openUrl({ url });
      return;
    }
  } catch {
    // fall through
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function openWhatsapp(message: string, phoneOverride?: string) {
  const url = buildWhatsappUrl(message, phoneOverride);
  await openExternalUrl(url);
}

export function buildSupportMailto(subject?: string, emailOverride?: string) {
  const encodedSubject = subject ? encodeURIComponent(subject) : "";
  const email = emailOverride ?? FASKET_CONFIG.supportEmail;
  return `mailto:${email}${encodedSubject ? `?subject=${encodedSubject}` : ""}`;
}
