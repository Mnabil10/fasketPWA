import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Search, ShoppingCart, Bell } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

/** ↓↓↓ Services & helpers (عدّل المسارات لو مشروعك مختلف) */
import { listCategories, bestSelling, hotOffers, listProducts } from "../../services/catalog";
import { addItem, getCart } from "../../services/cart";
import { fmtEGP, fromCents } from "../../lib/money";
import type { Category, Product } from "../../types/api";

interface HomeScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

type UiCartItem = { id: string; name: string; price: number; image?: string; quantity: number; productId: string };

/** نحول شكل الـ cart من السيرفر لشكل مبسط في AppState */
function mapServerCartToUiItems(server: { items: any[] } | null): UiCartItem[] {
  if (!server?.items) return [];
  return server.items.map((it) => ({
    id: it.id,
    productId: it.productId,
    name: it.product?.name ?? "",
    image: it.product?.imageUrl ?? undefined,
    price: fromCents(it.priceCents),
    quantity: it.qty,
  }));
}

export function HomeScreen({ appState, updateAppState }: HomeScreenProps) {
  // ---- UI state ----
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [best, setBest] = useState<Product[]>([]);
  const [hot, setHot] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);

  // ---- promo banners (ممكن تيجي من API مستقبلًا) ----
  const promos = useMemo(
    () => [
      {
        id: 1,
        title: "خصومات على الفواكه 30%",
        subtitle: "أفضل جودة",
        image:
          "https://images.unsplash.com/photo-1705727209465-b292e4129a37?auto=format&fit=crop&w=1080&q=80",
      },
      {
        id: 2,
        title: "توصيل مجاني اليوم",
        subtitle: "للطلبات فوق 800 جنيه",
        image:
          "https://images.unsplash.com/photo-1665521032636-e8d2f6927053?auto=format&fit=crop&w=1080&q=80",
      },
    ],
    []
  );

  // ---- initial load ----
  useEffect(() => {
    (async () => {
      try {
        const [c, b, h, serverCart] = await Promise.all([
          listCategories("ar"),
          bestSelling(10, "ar"),
          hotOffers(10, "ar"),
          getCart().catch(() => null), // في حال لسه مش لوجين
        ]);
        setCategories(c);
        setBest(b);
        setHot(h);

        // حدّث عدّاد السلة في AppState (لو بتستخدمه في الهيدر)
        if (serverCart) {
          updateAppState({
            cart: mapServerCartToUiItems(serverCart),
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- search ----
  async function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const items = await listProducts(q || undefined, undefined, undefined, undefined, "ar");
      setResults(items);
    } finally {
      setSearching(false);
    }
  }

  // ---- add to cart via API ----
  async function addToCart(product: Product) {
    try {
      await addItem({ productId: product.id, qty: 1 });
      const serverCart = await getCart();
      updateAppState({
        cart: mapServerCartToUiItems(serverCart),
      });
    } catch (e) {
      // TODO: اعرض Toast أو تنبيه خطأ
      console.error(e);
    }
  }

  // ---- UI helpers ----
  function priceDisplay(p: Product) {
    const sell = fromCents(p.salePriceCents ?? p.priceCents);
    const base = fromCents(p.priceCents);
    return (
      <div className="flex items-center gap-2">
        <span className="font-poppins text-lg text-primary" style={{ fontWeight: 600 }}>
          {fmtEGP(sell)}
        </span>
        {p.salePriceCents ? (
          <span className="text-xs text-gray-500 line-through">{fmtEGP(base)}</span>
        ) : null}
      </div>
    );
  }

  const cartCount = appState.cart?.length ?? 0;
  const showingSearch = q.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 700 }}>
              أهلاً، {appState.user?.name || "ضيف"}!
            </h1>
            <p className="text-gray-600">هنجيب لك إيه النهارده؟</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAppState({ currentScreen: "cart" })}
              className="p-2 relative"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <form className="relative" onSubmit={onSearchSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="ابحث عن المنتجات…"
            className="pl-10 h-12 rounded-xl"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {/* optional search button for mobile keyboards */}
          <button type="submit" className="hidden" />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Promo Banners */}
        {!showingSearch && (
          <div className="px-4 py-4">
            <div className="flex space-x-4 overflow-x-auto">
              {promos.map((promo) => (
                <div
                  key={promo.id}
                  className="min-w-80 bg-primary rounded-xl p-4 text-white relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <h3 className="font-poppins text-lg mb-1" style={{ fontWeight: 700 }}>
                      {promo.title}
                    </h3>
                    <p className="text-white/90">{promo.subtitle}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => updateAppState({ currentScreen: "categories" })}
                    >
                      تسوّق الآن
                    </Button>
                  </div>
                  <div className="absolute right-0 top-0 w-32 h-full opacity-20">
                    <ImageWithFallback
                      src={promo.image}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {!showingSearch && (
          <div className="px-4 py-2">
            <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
              تسوّق حسب القسم
            </h2>
            {loading ? (
              <div className="text-sm text-gray-500">جارِ التحميل…</div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    onClick={() =>
                      updateAppState({ currentScreen: "categories", selectedCategoryId: c.id })
                    }
                    className="h-20 rounded-xl bg-gray-100 hover:opacity-80 transition-opacity p-2"
                  >
                    <div className="flex flex-col items-center text-center">
                      {/* لو عندك أيقونة في API اعرضها هنا */}
                      <div className="text-xs font-medium text-gray-700 line-clamp-2">{c.name}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {showingSearch && (
          <div className="px-4 py-2">
            <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
              نتائج البحث
            </h2>
            {searching ? (
              <div className="text-sm text-gray-500">جارِ البحث…</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {results.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-white">
                      {p.imageUrl && (
                        <ImageWithFallback
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{p.category?.name}</p>
                    <div className="flex items-center justify-between">
                      {priceDisplay(p)}
                      <Button size="sm" onClick={() => addToCart(p)} className="h-8 px-3 rounded-lg">
                        أضف
                      </Button>
                    </div>
                  </div>
                ))}
                {results.length === 0 && !searching && (
                  <div className="text-sm text-gray-500">لا توجد نتائج.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Best Selling */}
        {!showingSearch && (
          <div className="px-4 py-2">
            <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
              الأكثر مبيعًا
            </h2>
            {loading ? (
              <div className="text-sm text-gray-500">جارِ التحميل…</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {best.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-white">
                      {p.imageUrl && (
                        <ImageWithFallback
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{p.category?.name}</p>
                    <div className="flex items-center justify-between">
                      {priceDisplay(p)}
                      <Button size="sm" onClick={() => addToCart(p)} className="h-8 px-3 rounded-lg">
                        أضف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hot Offers */}
        {!showingSearch && (
          <div className="px-4 py-2">
            <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
              عروض ساخنة
            </h2>
            {loading ? (
              <div className="text-sm text-gray-500">جارِ التحميل…</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {hot.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="w-full h-24 rounded-lg overflow-hidden mb-3 bg-white">
                      {p.imageUrl && (
                        <ImageWithFallback
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{p.category?.name}</p>
                    <div className="flex items-center justify-between">
                      {priceDisplay(p)}
                      <Button size="sm" onClick={() => addToCart(p)} className="h-8 px-3 rounded-lg">
                        أضف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
