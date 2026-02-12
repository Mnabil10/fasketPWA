# iOS Build and Run Guide

This guide explains how to build and run the Fasket iOS application.

## Prerequisites
- macOS with Xcode installed.
- CocoaPods (`sudo gem install cocoapods`).
- An iOS Simulator or a physical device connected.

## Steps

### 1. Build Web Assets
Ensure your latest changes are built:
```bash
npm run build:cap
```

### 2. Sync with Capacitor
Sync the web assets and plugins to the iOS project:
```bash
npx cap sync ios
```

### 3. Open Xcode
Open the project in Xcode to manage signing, capabilities, and run the app:
```bash
npx cap open ios
```

### 4. Run on Simulator
In Xcode:
1. Select your target simulator from the device dropdown at the top.
2. Click the **Run** button (Play icon) or press `Cmd + R`.

### 5. Run from Terminal (Alternative)
You can run directly from the terminal if you have a simulator booted:
```bash
npx cap run ios
```
To run with live reload (highly recommended for development):
```bash
npx ionic cap run ios -l --external
```

## Push Notifications (iOS)

**Important:** On macOS (iPad app on Apple Silicon Mac), push notifications have known reliability issues (delays, failures). For reliable testing, use a physical iPhone or iPad.

For push notifications to work:
1. **Push Notifications capability** – Enable in Xcode: Signing & Capabilities → + Capability → Push Notifications.
2. **APNs key in Firebase** – Upload your APNs key (.p8) to Firebase Console (Project Settings → Cloud Messaging → Apple app configuration).
3. **Bundle ID match** – Ensure `GoogleService-Info.plist` bundle ID matches the app’s bundle ID (development: `fasket.user`, release: `cloud.fasket.customer` – add both if needed in Firebase).

## Troubleshooting
- **Pod Issues**: If you face native dependencies issues, run:
  ```bash
  cd ios/App && pod install && cd ../..
  ```
- **Signing**: For physical devices, you must select a Team in the "Signing & Capabilities" tab in Xcode.
- **Push token not received**: Confirm AppDelegate includes `didRegisterForRemoteNotificationsWithDeviceToken` and `didFailToRegisterForRemoteNotificationsWithError` (already added).
