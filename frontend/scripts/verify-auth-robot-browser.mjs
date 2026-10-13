import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Only test a local frontend; no real accounts are submitted.");
const output = await mkdtemp(path.join(tmpdir(), "algolab-auth-robot-"));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
let documents = 0;
const settle = (page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations().filter((animation) => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime))
    .map((animation) => animation.finished.catch(() => {})));
});
const waitHome = (page) => page.waitForFunction(() => document.querySelector("[data-auth-companion] [data-pose]")?.dataset.pose === "sit", null, { timeout: 30000 });
const traceStart = (page) => page.evaluate(() => {
  window.__robotTrace = [];
  window.__robotTraceTimer = setInterval(() => {
    const layer = document.querySelector("[data-auth-companion]");
    const actor = layer?.querySelector("[data-pose]");
    if (!actor) return;
    const transform = new DOMMatrix(getComputedStyle(actor).transform);
    window.__robotTrace.push({ pose: actor.dataset.pose, scene: actor.dataset.scene, depth: actor.dataset.depth,
      x: transform.e + 110, y: transform.f + 170, clip: layer.style.clipPath,
      vehicle: Boolean(actor.querySelector("[data-robot-vehicle]")), effect: actor.querySelector("[data-robot-effect]")?.dataset.robotEffect });
  }, 30);
});
const traceStop = (page) => page.evaluate(() => { clearInterval(window.__robotTraceTimer); return window.__robotTrace; });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => sessionStorage.setItem("algolab.auth-robot.easter-egg.session.v1", "drawn"));
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.goto(base + "/iniciar-sesion");
  const robot = page.getByRole("button", { name: "Mover el robot de AlgoLab" });
  const actor = page.locator("[data-auth-companion] [data-pose]").first();
  await robot.waitFor({ state: "visible", timeout: 120000 });
  await page.locator("[data-auth-companion] .robot-stage-ready, [data-auth-companion] .robot-stage-fallback").waitFor({ state: "visible", timeout: 30000 });
  await settle(page);
  await page.screenshot({ path: path.join(output, "login-desktop.png"), fullPage: true });
  await page.evaluate(() => { window.__robotNode = document.querySelector("[data-auth-companion]"); window.__robotCanvas = document.querySelector("[data-auth-companion] canvas"); });
  const initialCard = await page.locator("main section").first().boundingBox();
  const home = await robot.boundingBox();
  assert.ok(initialCard && home);
  const centre = { x: home.x + home.width / 2, y: home.y + home.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(260, 520, { steps: 10 });
  assert.equal(await robot.getAttribute("aria-pressed"), "true");
  await page.screenshot({ path: path.join(output, "robot-dragged.png") });
  await traceStart(page);
  await page.mouse.up();
  await page.locator('[data-robot-effect="impact"]').waitFor();
  await page.screenshot({ path: path.join(output, "comic-impact.png") });
  await waitHome(page);
  const fallTrace = await traceStop(page);
  const fallPoses = new Set(fallTrace.map((frame) => frame.pose));
  for (const pose of ["bonk", "tumble", "dizzy", "getup", "run", "wave", "climb"]) assert.ok(fallPoses.has(pose), `Drop includes ${pose} before sitting`);
  const ascent = fallTrace.filter((frame) => frame.pose === "climb");
  assert.ok(ascent.length && ascent.every((frame) => frame.depth === "behind" && frame.clip !== "none" && Math.abs(frame.x - 720) < 2), "Return climbs behind the exact card centre");
  const after = await robot.boundingBox();
  assert.ok(Math.abs(after.x - home.x) < 2 && Math.abs(after.y - home.y) < 2, "Returns to original seat");
  assert.deepEqual(await page.locator("main section").first().boundingBox(), initialCard, "Dragging does not move the form");

  await page.locator("main h1").click();
  await traceStart(page);
  await page.waitForFunction(() => document.querySelectorAll("[data-scenery-kind]").length > 0, null, { timeout: 35000 });
  await waitHome(page);
  const excursionTrace = await traceStop(page);
  assert.ok(excursionTrace.some((frame) => frame.x < 0), "First outing explores the left side");
  assert.ok(excursionTrace.some((frame) => frame.pose === "carry"), "Fetches an object before returning");
  assert.ok(await page.locator("[data-auth-scenery]").evaluate((node) => getComputedStyle(node).pointerEvents === "none" && node.style.clipPath.includes("path(")), "Decorations cannot block form or navigation");
  const firstScenery = await page.locator("[data-scenery-kind]").first().getAttribute("data-scenery-kind");
  await page.screenshot({ path: path.join(output, "background-decorated.png") });

  await page.locator('a[href="/registrarse"]').click();
  await page.waitForURL("**/registrarse");
  assert.ok(await page.evaluate(() => window.__robotNode === document.querySelector("[data-auth-companion]")), "Persistent companion across navigation");
  assert.ok(await page.evaluate(() => !window.__robotCanvas || window.__robotCanvas === document.querySelector("[data-auth-companion] canvas")), "Canvas preserved across navigation");
  assert.equal(documents, 1, "Login/register transition does not reload document");
  assert.equal(await page.locator("[data-scenery-kind]").first().getAttribute("data-scenery-kind"), firstScenery, "Decorations persist across auth routes");
  await page.locator("#nombre").fill("Prueba visual local");
  await settle(page);
  await page.screenshot({ path: path.join(output, "register-desktop.png"), fullPage: true });
  await robot.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  assert.equal(await robot.getAttribute("aria-pressed"), "true");
  await page.keyboard.press("Escape");
  assert.equal(await actor.getAttribute("data-pose"), "sit");
  assert.equal(await page.locator("#nombre").inputValue(), "Prueba visual local", "Robot does not reset entered form data");

  await robot.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Tab");
  assert.equal(await actor.getAttribute("data-pose"), "sit", "Blur cannot leave keyboard drag stuck");
  for (const [edge, x] of [["left", -20], ["right", 1460]]) {
    const bounds = await robot.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, 420, { steps: 5 });
    await traceStart(page);
    await page.mouse.up();
    await page.locator('[data-robot-vehicle="car"]').waitFor();
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-robot-vehicle="car"]');
      if (!node) return false;
      const box = node.getBoundingClientRect();
      return box.left > 20 && box.right < innerWidth - 20;
    });
    await page.screenshot({ path: path.join(output, `car-return-${edge}.png`) });
    await waitHome(page);
    const carTrace = await traceStop(page);
    assert.ok(carTrace.some((frame) => frame.scene === `rescate-${edge}` && frame.vehicle), `Rescue drives from ${edge}`);
    assert.ok(carTrace.some((frame) => edge === "left" ? frame.x < 0 : frame.x > 1440), "Starts beyond the same screen edge");
    assert.ok(carTrace.some((frame) => ["juggle", "peek", "dance", "bow"].includes(frame.pose)), "Does another activity after parking");
  }

  await robot.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Space");
  await robot.evaluate((node) => node.blur());
  await robot.focus();
  assert.equal(await actor.getAttribute("data-pose"), "sit", "Keyboard focus restores a visible robot during a behind-card scene");
  assert.equal(await page.locator("[data-auth-companion]").evaluate((node) => node.style.clipPath), "none");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('a[href="/iniciar-sesion"]').click();
  await page.waitForURL("**/iniciar-sesion");
  await robot.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  assert.equal(await actor.getAttribute("data-pose"), "sit", "Reduced motion returns immediately");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No mobile horizontal overflow");
  assert.ok(await page.locator("[data-scenery-kind]").count() <= 4, "Mobile decorations remain bounded");
  await page.locator("#correo").fill("prueba@example.invalid");
  await settle(page);
  await page.screenshot({ path: path.join(output, "login-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator("#contrasena").fill("local-only-not-submitted");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No landscape overflow");
  await page.goto(base + "/");
  assert.equal(await page.locator("[data-auth-companion]").count(), 0, "Companion only appears on login/register");
  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", hasTouch: true, isMobile: true });
  await fallbackContext.addInitScript(() => sessionStorage.setItem("algolab.auth-robot.easter-egg.session.v1", "drawn"));
  await fallbackContext.route("**/models/algolab-robot.glb", (route) => route.abort());
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.goto(base + "/iniciar-sesion");
  const fallbackRobot = fallbackPage.getByRole("button", { name: "Mover el robot de AlgoLab" });
  await fallbackPage.locator("[data-auth-companion] .robot-stage-fallback").waitFor({ timeout: 30000 });
  const posterBox = await fallbackPage.locator("[data-auth-companion] .robot-poster svg").boundingBox();
  assert.ok(posterBox.height <= 170, "Fallback stays at the same small scale");
  await fallbackRobot.tap();
  const touchBox = await fallbackRobot.boundingBox();
  await fallbackPage.mouse.move(touchBox.x + touchBox.width / 2, touchBox.y + touchBox.height / 2);
  await fallbackPage.mouse.down();
  await fallbackRobot.dispatchEvent("pointercancel", { pointerId: 1, isPrimary: true, pointerType: "mouse" });
  await fallbackPage.mouse.up();
  assert.equal(await fallbackRobot.getAttribute("aria-pressed"), "false", "Touch cancellation releases fallback mascot");
  await fallbackPage.screenshot({ path: path.join(output, "fallback-mobile.png") });
  await fallbackContext.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(JSON.stringify({ ok: true, documents, output, checks: ["comic-drop", "detour-before-sitting", "central-behind-card-return", "left-excursion", "persistent-decorations", "same-edge-car-left-right", "form-layout-unchanged", "persistent-canvas", "client-navigation", "keyboard", "escape", "blur", "resize", "reduced-motion", "mobile", "landscape", "route-cleanup", "no-runtime-errors"] }, null, 2));
} finally { await browser.close(); }
