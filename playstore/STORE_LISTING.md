# PromptLab — Play Store Listing (copy-paste)

## URLs

| Item | URL |
|------|-----|
| Production app | https://prompt-lab.xyz/ |
| Privacy policy | https://prompt-lab.xyz/privacy |
| Package name | `app.promptlab.twa` |

## Short description (80 chars max)

```
Turn rough ideas, files, and screenshots into structured AI prompts.
```

## Full description

```
PromptLab helps creators, students, marketers, and builders transform rough instructions into structured prompts for ChatGPT, Claude, Gemini, Grok, Midjourney, and other AI tools.

• Builder — turn narratives into ready-to-use prompts
• Optimizer — refine prompts for clarity and impact
• Templates — start faster with proven patterns
• Library — save and reuse your best prompts
• Compare — evaluate prompt versions side by side
• Export — DOCX and PPTX when you need documents

Sign in to sync quota and membership. Free tier included. Pro and Business plans unlock higher limits (Google Play Billing on Android when enabled).

Privacy: https://prompt-lab.xyz/privacy
```

## Category

Productivity

## Content rating

Everyone / general audience (productivity & AI assistant tool — complete Google's questionnaire honestly)

## Data Safety (summary)

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email, name | Yes | Supabase | Account |
| User-generated content (prompts, files) | Yes | AI providers | App functionality |
| App activity (usage/quota) | Yes | Supabase | Analytics / account |

Encrypted in transit: Yes. Users can request deletion via support email.

## In-app purchases

- Yes when Pro/Business billing is enabled
- Product IDs: `promptlab_pro_monthly`, `promptlab_business_monthly`
- Free tier: no purchase required

## Graphics (local files)

Generated in `playstore/assets/` — run `npm run playstore:assets` after `npm run build`.

| File | Play Console field |
|------|-------------------|
| `app-icon-512.png` | App icon |
| `feature-graphic-1024x500.png` | Feature graphic |
| `screenshot-phone-*.png` | Phone screenshots (min. 2) |

## AAB upload

Path after local build:

`android-app/app/build/outputs/bundle/release/PromptLab-release-signed.aab`

## Internal testing release notes

```
First TWA build. Login, prompt generation, quota tracking, and Settings verified on production.
```
