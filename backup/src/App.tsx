import React from 'react';
import { IonApp, IonContent } from '@ionic/react';
import '@ionic/react/css/core.css';
import './theme/variables.css';
import './index.css';

// If you imported the Figma-based app files, you likely have:
//   src/customer/CustomerApp.tsx
// which composes the screens with the new UI components.
// If not, adjust the import below to your main root component.
import { CustomerApp } from './customer/CustomerApp';

const App: React.FC = () => {
  return (
    <IonApp>
      <IonContent fullscreen>
        <CustomerApp />
      </IonContent>
    </IonApp>
  );
};

export default App;
