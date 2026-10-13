import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Recovery tests must use an isolated localhost frontend, never a live account.");
const output = await mkdtemp(path.join(tmpdir(), "algolab-auth-recovery-"));
const stageSelector = "[data-auth-companion] .robot-stage";
const modelPath = "/models/algolab-robot.glb";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const contexts = [];
const checks = [];
const errors = [];
const injectedLoadErrors = [];
const requests = [];
const blockedExternalOrigins = new Set();
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); console.log(`PASS: ${message}`); };

async function setup(name, { fail = () => false, reduce = false, saveData = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 980 }, reducedMotion: reduce ? "reduce" : "no-preference" });
  contexts.push(context);
  await context.addInitScript(({ saveData }) => {
    sessionStorage.setItem("algolab.auth-robot.easter-egg.session.v1", "drawn");
    if (saveData) Object.defineProperty(Navigator.prototype, "connection", { configurable: true, get: () => ({ saveData: true }) });
  }, { saveData });
  const test = { context, page: null, name, modelRequests: 0, documents: 0 };
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      blockedExternalOrigins.add(url.origin);
      await route.abort("blockedbyclient");
    } else if (url.pathname.startsWith("/api/")) {
      await route.fulfill({ status: 401, json: { exitoso: false, mensaje: "API bloqueada por prueba local de recuperación" } });
    } else if (url.pathname === modelPath) {
      test.modelRequests++;
      const failed = fail(test.modelRequests);
      requests.push({ name, index: test.modelRequests, failed, at: Date.now() });
      if (failed) await route.fulfill({ status: 503, contentType: "text/plain", body: "Deliberate model failure in isolated test" });
      else await route.continue();
    } else await route.continue();
  });
  const page = await context.newPage();
  test.page = page;
  page.on("pageerror", (error) => {
    // R3F reports its intentionally failed GLTF promise before the outer
    // boundary recovers. Whitelist only this exact injected 503, and only if
    // this scenario has actually returned that failure; every other error fails.
    const injected = error.message === `Could not load ${modelPath}: fetch for "${origin}${modelPath}" responded with 503: Service Unavailable`
      && requests.some((request) => request.name === name && request.failed);
    (injected ? injectedLoadErrors : errors).push(`${name}: ${error.message}`);
  });
  page.on("request", (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) test.documents++; });
  await page.goto(base + "/iniciar-sesion");
  await page.getByRole("button", { name: "Mover el robot de AlgoLab", exact: true }).waitFor({ state: "visible", timeout: 120000 });
  return test;
}

async function ready(test) {
  await test.page.locator(`${stageSelector}.robot-stage-ready`).waitFor({ state: "visible", timeout: 45000 });
  await test.page.waitForFunction(() => {
    const poster = document.querySelector("[data-auth-companion] .robot-stage-ready .robot-poster");
    return poster && Number(getComputedStyle(poster).opacity) === 0;
  });
  check(await test.page.locator(`${stageSelector} canvas`).count() === 1, `${test.name}: exactly one 3D canvas is active`);
  check(await test.page.locator(`${stageSelector} .robot-poster`).evaluate((node) => Number(getComputedStyle(node).opacity) === 0), `${test.name}: the drawing is no longer displayed after recovery`);
}

async function navigateAuth(test, route) {
  await test.page.locator(`a[href="${route}"]`).click();
  await test.page.waitForURL(`**${route}`);
  await test.page.locator("main h1").waitFor();
  await test.page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter((animation) => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime))
      .map((animation) => animation.finished.catch(() => {})));
  });
}

try {
  const transient = await setup("transient-network", { fail: (attempt) => attempt === 1 });
  await transient.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 30000 });
  await transient.page.locator("#correo").fill("recovery-only@example.invalid");
  await transient.page.locator("#contrasena").fill("local-only-not-submitted");
  const before = await transient.page.locator("main section").first().boundingBox();
  await ready(transient);
  check(transient.modelRequests === 2, "A transient model failure fetches a fresh GLB and returns to 3D automatically");
  check(await transient.page.locator("#correo").inputValue() === "recovery-only@example.invalid" && await transient.page.locator("#contrasena").inputValue() === "local-only-not-submitted", "Automatic renderer recovery preserves typed form data");
  assert.deepEqual(await transient.page.locator("main section").first().boundingBox(), before, "Recovery never moves or rebuilds the form card");
  check(transient.documents === 1, "Automatic recovery does not reload the document");
  await transient.page.screenshot({ path: path.join(output, "transient-recovered.png") });
  await transient.page.evaluate(() => {
    window.__healthyRobotCanvas = document.querySelector("[data-auth-companion] canvas");
    window.__healthyRobotStage = document.querySelector("[data-auth-companion] .robot-stage");
  });
  await navigateAuth(transient, "/registrarse");
  await ready(transient);
  check(await transient.page.evaluate(() => window.__healthyRobotCanvas === document.querySelector("[data-auth-companion] canvas") && window.__healthyRobotStage === document.querySelector("[data-auth-companion] .robot-stage")), "Healthy login/register navigation preserves both the 3D canvas and the stage");
  check(transient.modelRequests === 2 && transient.documents === 1, "Healthy auth navigation neither refetches the GLB nor reloads the document");
  await transient.context.close();

  let failPersistent = true;
  const persistent = await setup("bounded-network-failures", { fail: () => failPersistent });
  await persistent.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 30000 });
  await persistent.page.waitForFunction(() => Number(document.querySelector("[data-auth-companion] .robot-stage")?.dataset.rendererAttempt) >= 3, null, { timeout: 45000 });
  await persistent.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 30000 });
  await persistent.page.waitForTimeout(3500);
  check(persistent.modelRequests === 4, "Persistent failure stops after the initial request and three bounded automatic retries");
  const failedAttempts = await persistent.page.locator(stageSelector).getAttribute("data-renderer-attempt");
  check(Number(failedAttempts) === 3, "A failed renderer does not create an unbounded canvas-remount loop");
  check(await persistent.page.locator(`${stageSelector} .robot-poster svg`).isVisible(), "Persistent graphics failure still shows a usable fallback mascot");
  await persistent.page.screenshot({ path: path.join(output, "bounded-fallback.png") });
  failPersistent = false;
  await navigateAuth(persistent, "/registrarse");
  await ready(persistent);
  check(persistent.modelRequests === 5, "Returning to another auth route clears the failed GLB cache and retries after exhausting the old budget");
  check(persistent.documents === 1, "Recovering on route change uses client-side navigation, not a page reload");
  await persistent.context.close();

  const lost = await setup("webgl-context-loss", { reduce: true });
  await ready(lost);
  await lost.page.locator("#correo").fill("context-recovery@example.invalid");
  check(await lost.page.evaluate(() => {
    const canvas = document.querySelector("[data-auth-companion] canvas");
    window.__lostRobotCanvas = canvas;
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    return true;
  }), "The browser can reproduce a real WebGL context loss");
  await lost.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 10000 });
  await ready(lost);
  check(await lost.page.evaluate(() => window.__lostRobotCanvas !== document.querySelector("[data-auth-companion] canvas")), "A lost WebGL context is replaced by a fresh, working 3D canvas");
  check(await lost.page.locator("#correo").inputValue() === "context-recovery@example.invalid" && lost.documents === 1, "Context recovery preserves form data and works with reduced motion without a reload");
  await lost.context.close();

  const hidden = await setup("hidden-tab-recovery", { fail: (attempt) => attempt === 1 });
  await hidden.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 30000 });
  // Only this synthetic browser profile overrides the read-only visibility
  // signal. Real request counts verify that the recovery policy obeys it.
  await hidden.page.evaluate(() => {
    window.__recoveryHidden = true;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__recoveryHidden });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await hidden.page.waitForTimeout(2200);
  check(hidden.modelRequests === 1, "Automatic retries pause while document visibility reports a hidden tab");
  await hidden.page.evaluate(() => {
    window.__recoveryHidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await ready(hidden);
  check(hidden.modelRequests === 2, "Restoring document visibility lets the fallback recover to 3D");
  await hidden.context.close();

  const offline = await setup("offline-recovery", { fail: (attempt) => attempt === 1 });
  await offline.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 30000 });
  await offline.context.setOffline(true);
  await offline.page.waitForTimeout(2200);
  check(offline.modelRequests === 1, "The automatic retry pauses while the browser is offline");
  await offline.page.locator("#correo").fill("offline-only@example.invalid");
  await offline.context.setOffline(false);
  await ready(offline);
  check(offline.modelRequests === 2 && await offline.page.locator("#correo").inputValue() === "offline-only@example.invalid", "Coming back online restores 3D without resetting the form");
  await offline.context.close();

  const saver = await setup("data-saver", { saveData: true });
  await saver.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 30000 });
  await saver.page.waitForTimeout(1800);
  await navigateAuth(saver, "/registrarse");
  await saver.page.locator(`${stageSelector}.robot-stage-fallback`).waitFor({ timeout: 10000 });
  check(saver.modelRequests === 0 && await saver.page.locator(`${stageSelector} canvas`).count() === 0, "Explicit data-saving mode keeps the lightweight fallback without downloading the model or thrashing WebGL");
  check(saver.documents === 1, "Data-saving navigation remains client-side and usable");
  await saver.context.close();

  assert.deepEqual(errors, [], "No unexpected browser errors in renderer recovery flows");
  console.log(JSON.stringify({ ok: true, checks, output, requests, injectedLoadErrors, blockedExternalOrigins: [...blockedExternalOrigins] }, null, 2));
} finally {
  await writeFile(path.join(output, "recovery-evidence.json"), JSON.stringify({ checks, errors, requests, injectedLoadErrors, blockedExternalOrigins: [...blockedExternalOrigins] }, null, 2));
  if (errors.length) console.log(JSON.stringify({ errors }, null, 2));
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
