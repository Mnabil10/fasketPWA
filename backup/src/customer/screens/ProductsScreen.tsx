// src/customer/screens/ProductsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  ArrowLeft,
  Search,
  Filter,
  SlidersHorizontal,
  Grid,
  List,
  Star,
} from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { listProducts } from "../../services/catalog"; // ← يستخدم GET /products

interface ProductsScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  priceCents: number;
  salePriceCents?: number | null;
  stock: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  category?: { id: string; name: string; slug: string };
  // لو عندك totalSold هينفع للـ popularity
  totalSold?: number;
};

export function ProductsScreen({ appState, updateAppState }: ProductsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "popularity" | "price-low" | "price-high" | "rating" | "name"
  >("popularity");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // احسب الـ lang من حالة التطبيق لو موجودة (بدّلها حسب مشروعك)
  const lang = (appState as any)?.lang === "ar" ? "ar" : "en";

  useEffect(() => {
    let killed = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const q = searchQuery.trim() || undefined;
        const categoryId = appState.selectedCategory?.id as string | undefined;
        const data: ApiProduct[] = await listProducts({ q, categoryId, lang });
        if (!killed) setItems(data);
      } catch (e: any) {
        if (!killed)
          setErr(
            e?.response?.data?.message ||
              e?.message ||
              "Failed to load products"
          );
      } finally {
        if (!killed) setLoading(false);
      }
    }
    // debounce بسيط للبحث
    const t = setTimeout(load, 250);
    return () => {
      killed = true;
      clearTimeout(t);
    };
  }, [searchQuery, appState.selectedCategory?.id, lang]);

  // util: عرض السعر بالجنيه (القيم من السيرفر بـ cents)
  function moneyEGP(cents?: number | null) {
    const v = typeof cents === "number" ? cents / 100 : 0;
    return `EGP ${v.toFixed(2)}`;
  }

  function effectivePriceCents(p: ApiProduct) {
    return (p.salePriceCents ?? p.priceCents) || p.priceCents;
  }

  function inStock(p: ApiProduct) {
    return p.status === "ACTIVE" && p.stock > 0;
  }

  const filtered = useMemo(() => {
    // السيرفر بالفعل بيرجّع حسب q, categoryId
    // بس نفلتر محليًا لو حبيت (خاصة للـ view بدون طلب جديد)
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.name || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "price-low":
        return arr.sort(
          (a, b) => effectivePriceCents(a) - effectivePriceCents(b)
        );
      case "price-high":
        return arr.sort(
          (a, b) => effectivePriceCents(b) - effectivePriceCents(a)
        );
      case "rating":
        // مفيش rating من الـ API؛ نخليه ثابت 4.5 عشان الواجهة
        return arr;
      case "name":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "popularity":
      default:
        return arr.sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0));
    }
  }, [filtered, sortBy]);

  const addToCart = (product: ApiProduct) => {
    const id = product.id as any;
    const price = effectivePriceCents(product) / 100;
    const existing = appState.cart.find((i) => i.id === id);
    const cartItem = {
      id,
      name: product.name,
      price,
      image: product.imageUrl,
      category: product.category?.name || "",
    };
    if (existing) {
      updateAppState({
        cart: appState.cart.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      updateAppState({
        cart: [...appState.cart, { ...cartItem, quantity: 1 }],
      });
    }
  };

  const renderProductCard = (p: ApiProduct) => {
    const priceC = effectivePriceCents(p);
    const hasDiscount =
      typeof p.salePriceCents === "number" &&
      p.salePriceCents! < p.priceCents;
    const price = moneyEGP(priceC);
    const original = hasDiscount ? moneyEGP(p.priceCents) : null;

    if (viewMode === "list") {
      return (
        <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden relative">
              <ImageWithFallback
                src={p.imageUrl || ""}
                alt={p.name}
                className="w-full h-full object-cover"
              />
              {hasDiscount && (
                <Badge
                  variant="destructive"
                  className="absolute top-1 right-1 text-xs px-1 py-0"
                >
                  SALE
                </Badge>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">{p.name}</h3>
              <p className="text-xs text-gray-500 mb-2">
                {p.category?.name || ""}
              </p>
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="text-xs text-gray-600">4.5</span>
                </div>
                {!inStock(p) && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Out of Stock
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="font-poppins text-lg text-primary"
                    style={{ fontWeight: 600 }}
                  >
                    {price}
                  </span>
                  {original && (
                    <span className="text-sm text-gray-500 line-through">
                      {original}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => addToCart(p)}
                  disabled={!inStock(p)}
                  className="h-8 px-3"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={p.id}
        className="bg-white rounded-xl p-3 shadow-sm cursor-pointer"
        onClick={() =>
          updateAppState({ selectedProduct: mapToUiProduct(p), currentScreen: "product-detail" })
        }
      >
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3">
          <ImageWithFallback
            src={p.imageUrl || ""}
            alt={p.name}
            className="w-full h-full object-cover"
          />
          {hasDiscount && (
            <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
              SALE
            </Badge>
          )}
          {!inStock(p) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
        </div>
        <h3 className="font-medium text-gray-900 mb-1 text-sm">{p.name}</h3>
        <p className="text-xs text-gray-500 mb-2">{p.category?.name || ""}</p>
        <div className="flex items-center mb-2">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
          <span className="text-xs text-gray-600">4.5</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className="font-poppins text-primary"
              style={{ fontWeight: 600 }}
            >
              {price}
            </span>
            {original && (
              <span className="text-xs text-gray-500 line-through">
                {original}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(p);
            }}
            disabled={!inStock(p)}
            className="h-7 px-2 text-xs"
          >
            Add
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "categories" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {appState.selectedCategory?.name || "All Products"}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder={lang === "ar" ? "ابحث عن المنتجات..." : "Search products..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as typeof sortBy)
              }
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="popularity">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {loading ? "Loading…" : `${sorted.length} items`}
            </span>
            <div className="flex border border-gray-200 rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="p-2 rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="p-2 rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center space-x-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer">
              In Stock
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              On Sale
            </Badge>
          </div>
        </div>
      )}

      {/* Products Grid/List */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          {err && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">
              {err}
            </div>
          )}

          {!loading && sorted.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3
                className="font-poppins text-lg text-gray-900 mb-2"
                style={{ fontWeight: 600 }}
              >
                No products found
              </h3>
              <p className="text-gray-600">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-0"
              }
            >
              {sorted.map(renderProductCard)}
            </div>
          )}
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}

/** يحوّل الـ ApiProduct لشكل الشاشة الداخلية للـ ProductDetail */
function mapToUiProduct(p: ApiProduct) {
  const price = ((p.salePriceCents ?? p.priceCents) || p.priceCents) / 100;
  const originalPrice =
    typeof p.salePriceCents === "number" && p.salePriceCents < p.priceCents
      ? p.priceCents / 100
      : undefined;
  return {
    id: p.id,
    name: p.name,
    price,
    originalPrice,
    image: p.imageUrl,
    category: p.category?.name || "",
    rating: 4.5, // مفيش من الـ API – للواجهة فقط
  };
}
