import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

// Only an explicitly started, ephemeral release-verification Java server is
// allowed. This harness neither starts Next nor uses production credentials.
assert.ok(process.argv.includes("--local-java-verification"), "Explicit local Java verification opt-in required");
const backendUrl = "http://127.0.0.1:18080";
const { NextResponse } = createRequire(import.meta.url)("next/server");
let checks = 0;
const timings = [];
function check(condition, message) { assert.ok(condition, message); checks++; }
const safeFetch = async (url, init) => {
  assert.equal(new URL(url).origin, backendUrl, "The harness must never call another backend");
  const started = performance.now();
  const result = await fetch(url, init);
  timings.push(performance.now() - started);
  return result;
};

async function loadModule(path, imports) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, module: { exports }, require: (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    Request, Response, Headers, URL, FormData, File, Blob, AbortSignal, AbortController,
    console, setTimeout, clearTimeout, fetch: safeFetch,
    process: { env: { API_BASE_URL: backendUrl } },
  }, { filename: path });
  return exports;
}

const backend = await loadModule("../src/lib/backend.ts", { "server-only": {}, "next/server": { NextResponse } });
const routes = {};
for (const name of ["registrar", "iniciar-sesion", "me", "progreso", "reportes", "usuarios", "ranking", "niveles"]) {
  routes[name] = await loadModule(`../src/app/api/${name}/route.ts`, { "@/lib/backend": backend });
}
function request(path, token, body) {
  return new Request(`http://frontend-verification.invalid/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function route(name, token, body, query = "") {
  const response = await routes[name][body ? "POST" : "GET"](request(name + query, token, body));
  const text = await response.text();
  return { response, data: text ? JSON.parse(text) : null };
}

const fixturePassword = "VerificacionLocal2026!";
const roles = [];
for (const [correo, rol] of [
  ["docente.release@example.test", "DOCENTE"],
  ["admin.release@example.test", "ADMINISTRADOR"],
]) {
  const { response, data } = await route("iniciar-sesion", null, { correo, contrasena: fixturePassword });
  check(response.ok && data.exitoso && data.usuario?.rol === rol && Boolean(data.token), "Local fixture login must preserve actual Java role");
  roles.push(data);
}

const tag = randomUUID();
const students = [];
for (let index = 0; index < 2; index++) {
  const correo = `frontendproxy-${tag}-${index}@example.test`;
  const contrasena = `LocalTest-${randomUUID()}!`;
  const registered = await route("registrar", null, {
    nombre: `Frontend proxy ${index}`, correo, contrasena, rol: "ESTUDIANTE",
    aceptaTratamientoDatos: true, versionConsentimiento: "local-release-verification",
  });
  check(registered.response.ok && registered.data.exitoso && Boolean(registered.data.usuario?.id), "Synthetic registration through the real frontend handler must succeed");
  const logged = await route("iniciar-sesion", null, { correo, contrasena });
  check(logged.response.ok && logged.data.usuario.id === registered.data.usuario.id, "Login handler must return the newly registered identity");
  students.push(logged.data);
}

const unauthorized = await route("me");
check(unauthorized.response.status === 401, "Real Java HTTP 401 must survive the frontend proxy");
for (const name of ["usuarios", "reportes"]) {
  const rejected = await route(name, students[0].token, null, name === "reportes" ? "?todos=1" : "");
  check(rejected.response.status === 403, "A student must not access staff-only data through the frontend handler");
}

// Simulate the Unity HTTP contract directly, then read the result through the
// frontend's actual GET handlers. No real headset/browser is claimed here.
for (let index = 0; index < students.length; index++) {
  let cumulativeSeconds = 0;
  for (let nivel = 1; nivel <= (index === 0 ? 4 : 1); nivel++) {
    cumulativeSeconds += 60 + nivel;
    const response = await safeFetch(`${backendUrl}/api/progreso`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${students[index].token}` },
      body: JSON.stringify({ nivel, completado: true, puntaje: 90 + index * 10, tiempoRestante: 30, intentos: 1, tiempoJugadoSegundos: cumulativeSeconds }),
      signal: AbortSignal.timeout(15_000),
    });
    check(response.ok, "The real Java server must accept a synthetic level completion");
    const progress = await route("progreso", students[index].token);
    check(progress.data.usuarioId === students[index].usuario.id && progress.data.niveles.some((item) => item.nivel === nivel && item.completado), "A committed Unity-shaped result must be immediately readable by the frontend handler");
    check(progress.response.headers.get("cache-control")?.includes("no-store"), "The synchronized progress response must not be cached");
  }
}

const first = await route("progreso", students[0].token);
check(first.data.rutaVrCompletada && first.data.nivelesVrCompletados === 4 && first.data.totalNivelesVr === 4 && first.data.nivelActual === 4, "Four completed VR levels must map to a completed four-level route");
check(first.data.puntajeTotal === 360 && first.data.tiempoJugadoSegundos === 250, "Frontend progress must preserve Java's score and played-time totals");

let reports;
for (let attempt = 0; attempt < 30; attempt++) {
  reports = await route("reportes", students[0].token);
  if (reports.data.length === 4) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
check(reports.response.ok && reports.data.length === 4 && reports.data.every((item) => item.usuarioId === students[0].usuario.id), "Asynchronous local report generation must become visible through the frontend handler without crossing student identities");

const forbiddenProgress = await route("progreso", students[1].token, null, `?usuarioId=${students[0].usuario.id}`);
check(forbiddenProgress.response.status === 403, "A student cannot query another student's progress");
for (const staff of roles) {
  const progress = await route("progreso", staff.token, null, `?usuarioId=${students[0].usuario.id}`);
  check(progress.response.ok && progress.data.rutaVrCompletada, "Staff must see committed student progress through the frontend handler");
  const report = await route("reportes", staff.token, null, `?usuarioId=${students[0].usuario.id}`);
  check(report.response.ok && report.data.length === 4, "Staff must see the same persisted reports through the frontend handler");
}

const concurrent = await Promise.all(Array.from({ length: 40 }, async (_, index) => {
  const student = students[index % students.length];
  const name = index % 3 === 0 ? "me" : index % 3 === 1 ? "progreso" : "reportes";
  const { response, data } = await route(name, student.token);
  const ownData = name === "me" ? data.id === student.usuario.id : name === "progreso" ? data.usuarioId === student.usuario.id : data.every((item) => item.usuarioId === student.usuario.id);
  check(response.ok && ownData, "Concurrent real-Java handler reads must remain isolated by JWT identity");
  return response.ok;
}));
check(concurrent.every(Boolean), "All 40 concurrent handler reads must succeed");
for (const name of ["ranking", "niveles"]) {
  const result = await route(name, students[0].token);
  check(result.response.ok && Array.isArray(name === "ranking" ? result.data.estudiantes : result.data), "Public route metadata must pass through the real frontend handler");
}
const sorted = [...timings].sort((a, b) => a - b);
console.log(`PASS: ${checks} checks, actual NextResponse/TypeScript handlers → local Java/H2; 40 concurrent JWT-isolated reads. No Next server, browser, production account or external AI call.`);
console.log(`Local HTTP latency: p50=${Math.round(sorted[Math.floor(sorted.length * .5)])}ms; p95=${Math.round(sorted[Math.floor(sorted.length * .95)])}ms; max=${Math.round(sorted.at(-1))}ms. Synthetic results, not a Render load benchmark.`);
