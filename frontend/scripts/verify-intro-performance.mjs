import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local preview only");
const assets = JSON.parse(await readFile(new URL("../src/generated/intro-assets.json", import.meta.url), "utf8"));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let checks = 0;
const measurements = [];
const output = await mkdtemp(path.join(tmpdir(), "algolab-fast-intro-"));
function check(condition, message) { assert.ok(condition, message); checks++; }
try {
  for (const key of ["model", "landscape", "brand", "soundtrack"]) {
    const response = await fetch(origin + assets[key]);
    check(response.ok, `${key}: downloadable asset`);
    check(response.headers.get("cache-control")?.includes("immutable"), `${key}: immutable versioned cache`);
    const bytes = Buffer.from(await response.arrayBuffer());
    check(assets[key].includes(createHash("sha256").update(bytes).digest("hex").slice(0, 12)), `${key}: filename matches content`);
  }
  for (const mode of [{ name: "desktop", width: 1365, height: 768, cpu: 1 }, { name: "mobile-slow4g", width: 390, height: 844, cpu: 4 }]) {
    const context = await browser.newContext({ viewport: { width: mode.width, height: mode.height }, hasTouch: mode.width < 500 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setBlockedURLs", { urls: ["*/api/*"] });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: mode.cpu });
    if (mode.cpu > 1) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await page.addInitScript(() => {
      window.__loadingAudit = { events: [], longTasks: [] };
      addEventListener("message", event => { if (event.data?.type === "algolab:ready") window.__loadingAudit.events.push({ type: "ready", time: performance.now() }); });
      document.addEventListener("playing", event => { if (event.target instanceof HTMLMediaElement) window.__loadingAudit.events.push({ type: "playing", time: performance.now() }); }, true);
      new PerformanceObserver(entries => window.__loadingAudit.longTasks.push(...entries.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration })))).observe({ type: "longtask", buffered: true });
    });
    for (const visit of ["cold", "warm"]) {
      await page.goto(origin + "/?intro=preview", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__loadingAudit.events.some(event => event.type === "ready"), { timeout: 45000 });
      await page.waitForFunction(() => document.querySelector("audio[data-intro-soundtrack]")?.currentTime > .05, { timeout: 15000 });
      const scene = page.frames().find(frame => frame.url().includes("/intro-scene/index.html"));
      check(Boolean(scene), `${mode.name}: original continuous scene present`);
      const parent = await page.evaluate(() => ({ ...window.__loadingAudit, resources: performance.getEntriesByType("resource").map(entry => ({ url: new URL(entry.name).pathname, start: entry.startTime, bytes: entry.transferSize, decoded: entry.decodedBodySize })) }));
      const details = await scene.evaluate(() => ({ diagnostics: window.__sceneDiagnostics(), continuity: window.__continuityDiagnostics(), resources: performance.getEntriesByType("resource").map(entry => ({ url: new URL(entry.name).pathname, start: entry.startTime, bytes: entry.transferSize, decoded: entry.decodedBodySize })) }));
      check(![...parent.resources, ...details.resources].some(entry => entry.url.includes("/assets/vendor/")), `${mode.name}: no unminified Three.js waterfall`);
      const preloaded = parent.resources.filter(entry => assets.modulePreloads.includes(entry.url) || entry.url === assets.model);
      const frameRequest = parent.resources.find(entry => entry.url === "/intro-scene/index.html");
      check(preloaded.length >= assets.modulePreloads.length + 1 && preloaded.every(entry => entry.start <= frameRequest.start), `${mode.name}: engine and model start before iframe hydration`);
      check(details.diagnostics.room.staticDrawCallsSaved > 20, `${mode.name}: static room batching reduces render work`);
      check(details.continuity.canvasCount === 1 && details.continuity.instanceId, `${mode.name}: one canvas and original protagonist`);
      const jsBytes = details.resources.filter(entry => assets.modulePreloads.includes(entry.url)).reduce((sum, entry) => sum + entry.decoded, 0);
      check(jsBytes < 900000, `${mode.name}: critical JS stays below budget`);
      if (visit === "warm") check(details.resources.filter(entry => entry.url.includes("/runtime/")).every(entry => entry.bytes === 0), `${mode.name}: warm scene assets are reused without network transfer`);
      const readyMs = parent.events.find(event => event.type === "ready").time;
      const playbackMs = parent.events.find(event => event.type === "playing")?.time;
      measurements.push({ mode: mode.name, visit, readyMs: Math.round(readyMs), playbackMs: Math.round(playbackMs), sceneWaitMs: Math.round(readyMs - frameRequest.start), criticalJavascriptBytes: jsBytes, drawCalls: details.diagnostics.drawCalls, staticDrawCallsSaved: details.diagnostics.room.staticDrawCallsSaved, longTasks: parent.longTasks.length });
      if (visit === "cold") await page.screenshot({ path: path.join(output, mode.name + ".png") });
    }
    check(errors.length === 0, `${mode.name}: no browser errors: ${errors.join("; ")}`);
    await context.close();
  }
  for (const preference of ["never", "seen", "reduced"]) {
    const context = await browser.newContext({ reducedMotion: preference === "reduced" ? "reduce" : "no-preference" });
    await context.addInitScript(preference => { if (preference === "seen") localStorage.setItem("algolab:intro:seen", "1"); else if (preference === "never") localStorage.setItem("algolab:intro:preference", "never"); }, preference);
    const page = await context.newPage();
    const downloaded = [];
    page.on("request", request => { if (new URL(request.url()).pathname.includes("/intro-scene/runtime/")) downloaded.push(request.url()); });
    await page.goto(origin, { waitUntil: "networkidle" });
    check(downloaded.length === 0, `${preference}: do not waste bandwidth preloading a disabled intro`);
    await context.close();
  }
  console.log(JSON.stringify({ checks, measurements, output, caveat: "Local automated browser and software GPU; not a real mobile device or production field data." }));
} finally { await browser.close(); }
