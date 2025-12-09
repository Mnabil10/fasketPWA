import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Package, 
  Bell, 
  Globe, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Star,
  Gift,
  CreditCard,
  Heart,
  Settings,
  Smartphone,
  Mail
} from 'lucide-react';
import { MobileNav } from '../MobileNav';
import { AppState } from '../CustomerApp';

interface ProfileScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function ProfileScreen({ appState, updateAppState }: ProfileScreenProps) {
  const [notifications, setNotifications] = useState(true);
  const [promoNotifications, setPromoNotifications] = useState(true);

  const quickStats = [
    { label: 'Orders', value: 12, icon: Package },
    { label: 'Rewards', value: 245, icon: Gift },
    { label: 'Saved', value: 8, icon: Heart },
  ];

  const mainMenuItems = [
    { icon: MapPin, label: 'My Addresses', action: () => updateAppState({ currentScreen: 'addresses' }), badge: '2' },
    { icon: Package, label: 'Order History', action: () => updateAppState({ currentScreen: 'orders' }), badge: null },
    { icon: CreditCard, label: 'Payment Methods', action: () => {}, badge: null },
    { icon: Heart, label: 'Favorites', action: () => {}, badge: '8' },
    { icon: Gift, label: 'Rewards & Offers', action: () => {}, badge: 'New' },
  ];

  const settingsMenuItems = [
    { icon: Bell, label: 'Push Notifications', action: null, toggle: true, value: notifications, onChange: setNotifications },
    { icon: Mail, label: 'Promotional Emails', action: null, toggle: true, value: promoNotifications, onChange: setPromoNotifications },
    { icon: Globe, label: 'Language', action: () => {}, subtitle: 'English' },
    { icon: Smartphone, label: 'App Preferences', action: () => {} },
    { icon: HelpCircle, label: 'Help & Support', action: () => {} },
    { icon: Settings, label: 'Account Settings', action: () => {} },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'home' })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Profile
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Profile Card */}
        <div className="bg-gradient-to-r from-primary to-primary/80 mx-4 mt-4 rounded-xl p-6 shadow-sm text-white">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-poppins text-xl" style={{ fontWeight: 600 }}>
                {appState.user?.name || 'John Doe'}
              </h2>
              <p className="text-white/80">{appState.user?.phone || '+1 (555) 123-4567'}</p>
              <p className="text-white/80 text-sm">Member since Jan 2024</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
              <span className="text-sm">Premium Member</span>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-4 text-center shadow-sm">
              <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="font-poppins text-lg" style={{ fontWeight: 600 }}>{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Main Menu Section */}
        <div className="mx-4 mt-6">
          <h3 className="font-poppins text-lg text-gray-900 mb-3 px-1" style={{ fontWeight: 600 }}>
            Account
          </h3>
          <div className="space-y-2">
            {mainMenuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={item.action}
                className="w-full justify-between bg-white rounded-xl p-4 h-auto shadow-sm hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                  <span className="text-left">{item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.badge && (
                    <Badge 
                      variant={item.badge === 'New' ? 'destructive' : 'secondary'} 
                      className="text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div className="mx-4 mt-6">
          <h3 className="font-poppins text-lg text-gray-900 mb-3 px-1" style={{ fontWeight: 600 }}>
            Settings
          </h3>
          <div className="space-y-2">
            {settingsMenuItems.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                    <div>
                      <span className="text-left">{item.label}</span>
                      {item.subtitle && (
                        <p className="text-sm text-gray-500">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={item.action}
                      className="p-1"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="mx-4 mt-6 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Fasket App Version</p>
            <p className="text-sm font-medium text-gray-900">v2.1.0</p>
          </div>
        </div>

        {/* Logout */}
        <div className="mx-4 mt-4 mb-6">
          <Button
            variant="outline"
            onClick={() => updateAppState({ currentScreen: 'auth', user: null })}
            className="w-full justify-center bg-white rounded-xl p-4 h-auto shadow-sm border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
