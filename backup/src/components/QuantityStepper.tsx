import React from 'react';
import { IonButton, IonButtons, IonIcon } from '@ionic/react';
import { add, remove } from 'ionicons/icons';

export default function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <IonButtons>
      <IonButton color="medium" fill="outline" onClick={() => onChange(Math.max(1, value - 1))}>
        <IonIcon icon={remove} />
      </IonButton>
      <IonButton disabled color="light">{value}</IonButton>
      <IonButton color="primary" onClick={() => onChange(value + 1)}>
        <IonIcon icon={add} />
      </IonButton>
    </IonButtons>
  );
}

