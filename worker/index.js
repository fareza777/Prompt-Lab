// Cloudflare Worker entry for AI Work Studio (prompt-lab.xyz).
//
// - Static site (Vite build in ./dist) is served by Workers Static Assets.
// - /api/* is handled by the existing Express app (server/index.js) through
//   the Node.js HTTP compatibility layer (nodejs_compat + cloudflare:node).
// - /app/<anything> is rewritten to the /app shell, matching the old
//   vercel.json rewrite, so the Android app (server.url = https://prompt-lab.xyz/app)
//   keeps working without an app update.
import { httpServerHandler } from "cloudflare:node";
import app from "../server/index.js";

const PORT = 8787;
app.listen(PORT);
const api = httpServerHandler({ port: PORT });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const response = await api.fetch(request, env, ctx);
      // Mirror the old vercel.json /api headers.
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store, max-age=0");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    if (url.pathname.startsWith("/app/") && url.pathname !== "/app/") {
      const shell = new URL("/app", url);
      return env.ASSETS.fetch(new Request(shell, request));
    }

    return env.ASSETS.fetch(request);
  },
};
