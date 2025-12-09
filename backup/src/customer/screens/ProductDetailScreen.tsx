import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Plus, Minus, Heart, Star, ShoppingCart } from "lucide-react";
import { AppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

/** خدمات الـ API (عدّل المسارات حسب مشروعك) */
import { getProduct, hotOffers, listProducts } from "../../services/catalog";
import { addItem, getCart } from "../../services/cart";
import type { Product } from "../../types/api";
import { fmtEGP, fromCents } from "../../lib/money";

interface ProductDetailScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

/** نحول شكل الـ cart من السيرفر لشكل مبسط في AppState */
function mapServerCartToUiItems(server: { items: any[] } | null) {
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

export function ProductDetailScreen({ appState, updateAppState }: ProductDetailScreenProps) {
  const preselected = appState.selectedProduct as Partial<Product> | undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [suggested, setSuggested] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);

  // تحميل تفاصيل المنتج:
  // - لو جاي من شاشة سابقة ومعاك كامل الكائن، نستخدمه
  // - لو معاك id/slug فقط، نطلبه من API
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (preselected && preselected.id && preselected.name && preselected.priceCents !== undefined) {
          setProduct(preselected as Product);
        } else if (preselected?.id) {
          setProduct(await getProduct(preselected.id, "ar"));
        } else if (preselected?.slug) {
          setProduct(await getProduct(preselected.slug, "ar"));
        } else {
          setProduct(null);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected?.id, preselected?.slug]);

  // تحميل اقتراحات (Hot offers أو من نفس التصنيف)
  useEffect(() => {
    (async () => {
      setLoadingSuggested(true);
      try {
        if (product?.category?.id) {
          const sameCat = await listProducts(undefined, product.category.id, undefined, undefined, "ar");
          setSuggested(sameCat.filter((p) => p.id !== product.id).slice(0, 10));
        } else {
          const offers = await hotOffers(10, "ar");
          setSuggested(offers.filter((p) => p.id !== product?.id));
        }
      } catch {
        setSuggested([]);
      } finally {
        setLoadingSuggested(false);
      }
    })();
  }, [product?.id, product?.category?.id]);

  const productImages = useMemo(() => {
    const src = product?.imageUrl;
    return src ? [src] : [];
  }, [product?.imageUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>جارِ التحميل…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Product not found</p>
      </div>
    );
  }

  const sellPrice = fromCents(product.salePriceCents ?? product.priceCents);
  const basePrice = fromCents(product.priceCents);
  const hasDiscount = !!product.salePriceCents;
  const discountPct =
    hasDiscount && basePrice > 0 ? Math.max(0, Math.round((1 - sellPrice / basePrice) * 100)) : 0;

  async function addToCart() {
    try {
      await addItem({ productId: product.id, qty: Math.max(1, quantity) });
      const serverCart = await getCart();
      updateAppState({ cart: mapServerCartToUiItems(serverCart), currentScreen: "cart" });
    } catch (e) {
      console.error(e);
      // TODO: IonToast/Toast خطأ
    }
  }

  async function addSuggestedToCart(p: Product) {
    try {
      await addItem({ productId: p.id, qty: 1 });
      const serverCart = await getCart();
      updateAppState({ cart: mapServerCartToUiItems(serverCart) });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateAppState({ currentScreen: "products" })}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsFavorite(!isFavorite)} className="p-2">
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-primary text-primary" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "cart" })}
            className="p-2 relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {appState.cart.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {appState.cart.length}
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Product Image Carousel */}
        <div className="relative">
          <div className="w-full h-80 px-4 mb-4">
            {productImages[0] ? (
              <ImageWithFallback
                src={productImages[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-contain rounded-xl bg-white"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gray-100" />
            )}
          </div>

          {/* Image Indicators */}
          {productImages.length > 1 && (
            <div className="flex justify-center space-x-2 mb-4">
              {productImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex ? "bg-primary" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-4">
          <div className="flex items-start justify-between mb-3">
            <h1 className="font-poppins text-2xl text-gray-900 flex-1 mr-4" style={{ fontWeight: 700 }}>
              {product.name}
            </h1>
            {hasDiscount && (
              <Badge variant="destructive" className="rounded-lg">
                -{discountPct}%
              </Badge>
            )}
          </div>

          <p className="text-gray-600 mb-3">{product.category?.name}</p>

          {/* تقييمات تشغيلية (Placeholder) */}
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-4 h-4 ${star <= 5 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
              ))}
            </div>
            <span className="text-gray-500 ml-2 text-sm">(4.5) • 127 reviews</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Product Details</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {product.name} بجودة عالية. القيّم النقدية بالأسفل تعتمد على تسعير اللحظة.
            </p>
            {hasDiscount && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">Hot Offer</Badge>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-xl p-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-poppins text-3xl text-primary" style={{ fontWeight: 700 }}>
                  {fmtEGP(sellPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-gray-500 line-through text-lg">{fmtEGP(basePrice)}</span>
                )}
              </div>
              <span className="text-sm text-gray-600">per unit</span>
            </div>
            <div className="flex items-center space-x-3 bg-white rounded-xl p-2 border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 p-0 rounded-lg"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 p-0 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Suggested Items */}
          <div className="mb-6">
            <h3 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
              You might also like
            </h3>
            {loadingSuggested ? (
              <div className="text-sm text-gray-500">جارِ التحميل…</div>
            ) : (
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {suggested.map((item) => (
                  <div key={item.id} className="min-w-32 bg-gray-50 rounded-xl p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden mb-2 mx-auto bg-white">
                      {item.imageUrl ? (
                        <ImageWithFallback
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : null}
                    </div>
                    <h4 className="text-xs font-medium text-gray-900 text-center mb-1 line-clamp-2">
                      {item.name}
                    </h4>
                    <p className="text-xs text-primary text-center mb-2" style={{ fontWeight: 600 }}>
                      {fmtEGP(fromCents(item.salePriceCents ?? item.priceCents))}
                    </p>
                    <Button size="sm" onClick={() => addSuggestedToCart(item)} className="w-full h-6 text-xs rounded-md">
                      Add
                    </Button>
                  </div>
                ))}
                {suggested.length === 0 && <div className="text-sm text-gray-500">لا توجد اقتراحات.</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Add to Cart Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button onClick={addToCart} className="w-full h-12 rounded-xl">
          Add to Cart • {fmtEGP(sellPrice * quantity)}
        </Button>
      </div>
    </div>
  );
}
