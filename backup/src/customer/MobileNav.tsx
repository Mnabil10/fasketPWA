import React from 'react';
import { Home, Grid3x3, ShoppingCart, Package, User } from 'lucide-react';
import { AppState } from './CustomerApp';

interface MobileNavProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function MobileNav({ appState, updateAppState }: MobileNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home', screen: 'home' as const },
    { id: 'categories', icon: Grid3x3, label: 'Categories', screen: 'categories' as const },
    { id: 'cart', icon: ShoppingCart, label: 'Cart', screen: 'cart' as const },
    { id: 'orders', icon: Package, label: 'Orders', screen: 'orders' as const },
    { id: 'profile', icon: User, label: 'Account', screen: 'profile' as const },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 shadow-lg">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = appState.currentScreen === item.screen;
          
          return (
            <button
              key={item.id}
              onClick={() => updateAppState({ currentScreen: item.screen })}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive 
                  ? 'text-primary bg-accent' 
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
              {item.id === 'cart' && appState.cart.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {appState.cart.length}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
