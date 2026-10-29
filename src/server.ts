import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { api, securityHeaders } from "./app.js";
const port = Number(process.env.PORT ?? 3000);
const origin = process.env.PUBLIC_ORIGIN ?? `http://localhost:${port}`;
const staticFiles: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", origin);
    if (url.origin !== new URL(origin).origin) {
      res.writeHead(400);
      res.end();
      return;
    }
    const file = staticFiles[url.pathname];
    if (file && req.method === "GET") {
      res.writeHead(200, { ...securityHeaders, "content-type": file[1] });
      res.end(await readFile(new URL(`./public/${file[0]}`, import.meta.url)));
      return;
    }
    let size = 0;
    const parts: Buffer[] = [];
    for await (const part of req) {
      size += part.length;
      if (size > 32768) {
        res.writeHead(413, securityHeaders);
        res.end('{"error":"Request too large"}');
        return;
      }
      parts.push(part);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    const response = await api(
      new Request(url, {
        method: req.method,
        headers,
        ...(parts.length ? { body: Buffer.concat(parts) } : {}),
      }),
    );
    res.writeHead(response.status, {
      ...securityHeaders,
      ...Object.fromEntries(response.headers),
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, securityHeaders);
    res.end('{"error":"Internal server error"}');
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, "0.0.0.0", () =>
  console.log(`Vennith listening on port ${port}`),
);
