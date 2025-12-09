// src/pages/ProductDetails.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { products as mockProducts } from '../data/mock';
import { getProduct } from '../services/catalog';
import Currency from '../components/Currency';
import QuantityStepper from '../components/QuantityStepper';
import { addToCartBridge } from '../utils/cartBridge';
import { Heart, Star, ShoppingCart, ArrowLeft } from 'lucide-react';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  // initial from mock, hydrate with API
  const [product, setProduct] = useState<any>(
    mockProducts.find((p) => String(p.id) === String(id))
  );

  const [qty, setQty] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProduct(id);
        if (p) setProduct(p);
      } catch {}
    })();
  }, [id]);

  const imgPrimary = product?.imageUrl || product?.image;
  const gallery: string[] = useMemo(() => {
    const imgs: string[] = [];
    const p = product as any;
    if (p && Array.isArray(p.images) && p.images.length) {
      p.images.forEach((it: any) => {
        const src = it?.url || it?.src || it;
        if (src) imgs.push(src);
      });
    }
    if (imgPrimary) imgs.unshift(imgPrimary);
    return Array.from(new Set(imgs));
  }, [product, imgPrimary]);

  if (!product) return null;

  const priceCents: number | undefined =
    'priceCents' in product ? (product.salePriceCents ?? product.priceCents) : undefined;
  const originalPriceCents: number | undefined =
    'priceCents' in product ? product.priceCents : undefined;
  const priceUnitLabel = product.unitLabel || 'per unit';
  const rating = Number(product.rating || 4.5);
  const discountPct =
    typeof product.discount === 'number'
      ? product.discount
      : priceCents && originalPriceCents && originalPriceCents > 0
      ? Math.max(0, Math.round(100 - (priceCents / originalPriceCents) * 100))
      : undefined;

  const suggested: any[] = (mockProducts || [])
    .filter((p) => String(p.id) !== String(product.id))
    .slice(0, 10);

  const addToCart = () => {
    const item =
      'priceCents' in product
        ? {
            id: product.id,
            name: product.name,
            price: (product.salePriceCents ?? product.priceCents) / 100,
            image: product.imageUrl || product.image,
            categoryId: product.category?.id,
          }
        : product;
    addToCartBridge(item, qty);
  };

  const addSuggestedToCart = (sp: any) => {
    const item =
      'priceCents' in sp
        ? {
            id: sp.id,
            name: sp.name,
            price: (sp.salePriceCents ?? sp.priceCents) / 100,
            image: sp.imageUrl || sp.image,
            categoryId: sp.category?.id,
          }
        : sp;
    addToCartBridge(item, 1);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <header className="relative px-2 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => history.goBack()}
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>{product.name}</h1>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            onClick={() => setIsFavorite((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : 'text-gray-800'}`} />
          </button>
          <a href="/tabs/cart" className="p-2 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition relative">
            <ShoppingCart className="w-5 h-5 text-gray-800" />
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Image Carousel */}
        <div className="relative">
          <div className="w-full h-80 px-4 pt-4">
            {gallery.length ? (
              <img
                src={gallery[currentImageIndex]}
                alt={product.name}
                onError={(e) => {
                  (e.currentTarget as any).style.display = 'none';
                }}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : imgPrimary ? (
              <img src={imgPrimary} className="w-full h-full object-cover rounded-xl" />
            ) : null}
          </div>

          {gallery.length > 1 && (
            <div className="flex justify-center space-x-2 my-3">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-primary' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-4 pb-28">
          <div className="flex items-start justify-between mb-3">
            <h1 className="font-poppins text-2xl text-gray-900 flex-1 mr-4" style={{ fontWeight: 700 }}>
              {product.name}
            </h1>
            {typeof discountPct === 'number' && discountPct > 0 && (
              <span className="inline-flex items-center bg-red-100 text-red-700 text-xs px-2 py-1 rounded-lg">
                -{discountPct}%
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-3">{product.category?.name || product.category || ''}</p>

          <div className="flex items-center mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-gray-500 ml-2 text-sm">({rating.toFixed(1)}) • 127 reviews</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Product Details</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Fresh, high-quality {String(product.name || '').toLowerCase()} sourced from local suppliers. Perfect for
              your daily needs.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Fresh</span>
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Quality Assured</span>
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Popular</span>
            </div>
          </div>

          {/* Price + Quantity */}
          <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-xl p-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-poppins text-3xl text-primary" style={{ fontWeight: 700 }}>
                  {'priceCents' in product ? (
                    <Currency value={priceCents!} cents />
                  ) : (
                    <Currency value={product.price} />
                  )}
                </span>
                {originalPriceCents && priceCents && originalPriceCents > priceCents && (
                  <span className="text-gray-500 line-through text-lg">
                    <Currency value={originalPriceCents} cents />
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-600">{priceUnitLabel}</span>
            </div>

            <div className="flex items-center space-x-3 bg-white rounded-xl p-2 border">
              <QuantityStepper value={qty} onChange={setQty} />
            </div>
          </div>

          {/* Suggested Items */}
          {!!suggested.length && (
            <div className="mb-6">
              <h3 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                You might also like
              </h3>
              <div className="flex space-x-4 overflow-x-auto pb-2">
                {suggested.map((item) => (
                  <div key={item.id} className="min-w-32 bg-gray-50 rounded-xl p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden mb-2 mx-auto bg-white">
                      {(item.imageUrl || item.image) ? (
                        <img
                          src={item.imageUrl || item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as any).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-gray-400 text-sm">No image</div>
                      )}
                    </div>
                    <h4 className="text-xs font-medium text-gray-900 text-center mb-1 line-clamp-2">{item.name}</h4>
                    <p className="text-xs text-primary text-center mb-2" style={{ fontWeight: 600 }}>
                      {'priceCents' in item ? (
                        <Currency value={item.salePriceCents ?? item.priceCents} cents />
                      ) : (
                        <Currency value={item.price} />
                      )}
                    </p>
                    <button
                      onClick={() => addSuggestedToCart(item)}
                      className="w-full h-7 text-xs rounded-md bg-primary text-white active:scale-[0.99] transition"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Add to Cart bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          onClick={addToCart}
          className="w-full h-12 rounded-xl bg-primary text-white font-medium active:scale-[0.99] transition"
        >
          Add to Cart •{' '}
          {'priceCents' in product ? (
            <Currency value={(priceCents || 0) * qty} cents />
          ) : (
            <Currency value={(product.price || 0) * qty} />
          )}
        </button>
      </div>
    </div>
  );
}

