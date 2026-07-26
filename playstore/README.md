# AI Work Studio Play Store Migration

This folder tracks the Android / Google Play migration work for AI Work Studio.

## Current Route

Use Trusted Web Activity (TWA) first because AI Work Studio is already deployed as a responsive web app:

- Production URL: `https://prompt-lab.xyz/`
- Android package: `app.promptlab.twa`
- App name: `AI Work Studio`
- Display mode: standalone / fullscreen browser surface

## Production domain

Custom domain: **https://prompt-lab.xyz/** — checklist lengkap sebelum Production: `playstore/PRODUCTION_GO_LIVE.md`.

## Step By Step

1. Keep the web app PWA-ready.
   - `public/manifest.webmanifest`
   - `public/sw.js`
   - `public/icons/icon-192.png`
   - `public/icons/icon-512.png`
   - `public/icons/maskable-512.png`

2. Maintain the Android wrapper.
   - The Bubblewrap/TWA source under `android-app/` is tracked in Git; build outputs, local SDK paths, and signing material remain ignored.
   - Local tools installed on this machine:
     - JDK 17: `C:\Users\USER\promptlab-android-tools\jdk17`
     - Android SDK: `C:\Users\USER\promptlab-android-tools\android-sdk`
     - Bubblewrap CLI: `@bubblewrap/cli`
   - Android project source: `android-app/` (tracked by Git).
   - Signed APK: `android-app/app/build/outputs/apk/release/AI Work Studio-release-signed.apk`
   - Signed AAB: `android-app/app/build/outputs/bundle/release/AI Work Studio-release-signed.aab`

3. Configure Digital Asset Links.
   - Build/sign the Android app.
   - Get the SHA-256 signing certificate fingerprint.
   - Copy `playstore/assetlinks.template.json` to `public/.well-known/assetlinks.json`.
   - Replace the fingerprint placeholder.
   - Deploy Vercel.
   - Current upload-key SHA-256:
     `17:C1:58:CB:70:B7:33:AF:03:6F:B3:61:8D:1A:5F:93:D3:61:04:10:5E:90:84:4D:5C:DA:16:69:A7:9F:28:99`
   - After creating the Play Console app, also add the Google Play App Signing SHA-256 fingerprint.

4. Prepare Play Console.
   - Create app entry.
   - Upload AAB.
   - Add app screenshots, icon, short description, full description.
   - Complete Data Safety, Content Rating, Privacy Policy, and target audience.

5. Add login and membership backend.
   - Recommended auth: Supabase Auth or Clerk.
   - Recommended DB tables: `profiles`, `plans`, `subscriptions`, `usage_events`, `prompt_library`, `custom_templates`.
   - Android digital memberships must use Google Play Billing if purchased inside the app.

## Billing Policy Note

If users buy digital access, credits, prompt-generation quota, Pro, or Business inside the Android app, use Google Play Billing. Do not link to outside payment from the Play Store app for digital membership.
