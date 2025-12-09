import React from 'react';
import { IonContent, IonHeader, IonPage, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router';
import { Button } from '../ui';
import Currency from '../components/Currency';
import { ArrowLeft } from 'lucide-react';

export default function Orders() {
  const history = useHistory();

  // TODO: replace with real API data when ready
  const orders: Array<{
    id: string;
    number: string;
    totalCents: number;
    createdAt: string;
    status: string;
    itemsCount: number;
  }> = [];

  return (
    <IonPage>
      {/* Ionic header wrapper kept, but inner content styled */}
      <IonHeader>
        <IonToolbar className="bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (history.length > 1 ? history.goBack() : history.replace('/'))}
              className="p-2 mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              My Orders
            </h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h2 className="text-gray-900 text-lg font-semibold mb-1">No orders yet</h2>
            <p className="text-gray-600 mb-6">When you place an order, it will appear here.</p>
            <Button className="h-11 rounded-xl px-5" onClick={() => history.replace('/')}>Start Shopping</Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => history.push(`/orders/${o.id}`)}
                className="w-full text-left bg-white rounded-xl p-4 shadow-sm hover:shadow transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Order #{o.number}</div>
                    <div className="text-gray-900 font-medium mt-1">
                      {o.itemsCount} items • <Currency value={o.totalCents} cents />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{o.status}</div>
                </div>
                <div className="text-xs text-gray-400 mt-2">{o.createdAt}</div>
              </button>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}

