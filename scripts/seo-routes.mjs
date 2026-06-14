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
    datePublished: "2026-06-14",
    dateModified: "2026-06-14",
    keywords: "best prompt for data analysis, data analysis prompt, AI data prompt, CSV prompt, analytics prompt"
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
    datePublished: "2026-06-14",
    dateModified: "2026-06-14",
    keywords: "best prompt for data analysis, data analysis prompt, AI data prompt, CSV prompt, analytics prompt"
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
    datePublished: "2026-06-14",
    dateModified: "2026-06-14",
    keywords: "best prompt for data analysis, data analysis prompt, AI data prompt, CSV prompt, analytics prompt"
  },
};

export const BLOG_PATHS = Object.keys(SEO_ROUTES).filter((p) => p === "/blog" || p.startsWith("/blog/"));

export function slugFromPath(path) {
  return path === "/blog" ? "" : path.replace(/^\/blog\//, "");
}
