import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}

async function loadModule(path, context, imports) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const sandbox = {
    exports, module: { exports }, require: (name) => {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    Request, Response, Headers, FormData, File, Blob, AbortSignal, AbortController,
    console, setTimeout, clearTimeout, process: { env: { API_BASE_URL: "http://127.0.0.1:40199" } },
    ...context,
  };
  vm.runInNewContext(compiled, sandbox, { filename: path });
  return exports;
}

const storage = new Map([["token", "synthetic-user-a"]]);
let redirected = 0, cleared = 0;
let deliver;
const window = {
  localStorage: { getItem: (key) => storage.get(key) ?? null },
  location: { pathname: "/estudiante", replace: () => { redirected++; } },
};
const client = await loadModule("../src/lib/client-api.ts", {
  window, fetch: () => new Promise((resolve) => { deliver = resolve; }),
}, {
  "@/lib/use-auth-session": { clearAuthSession: () => { cleared++; storage.delete("token"); } },
});

const oldRequest = client.apiRequest("/api/me", "synthetic-user-a");
storage.set("token", "synthetic-user-b");
deliver(Response.json({ mensaje: "Expired old session" }, { status: 401 }));
await assert.rejects(oldRequest);
check(storage.get("token") === "synthetic-user-b", "An old 401 must not delete the newly signed-in user's session");
check(cleared === 0 && redirected === 0, "An old response must not redirect or sign out the new user");

const oldSuccess = client.apiRequest("/api/me", "synthetic-user-b");
storage.set("token", "synthetic-user-c");
deliver(Response.json({ id: 2, nombre: "Synthetic B" }));
await assert.rejects(oldSuccess, /sesión|session/i);
checks++;

const currentExpired = client.apiRequest("/api/me", "synthetic-user-c");
deliver(Response.json({ mensaje: "Expired current session" }, { status: 401 }));
await assert.rejects(currentExpired);
check(cleared === 1 && redirected === 1, "A current 401 must still sign out and redirect");

let behavior = async (_url, init) => Response.json({ authorization: init.headers.Authorization });
const observedSignals = [];
const backend = await loadModule("../src/lib/backend.ts", {
  fetch: async (url, init) => { observedSignals.push(init.signal); return behavior(url, init); },
}, {
  "server-only": {}, "next/server": { NextResponse: { json: Response.json } },
});

const users = Array.from({ length: 100 }, (_, index) => `synthetic-user-${index}`);
behavior = async (_url, init) => {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
  return Response.json({ authorization: init.headers.Authorization });
};
const results = await Promise.all(users.map(async (user) => {
  const request = new Request("http://localhost/api/progreso", { headers: { Authorization: `Bearer ${user}` } });
  const response = await backend.proxyBackend({ request, path: "/api/progreso/me", method: "GET" });
  return { user, response, data: await response.json() };
}));
for (const { user, response, data } of results) {
  check(data.authorization === `Bearer ${user}`, "Concurrent proxy requests must keep each user's Authorization separate");
  check(response.headers.get("cache-control")?.includes("no-store"), "Authenticated response must not be cached");
}
check(observedSignals.every((signal) => signal instanceof AbortSignal), "Every backend request must have bounded/cancelable lifetime");

for (const status of [401, 403, 409, 429, 503]) {
  behavior = async () => Response.json({ mensaje: `Synthetic ${status}` }, { status });
  const response = await backend.proxyBackend({ request: new Request("http://localhost/api/me"), path: "/api/me", method: "GET" });
  check(response.status === status, `Backend HTTP ${status} must not be converted to fake success`);
}

behavior = async () => new Response("<html>Unexpected upstream page</html>", { status: 200 });
const wrongFormat = await backend.proxyBackend({ request: new Request("http://localhost/api/me"), path: "/api/me", method: "GET" });
check(wrongFormat.status === 502, "An invalid HTTP 200 body must not become fake empty progress");

const avatarMethods = [], avatarSignals = [];
behavior = async (_url, init) => {
  avatarMethods.push(init.method);
  avatarSignals.push(init.signal);
  return Response.json({ ok: true }, { status: init.method === "PUT" ? 405 : 200 });
};
const avatar = await backend.proxyBackendAvatar(new Request("http://localhost/api/avatar", {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic-avatar" },
  body: JSON.stringify({ avatar: "robot" }),
}), "POST");
check(avatar.status === 200 && avatarMethods.join(",") === "PUT,POST", "Avatar compatibility fallback must preserve supported methods");
check(avatarSignals[0] === avatarSignals[1], "Avatar retries must share one timeout budget");

behavior = async () => new Response(new ReadableStream({ start(controller) { controller.error(new Error("Synthetic interrupted response body")); } }));
const brokenBody = await backend.proxyBackend({ request: new Request("http://localhost/api/me"), path: "/api/me", method: "GET" });
check(brokenBody.status === 502, "Interrupted backend response bodies must become an explicit retryable error");

behavior = async (_url, init) => {
  if (init.signal.aborted) throw init.signal.reason;
  return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
};
const controller = new AbortController();
const canceledRequest = backend.proxyBackend({ request: new Request("http://localhost/api/me", { signal: controller.signal }), path: "/api/me", method: "GET" });
controller.abort();
const canceledResponse = await canceledRequest;
check(canceledResponse.status === 502, "Client cancellation must terminate the backend request, not leave it pending");

let requestedTimeout;
const timeoutBackend = await loadModule("../src/lib/backend.ts", {
  AbortSignal: {
    any: AbortSignal.any.bind(AbortSignal),
    timeout: (milliseconds) => { requestedTimeout = milliseconds; return AbortSignal.timeout(20); },
  },
  fetch: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true })),
}, { "server-only": {}, "next/server": { NextResponse: { json: Response.json } } });
const timeoutStart = performance.now();
const keepTestAlive = setTimeout(() => {}, 500);
const timeoutResponse = await timeoutBackend.proxyBackend({ request: new Request("http://localhost/api/me"), path: "/api/me", method: "GET" });
clearTimeout(keepTestAlive);
check(timeoutResponse.status === 502 && performance.now() - timeoutStart < 500, "A stalled server must terminate with a retryable error");
check(requestedTimeout === 85_000, "Server timeout must end before the client waits 90 seconds");

const jsx = (type, props) => ({ type, props });
for (const [directory, role, wrongRole] of [
  ["administrador", "ADMINISTRADOR", "ESTUDIANTE"],
  ["docente", "DOCENTE", "ESTUDIANTE"],
  ["estudiante", "ESTUDIANTE", "DOCENTE"],
]) {
  for (const isAllowed of [false, true]) {
    let stateIndex = 0;
    const current = { id: 202, rol: isAllowed ? role : wrongRole, nombre: "Synthetic current user" };
    const previous = { id: 101, rol: role, nombre: "Synthetic previous user" };
    const layout = await loadModule(`../src/app/${directory}/layout.tsx`, {}, {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "react": {
        useEffect: () => {},
        useState: (initial) => [stateIndex++ === 0 ? previous : initial, () => {}],
      },
      "next/navigation": { useRouter: () => ({ replace: () => {} }) },
      "next/link": { default: "Link" },
      "@/components/app-shell": { AppShell: "AppShell" },
      "@/lib/client-api": { apiRequest: () => Promise.resolve(current), ApiRequestError: Error },
      "@/lib/use-auth-session": {
        useAuthSession: () => ({ hydrated: true, token: "synthetic-current", usuario: current }),
        saveAuthUser: () => {}, clearAuthSession: () => {},
      },
      "lucide-react": { ShieldCheck: "ShieldCheck", UserCog: "UserCog" },
    });
    const rendered = layout.default({ children: "SYNTHETIC_PROTECTED_CONTENT" });
    check(JSON.stringify(rendered).includes("SYNTHETIC_PROTECTED_CONTENT") === isAllowed,
      `${directory} must use the current role, not stale profile permissions`);
  }
}

for (const resource of ["usuarios", "niveles"]) {
  let forwarded = 0;
  const route = await loadModule(`../src/app/api/${resource}/[id]/route.ts`, {}, {
    "next/server": { NextResponse: { json: Response.json } },
    "@/lib/backend": { proxyBackend: async ({ path }) => { forwarded++; return Response.json({ path }); } },
  });
  for (const method of Object.keys(route)) {
    const invalid = await route[method](new Request("http://localhost/api/test"), { params: Promise.resolve({ id: "../me?alterar=1" }) });
    check(invalid.status === 400, `${resource}/${method} must reject malformed IDs before proxying`);
    const valid = await route[method](new Request("http://localhost/api/test"), { params: Promise.resolve({ id: "27" }) });
    check((await valid.json()).path === `/api/${resource}/27`, `${resource}/${method} preserves valid route IDs`);
  }
  check(forwarded === Object.keys(route).length, "Invalid IDs must never generate a backend request");
}

for (const pagePath of [
  "docente/page.tsx", "docente/estudiantes/page.tsx", "docente/reportes/page.tsx",
  "administrador/page.tsx", "administrador/usuarios/page.tsx", "administrador/niveles/page.tsx",
  "estudiante/ranking/page.tsx",
]) {
  const states = [], effects = [], refreshers = [];
  let cursor = 0, failing = false;
  const students = [{ id: 1, rol: "ESTUDIANTE", nombre: "A", correo: "a@example.test", puntaje: 80 }, { id: 2, rol: "ESTUDIANTE", nombre: "B", correo: "b@example.test", puntaje: 95 }];
  const reports = [{ id: 1, usuarioId: 1, nivel: 1, completado: true, dominio: 80, generadoPorIa: true }];
  const route = [{ id: 1, nivel: 1, activo: true, nombre: "Clases" }];
  const ranking = { estudiantes: [], total: 0 };
  const react = {
    useEffect: (callback, dependencies) => effects.push({ callback, dependencies }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useMemo: (callback) => callback(),
    useRef: (initial) => ({ current: initial }),
  };
  const imports = {
    "react/jsx-runtime": { jsx, jsxs: jsx }, "react": react,
    "@/lib/use-auth-session": { useAuthSession: () => ({ hydrated: true, token: "synthetic-current", usuario: { id: 77, rol: "ADMINISTRADOR" } }) },
    "@/lib/client-api": { apiRequest: async (path) => {
      if (failing) throw new Error("Synthetic offline");
      if (path === "/api/usuarios") return students;
      if (path.startsWith("/api/reportes")) return reports;
      if (path === "/api/niveles") return route;
      if (path === "/api/ranking") return ranking;
      if (path.startsWith("/api/progreso")) return { usuarioId: 2, puntajeTotal: 95, niveles: [] };
      throw new Error(`Unexpected API path: ${path}`);
    } },
    "@/lib/visible-refresh": { startVisibleRefresh: (refresh, interval) => {
      const record = { refresh, interval, stopped: false };
      refreshers.push(record);
      return () => { record.stopped = true; };
    } },
    "framer-motion": { motion: new Proxy({}, { get: (_, name) => `motion.${String(name)}` }), useReducedMotion: () => true, AnimatePresence: "AnimatePresence" },
    "lucide-react": new Proxy({}, { get: (_, name) => String(name) }),
    "next/link": { default: "Link" },
    "@/components/avatar-display": { AvatarDisplay: "AvatarDisplay" },
    "@/components/reveal": { EASE_OUT: "easeOut", Reveal: "Reveal", Swap: "Swap" },
    "@/components/ui": new Proxy({}, { get: (_, name) => String(name) }),
  };
  const page = await loadModule(`../src/app/${pagePath}`, {}, imports);
  function render() { cursor = 0; effects.length = 0; return page.default(); }
  render();
  const cleanups = effects.map((effect) => effect.callback()).filter(Boolean);
  check(refreshers.length === 1 && refreshers[0].interval === 30_000, `${pagePath} must poll only every 30 seconds while visible`);
  await refreshers[0].refresh();
  if (pagePath === "docente/estudiantes/page.tsx") {
    states[2] = students[1];
    await refreshers[0].refresh();
    check(states[2].id === 2, "Refreshing the teacher's list must preserve the selected student");
    render();
    const selectedEffect = effects.find((effect) => effect.dependencies?.[0] === 2);
    check(Boolean(selectedEffect), "Selected progress must depend on the student ID, not the changing student object");
    cleanups.push(selectedEffect.callback());
    await refreshers[1].refresh();
    check(states[3].usuarioId === 2, "Selected student's progress loads independently");
  }
  if (pagePath === "administrador/usuarios/page.tsx") {
    states[7] = { id: 2, nombre: "Unsaved synthetic draft" };
    await refreshers[0].refresh();
    check(states[7].nombre === "Unsaved synthetic draft", "Admin auto-refresh must not replace an unsaved user form");
  }
  if (pagePath === "administrador/niveles/page.tsx") {
    states[3] = { id: 1, nombre: "Unsaved synthetic level" };
    await refreshers[0].refresh();
    check(states[3].nombre === "Unsaved synthetic level", "Admin auto-refresh must not replace an unsaved level form");
  }
  const previousData = states[0];
  failing = true;
  await refreshers[0].refresh();
  check(states[0] === previousData, `${pagePath} must preserve last confirmed data while offline`);
  cleanups.forEach((cleanup) => cleanup());
  check(refreshers.every((record) => record.stopped), `${pagePath} must stop refreshers during cleanup`);
}

console.log(`PASS: ${checks} API checks, including 100 concurrent synthetic users, stale-session isolation, HTTP errors and cancellation. No production server or accounts used.`);
