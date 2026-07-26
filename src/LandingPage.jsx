import { useEffect } from "react";
import { MEMBERSHIP_MARKETING } from "./planEntitlements.js";
import { dismissStartupSplash } from "./startupSplash";

/**
 * Marketing page for "/".
 *
 * Copy rule: every claim here has to be true of the shipped app. The previous
 * version advertised "six tools", "production-ready" patterns, a "Perfect
 * Prompt", automatic expert-level domain context, and unconditional bias
 * mitigation — none of which the product delivers as stated, and all of which
 * are misrepresentation risk on the store listing.
 *
 * Styling uses the shared tokens so the marketing page and the app read as one
 * product in both light and dark.
 */

const S = {
  page: {
    fontFamily: "var(--font-ui)",
    background: "var(--paper)",
    color: "var(--ink)",
    minHeight: "100vh",
    overflowX: "hidden",
  },
  section: { padding: "88px 24px" },
  wrap: { maxWidth: 960, margin: "0 auto" },
  h2: {
    fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    marginBottom: 12,
  },
  lede: { color: "var(--ink-mute)", fontSize: "1.05rem", lineHeight: 1.6 },
  card: {
    background: "var(--paper-raised)",
    border: "1px solid var(--rule)",
    borderRadius: "var(--r-md)",
    padding: 26,
  },
  primary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 28px",
    borderRadius: "var(--r)",
    fontSize: 16,
    fontWeight: 600,
    textDecoration: "none",
    background: "var(--accent)",
    color: "var(--accent-ink)",
  },
  secondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 28px",
    borderRadius: "var(--r)",
    fontSize: 16,
    fontWeight: 500,
    textDecoration: "none",
    background: "var(--paper-raised)",
    color: "var(--ink)",
    border: "1px solid var(--rule-strong)",
  },
};

const WHAT_IT_DOES = [
  {
    title: "Start from what you already have",
    desc: "Type a request, or attach photos, screenshots, PDF, Word, Excel, and PowerPoint files. Text is read out of the file and used as context.",
  },
  {
    title: "Get the finished work",
    desc: "PromptLab reads the request and its context, then writes the report, content, analysis, slide outline, or code directly in the app.",
  },
  {
    title: "Stay in one workspace",
    desc: "There is nothing to copy into another AI tool. The result appears here, ready to review, save, or continue.",
  },
  {
    title: "Improve it in place",
    desc: "Ask for a clearer, shorter, or more detailed version, then compare it against what you had before deciding which one to keep.",
  },
  {
    title: "Download as Word or PowerPoint",
    desc: "Export a result to .docx or .pptx on a paid plan, so it lands somewhere you can actually send it.",
  },
  {
    title: "Keep what worked",
    desc: "Save results to your history, search them, and reuse them. Signed in, history follows you across devices.",
  },
  {
    title: "See a readiness estimate",
    desc: "Each result gets an automated completeness estimate across context, format, constraints, and actionability. It is a guide, not a guarantee.",
  },
];

const STEPS = [
  {
    num: 1,
    title: "Describe it, or attach it",
    desc: "Plain language is enough. Attach a file when the detail lives there.",
  },
  {
    num: 2,
    title: "Create",
    desc: "Sensible defaults are already chosen. Adjust the target AI or output form under Advanced only if you want to.",
  },
  {
    num: 3,
    title: "Use it",
    desc: "Copy it, improve it, save it, or download it as a document.",
  },
];

export default function LandingPage() {
  useEffect(() => {
    dismissStartupSplash();
  }, []);

  return (
    <div style={S.page}>
      <section
        style={{
          ...S.section,
          minHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <p
            style={{
              display: "inline-block",
              border: "1px solid var(--accent-line)",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 24,
            }}
          >
            Free to start — no card required
          </p>
          <h1
            style={{
              fontSize: "clamp(2.1rem, 5.5vw, 3.4rem)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            From rough notes
            <br />
            to a finished draft
          </h1>
          <p style={{ ...S.lede, fontSize: "1.15rem", marginBottom: 36 }}>
            PromptLab turns your idea, photos, and files directly into written work you can review,
            save, and continue without leaving the app.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/app" style={S.primary}>
              Open PromptLab
            </a>
            <a href="#what" style={S.secondary}>
              See what it does
            </a>
          </div>
        </div>
      </section>

      <section id="what" style={S.section}>
        <div style={S.wrap}>
          <h2 style={{ ...S.h2, textAlign: "center" }}>What it actually does</h2>
          <p style={{ ...S.lede, textAlign: "center", marginBottom: 48 }}>
            One workspace. Write on the left of the flow, read the result on the right of it.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {WHAT_IT_DOES.map((item) => (
              <div key={item.title} style={S.card}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>
                  {item.title}
                </h3>
                <p style={{ color: "var(--ink-mute)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ ...S.section, background: "var(--paper-sunken)" }}>
        <div style={{ ...S.wrap, maxWidth: 820 }}>
          <h2 style={{ ...S.h2, textAlign: "center", marginBottom: 48 }}>Three steps</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
            }}
          >
            {STEPS.map((step) => (
              <div key={step.num} style={{ textAlign: "center" }}>
                <p
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontSize: 18,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                  }}
                >
                  {step.num}
                </p>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 }}>
                  {step.title}
                </h3>
                <p style={{ color: "var(--ink-mute)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" style={S.section}>
        <div style={S.wrap}>
          <h2 style={{ ...S.h2, textAlign: "center" }}>Pricing</h2>
          <p style={{ ...S.lede, textAlign: "center", marginBottom: 40 }}>
            Start free. Upgrade from inside the app when you need exports, priority OCR, and higher
            limits.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 18,
            }}
          >
            {Object.entries(MEMBERSHIP_MARKETING).map(([plan, meta]) => (
              <div
                key={plan}
                style={{
                  ...S.card,
                  borderColor: plan === "Pro" ? "var(--accent-line)" : "var(--rule)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{plan}</span>
                <strong style={{ display: "block", fontSize: "1.5rem", margin: "10px 0 8px" }}>
                  {meta.price}
                </strong>
                <p style={{ color: "var(--ink-mute)", fontSize: "0.95rem", minHeight: 46 }}>
                  {meta.detail}
                </p>
                <ul
                  style={{
                    margin: "16px 0 0",
                    paddingLeft: 18,
                    listStyle: "disc",
                    color: "var(--ink-2)",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {meta.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...S.section, textAlign: "center" }}>
        <div style={S.wrap}>
          <h2 style={S.h2}>Try it on something you are working on now</h2>
          <p style={{ ...S.lede, marginBottom: 32 }}>
            The first few results are free, and you do not need an account to see one.
          </p>
          <a href="/app" style={S.primary}>
            Open PromptLab
          </a>
        </div>
      </section>

      <footer
        style={{
          padding: "36px 24px",
          textAlign: "center",
          color: "var(--ink-mute)",
          fontSize: 14,
          borderTop: "1px solid var(--rule)",
        }}
      >
        <p>
          © 2026 PromptLab ·{" "}
          <a href="/privacy" style={{ color: "var(--accent)" }}>
            Privacy
          </a>{" "}
          ·{" "}
          <a href="/terms" style={{ color: "var(--accent)" }}>
            Terms
          </a>
        </p>
      </footer>
    </div>
  );
}
