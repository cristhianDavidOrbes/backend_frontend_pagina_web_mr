import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const output = await mkdtemp(path.join(tmpdir(), "algolab-toy-browser-"));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
const checks = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); console.log(`PASS ${message}`); };

async function setup(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 940 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  await context.addInitScript(() => sessionStorage.setItem("algolab.auth-robot.easter-egg.session.v1", "drawn"));
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) await route.abort();
    else if (url.pathname.startsWith("/api/")) await route.fulfill({ status: 401, json: { exitoso: false } });
    else await route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/iniciar-sesion");
  await page.locator("[data-auth-companion] .robot-stage-ready").waitFor({ timeout: 120000 });
  const toy = page.locator("[data-toy-id='0']");
  await toy.waitFor({ state: "visible", timeout: 50000 });
  await page.waitForFunction(() => document.querySelector("[data-auth-companion] [data-scene]")?.getAttribute("data-pose") === "sit", null, { timeout: 30000 });
  return { context, page, toy };
}

async function held(page) {
  await page.waitForFunction(() => document.querySelector("[data-toy-id='0']")?.getAttribute("data-toy-state") === "held");
  check(await page.locator("[data-toy-id='0']").getAttribute("aria-pressed") === "true", "Toy remains grabbed after becoming a physics object");
}

async function restored(page) {
  await page.waitForFunction(() => document.querySelector("[data-toy-id='0']")?.getAttribute("data-toy-state") === "deposited" && document.querySelector("[data-auth-companion] [data-scene]")?.getAttribute("data-pose") === "sit", null, { timeout: 40000 });
  check(await page.locator("[data-toy-id='0']").count() === 1, "Robot restores exactly one object and returns to its seat");
}

try {
  const desktop = await setup();
  const { page, toy } = desktop;
  await page.locator("#correo").fill("local-toy-only@example.invalid");
  await page.locator("#contrasena").fill("local-only-not-submitted");
  const card = await page.locator("main section").first().boundingBox();
  await page.evaluate(() => { window.__toyButton = document.querySelector("[data-toy-id='0']"); window.__toyCanvas = document.querySelector("[data-auth-companion] canvas"); });
  const box = await toy.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.65);
  await page.mouse.down();
  await held(page);
  await page.mouse.move(320, 570, { steps: 6 });
  await page.waitForTimeout(120);
  check(await page.evaluate(() => window.__toyButton === document.querySelector("[data-toy-id='0']")), "The same button survives pick-up so pointer capture is retained");
  await page.mouse.up();
  await page.waitForFunction(() => ["flying", "carried"].includes(document.querySelector("[data-toy-id='0']")?.getAttribute("data-toy-state")));
  await restored(page);
  assert.deepEqual(await page.locator("main section").first().boundingBox(), card);
  check(await page.locator("#correo").inputValue() === "local-toy-only@example.invalid" && await page.locator("#contrasena").inputValue() === "local-only-not-submitted", "Toy play preserves card layout and typed credentials");
  await toy.focus(); await page.keyboard.press("Enter"); await restored(page);
  check(await page.evaluate(() => window.__toyCanvas === document.querySelector("[data-auth-companion] canvas")), "Toy reactions keep the original 3D canvas");
  await page.screenshot({ path: path.join(output, "desktop-toys.png") });
  await desktop.context.close();

  const mobile = await setup(true);
  const mobileBox = await mobile.toy.boundingBox();
  const client = await mobile.context.newCDPSession(mobile.page);
  const x = mobileBox.x + mobileBox.width / 2, y = mobileBox.y + mobileBox.height * 0.65;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await held(mobile.page);
  for (let index = 1; index <= 5; index++) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + index * 10, y: y - index * 24, id: 1 }] });
    await mobile.page.waitForTimeout(20);
  }
  check(await mobile.page.evaluate(() => scrollY === 0), "Touch dragging the toy does not scroll the page");
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await restored(mobile.page);
  await mobile.page.screenshot({ path: path.join(output, "mobile-toys.png") });
  await mobile.page.locator('a[href="/registrarse"]').click();
  await mobile.page.waitForURL("**/registrarse");
  await mobile.page.locator("main h1").waitFor();
  await mobile.page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter((animation) => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime)).map((animation) => animation.finished.catch(() => {})));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await mobile.page.waitForFunction(() => document.querySelector("[data-auth-companion] [data-scene]")?.getAttribute("data-pose") === "sit");
  const robot = mobile.page.getByRole("button", { name: "Mover el robot de AlgoLab" });
  const robotBox = await robot.boundingBox();
  const rx = robotBox.x + robotBox.width / 2, ry = robotBox.y + robotBox.height / 2;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: rx, y: ry, id: 2 }] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: rx - 70, y: ry + 120, id: 2 }] });
  await mobile.page.waitForTimeout(40);
  check(await robot.getAttribute("aria-pressed") === "true", "Registration still supports real touch dragging of the robot");
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  check(await robot.getAttribute("aria-pressed") === "false", "Lifting a finger releases the robot");
  await mobile.context.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, checks, output }, null, 2));
} finally { await browser.close(); }
