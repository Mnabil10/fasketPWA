import React, { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { listOrders } from '../../services/orders';
import { useHistory } from 'react-router';
import Currency from '../../components/Currency';

export default function OrdersList() {
  const [items, setItems] = useState<any[]>([]);
  const history = useHistory();
  useEffect(() => {
    (async () => {
      try {
        setItems(await listOrders());
      } catch {}
    })();
  }, []);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Orders</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          {items.map((o) => (
            <IonItem key={o.id} button onClick={() => history.push(`/orders/${o.id}`)}>
              <IonLabel>
                <h2>#{o.id}</h2>
                <p>
                  {new Date(o.createdAt).toLocaleString()} • <Currency value={o.totalCents} cents />
                </p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}

