import React, { useEffect, useState } from 'react';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { createAddress, listAddresses, updateAddress } from '../../services/addresses';
import { useHistory, useParams } from 'react-router';

export default function AddressForm() {
  const { id } = useParams<{ id?: string }>();
  const [data, setData] = useState<any>({ label: '', city: '', street: '', zone: '' });
  const history = useHistory();
  useEffect(() => {
    (async () => {
      if (id) {
        try {
          const all = await listAddresses();
          const it = all.find((a) => a.id === id);
          if (it) setData(it);
        } catch {}
      }
    })();
  }, [id]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await updateAddress(id, data);
      } else {
        await createAddress(data);
      }
      history.replace('/addresses');
    } catch {}
  };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/addresses" /></IonButtons>
          <IonTitle>{id ? 'Edit Address' : 'New Address'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={submit}>
          <IonList>
            <IonItem><IonLabel position="stacked">Label</IonLabel><IonInput value={data.label} onIonChange={e=>setData({...data,label:e.detail.value!})} /></IonItem>
            <IonItem><IonLabel position="stacked">City</IonLabel><IonInput value={data.city} onIonChange={e=>setData({...data,city:e.detail.value!})} /></IonItem>
            <IonItem><IonLabel position="stacked">Zone</IonLabel><IonInput value={data.zone||''} onIonChange={e=>setData({...data,zone:e.detail.value!})} /></IonItem>
            <IonItem><IonLabel position="stacked">Street</IonLabel><IonInput value={data.street||''} onIonChange={e=>setData({...data,street:e.detail.value!})} /></IonItem>
          </IonList>
          <IonButton expand="block" className="ion-margin-top" type="submit">Save</IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
}
