type SentryGlobal = typeof window & { Sentry?: any; __sentryLoaded?: boolean };

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Sentry load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Sentry load failed"));
    document.head.appendChild(script);
  });
}

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") return;
  const global = window as SentryGlobal;
  if (global.__sentryLoaded) return;
  await loadScript("https://browser.sentry-cdn.com/7.114.0/bundle.tracing.min.js");
  if (!global.Sentry) return;
  global.Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE,
  });
  global.__sentryLoaded = true;
}
