import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ArrowLeft, Search, History } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { MobileNav } from "../MobileNav";
import { useToast } from "../providers/ToastProvider";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useCart, useCartGuard, useProducts, useProviders, useSearchHistory, useNetworkStatus, useApiErrorToast } from "../hooks";
import {
  ProductCard,
  ProductCardSkeleton,
  NetworkBanner,
  RetryBlock,
  EmptyState,
} from "../components";
import { goToProduct } from "../navigation/navigation";
import type { Product } from "../../types/api";
import { trackAddToCart } from "../../lib/analytics";
import { extractApiError, mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { resolveQuickAddProduct } from "../utils/productOptions";
import { buildQuickAddMap } from "../utils/quickAdd";

interface SearchScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function SearchScreen({ appState, updateAppState }: SearchScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const cartHook = useCart({ userId: appState.user?.id });
  const cartGuard = useCartGuard(cartHook);
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast("products.error");
  const cartErrorToast = useApiErrorToast("cart.updateError");
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const selectedProvider = appState.selectedProvider ?? null;
  const providerId = selectedProvider?.id ?? appState.selectedProviderId ?? null;
  const providerSelected = Boolean(providerId);
  const providerLabel = selectedProvider
    ? lang === "ar"
      ? selectedProvider.nameAr || selectedProvider.name
      : selectedProvider.name || selectedProvider.nameAr
    : null;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [searchScope, setSearchScope] = useState<"provider" | "all">(providerSelected ? "provider" : "all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { history, addQuery, clearHistory } = useSearchHistory("home");

  const searchProviderId = searchScope === "provider" ? providerId : undefined;
  const showingSearch = debouncedQ.trim().length > 0 && (searchScope === "all" || providerSelected);
  const searchQuery = useProducts(
    { search: debouncedQ || undefined, providerId: searchProviderId },
    { enabled: showingSearch && Boolean(debouncedQ) }
  );

  const products = searchQuery.data?.data ?? [];
  const quickAddMap = useMemo(() => buildQuickAddMap(cartHook.items), [cartHook.items]);

  const goBack = () => updateAppState({ currentScreen: "home" });

  const providersQuery = useProviders();
  const providers = providersQuery.data?.data ?? [];
  const providerMap = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!providerSelected && searchScope === "provider") {
      setSearchScope("all");
    }
  }, [providerSelected, searchScope]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    if (searchScope === "provider" && !providerSelected) {
      showToast({
        type: "info",
        message: t("home.selectProviderPrompt", "Select a provider to browse products."),
      });
      return;
    }
    addQuery(trimmed);
  };

  const handleHistoryItemClick = (item: string) => {
    setQ(item);
    addQuery(item);
    searchInputRef.current?.focus();
  };

  const handleAddToCart = async (product: Product) => {
    try {
      const resolved = await resolveQuickAddProduct(product, lang, !cartHook.isOffline);
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
      const productName =
        lang === "ar"
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
      await handleAddToCart(product);
      return;
    }
    try {
      await cartHook.updateQuantity({ itemId: quick.itemId, productId: product.id, qty: quick.qty + 1 });
    } catch (error) {
      cartErrorToast(error, "cart.updateError");
    }
  };

  const handleQuickDecrease = async (product: Product) => {
    const quick = quickAddMap.get(product.id);
    if (!quick) return;
    try {
      if (quick.qty <= 1) {
        await cartHook.removeItem({ itemId: quick.itemId, productId: product.id });
        return;
      }
      await cartHook.updateQuantity({ itemId: quick.itemId, productId: product.id, qty: quick.qty - 1 });
    } catch (error) {
      cartErrorToast(error, "cart.updateError");
    }
  };

  const resolveProviderNameFromMap = (pProviderId?: string | null) => {
    if (!pProviderId) return null;
    const provider = providerMap.get(pProviderId);
    if (!provider) return null;
    return lang === "ar" ? provider.nameAr || provider.name : provider.name || provider.nameAr;
  };

  const searchPlaceholder =
    searchScope === "all"
      ? t("home.searchPlaceholderGlobal", "Search across providers")
      : providerSelected
        ? t("home.searchPlaceholder")
        : t("home.searchProviderPlaceholder", "Select a provider to start searching");

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="bg-white px-4 py-4 shadow-sm flex items-center gap-2 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="p-2 shrink-0"
          aria-label={t("common.back", "Back")}
        >
          <ArrowLeft className={`w-5 h-5 ${i18n.dir() === "rtl" ? "rotate-180" : ""}`} />
        </Button>
        <form className="flex-1 relative" onSubmit={handleSearchSubmit}>
          <Search
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${
              i18n.dir() === "rtl" ? "right-4" : "left-4"
            }`}
          />
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            disabled={searchScope === "provider" && !providerSelected}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`h-12 cupertino-search-input rounded-2xl bg-gray-50 border border-gray-200 shadow-inner ${
              i18n.dir() === "rtl" ? "pr-12 text-right" : "pl-12"
            }`}
          />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 px-4 pb-6">
        {!showingSearch ? (
          <div className="section-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <History className="w-4 h-4 text-gray-500" />
                {t("products.recentSearches", "Recent searches")}
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearHistory()}
                  className="text-sm text-primary hover:underline"
                >
                  {t("products.clearHistory", "Clear")}
                </button>
              )}
            </div>
            {history.length > 0 ? (
              <div className="space-y-1">
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleHistoryItemClick(item)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 font-medium transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                {t("search.noRecentSearches", "No recent searches. Start typing above.")}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-gray-600">{t("home.searchScopeLabel", "Search scope")}</span>
              <div className="cupertino-segmented inline-flex">
                <button
                  type="button"
                  data-active={searchScope === "provider"}
                  disabled={!providerSelected}
                  onClick={() => setSearchScope("provider")}
                >
                  {providerSelected
                    ? t("home.searchScope.provider", {
                        provider: providerLabel ?? t("home.providersTitle", "Provider"),
                      })
                    : t("home.searchScope.providerFallback", "Within provider")}
                </button>
                <button
                  type="button"
                  data-active={searchScope === "all"}
                  onClick={() => setSearchScope("all")}
                >
                  {t("home.searchScope.all", "All providers")}
                </button>
              </div>
            </div>

            <div className="section-card space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {t("home.sections.searchResults", "Search results")}
                </h2>
              </div>
              {searchQuery.isError ? (
                <RetryBlock
                  message={mapApiErrorToMessage(searchQuery.error, "products.error")}
                  onRetry={() => searchQuery.refetch()}
                />
              ) : searchQuery.isLoading ? (
                <div className="premium-grid">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <ProductCardSkeleton key={idx} imageVariant="compact" />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="premium-grid">
                  {products.map((p) => {
                    const quick = quickAddMap.get(p.id) ?? null;
                    const providerName =
                      searchScope === "all" ? resolveProviderNameFromMap(p.providerId) : null;
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        imageVariant="compact"
                        adding={cartHook.addingProductId === p.id}
                        disabled={isOffline}
                        onAddToCart={handleAddToCart}
                        quantity={quick?.qty ?? 0}
                        onIncrease={() => handleQuickIncrease(p)}
                        onDecrease={() => handleQuickDecrease(p)}
                        metaLabel={providerName || undefined}
                        onPress={(product) => {
                          if (searchScope === "all" && product.providerId) {
                            const provider = providerMap.get(product.providerId);
                            updateAppState({
                              selectedProvider: provider ?? null,
                              selectedProviderId: product.providerId,
                            });
                          }
                          goToProduct(product.slug || product.id, updateAppState, { product });
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title={t("home.emptySearchTitle")}
                  subtitle={t("home.emptySearchSubtitle")}
                  onAction={() => updateAppState({ currentScreen: "categories" })}
                  actionLabel={t("home.promotionsCta")}
                />
              )}
            </div>
          </>
        )}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
      {cartGuard.dialog}
    </div>
  );
}
