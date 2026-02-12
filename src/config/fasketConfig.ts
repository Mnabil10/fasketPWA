import { Capacitor } from "@capacitor/core";

const APP_STORE_DEADLINE = new Date(2026, 1, 18);

/** When true: phone required. When false (iOS only, before deadline): phone optional, uses bypass. */
export const isAppStoreDeadlinePassed =
  Capacitor.getPlatform?.() !== "ios" || new Date() > APP_STORE_DEADLINE;

export const APP_STORE_BYPASS_PHONE = "+201432345678";

export const FASKET_CONFIG = {
  serviceArea: "We deliver anywhere inside Badr City",
  cityCoverage: "All districts of Badr City, Cairo",
  workingHours: "Daily from 9:00 AM to 1:00 AM",
  websiteUrl: "https://fasket.shop/",
  webAppUrl: "https://fasket.shop/",
  supportEmail: "support@fasket.shop",
  supportPhone: "+201233329708",
  whatsappNumber: "201233329708",
  playStoreUrl: "https://play.google.com/store/apps/details?id=fasket.user",
  appStoreUrl: "",
};
