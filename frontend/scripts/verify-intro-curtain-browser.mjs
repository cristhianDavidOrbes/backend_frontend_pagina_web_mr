import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const output = await mkdtemp(path.join(tmpdir(), "algolab-curtain-"));
let checks = 0;
function check(value, label) { assert.ok(value, label); checks++; console.log(`PASS ${label}`); }
try {
  for (const [name, width, height] of [["desktop", 1365, 768], ["mobile", 390, 844], ["small-mobile", 320, 568], ["mobile-landscape", 844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 500 });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await context.route("**/api/**", route => route.abort());
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await context.route(/\/intro-scene\/runtime\/robot-[^/]+\.glb$/, async route => { await gate; await route.continue(); });
    await page.goto(base + "/?intro=preview", { waitUntil: "domcontentloaded" });
    const curtain = page.locator("[data-intro-curtain]");
    await curtain.waitFor({ state: "visible" });
    await page.getByRole("dialog", { name: "Bienvenida a AlgoLab" }).waitFor();
    check(await curtain.locator("[data-intro-panel]").count() === 2, `${name}: two panels replace the loading message`);
    check(await curtain.locator(".brand-mark svg").isVisible() && await curtain.getByText("AlgoLab", { exact: true }).count() === 0, `${name}: only the actual brand icon is visible, without a wordmark`);
    const layout = await curtain.evaluate(element => {
      const top = element.querySelector('[data-intro-panel="top"]'), bottom = element.querySelector('[data-intro-panel="bottom"]'), icon = element.querySelector('.brand-mark');
      const a = top.getBoundingClientRect(), b = bottom.getBoundingClientRect(), c = icon.getBoundingClientRect();
      const cover = element.getBoundingClientRect();
      top.style.pointerEvents = bottom.style.pointerEvents = 'auto';
      const sealed = [1, 2, innerWidth - 2, innerWidth - 3].every(x => {
        for (let y = a.bottom - 40; y <= a.bottom + 40; y += 2) if (!document.elementsFromPoint(x, y).some(e => e === top || e === bottom)) return false;
        return true;
      });
      top.style.removeProperty('pointer-events'); bottom.style.removeProperty('pointer-events');
      return { sealed, centered: Math.abs(c.x + c.width / 2 - innerWidth / 2) < 1 && Math.abs(c.y + c.height / 2 - innerHeight / 2) < 1, onSeam: c.top < a.bottom && c.bottom > a.bottom && Math.abs(c.y + c.height / 2 - a.bottom) < 1, fullViewport: cover.left === 0 && cover.top === 0 && Math.abs(cover.right - innerWidth) < 1 && Math.abs(cover.bottom - innerHeight) < 1 && document.documentElement.clientWidth === innerWidth, overlap: a.bottom - b.top, rounded: parseFloat(getComputedStyle(top).borderBottomLeftRadius) > 0 && parseFloat(getComputedStyle(bottom).borderTopLeftRadius) > 0, colors: [getComputedStyle(top).backgroundColor, getComputedStyle(bottom).backgroundColor], carried: top.contains(icon) };
    });
    check(layout.centered && layout.carried, `${name}: centered icon belongs to the upper moving panel`);
    check(layout.onSeam, `${name}: icon straddles the rounded seam as in the reference`);
    check(layout.fullViewport, `${name}: entire viewport is covered without a scrollbar strip`);
    check(layout.sealed, `${name}: rounded edges overlap fully without side gaps`);
    check(layout.overlap > 0 && layout.rounded, `${name}: panels overlap and have rounded meeting edges`);
    check(layout.colors[0] === 'rgb(241, 232, 210)' && layout.colors[1] === 'rgb(217, 208, 187)', `${name}: both panels use coordinated beige shades`);
    check(await page.getByText("Preparando el cuarto y el sonido…", { exact: true }).count() === 0, `${name}: old message is removed`);
    check(await page.locator("audio[data-intro-soundtrack]").evaluate(a => a.currentTime === 0 && a.paused), `${name}: soundtrack stays at zero while assets load`);
    await page.getByRole("button", { name: "Pausar animación" }).click();
    await page.getByRole("button", { name: "Reproducir animación" }).click();
    check(await page.locator("audio[data-intro-soundtrack]").evaluate(a => a.currentTime === 0 && a.paused), `${name}: controls cannot start playback before opening`);
    await page.screenshot({ path: path.join(output, name + "-closed.png") });
    release();
    await page.waitForFunction(() => document.querySelector('[data-intro-panel="top"]')?.getAnimations().some(a => a.currentTime > 250));
    const motion = await page.evaluate(() => {
      const top = document.querySelector('[data-intro-panel="top"]'), bottom = document.querySelector('[data-intro-panel="bottom"]');
      return { duration: top.getAnimations()[0]?.effect.getTiming().duration, easing: getComputedStyle(top).animationTimingFunction, top: new DOMMatrix(getComputedStyle(top).transform).m42, bottom: new DOMMatrix(getComputedStyle(bottom).transform).m42, audio: document.querySelector('audio[data-intro-soundtrack]').currentTime, sceneTime: document.querySelector('[data-intro-scene]').contentWindow.__continuityDiagnostics().time };
    });
    check(motion.duration === 1000 && motion.easing.includes("0.87"), `${name}: exact one-second exponential-style easing`);
    check(motion.top < 0 && motion.bottom > 0, `${name}: panels move in opposite vertical directions`);
    check(motion.audio > .05 && motion.sceneTime > 0 && Math.abs(motion.audio - motion.sceneTime) < .25, `${name}: film and sound play together while panels open`);
    await page.screenshot({ path: path.join(output, name + "-opening.png") });
    await curtain.waitFor({ state: "hidden" });
    check(await page.locator('audio[data-intro-soundtrack]').evaluate((a, earlier) => a.currentTime > earlier && !a.paused, motion.audio), `${name}: opening finishes without restarting or pausing the film`);
    check(await curtain.isHidden(), `${name}: panels are removed from view after opening`);
    check(await page.locator('audio[data-intro-soundtrack]').evaluate(a => !a.muted && Math.abs(a.duration - 20) < .1), `${name}: full twenty-second movie starts with sound enabled`);
    await page.getByRole("button", { name: "Omitir", exact: true }).click();
    check(await curtain.isHidden(), `${name}: skip cannot leave panels over the landing`);
    check(errors.length === 0, `${name}: no runtime errors: ${errors.join('; ')}`);
    await context.close();
  }
  console.log(JSON.stringify({ checks, output }));
} finally { await browser.close(); }
