import React from "react";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#061011", color: "#e2e8f0", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", padding: "80px 24px" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 20%, rgba(56,189,248,0.12), transparent 45%), radial-gradient(circle at 72% 12%, rgba(99,102,241,0.10), transparent 38%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 999, padding: "6px 16px", fontSize: 13, color: "#38bdf8", marginBottom: 24, fontWeight: 500 }}>⚡ Free to use — no credit card required</div>
          <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20, background: "linear-gradient(135deg, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>The Cleanest Prompt,<br />Before You Hit Run</h1>
          <p style={{ fontSize: "1.2rem", color: "#94a3b8", maxWidth: 580, marginBottom: 40 }}>Turn rough ideas into structured, model-ready prompts for ChatGPT, Claude, Gemini, Grok, and Midjourney. Scored, optimized, and comparison-tested.</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: "none", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "#fff", transition: "opacity 0.2s" }}>Start Building Prompts →</a>
            <a href="#features" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: "none", background: "#0d1a1d", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.06)" }}>See How It Works</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginTop: 60, flexWrap: "wrap" }}>
            {["ChatGPT", "Claude", "Gemini", "Grok", "Midjourney"].map(ai => (
              <span key={ai} style={{ fontSize: 14, color: "#94a3b8", opacity: 0.6, fontWeight: 500 }}>{ai}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "2.2rem", fontWeight: 700, marginBottom: 12 }}>Everything You Need to Prompt Better</h2>
          <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: 60, fontSize: "1.05rem" }}>Six tools in one workspace — from first draft to production-ready prompt.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {[
              { icon: "🧱", title: "Builder", desc: "Describe what you need in plain language. Pick a category, tone, target AI, and output type. Get a structured, copy-ready prompt in seconds." },
              { icon: "⚡", title: "Optimizer", desc: "Paste an existing prompt and refine it. Choose Clearer, Shorter, More Detailed, or domain-specific modes." },
              { icon: "📐", title: "Readiness Score", desc: "Every prompt is scored on Clarity, Context, Format, Constraints, and Actionability — know exactly where to improve." },
              { icon: "📋", title: "Templates", desc: "Start from production-ready prompt patterns for Marketing, Coding, Academic, Business, Content Creator, and Image AI." },
              { icon: "📚", title: "Library", desc: "Save your best prompts, organize by folder, search instantly, and reuse them across projects." },
              { icon: "⚖️", title: "Compare", desc: "Side-by-side evaluation of two prompts. Scored on 6 dimensions with bias mitigation." },
            ].map((f, i) => (
              <div key={i} style={{ background: "#0d1a1d", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32, transition: "all 0.25s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 16, background: "rgba(56,189,248,0.1)" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" style={{ padding: "100px 24px", background: "linear-gradient(180deg, transparent, rgba(56,189,248,0.03), transparent)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "2.2rem", fontWeight: 700, marginBottom: 60 }}>From Idea to Perfect Prompt in 3 Steps</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
            {[
              { num: 1, title: "Describe Your Goal", desc: "Write what you want in plain language. Attach files, screenshots, or documents for context." },
              { num: 2, title: "Pick Your Settings", desc: "Choose category, tone, target AI, and output type. The engine auto-detects your domain." },
              { num: 3, title: "Generate & Copy", desc: "Get a structured prompt with role, context, task, constraints, and acceptance criteria." },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "#fff", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{s.num}</div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain Packs */}
      <section id="domains" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 700, marginBottom: 12 }}>17 Domain Packs — prompts tailored to your industry</h2>
          <p style={{ color: "#94a3b8", marginBottom: 48 }}>The engine detects your domain and adds expert-level context automatically.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            {["Marketing", "Social Media", "E-Commerce", "Legal & Compliance", "Finance", "Education", "Healthcare", "HR & People Ops", "Data Analytics", "Customer Support", "UX Research", "Video & Podcast", "Coding", "Creative / Image AI", "Academic", "Presentations", "Documents & Reports"].map(d => (
              <span key={d} style={{ background: "#0d1a1d", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999, padding: "8px 18px", fontSize: 14, color: "#94a3b8", whiteSpace: "nowrap" }}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.4rem", fontWeight: 700, marginBottom: 16 }}>Stop Writing Weak Prompts</h2>
          <p style={{ color: "#94a3b8", marginBottom: 36, fontSize: "1.1rem" }}>Join creators, marketers, students, and teams who build better prompts with PromptLab.</p>
          <a href="/app" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: "none", background: "linear-gradient(135deg, #38bdf8, #6366f1)", color: "#fff" }}>Try PromptLab Free →</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p>© 2026 PromptLab. Built with care. &nbsp; <a href="/privacy" style={{ color: "#38bdf8", textDecoration: "none" }}>Privacy Policy</a></p>
      </footer>
    </div>
  );
}
