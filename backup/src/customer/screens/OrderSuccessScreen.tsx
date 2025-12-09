import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { CheckCircle, Clock, MapPin, Phone, Star, Gift } from 'lucide-react';
import { AppState } from '../CustomerApp';

interface OrderSuccessScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function OrderSuccessScreen({ appState, updateAppState }: OrderSuccessScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Mock order data (in a real app, this would come from the order just placed)
  const orderDetails = {
    id: `#${Date.now().toString().slice(-6)}`,
    estimatedTime: '25-30 minutes',
    deliveryAddress: '123 Main St, Apt 4B',
    phone: '+1 (555) 123-4567',
    total: '$32.47'
  };

  const recommendations = [
    { id: 1, name: 'Fresh Berries', category: 'Fruits', discount: 15 },
    { id: 2, name: 'Artisan Bread', category: 'Bakery', discount: 10 },
    { id: 3, name: 'Greek Yogurt', category: 'Dairy', discount: 20 }
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-50 to-white">
      {/* Success Animation */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Animated success icon */}
        <div className={`relative mb-6 ${showConfetti ? 'animate-bounce' : ''}`}>
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          {showConfetti && (
            <div className="absolute inset-0 animate-ping">
              <div className="w-full h-full border-4 border-green-200 rounded-full"></div>
            </div>
          )}
        </div>
        
        <h1 className="font-poppins text-3xl text-gray-900 mb-2 text-center" style={{ fontWeight: 700 }}>
          Order Placed Successfully!
        </h1>
        
        <p className="text-gray-600 text-center mb-6 leading-relaxed">
          Thank you for choosing Fasket. Your fresh groceries are being prepared and will be delivered soon.
        </p>

        {/* Order Details Card */}
        <div className="w-full bg-white rounded-xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg" style={{ fontWeight: 600 }}>
              Order Details
            </h2>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Confirmed
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                📦
              </div>
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium">{orderDetails.id}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimated Delivery</p>
                <p className="font-medium">{orderDetails.estimatedTime}</p>
              </div>
            </div>
            
            <div className="flex items-center text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivery Address</p>
                <p className="font-medium">{orderDetails.deliveryAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Special Offer */}
        <div className="w-full bg-gradient-to-r from-primary/10 to-purple-100 rounded-xl p-4 mb-6">
          <div className="flex items-center mb-2">
            <Gift className="w-5 h-5 text-primary mr-2" />
            <h3 className="font-medium text-gray-900">Special Offer</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Get 20% off your next order when you rate your delivery experience!
          </p>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-5 h-5 text-yellow-400 fill-current" />
            ))}
            <span className="text-sm text-gray-600 ml-2">Rate your experience</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-full space-y-3">
          <Button 
            onClick={() => updateAppState({ currentScreen: 'orders' })}
            className="w-full h-12 rounded-xl"
          >
            Track Your Order
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              onClick={() => updateAppState({ currentScreen: 'home' })}
              className="h-12 rounded-xl"
            >
              Continue Shopping
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(`tel:${orderDetails.phone}`, '_self')}
              className="h-12 rounded-xl flex items-center justify-center"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Store
            </Button>
          </div>
        </div>

        {/* Recommendations */}
        <div className="w-full mt-8">
          <h3 className="font-poppins text-lg text-gray-900 mb-4 text-center" style={{ fontWeight: 600 }}>
            You Might Also Like
          </h3>
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {recommendations.map((item) => (
              <div key={item.id} className="min-w-24 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mb-2 relative">
                  <span className="text-2xl">🛒</span>
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 text-xs px-1 py-0"
                  >
                    -{item.discount}%
                  </Badge>
                </div>
                <p className="text-xs font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
