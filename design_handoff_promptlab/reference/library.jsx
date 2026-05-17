// library.jsx — history of past prompts

const LIBRARY = [
  { title: "Q2 launch announcement deck", sub: "10-slide skeleton — strategy → metrics → next steps", model: "Claude", tokens: 4280, score: 96, when: "2 min ago", tag: "marketing" },
  { title: "Cold-email rewrite (Stripe → Linear)", sub: "3-touch outbound, warm-signal opener", model: "GPT-4o", tokens: 1840, score: 94, when: "32 min ago", tag: "marketing" },
  { title: "Image brief — Aria sneakers, studio", sub: "Photoreal product render, dawn rim light", model: "Midjourney", tokens: 620, score: 92, when: "1 hr ago", tag: "image" },
  { title: "SQL query → English audit", sub: "Refund pipeline aggregation, plain-language gloss", model: "Claude", tokens: 2150, score: 91, when: "2 hr ago", tag: "coding" },
  { title: "Q2 board memo: GTM pivot", sub: "BLUF: shift from PLG to vertical sales motion", model: "Claude", tokens: 3120, score: 95, when: "Yesterday · 18:42", tag: "business" },
  { title: "Onboarding email sequence (v3)", sub: "Day 0–14, free trial → paid conversion", model: "GPT-4o", tokens: 2400, score: 89, when: "Yesterday · 14:08", tag: "marketing" },
  { title: "Lit review — multimodal RAG, 2024", sub: "Thematic synthesis, 14 papers, gap analysis", model: "Claude", tokens: 5840, score: 93, when: "May 14", tag: "academic" },
  { title: "Hiring rubric — staff PM", sub: "5 dimensions, calibrated examples per level", model: "Claude", tokens: 1900, score: 90, when: "May 13", tag: "business" },
];

const TAG_COLORS = {
  marketing: "var(--ac)",
  image:     "oklch(0.80 0.16 295)",
  coding:    "oklch(0.78 0.16 158)",
  business:  "oklch(0.82 0.16 78)",
  academic:  "oklch(0.74 0.14 178)",
};

function Library() {
  const [q, setQ] = React.useState("");
  const filtered = LIBRARY.filter(l => l.title.toLowerCase().includes(q.toLowerCase()) || l.sub.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Library <em>·</em> every prompt, versioned</h1>
          <p>Searchable history of every optimization. Fork an older draft or replay against a new model in one click.</p>
        </div>
        <div className="right">
          <button className="btn ghost"><I.Filter size={14} /> Filter</button>
          <button className="btn outline"><I.Download size={14} /> Export all</button>
          <button className="btn primary"><I.Plus size={14} /> New prompt</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-strip">
        <div className="stat">
          <div className="label"><I.Archive size={11} /> Saved prompts</div>
          <div className="v">248</div>
          <div className="delta"><I.ArrowUpRight size={11} /> +12 this week</div>
        </div>
        <div className="stat">
          <div className="label"><I.Spark size={11} /> Avg readiness</div>
          <div className="v">92<small>/100</small></div>
          <div className="spark"><Sparkline values={[78, 82, 80, 85, 88, 90, 92]} /></div>
        </div>
        <div className="stat">
          <div className="label"><I.Coin size={11} /> Tokens saved (vs raw)</div>
          <div className="v">1.42<small>M</small></div>
          <div className="delta"><I.ArrowUpRight size={11} /> 31% fewer retries</div>
        </div>
        <div className="stat">
          <div className="label"><I.Brain size={11} /> Most-used model</div>
          <div className="v serif" style={{ fontSize: 26 }}>Claude<small> Sonnet</small></div>
          <div className="delta"><I.Bolt size={11} /> 64% of runs</div>
        </div>
      </div>

      {/* Search */}
      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <div className="search" style={{ width: "100%", maxWidth: 480, padding: "9px 12px" }}>
          <I.Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, content, model…" />
          <span className="kbd">⌘ K</span>
        </div>
        <div className="chip-row">
          <button className="chip" data-on={true}>All</button>
          <button className="chip">Starred</button>
          <button className="chip">Shared</button>
          <button className="chip">Archived</button>
        </div>
      </div>

      {/* Table */}
      <div className="lib-table">
        <div className="lib-row hd">
          <span />
          <span>Prompt</span>
          <span>Model</span>
          <span>Tokens</span>
          <span>Readiness</span>
          <span>Updated</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {filtered.map((l, i) => (
          <div key={i} className="lib-row">
            <div className="row-mark" style={{ background: `linear-gradient(180deg, ${TAG_COLORS[l.tag]}, var(--ac-2))` }} />
            <div className="lib-title">
              {l.title}
              <small>{l.sub}</small>
            </div>
            <div>
              <span className="chip-mini ac">{l.model}</span>
            </div>
            <div className="lib-mono">{l.tokens.toLocaleString()}</div>
            <div className="row" style={{ gap: 8 }}>
              <div style={{ width: 60, height: 5, borderRadius: 3, background: "var(--bg-2)", overflow: "hidden" }}>
                <div style={{
                  width: l.score + "%",
                  height: "100%",
                  background: "linear-gradient(90deg, var(--ac), var(--ac-2))",
                }} />
              </div>
              <span className="lib-mono" style={{ color: "var(--fg)" }}>{l.score}</span>
            </div>
            <div className="lib-mono">{l.when}</div>
            <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
              <button className="icon-btn" style={{ width: 28, height: 28 }}><I.Copy size={13} /></button>
              <button className="icon-btn" style={{ width: 28, height: 28 }}><I.ArrowUpRight size={13} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--fg-mute)" }}>
            No matches for “{q}”
          </div>
        )}
      </div>
    </div>
  );
}

window.Library = Library;
