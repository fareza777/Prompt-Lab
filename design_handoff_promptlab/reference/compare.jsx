// compare.jsx — multi-model side-by-side with streaming

const MODELS = [
  {
    id: "claude",
    name: "Claude Sonnet 4",
    badge: "CL",
    color: "oklch(0.74 0.14 178)",
    latency: "1.8s",
    cost: "$0.014",
    tokens: 842,
    output: `Hook · "The grind is real — but make it iced milk coffee."

Frame 1 (carousel)
  - Setup: midnight before deadline, kostan glow
  - Reveal: the cup, condensation, satisfied sigh
  - CTA: "Save this for your next all-nighter"

Frame 2 (reel, 9s)
  - Beat 1 — ojek stuck in macet, sigh
  - Beat 2 — bestie passes the cup, slow-mo
  - Beat 3 — text overlay: "tugas can wait 3 sips"

Caption
  Friday night, kelompok tugas, dan satu cup
  yang akhirnya bikin idea-nya mengalir.`,
  },
  {
    id: "gpt",
    name: "GPT-4o",
    badge: "GPT",
    color: "oklch(0.78 0.16 158)",
    latency: "2.1s",
    cost: "$0.018",
    tokens: 920,
    output: `1. CAROUSEL — "Anti-rise & grind" series
   Slide 1: Bold serif — "It's okay to start at 11am."
   Slide 2-4: 3 real student moments
   Slide 5: Soft CTA — "First sip's on us"

2. REEL — "Kelas pagi vs kelas siang"
   Visual diptych, same cup, two energies.
   Voiceover by mahasiswa, no script.

3. SINGLE IMAGE
   Caption: "Susu, kopi, satu cup yang
   ngerti tugas belum kelar."`,
  },
  {
    id: "gemini",
    name: "Gemini Pro 1.5",
    badge: "GM",
    color: "oklch(0.80 0.16 295)",
    latency: "1.4s",
    cost: "$0.011",
    tokens: 760,
    output: `[Hook Strategy]
Open every post with a relatable "moment of dread"
(deadline, ojek, dosen killer) before resolving
to the cup. Builds save-rate without selling.

[Carousel Plan — 10 ideas]
1. "5 jenis kelompok tugas" — typology + the cup as savior
2. "POV: kantin habis es" — visual punchline
3. "Hari Senin defense kit" — bullet list of survival items
...

[Voice Calibration]
80% conversational ID, 20% mixed slang.
Never use "rise and grind" or rooster emoji.`,
  },
];

const PROMPT_INPUT = `Generate Instagram content ideas for a student-targeted milk-coffee brand. Voice: warm, playful, lightly self-aware. No emojis spam. Reference real student moments.`;

function Compare() {
  const [models, setModels] = React.useState(["claude", "gpt", "gemini"]);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({ claude: 0, gpt: 0, gemini: 0 });

  const run = () => {
    setRunning(true);
    setProgress({ claude: 0, gpt: 0, gemini: 0 });
  };

  React.useEffect(() => {
    if (!running) return;
    const ids = MODELS.map((m) => {
      const total = m.output.length;
      const speed = 18 + Math.random() * 12;
      let i = 0;
      return setInterval(() => {
        i = Math.min(total, i + Math.floor(8 + Math.random() * 8));
        setProgress((p) => ({ ...p, [m.id]: i }));
        if (i >= total) clearInterval(_ids[m.id]);
      }, speed);
    });
    const _ids = { claude: ids[0], gpt: ids[1], gemini: ids[2] };
    const finishTimeout = setTimeout(() => setRunning(false), 5000);
    return () => {
      ids.forEach(clearInterval);
      clearTimeout(finishTimeout);
    };
  }, [running]);

  const winner = "claude";

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Compare <em>·</em> models in parallel</h1>
          <p>Run one prompt across multiple models. Watch the output stream, compare latency, cost, and tone — pick the winner in seconds.</p>
        </div>
        <div className="right">
          <button className="btn ghost"><I.Refresh size={14} /> Reset</button>
          <button className="btn outline"><I.Plus size={14} /> Add model</button>
          <button className="btn primary" onClick={run} disabled={running}>
            <I.Send size={13} />
            {running ? "Streaming…" : "Run all"}
            <span className="kbd">⌘ ↵</span>
          </button>
        </div>
      </div>

      {/* Prompt bar */}
      <div className="card" style={{ marginBottom: 18, padding: 18 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="lbl"><I.Wand size={12} /> Shared prompt</span>
          <div style={{ marginLeft: "auto" }} className="row" style={{ gap: 8 }}>
            <span className="chip-mini ac">Optimized · v3</span>
            <span className="chip-mini">96 readiness</span>
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--r)",
            background: "var(--bg-input)",
            border: "1px solid var(--line-soft)",
            fontFamily: "var(--f-mono)",
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--fg-2)",
          }}
        >
          {PROMPT_INPUT}
        </div>
      </div>

      {/* Grid */}
      <div className="compare">
        {MODELS.map((m, idx) => {
          const sliceLen = running ? progress[m.id] : m.output.length;
          const visibleOutput = m.output.slice(0, sliceLen);
          const isStreaming = running && sliceLen < m.output.length;
          const isWinner = !running && m.id === winner;

          return (
            <div
              key={m.id}
              className="mcard"
              style={{
                borderColor: isWinner ? "var(--ac-line)" : undefined,
                boxShadow: isWinner ? "0 0 0 1px var(--ac-line), 0 12px 32px var(--ac-soft)" : undefined,
                position: "relative",
              }}
            >
              {isWinner && (
                <div
                  style={{
                    position: "absolute",
                    top: -10,
                    right: 14,
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    background: "linear-gradient(180deg, var(--ac), var(--ac-2))",
                    color: "oklch(0.16 0.012 220)",
                    boxShadow: "0 4px 12px var(--ac-soft)",
                  }}
                >
                  ★ Top pick
                </div>
              )}
              <div className="mcard-hd">
                <div className="mcard-logo" style={{ background: m.color + " / 0.18", color: m.color, borderColor: m.color }}>
                  {m.badge}
                </div>
                <div className="info">
                  <b>{m.name}</b>
                  <small>
                    {isStreaming ? (
                      <><span className="live-dot" style={{ width: 6, height: 6, boxShadow: "0 0 0 3px var(--ac-soft)" }} /> Streaming…</>
                    ) : (
                      <>Idle · ready</>
                    )}
                  </small>
                </div>
                <button className="icon-btn" style={{ width: 28, height: 28 }}><I.Dots size={13} /></button>
              </div>

              <div className="mcard-out">
                {visibleOutput}
                {isStreaming && <span className="output-cursor" style={{ height: 11 }} />}
                {!visibleOutput && !running && (
                  <div style={{ color: "var(--fg-subtle)", fontStyle: "italic" }}>
                    Press “Run all” to stream this model's response.
                  </div>
                )}
              </div>

              <div className="mcard-stats">
                <div className="st">
                  <b>{m.latency}</b>
                  <small>Latency</small>
                </div>
                <div className="st">
                  <b>{m.cost}</b>
                  <small>Cost</small>
                </div>
                <div className="st">
                  <b>{m.tokens}</b>
                  <small>Tokens</small>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Score row */}
      <div className="card" style={{ marginTop: 20, padding: 18 }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div>
            <div className="lbl"><I.Bolt size={11} /> Side-by-side score</div>
            <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Where each model wins</div>
          </div>
          <button className="btn outline" style={{ marginLeft: "auto" }}><I.Wand size={13} /> Synthesize best of all</button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr repeat(3, minmax(120px, 1fr))",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div></div>
          {MODELS.map((m) => (
            <div key={m.id} style={{ textAlign: "center" }} className="lbl">
              <span style={{ color: m.color }}>{m.badge}</span> {m.name.split(" ")[0]}
            </div>
          ))}
          {[
            ["Tone match", [94, 88, 82]],
            ["Format adherence", [96, 92, 90]],
            ["Idea originality", [92, 95, 87]],
            ["Cultural fit (ID)", [98, 84, 90]],
            ["Cost efficiency", [78, 72, 88]],
          ].map(([label, vals], i) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: 13, color: "var(--fg-2)" }}>{label}</div>
              {vals.map((v, j) => {
                const max = Math.max(...vals);
                return (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--bg-2)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: v + "%",
                          height: "100%",
                          background: v === max ? "linear-gradient(90deg, var(--ac), var(--ac-2))" : "var(--line-strong)",
                        }}
                      />
                    </div>
                    <span className="mono" style={{ fontSize: 11.5, color: v === max ? "var(--ac)" : "var(--fg-mute)", minWidth: 28, textAlign: "right" }}>{v}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Compare = Compare;
