# PromptLab — Play Store Listing (copy-paste)

## App title (30 chars max)

```
Prompt generator: Prompt Lab
```

## URLs

| Item | URL |
|------|-----|
| Production app | https://prompt-lab.xyz/ |
| Privacy policy | https://prompt-lab.xyz/privacy |
| Package name | `app.promptlab.twa` |

## Short description (80 chars max)

```
Build, optimize, compare, and save AI prompts from ideas, images, and files.
```

## Full description

```
Turn rough ideas into clear, structured prompts for ChatGPT, Claude, Gemini, Grok, and creative AI tools.

Prompt Lab brings prompt creation, improvement, and reuse into one focused workspace.

BUILD PROMPTS FROM REAL CONTEXT
• Transform notes and rough requests into structured prompts
• Add images, screenshots, and supported documents for context
• Choose a target AI and define the output you need

IMPROVE PROMPT QUALITY
• Refine an existing prompt for clarity, detail, or impact
• Check readiness across context, format, constraints, and actionability
• Compare two versions before choosing which one to use

START FASTER AND REUSE YOUR BEST WORK
• Begin with practical prompt templates
• Save prompts to your personal library
• Organize, edit, duplicate, and reuse successful prompts

WORK YOUR WAY
Explore as a guest with drafts stored on your device. Create a free account when you want AI generation and cross-device library, quota, and membership sync.

Prompt Lab is designed for creators, students, marketers, developers, and anyone who wants more useful results from AI without rewriting every instruction from scratch.
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

### Recommended screenshot order and caption

1. Builder — `Turn rough ideas into structured AI prompts`
2. Optimizer — `Improve clarity, detail, and impact in one pass`
3. Templates — `Start faster with reusable prompt patterns`
4. Compare — `Choose the stronger prompt before you send it`
5. Library — `Save, organize, and reuse what works`
6. Optional Settings — `Manage sync, privacy, and membership`

Add caption bands outside the app UI so controls remain unobstructed.

## Metadata-only release

**No new AAB required** for Play Console title, descriptions, screenshots, icon, or feature graphic changes. A new AAB is required only when the Android wrapper or its versioned native configuration changes.

## AAB upload

Path after local build:

`android-app/app/build/outputs/bundle/release/PromptLab-release-signed.aab`

## Internal testing release notes

```
First TWA build. Login, prompt generation, quota tracking, and Settings verified on production.
```
