import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const INITIAL_JS_BUDGET_KB = 700;
const INITIAL_CSS_BUDGET_KB = 80;

/**
 * Budget for what the browser must download before the app is usable.
 *
 * This previously summed every emitted .js/.css file, so code split behind a
 * dynamic import still counted against the initial budget — which made the
 * gate impossible to satisfy by the very technique it exists to encourage.
 * It now walks the entry chunks' static import graph and counts only that.
 */
function enforceInitialAssetBudget() {
  return {
    name: "enforce-initial-asset-budget",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle);
      const initialJs = new Set();
      const initialCss = new Set();

      const visit = (fileName) => {
        if (!fileName || initialJs.has(fileName)) return;
        const chunk = bundle[fileName];
        if (!chunk || chunk.type !== "chunk") return;
        initialJs.add(fileName);
        for (const css of chunk.viteMetadata?.importedCss || []) initialCss.add(css);
        // `imports` is static; `dynamicImports` is deliberately not followed.
        for (const next of chunk.imports || []) visit(next);
      };

      for (const chunk of chunks) {
        if (chunk.type === "chunk" && chunk.isEntry) visit(chunk.fileName);
      }

      const bytes = (fileName) => {
        const item = bundle[fileName];
        if (!item) return 0;
        return (item.type === "asset" ? item.source : item.code)?.length || 0;
      };
      const sumKb = (names) => [...names].reduce((total, n) => total + bytes(n), 0) / 1024;

      const jsKb = sumKb(initialJs);
      const cssKb = sumKb(initialCss);
      const totalKb =
        chunks.reduce(
          (total, item) => total + ((item.type === "asset" ? item.source : item.code)?.length || 0),
          0
        ) / 1024;

      if (jsKb > INITIAL_JS_BUDGET_KB || cssKb > INITIAL_CSS_BUDGET_KB) {
        this.error(
          `Initial assets exceed budget: JS ${jsKb.toFixed(1)}/${INITIAL_JS_BUDGET_KB} KiB, CSS ${cssKb.toFixed(1)}/${INITIAL_CSS_BUDGET_KB} KiB`
        );
      }
      console.log(
        `Initial asset budget: JS ${jsKb.toFixed(1)}/${INITIAL_JS_BUDGET_KB} KiB, ` +
          `CSS ${cssKb.toFixed(1)}/${INITIAL_CSS_BUDGET_KB} KiB (all emitted: ${totalKb.toFixed(1)} KiB)`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), enforceInitialAssetBudget()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react") || id.includes("react-dom")) return "react";
          return "vendor";
        },
      },
    },
  },
  define: {
    "import.meta.env.VITE_APP_BUILD": JSON.stringify(
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev"
    ),
  },
  server: {
    allowedHosts: ["desktop-05stuq0.tail62c9b1.ts.net", "desktop-05stuq0"],
    hmr: false,
  },
});
