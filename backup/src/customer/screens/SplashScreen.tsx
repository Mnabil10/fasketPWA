import React, { useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-primary text-white">
      <div className="relative">
        {/* Fasket Logo - F merged with cart */}
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center">
            <div className="relative">
              {/* F Letter */}
              <div className="text-4xl font-poppins text-primary" style={{ fontWeight: 700 }}>
                F
              </div>
              {/* Cart Icon merged */}
              <ShoppingCart className="absolute -top-1 -right-3 w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>
      
      <h1 className="font-poppins text-3xl mb-2" style={{ fontWeight: 700 }}>
        Fasket
      </h1>
      <p className="text-xl opacity-90">
        Shop Everything You Need
      </p>
      
      {/* Loading indicator */}
      <div className="mt-12 flex space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}
