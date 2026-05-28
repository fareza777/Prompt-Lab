import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
