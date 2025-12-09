# Ionic + Figma UI Unification Notes

This pack helps your Ionic React app look like the React app exported from Figma.
Steps:

1) Install deps:
   npm i -D tailwindcss postcss autoprefixer
   npm i clsx lucide-react

2) Add `postcss.config.cjs` and `tailwind.config.ts` to the project root.

3) Replace/merge `src/index.css` (Tailwind directives) and `src/theme/variables.css` (Ionic tokens).

4) Ensure `App.tsx` renders your new root (e.g., CustomerApp) under <IonContent/>.

5) Import your Figma-based `ui/*` and `customer/*` folders into `src/`.
   If you used the comparison helper, unzip `files_to_add.zip` inside `src`.

6) Fonts: Include your Figma font (e.g., Poppins) in index.html:
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous">
   <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

7) If routes are inside CustomerApp, keep Ionic Router thin, or route directly within CustomerApp.
