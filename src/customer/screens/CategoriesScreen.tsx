import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Search, TrendingUp, Star, History, Sparkles, Clock, MessageCircle, Store } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useToast } from "../providers/ToastProvider";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { NetworkBanner, ProductCard, ProductCardSkeleton, EmptyState, RetryBlock } from "../components";
import { useCategories, useProducts, useSearchHistory, useCart, useCartGuard, useApiErrorToast } from "../hooks";
import type { Category, Product } from "../../types/api";
import { goToCategory, goToHome, goToProduct } from "../navigation/navigation";
import { trackAddToCart } from "../../lib/analytics";
import { extractApiError, mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { resolveQuickAddProduct } from "../utils/productOptions";
import { buildQuickAddMap } from "../utils/quickAdd";

interface CategoriesScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function CategoriesScreen({ appState, updateAppState }: CategoriesScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const apiErrorToast = useApiErrorToast("products.error");
  const cartErrorToast = useApiErrorToast("cart.updateError");
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "popular" | "trending">("all");
  const { history, addQuery, clearHistory } = useSearchHistory("categories");
  const cart = useCart({ userId: appState.user?.id });
  const cartGuard = useCartGuard(cart);
  const selectedProvider = appState.selectedProvider ?? null;
  const providerId = selectedProvider?.id ?? null;
  const providerLabel = selectedProvider
    ? lang === "ar"
      ? selectedProvider.nameAr || selectedProvider.name
      : selectedProvider.name || selectedProvider.nameAr
    : null;
  const isRTL = i18n.dir() === "rtl";
  const providerDisplayName = providerLabel || t("providers.providerFallback", "Provider");
  const providerDescription = useMemo(() => {
    const raw = lang === "ar"
      ? (selectedProvider as any)?.descriptionAr ?? (selectedProvider as any)?.description
      : (selectedProvider as any)?.description ?? (selectedProvider as any)?.descriptionAr;
    return raw || t("providers.taglineDefault", "Fresh groceries delivered to your door.");
  }, [lang, selectedProvider, t]);
  const providerEta =
    (selectedProvider as any)?.deliveryEtaMinutes ??
    (selectedProvider as any)?.etaMinutes ??
    null;
  const etaMinutes =
    providerEta ??
    appState.settings?.delivery?.defaultEtaMinutes ??
    appState.settings?.delivery?.minEtaMinutes ??
    null;
  const etaValueLabel = etaMinutes
    ? `${etaMinutes} ${t("checkout.summary.minutes", "min")}`
    : null;
  const etaLabel = providerEta
    ? t("providers.etaValue", { value: etaValueLabel ?? "" })
    : etaValueLabel
      ? t("providers.etaTypical", { value: etaValueLabel })
      : t("providers.etaFallback", "Estimated delivery shown at checkout.");
  const providerBadges = useMemo(() => {
    const badges: Array<{ key: string; label: string; variant: "secondary" | "outline" }> = [];
    if (selectedProvider?.supportsInstant) {
      badges.push({
        key: "instant",
        label: t("providers.badges.instant", "Fast delivery today"),
        variant: "secondary",
      });
    }
    if (selectedProvider?.supportsPreorder) {
      badges.push({
        key: "preorder",
        label: t("providers.badges.preorder", "Delivery tomorrow morning"),
        variant: "outline",
      });
    }
    return badges;
  }, [selectedProvider, t]);
  const bestSectionRef = useRef<HTMLDivElement | null>(null);
  const offersSectionRef = useRef<HTMLDivElement | null>(null);
  const categoriesSectionRef = useRef<HTMLDivElement | null>(null);

  const categoriesQuery = useCategories({ providerId }, { enabled: Boolean(providerId) });
  const bestQuery = useProducts({ type: "best-selling", limit: 6, providerId }, { enabled: Boolean(providerId) });
  const featuredQuery = useProducts({ type: "hot-offers", limit: 6, providerId }, { enabled: Boolean(providerId) });
  const categories = categoriesQuery.data?.data ?? [];
  const categoriesStale = categoriesQuery.data?.stale ?? false;
  const bestProducts = bestQuery.data?.data ?? [];
  const bestStale = bestQuery.data?.stale ?? false;
  const featuredProducts = featuredQuery.data?.data ?? [];
  const featuredStale = featuredQuery.data?.stale ?? false;
  const staleData = categoriesStale || featuredStale || bestStale;
  const quickAddMap = useMemo(() => buildQuickAddMap(cart.items), [cart.items]);
  const featuredError = mapApiErrorToMessage(featuredQuery.error, "categories.errorOffers");
  const bestError = mapApiErrorToMessage(bestQuery.error, "categories.errorBest");
  const categoriesErrorMessage = mapApiErrorToMessage(categoriesQuery.error, "categories.errorLoading");

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const data = categories ?? [];
    const bySearch = q ? data.filter((c) => (c.name || "").toLowerCase().includes(q)) : data;
    if (selectedFilter === "all") return bySearch;
    // We don't have popularity flags; keep same list but tag for UI consistency.
    return bySearch;
  }, [categories, searchQuery, selectedFilter]);

  const onOpenCategory = (c: Category) => {
    goToCategory(c.slug, updateAppState, { category: c, categoryId: c.id });
  };

  const handleAddProduct = async (product: Product) => {
    try {
      const resolved = await resolveQuickAddProduct(product, lang, !cart.isOffline);
      if (resolved.requiresOptions) {
        goToProduct(resolved.product.slug || resolved.product.id, updateAppState, { product: resolved.product });
        return;
      }
      const added = await cartGuard.requestAdd(resolved.product, 1, undefined, () => {
        trackAddToCart(resolved.product.id, 1);
        showToast({ type: "success", message: t("products.buttons.added") });
      }, { nextProviderLabel: providerLabel });
      if (!added) return;
    } catch (error: any) {
      const { code } = extractApiError(error);
      const productName = lang === "ar"
        ? product.nameAr || product.name || t("product.title", "Product")
        : product.name || product.nameAr || t("product.title", "Product");
      if (code === "CART_PRODUCT_OUT_OF_STOCK") {
        showToast({
          type: "error",
          message: t("errors.cartProductOutOfStockNamed", {
            product: productName,
            defaultValue: `${productName} is out of stock right now.`,
          }),
        });
        return;
      }
      if (code === "CART_PRODUCT_UNAVAILABLE") {
        showToast({
          type: "error",
          message: t("errors.cartProductUnavailableNamed", {
            product: productName,
            defaultValue: `${productName} is currently unavailable.`,
          }),
        });
        return;
      }
      apiErrorToast(error, "products.error");
    }
  };

  const handleQuickIncrease = async (product: Product) => {
    const quick = quickAddMap.get(product.id);
    if (!quick) {
      await handleAddProduct(product);
      return;
    }
    try {
      await cart.updateQuantity({ itemId: quick.itemId, productId: product.id, qty: quick.qty + 1 });
    } catch (error) {
      cartErrorToast(error, "cart.updateError");
    }
  };

  const handleQuickDecrease = async (product: Product) => {
    const quick = quickAddMap.get(product.id);
    if (!quick) return;
    try {
      if (quick.qty <= 1) {
        await cart.removeItem({ itemId: quick.itemId, productId: product.id });
        return;
      }
      await cart.updateQuantity({ itemId: quick.itemId, productId: product.id, qty: quick.qty - 1 });
    } catch (error) {
      cartErrorToast(error, "cart.updateError");
    }
  };

  const sectionTabs = [
    { id: "best", label: t("categories.sections.best", "Most requested"), ref: bestSectionRef },
    { id: "offers", label: t("categories.sections.offers", "Today's offers"), ref: offersSectionRef },
    { id: "categories", label: t("categories.sections.categories", "Categories"), ref: categoriesSectionRef },
  ];

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!providerId) {
    return (
      <div className="page-shell">
        <NetworkBanner />
        <div className="section-card">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToHome(updateAppState)}
              className="p-2 mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("categories.title")}
            </h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <EmptyState
            title={t("providers.selectTitle", "Choose a provider")}
            subtitle={t("providers.selectSubtitle", "Select a provider to browse categories.")}
            actionLabel={t("providers.selectAction", "Browse providers")}
            onAction={() => goToHome(updateAppState)}
          />
        </div>
        <MobileNav appState={appState} updateAppState={updateAppState} />
        {cartGuard.dialog}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <NetworkBanner stale={staleData} />
      <div className="section-card">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToHome(updateAppState)}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("categories.title")}
            </h1>
            {providerDisplayName && (
              <p className="text-xs text-gray-500">{providerDisplayName}</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-card mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                {selectedProvider?.logoUrl ? (
                  <ImageWithFallback
                    src={selectedProvider.logoUrl}
                    alt={providerDisplayName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-gray-900 line-clamp-1">{providerDisplayName}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{providerDescription}</p>
                <div className={`flex items-center gap-2 text-xs text-gray-600 mt-2 ${isRTL ? "justify-end" : ""}`}>
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{etaLabel}</span>
                </div>
                {providerBadges.length > 0 && (
                  <div className={`mt-2 flex flex-wrap gap-1 ${isRTL ? "justify-end" : ""}`}>
                    {providerBadges.map((badge) => (
                      <Badge
                        key={badge.key}
                        variant={badge.variant}
                        className="text-[10px] rounded-full px-2 py-1 leading-tight whitespace-normal break-words max-w-full overflow-visible"
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-3 whitespace-nowrap w-full sm:w-auto self-stretch sm:self-auto"
              onClick={() => updateAppState({ currentScreen: "help" })}
            >
              <MessageCircle className={`w-4 h-4 ${isRTL ? "ml-1" : "mr-1"}`} />
              {t("providers.contactPolicies", "Support & policies")}
            </Button>
          </div>
        </div>

        <div className="relative mb-2">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? "left-auto right-3" : ""}`} />
          <Input
            placeholder={t("categories.searchPlaceholder")}
            value={searchQuery}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 100)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? "pr-10 text-right" : "pl-10"} h-12 rounded-xl`}
          />
          {showHistory && history.length > 0 && (
            <div className="absolute z-10 mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border max-h-48 overflow-auto">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3" /> {t("products.recentSearches", "Recent searches")}
                </span>
                <button className="text-primary" type="button" onClick={() => clearHistory()}>
                  {t("products.clearHistory", "Clear")}
                </button>
              </div>
              {history.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchQuery(item);
                    addQuery(item);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: t("categories.filters.all") },
            { id: "popular", label: t("categories.filters.popular") },
            { id: "trending", label: t("categories.filters.trending") },
          ].map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id as typeof selectedFilter)}
              className="rounded-full px-4"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto px-4 py-2">
            {sectionTabs.map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant="outline"
                className="rounded-full px-4 whitespace-nowrap"
                onClick={() => scrollToSection(tab.ref)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div ref={bestSectionRef} className="px-4 py-4 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              {t("categories.bestTitle", "Most requested")}
            </h2>
            {bestQuery.isLoading && <span className="text-xs text-gray-500">{t("common.loading")}</span>}
          </div>
          {bestQuery.isError && (
            <RetryBlock message={bestError} onRetry={() => bestQuery.refetch()} />
          )}
          {bestQuery.isLoading ? (
            <div className="premium-grid">
              {Array.from({ length: 2 }).map((_, i) => (
                <ProductCardSkeleton key={i} imageVariant="compact" />
              ))}
            </div>
          ) : bestProducts.length > 0 ? (
            <div className="premium-grid">
              {bestProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  imageVariant="compact"
                  adding={cart.addingProductId === product.id}
                  disabled={cart.isOffline}
                  onAddToCart={handleAddProduct}
                  quantity={quickAddMap.get(product.id)?.qty ?? 0}
                  onIncrease={() => handleQuickIncrease(product)}
                  onDecrease={() => handleQuickDecrease(product)}
                  onPress={() => goToProduct(product.slug || product.id, updateAppState, { product })}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t("categories.bestEmpty", "Best sellers will appear here.")}</p>
          )}
        </div>

        <div ref={offersSectionRef} className="px-4 py-4 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              {t("categories.featuredTitle")}
            </h2>
            {featuredQuery.isLoading && <span className="text-xs text-gray-500">{t("common.loading")}</span>}
          </div>
          {featuredQuery.isError && (
            <RetryBlock message={featuredError} onRetry={() => featuredQuery.refetch()} />
          )}
          {featuredQuery.isLoading ? (
            <div className="premium-grid">
              {Array.from({ length: 2 }).map((_, i) => (
                <ProductCardSkeleton key={i} imageVariant="compact" />
              ))}
            </div>
          ) : (
            featuredProducts.length > 0 && (
              <div className="premium-grid">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    imageVariant="compact"
                    adding={cart.addingProductId === product.id}
                    disabled={cart.isOffline}
                    onAddToCart={handleAddProduct}
                    quantity={quickAddMap.get(product.id)?.qty ?? 0}
                    onIncrease={() => handleQuickIncrease(product)}
                    onDecrease={() => handleQuickDecrease(product)}
                    onPress={() => goToProduct(product.slug || product.id, updateAppState, { product })}
                  />
                ))}
              </div>
            )
          )}
        </div>

        <div ref={categoriesSectionRef} className="px-4 py-4 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              {t("categories.browseTitle")}
            </h2>
            <span className="text-sm text-gray-500">
              {categoriesQuery.isLoading
                ? t("common.loading")
                : t("categories.countLabel", { count: filteredCategories.length })}
            </span>
          </div>

          {categoriesQuery.isError && (
            <RetryBlock message={categoriesErrorMessage} onRetry={() => categoriesQuery.refetch()} />
          )}

          {categoriesQuery.isLoading ? (
            <div className="premium-grid">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-24 bg-white rounded-xl shadow-sm skeleton-soft" />
              ))}
            </div>
          ) : (
            <>
              <div className="premium-grid">
                {filteredCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    onClick={() => onOpenCategory(category)}
                    className="h-28 rounded-xl bg-white hover:opacity-80 transition-all duration-200 p-4 relative overflow-hidden shadow-sm"
                  >
                    <div className="flex flex-col items-center text-center w-full relative z-10">
                      {category.imageUrl ? (
                        <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden bg-white">
                          <ImageWithFallback
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <Sparkles className="w-5 h-5 text-primary mb-2" />
                      )}
                      <div className="text-sm font-medium text-gray-700 mb-1 line-clamp-2">
                        {category.name}
                      </div>
                      <div className="flex space-x-1 mt-2">
                        {selectedFilter === "trending" && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {t("categories.filters.trending")}
                          </Badge>
                        )}
                        {selectedFilter === "popular" && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            <Star className="w-3 h-3 mr-1" />
                            {t("categories.filters.popular")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              {filteredCategories.length === 0 && (
                <EmptyState
                  icon={<Search className="w-10 h-10 text-gray-500" />}
                  title={t("categories.emptyTitle")}
                  subtitle={t("categories.emptySubtitle")}
                />
              )}
            </>
          )}
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
      {cartGuard.dialog}
    </div>
  );
}
