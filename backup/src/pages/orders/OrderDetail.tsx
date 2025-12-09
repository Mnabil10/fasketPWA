import React, { useEffect, useState } from 'react';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useParams } from 'react-router';
import { getOrder } from '../../services/orders';
import Currency from '../../components/Currency';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        setOrder(await getOrder(id));
      } catch {}
    })();
  }, [id]);
  if (!order) return null;
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/orders" />
          </IonButtons>
          <IonTitle>Order #{order.id}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonLabel>
              <h2>Status: {order.status}</h2>
              <p>Total: <Currency value={order.totalCents} cents /></p>
            </IonLabel>
          </IonItem>
        </IonList>
        <IonList inset>
          {order.items?.map((it: any) => (
            <IonItem key={it.id || it.productId}>
              <IonLabel>
                <h3>{it.productNameSnapshot}</h3>
                <p>
                  {it.qty} × <Currency value={it.priceSnapshotCents} cents />
                </p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}

