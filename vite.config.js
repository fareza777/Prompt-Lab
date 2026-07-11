import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const INITIAL_JS_BUDGET_KB = 700;
const INITIAL_CSS_BUDGET_KB = 80;

function enforceInitialAssetBudget() {
  return {
    name: "enforce-initial-asset-budget",
    generateBundle(_options, bundle) {
      const sizeKb = (extension) => Object.values(bundle)
        .filter((item) => item.fileName.endsWith(extension))
        .reduce((total, item) => total + (item.type === "asset" ? item.source.length : item.code.length), 0) / 1024;
      const jsKb = sizeKb(".js");
      const cssKb = sizeKb(".css");
      if (jsKb > INITIAL_JS_BUDGET_KB || cssKb > INITIAL_CSS_BUDGET_KB) {
        this.error(`Initial assets exceed budget: JS ${jsKb.toFixed(1)}/${INITIAL_JS_BUDGET_KB} KiB, CSS ${cssKb.toFixed(1)}/${INITIAL_CSS_BUDGET_KB} KiB`);
      }
      console.log(`Initial asset budget: JS ${jsKb.toFixed(1)}/${INITIAL_JS_BUDGET_KB} KiB, CSS ${cssKb.toFixed(1)}/${INITIAL_CSS_BUDGET_KB} KiB`);
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
