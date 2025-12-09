export const withLang = (params: Record<string, any> = {}, lang?: "ar"|"en") => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  });
  if (lang) p.set("lang", lang);
  return p.toString() ? `?${p.toString()}` : "";
};
