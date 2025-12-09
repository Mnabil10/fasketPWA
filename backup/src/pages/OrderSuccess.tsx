// src/pages/OrderSuccess.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router';
import { CheckCircle, Clock, MapPin, Phone, Star, Gift, Package } from 'lucide-react';

type OrderDetails = {
  id: string;
  estimatedTime?: string;
  deliveryAddress?: string;
  phone?: string;
  total?: string | number;
};

type LocationState = { order?: Partial<OrderDetails> & { id?: string } };

export default function OrderSuccess() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<LocationState>();

  const [showConfetti, setShowConfetti] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [recommendations, setRecommendations] = useState<
    { id: string | number; name: string; category?: string; discount?: number }[]
  >([]);

  const qsOrderId = useMemo(() => {
    const qs = new URLSearchParams((location as any).search || '');
    return qs.get('orderId') || undefined;
  }, [location]);

  useEffect(() => {
    const tmr = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(tmr);
  }, []);

  useEffect(() => {
    (async () => {
      const stateOrder = location.state?.order;
      const stored = (() => {
        try {
          const raw = localStorage.getItem('fasket:lastOrder');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      let fetched: any = null;
      if (qsOrderId) {
        const mod = await import('../services/orders').catch(() => null as any);
        if (mod?.getOrder) {
          try {
            fetched = await mod.getOrder(qsOrderId);
          } catch {}
        }
      }

      const merged: OrderDetails =
        normalizeOrder(fetched) ||
        normalizeOrder(stateOrder) ||
        normalizeOrder(stored) || {
          id: `#${Date.now().toString().slice(-6)}`,
          estimatedTime: '25–30 min',
          deliveryAddress: t('orderSuccess.mockAddress', 'Your saved address'),
          phone: '+20 10 000 00000',
          total: '',
        };

      setOrder(merged);

      const recMod = await import('../services/catalog').catch(() => null as any);
      if (recMod?.listProducts) {
        try {
          const r = await recMod.listProducts({ page: 1, pageSize: 8 } as any);
          const items = (r?.items || []).slice(0, 8).map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category?.name || 'General',
            discount: p.promoPercent || 0,
          }));
          setRecommendations(items);
          return;
        } catch {}
      }

      setRecommendations([
        { id: 1, name: 'Fresh Berries', category: 'Fruits', discount: 15 },
        { id: 2, name: 'Artisan Bread', category: 'Bakery', discount: 10 },
        { id: 3, name: 'Greek Yogurt', category: 'Dairy', discount: 20 },
      ]);
    })();
  }, [location.state, qsOrderId, t]);

  function normalizeOrder(src: any): OrderDetails | null {
    if (!src) return null;
    const id = src.id || src.orderId || src.code;
    if (!id) return null;
    return {
      id: String(id).startsWith('#') ? String(id) : `#${id}`,
      estimatedTime: src.estimatedTime || src.eta || t('orderSuccess.eta', '25–30 min'),
      deliveryAddress: src.deliveryAddress || src.address || t('orderSuccess.mockAddress', 'Your saved address'),
      phone: src.phone || src.customerPhone || '+20 10 000 00000',
      total: src.totalFormatted || src.total || '',
    };
  }

  const goTrackOrder = () => {
    const maybeId = order?.id?.replace(/^#/, '');
    history.replace(maybeId ? `/tabs/orders/${maybeId}` : '/tabs/orders');
  };
  const goHome = () => history.replace('/tabs/home');

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('orderSuccess.title', 'Order Success')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="flex flex-col min-h-[70vh] bg-gradient-to-b from-green-50 to-white rounded-2xl p-4">
          {/* Success Animation */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <div className={`relative mb-6 ${showConfetti ? 'animate-bounce' : ''}`}>
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              {showConfetti && (
                <div className="absolute inset-0 animate-ping">
                  <div className="w-full h-full border-4 border-green-200 rounded-full" />
                </div>
              )}
            </div>

            <h1 className="font-poppins text-3xl text-gray-900 mb-2 text-center" style={{ fontWeight: 700 }}>
              {t('orderSuccess.title', 'Order Placed Successfully!')}
            </h1>

            <p className="text-gray-600 text-center mb-6 leading-relaxed">
              {t(
                'orderSuccess.subtitle',
                'Thank you for choosing Fasket. Your fresh groceries are being prepared and will be delivered soon.'
              )}
            </p>

            {/* Order Details Card */}
            {order && (
              <div className="w-full bg-white rounded-xl p-5 shadow-lg mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-poppins text-lg" style={{ fontWeight: 600 }}>
                    {t('orderSuccess.details', 'Order Details')}
                  </h2>
                  <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full">
                    {t('orderSuccess.confirmed', 'Confirmed')}
                  </span>
                </div>

                <div className="space-y-3">
                  <Row icon={<Package className="w-4 h-4" />} label={t('orderSuccess.orderId', 'Order ID')} value={order.id} />
                  <Row icon={<Clock className="w-4 h-4" />} label={t('orderSuccess.etaLabel', 'Estimated Delivery')} value={order.estimatedTime} />
                  <Row icon={<MapPin className="w-4 h-4" />} label={t('orderSuccess.address', 'Delivery Address')} value={order.deliveryAddress} />
                </div>
              </div>
            )}

            {/* Special Offer */}
            <div className="w-full bg-gradient-to-r from-primary/10 to-purple-100 rounded-xl p-4 mb-6">
              <div className="flex items-center mb-2">
                <Gift className="w-5 h-5 text-primary mr-2" />
                <h3 className="font-medium text-gray-900">{t('orderSuccess.offerTitle', 'Special Offer')}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {t('orderSuccess.offerBody', 'Get 20% off your next order when you rate your delivery experience!')}
              </p>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
                <span className="text-sm text-gray-600 ml-2">{t('orderSuccess.rateCta', 'Rate your experience')}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="w-full space-y-3">
              <button onClick={goTrackOrder} className="w-full h-12 rounded-xl bg-primary text-white font-medium">
                {t('orderSuccess.track', 'Track Your Order')}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={goHome} className="h-12 rounded-xl border border-gray-200 text-gray-900 font-medium bg-white">
                  {t('orderSuccess.continue', 'Continue Shopping')}
                </button>
                <a
                  href={`tel:${order?.phone || ''}`}
                  className="h-12 rounded-xl border border-gray-200 text-gray-900 font-medium bg-white flex items-center justify-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {t('orderSuccess.callStore', 'Call Store')}
                </a>
              </div>
            </div>

            {/* Recommendations */}
            {!!recommendations.length && (
              <div className="w-full mt-8">
                <h3 className="font-poppins text-lg text-gray-900 mb-4 text-center" style={{ fontWeight: 600 }}>
                  {t('orderSuccess.recs', 'You Might Also Like')}
                </h3>
                <div className="flex space-x-3 overflow-x-auto pb-1">
                  {recommendations.map((item) => (
                    <div key={item.id} className="min-w-24 text-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mb-2 relative">
                        <span className="text-2xl">🛒</span>
                        {item.discount ? (
                          <span className="absolute -top-1 -right-1 text-[10px] px-1 py-0 rounded bg-red-100 text-red-700">-{item.discount}%</span>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{item.category || 'General'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional Ionic-styled fallback button */}
          <div className="mt-2">
            <IonButton expand="block" onClick={goHome}>
              {t('orderSuccess.continue', 'Continue Shopping')}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: React.ReactNode; value?: React.ReactNode }) {
  return (
    <div className="flex items-center text-gray-700">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

