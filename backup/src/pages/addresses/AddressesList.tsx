import React, { useEffect, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { listAddresses } from '../../services/addresses';
import { useHistory } from 'react-router';

export default function AddressesList() {
  const [items, setItems] = useState<any[]>([]);
  const history = useHistory();
  useEffect(() => { (async () => { try { setItems(await listAddresses()); } catch {} })(); }, []);
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Addresses</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => history.push('/addresses/new')}>Add New</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          {items.map(a => (
            <IonItem key={a.id} button onClick={() => history.push(`/addresses/${a.id}`)}>
              <IonLabel>
                <h2>{a.label}</h2>
                <p>{a.city}{a.zone?`, ${a.zone}`:''} • {a.street}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}

