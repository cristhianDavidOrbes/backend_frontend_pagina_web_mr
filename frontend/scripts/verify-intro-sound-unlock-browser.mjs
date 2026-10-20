import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; console.log(`PASS ${label}`); }
try {
  for (const [name, width, height] of [["desktop", 1365, 768], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: name === "mobile" });
    await context.route("**/api/**", route => route.abort());
    await context.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      const time = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
      window.__audioUnlock = false; window.__audioPlayCalls = 0; window.__audioSeekCalls = 0;
      document.addEventListener("pointerdown", () => { window.__audioUnlock = true; }, true);
      // Model autoplay denial, then a decoder that needs 650ms to start after
      // the visitor enables sound. The animation must keep moving throughout.
      HTMLMediaElement.prototype.play = function () {
        if (!window.__audioUnlock && !this.muted) return Promise.reject(new DOMException("Simulated autoplay denial", "NotAllowedError"));
        window.__audioPlayCalls++;
        if (!window.__decoderTested) { window.__decoderTested = true; window.__holdUntil = performance.now() + 650; window.__heldTime = time.get.call(this); }
        return play.call(this);
      };
      Object.defineProperty(HTMLMediaElement.prototype, "currentTime", { configurable: true,
        get() { return performance.now() < (window.__holdUntil || 0) ? window.__heldTime : time.get.call(this); },
        set(value) { window.__audioSeekCalls++; time.set.call(this, value); },
      });
      window.__filmClockTrace = [];
      window.addEventListener("message", event => {
        if (event.source === window && event.data?.type === "algolab:render") window.__filmClockTrace.push({ time: event.data.time, now: performance.now() });
      });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base + "/?intro=preview", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Activar sonido" }).waitFor();
    const frame = page.frames().find(f => f.url().includes("/intro-scene/index.html"));
    assert.ok(frame);
    await frame.waitForFunction(() => window.__continuityDiagnostics().time > 2);
    const start = await frame.evaluate(() => window.__continuityDiagnostics().time);
    await page.getByRole("button", { name: "Activar sonido" }).click();
    await page.waitForTimeout(420);
    const during = await frame.evaluate(() => window.__continuityDiagnostics().time);
    check(during - start > .25, `${name}: scene keeps advancing while newly enabled sound decodes`);
    await page.waitForTimeout(700);
    check(await page.locator("audio[data-intro-soundtrack]").evaluate(a => !a.paused && !a.muted), `${name}: music becomes audible without stopping the scene`);
    const calls = await page.evaluate(() => ({ plays: window.__audioPlayCalls, seeks: window.__audioSeekCalls }));
    await page.getByRole("button", { name: "Silenciar sonido" }).click();
    await page.getByRole("button", { name: "Activar sonido" }).click();
    check(await page.evaluate(({ plays, seeks }) => window.__audioPlayCalls === plays && window.__audioSeekCalls === seeks, calls), `${name}: mute/unmute never restarts or seeks an already playing soundtrack`);
    await page.getByRole("button", { name: "Pausar animación" }).click();
    const paused = await frame.evaluate(() => window.__continuityDiagnostics().time);
    await page.waitForTimeout(250);
    check(Math.abs(await frame.evaluate(() => window.__continuityDiagnostics().time) - paused) < .06, `${name}: explicit pause still stops the scene`);
    await page.getByRole("button", { name: "Reproducir animación" }).click();
    await frame.waitForFunction(t => window.__continuityDiagnostics().time > t + .1, paused);
    check(errors.length === 0, `${name}: no runtime errors: ${errors.join("; ")}`);
    await page.getByRole("button", { name: "Omitir", exact: true }).click();
    await context.close();
  }
  console.log(JSON.stringify({ checks }));
} finally { await browser.close(); }
