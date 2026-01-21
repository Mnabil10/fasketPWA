import { FASKET_CONFIG } from "../../config/fasketConfig";
import type { LocalizedString, MobileAppConfig } from "../../types/api";

export type SupportConfig = {
  serviceArea: string;
  cityCoverage: string;
  workingHours: string;
  websiteUrl: string;
  webAppUrl: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  playStoreUrl: string;
  appStoreUrl: string;
};

export function getLocalizedString(
  value: LocalizedString | null | undefined,
  lang: "ar" | "en",
  fallback = ""
) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  const localized = lang === "ar" ? value.ar : value.en;
  return localized || value.en || value.ar || fallback;
}

export function resolveSupportConfig(
  config?: MobileAppConfig | null,
  lang: "ar" | "en" = "en"
): SupportConfig {
  const support = config?.content?.support ?? {};
  return {
    serviceArea: getLocalizedString(support.serviceArea, lang, FASKET_CONFIG.serviceArea),
    cityCoverage: getLocalizedString(support.cityCoverage, lang, FASKET_CONFIG.cityCoverage),
    workingHours: getLocalizedString(support.workingHours, lang, FASKET_CONFIG.workingHours),
    websiteUrl: support.websiteUrl || FASKET_CONFIG.websiteUrl,
    webAppUrl: support.webAppUrl || FASKET_CONFIG.webAppUrl,
    supportEmail: support.email || FASKET_CONFIG.supportEmail,
    supportPhone: support.phone || FASKET_CONFIG.supportPhone,
    whatsappNumber: support.whatsapp || FASKET_CONFIG.whatsappNumber,
    playStoreUrl: support.playStoreUrl || FASKET_CONFIG.playStoreUrl,
    appStoreUrl: support.appStoreUrl || FASKET_CONFIG.appStoreUrl,
  };
}

export function isFeatureEnabled(
  config: MobileAppConfig | null | undefined,
  key: "guestCheckout" | "coupons" | "loyalty",
  fallback = true
) {
  const features = config?.features;
  if (!features || typeof features !== "object") return fallback;
  const value = features[key];
  return typeof value === "boolean" ? value : fallback;
}
