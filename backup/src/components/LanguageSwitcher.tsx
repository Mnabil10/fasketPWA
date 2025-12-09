import React from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
import i18n, { supportedLanguages } from '../i18n';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  return (
    <IonItem>
      <IonLabel>{t('settings.language')}</IonLabel>
      <IonSelect
        interface="popover"
        value={i18n.language}
        onIonChange={(e) => i18n.changeLanguage(e.detail.value)}
      >
        {supportedLanguages.map((lng) => (
          <IonSelectOption key={lng.code} value={lng.code}>
            {lng.native}
          </IonSelectOption>
        ))}
      </IonSelect>
    </IonItem>
  );
}

