import React, { useEffect, useMemo, useState } from 'react';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router';
import { useTranslation } from 'react-i18next';

import { useCart, calcTotals } from '../store/cart';
import Currency from '../components/Currency';
import { listAddresses } from '../services/addresses';
import { getCart } from '../services/cart';
import { placeOrder } from '../services/orders';

import { Button, Badge } from '../ui';
import { ArrowLeft, MapPin, Clock, Truck, CreditCard, Wallet, DollarSign } from 'lucide-react';

export default function Checkout() {
  const { t } = useTranslation();
  const history = useHistory();

  // cart
  const { items, clear } = useCart();
  const totalsFromStore = calcTotals(items);
  const itemList = useMemo(
    () =>
      Object.values(items).map((it: any) => ({
        id: it.product.id,
        name: it.product.name,
        price: it.product.price,
        quantity: it.qty,
        image: (it.product as any).image || (it.product as any).imageUrl,
      })),
    [items]
  );
  const subtotal = useMemo(
    () => itemList.reduce((sum: number, it: any) => sum + (it.price ?? 0) * (it.quantity ?? 1), 0),
    [itemList]
  );

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined);
  const [cartId, setCartId] = useState<string | undefined>(undefined);

  const [deliveryTime, setDeliveryTime] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'wallet'>('cod');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await listAddresses();
        setAddresses(list);
        setSelectedAddress(list[0]?.id);
      } catch {}
      try {
        const c = await getCart();
        setCartId(c.cartId);
      } catch {}
    })();
  }, []);

  const deliveryOptions = [
    { id: 'standard', label: t('checkout.standardDelivery') || 'Standard Delivery', time: '30–45 min', price: 4.99 },
    { id: 'express', label: t('checkout.expressDelivery') || 'Express Delivery', time: '15–20 min', price: 8.99 },
  ] as const;

  const selectedDelivery = deliveryOptions.find((o) => o.id === deliveryTime) || deliveryOptions[0];

  // free standard over 50 rule
  const deliveryFee = deliveryTime === 'standard' && subtotal > 50 ? 0 : selectedDelivery.price;
  const total = subtotal + deliveryFee;

  const place = async () => {
    try {
      if (cartId && selectedAddress) {
        await placeOrder({
          cartId,
          addressId: selectedAddress,
          paymentMethod: (paymentMethod.toUpperCase() as any) /* 'COD' | 'CARD' | 'WALLET' */,
        });
        clear();
        history.replace('/order-success');
        return;
      }
    } catch {}
    clear();
    history.replace('/order-success');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="bg-white px-2 py-2 shadow-sm">
          <div className="flex items-center">
            <IonButtons slot="start" className="mr-1">
              <IonBackButton defaultHref="/tabs/cart" />
            </IonButtons>
            <Button variant="ghost" size="sm" onClick={() => history.goBack()} className="p-2 mr-2" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <IonTitle className="!m-0">
              <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
                {t('checkout.title') || 'Checkout'}
              </h1>
            </IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50 pb-36">
        {/* Order Items Preview */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            {t('checkout.items') || `Order Items (${itemList.length})`}
          </h2>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {itemList.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-500">Qty: {item.quantity ?? 1}</p>
                </div>
                <p className="font-medium text-gray-900">
                  <Currency value={(item.price ?? 0) * (item.quantity ?? 1)} />
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg" style={{ fontWeight: 600 }}>
              {t('checkout.deliveryAddress') || 'Delivery Address'}
            </h2>
          </div>

          <div>
            {addresses.map((a) => (
              <div
                key={a.id}
                className={`p-3 border rounded-lg transition-colors ${selectedAddress === a.id ? 'border-primary bg-accent' : 'border-gray-200'}`}
              >
                <div className="flex items-start gap-3">
                  <input type="radio" name="address" id={`addr-${a.id}`} checked={selectedAddress === a.id} onChange={() => setSelectedAddress(a.id)} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                      <label htmlFor={`addr-${a.id}`} className="font-medium">{a.label}</label>
                    </div>
                    <p className="text-sm text-gray-600">{a.city}{a.zone ? `, ${a.zone}` : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Options */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            {t('checkout.deliveryOptions') || 'Delivery Options'}
          </h2>

          <div>
            {deliveryOptions.map((opt) => (
              <div key={opt.id} className={`p-3 border rounded-lg transition-colors ${deliveryTime === opt.id ? 'border-primary bg-accent' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="delivery" id={`opt-${opt.id}`} checked={deliveryTime === opt.id} onChange={() => setDeliveryTime(opt.id as any)} />
                  <Truck className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`opt-${opt.id}`} className="font-medium">{opt.label}</label>
                      <div className="text-right">
                        {deliveryTime === 'standard' && subtotal > 50 ? (
                          <Badge variant="destructive" className="ml-2 text-xs">FREE</Badge>
                        ) : (
                          <span className="font-medium text-gray-900">
                            <Currency value={opt.price} />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center mt-1">
                      <Clock className="w-3 h-3 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">{opt.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Notes */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            {t('checkout.notes') || 'Delivery Notes'}
          </h2>
          <textarea
            placeholder={t('checkout.notesPlaceholder') || 'Any special instructions...'}
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="w-full min-h-20 rounded-lg border border-gray-200 p-3"
          />
        </div>

        {/* Payment Method */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            {t('checkout.paymentMethod') || 'Payment Method'}
          </h2>
          <div>
            {[
              { id: 'cod', label: t('checkout.cod') || 'Cash on Delivery', icon: DollarSign, desc: t('checkout.codDesc') || 'Pay when you receive your order' },
              { id: 'card', label: t('checkout.card') || 'Credit/Debit Card', icon: CreditCard, desc: t('checkout.cardDesc') || 'Visa, Mastercard' },
              { id: 'wallet', label: t('checkout.wallet') || 'Digital Wallet', icon: Wallet, desc: t('checkout.walletDesc') || 'Apple Pay, Google Pay' },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.id} className={`p-3 border rounded-lg transition-colors ${paymentMethod === m.id ? 'border-primary bg-accent' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="payment" id={`pay-${m.id}`} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id as any)} />
                    <Icon className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <label htmlFor={`pay-${m.id}`} className="font-medium">{m.label}</label>
                      <p className="text-sm text-gray-500">{m.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            {t('checkout.summary') || 'Order Summary'}
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{t('checkout.subtotal') || `Subtotal (${itemList.length} items)`}</span>
              <span><Currency value={subtotal} /></span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('checkout.deliveryFee') || 'Delivery Fee'}</span>
              <span>{deliveryFee === 0 ? <span className="text-green-600">Free</span> : <Currency value={deliveryFee} />}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-poppins text-lg" style={{ fontWeight: 600 }}>
                <span>{t('cart.total') || 'Total'}</span>
                <span className="text-primary">
                  <Currency value={total} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </IonContent>

      {/* Sticky Place Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button onClick={place} className="w-full h-12 rounded-xl">
          {t('checkout.placeOrder', { total: '' }) || 'Place Order'} • <span className="ml-1"><Currency value={total} /></span>
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          <Clock className="inline-block w-3 h-3 mr-1" />
          {t('checkout.eta') || 'Estimated delivery time'}: {selectedDelivery.time}
        </p>
      </div>
    </IonPage>
  );
}

