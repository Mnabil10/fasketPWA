import { getLanguage } from "../store/session";

const resolveLocale = () => {
  const lang = getLanguage();
  if (lang === "ar") return "ar-EG";
  if (lang === "en") return "en-EG";
  if (typeof document !== "undefined") {
    const docLang = document.documentElement.lang;
    if (docLang?.startsWith("ar")) return "ar-EG";
    if (docLang?.startsWith("en")) return "en-EG";
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.startsWith("ar") ? "ar-EG" : "en-EG";
  }
  return "en-EG";
};

export const fromCents = (c?: number | null) => (typeof c === "number" ? c / 100 : 0);
export const toCents = (v: number) => Math.round(v * 100);
export const fmtEGP = (v: number, locale?: string) =>
  new Intl.NumberFormat(locale ?? resolveLocale(), { style: "currency", currency: "EGP" }).format(v);
