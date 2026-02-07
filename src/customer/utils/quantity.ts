import { getLanguage } from "../../store/session";

const QTY_PRECISION = 3;
const QTY_EPS = 1e-6;

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

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string) {
  return new Intl.NumberFormat(locale ?? resolveLocale(), options).format(value);
}

export function normalizeQty(qty?: number | null, fallback = 1) {
  if (typeof qty !== "number" || Number.isNaN(qty)) return fallback;
  return qty;
}

export function clampQty(qty?: number | null, fallback = 1) {
  const value = normalizeQty(qty, fallback);
  if (value < 0) return 0;
  return value;
}

export function roundQty(qty: number, precision = QTY_PRECISION) {
  const factor = 10 ** precision;
  return Math.round(qty * factor) / factor;
}

export function formatQty(qty: number, precision = QTY_PRECISION) {
  const rounded = roundQty(qty, precision);
  return formatNumber(rounded, { minimumFractionDigits: 0, maximumFractionDigits: precision });
}

export function formatQtyKey(qty?: number | null, fallback = 1) {
  const value = clampQty(qty, fallback);
  return formatQty(roundQty(value));
}

export function shouldShowQtyLabel(qty?: number | null) {
  if (typeof qty !== "number" || Number.isNaN(qty)) return false;
  return Math.abs(qty - 1) > QTY_EPS;
}

export function formatOptionQtyLabel(qty?: number | null) {
  if (!shouldShowQtyLabel(qty)) return "";
  return ` x${formatQty(qty as number)}`;
}

export function isFractional(qty?: number | null) {
  if (typeof qty !== "number" || Number.isNaN(qty)) return false;
  return Math.abs(qty - Math.round(qty)) > QTY_EPS;
}

export function calcLineTotal(priceCents: number, qty: number) {
  return Math.round(priceCents * qty);
}
