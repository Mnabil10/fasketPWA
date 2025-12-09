import React from 'react';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';

export default function Account() {
  const { t } = useTranslation();
  const history = useHistory();
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('tabs.account')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <LanguageSwitcher />
          <IonItem button onClick={() => history.push('/addresses')}>
            <IonLabel>My Addresses</IonLabel>
          </IonItem>
          <IonItem button onClick={() => history.push('/orders')}>
            <IonLabel>Order History</IonLabel>
          </IonItem>
          <IonItem button onClick={() => history.push('/payment-methods')}>
            <IonLabel>Payment Methods</IonLabel>
          </IonItem>
          <IonItem>
            <IonLabel>Version</IonLabel>
            <IonLabel slot="end">v2.1.0</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
