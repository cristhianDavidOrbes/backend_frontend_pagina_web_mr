import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || "C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs").href);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const origin = new URL(base).origin;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Only isolated local previews are allowed");
const output = await mkdtemp(path.join(tmpdir(), "algolab-poo-learning-"));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", args: ["--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log(`PASS ${message}`); }
const user = { id: 900001, nombre: "Estudiante de prueba local", correo: "qa@example.invalid", rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0 };
const progress = { usuarioId: user.id, puntajeOopTotal: 0, puntajeGlobalTotal: 0, niveles: [] };
async function setup(width, height, state = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"], hasTouch: width < 500 });
  await context.addInitScript(({ user, state }) => {
    localStorage.setItem("token", "local-qa-only");
    localStorage.setItem("usuario", JSON.stringify(user));
    localStorage.setItem(`oop_progreso:${user.id}`, JSON.stringify({ lenguaje: "python", puntajeTotal: 0, niveles: state }));
  }, { user, state });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) return route.abort();
    if (url.pathname.startsWith("/api/")) {
      if (route.request().method() !== "GET") return route.fulfill({ status: 200, json: progress });
      return route.fulfill({ status: 200, json: url.pathname === "/api/me" ? user : url.pathname === "/api/oop/progreso" ? progress : [] });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page };
}
async function noOverflow(page, name) {
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: no page-wide horizontal overflow`);
}
try {
  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844]]) {
    const { context, page } = await setup(width, height);
    await page.goto(`${base}/estudiante/codigo`);
    await page.getByRole("heading", { name: "Programar POO" }).waitFor();
    check(await page.locator("main ol li").count() === 11, `${width}: eight lessons and three learning steps`);
    check(await page.getByRole("link", { name: /^Empezar:/ }).count() === 1, `${width}: only the first unsolved challenge is available`);
    await page.getByRole("button", { name: "Java", exact: true }).click();
    check((await page.getByRole("link", { name: "Comenzar mi primer reto" }).getAttribute("href")).endsWith("?lang=java"), `${width}: selected language reaches the lesson`);
    await page.getByRole("button", { name: "Python", exact: true }).click();
    await noOverflow(page, `catalogue ${width}`);
    await page.screenshot({ path: path.join(output, `catalogue-${width}.png`), fullPage: true });
    await page.getByRole("link", { name: "Comenzar mi primer reto" }).click();
    const guide = page.getByRole("article", { name: /^Guía continua:/ });
    await guide.waitFor({ timeout: 60000 });
    for (const name of ["Entiende la idea", "Mira el ejemplo completo", "Cómo funciona ese código", "Ahora te toca a ti", "Prueba, aprende y vuelve a intentar"]) {
      check(await guide.getByRole("heading", { name, exact: true }).count() === 1, `${width}: continuous guide includes ${name}`);
    }
    check(await guide.getByRole("tab").count() === 0, `${width}: lesson content is not divided into tabs`);
    check(await guide.locator("em").filter({ hasText: "(o Java)" }).count() === 1, `${width}: emphasis renders without raw asterisks`);
    const scroll = guide.getByLabel("Contenido de la guía");
    check(await scroll.evaluate((element) => element.clientHeight > 150 && element.scrollHeight > element.clientHeight), `${width}: complete guide has a usable scroll area`);
    await scroll.evaluate((element) => { element.scrollTop = 0; });
    await noOverflow(page, `lesson ${width}`);
    check(await guide.locator("pre code span[class]").count() > 0, `${width}: example syntax is colored without splitting the code`);
    await page.screenshot({ path: path.join(output, `lesson-${width}.png`), fullPage: true });
    await guide.getByRole("heading", { name: "Ahora te toca a ti", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `practice-${width}.png`), fullPage: true });
    await guide.getByRole("button", { name: "Copiar ejemplo completo" }).click();
    check((await page.evaluate(() => navigator.clipboard.readText())).includes("nombre"), `${width}: full example can be copied`);
    // Java's local worker needs no remote runtime; network remains blocked.
    await page.getByRole("button", { name: "Java", exact: true }).click();
    if (width <= 1180) await page.getByRole("button", { name: "Editor", exact: true }).click();
    const editor = page.locator("textarea.code-textarea");
    await editor.fill('public class Main {\n public static void main(String[] args) {\n String nombre = "Ana";\n int edad = 20;\n String lenguaje = "Java";\n System.out.println("Hola, soy " + nombre + ", tengo " + edad + " años y aprendo " + lenguaje);\n }\n}');
    await page.locator(".oop-editor-header").getByRole("button", { name: "Ejecutar", exact: true }).click();
    await page.waitForFunction(() => document.body.textContent.includes("¡Reto superado!") || document.body.textContent.includes("Siguiente Nivel"), null, { timeout: 90000 });
    check(await page.getByRole("link", { name: "Siguiente Nivel", exact: true }).count() > 0, `${width}: compiler still validates and unlocks the next lesson`);
    await context.close();
  }
  const allDone = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [String(i + 1), { completado: true, puntos: 10, intentos: 1, usoPista: false }]));
  const complete = await setup(1440, 1000, allDone);
  await complete.page.goto(`${base}/estudiante/codigo`);
  await complete.page.getByRole("heading", { name: "Ya sabes construir con código" }).waitFor();
  check(await complete.page.getByRole("link", { name: /^Repasar:/ }).count() === 8, "Completed route preserves access to every lesson and reward");
  check(await complete.page.getByLabel("Recompensa secreta de Programar POO").count() === 1, "Completion reward is preserved");
  await complete.context.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(JSON.stringify({ checks, errors, screenshots: output }));
} finally { await browser.close(); }
