// builder.jsx — Prompt Studio + Readiness Console + streaming output

const CATEGORIES = [
  { id: "marketing", label: "Marketing", icon: I.Bolt },
  { id: "content",   label: "Content",   icon: I.Pen },
  { id: "business",  label: "Business",  icon: I.FileText },
  { id: "coding",    label: "Coding",    icon: I.Code },
  { id: "academic",  label: "Academic",  icon: I.Book },
  { id: "image",     label: "Image AI",  icon: I.Image },
];

const TONES = ["Professional", "Casual", "Persuasive", "Creative", "Concise", "Empathetic"];

const TARGETS = [
  { id: "chatgpt",   name: "ChatGPT",    badge: "GPT" },
  { id: "claude",    name: "Claude",     badge: "CL" },
  { id: "gemini",    name: "Gemini",     badge: "GM" },
  { id: "grok",      name: "Grok",       badge: "GK" },
  { id: "midjourney", name: "Midjourney", badge: "MJ" },
];

const OUTPUTS = ["Application code", "Word document", "Slide deck", "Technical brief", "Analysis", "Content draft"];

const BUILDER_PROMPT = `<role>
You are a senior brand strategist & copywriter specializing in
direct-to-consumer beverage launches for Gen-Z audiences.
</role>

<task>
Generate a 30-day Instagram content plan for a student-targeted
milk-coffee brand. Output must feel native, witty, and shoppable.
</task>

<context>
- Product   : Iced milk coffee, 250 ml, IDR 18-22k per cup
- Audience  : University students, 18-23, urban Indonesia
- Voice     : Warm, playful, lightly self-aware. No emojis spam.
- Constraint: Avoid generic "wake up & grind" tropes.
</context>

<output_format>
- 10 carousel ideas (hook + slide outline + CTA)
- 10 reel concepts (open frame + beat sheet)
- 10 single-image captions (≤ 90 chars, with hook)
- 1 weekly posting cadence table
</output_format>

<guardrails>
- Use Bahasa gaul mix only when natural; never forced.
- Each idea must reference a real student moment (deadline,
  ojek ride, kantin, kelompok tugas).
- Skip price talk in captions; surface only in CTA cards.
</guardrails>`;

const CHECKS = [
  { tag: "Intent parsed",   body: "Role, goal, and output schema captured.", done: true },
  { tag: "Guardrails active", body: "Format & forbidden patterns locked.", done: true },
  { tag: "Export ready",    body: "Copy, DOCX, and PPTX targets configured.", done: true },
  { tag: "Token budget",    body: "Within model context window (3,840 / 8k).", done: true },
];

const SUGGESTIONS = [
  "Add a measurable success metric (CTR, saves)",
  "Specify carousel slide count (e.g. 5–7)",
  "Name 1 real competitor for tone calibration",
];

// ─────────────────────────────────────────────────────────────────

function Builder({ density }) {
  const [text, setText] = React.useState(
    "I want to launch Instagram content for a student-targeted milk-coffee brand. The voice should feel casual but still sell."
  );
  const [category, setCategory] = React.useState("marketing");
  const [tone, setTone] = React.useState("Professional");
  const [target, setTarget] = React.useState("claude");
  const [output, setOutput] = React.useState("Content draft");

  const [streaming, setStreaming] = React.useState(false);
  const [streamed, setStreamed] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [tab, setTab] = React.useState("optimized");
  const [showToast, setShowToast] = React.useState(false);

  // Trigger stream
  const generate = () => {
    setStreaming(true);
    setDone(false);
    setStreamed("");
  };

  React.useEffect(() => {
    if (!streaming) return;
    let i = 0;
    const total = BUILDER_PROMPT.length;
    const id = setInterval(() => {
      // Bursts of 6-14 chars at a time for snappy feel
      const step = 6 + Math.floor(Math.random() * 9);
      i = Math.min(total, i + step);
      setStreamed(BUILDER_PROMPT.slice(0, i));
      if (i >= total) {
        clearInterval(id);
        setStreaming(false);
        setDone(true);
      }
    }, 22);
    return () => clearInterval(id);
  }, [streaming]);

  // Copy
  const copyOutput = () => {
    navigator.clipboard?.writeText(BUILDER_PROMPT);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  // ── Render optimized prompt with syntax-ish coloring
  const renderOptimized = (raw) => {
    if (!raw) {
      return (
        <div style={{ color: "var(--fg-subtle)", fontStyle: "italic" }}>
          Press <span className="chip-mini ac" style={{ verticalAlign: "middle" }}>Optimize ↵</span> to generate a model-ready prompt from your narration.
        </div>
      );
    }
    const lines = raw.split("\n");
    return lines.map((line, i) => {
      const tagMatch = line.match(/^<\/?([a-z_]+)>?$/);
      if (tagMatch) {
        return (
          <div key={i}>
            <span className="sec">{line}</span>
          </div>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i}>
            <span className="bullet">– </span>{line.slice(2)}
          </div>
        );
      }
      return <div key={i}>{line}</div>;
    });
  };

  return (
    <div className="page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="dot" /> Studio · v2 release
        </div>
        <h1 className="hero-title">
          The cleanest <em>prompt</em>,<br />
          before you hit run.
        </h1>
        <p className="hero-sub">
          Drop a raw idea, file, or screenshot. PromptLab parses your intent, locks the right guardrails, and
          hands you a model-ready instruction — measured against four pillars of clarity before you spend a token.
        </p>
        <div className="hero-actions">
          <button className="btn primary lg" onClick={generate}>
            <I.Spark size={15} />
            Open Studio
            <span className="kbd">↵</span>
          </button>
          <button className="btn lg outline">
            <I.Play size={13} />
            Watch the 90s tour
          </button>
          <div className="row" style={{ marginLeft: "auto", color: "var(--fg-mute)", fontSize: 12.5 }}>
            <I.CheckCircle size={14} style={{ color: "var(--pos)" }} /> OCR Screenshot
            <I.CheckCircle size={14} style={{ color: "var(--pos)" }} /> Model fallback
            <I.CheckCircle size={14} style={{ color: "var(--pos)" }} /> DOCX · PPTX export
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="stats-strip">
        <div className="stat">
          <div className="label"><I.Spark size={11} /> Readiness</div>
          <div className="v">96<small>/100</small></div>
          <div className="delta"><I.ArrowUpRight size={11} /> +4 vs draft</div>
        </div>
        <div className="stat">
          <div className="label"><I.Coin size={11} /> Token estimate</div>
          <div className="v">3,840<small> tok</small></div>
          <div className="spark">
            <Sparkline values={[20, 30, 28, 40, 38, 52, 48, 60, 65, 64, 72, 68]} />
          </div>
        </div>
        <div className="stat">
          <div className="label"><I.Brain size={11} /> Target</div>
          <div className="v serif" style={{ fontSize: 26 }}>Claude<small> Sonnet 4</small></div>
          <div className="delta"><I.Bolt size={11} /> Fallback: GPT-4o</div>
        </div>
        <div className="stat">
          <div className="label"><I.Clock size={11} /> Saved this week</div>
          <div className="v">04:32<small> hrs</small></div>
          <div className="spark">
            <Sparkline values={[10, 12, 11, 18, 22, 26, 30]} color="var(--ac-2)" />
          </div>
        </div>
      </section>

      {/* STUDIO */}
      <section className="studio">
        {/* INPUT */}
        <div className="card composer">
          <div className="composer-head">
            <div>
              <div className="card-title">Prompt Studio</div>
              <div className="card-sub" style={{ marginTop: 6 }}>
                Write freely, attach references, and let PromptLab shape the instruction.
              </div>
            </div>
            <div className="meta">
              <span className="chip-mini"><I.FileText size={11} /> Draft 12</span>
              <button className="icon-btn"><I.Dots size={15} /></button>
            </div>
          </div>

          <div className="field">
            <div className="field-lbl">User narration</div>
            <textarea
              className="compose-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Sketch the idea in plain language — voice, audience, constraints…"
            />
          </div>

          <button className="attach">
            <I.Paperclip size={16} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left", flex: 1 }}>
              <strong>Attach image, screenshot, or document</strong>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                PNG · JPG · PDF · DOCX · PPTX · TXT — OCR runs on every image
              </span>
            </div>
            <I.Plus size={16} />
          </button>

          <div className="field-row">
            <div className="field">
              <div className="field-lbl">Category</div>
              <div className="chip-row">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className="chip"
                    data-on={category === c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    <c.icon size={13} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="field-lbl">Tone</div>
              <div className="chip-row">
                {TONES.map((t) => (
                  <button
                    key={t}
                    className="chip"
                    data-on={tone === t}
                    onClick={() => setTone(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <div className="field-lbl">Target model</div>
              <div className="chip-row">
                {TARGETS.map((m) => (
                  <button
                    key={m.id}
                    className="chip"
                    data-on={target === m.id}
                    onClick={() => setTarget(m.id)}
                  >
                    <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}>{m.badge}</span>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="field-lbl">Output format</div>
              <div className="chip-row">
                {OUTPUTS.map((o) => (
                  <button
                    key={o}
                    className="chip"
                    data-on={output === o}
                    onClick={() => setOutput(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="field" style={{ marginTop: 4 }}>
            <div className="field-lbl row">
              <I.Sparkles size={12} style={{ color: "var(--ac)" }} />
              <span>Smart suggestions</span>
              <span className="chip-mini" style={{ marginLeft: "auto" }}>auto</span>
            </div>
            <div className="chip-row">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="chip" style={{ background: "transparent", borderStyle: "dashed" }}>
                  <I.Plus size={11} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="composer-foot">
            <div className="meta row">
              <span><span className="live-dot" /> Autosaved · 1s ago</span>
            </div>
            <div className="gen">
              <button className="btn ghost"><I.Refresh size={14} /> Reset</button>
              <button className="btn outline">
                <I.Beaker size={14} />
                Run in Compare
              </button>
              <button className="btn primary" onClick={generate} disabled={streaming}>
                <I.Send size={13} />
                {streaming ? "Optimizing…" : "Optimize"}
                <span className="kbd">⌘ ↵</span>
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT + CONSOLE */}
        <div className="output">
          {/* Readiness Console */}
          <div className="card console">
            <div className="console-hd">
              <div className="lbl-text">
                <span className="lab">AI Readiness Console</span>
                <span className="ttl">Intelligence layer</span>
              </div>
              <button className="icon-btn" style={{ marginLeft: "auto" }}><I.Sparkles size={14} /></button>
            </div>

            <div className="score-ring">
              <Ring value={96} />
              <div className="ring-info">
                <b>Excellent — ship-ready</b>
                <p>Structure, context, format, and guardrails all pass before the prompt is sent to any model.</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { name: "Clarity", value: 98 },
                { name: "Context", value: 97 },
                { name: "Output format", value: 99 },
                { name: "Guardrails", value: 92 },
              ].map((m) => (
                <div key={m.name} className="metric">
                  <div className="metric-hd">
                    <span>{m.name}</span>
                    <b>{m.value}%</b>
                  </div>
                  <div className="metric-bar"><div style={{ width: m.value + "%" }} /></div>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="checks">
              {CHECKS.map((c, i) => (
                <div key={i} className="check">
                  <div className="check-idx">0{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <b>{c.tag}</b>
                    <p>{c.body}</p>
                  </div>
                  <I.Check size={15} className="ok" />
                </div>
              ))}
            </div>
          </div>

          {/* Optimized output */}
          <div className="card output-card">
            <div className="output-tabs">
              <button
                className="output-tab"
                data-active={tab === "optimized"}
                onClick={() => setTab("optimized")}
              >
                <I.Sparkles size={13} />
                Optimized
                <span className="count">v3</span>
              </button>
              <button
                className="output-tab"
                data-active={tab === "raw"}
                onClick={() => setTab("raw")}
              >
                <I.Pen size={13} />
                Narration
              </button>
              <button
                className="output-tab"
                data-active={tab === "schema"}
                onClick={() => setTab("schema")}
              >
                <I.Layers size={13} />
                Schema
              </button>
              <div className="output-actions">
                <button className="icon-btn" title="Copy" onClick={copyOutput}><I.Copy size={14} /></button>
                <button className="icon-btn" title="Download"><I.Download size={14} /></button>
                <button className="icon-btn" title="More"><I.Dots size={14} /></button>
              </div>
            </div>

            <div className="output-body">
              {tab === "optimized" && (
                <>
                  {renderOptimized(streamed || (done ? BUILDER_PROMPT : ""))}
                  {!streamed && !done && (
                    <div style={{ color: "var(--fg-subtle)", fontStyle: "italic" }}>
                      Press <span className="chip-mini ac">Optimize ⌘↵</span> to generate a model-ready prompt from your narration.
                    </div>
                  )}
                  {streaming && <span className="output-cursor" />}
                </>
              )}
              {tab === "raw" && (
                <div style={{ color: "var(--fg-2)" }}>{text}</div>
              )}
              {tab === "schema" && (
                <pre style={{ margin: 0, fontFamily: "inherit" }}>{`{
  "role"       : "senior brand strategist",
  "task"       : "30-day IG plan",
  "audience"   : "uni students 18-23, urban ID",
  "voice"      : "warm, playful, lightly self-aware",
  "constraints": ["no emoji spam", "no 'grind' tropes"],
  "output"     : {
    "carousels": 10,
    "reels"    : 10,
    "captions" : 10,
    "cadence"  : "weekly_table"
  }
}`}</pre>
              )}
            </div>

            <div className="output-foot">
              <span className="chip-mini ac"><I.Bolt size={11} /> LOCAL DRAFT</span>
              <span>{(streamed || (done ? BUILDER_PROMPT : "")).split(/\s+/).filter(Boolean).length} words · {Math.ceil((streamed || (done ? BUILDER_PROMPT : "")).length / 4)} tokens</span>
              <div className="grow" />
              <span>Last sync · just now</span>
            </div>
          </div>
        </div>
      </section>

      {showToast && (
        <div className="fab-toast">
          <I.CheckCircle size={15} style={{ color: "var(--pos)" }} />
          Copied optimized prompt to clipboard
        </div>
      )}
    </div>
  );
}

window.Builder = Builder;
