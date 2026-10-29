import { test } from "node:test";
import assert from "node:assert/strict";
import { api, tools } from "../dist/app.js";
import { sample } from "../dist/engine.js";
const request = (path, body, headers = {}) =>
  api(
    new Request("http://localhost:3000" + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const rpc = (method, params, id = 1) =>
  request("/mcp", { jsonrpc: "2.0", id, method, params });
test("health and schema endpoints", async () => {
  assert.equal(
    (await api(new Request("http://localhost:3000/health"))).status,
    200,
  );
  const r = await api(new Request("http://localhost:3000/api/template"));
  assert.ok((await r.json()).schema);
});
test("API rejects malformed JSON, large bodies, unsupported media and cross-origin posts", async () => {
  assert.equal((await request("/api/compare", "{")).status, 400);
  assert.equal((await request("/api/compare", "x".repeat(33000))).status, 413);
  assert.equal(
    (await request("/api/compare", {}, { "content-type": "text/plain" }))
      .status,
    415,
  );
  assert.equal(
    (await request("/api/compare", {}, { origin: "https://evil.example" }))
      .status,
    403,
  );
});
test("API returns functional reports and rejects missing second approval", async () => {
  const r = await request("/api/compare", {
    first: sample,
    second: sample,
    context: "professional",
  });
  assert.equal((await r.json()).score, 100);
  assert.equal(
    (
      await request("/api/compare", {
        first: sample,
        second: { ...sample, approved: false },
        context: "romantic",
      })
    ).status,
    400,
  );
});
test("MCP initialize, notifications, tool discovery, ping and version negotiation", async () => {
  const init = await (
    await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    })
  ).json();
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.equal(
    (
      await request("/mcp", {
        jsonrpc: "2.0",
        method: "notifications/initialized",
      })
    ).status,
    202,
  );
  const list = await (await rpc("tools/list")).json();
  assert.equal(list.result.tools.length, tools.length);
  assert.deepEqual((await (await rpc("ping")).json()).result, {});
  assert.equal(
    (await request("/mcp", {}, { "mcp-protocol-version": "bad" })).status,
    400,
  );
  assert.equal(
    (await request("/mcp", {}, { accept: "application/json" })).status,
    406,
  );
});
test("every published MCP tool executes real functionality", async () => {
  for (const t of tools) {
    const args =
      t.name === "get_profile_schema"
        ? {}
        : t.name === "find_compatible_matches"
          ? { profile: sample, context: "friendship", scope: "city" }
          : "first" in t.inputSchema.properties
            ? { first: sample, second: sample, context: "general" }
            : { profile: sample };
    const response = await (
      await rpc("tools/call", { name: t.name, arguments: args })
    ).json();
    assert.equal(response.result?.isError, false, t.name);
    assert.ok(response.result.content[0].text.length);
  }
});
test("MCP protocol and tool errors have distinct envelopes", async () => {
  assert.equal((await (await rpc("no-method")).json()).error.code, -32601);
  assert.equal(
    (await (await rpc("tools/call", { name: "no-tool" })).json()).error.code,
    -32602,
  );
  assert.equal(
    (
      await (
        await rpc("tools/call", {
          name: "get_personality_archetype",
          arguments: { profile: { ...sample, approved: false } },
        })
      ).json()
    ).result.isError,
    true,
  );
  assert.equal((await (await request("/mcp", "{")).json()).error.code, -32700);
  assert.equal((await (await request("/mcp", [])).json()).error.code, -32600);
});
