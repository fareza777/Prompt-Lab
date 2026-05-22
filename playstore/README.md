# PromptLab Play Store Migration

This folder tracks the Android / Google Play migration work for PromptLab.

## Current Route

Use Trusted Web Activity (TWA) first because PromptLab is already deployed as a responsive web app:

- Production URL: `https://promptlab-six-phi.vercel.app/`
- Suggested Android package: `com.fareza.promptlab`
- App name: `PromptLab`
- Display mode: standalone / fullscreen browser surface

## Step By Step

1. Keep the web app PWA-ready.
   - `public/manifest.webmanifest`
   - `public/sw.js`
   - `public/icons/icon-192.png`
   - `public/icons/icon-512.png`
   - `public/icons/maskable-512.png`

2. Create the Android wrapper.
   - Recommended: Bubblewrap / TWA.
   - Install Android Studio, Android SDK, and JDK 17.
   - Then run Bubblewrap from this repo or import a generated TWA project.

3. Configure Digital Asset Links.
   - Build/sign the Android app.
   - Get the SHA-256 signing certificate fingerprint.
   - Copy `playstore/assetlinks.template.json` to `public/.well-known/assetlinks.json`.
   - Replace the fingerprint placeholder.
   - Deploy Vercel.

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

