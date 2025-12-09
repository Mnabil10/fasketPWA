# Fasket App Redesign Notes

## Design System
- Colors: `primary #E53935`, `primaryDark #C62828`, `accent #FF857A`, `bg #FFFFFF`, `surface #FAFAFA`, `muted #757575`, `dark #1A1A1A`, `border rgba(0,0,0,0.08)`.
- Typography: Manrope for English, Cairo for Arabic; Display 28/34 bold, Heading 20/26 bold, Body 16/24 medium, Small 13/18 medium. Price text uses tabular numbers.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32. Radius: 12–20px with soft, rounded buttons/cards. Shadows: soft `0 14px 40px rgba(15,23,42,0.08)`; inner skeleton shimmer for loaders.
- Motion: Subtle fade/slide/pop (`var(--motion-distance)=12px`, `320ms`, `easeOutQuart` cubic-bezier 0.25,0.8,0.4,1). Disabled for `prefers-reduced-motion`.
- Breakpoints: 360 (small phone), 390 (medium phone), 412 (large phone), 768 (tablet), 1024 (desktop). Grids use `repeat(auto-fit,minmax(160px,1fr))` for 2-up on phones, 3-up on tablets.

## Component Patterns
- Premium Product Card: 3/4 image ratio with cover fit, 12px radius image, 16px padded body, 2-line title clamp, aligned price/strike-through, stock badge, stable 40px CTA, hover/tap scale. Skeletons use soft shimmer.
- Home: Gradient hero with greeting, service promises, search with history, loyalty tile, promo banners, horizontal category slider, premium grids for curated/best/hot sections.
- Products & Categories: Pull-to-refresh, responsive premium grid, soft skeletons, pill filters, list/grid toggle retained.
- Product Detail: Large 3/4 hero image, gradient surface, price + discount badges, ETA pill, elevated quantity selector, sticky bottom CTA with total.
- Cart: Modern item cards with rounded borders, inline quantity controls, ETA/info pill in summary, clearer totals.
- Checkout: Step rail (Cart > Address > Summary > Confirm), refreshed address/item cards, loyalty/coupon blocks, trust copy for delivery/WhatsApp support, ETA shown in summary.
- About Fasket: Gradient hero, coverage/working-hours/service info tiles, feature cards, refreshed contact + WhatsApp/landing/share CTAs.

