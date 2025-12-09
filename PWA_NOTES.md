# PWA layer for Fasket

## What was added
- Enabled `vite-plugin-pwa` with `registerType: autoUpdate`, start URL `/app`, scope `/app/`, and workbox fallback to `/app/index.html` in `vite.config.ts`.
- Set Vite `base` to `/app/` so the build serves correctly from the `/app` sub-path (HTML `<base>` stays relative for Capacitor).
- Added PWA manifest metadata (name/description/colors) and new icons in `public/icons` plus a `favicon.ico`. Manifest links now point to the generated `manifest.webmanifest`.

## Build and preview
- Production web build: `npm run build` (outputs PWA manifest, service worker, and assets to `dist/`).
- Local preview under `/app`: `npm run preview -- --host --port 4173 --strictPort --clearScreen false` then open `http://localhost:4173/app`. Confirm the manifest, icons, and service worker in devtools.
- Offline check: load `/app`, navigate a few views, then go offline; workbox will serve `/app/index.html` and cached assets so navigation continues to function.

## Deployment notes for https://fasket.shop/app
- Serve the contents of `dist/` mounted at `/app` with an SPA rewrite so all `/app/**` requests return `/app/index.html`.
- Keep `public/icons` files deployed; manifest references `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/maskable-192.png`, `/icons/maskable-512.png`.
- RTL is handled by `src/i18n/index.ts` (updates `dir`/`lang` attributes) and the existing layout utilities; no UI changes were needed for web responsiveness.

## Android build integrity
- Kept Capacitor configs untouched; relative asset base keeps Android/web builds compatible.
- `npm run android:bundle` was executed after the PWA changes. Gradle failed at `:capacitor-android:compileReleaseJavaWithJavac` because the JDK does not support `source release: 21` (see `android/build/reports/problems/problems-report.html`). Install JDK 21 and point `JAVA_HOME`/`org.gradle.java.home` to it, then rerun the command.
