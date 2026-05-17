// templates.jsx — gallery of prompt templates

const TEMPLATE_CATS = ["All", "Marketing", "Content", "Business", "Coding", "Academic", "Image AI"];

const TEMPLATES = [
  { cat: "Marketing", name: "Cold outbound email", body: "Personalized 3-touch sequence for B2B SaaS founders selling to mid-market.", uses: "2.4k", time: "30s", glyph: 0, featured: true, model: "Claude" },
  { cat: "Content",   name: "Long-form blog brief", body: "SEO-aligned outline with H2/H3 tree, target keywords, and internal links.", uses: "1.8k", time: "45s", glyph: 1, model: "GPT-4o" },
  { cat: "Image AI",  name: "Studio product shot", body: "Photoreal product render with lighting recipe, lens, and negative prompt.", uses: "3.1k", time: "20s", glyph: 2, model: "Midjourney" },
  { cat: "Coding",    name: "SQL to plain English", body: "Audit-grade explanation of a complex query — line by line, no jargon.", uses: "920", time: "25s", glyph: 3, model: "Claude" },
  { cat: "Business",  name: "Strategy memo (1-pager)", body: "BLUF-format memo with decision, rationale, risks, and asks. Exec-ready.", uses: "1.2k", time: "60s", glyph: 0, model: "Claude" },
  { cat: "Academic",  name: "Literature review scaffold", body: "Themed synthesis with gap analysis and 12 citation slots ready to fill.", uses: "640", time: "50s", glyph: 1, model: "GPT-4o" },
  { cat: "Marketing", name: "Launch announcement deck", body: "10-slide skeleton: problem → solution → demo → pricing → roadmap.", uses: "1.5k", time: "75s", glyph: 2, model: "Claude" },
  { cat: "Coding",    name: "Code review companion", body: "Walks a diff, flags risks, suggests test cases, with severity tags.", uses: "880", time: "35s", glyph: 3, model: "Claude" },
  { cat: "Content",   name: "Newsletter weekly digest", body: "5 sections, hook + recap + recommendation, written in your voice.", uses: "1.1k", time: "40s", glyph: 0, model: "GPT-4o" },
];

function Templates() {
  const [active, setActive] = React.useState("All");

  const filtered = active === "All" ? TEMPLATES : TEMPLATES.filter(t => t.cat === active);
  const featured = TEMPLATES.find(t => t.featured);

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Templates <em>·</em> instant scaffolds</h1>
          <p>Production-grade prompts, vetted by the PromptLab team. Use as-is or fork into your own library.</p>
        </div>
        <div className="right">
          <button className="btn ghost"><I.Filter size={14} /> Filter</button>
          <button className="btn primary"><I.Plus size={14} /> Create template</button>
        </div>
      </div>

      {/* Featured */}
      <section
        style={{
          padding: 28,
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--line-soft)",
          background:
            "radial-gradient(ellipse at 90% 10%, var(--ac-soft), transparent 55%), " +
            "linear-gradient(180deg, oklch(0.20 0.018 220 / 0.6), oklch(0.155 0.014 220 / 0.4))",
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 28,
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 14, color: "var(--ac)", fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500 }}>
            <I.Star size={13} /> Featured this week
          </div>
          <h2 className="serif" style={{ margin: 0, fontSize: 38, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.05 }}>
            Cold outbound, <em style={{ color: "var(--ac)" }}>warm replies.</em>
          </h2>
          <p className="muted" style={{ marginTop: 12, maxWidth: "52ch", fontSize: 14.5, lineHeight: 1.55 }}>
            A 3-touch B2B sequence that adapts to LinkedIn signals, opens with a real observation, and earns the reply without the usual "quick question" filler.
          </p>
          <div className="row" style={{ marginTop: 18, gap: 12 }}>
            <button className="btn primary"><I.Wand size={14} /> Use template</button>
            <button className="btn outline"><I.Image size={14} /> Preview output</button>
            <div className="row" style={{ gap: 10, marginLeft: 8, fontSize: 12, color: "var(--fg-mute)" }}>
              <span><I.Coin size={12} /> 1,640 tok</span>
              <span><I.Clock size={12} /> 30s</span>
              <span><I.Brain size={12} /> Claude · GPT-4o</span>
            </div>
          </div>
        </div>
        <div
          style={{
            padding: 18,
            borderRadius: "var(--r-md)",
            background: "oklch(0.14 0.012 220 / 0.6)",
            border: "1px solid var(--line-soft)",
            fontFamily: "var(--f-mono)",
            fontSize: 11.5,
            lineHeight: 1.65,
            color: "var(--fg-2)",
            maxHeight: 240,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ color: "var(--ac)", fontWeight: 600 }}>{"<role>"}</div>
          <div>Senior B2B SaaS account exec, 6+ years selling to PLG-driven mid-market.</div>
          <div style={{ color: "var(--ac)", fontWeight: 600 }}>{"</role>"}</div>
          <br />
          <div style={{ color: "var(--ac)", fontWeight: 600 }}>{"<task>"}</div>
          <div>Write a 3-touch outbound sequence (intro, value, soft re-engage) that …</div>
          <div style={{ color: "var(--ac)", fontWeight: 600 }}>{"</task>"}</div>
          <br />
          <div style={{ color: "var(--ac)", fontWeight: 600 }}>{"<context>"}</div>
          <div>– Prospect signal: posted about churn dashboards in last 14 days …</div>
          <div
            style={{
              position: "absolute",
              left: 0, right: 0, bottom: 0,
              height: 60,
              background: "linear-gradient(180deg, transparent, oklch(0.155 0.014 220) 90%)",
            }}
          />
        </div>
      </section>

      {/* Filters */}
      <div className="row" style={{ marginBottom: 20, gap: 8, flexWrap: "wrap" }}>
        {TEMPLATE_CATS.map((c) => (
          <button key={c} className="chip lg" data-on={active === c} onClick={() => setActive(c)}>
            {c}
            {active === c && <span className="mono" style={{ opacity: 0.7, fontSize: 11 }}>{filtered.length}</span>}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }} className="row">
          <span className="muted" style={{ fontSize: 12 }}>Sort:</span>
          <button className="chip"><I.Star size={12} /> Most used</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid-cards">
        {filtered.map((t, i) => (
          <div key={i} className="tcard">
            <div className="tcard-hd">
              <div className={`tcard-glyph ${["", "alt-1", "alt-2", "alt-3"][t.glyph]}`}>
                {[I.Sparkles, I.Pen, I.Image, I.Code][t.glyph]({ size: 17 })}
              </div>
              <div style={{ flex: 1 }}>
                <h4>{t.name}</h4>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <span className="chip-mini">{t.cat}</span>
                  <span className="chip-mini ac">{t.model}</span>
                </div>
              </div>
            </div>
            <p>{t.body}</p>
            <div className="tcard-meta">
              <span><I.Clock size={11} /> {t.time}</span>
              <span><I.Coin size={11} /> avg 1.2k tok</span>
              <span className="uses"><I.Bolt size={11} /> {t.uses}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Templates = Templates;
