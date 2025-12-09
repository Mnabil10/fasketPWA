import React, { useState } from 'react';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { OrderSuccessScreen } from './screens/OrderSuccessScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { OrderDetailScreen } from './screens/OrderDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddressesScreen } from './screens/AddressesScreen';

export type Screen = 
  | 'splash'
  | 'onboarding' 
  | 'auth'
  | 'register'
  | 'home'
  | 'categories'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-success'
  | 'orders'
  | 'order-detail'
  | 'profile'
  | 'addresses';

export interface AppState {
  currentScreen: Screen;
  user: any;
  cart: any[];
  selectedCategory: any;
  selectedProduct: any;
  selectedOrder: any;
}

export function CustomerApp() {
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'splash',
    user: null,
    cart: [],
    selectedCategory: null,
    selectedProduct: null,
    selectedOrder: null,
  });

  const updateAppState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  };

  const renderScreen = () => {
    switch (appState.currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={() => updateAppState({ currentScreen: 'onboarding' })} />;
      case 'onboarding':
        return <OnboardingScreen onComplete={() => updateAppState({ currentScreen: 'auth' })} />;
      case 'auth':
      case 'register':
        return <AuthScreen 
          mode={appState.currentScreen} 
          onLogin={(user) => updateAppState({ user, currentScreen: 'home' })}
          onToggleMode={() => updateAppState({ 
            currentScreen: appState.currentScreen === 'auth' ? 'register' : 'auth' 
          })}
        />;
      case 'home':
        return <HomeScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'categories':
        return <CategoriesScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'products':
        return <ProductsScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'product-detail':
        return <ProductDetailScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'cart':
        return <CartScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'checkout':
        return <CheckoutScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'order-success':
        return <OrderSuccessScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'orders':
        return <OrdersScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'order-detail':
        return <OrderDetailScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'profile':
        return <ProfileScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      case 'addresses':
        return <AddressesScreen 
          appState={appState} 
          updateAppState={updateAppState}
        />;
      default:
        return <HomeScreen appState={appState} updateAppState={updateAppState} />;
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {renderScreen()}
    </div>
  );
}
