import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Search, TrendingUp, Star, History, Sparkles } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useToast } from "../providers/ToastProvider";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { NetworkBanner, ProductCard, ProductCardSkeleton, EmptyState, RetryBlock } from "../components";
import { useCategories, useProducts, useSearchHistory, useCart, useApiErrorToast } from "../hooks";
import type { Category, Product } from "../../types/api";
import { goToCategory, goToHome, goToProduct } from "../navigation/navigation";
import { trackAddToCart } from "../../lib/analytics";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";

interface CategoriesScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function CategoriesScreen({ appState, updateAppState }: CategoriesScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const apiErrorToast = useApiErrorToast("products.error");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "popular" | "trending">("all");
  const { history, addQuery, clearHistory } = useSearchHistory("categories");
  const cart = useCart({ userId: appState.user?.id });
  const selectedProvider = appState.selectedProvider ?? null;
  const providerId = selectedProvider?.id ?? null;

  const categoriesQuery = useCategories({ providerId }, { enabled: Boolean(providerId) });
  const featuredQuery = useProducts({ type: "hot-offers", limit: 6, providerId }, { enabled: Boolean(providerId) });
  const categories = categoriesQuery.data?.data ?? [];
  const categoriesStale = categoriesQuery.data?.stale ?? false;
  const featuredProducts = featuredQuery.data?.data ?? [];
  const featuredStale = featuredQuery.data?.stale ?? false;
  const staleData = categoriesStale || featuredStale;
  const featuredError = mapApiErrorToMessage(featuredQuery.error, "categories.errorOffers");
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
      await cart.addProduct(product);
      trackAddToCart(product.id, 1);
      showToast({ type: "success", message: t("products.buttons.added") });
    } catch (error: any) {
      apiErrorToast(error, "products.error");
    }
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
            {selectedProvider?.name && (
              <p className="text-xs text-gray-500">{selectedProvider.name}</p>
            )}
          </div>
        </div>

        <div className="relative mb-2">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${i18n.dir() === "rtl" ? "left-auto right-3" : ""}`} />
          <Input
            placeholder={t("categories.searchPlaceholder")}
            value={searchQuery}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 100)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${i18n.dir() === "rtl" ? "pr-10 text-right" : "pl-10"} h-12 rounded-xl`}
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
        <div className="px-4 py-4">
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
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            featuredProducts.length > 0 && (
              <div className="premium-grid">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    adding={cart.addingProductId === product.id}
                    disabled={cart.isOffline}
                    onAddToCart={handleAddProduct}
                    onPress={() => goToProduct(product.slug || product.id, updateAppState, { product })}
                  />
                ))}
              </div>
            )
          )}
        </div>

        <div className="px-4 py-4">
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
    </div>
  );
}
