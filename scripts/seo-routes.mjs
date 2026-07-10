/** Single source of truth for marketing routes, meta tags, and structured data. */
export const SITE = "https://prompt-lab.xyz";

export const HREFLANG_PAIRS = {
  "/blog/cara-buat-prompt-chatgpt": {
    id: `${SITE}/blog/cara-buat-prompt-chatgpt`,
    en: `${SITE}/blog/how-to-create-prompt-for-chatgpt`,
  },
  "/blog/how-to-create-prompt-for-chatgpt": {
    id: `${SITE}/blog/cara-buat-prompt-chatgpt`,
    en: `${SITE}/blog/how-to-create-prompt-for-chatgpt`,
  },
};

/** @type {Record<string, object>} */
export const SEO_ROUTES = {
  "/": {
    routeKey: "landing",
    h1: "landing",
    lang: "en",
    ogType: "website",
    title: "PromptLab — AI Prompt Workspace | How to Create the Best Prompt",
    description:
      "Learn how to create the best AI prompt for ChatGPT, Claude, Gemini & Grok. Free prompt builder with readiness scoring, optimizer, and 50+ templates. Best prompt tool 2026.",
    canonical: `${SITE}/`,
  },
  "/blog": {
    routeKey: "blog",
    h1: "blog",
    lang: "en",
    ogType: "website",
    title: "PromptLab Blog — AI Prompt Engineering Tips, Guides & Best Prompts",
    description:
      "How to create effective AI prompts. Best prompt templates for ChatGPT, Claude, Gemini, marketers, students, and developers. Tutorials, comparisons, and copy-paste templates.",
    canonical: `${SITE}/blog`,
  },
  "/blog/prompt-engineering-guide": {
    routeKey: "article",
    h1: "article-guide",
    lang: "en",
    ogType: "article",
    title: "The Complete Guide to Prompt Engineering in 2026 | PromptLab",
    description:
      "How to create a prompt that works: the 5-part prompt structure (Role, Context, Task, Constraints, Format), advanced techniques, and 8 common mistakes. Best prompt guide 2026.",
    canonical: `${SITE}/blog/prompt-engineering-guide`,
    headline: "The Complete Guide to Prompt Engineering in 2026",
    datePublished: "2026-05-28",
    dateModified: "2026-05-28",
    keywords:
      "prompt engineering, how to create prompt, best prompt, AI prompt structure, prompt guide, ChatGPT prompt, Claude prompt",
  },
  "/blog/chatgpt-vs-claude-prompts": {
    routeKey: "article-chatgpt",
    h1: "article-chatgpt",
    lang: "en",
    ogType: "article",
    title: "ChatGPT vs Claude: How to Write Prompts for Each | PromptLab",
    description:
      "Side-by-side comparison of how to create the best prompt for ChatGPT vs Claude. Tone, XML tags, system prompts, and real examples for marketing, coding, and research.",
    canonical: `${SITE}/blog/chatgpt-vs-claude-prompts`,
    headline: "ChatGPT vs Claude: How to Write Prompts for Each",
    datePublished: "2026-06-02",
    dateModified: "2026-06-02",
    keywords: "ChatGPT vs Claude, ChatGPT prompts, Claude prompts, prompt comparison, best AI prompts",
  },
  "/blog/prompt-templates-marketing": {
    routeKey: "article-marketing",
    h1: "article-marketing",
    lang: "en",
    ogType: "article",
    title: "10 Prompt Templates Every Marketer Needs | Best AI Prompts 2026 | PromptLab",
    description:
      "How to create the best prompt for marketing: 10 copy-paste AI templates for social media, email, ads, blogs, and product copy. Optimized for ChatGPT, Claude, and Gemini.",
    canonical: `${SITE}/blog/prompt-templates-marketing`,
    headline: "10 Prompt Templates Every Marketer Needs",
    datePublished: "2026-05-28",
    dateModified: "2026-05-28",
    keywords: "marketing prompts, AI marketing templates, prompt templates, ChatGPT marketing, AI copy",
  },
  "/blog/9-tips-claude-prompts": {
    routeKey: "article-9-tips",
    h1: "article-9-tips",
    lang: "en",
    ogType: "article",
    title: "9 Tips to Write a Claude Prompt That Actually Works | Best Claude Prompts | PromptLab",
    description:
      "How to create the best Claude prompt: 9 practical rules from Anthropic with bad/good examples and a copy-paste template. Master Claude prompts in 7 minutes.",
    canonical: `${SITE}/blog/9-tips-claude-prompts`,
    headline: "9 Tips to Write a Claude Prompt That Actually Works",
    datePublished: "2026-06-07",
    dateModified: "2026-06-07",
    keywords:
      "Claude prompt, Anthropic prompts, best Claude prompt, how to create prompt, Claude prompt guide, Claude tips",
  },
  "/blog/how-to-create-prompt-for-chatgpt": {
    routeKey: "article-how-to-create-prompt-for-chatgpt",
    h1: "article-how-to-create-prompt-for-chatgpt",
    lang: "en",
    ogType: "article",
    title: "How to Create a Prompt for ChatGPT That Gets 10x Better Results | PromptLab",
    description:
      "How to create the best prompt for ChatGPT: the CRISPE 6-part framework, 12 copy-paste prompts, before/after scoring, and the 6 mistakes that kill ChatGPT output quality.",
    canonical: `${SITE}/blog/how-to-create-prompt-for-chatgpt`,
    headline: "How to Create a Prompt for ChatGPT That Gets 10x Better Results",
    datePublished: "2026-06-08",
    dateModified: "2026-06-08",
    keywords:
      "how to create a prompt for ChatGPT, best prompt for ChatGPT, ChatGPT prompt tips, ChatGPT prompt examples, CRISPE framework, OpenAI prompt engineering",
  },
  "/blog/cara-buat-prompt-chatgpt": {
    routeKey: "article-cara-buat-prompt-chatgpt",
    h1: "article-cara-buat-prompt-chatgpt",
    lang: "id",
    ogType: "article",
    title: "Cara Buat Prompt ChatGPT yang Bagus: Panduan Praktis Bahasa Indonesia (2026) | PromptLab",
    description:
      "Cara buat prompt ChatGPT yang bagus: framework CRISPE 6-bagian dalam bahasa Indonesia, 8 template siap copy-paste, dan 5 kesalahan yang sering bunuh kualitas output.",
    canonical: `${SITE}/blog/cara-buat-prompt-chatgpt`,
    headline: "Cara Buat Prompt ChatGPT yang Bagus: Panduan Praktis Bahasa Indonesia (2026)",
    datePublished: "2026-06-08",
    dateModified: "2026-06-08",
    keywords:
      "cara buat prompt, prompt terbaik, cara buat prompt ChatGPT, tutorial AI Indonesia, prompt engineering Indonesia, CRISPE framework bahasa Indonesia",
    inLanguage: "id",
  },
  "/blog/best-prompt-for-marketing": {
    routeKey: "article-best-prompt-for-marketing",
    h1: "article-best-prompt-for-marketing",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Marketing: 7 Templates That Convert in 2026 | PromptLab",
    description:
      "How to create the best prompt for marketing: 7 copy-paste AI templates for LinkedIn ads, email subject lines, landing pages, Facebook/Instagram ads, blog outlines, and product copy.",
    canonical: `${SITE}/blog/best-prompt-for-marketing`,
    headline: "Best Prompt for Marketing: 7 Templates That Convert in 2026",
    datePublished: "2026-06-09",
    dateModified: "2026-06-09",
    keywords:
      "best prompt for marketing, marketing prompts, AI marketing templates, ChatGPT marketing, copywriting prompts, LinkedIn ad prompt, email subject line prompt, landing page prompt",
  },
  "/blog/claude-vs-gpt5-vs-gemini-prompting": {
    routeKey: "article-claude-vs-gpt5-vs-gemini-prompting",
    h1: "article-claude-vs-gpt5-vs-gemini-prompting",
    lang: "en",
    ogType: "article",
    title: "Claude vs GPT-5 vs Gemini: Best Prompting Practices for Each | PromptLab",
    description:
      "How to write the best prompt for Claude, GPT-5, and Gemini: model-specific techniques, side-by-side tests, and one unified template that works on all three.",
    canonical: `${SITE}/blog/claude-vs-gpt5-vs-gemini-prompting`,
    headline: "Claude vs GPT-5 vs Gemini: Best Prompting Practices for Each",
    datePublished: "2026-06-10",
    dateModified: "2026-06-10",
    keywords:
      "Claude vs GPT-5, Claude vs Gemini, best prompt for Claude, GPT-5 prompting, Gemini 2.5 Pro prompting, LLM comparison, model-specific prompting, Claude 4.7, GPT-5 prompt guide",
  },
  "/blog/best-prompt-for-image-generation": {
    routeKey: "article-best-prompt-for-image-generation",
    h1: "article-best-prompt-for-image-generation",
    lang: "en",
    ogType: "article",
    title: "How to Write a Prompt for Image Generation (Midjourney, DALL-E, Flux) | PromptLab",
    description:
      "How to write the best prompt for image generation: the 6-part image prompt formula with model-specific tuning for Midjourney, DALL-E, and Flux.",
    canonical: `${SITE}/blog/best-prompt-for-image-generation`,
    headline: "How to Write a Prompt for Image Generation (Midjourney, DALL-E, Flux)",
    datePublished: "2026-06-11",
    dateModified: "2026-06-11",
    keywords:
      "best prompt for image generation, Midjourney prompt, DALL-E prompt, Flux prompt, AI image prompt, image generation prompt formula, Midjourney v7, DALL-E 3, FLUX.2, AI art prompt, image prompt engineering, 6-part image prompt",
  },
  "/blog/best-prompt-for-email-writing": {
    routeKey: "article-best-prompt-for-email-writing",
    h1: "article-best-prompt-for-email-writing",
    lang: "en",
    ogType: "article",
    title: "AI Prompt for Email Writing: 5 Templates That Get Replies | PromptLab",
    description:
      "How to write the best prompt for email writing: 5 copy-paste AI templates for cold outreach, follow-ups, internal updates, sales proposals, and customer support.",
    canonical: `${SITE}/blog/best-prompt-for-email-writing`,
    headline: "AI Prompt for Email Writing: 5 Templates That Get Replies",
    datePublished: "2026-06-12",
    dateModified: "2026-06-12",
    keywords:
      "best prompt for email writing, AI email prompt, cold email prompt, email prompt template, ChatGPT email, Claude email, follow-up email prompt, customer support prompt, sales email prompt, internal update email",
  },
  "/blog/how-to-create-system-prompt": {
    routeKey: "article-how-to-create-system-prompt",
    h1: "article-how-to-create-system-prompt",
    lang: "en",
    ogType: "article",
    title: "How to Create a System Prompt for Custom GPTs (Complete Guide) | PromptLab",
    description:
      "How to create a system prompt for Custom GPTs: persona, scope, output contract, anti-patterns, with a full copy-paste example and model-specific tweaks.",
    canonical: `${SITE}/blog/how-to-create-system-prompt`,
    headline: "How to Create a System Prompt for Custom GPTs (Complete Guide)",
    datePublished: "2026-06-13",
    dateModified: "2026-06-13",
    keywords:
      "how to create a system prompt, Custom GPT system prompt, GPT builder instructions, system prompt engineering, AI persona prompt, ChatGPT system prompt, Claude system prompt, GPT instructions, custom GPT best practices, system prompt anatomy",
  },
  "/blog/best-prompt-for-coding": {
    routeKey: "article-best-prompt-for-coding",
    h1: "article-best-prompt-for-coding",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Coding: Debug Faster and Ship More with AI | PromptLab",
    description:
      "How to write the best prompt for coding: 4 copy-paste AI templates (write, debug, review, refactor) built on the 5-part framework, tested on Claude Code, Cursor, GitHub Copilot, ChatGPT, and Gemini.",
    canonical: `${SITE}/blog/best-prompt-for-coding`,
    headline: "Best Prompt for Coding: Debug Faster and Ship More with AI",
    datePublished: "2026-06-14",
    dateModified: "2026-06-14",
    keywords:
      "best prompt for coding, coding prompt, AI coding, debug prompt, Claude Code prompt, Cursor prompt, GitHub Copilot prompt, programmer prompt, pair programming prompt, LLM coding",
  },
  "/blog/best-prompt-for-data-analysis": {
    routeKey: "article-best-prompt-for-data-analysis",
    h1: "article-best-prompt-for-data-analysis",
    lang: "en",
    ogType: "article",
    title: "How to Write a Prompt for Data Analysis (Step-by-Step)",
    description: "The best prompt for data analysis uses the S.C.A.F. framework: Source, Columns, Aim, Format. Get 4 copy-paste templates and 3 mistakes to avoid.",
    canonical: `${SITE}/blog/best-prompt-for-data-analysis`,
    headline: "How to Write a Prompt for Data Analysis (Step-by-Step)",
    datePublished: "2026-06-15",
    dateModified: "2026-06-15",
    keywords: "best prompt for data analysis, data analysis prompt, AI data prompt, CSV prompt, analytics prompt"
  },
  "/blog/best-prompt-for-sales": {
    routeKey: "article-best-prompt-for-sales",
    h1: "article-best-prompt-for-sales",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Sales: Cold Outreach That Books Meetings",
    description: "The best prompt for sales uses a 5-part framework (role, trigger, value, CTA, format) to write cold emails, follow-ups, and proposals that actually book meetings. 5 copy-paste templates + 3 mistakes.",
    canonical: `${SITE}/blog/best-prompt-for-sales`,
    headline: "Best Prompt for Sales: Cold Outreach That Books Meetings",
    datePublished: "2026-07-02",
    dateModified: "2026-07-02",
    keywords: "best prompt for sales, sales prompt, cold email prompt, outreach prompt, B2B sales prompt, follow-up prompt, discovery call prompt, proposal prompt"
  },
  "/blog/best-prompt-for-resume": {
    routeKey: "article-best-prompt-for-resume",
    h1: "article-best-prompt-for-resume",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Resume Writing: Stand Out in 2026 ATS | PromptLab",
    description: 'The best prompt for resume writing uses the 5-part framework to turn a thin job history into an ATS-optimized 1-pager that lands interviews. 4 copy-paste templates (from-scratch, bullet polish, cover letter, ATS audit) tested on ChatGPT, Claude, and Gemini, plus 3 mistakes that ship a resume straight to the rejection pile — including the LLM-fabricated metric trap that gets caught in the phone screen.',
    canonical: `${SITE}/blog/best-prompt-for-resume`,
    headline: "Best Prompt for Resume Writing: Stand Out in 2026 ATS",
    datePublished: "2026-06-16",
    dateModified: "2026-06-16",
    keywords: 'best prompt for resume, resume prompt, CV prompt, ATS-friendly resume, ChatGPT resume, resume writing AI, AI resume prompt, ATS optimization, resume keywords, job application prompt'
  },
  "/blog/best-prompt-for-social-media": {
    routeKey: "article-best-prompt-for-social-media",
    h1: "article-best-prompt-for-social-media",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Social Media: 8 Templates That Drive Engagement | PromptLab",
    description: "8 drop-in prompts for Instagram captions, LinkedIn posts, Twitter threads, and TikTok scripts.",
    canonical: `${SITE}/blog/best-prompt-for-social-media`,
    headline: "Best Prompt for Social Media: 8 Templates That Drive Engagement",
    datePublished: "2026-06-15",
    dateModified: "2026-06-15",
    keywords: "best prompt for social media, social media prompt, Instagram prompt, LinkedIn prompt, Twitter prompt, TikTok script, AI content templates"
  },
  "/blog/best-prompt-for-storytelling": {
    routeKey: "article-best-prompt-for-storytelling",
    h1: "article-best-prompt-for-storytelling",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Storytelling: 6 Frameworks That Hook Readers | PromptLab",
    description: "How to write the best prompt for storytelling: 6 copy-paste AI frameworks (Save the Cat, Fichtean, Hero's Journey, In Medias Res, Seven-Point, and Pixar's 4-sentence) that turn a one-line idea into a 5-page short story with a hook and payoff. Tested on Claude, ChatGPT, and Gemini.",
    canonical: `${SITE}/blog/best-prompt-for-storytelling`,
    headline: "Best Prompt for Storytelling: 6 Frameworks That Hook Readers",
    datePublished: "2026-06-17",
    dateModified: "2026-06-17",
    keywords: "best prompt for storytelling, story prompt, narrative prompt, fiction prompt, creative writing prompt, Save the Cat prompt, Hero's Journey prompt, In Medias Res prompt, Claude storytelling, ChatGPT story"
  },
  "/blog/best-prompt-for-translation": {
    routeKey: "article-best-prompt-for-translation",
    h1: "article-best-prompt-for-translation",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Translation: Preserve Tone, Not Just Words | PromptLab",
    description: "The best prompt for translation is a localization brief, not a word-swap: 4-part structure (role, scope, input, output) with glossary, tone, and cultural constraints. 4 copy-paste templates for marketing, technical, conversational, and long-form translation tested on Claude, ChatGPT, and Gemini.",
    canonical: `${SITE}/blog/best-prompt-for-translation`,
    headline: "Best Prompt for Translation: Preserve Tone, Not Just Words",
    datePublished: "2026-06-18",
    dateModified: "2026-06-18",
    keywords: "best prompt for translation, translation prompt, multilingual prompt, AI translation, Claude translation, localization prompt, glossary prompt, translation memory, idiom translation, LLM translation"
  },
  "/blog/best-prompt-for-product-description": {
    routeKey: "article-best-prompt-for-product-description",
    h1: "article-best-prompt-for-product-description",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Product Description: Convert Browsers to Buyers | PromptLab",
    description: "The best prompt for product description turns a 3-bullet spec sheet into a 200-word conversion-focused page. 5 copy-paste templates built on AIDA, PAS, and FAB frameworks with 4 common-mistake fixes for ecommerce copy.",
    canonical: `${SITE}/blog/best-prompt-for-product-description`,
    headline: "Best Prompt for Product Description: Convert Browsers to Buyers",
    datePublished: "2026-06-19",
    dateModified: "2026-06-19",
    keywords: "best prompt for product description, product copy prompt, ecommerce prompt, Shopify prompt, ChatGPT product, AIDA, PAS, FAB, product description template"
  },
  "/blog/best-prompt-for-business-plan": {
    routeKey: "article-best-prompt-for-business-plan",
    h1: "article-best-prompt-for-business-plan",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Business Plan: From Idea to Investor-Ready | PromptLab",
    description: "The best prompt for business plan generation turns a half-formed idea into a 10-page investor-ready document. 7-section framework, 4 copy-paste prompts (discovery, master, financials, polish), and the 3 mistakes that kill AI-generated plans in 2026.",
    canonical: `${SITE}/blog/best-prompt-for-business-plan`,
    headline: "Best Prompt for Business Plan: From Idea to Investor-Ready",
    datePublished: "2026-06-20",
    dateModified: "2026-06-20",
    keywords: "best prompt for business plan, business plan prompt, startup prompt, AI business plan, ChatGPT business plan, Claude business plan, investor-ready plan, TAM SAM SOM prompt, financial projection prompt, lean canvas prompt"
  },
  "/blog/best-prompt-for-cover-letter": {
    routeKey: "article-best-prompt-for-cover-letter",
    h1: "article-best-prompt-for-cover-letter",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Cover Letter: Get Past the ATS Robot | PromptLab",
    description: "The best prompt for cover letter uses the A.R.C.S. framework (Audience, Role, Context, Shape) to turn a 1-line job description into a 3-paragraph letter that passes ATS and gets callbacks. 4 copy-paste templates (entry-level, mid-career, career-changer, executive) tested on ChatGPT, Claude, and Gemini, plus 3 mistakes that get AI cover letters rejected by recruiters.",
    canonical: `${SITE}/blog/best-prompt-for-cover-letter`,
    headline: "Best Prompt for Cover Letter: Get Past the ATS Robot",
    datePublished: "2026-06-21",
    dateModified: "2026-06-21",
    keywords: "best prompt for cover letter, cover letter prompt, job application prompt, ChatGPT cover letter, AI cover letter, ATS cover letter, cover letter template, recruiter letter prompt, ARCS framework, cover letter AI"
  },
  "/blog/best-prompt-for-seo": {
    routeKey: "article-best-prompt-for-seo",
    h1: "article-best-prompt-for-seo",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for SEO: Rank on Page 1 in 2026 | PromptLab",
    description: "The best prompt for SEO uses the 5-part S.E.A.R.C.H. framework to turn a single target keyword into a search-intent-matched, AI-Overview-citation-ready article. 4 copy-paste templates (master prompt, rewriter, meta description, content audit) plus the 3 mistakes that get AI SEO content filtered out by the Google Helpful Content Update.",
    canonical: `${SITE}/blog/best-prompt-for-seo`,
    headline: "Best Prompt for SEO: Rank on Page 1 in 2026",
    datePublished: "2026-06-22",
    dateModified: "2026-06-22",
    keywords: "best prompt for SEO, SEO prompt, AI content SEO, ranking prompt, Ahrefs prompt, ChatGPT SEO, AI Overview citation, E-E-A-T prompt, helpful content update, SEO content prompt"
  },
  "/blog/best-prompt-for-youtube-script": {
    routeKey: "article-best-prompt-for-youtube-script",
    h1: "article-best-prompt-for-youtube-script",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for YouTube Script: Hook + Payoff in 8 Minutes | PromptLab",
    description: "The best prompt for YouTube script uses the Hook-Promise-Payoff framework to turn a topic into a 6-12 minute video that holds past the 41.9% average view duration. 4 copy-paste templates (tutorial, story, comparison, listicle), a separate 4-part Shorts prompt, and the 3 mistakes that make AI scripts sound generic.",
    canonical: `${SITE}/blog/best-prompt-for-youtube-script`,
    headline: "Best Prompt for YouTube Script: Hook + Payoff in 8 Minutes",
    datePublished: "2026-06-23",
    dateModified: "2026-06-23",
    keywords: "best prompt for YouTube script, YouTube prompt, video script prompt, ChatGPT video, creator prompt, YouTube script template, hook prompt, Shorts script, retention script, viral video prompt"
  },
  "/blog/best-prompt-for-podcast": {
    routeKey: "article-best-prompt-for-podcast",
    h1: "article-best-prompt-for-podcast",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Podcast: Prep, Prompts, and Shownotes | PromptLab",
    description: "5 prompt templates for podcast prep, guest question research, and 200-word shownotes that boost discoverability — built on a 20-min weekly workflow that replaces 3 hours of work.",
    canonical: `${SITE}/blog/best-prompt-for-podcast`,
    headline: "Best Prompt for Podcast: Prep, Prompts, and Shownotes",
    datePublished: "2026-06-24",
    dateModified: "2026-06-24",
    keywords: "best prompt for podcast, podcast prompt, interview prompt, shownotes prompt, AI podcast, guest research prompt, podcast prep, podcast content prompt, episode planning prompt, social clip prompt"
  },
  "/blog/best-prompt-for-blog-outline": {
    routeKey: "article-best-prompt-for-blog-outline",
    h1: "article-best-prompt-for-blog-outline",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Blog Outline: 5-Minute Article Blueprint | PromptLab",
    description:
      "How to write the best prompt for blog outline: the 4-part master prompt that turns a 1-line topic into a 12-section blog outline with H2/H3 hierarchy, FAQ, and CTA placement. Includes skyscraper + repurposing variants.",
    canonical: `${SITE}/blog/best-prompt-for-blog-outline`,
    headline: "Best Prompt for Blog Outline: 5-Minute Article Blueprint",
    datePublished: "2026-06-25",
    dateModified: "2026-06-25",
    keywords: "best prompt for blog outline, blog outline prompt, article structure prompt, AI writing prompt, content prompt, blog post outline, outline template, ChatGPT outline prompt, Claude outline, SEO outline"
  },
  "/blog/best-prompt-for-summarization": {
    routeKey: "article-best-prompt-for-summarization",
    h1: "article-best-prompt-for-summarization",
    lang: "en",
    ogType: "article",
    title: "Best Prompt for Summarization: Compress Without Losing Meaning | PromptLab",
    description:
      "The best prompt for summarization: a 4-part framework (Role, Source, Compression target, Output format) that turns a 50-page document into a 150-word executive brief that preserves footnotes, hedges, and decision-relevant caveats. Includes Chain of Density.",
    canonical: `${SITE}/blog/best-prompt-for-summarization`,
    headline: "Best Prompt for Summarization: Compress Without Losing Meaning",
        datePublished: "2026-06-26",
        dateModified: "2026-06-26",
        keywords: "best prompt for summarization, summary prompt, tldr prompt, AI summary, Claude summary, document summarization, executive summary prompt, GPT-4 summarization, Gemini summary, chain of density"
      },
      "/blog/best-prompt-for-debugging-code": {
        routeKey: "article-best-prompt-for-debugging-code",
        h1: "article-best-prompt-for-debugging-code",
        lang: "en",
        ogType: "article",
        title: "Best Prompt for Debugging Code: Find Bugs in 5 Minutes | PromptLab",
        description:
          "The best prompt for debugging code is the 5-part structure: Goal, Symptom, Reproduction, Context, Diagnosis. 4 copy-paste templates (stack trace triage, repro, cryptic-error translator, test-driven debugging) that turn a 50-line stack trace into a 3-step fix.",
        canonical: `${SITE}/blog/best-prompt-for-debugging-code`,
        headline: "Best Prompt for Debugging Code: Find Bugs in 5 Minutes",
        datePublished: "2026-06-27",
        dateModified: "2026-06-27",
        keywords:
          "best prompt for debugging code, debug prompt, code review prompt, stack trace prompt, AI debugging, Claude debugging, ChatGPT debugging, AI code review, bug fix prompt, debugging template"
      },
      "/blog/best-prompt-for-code-review": {
        routeKey: "article-best-prompt-for-code-review",
        h1: "article-best-prompt-for-code-review",
        lang: "en",
        ogType: "article",
        title: "Best Prompt for Code Review: Catch Bugs Before They Ship | PromptLab",
        description:
          "The best prompt for code review is a 4-part structure: Context, Diff, Priority list, Output cap. 3 copy-paste diffs (SQL injection, N+1, tautology tests) and the 4 mistakes that make AI reviews worse than none.",
        canonical: `${SITE}/blog/best-prompt-for-code-review`,
        headline: "Best Prompt for Code Review: Catch Bugs Before They Ship",
        datePublished: "2026-06-28",
        dateModified: "2026-06-28",
        keywords: "best prompt for code review, code review prompt, PR review prompt, AI reviewer, Claude code review, AI code review, pull request review prompt, GPT-5 code review, automated code review prompt, code review template"
      },
      "/blog/best-prompt-for-content-rewrite": {
        routeKey: "article-best-prompt-for-content-rewrite",
        h1: "article-best-prompt-for-content-rewrite",
        lang: "en",
        ogType: "article",
        title: "Best Prompt for Content Rewrite: Refresh Without Losing Voice | PromptLab",
        description:
          "The best prompt for content rewrite is a 3-part structure (Original, Voice brief, Protected elements) that turns a stale 2023 article into a 2026-relevant version while keeping the original voice. Includes 4 variants (stat-swap, append, localize) and the 3 mistakes that make AI rewrites sound generic.",
        canonical: `${SITE}/blog/best-prompt-for-content-rewrite`,
        headline: "Best Prompt for Content Rewrite: Refresh Without Losing Voice",
        datePublished: "2026-06-29",
        dateModified: "2026-06-29",
        keywords: "best prompt for content rewrite, rewrite prompt, content refresh prompt, AI rewriter, Claude rewrite, content update prompt, article rewrite, blog refresh, brand voice AI, content optimization prompt"
          },
        "/blog/best-prompt-for-sop": {
        routeKey: "article-best-prompt-for-sop",
        h1: "article-best-prompt-for-sop",
        lang: "en",
        ogType: "article",
        title: "Best Prompt for SOP: Standard Operating Procedure in 30 Minutes | PromptLab",
        description:
          "The best prompt for SOP uses the 5-part R.O.L.E.S. framework to turn a 90-minute process-owner interview into a working SOP. 4 copy-paste templates (blank-slate, rewrite, decision tree, exception pass) tested on Claude, ChatGPT, and Gemini, plus 3 mistakes that flatten AI-generated procedures into shelf documents.",
        canonical: `${SITE}/blog/best-prompt-for-sop`,
        headline: "Best Prompt for SOP: Standard Operating Procedure in 30 Minutes",
        datePublished: "2026-06-30",
        dateModified: "2026-06-30",
        keywords: "best prompt for SOP, SOP prompt, process documentation prompt, AI documentation, Claude SOP, operations prompt, SOP generation, standard operating procedure AI"
          },
      "/blog/best-prompt-for-meeting-notes": {
        routeKey: "article-best-prompt-for-meeting-notes",
        h1: "article-best-prompt-for-meeting-notes",
        lang: "en",
        ogType: "article",
        title: "Best Prompt for Meeting Notes: From Transcript to Action Items | PromptLab",
        description:
          "The best prompt for meeting notes is a 3-part structure (Role + Transcript + Schema) that turns a 1-hour transcript into a 1-page summary with owners, deadlines, and a parking lot. Includes 3 variants (1:1, sprint planning, client calls) and the 4 mistakes that turn transcripts into vague prose.",
        canonical: `${SITE}/blog/best-prompt-for-meeting-notes`,
        headline: "Best Prompt for Meeting Notes: From Transcript to Action Items",
            datePublished: "2026-07-01",
            dateModified: "2026-07-01",
            keywords: "best prompt for meeting notes, meeting notes prompt, AI transcription prompt, action items prompt, Claude notes, meeting summary prompt, AI meeting notes, transcript to action items, executive assistant prompt, meeting minutes AI"
              },
          "/blog/best-prompt-for-linkedin": {
            routeKey: "article-best-prompt-for-linkedin",
            h1: "article-best-prompt-for-linkedin",
            lang: "en",
            ogType: "article",
            title: "Best Prompt for LinkedIn: Posts That Get 10K Impressions | PromptLab",
            description:
              "The best prompt for LinkedIn is a 5-part structure (Hook + POV + Story + Lesson + CTA) that turns a one-line idea into a post that gets 10K+ impressions. Includes 5 copy-paste templates (founders, B2B sales, job seekers, personal brand, carousel) and the 3 mistakes that get you scrolled past.",
            canonical: `${SITE}/blog/best-prompt-for-linkedin`,
            headline: "Best Prompt for LinkedIn: Posts That Get 10K Impressions",
            datePublished: "2026-07-03",
            dateModified: "2026-07-03",
            keywords: "best prompt for LinkedIn, LinkedIn prompt, LinkedIn post prompt, B2B prompt, AI LinkedIn, LinkedIn carousel prompt, LinkedIn hook, viral LinkedIn post, Claude LinkedIn prompt, ChatGPT LinkedIn prompt, founder post prompt, personal brand prompt"
              },
            "/blog/best-prompt-for-customer-support": {
              routeKey: "article-best-prompt-for-customer-support",
              h1: "article-best-prompt-for-customer-support",
              lang: "en",
              ogType: "article",
              title: "Best Prompt for Customer Support: Faster Replies, Happier Customers | PromptLab",
              description:
                "The best prompt for customer support combines a tight base system prompt with 5 ticket-type templates (first reply, billing dispute, de-escalation, proactive outreach, handoff summary). Includes the 4 ingredients every support prompt needs and the 5 mistakes that ruin replies in production.",
              canonical: `${SITE}/blog/best-prompt-for-customer-support`,
              headline: "Best Prompt for Customer Support: Faster Replies, Happier Customers",
              datePublished: "2026-07-04",
              dateModified: "2026-07-04",
              keywords: "best prompt for customer support, support prompt, AI customer service, Claude support, helpdesk prompt, customer service AI prompt, refund dispute prompt, escalation prompt, support ticket prompt, empathy prompt, customer reply template"
                              },
                          "/blog/best-prompt-for-productivity": {
                            routeKey: "article-best-prompt-for-productivity",
                            h1: "article-best-prompt-for-productivity",
                            lang: "en",
                            ogType: "article",
                            title: "Best Prompt for Productivity: 10 Daily AI Workflows | PromptLab",
                            description:
                              "The best prompt for productivity is a small library of structured templates, not one mega-prompt. Includes 10 copy-paste daily AI workflows (inbox triage, daily plan, meeting prep, research digest, shutdown), the Role + Raw Material + Output Shape recipe, and the 3 mistakes that derail productivity prompts.",
                            canonical: `${SITE}/blog/best-prompt-for-productivity`,
                            headline: "Best Prompt for Productivity: 10 Daily AI Workflows",
                            datePublished: "2026-07-05",
                            dateModified: "2026-07-05",
                            keywords: "best prompt for productivity, productivity prompt, AI workflow, daily AI, ChatGPT workflow, Claude productivity, morning routine prompt, inbox triage prompt, meeting prep prompt, weekly review prompt, time blocking prompt"
                              },
                          "/blog/best-prompt-for-tutoring": {
                            routeKey: "article-best-prompt-for-tutoring",
                            h1: "article-best-prompt-for-tutoring",
                            lang: "en",
                            ogType: "article",
                            title: "Best Prompt for Tutoring: Learn Anything in 30 Days | PromptLab",
                            description:
                              "The best prompt for tutoring is a 4-part structure (Role + Learner State + Pedagogical Method + Session Contract) that turns an LLM into a 30-day personal tutor for any subject. Includes a base tutor system prompt, daily session template, 30-day curriculum scaffold, Feynman teach-back prompt, and the 3 mistakes that flatten a tutor into a Google replacement.",
                            canonical: `${SITE}/blog/best-prompt-for-tutoring`,
                            headline: "Best Prompt for Tutoring: Learn Anything in 30 Days",
                            datePublished: "2026-07-06",
                            dateModified: "2026-07-06",
                            keywords: "best prompt for tutoring, tutoring prompt, learning prompt, AI tutor, study prompt, Feynman technique, spaced repetition, active recall, 30-day curriculum, Claude tutor, ChatGPT tutor"
                              },
                          "/blog/best-prompt-for-negotiation": {
                            routeKey: "article-best-prompt-for-negotiation",
                            h1: "article-best-prompt-for-negotiation",
                            lang: "en",
                            ogType: "article",
                            title: "Best Prompt for Negotiation: Get the Deal Without the Back-and-Forth | PromptLab",
                            description:
                              "The best prompt for negotiation uses a 4-part framework (Context, Ask, Constraints, Output Format) to turn a counter-offer email, vendor renewal, scope-creep request, or partnership split into a 3-step script with walk-away anchors. 4 copy-paste templates + 3 mistakes that make AI sound recruiter-oblivious.",
                            canonical: `${SITE}/blog/best-prompt-for-negotiation`,
                            headline: "Best Prompt for Negotiation: Get the Deal Without the Back-and-Forth",
                            datePublished: "2026-07-07",
                            dateModified: "2026-07-07",
                            keywords: "best prompt for negotiation, negotiation prompt, salary prompt, AI negotiation, Claude negotiation, counter-offer prompt, vendor renewal prompt, scope creep prompt, partnership prompt, BATNA prompt"
                              },
                            "/blog/best-prompt-for-research": {
                            routeKey: "article-best-prompt-for-research",
                            h1: "article-best-prompt-for-research",
                            lang: "en",
                            ogType: "article",
                            title: "Best Prompt for Research: Turn AI Into a Literature Scout | PromptLab",
                            description:
                              "The best prompt for research is a 4-part structure (Role + Scope + Sources + Output) that turns vague questions into a sourced literature note with gaps, counterpoints, and follow-up queries. 3 worked examples (academic, market, policy) + 3 mistakes that make AI invent citations.",
                            canonical: `${SITE}/blog/best-prompt-for-research`,
                            headline: "Best Prompt for Research: Turn AI Into a Literature Scout",
                            datePublished: "2026-07-10",
                            dateModified: "2026-07-10",
                            keywords: "best prompt for research, research prompt, AI research assistant, literature review prompt, deep research prompt, Claude research, ChatGPT research, Gemini research, source-grounded prompt, citation prompt"
                              },
                            "/blog/best-prompt-for-interview-prep": {
                            routeKey: "article-best-prompt-for-interview-prep",
                            h1: "article-best-prompt-for-interview-prep",
                            lang: "en",
                            ogType: "article",
                            title: "Best Prompt for Interview Prep: Practice Answers That Sound Like You | PromptLab",
                            description:
                              "The best prompt for interview prep uses a 4-part framework (Role, Context, Task, Output) to turn AI into a mock interviewer, STAR story builder, and weak-answer stress test. 5 copy-paste templates + 3 mistakes that keep your prep generic.",
                            canonical: `${SITE}/blog/best-prompt-for-interview-prep`,
                            headline: "Best Prompt for Interview Prep: Practice Answers That Sound Like You",
                            datePublished: "2026-07-11",
                            dateModified: "2026-07-11",
                            keywords: "best prompt for interview prep, interview prompt, job interview AI, STAR method prompt, mock interview prompt, behavioral interview AI, Claude interview, ChatGPT interview, interview practice prompt, job prep AI"
                              }
                          };

export const BLOG_PATHS = Object.keys(SEO_ROUTES).filter((p) => p === "/blog" || p.startsWith("/blog/"));

export function slugFromPath(path) {
  return path === "/blog" ? "" : path.replace(/^\/blog\//, "");
}
