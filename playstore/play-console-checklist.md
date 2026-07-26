# Play Console Checklist

## App Setup

- App name: `PromptLab`
- Public title: `Prompt Lab: AI Work Studio`
- Package name: `app.promptlab.twa`
- Default language: English
- App/category: Productivity
- Website: `https://prompt-lab.xyz/`
- Privacy policy URL: `https://prompt-lab.xyz/privacy`

## Store Listing Draft

Short description:

`Turn ideas, photos, and files directly into finished AI work you can continue.`

Full description:

Use the canonical English full description from `playstore/STORE_LISTING.md`.

Metadata and creative updates are a **no new AAB required** release. Upload a new AAB only for Android wrapper changes.

## Required Screenshots

- Phone screenshots: use Workspace, Result, Advanced controls, History, Account, Guide.
- Feature graphic: 1024 x 500.
- App icon: 512 x 512.

## Policy Forms

- Data Safety: declare account data, usage data, files uploaded for AI processing, and diagnostics if enabled.
- Content Rating: productivity / AI tool.
- Ads: No, unless ads are added later.
- In-app purchases: Yes only after Google Play Billing is integrated.
- Privacy Policy: required for login, file upload, and AI processing.

## Billing

- Free plan can remain available.
- Pro and Business inside Android must use Google Play Billing.
- Product IDs:
  - `promptlab_pro_monthly`
  - `promptlab_business_monthly`
- Setup guide: `playstore/MONETIZATION_SETUP.md` (license testing, service account, checklist)

## License testing

- Play Console → **Setup** → **License testing** → add tester Gmail accounts
- Same accounts can test subscription purchase without real charges (after billing wired in app)

## Store checklist (point 5)

- [ ] Category: **Productivity**
- [ ] Store listing assets from `playstore/assets/`
- [ ] Privacy URL live
- [ ] Data safety form
- [ ] Content rating questionnaire
- [x] Closed test: 12 opted-in, 14 days (complete)
- [ ] **Production**: upload AAB with host `prompt-lab.xyz` (see `PRODUCTION_GO_LIVE.md`)
- [ ] Play Console → Store settings → Website = `https://prompt-lab.xyz/`
- [ ] Supabase → Auth → URL Configuration → Site URL `https://prompt-lab.xyz`
- [ ] Vercel env `APP_URL=https://prompt-lab.xyz`
