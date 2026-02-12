import { Capacitor } from "@capacitor/core";

const APP_STORE_DEADLINE = new Date(2026, 1, 18);

/** Controls feature visibility (phone required, account deletion, etc.) for App Store review bypass. */
export const isAppStoreDeadlinePassed =
  Capacitor.getPlatform?.() !== "ios" || new Date() > APP_STORE_DEADLINE;

export const APP_STORE_BYPASS_PHONE = "+201432345678";

export const FASKET_CONFIG = {
  appVersion: "1.0.0",
  serviceArea: "We deliver anywhere inside Badr City",
  cityCoverage: "All districts of Badr City, Cairo",
  workingHours: "Daily from 9:00 AM to 1:00 AM",
  websiteUrl: "https://fasket.shop/",
  webAppUrl: "https://fasket.shop/",
  supportEmail: "support@fasket.shop",
  supportPhone: "+201233329708",
  whatsappNumber: "201233329708",
  playStoreUrl: "https://play.google.com/store/apps/details?id=fasket.user",
  appStoreUrl: "https://apps.apple.com/us/app/fasket/id6759081638",
};
