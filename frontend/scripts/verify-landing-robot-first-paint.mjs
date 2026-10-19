import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const output = await mkdtemp(path.join(tmpdir(), "algolab-first-paint-"));
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; console.log(`PASS ${label}`); }
try {
  for (const [name, width, height] of [["mobile", 390, 844], ["small-mobile", 320, 568], ["tablet", 682, 1000], ["landscape", 844, 390], ["desktop", 1440, 1000], ["wide-desktop", 1920, 1080]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 700 });
    await context.addInitScript(() => {
      localStorage.setItem("algolab:intro:seen", "1");
      window.__posterSamples = [];
      const sample = () => {
        const stage = document.querySelector(".hero-stage"), svg = stage?.querySelector(".robot-poster svg");
        if (svg) {
          const a = stage.getBoundingClientRect(), b = svg.getBoundingClientRect();
          window.__posterSamples.push({ stage: { x: a.x, y: a.y, width: a.width, height: a.height }, svg: { x: b.x, y: b.y, width: b.width, height: b.height },
            fits: b.width > 0 && b.height > 0 && b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1 });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await context.route("**/api/**", route => route.abort());
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await context.route("**/models/algolab-robot.glb", async route => { await gate; await route.continue(); });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator(".hero-stage .robot-poster svg").waitFor({ state: "visible" });
    await page.waitForTimeout(600);
    const before = await page.locator(".hero-stage").boundingBox();
    const samples = await page.evaluate(() => window.__posterSamples);
    console.log(JSON.stringify({ name, first: samples[0], last: samples.at(-1), invalid: samples.filter(s => !s.fits).slice(0, 2) }));
    await page.screenshot({ path: path.join(output, `${name}-loading.png`) });
    check(samples.length > 2 && samples.every(s => s.fits), `${name}: drawn robot fits its reserved space on every loading frame`);
    const maxDifference = Math.max(...samples.map(s => Math.abs(s.svg.height - samples[0].svg.height)));
    check(maxDifference < 2, `${name}: drawing never starts oversized and shrinks later`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no sideways overflow`);
    release();
    await page.locator(".hero-stage .robot-stage-ready").waitFor({ timeout: 45000 });
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector(".hero-stage .robot-poster")).opacity) === 0);
    check(JSON.stringify(await page.locator(".hero-stage").boundingBox()) === JSON.stringify(before), `${name}: loading 3D keeps the same reserved space`);
    check(await page.locator(".hero-stage .robot-poster").evaluate(n => Number(getComputedStyle(n).opacity) === 0), `${name}: drawing yields to the loaded model`);
    check(errors.length === 0, `${name}: no runtime errors: ${errors.join("; ")}`);
    await page.screenshot({ path: path.join(output, `${name}-ready.png`) });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".hero-stage .robot-stage-ready").waitFor({ timeout: 45000 });
    check(await page.evaluate(() => window.__posterSamples.length > 0 && window.__posterSamples.every(s => s.fits)), `${name}: reload also keeps every drawing frame inside the reserved space`);
    await context.close();
  }
  console.log(JSON.stringify({ checks, output }));
} finally { await browser.close(); }
