import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { FASKET_CONFIG } from "../config/fasketConfig";

export function digitsOnly(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function buildWhatsappUrl(message: string, phoneOverride?: string) {
  const number = digitsOnly(phoneOverride ?? FASKET_CONFIG.whatsappNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function isValidExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export async function openExternalUrl(url: string) {
  if (!url || typeof url !== "string") return;
  const trimmed = url.trim();
  if (!trimmed || !isValidExternalUrl(trimmed)) return;

  const parsed = new URL(trimmed);
  const protocol = parsed.protocol;

  if (protocol === "http:" || protocol === "https:") {
    try {
      await Browser.open({ url: trimmed });
      return;
    } catch {
      // fall back to App/window open
    }
  }

  const maybeApp = CapacitorApp as unknown as { openUrl?: (options: { url: string }) => Promise<void> };
  try {
    if (maybeApp.openUrl) {
      await maybeApp.openUrl({ url: trimmed });
      return;
    }
  } catch {
    // fall through
  }
  if (typeof window !== "undefined") {
    window.open(trimmed, "_blank", "noopener,noreferrer");
  }
}

export async function openWhatsapp(message: string, phoneOverride?: string) {
  const url = buildWhatsappUrl(message, phoneOverride);
  await openExternalUrl(url);
}

export function buildMapUrl(location: { lat: number; lng: number; label?: string | null }) {
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return null;
  const lat = location.lat;
  const lng = location.lng;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export async function openMapLocation(location: { lat: number; lng: number; label?: string | null }) {
  const url = buildMapUrl(location);
  if (!url) return;
  await openExternalUrl(url);
}

export function buildSupportMailto(subject?: string, emailOverride?: string) {
  const encodedSubject = subject ? encodeURIComponent(subject) : "";
  const email = emailOverride ?? FASKET_CONFIG.supportEmail;
  return `mailto:${email}${encodedSubject ? `?subject=${encodedSubject}` : ""}`;
}
