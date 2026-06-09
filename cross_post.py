#!/usr/bin/env python3
"""
Cross-post PromptLab articles to Medium, Dev.to, Twitter, and IndexNow.

Usage:
    python cross_post.py <article-slug>
    python cross_post.py <article-slug> --platforms medium,devto,twitter,indexnow
    python cross_post.py <article-slug> --platforms devto --publish

Generates ready-to-paste content for Medium/Twitter, and auto-publishes to
Dev.to via their API. IndexNow is auto-submitted for instant indexing.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROMPT_LAB_DIR = SCRIPT_DIR  # when run from tmp-promptlab/
INDEX_HTML = PROMPT_LAB_DIR / "index.html"
STATE_FILE = PROMPT_LAB_DIR / "promptlab_articles_state.json"
OUTPUT_DIR = PROMPT_LAB_DIR / "cross-post"
SITEMAP = PROMPT_LAB_DIR / "public" / "sitemap.xml"
ENV_FILE = Path.home() / ".hermes" / ".env"


def load_env():
    """Load DEVTO_API_KEY and INDEXNOW_KEY from ~/.hermes/.env"""
    if not ENV_FILE.exists():
        return
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def get_article_data(slug: str) -> dict:
    """Extract title, description, body from index.html for given article slug."""
    if not INDEX_HTML.exists():
        sys.exit(f"ERROR: {INDEX_HTML} not found")

    html = INDEX_HTML.read_text(encoding="utf-8")

    # Find the article section. Marker formats observed in index.html:
    #   <!-- ============================== ARTICLE: SLUG HUMAN FORM ============================== -->
    #   e.g. <!-- ============================== ARTICLE: CARA BUAT PROMPT CHATGPT ============================== -->
    # The marker uses a HUMAN FORM (uppercase, spaces) that may differ from the
    # URL slug (lowercase, dashes). Normalize both to a comparable form.
    def _normalize_for_match(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", s.lower())

    target = _normalize_for_match(slug)
    all_markers = list(re.finditer(r"<!--\s*=+\s*ARTICLE:\s*([^=]+?)\s*=+\s*-->", html))
    open_m = None
    for m in all_markers:
        marker_label = m.group(1).strip()
        if _normalize_for_match(marker_label) == target:
            open_m = m
            break
    if not open_m:
        sample = ", ".join(repr(m.group(1).strip()) for m in all_markers[:5])
        sys.exit(f"ERROR: article '{slug}' not found in index.html. Found markers: {sample}")
    start = open_m.end()
    # No explicit close marker in current file format — take until next ARTICLE marker
    next_art = re.search(r"<!--\s*=+\s*ARTICLE:\s*\w", html[start:])
    body_html = html[start:start + next_art.start()] if next_art else html[start:]

    # Trim to the actual <article> body — skip navbar / article-header / breadcrumbs
    # which are duplicated in Dev.to's own chrome.
    article_start = body_html.find("<article")
    if article_start > 0:
        body_html = body_html[article_start:]
    article_end = body_html.find("</article>")
    if article_end > 0:
        body_html = body_html[: article_end + len("</article>")]

    # Find JSON-LD BlogPosting entry for this article using brace-walking.
    # Strategy: find this article's URL, then find the nearest preceding
    # "@type": "BlogPosting" (which lives inside the same object), then walk
    # back to the object's opening { and forward to its matching }.
    url_marker = f'"url":\\s*"https://prompt-lab.xyz/blog/{slug}"'
    url_pos = re.search(url_marker, html)
    jsonld_text = None
    if url_pos:
        # Find the BlogPosting @type that comes before this URL but after any
        # outer array opener. Search backward for "@type": "BlogPosting".
        blogposting_pos = html.rfind('"@type": "BlogPosting"', 0, url_pos.start())
        if blogposting_pos > 0:
            obj_start = html.rfind('{', 0, blogposting_pos)
            depth = 0
            in_string = False
            escape = False
            obj_end = None
            for j in range(obj_start, len(html)):
                c = html[j]
                if escape:
                    escape = False
                    continue
                if c == chr(92):
                    escape = True
                    continue
                if c == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        obj_end = j
                        break
            if obj_end:
                candidate = html[obj_start:obj_end+1]
                try:
                    parsed = json.loads(candidate)
                    if parsed.get('@type') == 'BlogPosting':
                        jsonld_text = candidate
                except Exception:
                    pass

    title = "Untitled"
    description = ""
    date_published = datetime.now().strftime("%Y-%m-%d")
    keywords = []
    in_language = "en"

    if jsonld_text:
        try:
            data = json.loads(jsonld_text)
            title = data.get("headline", title)
            description = data.get("description", "")
            date_published = data.get("datePublished", date_published)[:10]
            keywords = data.get("keywords", "").split(", ") if data.get("keywords") else []
            in_language = data.get("inLanguage", "en")
        except json.JSONDecodeError:
            pass

    return {
        "slug": slug,
        "title": title,
        "description": description,
        "body_html": body_html,
        "url": f"https://prompt-lab.xyz/blog/{slug}",
        "date_published": date_published,
        "keywords": keywords,
        "in_language": in_language,
    }


def html_to_markdown(html: str) -> str:
    """Convert simple article HTML to markdown for Medium/Dev.to."""
    text = html

    # H1 → skip (title is in frontmatter)
    text = re.sub(r'<h1[^>]*>.*?</h1>', '', text, flags=re.DOTALL)

    # H2 → ##
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1', text, flags=re.DOTALL)
    # H3 → ###
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1', text, flags=re.DOTALL)

    # Code blocks
    text = re.sub(r'<pre[^>]*><code[^>]*>(.*?)</code></pre>', r'```\n\1\n```', text, flags=re.DOTALL)

    # Inline code
    text = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', text, flags=re.DOTALL)

    # Bold
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL)

    # Italic
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL)

    # Links
    text = re.sub(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.DOTALL)

    # Tip-box (callout)
    text = re.sub(r'<div class="tip-box"[^>]*>(.*?)</div>', lambda m: f'> **💡 Tip:** {re.sub(r"<[^>]+>", "", m.group(1)).strip()}', text, flags=re.DOTALL)

    # Lists
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', text, flags=re.DOTALL)
    text = re.sub(r'</?(ul|ol)[^>]*>', '', text)

    # Paragraphs
    text = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', text, flags=re.DOTALL)

    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Decode common entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')

    # Collapse blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def write_medium(article: dict):
    """Generate Medium-import-ready markdown."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    body = html_to_markdown(article["body_html"])
    footer = f"\n\n---\n\n*Originally published at [{article['title']}]({article['url']}).*\n*Follow PromptLab for more practical prompt engineering guides.*\n"

    content = f"# {article['title']}\n\n{subtitle_line(article)}{body}{footer}"

    out = OUTPUT_DIR / f"{article['slug']}_medium.md"
    out.write_text(content, encoding="utf-8")
    print(f"  [medium] -> {out} ({len(content)} chars)")


def subtitle_line(article: dict) -> str:
    if article["description"]:
        return f"*{article['description']}*\n\n"
    return ""


def write_twitter(article: dict):
    """Generate a 3-tweet thread for Twitter/X."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    title = article["title"]
    url = article["url"]
    desc = article["description"][:200]

    tweets = [
        f"1/ {title}\n\n{desc}\n\n{url}",
        f"2/ Ingin prompt yang lebih baik dari AI? Cek panduan ini — framework CRISPE 6-bagian + 8 template siap pakai yang bisa langsung lo copy-paste.\n\n{url}",
        f"3/ Bonus: 5 kesalahan umum yang sering bikin output AI lo 'meh' — dan cara fix-nya dalam 5 menit.\n\n#promptengineering #AI #ChatGPT",
    ]

    content = "\n\n---\n\n".join(tweets)
    out = OUTPUT_DIR / f"{article['slug']}_twitter.txt"
    out.write_text(content, encoding="utf-8")
    print(f"  [twitter] -> {out} ({len(tweets)} tweets)")


def write_devto_markdown(article: dict):
    """Generate Dev.to-ready markdown (separate file for Dev.to)."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    body = html_to_markdown(article["body_html"])
    tags = ["ai", "promptengineering", "chatgpt", "tutorial", "indonesia"] if article["in_language"] == "id" else ["ai", "promptengineering", "chatgpt", "tutorial", "llm"]
    tags = tags[:4]  # Dev.to max 4 tags
    tags_str = ", ".join(tags)

    content = f"---\ntitle: {article['title']}\npublished: {article['date_published']}\ndescription: {article['description']}\ntags: {tags_str}\ncanonical_url: {article['url']}\ncover_image: https://prompt-lab.xyz/og-image.png\n---\n\n{body}\n\n---\n\n*Originally published at [{article['title']}]({article['url']}).*"

    out = OUTPUT_DIR / f"{article['slug']}_devto.md"
    out.write_text(content, encoding="utf-8")
    print(f"  [devto-md] -> {out} ({len(content)} chars, tags: {tags_str})")
    return out


def publish_devto(article: dict, api_key: str) -> dict:
    """Publish article to Dev.to via API (uses pre-generated _devto.md)."""
    md_file = OUTPUT_DIR / f"{article['slug']}_devto.md"
    if not md_file.exists():
        write_devto_markdown(article)
    body = md_file.read_text(encoding="utf-8")

    # Parse frontmatter
    fm_match = re.match(r"^---\n(.*?)\n---\n(.*)$", body, re.DOTALL)
    if not fm_match:
        return {"error": "no frontmatter parsed"}
    front, article_body = fm_match.groups()

    title_m = re.search(r"title:\s*(.+)", front)
    desc_m = re.search(r"description:\s*(.+)", front)
    tags_m = re.search(r"tags:\s*(.+)", front)
    canon_m = re.search(r"canonical_url:\s*(.+)", front)

    title = title_m.group(1).strip() if title_m else article["title"]
    description = desc_m.group(1).strip() if desc_m else article["description"]
    tags = [t.strip() for t in tags_m.group(1).split(",")] if tags_m else ["ai", "tutorial"]
    canonical_url = canon_m.group(1).strip() if canon_m else article["url"]

    payload = {
        "article": {
            "title": title,
            "body_markdown": article_body,
            "published": True,
            "description": description,
            "tags": tags[:4],
            "canonical_url": canonical_url,
        }
    }

    req = urllib.request.Request(
        "https://dev.to/api/articles",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "User-Agent": "PromptLab-CrossPost/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "success": True,
                "id": data.get("id"),
                "url": data.get("url"),
                "title": data.get("title"),
            }
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8")[:500]}
    except urllib.error.URLError as e:
        return {"error": f"URL error: {e.reason}"}


def submit_indexnow(urls: list):
    """Submit URLs to IndexNow for instant indexing."""
    api_key = os.environ.get("INDEXNOW_KEY", "")
    if not api_key:
        return {"error": "INDEXNOW_KEY not set in env"}

    payload = {"host": "prompt-lab.xyz", "key": api_key, "keyLocation": f"https://prompt-lab.xyz/{api_key}.txt", "urlList": urls}

    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"success": True, "status": resp.status, "urls": urls}
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8")[:300]}


def main():
    parser = argparse.ArgumentParser(description="Cross-post PromptLab articles")
    parser.add_argument("slug", help="Article slug (e.g. cara-buat-prompt-chatgpt)")
    parser.add_argument("--platforms", default="medium,twitter,indexnow", help="Comma-separated: medium, twitter, devto, indexnow")
    parser.add_argument("--publish", action="store_true", help="Auto-publish to platforms (vs only generate drafts)")
    args = parser.parse_args()

    load_env()

    print(f"📰 Cross-post: {args.slug}")
    print(f"   Platforms:  {args.platforms}")
    print(f"   Publish:    {args.publish}")
    print()

    article = get_article_data(args.slug)
    print(f"   Title:      {article['title']}")
    print(f"   URL:        {article['url']}")
    print(f"   Language:   {article['in_language']}")
    print()

    platforms = [p.strip() for p in args.platforms.split(",")]
    results = {}

    if "medium" in platforms:
        write_medium(article)
        results["medium"] = "draft saved"
    if "twitter" in platforms:
        write_twitter(article)
        results["twitter"] = "draft saved"
    if "devto" in platforms:
        if args.publish and os.environ.get("DEVTO_API_KEY"):
            res = publish_devto(article, os.environ["DEVTO_API_KEY"])
            if res.get("success"):
                results["devto"] = f"✅ published: {res.get('url')}"
            else:
                results["devto"] = f"❌ {res.get('error', res)}"
                write_devto_markdown(article)
        else:
            write_devto_markdown(article)
            results["devto"] = "draft saved (use --publish to auto-submit)"
    if "indexnow" in platforms:
        res = submit_indexnow([article["url"]])
        if res.get("success"):
            results["indexnow"] = f"✅ submitted {res.get('status')}"
        else:
            results["indexnow"] = f"❌ {res.get('error', res)}"

    print()
    print("=" * 60)
    for p, r in results.items():
        print(f"  {p:10s} : {r}")


if __name__ == "__main__":
    main()
