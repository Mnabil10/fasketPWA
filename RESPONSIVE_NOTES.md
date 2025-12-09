# Responsive Notes

- Updated the shared `page-shell` wrapper to cap content width, respect safe areas, and scale padding on small screens to prevent cut-off content on tall/wide devices.
- Refined `ProductCard` image ratio (3:4), text clamping, price alignment, and button layout so cards flex in height without overflow in grid or list views; aligned skeletons to match.
- Reworked product grids (home, categories, products, detail recommendations, order success) with responsive column counts and tighter gaps for small screens; removed virtualized product list in favor of natural flow to avoid clipped rows.
- Added safe-area padding to the product detail bottom CTA and increased scroll padding so the button stays visible on devices like Samsung A52s.

## Breakpoints sanity-checked
- iPhone 13/14 portrait + landscape (390×844-ish)
- Samsung A52s portrait + landscape (≈412×915 / 1080×2400)
- Small Android 360×800
- RTL + LTR for product grids/cards, product detail CTA, and cart/checkout summaries

## Remaining notes
- Extremely long localized strings are clamped but may still need copy review.
- Run through checkout with the software keyboard open on very short screens to confirm the OS chrome does not obscure final buttons.
