import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "This test only submits mocked credentials on localhost.");

// Public persistence contract in src/lib/auth-robot-easter-egg.ts. Never seed a real browser profile.
const activeKey = "algolab.auth-robot.easter-egg.active.v1";
const sessionKey = "algolab.auth-robot.easter-egg.session.v1";
const output = await mkdtemp(path.join(tmpdir(), "algolab-auth-rare-"));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"],
});
const checks = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); console.log(`PASS: ${message}`); };
const settle = (page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations()
    .filter((animation) => animation.playState === "running" && Number.isFinite(animation.effect?.getComputedTiming().endTime))
    .map((animation) => animation.finished.catch(() => {})));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});
const fakeEmail = "prueba-easter-egg@example.invalid";
const fakePassword = "local-test-not-a-real-password";
const fakeUser = {
  id: 987654,
  nombre: "Prueba local aislada",
  correo: fakeEmail,
  rol: "ESTUDIANTE",
  nivelActual: 1,
  puntaje: 0,
  nombreUsuario: "prueba_local",
  institucion: "Institución de prueba",
  programa: "Prueba automatizada",
};

let context;
let releaseScareImage = () => {};
try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: activeKey, value: "active" }] }] },
  });
  await context.addInitScript(({ sessionKey }) => {
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
      // Do not overwrite a completed session on reload: that is part of the assertion.
      if (sessionStorage.getItem(sessionKey) === null) sessionStorage.setItem(sessionKey, "drawn");
    }
  }, { sessionKey });

  let authMode = "reject";
  const authRequests = [];
  const externalRequests = [];
  let destinationRequests = 0;
  const destinationApiReads = [];
  let heldImageRequests = 0;
  const slowImageGate = new Promise((resolve) => { releaseScareImage = resolve; });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      externalRequests.push(url.origin);
      await route.abort("blockedbyclient");
      return;
    }
    if (url.pathname === "/algolab/auth-rare-scare.png") {
      heldImageRequests++;
      await slowImageGate;
      await route.continue();
      return;
    }
    if (url.pathname.startsWith("/estudiante")) {
      // Let the local RSC navigation finish; holding it open stalls native ViewTransition.
      // Every API read used by this local page is intercepted below.
      destinationRequests++;
      await route.continue();
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }
    if (url.pathname === "/api/iniciar-sesion" || url.pathname === "/api/registrar") {
      assert.equal(request.method(), "POST");
      const payload = request.postDataJSON();
      assert.equal(payload.correo, fakeEmail, "Only synthetic test credentials may be submitted");
      assert.equal(payload.contrasena, fakePassword);
      authRequests.push({ path: url.pathname, mode: authMode });
      const successfulLogin = url.pathname === "/api/iniciar-sesion" && authMode === "loginSuccess";
      const successfulRegistration = url.pathname === "/api/registrar" && authMode === "registrationSuccessLoginFailure";
      await route.fulfill({
        status: successfulLogin || successfulRegistration ? 200 : 401,
        json: successfulLogin
          ? { exitoso: true, token: "local-synthetic-session-only", usuario: fakeUser }
          : successfulRegistration
            ? { exitoso: true, mensaje: "Registro local simulado" }
            : { exitoso: false, mensaje: "Fallo de inicio de sesión simulado localmente" },
      });
      return;
    }
    const destinationFixtures = {
      "/api/me": fakeUser,
      "/api/progreso": { usuarioId: fakeUser.id, nivelActual: 1, puntajeTotal: 0, tiempoJugadoSegundos: 0, niveles: [] },
      "/api/reportes": [],
      "/api/niveles": [],
      "/api/ranking": { total: 0, estudiantes: [] },
    };
    if (authMode === "loginSuccess" && request.method() === "GET" && Object.hasOwn(destinationFixtures, url.pathname)) {
      destinationApiReads.push(url.pathname);
      await route.fulfill({ status: 200, json: destinationFixtures[url.pathname] });
      return;
    }
    // Fail closed: no unexpected API request can reach the configured real backend.
    await route.fulfill({ status: 503, json: { mensaje: "API bloqueada por la prueba local aislada" } });
  });

  const page = await context.newPage();
  const runtimeErrors = [];
  let documents = 0;
  page.on("pageerror", (error) => { runtimeErrors.push(error.message); console.error(`Runtime error on ${new URL(page.url()).pathname}: ${error.message}`); });
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++;
  });
  const robot = page.getByRole("button", { name: "Examinar el robot de AlgoLab", exact: true });
  const eerie = page.locator("[data-auth-eerie]");
  const scare = page.getByRole("dialog", { name: "Sorpresa de AlgoLab", exact: true });
  const assertActive = async (message) => {
    await eerie.waitFor({ state: "visible", timeout: 120000 });
    await robot.waitFor({ state: "visible" });
    check(await page.evaluate((key) => localStorage.getItem(key) === "active", activeKey), message);
    await page.locator('[data-auth-companion] [data-pose="haunted"]').first().waitFor({ state: "visible" });
  };

  await page.goto(base + "/iniciar-sesion");
  await assertActive("Rare state activates from the persistent latch");
  await page.locator("[data-auth-companion] .robot-stage-ready, [data-auth-companion] .robot-stage-fallback").waitFor({ state: "visible", timeout: 30000 });
  await page.locator("#correo").fill(fakeEmail);
  await page.locator("#contrasena").fill(fakePassword);
  check(await page.locator("#correo").inputValue() === fakeEmail && await page.locator("#contrasena").inputValue() === fakePassword, "The eerie layer leaves the login form usable");
  await settle(page);
  await page.screenshot({ path: path.join(output, "rare-auth-desktop.png"), fullPage: true });

  await robot.hover();
  await robot.focus();
  await page.waitForTimeout(250);
  check(await scare.count() === 0, "Hover and focus do not open the surprise");
  const bounds = await robot.boundingBox();
  assert.ok(bounds);
  const centre = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 32, centre.y + 16, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  check(await scare.count() === 0, "Dragging more than eight pixels does not open the surprise");

  await robot.click();
  await scare.waitFor({ state: "visible" });
  check(await page.locator("[data-auth-jumpscare]").count() === 1, "An intentional click opens one surprise dialog");
  const image = scare.locator("img");
  await image.waitFor({ state: "attached" });
  check(new URL(await image.getAttribute("src"), origin).pathname === "/algolab/auth-rare-scare.png", "The dialog uses the requested local surprise image");
  // The preload and the dialog image share this held local route. Do not depend on
  // a slow network or a warmed cache when testing the image-load/auto-close race.
  check(heldImageRequests > 0 && await image.evaluate((node) => node.naturalWidth === 0), "The surprise image is deliberately held by the isolated test");
  await page.waitForTimeout(2050);
  check(await scare.isVisible(), "A slow image does not expire the dialog before it is revealed");
  releaseScareImage();
  await image.evaluate((node) => node.decode());
  check(await image.evaluate((node) => node.naturalWidth > 0), "The supplied surprise image loads successfully");
  const imageDecodedAt = Date.now();
  await page.waitForTimeout(850);
  check(await scare.isVisible(), "The loaded surprise remains visible instead of immediately auto-closing");
  await scare.waitFor({ state: "detached", timeout: 15000 });
  check(Date.now() - imageDecodedAt >= 10900, "The full female scream and following three-second pause finish before auto-close");
  await page.getByRole("button", { name: "Mover el robot de AlgoLab", exact: true }).waitFor({ state: "visible" });
  check(await eerie.count() === 0 && await page.evaluate(({ activeKey, sessionKey }) => localStorage.getItem(activeKey) === null && sessionStorage.getItem(sessionKey) === "completed", { activeKey, sessionKey }), "Completing the surprise clears the rare scene and restores the normal robot and lighting");
  check(await page.locator("#correo").inputValue() === fakeEmail && await page.locator("#contrasena").inputValue() === fakePassword, "Completing the surprise preserves the entered login data");

  // The completed event cannot open again in this session. Seed a separate rare
  // occurrence in this isolated profile to exercise cancellation and auth paths.
  await page.evaluate(({ activeKey, sessionKey }) => {
    localStorage.setItem(activeKey, "active");
    sessionStorage.setItem(sessionKey, "drawn");
  }, { activeKey, sessionKey });
  await page.reload();
  await assertActive("An isolated new rare occurrence is ready for cancellation checks");
  await page.locator("#correo").fill(fakeEmail);
  await page.locator("#contrasena").fill(fakePassword);

  await robot.focus();
  await page.keyboard.press("Enter");
  await scare.waitFor({ state: "visible" });
  check(true, "Enter explicitly opens the surprise");
  await page.keyboard.press("Escape");
  await scare.waitFor({ state: "detached", timeout: 2000 });
  await assertActive("Escape closes the dialog without clearing the rare state");
  check(await page.locator("#correo").inputValue() === fakeEmail, "The surprise preserves typed form values");

  await page.evaluate(() => { window.__rareRobotNode = document.querySelector("[data-auth-companion]"); });
  const beforeClientNavigation = documents;
  await page.locator('a[href="/registrarse"]').click();
  await page.waitForURL("**/registrarse");
  await assertActive("The rare state persists on the registration page");
  await settle(page);
  check(documents === beforeClientNavigation, "Login to registration remains client-side");
  check(await page.evaluate(() => window.__rareRobotNode === document.querySelector("[data-auth-companion]")), "The existing companion survives navigation");
  await page.locator("#nombre").fill("Prueba local aislada");
  await page.locator("#correo-registro").fill(fakeEmail);
  await page.locator("#contrasena-registro").fill(fakePassword);
  check(await page.locator("#nombre").inputValue() === "Prueba local aislada", "The registration form stays usable in rare mode");
  await page.locator('a[href="/iniciar-sesion"]').click();
  await page.waitForURL("**/iniciar-sesion");
  await assertActive("The rare state persists when returning to login");
  await settle(page);
  check(documents === beforeClientNavigation, "Registration to login does not reload the document");

  await page.reload();
  await assertActive("The rare state survives a full reload");
  await page.goto(base + "/");
  check(await eerie.count() === 0 && await page.locator("[data-auth-companion]").count() === 0, "The landing page is never covered by the auth-only event");
  check(await page.evaluate((key) => localStorage.getItem(key), activeKey) === "active", "Leaving auth pages does not clear the latch");
  await page.goto(base + "/iniciar-sesion");
  await assertActive("Returning from the landing page restores rare mode");

  await page.locator("#correo").fill(fakeEmail);
  await page.locator("#contrasena").fill(fakePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByText("Fallo de inicio de sesión simulado localmente", { exact: true }).waitFor();
  await assertActive("Failed login does not clear the rare state");

  authMode = "registrationSuccessLoginFailure";
  await page.locator('a[href="/registrarse"]').click();
  await page.waitForURL("**/registrarse");
  await settle(page);
  await page.locator("#nombre").fill("Prueba local aislada");
  await page.locator("#correo-registro").fill(fakeEmail);
  await page.locator("#contrasena-registro").fill(fakePassword);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/iniciar-sesion" && url.searchParams.get("registro") === "exitoso");
  await assertActive("Successful registration without a successful login keeps rare mode");
  check(await page.evaluate(() => localStorage.getItem("token")) === null, "Failed automatic login never saves a session");
  // A URL can update before its native ViewTransition finishes. Resize only after
  // the client-side navigation has settled, not in the middle of its DOM update.
  await settle(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertActive("Rare mode remains usable on mobile with reduced motion");
  await page.locator("[data-auth-companion] .robot-stage-ready, [data-auth-companion] .robot-stage-fallback").waitFor({ state: "visible", timeout: 30000 });
  await settle(page);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "The rare layer does not introduce horizontal overflow");
  await page.screenshot({ path: path.join(output, "rare-auth-mobile.png"), fullPage: true });

  authMode = "loginSuccess";
  await page.locator("#correo").fill(fakeEmail);
  await page.locator("#contrasena").fill(fakePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForFunction(({ activeKey, sessionKey }) => localStorage.getItem(activeKey) === null && sessionStorage.getItem(sessionKey) === "completed", { activeKey, sessionKey });
  check(true, "Successful mocked authentication also clears the latch and completes this session");
  await page.waitForFunction(() => localStorage.getItem("token") === "local-synthetic-session-only");
  await page.waitForURL((url) => url.pathname === "/estudiante");
  await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
  await settle(page);
  check(destinationRequests > 0, "Successful login completes the destination navigation in the local frontend");
  check(await eerie.count() === 0 && await page.locator("[data-auth-companion]").count() === 0, "The authenticated destination has no rare overlay or auth robot");
  check(destinationApiReads.includes("/api/me") && destinationApiReads.includes("/api/progreso"), "The destination renders with an isolated mocked profile and progress");
  check(authRequests.some((request) => request.path === "/api/registrar") && authRequests.filter((request) => request.path === "/api/iniciar-sesion").length === 3, "Registration and every login outcome used isolated mocks");
  assert.deepEqual(runtimeErrors, [], "No browser runtime errors in the tested auth flows");
  checks.push("No browser runtime errors");
  console.log(JSON.stringify({ ok: true, checks, documents, output, mockedAuthRequests: authRequests.length, mockedDestinationReads: [...new Set(destinationApiReads)], blockedExternalOrigins: [...new Set(externalRequests)] }, null, 2));
  await context.close();
  context = undefined;
} finally {
  releaseScareImage();
  if (context) await context.close();
  await browser.close();
}
