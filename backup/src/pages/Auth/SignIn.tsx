import React, { useState } from 'react';
import { IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { useAuth } from '../../store/auth';

export default function SignIn() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const login = useAuth((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ phone, password });
      history.replace('/tabs/home');
    } catch (err: any) {
      setError(err?.body?.message || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('auth.welcomeBack')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" fullscreen>
        <div className="ion-text-center ion-padding">
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--ion-color-primary)', margin: '12px auto' }} />
          <h1 style={{ fontWeight: 800, fontSize: 28 }}>{t('auth.welcomeBack')}</h1>
          <IonText color="medium">
            <p>{t('auth.signInSubtitle')}</p>
          </IonText>
        </div>
        <form onSubmit={submit}>
          <IonList lines="full" className="ion-margin-top">
            <IonItem>
              <IonLabel position="stacked">{t('auth.phone')}</IonLabel>
              <IonInput value={phone} placeholder="+1 (555) 123-4567" onIonChange={(e) => setPhone(e.detail.value!)} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">{t('auth.password')}</IonLabel>
              <IonInput type="password" value={password} placeholder="Enter your password" onIonChange={(e) => setPassword(e.detail.value!)} />
            </IonItem>
          </IonList>
          {error && (
            <IonText color="danger">
              <p className="ion-padding-top">{error}</p>
            </IonText>
          )}
          <IonButton className="ion-margin-top" type="submit" expand="block" disabled={loading}>
            {t('auth.signIn')}
          </IonButton>
        </form>
        <div className="ion-text-center ion-margin-top">
          <IonText color="medium">{t('auth.noAccount')}</IonText>
          <br />
          <IonButton fill="outline" onClick={() => history.push('/auth/signup')} expand="block">
            {t('auth.createAccount')}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}

