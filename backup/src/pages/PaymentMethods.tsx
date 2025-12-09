import React from 'react';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToggle, IonToolbar } from '@ionic/react';

export default function PaymentMethods() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Payment Methods</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem><IonLabel>Cash on Delivery</IonLabel><IonToggle slot="end" checked /></IonItem>
          <IonItem><IonLabel>Credit/Debit Card</IonLabel><IonToggle slot="end" /></IonItem>
          <IonItem><IonLabel>Digital Wallet</IonLabel><IonToggle slot="end" /></IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}

