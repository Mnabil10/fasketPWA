import React, { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { ArrowLeft, Plus, Minus, Trash2 } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

/** خدمات الـ API (عدّل المسارات حسب مشروعك) */
import { getCart, updateItemQty, removeItem } from "../../services/cart";
import { fromCents, fmtEGP } from "../../lib/money";

interface CartScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

/** نحول شكل الـ cart من السيرفر لشكل مبسط في AppState (لعدّاد الهيدر وغيره) */
function mapServerCartToUiItems(server: any) {
  if (!server?.items) return [];
  return server.items.map((it: any) => ({
    id: it.id, // id بتاع cart item
    productId: it.productId,
    name: it.product?.name ?? "",
    image: it.product?.imageUrl ?? undefined,
    price: fromCents(it.priceCents),
    quantity: it.qty,
    category: it.product?.category?.name,
  }));
}

export function CartScreen({ appState, updateAppState }: CartScreenProps) {
  const [serverCart, setServerCart] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const c = await getCart();
      setServerCart(c);
      // حافظ على تزامن عدّاد السلة في الـ appState
      updateAppState({ cart: mapServerCartToUiItems(c) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDec(item: any) {
    const next = Math.max(1, item.qty - 1);
    await updateItemQty(item.id, next);
    await load();
  }
  async function onInc(item: any) {
    await updateItemQty(item.id, item.qty + 1);
    await load();
  }
  async function onRemove(item: any) {
    await removeItem(item.id);
    await load();
  }

  const items = serverCart?.items ?? [];
  const subtotal = fromCents(serverCart?.subtotalCents ?? 0);

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAppState({ currentScreen: "home" })}
              className="p-2 mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              Shopping Cart
            </h1>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <div className="text-6xl">🛒</div>
          </div>
          <h2 className="font-poppins text-xl text-gray-900 mb-2" style={{ fontWeight: 600 }}>
            Your cart is empty
          </h2>
          <p className="text-gray-600 text-center mb-8">Add some items to your cart to continue shopping</p>
          <Button onClick={() => updateAppState({ currentScreen: "home" })} className="h-12 px-8 rounded-xl">
            Start Shopping
          </Button>
        </div>

        <MobileNav appState={appState} updateAppState={updateAppState} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "home" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Shopping Cart
          </h1>
          <span className="ml-2 text-gray-500">({items.length} items)</span>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto pb-40">
        {loading ? (
          <div className="px-4 py-6 text-sm text-gray-500">جارِ التحميل…</div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {items.map((it: any) => (
              <div key={it.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white">
                    {it.product?.imageUrl ? (
                      <ImageWithFallback
                        src={it.product.imageUrl}
                        alt={it.product?.name ?? "product"}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-2">{it.product?.name}</h3>
                    <p className="text-sm text-gray-500">{it.product?.category?.name}</p>
                    <p className="font-poppins text-lg text-primary mt-1" style={{ fontWeight: 600 }}>
                      {fmtEGP(fromCents(it.priceCents))}
                    </p>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(it)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDec(it)}
                        className="w-8 h-8 p-0 rounded-lg"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{it.qty}</span>
                      <Button size="sm" onClick={() => onInc(it)} className="w-8 h-8 p-0 rounded-lg">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="px-4 py-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{fmtEGP(subtotal)}</span>
            </div>
            {/* ملاحظة: الشحن/الخصومات تحسب عند الـ Checkout من السيرفر */}
            <div className="text-xs text-gray-500">
              Delivery fee & discounts are applied at checkout.
            </div>
            <Separator />
            <div
              className="flex justify-between font-poppins text-lg text-gray-900"
              style={{ fontWeight: 600 }}
            >
              <span>Total</span>
              <span className="text-primary">{fmtEGP(subtotal)}</span>
            </div>
          </div>

          <Button onClick={() => updateAppState({ currentScreen: "checkout" })} className="w-full h-12 rounded-xl">
            Proceed to Checkout
          </Button>
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
