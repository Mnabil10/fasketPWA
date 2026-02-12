Add a visible back button at the top of this screen so users (especially on iOS) can navigate back.

**Requirements:**
- Place a sticky header row at the top: `bg-white px-4 py-4 shadow-sm flex items-center sticky top-0 z-10`.
- Back control: `<Button variant="ghost" size="sm" onClick={goBack} className="p-2 mr-2" aria-label={t("common.back", "Back")}>` with `<ArrowLeft className="w-5 h-5" />` from `lucide-react`.
- Implement `goBack`: either `updateAppState({ currentScreen: "…" })` for in-app screens or `window.history.back()` where appropriate.
- Use the existing translation key `common.back` (already "Back" in en).
- Keep the same visual pattern as HelpScreen, OrderDetailScreen, OrderSuccessScreen, ProductDetailScreen, and LoyaltyHistoryScreen.
