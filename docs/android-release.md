# Android release / Play upload

1) **Set production env vars**  
   - Ensure `VITE_API_BASE=https://api.fasket.cloud/api/v1` (already in `.env`). Optionally add `.env.production` with the same values for clarity.

2) **Create a release keystore (once)**  
   - Example command (choose your own passwords/names):  
     ```
     keytool -genkeypair -v -keystore android/fasket-release.keystore -alias fasket -keyalg RSA -keysize 2048 -validity 3650
     ```
   - Keep the keystore file and passwords backed up; Play will require this forever.

3) **Wire signing credentials**  
   - Copy `android/keystore.properties.example` to `android/keystore.properties` (git-ignored) and fill `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.  
   - Alternatively set env vars: `FASKET_KEYSTORE_PATH`, `FASKET_KEYSTORE_PASS`, `FASKET_KEY_ALIAS`, `FASKET_KEY_PASS`.
   - You can set `VERSION_CODE` and `VERSION_NAME` env vars before building; defaults are `1` and `1.0.0`.

4) **Build the Play bundle**  
   - Install deps if needed: `npm install`  
   - Run: `npm run android:bundle`  
   - Output: `android/app/build/outputs/bundle/release/app-release.aab`

5) **Upload to Play Console**  
   - Create the app entry, opt into Play App Signing, upload the `.aab`, fill Data Safety/Content Rating, screenshots, and roll out.
