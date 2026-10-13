import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Visual tests must use an isolated localhost frontend.");
const activeKey = "algolab.auth-robot.easter-egg.active.v1";
const sessionKey = "algolab.auth-robot.easter-egg.session.v1";
const output = await mkdtemp(path.join(tmpdir(), "algolab-auth-transition-"));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const contexts = [];
const checks = [];
const errors = [];
const consoleErrors = [];
const blockedExternalOrigins = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); console.log(`PASS: ${message}`); };

async function setup({ name, mobile = false, reduce = false, fallback = false, initiallyRare = true }) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    reducedMotion: reduce ? "reduce" : "no-preference",
    storageState: { cookies: [], origins: [{ origin, localStorage: initiallyRare ? [{ name: activeKey, value: "active" }] : [] }] },
  });
  contexts.push(context);
  await context.addInitScript(({ sessionKey, fallback }) => {
    sessionStorage.setItem(sessionKey, "drawn");
    if (fallback) Object.defineProperty(Navigator.prototype, "connection", { configurable: true, get: () => ({ saveData: true }) });
    // Only this ephemeral test profile is instrumented. Native CSS, WebGL and
    // WebAudio still run; the browser hardware output is muted at launch.
    const evidence = { scene: [], zoom: [], starts: [], ended: [], zoomDuration: null, gloomDuration: null };
    window.__visualTransitionEvidence = evidence;
    const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
    if (NativeAudioContext) {
      const createSource = NativeAudioContext.prototype.createBufferSource;
      NativeAudioContext.prototype.createBufferSource = function (...args) {
        const source = createSource.apply(this, args);
        const start = source.start;
        source.start = function (...values) {
          const result = start.apply(this, values);
          evidence.starts.push({ at: performance.now(), duration: source.buffer?.duration });
          return result;
        };
        source.addEventListener("ended", () => evidence.ended.push(performance.now()));
        return source;
      };
    }
    let sampling = false;
    let lastSample = 0;
    const sample = () => {
      const now = performance.now();
      const gloom = document.querySelector("[data-auth-eerie]");
      const stage = document.querySelector("[data-auth-companion] .robot-stage");
      if (gloom && evidence.scene.length < 1600 && now - lastSample > 5) {
        const style = getComputedStyle(gloom);
        evidence.scene.push({ at: now, opacity: Number(style.opacity), turn: stage?.dataset.hauntedTurn, yaw: stage?.dataset.robotYaw === undefined ? null : Number(stage.dataset.robotYaw), mode: stage?.className });
        const animation = gloom.getAnimations()[0];
        if (animation) evidence.gloomDuration = animation.effect.getTiming().duration;
        lastSample = now;
      }
      const dialog = document.querySelector('[data-auth-jumpscare][data-revealed="true"]');
      const image = dialog?.querySelector("img");
      if (image && evidence.zoom.length < 1400) {
        const style = getComputedStyle(image);
        const box = image.getBoundingClientRect();
        const transform = new DOMMatrix(style.transform);
        const animation = image.getAnimations()[0];
        if (animation) evidence.zoomDuration = animation.effect.getTiming().duration;
        evidence.zoom.push({ at: now, scale: transform.a, width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, objectFit: style.objectFit });
      }
      if (sampling) requestAnimationFrame(sample);
    };
    const observer = new MutationObserver(() => {
      if (!sampling && document.querySelector("[data-auth-eerie]")) {
        sampling = true;
        requestAnimationFrame(sample);
      }
      // Observe the initial .06 scale before the first compositor frame. Later
      // rAF samples prove that it genuinely moves instead of merely declaring CSS.
      if (document.querySelector('[data-auth-jumpscare][data-revealed="true"]') && evidence.zoom.length === 0) sample();
    });
    observer.observe(document, { childList: true, attributes: true, subtree: true, attributeFilter: ["data-revealed"] });
  }, { sessionKey, fallback });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      blockedExternalOrigins.push(url.origin);
      await route.abort("blockedbyclient");
    } else if (url.pathname.startsWith("/api/")) {
      await route.fulfill({ status: 401, json: { exitoso: false, mensaje: "API bloqueada por prueba visual local" } });
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${name}: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${name}: ${message.text()}`); });
  await page.goto(base + (mobile ? "/registrarse" : "/iniciar-sesion"));
  return { context, page, name, reduce, fallback };
}

const evidence = (page) => page.evaluate(() => structuredClone(window.__visualTransitionEvidence));
async function assertArrival(test) {
  const { page, name, reduce, fallback } = test;
  const stage = page.locator("[data-auth-companion] .robot-stage");
  await page.getByRole("button", { name: "Examinar el robot de AlgoLab", exact: true }).waitFor({ state: "visible", timeout: 120000 });
  await page.waitForFunction(() => document.querySelector("[data-auth-companion] .robot-stage")?.dataset.hauntedTurn === "settled", null, { timeout: 40000 });
  await page.waitForTimeout(200);
  const data = await evidence(page);
  await writeFile(path.join(output, `${name}-arrival-samples.json`), JSON.stringify(data, null, 2));
  console.log(`Visual evidence: ${output}`);
  check(data.starts.length === 0, `${name}: appearance and robot turn never autoplay the scream`);
  check(Math.abs(Number(await stage.getAttribute("data-robot-yaw")) - Math.PI) < 0.015, `${name}: final robot orientation is fully back-facing`);
  if (reduce) {
    check(data.scene.every((sample) => sample.opacity === 1) && data.gloomDuration === null, `${name}: reduced motion skips the fade`);
    check(!data.scene.some((sample) => sample.turn === "turning" && sample.yaw > 0.05 && sample.yaw < Math.PI - 0.05), `${name}: reduced motion skips intermediate robot rotation`);
  } else {
    check(data.gloomDuration === 700, `${name}: the smooth darkening has a finite 700 ms duration`);
    check(data.scene.some((sample) => sample.opacity < 0.25) && data.scene.at(-1).opacity > 0.99, `${name}: real rendered opacity progresses from normal to dark`);
    // Cold WebGL compilation can temporarily occupy the JS thread while the CSS
    // compositor keeps fading. The warmed live entry and SVG fallback explicitly
    // verify intermediate opacity instead of making cold-start rAF scheduling flaky.
    if (name === "live-normal-to-rare" || fallback) check(data.scene.some((sample) => sample.opacity > 0.1 && sample.opacity < 0.9), `${name}: the live fade renders intermediate shades`);
    check(data.scene.some((sample) => sample.turn === "turning" && Math.abs(sample.yaw) < 0.6) && data.scene.some((sample) => sample.turn === "turning" && sample.yaw > 0.2 && sample.yaw < Math.PI - 0.2), `${name}: the visible robot actually turns from front through side to back`);
  }
  check((await stage.getAttribute("class")).includes(fallback ? "robot-stage-fallback" : "robot-stage-ready"), `${name}: expected ${fallback ? "lightweight fallback" : "real 3D"} renderer is active`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no horizontal page overflow`);
  await page.screenshot({ path: path.join(output, `${name}-ready.png`), fullPage: true });
}

async function assertZoom(test, complete = false) {
  const { page, name, reduce } = test;
  const robot = page.getByRole("button", { name: "Examinar el robot de AlgoLab", exact: true });
  const dialog = page.getByRole("dialog", { name: "Sorpresa de AlgoLab", exact: true });
  await robot.click();
  await dialog.waitFor({ state: "visible" });
  await page.waitForFunction(() => window.__visualTransitionEvidence.zoom.length > 4 && window.__visualTransitionEvidence.starts.length === 1, null, { timeout: 5000 });
  await page.waitForTimeout(220);
  const data = await evidence(page);
  const first = data.zoom[0];
  const last = data.zoom.at(-1);
  if (reduce) {
    check(data.zoomDuration === null && data.zoom.every((sample) => Math.abs(sample.scale - 1) < 0.001), `${name}: reduced motion displays the image directly without zoom`);
  } else {
    check(data.zoomDuration === 120, `${name}: the one-shot image rush lasts only 120 ms`);
    check(first.scale < 0.15 && data.zoom.some((sample) => sample.scale > 0.15 && sample.scale < 0.96), `${name}: image really starts small and rapidly grows through intermediate scales`);
    const full = data.zoom.find((sample) => sample.scale > 0.999);
    check(full && full.at - first.at < 280, `${name}: the real animation covers the viewport quickly`);
  }
  check(Math.abs(last.width - last.viewportWidth) < 1 && Math.abs(last.height - last.viewportHeight) < 1 && last.objectFit === "cover", `${name}: final image covers the entire viewport`);
  check(data.starts.length === 1 && data.starts[0].duration > 8 && data.starts[0].duration < 8.3, `${name}: only the explicit click starts the complete selected scream`);
  await page.screenshot({ path: path.join(output, `${name}-scare-fullscreen.png`) });
  if (complete) {
    await page.waitForFunction(() => window.__visualTransitionEvidence.ended.length === 1, null, { timeout: 11000 });
    const ended = (await evidence(page)).ended[0];
    await page.waitForTimeout(1400);
    check(await dialog.isVisible() && (await evidence(page)).zoom.slice(-10).every((sample) => sample.scale === 1), `${name}: the image stays fixed throughout the silent pause`);
    await dialog.waitFor({ state: "detached", timeout: 4000 });
    const completed = await page.evaluate(() => performance.now());
    check(completed - ended >= 2900 && completed - ended < 4500, `${name}: normality returns after the unchanged three-second silent pause`);
    check(await page.locator("[data-auth-eerie]").count() === 0, `${name}: finishing clears the dark scene`);
  } else {
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
  }
  await writeFile(path.join(output, `${name}-samples.json`), JSON.stringify(await evidence(page), null, 2));
}

try {
  const desktop = await setup({ name: "desktop" });
  await assertArrival(desktop);
  await assertZoom(desktop, true);
  await desktop.context.close();

  const mobile = await setup({ name: "mobile", mobile: true });
  await assertArrival(mobile);
  await assertZoom(mobile);
  await mobile.context.close();

  const reduced = await setup({ name: "reduced-motion", mobile: true, reduce: true });
  await assertArrival(reduced);
  await assertZoom(reduced);
  await reduced.context.close();

  const fallback = await setup({ name: "fallback", fallback: true });
  await assertArrival(fallback);
  await fallback.context.close();

  const live = await setup({ name: "live-normal-to-rare", initiallyRare: false });
  await live.page.getByRole("button", { name: "Mover el robot de AlgoLab", exact: true }).waitFor({ state: "visible", timeout: 120000 });
  await live.page.locator("[data-auth-companion] .robot-stage-ready").waitFor({ state: "visible", timeout: 30000 });
  await live.page.locator("#correo").fill("visual-transition@example.invalid");
  await live.page.locator("#contrasena").fill("synthetic-local-only");
  // Simulate the public cross-tab storage notification, in this fresh profile only.
  await live.page.evaluate((key) => {
    localStorage.setItem(key, "active");
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: "active", storageArea: localStorage }));
  }, activeKey);
  await assertArrival(live);
  check(await live.page.locator("#correo").inputValue() === "visual-transition@example.invalid" && await live.page.locator("#contrasena").inputValue() === "synthetic-local-only", "Live activation preserves all typed credentials and form usability");
  await live.context.close();
  assert.deepEqual(errors, [], "No runtime errors in the visual transition flows");
  console.log(JSON.stringify({ ok: true, checks, output, blockedExternalOrigins: [...new Set(blockedExternalOrigins)] }, null, 2));
} finally {
  if (errors.length || consoleErrors.length) console.log(JSON.stringify({ errors, consoleErrors }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
