import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Audio tests are restricted to an isolated local frontend.");
const audioPath = "/algolab/auth-rare-female-scream.mp3";
const imagePath = "/algolab/auth-rare-scare.png";
const activeKey = "algolab.auth-robot.easter-egg.active.v1";
const sessionKey = "algolab.auth-robot.easter-egg.session.v1";
const checks = [];
const check = (value, message) => { assert.ok(value, message); checks.push(message); console.log(`PASS: ${message}`); };
const settle = (page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations()
    .filter((animation) => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime))
    .map((animation) => animation.finished.catch(() => {})));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});

// Mute the test browser's hardware output, not WebAudio. The real browser still
// fetches and decodes MP3 bytes, resumes AudioContexts and starts native sources.
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const contexts = [];
const runtimeErrors = [];
const externalRequests = [];

async function setup({ holdImage = false, audioMode = "real" } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: activeKey, value: "active" }] }] },
  });
  contexts.push(context);
  await context.addInitScript(({ sessionKey }) => {
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
      if (sessionStorage.getItem(sessionKey) === null) sessionStorage.setItem(sessionKey, "drawn");
    }
    const evidence = { decoded: [], decodeErrors: 0, resumes: [], starts: [], stops: [], ended: [], gains: [], active: 0, maxActive: 0 };
    window.__authScareAudioEvidence = evidence;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const prototype = AudioContextClass.prototype;
    const originalDecode = prototype.decodeAudioData;
    const originalResume = prototype.resume;
    const originalCreateSource = prototype.createBufferSource;
    const originalCreateGain = prototype.createGain;
    const gainNodes = [];
    const activeSources = new Set();
    let sourceId = 0;

    prototype.decodeAudioData = function (...args) {
      const result = originalDecode.apply(this, args);
      result.then((buffer) => {
        const channel = buffer.getChannelData(0);
        let peak = 0;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < channel.length; i += 17) {
          peak = Math.max(peak, Math.abs(channel[i]));
          sum += channel[i] ** 2;
          count++;
        }
        evidence.decoded.push({ duration: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels, peak, rms: Math.sqrt(sum / Math.max(count, 1)) });
      }, () => { evidence.decodeErrors++; });
      return result;
    };
    prototype.resume = function (...args) {
      const result = originalResume.apply(this, args);
      result.then(() => evidence.resumes.push(this.state), () => evidence.resumes.push("rejected"));
      return result;
    };
    prototype.createGain = function (...args) {
      const node = originalCreateGain.apply(this, args);
      gainNodes.push(node);
      for (const method of ["setValueAtTime", "linearRampToValueAtTime", "exponentialRampToValueAtTime", "setTargetAtTime"]) {
        const original = node.gain[method];
        node.gain[method] = function (...values) {
          evidence.gains.push({ method, value: values[0] });
          return original.apply(this, values);
        };
      }
      return node;
    };
    prototype.createBufferSource = function (...args) {
      const source = originalCreateSource.apply(this, args);
      const id = ++sourceId;
      const originalStart = source.start;
      const originalStop = source.stop;
      source.addEventListener("ended", () => {
        activeSources.delete(id);
        evidence.active = activeSources.size;
        evidence.ended.push({ id, at: performance.now(), contextTime: source.context.currentTime });
      });
      source.start = function (...values) {
        const result = originalStart.apply(this, values);
        activeSources.add(id);
        evidence.active = activeSources.size;
        evidence.maxActive = Math.max(evidence.maxActive, evidence.active);
        const dialog = document.querySelector("[data-auth-jumpscare]");
        const image = dialog?.querySelector("img");
        evidence.starts.push({ id, at: performance.now(), state: this.context.state, contextTime: this.context.currentTime, duration: this.buffer?.duration, scheduledDuration: values[2], loop: this.loop, gains: gainNodes.map((gain) => gain.gain.value), dialogOpen: dialog?.open === true, imageReady: Boolean(image?.complete && image.naturalWidth > 0) });
        return result;
      };
      source.stop = function (...values) {
        const result = originalStop.apply(this, values);
        evidence.stops.push(id);
        if (!values[0] || values[0] <= this.context.currentTime) {
          activeSources.delete(id);
          evidence.active = activeSources.size;
        }
        return result;
      };
      return source;
    };
  }, { sessionKey });

  let releaseImage;
  let releaseAudio;
  const imageGate = new Promise((resolve) => { releaseImage = resolve; });
  const audioGate = new Promise((resolve) => { releaseAudio = resolve; });
  let imageRequests = 0;
  let audioRequests = 0;
  if (!holdImage) releaseImage();
  if (audioMode !== "held") releaseAudio();
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      externalRequests.push(url.origin);
      await route.abort("blockedbyclient");
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await route.fulfill({ status: 401, json: { exitoso: false, mensaje: "Inicio de sesión simulado: sin backend real" } });
      return;
    }
    if (url.pathname === imagePath) {
      imageRequests++;
      await imageGate;
    }
    if (url.pathname === audioPath) {
      audioRequests++;
      await audioGate;
      if (audioMode === "corrupt") {
        await route.fulfill({ status: 200, contentType: "audio/mpeg", body: "This is deliberately invalid MP3 data for a local failure test." });
        return;
      }
      if (audioMode === "missing") {
        await route.fulfill({ status: 404, body: "Local audio failure fixture" });
        return;
      }
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => runtimeErrors.push(`${audioMode}: ${error.message}`));
  await page.goto(base + "/iniciar-sesion");
  const robot = page.getByRole("button", { name: "Examinar el robot de AlgoLab", exact: true });
  const dialog = page.getByRole("dialog", { name: "Sorpresa de AlgoLab", exact: true });
  await robot.waitFor({ state: "visible", timeout: 120000 });
  await page.locator("[data-auth-companion] .robot-stage-ready, [data-auth-companion] .robot-stage-fallback").waitFor({ state: "visible", timeout: 30000 });
  await settle(page);
  return { context, page, robot, dialog, releaseImage, releaseAudio, requests: () => ({ imageRequests, audioRequests }) };
}

const evidence = (page) => page.evaluate(() => structuredClone(window.__authScareAudioEvidence));
const waitStarts = (page, count) => page.waitForFunction((wanted) => window.__authScareAudioEvidence.starts.length >= wanted, count, { timeout: 5000 });
const waitSilent = (page) => page.waitForFunction(() => window.__authScareAudioEvidence.active === 0, null, { timeout: 2500 });

try {
  const real = await setup({ holdImage: true });
  let { page, robot, dialog } = real;
  await page.locator("#correo").fill("audio-test@example.invalid");
  await page.locator("#contrasena").fill("only-a-synthetic-password");
  await robot.hover();
  await robot.focus();
  const box = await robot.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 15, { steps: 5 });
  await page.mouse.up();
  check((await evidence(page)).starts.length === 0, "Scene load, typing, hover, focus and dragging never play audio");
  check(await dialog.count() === 0, "Non-click interactions do not reveal the scare");

  await robot.click();
  await dialog.waitFor({ state: "visible" });
  await page.waitForFunction(() => window.__authScareAudioEvidence.decoded.length > 0, null, { timeout: 10000 });
  const decoded = (await evidence(page)).decoded[0];
  check(real.requests().audioRequests > 0 && decoded.duration >= 8 && decoded.duration < 9 && decoded.sampleRate >= 8000, "The selected female scream decodes from the real local MP3 to its full eight-second PCM buffer");
  check(decoded.peak > 0.02 && decoded.rms > 0.005, "The decoded human scream contains real, non-silent audio samples");
  check((await evidence(page)).starts.length === 0, "Unlocking/decoding waits silently while the image is still loading");
  real.releaseImage();
  await dialog.locator("img").evaluate((node) => node.decode());
  await waitStarts(page, 1);
  const first = await evidence(page);
  check(first.starts.length === 1 && first.starts[0].state === "running" && !first.starts[0].loop, "An intentional click plus a ready image starts exactly one real, non-looping source");
  check(first.starts[0].scheduledDuration === undefined || Math.abs(first.starts[0].scheduledDuration - decoded.duration) < 0.05, "Playback schedules the entire female scream instead of truncating it to two seconds");
  // AudioParam.value can still expose its default before the next render quantum.
  // When automation exists, verify the actual scheduled envelope, not that default.
  const gainValues = (first.gains.length ? first.gains.map((item) => item.value) : first.starts.flatMap((item) => item.gains)).filter((value) => value > 0);
  check(gainValues.some((value) => Math.abs(value - 0.45) < 0.01) && gainValues.every((value) => value <= 0.5), "The scream uses moderate gain instead of full volume");
  const stillImage = await dialog.locator("img").getAttribute("src");
  await page.waitForFunction(() => window.__authScareAudioEvidence.ended.length > 0, null, { timeout: 12000 });
  const ended = (await evidence(page)).ended[0];
  check(ended.at - first.starts[0].at >= (decoded.duration - 0.2) * 1000, "The native sound reaches the end of the full clip before the silent pause");
  check(await dialog.isVisible(), "The image remains visible when the scream finishes");
  await page.waitForTimeout(2000);
  check(await dialog.isVisible() && await dialog.locator("img").getAttribute("src") === stillImage && (await evidence(page)).active === 0, "During the post-scream pause the same still image remains, with no active sound");
  check(await page.evaluate((key) => localStorage.getItem(key), activeKey) === "active", "The rare scene stays latched until the silent pause has completed");
  await dialog.waitFor({ state: "detached", timeout: 4000 });
  const completedAt = await page.evaluate(() => performance.now());
  check(completedAt - ended.at >= 2900 && completedAt - ended.at < 5000, "Normality returns only after three seconds of silence after the real ended event");
  await waitSilent(page);
  check((await evidence(page)).starts.length === 1, "Automatic dismissal leaves no playing or repeated sound");
  const completedPlayback = await evidence(page);
  await page.getByRole("button", { name: "Mover el robot de AlgoLab", exact: true }).waitFor({ state: "visible" });
  check(await page.locator("[data-auth-eerie]").count() === 0 && await page.evaluate(({ activeKey, sessionKey }) => localStorage.getItem(activeKey) === null && sessionStorage.getItem(sessionKey) === "completed", { activeKey, sessionKey }), "Finishing the full sequence restores normal lighting and robot, clears the latch and completes the session");
  await page.reload();
  await page.getByRole("button", { name: "Mover el robot de AlgoLab", exact: true }).waitFor({ state: "visible" });
  check(await page.locator("[data-auth-eerie]").count() === 0, "The completed rare scene does not reactivate on a reload");
  await real.context.close();

  // Cancelling a later, independent rare event must never be confused with
  // automatically completing the first one. Seed only a new isolated profile.
  const cancellation = await setup();
  ({ page, robot, dialog } = cancellation);

  for (const key of ["Escape", "button", "Escape"]) {
    const before = await evidence(page);
    await robot.click();
    await waitStarts(page, before.starts.length + 1);
    if (key === "button") await dialog.getByRole("button", { name: "Cerrar · Esc", exact: true }).click();
    else await page.keyboard.press(key);
    await dialog.waitFor({ state: "detached", timeout: 2000 });
    await waitSilent(page);
    const after = await evidence(page);
    check(after.stops.length > before.stops.length, `${key === "button" ? "Close button" : "Escape"} stops its active scream immediately`);
    check(await page.evaluate((key) => localStorage.getItem(key), activeKey) === "active", "Manual dismissal cancels playback without completing the rare scene");
  }
  check((await evidence(page)).maxActive === 1, "Rapid dismiss/reopen never overlaps scream sources");
  check((await evidence(page)).starts.every((start) => start.dialogOpen && start.imageReady), "Cold and warm image-cache playback always starts with the dialog open and the image loaded");

  const beforeKeyboard = await evidence(page);
  await robot.focus();
  await page.keyboard.press("Enter");
  await waitStarts(page, beforeKeyboard.starts.length + 1);
  check(true, "Keyboard activation unlocks and plays real browser audio");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await dialog.waitFor({ state: "detached", timeout: 2000 });
  await waitSilent(page);
  check((await evidence(page)).stops.length > beforeKeyboard.stops.length, "Window blur stops audio and dismisses the scare");

  const beforeRoute = await evidence(page);
  await robot.click();
  await waitStarts(page, beforeRoute.starts.length + 1);
  // Exercise client routing while the modal is open, as a navigation initiated by
  // app code would. No real account, external page or backend is involved.
  await page.locator('a[href="/registrarse"]').evaluate((link) => link.click());
  await page.waitForURL("**/registrarse");
  await dialog.waitFor({ state: "detached", timeout: 2000 });
  await waitSilent(page);
  await settle(page);
  check((await evidence(page)).stops.length > beforeRoute.stops.length, "Auth route changes cancel an active scream without reloading the browser");
  check(await page.evaluate((key) => localStorage.getItem(key), activeKey) === "active", "Route cancellation preserves the rare event for a later visit");

  const silentCancellation = await setup();
  await silentCancellation.robot.click();
  await waitStarts(silentCancellation.page, 1);
  await silentCancellation.page.waitForFunction(() => window.__authScareAudioEvidence.ended.length > 0, null, { timeout: 12000 });
  await silentCancellation.page.keyboard.press("Escape");
  await silentCancellation.dialog.waitFor({ state: "detached", timeout: 2000 });
  await silentCancellation.page.waitForTimeout(3250);
  check(await silentCancellation.page.evaluate((key) => localStorage.getItem(key), activeKey) === "active" && (await evidence(silentCancellation.page)).active === 0, "Cancelling during the silent pause also cancels the pending automatic completion");

  const held = await setup({ audioMode: "held" });
  await held.robot.click();
  await held.dialog.waitFor({ state: "visible" });
  await held.dialog.locator("img").evaluate((node) => node.decode());
  await held.page.keyboard.press("Escape");
  await held.dialog.waitFor({ state: "detached" });
  held.releaseAudio();
  await held.page.waitForTimeout(800);
  check((await evidence(held.page)).starts.length === 0, "A late audio response cannot play after the user has closed the scare");

  for (const audioMode of ["corrupt", "missing"]) {
    // The new fallback dismisses immediately once the ready image discovers that
    // audio failed. Hold the image to observe the modal deterministically first.
    const failed = await setup({ audioMode, holdImage: true });
    await failed.robot.click();
    await failed.dialog.waitFor({ state: "visible" });
    if (audioMode === "corrupt") await failed.page.waitForFunction(() => window.__authScareAudioEvidence.decodeErrors > 0, null, { timeout: 4000 });
    failed.releaseImage();
    await failed.dialog.waitFor({ state: "detached", timeout: 5000 });
    check((await evidence(failed.page)).starts.length === 0, `${audioMode} audio fails silently without a fake or looping sound`);
    check(await failed.page.evaluate((key) => localStorage.getItem(key), activeKey) === "active", `${audioMode} audio does not count as a completed rare event`);
    if (audioMode === "corrupt") check((await evidence(failed.page)).decodeErrors > 0, "Invalid MP3 bytes actually exercise the browser decoder failure path");
    await failed.page.locator("#correo").fill("audio-failure@example.invalid");
    await failed.page.locator("#contrasena").fill("synthetic-password-only");
    await failed.page.getByRole("button", { name: "Entrar", exact: true }).click();
    await failed.page.getByText("Inicio de sesión simulado: sin backend real", { exact: true }).waitFor();
    check(true, `${audioMode} audio does not break the usable login form`);
  }

  assert.deepEqual(runtimeErrors, [], "No browser runtime errors, including failure scenarios");
  check(externalRequests.length === 0, "No external audio services or real account endpoints are contacted");
  console.log(JSON.stringify({ ok: true, checks, decodedAudio: decoded, completedPlayback, nativePlayback: await evidence(page), note: "Browser hardware output muted; actual decoding and native WebAudio playback were observed." }, null, 2));
} finally {
  await Promise.allSettled(contexts.map((context) => context.close()));
  await browser.close();
}
