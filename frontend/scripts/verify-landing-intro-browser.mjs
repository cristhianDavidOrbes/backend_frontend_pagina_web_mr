import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Run only against an isolated local preview");
const output = await mkdtemp(path.join(tmpdir(), "algolab-intro-"));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
let checks = 0;
function check(condition, label) { assert.ok(condition, label); checks++; console.log(`PASS ${label}`); }
async function setup(width, height, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, hasTouch: width < 500 });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return ["http:", "https:"].includes(url.protocol) && url.origin !== new URL(base).origin ? route.abort() : route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  return { context, page };
}
async function movieReady(page) {
  await page.getByRole("dialog", { name: "Bienvenida a AlgoLab" }).waitFor({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector("video")?.currentTime > .05, { timeout: 20000 });
}
async function noIntro(page, label) {
  await page.getByRole("heading", { name: /Aprende POO/ }).waitFor();
  await page.waitForTimeout(450);
  check(await page.locator("video").count() === 0, label);
}
async function robotAnchored(page, label) {
  await page.waitForFunction(() => {
    const iframe = document.querySelector('iframe[src*="intro-scene"]');
    const stage = document.querySelector(".hero-stage");
    const d = iframe?.contentWindow.__continuityDiagnostics?.();
    if (!d?.landed || !stage) return false;
    const box = iframe.getBoundingClientRect(), anchor = stage.getBoundingClientRect();
    const x = box.left + d.landing.feet[0] * box.width;
    const y = box.top + d.landing.feet[1] * box.height;
    const expectedY = anchor.bottom - anchor.height * .1 - d.behavior.lift * anchor.height * .78 / 2.5;
    return Math.abs(x - anchor.left - anchor.width / 2) < 2 && Math.abs(y - expectedY) < 3;
  }, { timeout: 10000 });
  check(true, label);
}
async function loginDemo(page, email, destination) {
  // Only the isolated in-memory demo server's public test accounts are used.
  await page.goto(`${base}/iniciar-sesion`);
  await page.getByLabel("Correo electrónico", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Demo1234");
  await page.getByRole("button", { name: /^Entrar/ }).click();
  await page.waitForURL(new RegExp(`/${destination}(?:/|$)`), { timeout: 60000 });
  await page.goto(`${base}/${destination}/configuracion`);
  await page.getByRole("heading", { name: "Configuración", exact: true }).waitFor();
}
try {
  const mobile = await setup(390, 844);
  const requests = [];
  mobile.page.on("request", request => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
  await mobile.page.goto(base);
  await movieReady(mobile.page);
  const mobileFrame = mobile.page.frames().find(frame => frame.url().includes("/intro-scene/index.html"));
  assert.ok(mobileFrame);
  const mobileIdentity = await mobileFrame.evaluate(() => window.__continuityDiagnostics());
  check(await mobileFrame.evaluate(() => { const c = document.querySelector("#filmCanvas"); return c.height > c.width; }) && await mobile.page.locator("video").evaluate(v => !v.muted && !v.paused && v.playsInline && v.volume === .65), "mobile: native portrait 3D scene starts with audible inline soundtrack");
  await mobile.page.getByRole("button", { name: "Silenciar sonido" }).tap();
  check(await mobile.page.locator("video").evaluate(v => v.muted && !v.paused), "user can mute without pausing the animation");
  check(requests.length === 0, "3D introduction downloads no replacement robot movie");
  check(await mobile.page.evaluate(() => localStorage.getItem("algolab:intro:seen") === "1"), "first playback marks only this browser as seen");
  check(await mobile.page.locator(".landing").evaluate(element => Boolean(element.closest("[inert]"))), "landing cannot receive accidental clicks behind intro");
  await mobile.page.getByRole("button", { name: "Pausar animación" }).tap();
  const before = await mobile.page.locator("video").evaluate(v => v.currentTime);
  await mobile.page.waitForTimeout(300);
  check(Math.abs(await mobile.page.locator("video").evaluate(v => v.currentTime) - before) < .06, "pause stops the movie");
  await mobile.page.getByRole("button", { name: "Activar sonido" }).tap();
  check(await mobile.page.locator("video").evaluate(v => !v.muted && v.paused), "user can restore sound while keeping the animation paused");
  await mobile.page.locator("video").evaluate(v => new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = 7; }));
  await mobile.page.waitForFunction(() => Math.abs(document.querySelector("video").currentTime - 7) < .1);
  await mobile.page.screenshot({ path: path.join(output, "mobile-portrait.png") });
  check(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "portrait: no horizontal overflow");
  for (const button of await mobile.page.getByRole("dialog").getByRole("button").all()) {
    const rect = await button.boundingBox(); check(rect.width >= 44 && rect.height >= 44, "touch controls meet 44px targets");
  }
  await mobile.page.setViewportSize({ width: 844, height: 390 });
  await mobileFrame.waitForFunction(() => { const c = document.querySelector("#filmCanvas"); return c.width > c.height; });
  check((await mobileFrame.evaluate(() => window.__continuityDiagnostics())).instanceId === mobileIdentity.instanceId, "rotation keeps the exact same 3D protagonist");
  check(await mobile.page.locator("video").evaluate(v => v.paused && !v.muted), "rotation preserves time, pause and audio preference");
  await mobile.page.screenshot({ path: path.join(output, "mobile-landscape.png") });
  await mobile.page.setViewportSize({ width: 390, height: 844 });
  await mobileFrame.waitForFunction(() => { const c = document.querySelector("#filmCanvas"); return c.height > c.width; });
  await mobile.page.locator("video").evaluate(v => new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = 19.95; }));
  await mobileFrame.waitForFunction(() => Math.abs(window.__continuityDiagnostics().time - 19.95) < .02);
  const mobileEnd = await mobileFrame.evaluate(() => window.__continuityDiagnostics().landing);
  check(await mobileFrame.evaluate(() => {
    const canvas = document.querySelector("#filmCanvas"), pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let min = canvas.width, max = 0;
    for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (pixels[(y * canvas.width + x) * 4 + 3] > 128) { min = Math.min(min, x); max = Math.max(max, x); }
    return max > min && min > 0 && max < canvas.width - 1 && Math.abs((min + max) / 2 / canvas.width - window.__continuityDiagnostics().landing.feet[0]) < .08;
  }), "mobile: actual rendered pixels stay fully inside the screen, aligned with the landing target");
  await mobileFrame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await mobile.page.screenshot({ path: path.join(output, "mobile-ending.png") });
  await mobile.page.getByRole("button", { name: "Omitir", exact: true }).tap();
  await noIntro(mobile.page, "skip reveals the actual landing");
  await mobileFrame.waitForFunction(() => window.__continuityDiagnostics().landed);
  const mobileLanded = await mobileFrame.evaluate(() => window.__continuityDiagnostics().landing);
  const idleLift = await mobileFrame.evaluate(() => window.__continuityDiagnostics().behavior.lift);
  check(Math.abs(mobileEnd.feet[0] - mobileLanded.feet[0]) < .001 && Math.abs(mobileEnd.feet[1] - (mobileLanded.feet[1] + idleLift * mobileLanded.height / 2.5)) < .001 && Math.abs(mobileEnd.height - mobileLanded.height) < .001, "mobile: position and scale remain continuous across the final frame, including restored idle breathing");
  await mobile.page.screenshot({ path: path.join(output, "mobile-landing.png") });
  await mobile.page.locator(".hero-speech").tap();
  await mobileFrame.waitForFunction(() => window.__continuityDiagnostics().reactionKind === "wave");
  const actor = mobile.page.getByRole("img", { name: /^Robot de AlgoLab/ });
  await actor.focus(); await actor.press("ArrowRight");
  await mobileFrame.waitForFunction(() => window.__continuityDiagnostics().yaw > .1);
  check((await mobileFrame.evaluate(() => window.__continuityDiagnostics())).instanceId === mobileIdentity.instanceId, "the same landing character still waves and rotates interactively");
  const mobileBox = await actor.boundingBox(), touch = await mobile.context.newCDPSession(mobile.page);
  const touchX = mobileBox.x + mobileBox.width / 2, touchY = mobileBox.y + mobileBox.height / 2;
  const yawBeforeTouch = await mobileFrame.evaluate(() => window.__continuityDiagnostics().yaw);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchX, y: touchY }] });
  for (let step = 1; step <= 8; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchX + step * 8, y: touchY + step * .3 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobileFrame.waitForFunction(yaw => window.__continuityDiagnostics().yaw > yaw + .15, yawBeforeTouch);
  check(true, 'mobile: real touch dragging rotates the same robot');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchX, y: touchY }] });
  for (let step = 1; step <= 8; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchX, y: touchY - step * 12 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.page.waitForFunction(() => scrollY > 20);
  check(true, 'mobile: vertical swiping over the robot still scrolls the page');
  await robotAnchored(mobile.page, "mobile: touch scrolling keeps the same robot anchored to its document space");
  await mobile.page.evaluate(() => scrollTo(0, 0));
  await touch.detach();
  check((await mobileFrame.evaluate(() => window.__continuityDiagnostics())).instanceId === mobileIdentity.instanceId, "skipping keeps the same robot alive in the landing");
  check(await mobile.page.locator("[inert]").count() === 0 && await mobile.page.evaluate(() => document.body.style.overflow !== "hidden"), "skip restores interaction and scrolling");
  requests.length = 0;
  await mobile.page.reload();
  await noIntro(mobile.page, "a return visit does not repeat the intro");
  check(requests.length === 0, "return visit downloads no intro video");
  await mobile.page.getByRole("link", { name: "Crear cuenta gratis", exact: true }).first().click();
  await mobile.page.waitForURL(/\/registrarse/);
  check(true, "landing links still navigate to registration");
  await mobile.context.close();

  const desktop = await setup(1440, 900);
  await desktop.page.goto(base);
  await movieReady(desktop.page);
  const desktopFrame = desktop.page.frames().find(frame => frame.url().includes("/intro-scene/index.html"));
  assert.ok(desktopFrame);
  const desktopIdentity = await desktopFrame.evaluate(() => window.__continuityDiagnostics());
  check(await desktopFrame.evaluate(() => { const c = document.querySelector("#filmCanvas"); return c.width > c.height; }) && await desktop.page.locator("video").evaluate(v => Math.abs(v.duration - 20) < .1), "desktop: horizontal 3D sequence lasts twenty seconds");
  await desktop.page.screenshot({ path: path.join(output, "desktop-intro.png") });
  await desktop.page.getByRole("button", { name: "Pausar animación" }).click();
  await desktop.page.locator("video").evaluate(v => new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = 18.7; }));
  await desktop.page.waitForTimeout(120);
  await desktopFrame.waitForFunction(() => Math.abs(window.__continuityDiagnostics().time - 18.7) < .1);
  check(await desktop.page.locator(".hero-stage canvas").count() === 0, "no second robot renderer is mounted behind the transition");
  await desktop.page.screenshot({ path: path.join(output, "desktop-handoff.png") });
  await desktop.page.getByRole("button", { name: "Reproducir animación" }).click();
  await desktop.page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="Bienvenida a AlgoLab"]'), { timeout: 10000 });
  await desktopFrame.waitForFunction(() => window.__continuityDiagnostics().landed);
  const finalIdentity = await desktopFrame.evaluate(() => window.__continuityDiagnostics());
  check(await desktopFrame.evaluate(() => getComputedStyle(document.documentElement).colorScheme === "dark" && document.querySelector("canvas").getContext("2d").getImageData(0, 0, 1, 1).data[3] === 0), "landing renderer is transparent, without a white or black replacement screen");
  check(finalIdentity.instanceId === desktopIdentity.instanceId && finalIdentity.rendererId === desktopIdentity.rendererId, "full ending preserves the same model instance and renderer, without replacement");
  check(await desktop.page.locator(".landing h1").count() === 1 && await desktop.page.locator("video").count() === 0, "movie ends on the real responsive page, not a screenshot");
  await desktop.page.mouse.wheel(0, 220);
  await desktop.page.waitForFunction(() => scrollY > 150);
  await robotAnchored(desktop.page, "desktop: wheel scrolling does not leave the robot fixed on screen");
  await desktop.page.evaluate(() => scrollTo({ top: 1600, behavior: "instant" }));
  await desktop.page.waitForFunction(() => document.querySelector('iframe[src*="intro-scene"]').getBoundingClientRect().bottom < 0);
  check(true, "desktop: the entire robot layer scrolls offscreen instead of floating over other sections");
  await desktop.page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await robotAnchored(desktop.page, "desktop: returning to the hero restores its exact anchor");
  await desktop.page.screenshot({ path: path.join(output, "desktop-landing.png") });
  const desktopActor = desktop.page.getByRole('img', { name: /^Robot de AlgoLab/ });
  const actorBox = await desktopActor.boundingBox();
  await desktop.page.mouse.move(actorBox.x + actorBox.width * .15, actorBox.y + actorBox.height * .2);
  await desktopFrame.waitForFunction(() => { const b = window.__continuityDiagnostics().behavior; return b.lookX < -.2 && b.bodyYaw < -.05 && b.headPitch < -.03; });
  check(true, 'same 3D actor follows the pointer with head and torso, without clicking');
  await desktop.page.mouse.move(actorBox.x + actorBox.width * .85, actorBox.y + actorBox.height * .8);
  await desktopFrame.waitForFunction(() => { const b = window.__continuityDiagnostics().behavior; return b.lookX > .2 && b.headPitch > .03; });
  await desktop.page.mouse.move(5, 5);
  await desktopFrame.waitForFunction(() => { const b = window.__continuityDiagnostics().behavior; return Math.abs(b.lookX) < .01 && Math.abs(b.bodyYaw) < .01; });
  check(true, 'pointer tracking works in both directions and eases back to idle on leave');
  await desktop.page.mouse.move(actorBox.x + actorBox.width / 2, actorBox.y + actorBox.height / 2);
  await desktop.page.mouse.down();
  await desktop.page.mouse.move(actorBox.x + actorBox.width / 2 + 60, actorBox.y + actorBox.height / 2 + 20, { steps: 8 });
  await desktop.page.mouse.up();
  await desktopFrame.waitForFunction(() => { const d = window.__continuityDiagnostics(); return d.yaw > .1 && d.pitch > .02; });
  check(true, 'desktop dragging restores bounded horizontal and vertical rotation');
  for (const kind of ['charge', 'cool', 'celebrate', 'shutdown']) {
    await desktop.page.evaluate(kind => document.querySelector('iframe[src*="intro-scene"]').contentWindow.postMessage({ type: 'algolab:signal', kind }, location.origin), kind);
    await desktopFrame.waitForFunction(kind => { const b = window.__continuityDiagnostics().behavior; return b.kind === kind && (kind === 'shutdown' ? b.shutdown && b.headPitch > .2 : kind === 'celebrate' ? b.armL > 1 : b.glow > .08); }, kind);
  }
  await desktop.page.locator('.hero-speech').click();
  await desktopFrame.waitForFunction(() => { const b = window.__continuityDiagnostics().behavior; return b.kind === 'wave' && !b.shutdown && b.armL > 1; });
  check((await desktopFrame.evaluate(() => window.__continuityDiagnostics())).instanceId === desktopIdentity.instanceId, 'charge, cooling, celebration, shutdown and greeting keep the very same model');
  await loginDemo(desktop.page, "estudiante.demo@campusucc.edu.co", "estudiante");
  const select = desktop.page.getByLabel("Cuándo mostrarla", { exact: true });
  await select.selectOption("always");
  check(await desktop.page.evaluate(() => localStorage.getItem("algolab:intro:preference") === "always"), "authenticated setting persists locally");
  await desktop.page.screenshot({ path: path.join(output, "settings.png"), fullPage: true });
  await desktop.page.goto(base); await movieReady(desktop.page);
  await desktop.page.keyboard.press("Escape");
  await noIntro(desktop.page, "Escape skips and restores the page");
  await desktop.page.reload(); await movieReady(desktop.page);
  check(true, "always setting repeats the intro on the next visit");
  await desktop.page.getByRole("button", { name: "Omitir", exact: true }).click();
  await desktop.page.goto(`${base}/estudiante/configuracion`);
  await select.selectOption("once");
  await desktop.page.goto(base); await noIntro(desktop.page, "turning always off preserves the already-seen status");
  await desktop.page.goto(`${base}/estudiante/configuracion`);
  await select.selectOption("never");
  await desktop.page.getByRole("link", { name: "Ver de nuevo", exact: true }).click(); await movieReady(desktop.page);
  check(await desktop.page.evaluate(() => localStorage.getItem("algolab:intro:preference") === "never"), "explicit preview does not change the stored preference");
  await desktop.page.getByRole("button", { name: "Omitir", exact: true }).click();
  await desktop.page.goto(base); await noIntro(desktop.page, "never setting suppresses automatic playback after a preview");
  await desktop.context.close();

  for (const [email, role] of [["docente.demo@campusucc.edu.co", "docente"], ["admin.demo@campusucc.edu.co", "administrador"]]) {
    const item = await setup(390, 844, "reduce");
    await loginDemo(item.page, email, role);
    check(await item.page.getByRole("combobox", { name: "Cuándo mostrarla" }).count() === 1, `${role}: configuration is available after authentication`);
    await item.context.close();
  }
  const reduced = await setup(390, 844, "reduce");
  await reduced.page.goto(base); await noIntro(reduced.page, "reduced motion bypasses the intro even on a new device");
  await reduced.context.close();
  const failed = await setup(390, 844);
  await failed.context.route("**/media/intro/*.mp3", route => route.abort());
  await failed.page.goto(base); await noIntro(failed.page, "media failure falls back to the real landing");
  await failed.context.close();
  for (const [asset, label] of [["**/intro-scene/assets/algolab-robot-demo.glb", "room"], ["**/media/intro/algolab-soundtrack.mp3", "soundtrack"]]) {
    const slow = await setup(390, 844);
    let release;
    let requested;
    const requestArrived = new Promise(resolve => { requested = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    await slow.context.route(asset, async route => { requested(); await gate; await route.continue(); });
    await slow.page.goto(base, { waitUntil: "domcontentloaded" });
    await requestArrived;
    await slow.page.waitForTimeout(500);
    check(await slow.page.locator("video").evaluate(v => v.paused && v.currentTime === 0), `delayed ${label}: soundtrack waits at zero until all assets are ready`);
    const slowFrame = slow.page.frames().find(frame => frame.url().includes("/intro-scene/index.html"));
    if (slowFrame) check(await slowFrame.evaluate(() => !window.__continuityDiagnostics || window.__continuityDiagnostics().time === 0), `delayed ${label}: visual clock also waits at zero`);
    release();
    await movieReady(slow.page);
    check(await slow.page.locator("video").evaluate(v => !v.muted && !v.paused), `delayed ${label}: animation and audible soundtrack start together after loading`);
    await slow.page.getByRole("button", { name: "Omitir", exact: true }).tap();
    await slow.context.close();
  }
  const denied = await setup(390, 844);
  await denied.context.addInitScript(() => {
    // Deterministic browser-policy denial, lifted only by an actual user gesture.
    const nativePlay = HTMLMediaElement.prototype.play;
    let allowed = false;
    for (const name of ["pointerdown", "keydown"]) document.addEventListener(name, event => { if (event.isTrusted) allowed = true; }, true);
    HTMLMediaElement.prototype.play = function () {
      if (!this.muted && !allowed) return Promise.reject(new DOMException("User gesture required", "NotAllowedError"));
      return nativePlay.call(this);
    };
  });
  await denied.page.goto(base);
  await denied.page.getByRole("button", { name: "Activar sonido" }).waitFor();
  const deniedFrame = denied.page.frames().find(frame => frame.url().includes("/intro-scene/index.html"));
  assert.ok(deniedFrame);
  await deniedFrame.waitForFunction(() => window.__continuityDiagnostics().time > .3);
  check(await denied.page.locator("video").evaluate(v => !v.muted && v.paused), "browser autoplay denial preserves sound-on preference while visuals continue");
  check(await denied.page.getByRole("status").filter({ hasText: "Activar sonido" }).isVisible(), "browser denial explicitly asks for one tap to enable sound");
  await denied.page.getByRole("button", { name: "Pausar animación" }).tap();
  const deniedTime = await deniedFrame.evaluate(() => window.__continuityDiagnostics().time);
  await denied.page.waitForTimeout(250);
  check(Math.abs((await deniedFrame.evaluate(() => window.__continuityDiagnostics().time)) - deniedTime) < .1, "pause still stops the visual clock when audio autoplay is denied");
  await denied.page.getByRole("button", { name: "Activar sonido" }).tap();
  check(await denied.page.locator("video").evaluate(v => !v.muted && v.paused), "enabling sound after browser denial respects an explicit pause");
  await denied.page.getByRole("button", { name: "Reproducir animación" }).tap();
  await denied.page.waitForFunction(() => { const v = document.querySelector("video"); return v && !v.paused && !v.muted; });
  check(await denied.page.getByRole("button", { name: "Silenciar sonido" }).isVisible(), "a real gesture restores audible playback and the mute control");
  check(Math.abs((await denied.page.locator("video").evaluate(v => v.currentTime)) - (await deniedFrame.evaluate(() => window.__continuityDiagnostics().time))) < .3, "audio joins at the current visual time after permission is granted");
  await denied.page.getByRole("button", { name: "Silenciar sonido" }).tap();
  check(await denied.page.locator("video").evaluate(v => v.muted && !v.paused), "mute remains available after browser-policy recovery");
  await denied.page.getByRole("button", { name: "Omitir", exact: true }).tap();
  await denied.context.close();
  const small = await setup(320, 568);
  await small.page.goto(base); await movieReady(small.page);
  check(await small.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "320px mobile has no overflow");
  await small.page.screenshot({ path: path.join(output, "mobile-320.png") });
  await small.page.getByRole("button", { name: "Omitir", exact: true }).click(); await small.context.close();
  check(errors.length === 0, `no browser runtime errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ checks, output }));
} finally { await browser.close(); }
