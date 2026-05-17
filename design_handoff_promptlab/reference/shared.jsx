// shared.jsx — icons, layout chrome, and common bits
// All components are attached to window for cross-file scope sharing.

// ─────────────────────────────────────────────────────────────────
// Icons (inline SVG, currentColor)
// ─────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 16, sw = 1.6, fill = "none", style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {d}
  </svg>
);

const I = {
  Sparkles: (p) => <Icon {...p} d={<>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
  </>} />,
  Pen: (p) => <Icon {...p} d={<>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
  </>} />,
  Wand: (p) => <Icon {...p} d={<>
    <path d="M3 21l9-9" />
    <path d="M15 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
    <path d="M20 9l.6 1.4L22 11l-1.4.6L20 13l-.6-1.4L18 11l1.4-.6L20 9z" />
  </>} />,
  Book: (p) => <Icon {...p} d={<>
    <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
  </>} />,
  Archive: (p) => <Icon {...p} d={<>
    <rect x="3" y="3" width="18" height="4" rx="1" />
    <path d="M5 7v13a1 1 0 001 1h12a1 1 0 001-1V7" />
    <path d="M10 12h4" />
  </>} />,
  Grid: (p) => <Icon {...p} d={<>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>} />,
  Compare: (p) => <Icon {...p} d={<>
    <path d="M9 3v18" />
    <path d="M15 3v18" />
    <path d="M3 9h6" />
    <path d="M15 15h6" />
  </>} />,
  Settings: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.9 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.9l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </>} />,
  Search: (p) => <Icon {...p} d={<>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </>} />,
  Bell: (p) => <Icon {...p} d={<>
    <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9z" />
    <path d="M10 21a2 2 0 004 0" />
  </>} />,
  Plus: (p) => <Icon {...p} d={<><path d="M12 5v14M5 12h14" /></>} />,
  ArrowRight: (p) => <Icon {...p} d={<><path d="M5 12h14M13 5l7 7-7 7" /></>} />,
  ArrowUpRight: (p) => <Icon {...p} d={<><path d="M7 17L17 7M7 7h10v10" /></>} />,
  ChevronRight: (p) => <Icon {...p} d={<><path d="M9 6l6 6-6 6" /></>} />,
  ChevronDown: (p) => <Icon {...p} d={<><path d="M6 9l6 6 6-6" /></>} />,
  Paperclip: (p) => <Icon {...p} d={<>
    <path d="M21 11L11.6 20.4a5 5 0 11-7-7L14 4a3.5 3.5 0 015 5l-9.4 9.4a2 2 0 11-2.8-2.8L15 8" />
  </>} />,
  Copy: (p) => <Icon {...p} d={<>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </>} />,
  Download: (p) => <Icon {...p} d={<>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </>} />,
  Refresh: (p) => <Icon {...p} d={<>
    <path d="M3 12a9 9 0 0115-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 01-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </>} />,
  Check: (p) => <Icon {...p} d={<><path d="M20 6L9 17l-5-5" /></>} />,
  CheckCircle: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-6" />
  </>} />,
  X: (p) => <Icon {...p} d={<><path d="M18 6L6 18M6 6l12 12" /></>} />,
  Image: (p) => <Icon {...p} d={<>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </>} />,
  Code: (p) => <Icon {...p} d={<>
    <path d="M16 18l6-6-6-6" />
    <path d="M8 6l-6 6 6 6" />
  </>} />,
  FileText: (p) => <Icon {...p} d={<>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h6M8 9h2" />
  </>} />,
  Play: (p) => <Icon {...p} fill="currentColor" sw={0} d={<><path d="M6 4l14 8-14 8z" /></>} />,
  Pause: (p) => <Icon {...p} fill="currentColor" sw={0} d={<>
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </>} />,
  Star: (p) => <Icon {...p} d={<>
    <path d="M12 2l3.1 6.3L22 9.3l-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1L12 2z" />
  </>} />,
  Bolt: (p) => <Icon {...p} d={<>
    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
  </>} />,
  Globe: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
  </>} />,
  Layers: (p) => <Icon {...p} d={<>
    <path d="M12 2l10 6-10 6L2 8l10-6z" />
    <path d="M2 16l10 6 10-6" />
    <path d="M2 12l10 6 10-6" />
  </>} />,
  Filter: (p) => <Icon {...p} d={<>
    <path d="M22 3H2l8 9.5V20l4 2v-9.5L22 3z" />
  </>} />,
  Dots: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
    <circle cx="5" cy="12" r="1" fill="currentColor" />
  </>} />,
  Clock: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>} />,
  Coin: (p) => <Icon {...p} d={<>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9a2 2 0 014 0c0 1-1 1.5-2 2s-2 1-2 2a2 2 0 004 0" />
  </>} />,
  Diff: (p) => <Icon {...p} d={<>
    <path d="M12 3v18" />
    <path d="M5 8l-2 2 2 2" />
    <path d="M19 16l2-2-2-2" />
    <path d="M3 10h6" />
    <path d="M15 14h6" />
  </>} />,
  Brain: (p) => <Icon {...p} d={<>
    <path d="M9 2a3 3 0 013 3v14a3 3 0 01-6 0v-1a3 3 0 01-3-3v-1a3 3 0 010-6 3 3 0 013-3 3 3 0 013-3z" />
    <path d="M15 2a3 3 0 00-3 3v14a3 3 0 006 0v-1a3 3 0 003-3v-1a3 3 0 000-6 3 3 0 00-3-3 3 3 0 00-3-3z" />
  </>} />,
  Spark: (p) => <Icon {...p} d={<>
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
  </>} />,
  Send: (p) => <Icon {...p} fill="currentColor" sw={0} d={<>
    <path d="M3 12l18-8-7 18-3-8-8-2z" />
  </>} />,
  Beaker: (p) => <Icon {...p} d={<>
    <path d="M9 2v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-5-11V2" />
    <path d="M8 2h8" />
    <path d="M6 14h12" />
  </>} />,
};

// ─────────────────────────────────────────────────────────────────
// Brand mark
// ─────────────────────────────────────────────────────────────────

const BrandMark = ({ size = 36 }) => (
  <div
    style={{
      width: size, height: size,
      borderRadius: size * 0.28,
      background:
        "radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.3), transparent 50%), " +
        "linear-gradient(135deg, var(--ac), var(--ac-2) 55%, var(--ac-3))",
      position: "relative",
      display: "grid",
      placeItems: "center",
      boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 8px 24px var(--ac-soft)",
      flexShrink: 0,
    }}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="oklch(0.16 0.012 220)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l4 8-4 8" />
      <path d="M14 4l5 8-5 8" />
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Sidebar + Top nav
// ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "builder",   label: "Builder",   icon: I.Pen,   kbd: "B" },
  { id: "optimizer", label: "Optimizer", icon: I.Wand,  kbd: "O" },
  { id: "templates", label: "Templates", icon: I.Grid,  kbd: "T" },
  { id: "library",   label: "Library",   icon: I.Archive, kbd: "L" },
  { id: "compare",   label: "Compare",   icon: I.Compare, kbd: "C" },
];

const Sidebar = ({ route, onRoute }) => (
  <aside className="sidebar">
    <div className="brand">
      <BrandMark />
      <div>
        <div className="brand-name">PromptLab</div>
        <div className="brand-sub">v2 · Workspace</div>
      </div>
    </div>

    <div>
      <div className="nav-section-label">Workspace</div>
      <nav className="nav-list">
        {NAV_ITEMS.map((n) => (
          <button
            key={n.id}
            className="nav-item"
            data-active={route === n.id}
            onClick={() => onRoute(n.id)}
          >
            <n.icon size={16} />
            <span>{n.label}</span>
            <span className="kbd">{n.kbd}</span>
          </button>
        ))}
      </nav>
    </div>

    <div>
      <div className="nav-section-label">Recent</div>
      <nav className="nav-list">
        {[
          "Cold-email rewrite",
          "Image brief — sneakers",
          "SQL → English audit",
        ].map((t, i) => (
          <button key={i} className="nav-item" style={{ fontSize: 12.5 }}>
            <I.Clock size={14} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
          </button>
        ))}
      </nav>
    </div>

    <div className="sidebar-foot">
      <div className="usage-card">
        <div className="usage-row">
          <b>Quota</b>
          <span className="mono subtle">12.4k / 50k</span>
        </div>
        <div className="usage-bar"><div style={{ width: "24.8%" }} /></div>
        <div className="usage-meta">Resets May 31 · <a style={{ color: "var(--ac)" }}>Upgrade</a></div>
      </div>
    </div>
  </aside>
);

const TopNav = ({ route, onRoute }) => (
  <nav className="topnav">
    <div className="brand">
      <BrandMark size={30} />
      <div className="brand-name" style={{ fontSize: 18 }}>PromptLab</div>
    </div>
    <div className="nav-list">
      {NAV_ITEMS.map((n) => (
        <button
          key={n.id}
          className="nav-item"
          data-active={route === n.id}
          onClick={() => onRoute(n.id)}
        >
          <n.icon size={14} />
          <span>{n.label}</span>
        </button>
      ))}
    </div>
    <div className="topnav-right">
      <div className="search">
        <I.Search size={14} />
        <input placeholder="Search prompts…" />
        <span className="kbd">⌘ K</span>
      </div>
      <button className="icon-btn"><I.Bell size={16} /></button>
      <div className="avatar">RA</div>
    </div>
  </nav>
);

// ─────────────────────────────────────────────────────────────────
// Header bar
// ─────────────────────────────────────────────────────────────────

const HeaderBar = ({ route, panelPosition, onTogglePanel }) => {
  const crumbsByRoute = {
    builder:   ["Workspace", "Builder"],
    optimizer: ["Workspace", "Optimizer"],
    templates: ["Workspace", "Templates"],
    library:   ["Workspace", "Library"],
    compare:   ["Workspace", "Compare"],
  };
  const crumbs = crumbsByRoute[route] || ["Workspace"];

  return (
    <div className="headerbar">
      <div className="crumbs">
        <span>{crumbs[0]}</span>
        <I.ChevronRight size={12} />
        <b>{crumbs[1]}</b>
      </div>
      <span className="chip-mini">
        <span className="live-dot" style={{ width: 6, height: 6, boxShadow: "0 0 0 3px var(--ac-soft)" }} />
        SYNCED
      </span>
      <div className="header-tools">
        <div className="search">
          <I.Search size={14} />
          <input placeholder="Search prompts, templates…" />
          <span className="kbd">⌘ K</span>
        </div>
        <button className="icon-btn" title="Notifications"><I.Bell size={15} /></button>
        <button className="icon-btn" title="Help"><I.Globe size={15} /></button>
        <div className="avatar">RA</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Sparkline (mini SVG for stat cards)
// ─────────────────────────────────────────────────────────────────

const Sparkline = ({ values, color = "var(--ac)", h = 28 }) => {
  const w = 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block" }}>
      <defs>
        <linearGradient id={`spk-${color.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spk-${color.replace(/\W/g, "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────
// Ring (score)
// ─────────────────────────────────────────────────────────────────

const Ring = ({ value, size = 72, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (value / 100);
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} fill="none">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ac)" />
            <stop offset="100%" stopColor="var(--ac-2)" />
          </linearGradient>
        </defs>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - dash}
        />
      </svg>
      <div className="ring-num">{value}</div>
    </div>
  );
};

// Expose to global scope (Babel scripts don't share scope by default)
Object.assign(window, {
  Icon, I, BrandMark, Sidebar, TopNav, HeaderBar, Sparkline, Ring, NAV_ITEMS,
});
