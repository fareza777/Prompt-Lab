import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["desktop-05stuq0.tail62c9b1.ts.net", "desktop-05stuq0"],
    hmr: false,
  },
});
