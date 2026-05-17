// app.jsx — top-level shell, routing, and Tweaks panel wiring

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "cyan",
  "density": "regular",
  "navLayout": "sidebar",
  "panelPosition": "right"
}/*EDITMODE-END*/;

function App() {
  const [route, setRoute] = React.useState("builder");
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweaks at root level
  React.useEffect(() => {
    document.documentElement.dataset.palette = t.palette;
    document.documentElement.dataset.density = t.density;
  }, [t.palette, t.density]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const map = { b: "builder", o: "optimizer", t: "templates", l: "library", c: "compare" };
      if (map[e.key.toLowerCase()]) {
        e.preventDefault();
        setRoute(map[e.key.toLowerCase()]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  let Screen;
  switch (route) {
    case "optimizer": Screen = Optimizer; break;
    case "templates": Screen = Templates; break;
    case "library":   Screen = Library; break;
    case "compare":   Screen = Compare; break;
    default:          Screen = Builder;
  }

  return (
    <>
      <div className="bg-ambient" />
      <div className="bg-grid" />

      <div className="shell" data-nav={t.navLayout}>
        {t.navLayout === "sidebar"
          ? <Sidebar route={route} onRoute={setRoute} />
          : <TopNav  route={route} onRoute={setRoute} />}

        <main className="main">
          {t.navLayout === "sidebar" && (
            <HeaderBar route={route} />
          )}
          <Screen density={t.density} />
        </main>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio
          label="Palette"
          value={t.palette}
          options={["cyan", "amber", "violet", "lime"]}
          onChange={(v) => setTweak("palette", v)}
        />

        <TweakSection label="Density" />
        <TweakRadio
          label="Spacing"
          value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)}
        />

        <TweakSection label="Layout" />
        <TweakRadio
          label="Navigation"
          value={t.navLayout}
          options={["sidebar", "top"]}
          onChange={(v) => setTweak("navLayout", v)}
        />

        <TweakSection label="Jump to screen" />
        <TweakSelect
          label="Screen"
          value={route}
          options={["builder", "optimizer", "templates", "library", "compare"]}
          onChange={setRoute}
        />
      </TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
