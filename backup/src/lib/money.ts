export const fromCents = (c?: number | null) => (typeof c === "number" ? c / 100 : 0);
export const toCents = (v: number) => Math.round(v * 100);
export const fmtEGP = (v: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(v);
