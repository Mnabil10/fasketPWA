import React, { useEffect, useMemo, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';

import { useCart, calcTotals } from '../store/cart';
import Currency from '../components/Currency';
import { fetchServerCart } from '../utils/cartBridge';
import { removeItem as removeServerItem, updateItem as updateServerItem } from '../services/cart';
import { useAuth } from '../store/auth';

import { Button } from '../ui';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function Cart() {
  const { t } = useTranslation();
  const history = useHistory();

  const { items, remove, setQty } = useCart();

  const isAuthed = useAuth((s) => s.isAuthenticated);
  const [serverCart, setServerCart] = useState<any | null>(null);

  const totals = useMemo(() => {
    if (serverCart) {
      const subtotal = (serverCart.subtotalCents ?? 0) / 100;
      const delivery = subtotal > 50 ? 0 : 4.99;
      return { subtotal, delivery, total: subtotal + delivery };
    }
    return calcTotals(items);
  }, [serverCart, items]);

  const list = serverCart
    ? serverCart.items.map((it: any) => ({
        product: {
          id: it.productId,
          name: it.product?.name || '',
          price: (it.priceCents ?? 0) / 100,
          image: it.product?.imageUrl,
          categoryId: '',
        },
        qty: it.qty,
        _serverId: it.id,
      }))
    : Object.values(items as any);

  useEffect(() => {
    (async () => {
      if (!isAuthed) return;
      try {
        const c = await fetchServerCart();
        if (c) setServerCart(c);
      } catch {}
    })();
  }, [isAuthed]);

  const handleRemove = async (entry: any) => {
    const { product } = entry;
    if (entry._serverId) {
      try { await removeServerItem(entry._serverId); } catch {}
    }
    remove(product.id);
  };

  const handleAdjust = async (entry: any, delta: number) => {
    const { product, qty } = entry;
    const next = Math.max(1, (qty ?? 1) + delta);
    if (entry._serverId) {
      try {
        await updateServerItem(entry._serverId, { qty: next });
        setServerCart((prev: any) => {
          if (!prev) return prev;
          const items = prev.items.map((it: any) => (it.id === entry._serverId ? { ...it, qty: next } : it));
          const subtotalCents = items.reduce((s: number, it: any) => s + (it.priceCents ?? 0) * (it.qty ?? 0), 0);
          return { ...prev, items, subtotalCents };
        });
      } catch {}
      return;
    }
    setQty(product.id, next);
  };

  const isEmpty = list.length === 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="bg-white px-2 py-2 shadow-sm">
          <div className="flex items-center">
            <IonButtons slot="start" className="mr-1">
              <IonBackButton defaultHref="/tabs/home" />
            </IonButtons>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (history.length > 1 ? history.goBack() : history.replace('/tabs/home'))}
              className="p-2 mr-2"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <IonTitle className="!m-0">
              <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
                {t('cart.title') || 'Shopping Cart'}
              </h1>
            </IonTitle>
            {!isEmpty && <span className="ml-2 text-gray-500">({list.length} {t('cart.items') || 'items'})</span>}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
            <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <div className="text-6xl">🛍️</div>
            </div>
            <h2 className="font-poppins text-xl text-gray-900 mb-2" style={{ fontWeight: 600 }}>
              {t('cart.empty') || 'Your cart is empty'}
            </h2>
            <p className="text-gray-600 text-center mb-8">
              {t('cart.emptyHint') || 'Add some items to your cart to continue shopping'}
            </p>
            <Button onClick={() => history.push('/tabs/home')} className="h-12 px-8 rounded-xl">
              {t('cart.startShopping') || 'Start Shopping'}
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="px-4 py-4 space-y-3">
              {list.map((entry: any) => {
                const { product, qty } = entry;
                return (
                  <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm relative">
                    <button
                      onClick={() => handleRemove(entry)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
                      aria-label={t('cart.remove') || 'Remove'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{(product as any).categoryId || ''}</p>
                        <p className="text-primary font-medium mt-1">
                          <Currency value={product.price} />
                        </p>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleAdjust(entry, -1)}
                          disabled={(qty ?? 1) <= 1}
                          aria-label="Decrease"
                        >
                          –
                        </Button>
                        <div className="w-8 text-center select-none">{qty ?? 1}</div>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleAdjust(entry, +1)}
                          aria-label="Increase"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky summary */}
            <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-2xl shadow-xl">
              <div className="px-4 py-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>{t('cart.subtotal') || 'Subtotal'}</span>
                    <span><Currency value={totals.subtotal} /></span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('cart.deliveryFee') || 'Delivery Fee'}</span>
                    <span>{totals.delivery === 0 ? <span className="text-green-600">{t('cart.free') || 'Free'}</span> : <Currency value={totals.delivery} />}</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
                    <span>{t('cart.total') || 'Total'}</span>
                    <span className="text-primary"><Currency value={totals.total} /></span>
                  </div>
                </div>

                <Button onClick={() => history.push('/checkout')} className="w-full h-12 rounded-xl">
                  {t('cart.checkout') || 'Proceed to Checkout'}
                </Button>

                {totals.delivery > 0 && totals.subtotal < 50 && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {t('cart.freeDeliveryHint', { remaining: (50 - totals.subtotal).toFixed(2) }) || `Add ${(50 - totals.subtotal).toFixed(2)} more for free delivery`}
                  </p>
                )}
              </div>
            </div>

            <div className="h-48" />
          </>
        )}
      </IonContent>
    </IonPage>
  );
}

