import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Search, TrendingUp, Star } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

/** خدمات الـ API (عدّل المسارات حسب مشروعك) */
import { listCategories, hotOffers } from "../../services/catalog";
import type { Category, Product } from "../../types/api";
import { fmtEGP, fromCents } from "../../lib/money";

interface CategoriesScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function CategoriesScreen({ appState, updateAppState }: CategoriesScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "popular" | "trending">("all");

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // تحميل التصنيفات + العروض (Featured Today = hot-offers)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cats = await listCategories("ar");
        setCategories(cats);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingFeatured(true);
      try {
        const offers = await hotOffers(10, "ar");
        setFeaturedProducts(offers);
      } finally {
        setLoadingFeatured(false);
      }
    })();
  }, []);

  // فلاتر (UI فقط الآن — مفيش flags جاية من الـ API)
  const filters = [
    { id: "all", label: "All Categories" },
    { id: "popular", label: "Popular" },
    { id: "trending", label: "Trending" },
  ] as const;

  // فلترة التصنيفات حسب البحث فقط (لأنه المتاح من الـ API)
  const filteredCategories = useMemo(() => {
    const bySearch = categories.filter((c) =>
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    // لحد ما يبقى فيه أعلام من الـ API، رجّع bySearch نفسه لأي فلتر غير all
    return bySearch;
  }, [categories, searchQuery, selectedFilter]);

  function onOpenCategory(c: Category) {
    updateAppState({
      selectedCategory: c,
      selectedCategoryId: c.id,
      currentScreen: "products",
    });
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "home" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Categories
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

        {/* Filter Tabs (UI فقط الآن) */}
        <div className="flex space-x-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className="rounded-full text-xs"
            >
              {filter.id === "trending" && <TrendingUp className="w-3 h-3 mr-1" />}
              {filter.id === "popular" && <Star className="w-3 h-3 mr-1" />}
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Featured Products Banner = hot-offers */}
        {selectedFilter === "all" && (
          <div className="px-4 py-4">
            <h2 className="font-poppins text-lg text-gray-900 mb-3" style={{ fontWeight: 600 }}>
              Featured Today
            </h2>

            {loadingFeatured ? (
              <div className="text-sm text-gray-500">جارِ التحميل…</div>
            ) : (
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {featuredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="min-w-48 bg-white rounded-xl p-3 shadow-sm relative cursor-pointer"
                    onClick={() =>
                      updateAppState({
                        selectedProduct: product,
                        currentScreen: "product-detail",
                      })
                    }
                  >
                    {/* عرض خصم لو موجود salePriceCents */}
                    {product.salePriceCents && (
                      <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                        {/* نسبة تقديرية (اختياري) */}
                        -
                        {Math.max(
                          0,
                          Math.round(
                            (1 -
                              fromCents(product.salePriceCents) / fromCents(product.priceCents)) *
                              100
                          )
                        )}
                        %
                      </Badge>
                    )}
                    <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-white">
                      {product.imageUrl && (
                        <ImageWithFallback
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 text-sm line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{product.category?.name}</p>
                    <p className="font-poppins text-primary" style={{ fontWeight: 600 }}>
                      {fmtEGP(fromCents(product.salePriceCents ?? product.priceCents))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories Grid */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              Browse Categories
            </h2>
            <span className="text-sm text-gray-500">
              {loading ? "…" : `${filteredCategories.length} categories`}
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">جارِ التحميل…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {filteredCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    onClick={() => onOpenCategory(category)}
                    className={`h-28 rounded-xl bg-gray-100 hover:opacity-80 transition-all duration-200 p-4 relative overflow-hidden`}
                  >
                    <div className="flex flex-col items-center text-center w-full relative z-10">
                      {/* لو فيه imageUrl للكاتيجوري */}
                      {category.imageUrl ? (
                        <div className="w-12 h-12 mb-2 rounded-lg overflow-hidden bg-white">
                          <ImageWithFallback
                            src={category.imageUrl}
                            alt={category.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="text-3xl mb-2">🛒</div>
                      )}
                      <div className="text-sm font-medium text-gray-700 mb-1 line-clamp-2">
                        {category.name}
                      </div>

                      {/* لحد ما تدعم الـ API أعلام popular/trending، نخليها مخفية */}
                      <div className="flex space-x-1 mt-2 opacity-0 pointer-events-none">
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          Trending
                        </Badge>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          Popular
                        </Badge>
                      </div>
                    </div>

                    {/* زخرفة */}
                    <div className="absolute top-0 right-0 w-8 h-8 opacity-10 text-gray-600 text-2xl">🛒</div>
                  </Button>
                ))}
              </div>

              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="font-poppins text-lg text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                    No categories found
                  </h3>
                  <p className="text-gray-600">Try searching with different keywords</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
