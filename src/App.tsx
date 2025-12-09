import React from 'react';
import { IonApp, IonContent } from '@ionic/react';
import '@ionic/react/css/core.css';
import './theme/variables.css';
import './index.css';
import './store/session';

// If you imported the Figma-based app files, you likely have:
//   src/customer/CustomerApp.tsx
// which composes the screens with the new UI components.
// If not, adjust the import below to your main root component.
import { QueryClientProvider } from '@tanstack/react-query';
import { CustomerApp } from './customer/CustomerApp';
import { ToastProvider } from './customer/providers/ToastProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import { TabRefetchProvider } from './customer/providers/TabRefetchProvider';
import { OfflineStalenessIndicator } from './customer/providers/OfflineStalenessIndicator';
import { DeepLinkListener } from './customer/providers/DeepLinkListener';

const App: React.FC = () => {
  return (
    <IonApp>
      <IonContent fullscreen>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ErrorBoundary>
              <TabRefetchProvider>
                <OfflineStalenessIndicator>
                  <DeepLinkListener>
                    <CustomerApp />
                  </DeepLinkListener>
                </OfflineStalenessIndicator>
              </TabRefetchProvider>
            </ErrorBoundary>
          </ToastProvider>
        </QueryClientProvider>
      </IonContent>
    </IonApp>
  );
};

export default App;
