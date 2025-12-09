import { App as CapacitorApp } from "@capacitor/app";
import { FASKET_CONFIG } from "../config/fasketConfig";

export function digitsOnly(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function buildWhatsappUrl(message: string) {
  const number = digitsOnly(FASKET_CONFIG.whatsappNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

export async function openExternalUrl(url: string) {
  try {
    await CapacitorApp.openUrl({ url });
    return;
  } catch {
    // fall through
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function openWhatsapp(message: string) {
  const url = buildWhatsappUrl(message);
  await openExternalUrl(url);
}

export function buildSupportMailto(subject?: string) {
  const encodedSubject = subject ? encodeURIComponent(subject) : "";
  return `mailto:${FASKET_CONFIG.supportEmail}${encodedSubject ? `?subject=${encodedSubject}` : ""}`;
}
