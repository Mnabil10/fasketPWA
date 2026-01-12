const ARABIC_NUMBERS = /[\u0660-\u0669]/g;
const EASTERN_ARABIC_NUMBERS = /[\u06f0-\u06f9]/g;
const EG_MOBILE_E164 = /^\+20\d{10}$/;

export function normalizeDigits(value: string): string {
  return value
    .replace(ARABIC_NUMBERS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EASTERN_ARABIC_NUMBERS, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function sanitizeEgyptPhoneInput(value: string): string {
  const normalized = normalizeDigits(value || "");
  let cleaned = normalized.replace(/[^\d+]/g, "");
  const hasPlus = cleaned.startsWith("+");
  cleaned = cleaned.replace(/\+/g, "");
  const wantsCountry = cleaned.startsWith("20");
  const maxDigits = hasPlus || wantsCountry ? 12 : 11;
  const trimmed = cleaned.slice(0, maxDigits);
  return hasPlus ? `+${trimmed}` : trimmed;
}

export function normalizeEgyptPhone(value: string): string | null {
  if (!value) return null;
  const cleaned = sanitizeEgyptPhoneInput(value);
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return null;
  if (cleaned.startsWith("+")) {
    const normalized = `+${digits}`;
    return EG_MOBILE_E164.test(normalized) ? normalized : null;
  }
  if (digits.startsWith("20")) {
    const normalized = `+${digits}`;
    return EG_MOBILE_E164.test(normalized) ? normalized : null;
  }
  if (digits.startsWith("0")) {
    const rest = digits.replace(/^0+/, "");
    if (!/^1\d{9}$/.test(rest)) return null;
    return `+20${rest}`;
  }
  if (/^1\d{9}$/.test(digits)) {
    return `+20${digits}`;
  }
  return null;
}

export function isValidEgyptPhone(value?: string | null): boolean {
  return Boolean(normalizeEgyptPhone(value || ""));
}

export function isPhoneLike(value: string): boolean {
  if (!value) return false;
  if (value.includes("@")) return false;
  return /^[\d\s()+-]+$/.test(value);
}
