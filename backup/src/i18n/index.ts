import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import ar from '../locales/ar.json';

export const supportedLanguages = [
  { code: 'en', native: 'English', dir: 'ltr' as const },
  { code: 'ar', native: 'العربية', dir: 'rtl' as const },
];

const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const fallbackLng = 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: saved || fallbackLng,
    fallbackLng,
    interpolation: { escapeValue: false },
  });

export function applyDocumentDirection(lang: string) {
  const def = supportedLanguages.find((l) => l.code === lang) || supportedLanguages[0];
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', def.code);
    document.documentElement.setAttribute('dir', def.dir);
  }
}

// Apply on load
applyDocumentDirection(i18n.language);

// React to language change
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('lang', lng);
  } catch {}
  applyDocumentDirection(lng);
});

export default i18n;

