import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const output = await mkdtemp(path.join(tmpdir(), "algolab-auth-throw-"));
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; console.log(`PASS ${label}`); }
try {
  for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: name === "mobile" });
    await context.addInitScript(() => sessionStorage.setItem("algolab.auth-robot.easter-egg.session.v1", "drawn"));
    await context.route("**/api/**", route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/iniciar-sesion");
    const actor = page.locator("[data-auth-companion] [data-pose]").first();
    const robot = page.getByRole("button", { name: "Mover el robot de AlgoLab" });
    await robot.waitFor({ state: "visible" });
    await page.locator("[data-auth-companion] .robot-stage-ready").waitFor({ timeout: 30000 });
    await page.getByLabel("Correo electrónico", { exact: true }).fill("prueba@example.invalid");
    const card = await page.locator("main section").first().boundingBox();
    check(await actor.evaluate(node => getComputedStyle(node).transformOrigin === "110px 95px"), `${name}: pivot is the body centre, not the legs`);
    check(await actor.evaluate(node => {
      const original = node.style.transform, a = node.getBoundingClientRect();
      node.style.transform = original.replace(/rotate\([^)]*\)/, "rotate(90deg)");
      const b = node.getBoundingClientRect(); node.style.transform = original;
      return Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < .1 && Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < .1;
    }), `${name}: spinning does not orbit around the feet`);
    await page.evaluate(() => {
      window.__authThrowCanvas = document.querySelector("[data-auth-companion] canvas");
      window.__throwTrace = [];
      window.__throwTimer = setInterval(() => {
        const actor = document.querySelector("[data-auth-companion] [data-pose]");
        const m = new DOMMatrix(getComputedStyle(actor).transform);
        window.__throwTrace.push({ scene: actor.dataset.scene, pose: actor.dataset.pose, x: m.e + 110, y: m.f + 170,
          effect: actor.querySelector("[data-robot-effect]")?.dataset.robotEffect });
      }, 16);
    });
    const box = await robot.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(width * .28, height * .48);
    // Replay a measured 80ms flick in one browser task: software WebGL on CI
    // must not stretch five automation round-trips into a slow deliberate drag.
    await robot.evaluate((node, { width, height }) => {
      const now = performance.now();
      for (let i = 0; i <= 5; i++) {
        const event = new PointerEvent("pointermove", { bubbles: true, pointerId: 1, isPrimary: true, pointerType: "mouse", buttons: 1,
          clientX: width * .28 + i * 20, clientY: height * .48 - i * 10 });
        Object.defineProperty(event, "timeStamp", { value: now - 80 + i * 16 });
        node.dispatchEvent(event);
      }
      const event = new PointerEvent("pointerup", { bubbles: true, pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0,
        clientX: width * .28 + 100, clientY: height * .48 - 50 });
      Object.defineProperty(event, "timeStamp", { value: now });
      node.dispatchEvent(event);
    }, { width, height });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("[data-auth-companion] [data-pose]")?.dataset.scene === "lanzamiento");
    await page.screenshot({ path: path.join(output, `${name}-flight.png`) });
    await page.waitForFunction(() => document.querySelector("[data-auth-companion] [data-pose]")?.dataset.pose === "dizzy", null, { timeout: 30000 });
    await page.screenshot({ path: path.join(output, `${name}-landed.png`) });
    const trace = await page.evaluate(() => { clearInterval(window.__throwTimer); return window.__throwTrace; });
    const impacts = trace.filter((f, i) => f.scene === "lanzamiento" && f.y > height - 100 && f.effect === "impact" && trace[i - 1]?.effect !== "impact");
    check(impacts.length >= 2, `${name}: multiple progressively damped floor bounces`);
    await page.waitForFunction(() => document.querySelector("[data-auth-companion] [data-pose]")?.dataset.pose === "sit", null, { timeout: 30000 });
    check(await page.evaluate(() => window.__authThrowCanvas === document.querySelector("[data-auth-companion] canvas")), `${name}: the same 3D robot survives flight and recovery`);
    check(JSON.stringify(await page.locator("main section").first().boundingBox()) === JSON.stringify(card), `${name}: the form stays in place`);
    check(await page.getByLabel("Correo electrónico", { exact: true }).inputValue() === "prueba@example.invalid", `${name}: form entries are preserved`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await robot.focus(); await page.keyboard.press("Space"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Space");
    check(await actor.getAttribute("data-pose") === "sit", `${name}: reduced motion keeps keyboard handling without flight`);
    check(errors.length === 0, `${name}: no runtime errors: ${errors.join("; ")}`);
    await context.close();
  }
  console.log(JSON.stringify({ checks, output }));
} finally { await browser.close(); }
