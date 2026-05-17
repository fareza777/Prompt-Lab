// optimizer.jsx — diff viewer (original vs optimized)

const ORIGINAL = `Write me an email for new customers about our coffee subscription. Make it sound friendly and not too salesy but still get them to sign up. Mention the free trial.`;

const OPTIMIZED = `<role>
Senior lifecycle copywriter for a specialty coffee subscription
service targeting first-time buyers.
</role>

<task>
Write a welcome email that converts a free-trial signup into a
paid monthly subscriber within 14 days.
</task>

<context>
- Product   : Single-origin coffee, 250g pouches, monthly cadence
- Pricing   : Free 14-day trial → IDR 159k/month afterwards
- Audience  : Curious home brewers, just placed first trial order
- Voice     : Warm, knowledgeable, never pushy. Conversational.
</context>

<output_format>
- Subject line     (max 50 chars, A/B variant included)
- Preheader        (max 90 chars)
- Body             (180-240 words, 3 short sections)
- Single CTA       (button copy + supporting microcopy)
- Sign-off         (named human, role)
</output_format>

<guardrails>
- Never use the words "amazing", "game-changer", or exclamation
  marks beyond the subject line.
- Surface the free trial in the first 40 words.
- Close with a curiosity hook, not a hard ask.
</guardrails>`;

// Original colored with red mark for "weak" parts
const ORIGINAL_HIGHLIGHTS = [
  ["Write me an email for ", false],
  ["new customers", true],
  [" about our coffee subscription. Make it ", false],
  ["sound friendly", true],
  [" and ", false],
  ["not too salesy", true],
  [" but still get them to ", false],
  ["sign up", true],
  [". Mention the ", false],
  ["free trial", true],
  [".", false],
];

const OPTIMIZER_CHANGES = [
  { type: "added",   label: "Role definition",  body: "Pinned the writer to a lifecycle copywriter persona." },
  { type: "added",   label: "Concrete metric",  body: "Converts free trial → paid within 14 days." },
  { type: "added",   label: "Audience profile", body: "Curious home brewers, just placed first trial order." },
  { type: "added",   label: "Output schema",    body: "Subject · preheader · body · CTA · sign-off." },
  { type: "added",   label: "Guardrails",       body: "Banned exclamation, soft-sell close, surface trial early." },
  { type: "tighten", label: "Voice spec",       body: "“not too salesy” → warm, knowledgeable, never pushy." },
];

function Optimizer() {
  const [side, setSide] = React.useState("split");
  const [hovered, setHovered] = React.useState(null);

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Optimizer <em>·</em> diff &amp; refine</h1>
          <p>Paste a draft prompt to see exactly what PromptLab will add, tighten, or guard against — line by line, before you send.</p>
        </div>
        <div className="right">
          <button className="btn ghost"><I.Refresh size={14} /> Reset</button>
          <button className="btn outline"><I.Download size={14} /> Export diff</button>
          <button className="btn primary">
            <I.Wand size={14} />
            Apply optimization
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="row" style={{ marginBottom: 14, gap: 10 }}>
        <div className="chip-row">
          {[
            ["split", "Split view", I.Diff],
            ["unified", "Unified", I.Layers],
            ["summary", "Summary", I.FileText],
          ].map(([k, lab, Ic]) => (
            <button key={k} className="chip lg" data-on={side === k} onClick={() => setSide(k)}>
              <Ic size={13} />
              {lab}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }} className="row">
          <span className="chip-mini"><I.Bolt size={11} /> 6 changes</span>
          <span className="chip-mini pos"><I.ArrowUpRight size={11} /> +28 readiness</span>
          <span className="chip-mini">3,840 tok</span>
        </div>
      </div>

      {/* Diff */}
      {side !== "summary" && (
        <div className="diff-wrapper card" style={{ padding: 0 }}>
          <div className="diff-heads">
            <div className="diff-hd">
              <span className="chip-mini" style={{ background: "oklch(0.72 0.18 22 / 0.14)", borderColor: "oklch(0.72 0.18 22 / 0.3)", color: "oklch(0.85 0.12 22)" }}>
                BEFORE
              </span>
              <span>Raw narration · 31 words</span>
              <div style={{ marginLeft: "auto" }} className="row">
                <span className="mono subtle" style={{ fontSize: 11 }}>Readiness 42</span>
              </div>
            </div>
            <div className="diff-hd" style={{ borderLeft: "1px solid var(--line-soft)" }}>
              <span className="chip-mini pos">AFTER · optimized</span>
              <span>Model-ready prompt · 178 words</span>
              <div style={{ marginLeft: "auto" }} className="row">
                <span className="mono" style={{ fontSize: 11, color: "var(--pos)" }}>Readiness 96</span>
              </div>
            </div>
          </div>

          {side === "split" && (
            <div className="diff">
              <div className="diff-pane left">
                {ORIGINAL_HIGHLIGHTS.map(([t, m], i) =>
                  m ? <span key={i} className="diff-mark">{t}</span> : <span key={i}>{t}</span>
                )}
              </div>
              <div className="diff-pane right">
                {OPTIMIZED.split("\n").map((line, i) => {
                  const isTag = line.match(/^<\/?([a-z_]+)>?$/);
                  if (isTag) return <div key={i} style={{ color: "var(--ac)", fontWeight: 600 }}>{line}</div>;
                  if (line.startsWith("- ")) return <div key={i}><span className="diff-mark">– {line.slice(2)}</span></div>;
                  if (line.trim()) return <div key={i}><span className="diff-mark">{line}</span></div>;
                  return <div key={i}>{line}</div>;
                })}
              </div>
            </div>
          )}

          {side === "unified" && (
            <div className="diff-pane" style={{ borderTop: 0 }}>
              <div style={{ color: "oklch(0.85 0.12 22)", opacity: 0.75 }}>- {ORIGINAL}</div>
              <div style={{ height: 12 }} />
              {OPTIMIZED.split("\n").map((line, i) => (
                <div key={i} style={{ color: "var(--pos)" }}>
                  {line ? "+ " : ""}{line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Change list */}
      <section style={{ marginTop: 24 }}>
        <div className="lbl" style={{ marginBottom: 14 }}>
          <span>Change summary</span>
          <div className="lbl-line" />
          <span style={{ color: "var(--fg-subtle)" }}>6 of 6 applied</span>
        </div>
        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {OPTIMIZER_CHANGES.map((c, i) => (
            <div
              key={i}
              className="tcard"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ borderColor: hovered === i ? "var(--ac-line)" : undefined }}
            >
              <div className="tcard-hd">
                <div className={`tcard-glyph ${c.type === "added" ? "alt-2" : "alt-1"}`}>
                  {c.type === "added" ? <I.Plus size={16} /> : <I.Wand size={15} />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4>{c.label}</h4>
                  <div className="chip-mini" style={{ marginTop: 6 }}>
                    {c.type === "added" ? "ADDED" : "TIGHTENED"}
                  </div>
                </div>
              </div>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

window.Optimizer = Optimizer;
