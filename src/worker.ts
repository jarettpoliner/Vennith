import { api, securityHeaders } from "./app.js";
export default {
  async fetch(
    req: Request,
    env: { ASSETS: { fetch: (req: Request) => Promise<Response> } },
  ) {
    const path = new URL(req.url).pathname;
    let response: Response;
    if (path.startsWith("/api/") || path === "/health" || path === "/mcp")
      response = await api(req);
    else response = await env.ASSETS.fetch(req);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(securityHeaders)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  },
};
