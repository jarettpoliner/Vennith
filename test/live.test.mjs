import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium } from "playwright-core";
import { sample } from "../dist/engine.js";
const base = "http://localhost:3017";
const server = spawn(process.execPath, ["dist/server.js"], {
  env: { ...process.env, PORT: "3017", PUBLIC_ORIGIN: base },
  stdio: "pipe",
});
async function ready() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base + "/health")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Server not ready");
}
test("official MCP client interoperates with the running HTTP server", async () => {
  await ready();
  const client = new Client({
    name: "vennith-integration-test",
    version: "1.0.0",
  });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(base + "/mcp")),
    );
    const list = await client.listTools();
    assert.ok(
      list.tools.some((x) => x.name === "generate_compatibility_report"),
    );
    const report = await client.callTool({
      name: "compare_compatibility",
      arguments: { first: sample, second: sample, context: "professional" },
    });
    assert.equal(report.isError, false);
    assert.equal(JSON.parse(report.content[0].text).score, 100);
  } finally {
    await client.close();
  }
});
test("browser: approval gate, comparison contexts, discovery, export, imports and mobile layout", async () => {
  await ready();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.click('[data-tab="compare"]');
    await page.waitForSelector("#first-form select");
    await page.click("#compare-button");
    assert.match(await page.locator("#feedback").innerText(), /approve/);
    await page.check("#approve-first");
    await page.check("#approve-second");
    await page.click("#compare-button");
    await page.waitForSelector(".report");
    for (const c of ["friendship", "professional", "romantic"]) {
      await page.selectOption("#context", c);
      await page.waitForSelector(".report");
      assert.ok((await page.locator(".dimension").count()) === 5);
    }
    await page.click("#type-button");
    await page.waitForSelector("#result .type-card");
    const downloadPromise = page.waitForEvent("download");
    await page.click("#export-button");
    assert.equal(
      (await downloadPromise).suggestedFilename(),
      "my-vennith-card.svg",
    );
    await page.click('[data-tab="discover"]');
    await page.selectOption("#mode", "friendship");
    await page.click("#discover-button");
    await page.waitForSelector(".match");
    await page.locator(".match .secondary").first().click();
    assert.match(
      await page.locator(".match").first().innerText(),
      /cannot consent/,
    );
    await page.selectOption("#scope", "worldwide");
    await page.click("#discover-button");
    await page.waitForFunction(
      () => !document.querySelector("#discovery-status").textContent,
    );
    assert.ok((await page.locator(".match").count()) > 0);
    await page.click('[data-tab="compare"]');
    await page.click("#import-first");
    await page.fill(
      "#import-json",
      JSON.stringify({ ...sample, rawConversations: "never accept" }),
    );
    await page.click("#apply-import");
    await page.waitForFunction(
      () => document.querySelector("#import-error").textContent.length > 0,
    );
    assert.match(
      await page.locator("#import-error").innerText(),
      /Unknown profile/,
    );
    await page.fill("#import-json", JSON.stringify(sample));
    await page.click("#apply-import");
    await page.waitForFunction(
      () => !document.querySelector("#import-dialog").open,
    );
    assert.equal(await page.isChecked("#approve-first"), false);
    await page.screenshot({ path: "/tmp/vennith-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/vennith-mobile.png", fullPage: true });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
process.on("exit", () => server.kill());
// The test runner would otherwise retain this server handle indefinitely.
server.unref();
server.stdout.unref();
server.stderr.unref();
