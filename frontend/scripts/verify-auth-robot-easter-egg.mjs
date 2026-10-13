import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const SESSION = "algolab.auth-robot.easter-egg.session.v1";
const ACTIVE = "algolab.auth-robot.easter-egg.active.v1";
const moduleUrl = new URL("../src/lib/auth-robot-easter-egg.ts", import.meta.url);
const originalWindow = globalThis.window;
let instance = 0;
after(() => { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });

function storage(initial = {}, blocked = false) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem(key) { if (blocked) throw new Error("storage denied"); return items.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error("storage denied"); items.set(key, String(value)); },
    removeItem(key) { if (blocked) throw new Error("storage denied"); items.delete(key); },
  };
}
function random(values = [900]) {
  let calls = 0;
  return {
    get calls() { return calls; },
    getRandomValues(target) { target[0] = values[Math.min(calls++, values.length - 1)]; return target; },
  };
}
function browser({ session = storage(), local = storage(), crypto = random() } = {}) {
  const events = new EventTarget();
  const value = { sessionStorage: session, localStorage: local, crypto,
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events) };
  globalThis.window = value;
  return value;
}
async function fresh() { return import(`${moduleUrl.href}?case=${++instance}`); }
function storageEvent(target, key, newValue) {
  const event = new Event("storage"); Object.assign(event, { key, newValue }); target.dispatchEvent(event);
}
async function hookModule(url) {
  // Test the actual auth helpers without mounting React or a browser bundle.
  const original = await readFile(new URL("../src/lib/use-auth-session.ts", import.meta.url), "utf8");
  const source = stripTypeScriptTypes(original)
    .replace(/import \{ useMemo, useSyncExternalStore \} from "react";/, "const useMemo = (fn) => fn(); const useSyncExternalStore = () => null;")
    .replace('"@/lib/auth-robot-easter-egg"', JSON.stringify(url));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

test("exactly 333 of all 100000 uniformly spaced tickets win", async () => {
  const api = await fresh(); let wins = 0;
  for (let ticket = 0; ticket < 100000; ticket++) wins += Number(api.drawAuthEasterEgg(random([ticket])));
  assert.equal(wins, 333);
  assert.equal(api.drawAuthEasterEgg(random([0])), true);
  assert.equal(api.drawAuthEasterEgg(random([332])), true);
  assert.equal(api.drawAuthEasterEgg(random([333])), false);
  assert.equal(api.drawAuthEasterEgg(random([99999])), false);
});

test("rejection sampling ignores the biased Uint32 tail and handles broken sources", async () => {
  const api = await fresh(); const source = random([4294900000, 4294967295, 332]);
  assert.equal(api.drawAuthEasterEgg(source), true); assert.equal(source.calls, 3);
  const boundary = random([4294899999]); assert.equal(api.drawAuthEasterEgg(boundary), false); assert.equal(boundary.calls, 1);
  const broken = random([4294967295]); assert.equal(api.drawAuthEasterEgg(broken), false); assert.equal(broken.calls, 32);
});

test("server snapshot and initialization have no browser side effects", async () => {
  delete globalThis.window; const api = await fresh(); api.initializeAuthEasterEgg(); api.finishAuthEasterEgg(); api.completeAuthEasterEgg();
  assert.equal(api.getServerAuthEasterEggSnapshot(), false); assert.equal(api.getAuthEasterEggSnapshot(), false);
  const unsubscribe = api.subscribeAuthEasterEgg(() => {}); unsubscribe();
});

test("losing session draws only once across remounts, landing returns and reloads", async () => {
  const page = browser({ crypto: random([333, 0]) }); const api = await fresh();
  api.initializeAuthEasterEgg(); for (let index = 0; index < 20; index++) api.initializeAuthEasterEgg();
  assert.equal(page.crypto.calls, 1); assert.equal(api.getAuthEasterEggSnapshot(), false); assert.equal(page.sessionStorage.getItem(SESSION), "drawn");
  const reloaded = await fresh(); reloaded.initializeAuthEasterEgg(); assert.equal(page.crypto.calls, 1); assert.equal(reloaded.getAuthEasterEggSnapshot(), false);
});

test("winning event remains active through landing subscriptions and page reload", async () => {
  const page = browser({ crypto: random([332]) }); const api = await fresh(); let notifications = 0;
  const unsubscribe = api.subscribeAuthEasterEgg(() => notifications++); api.initializeAuthEasterEgg();
  assert.equal(api.getAuthEasterEggSnapshot(), true); assert.equal(notifications, 1); assert.equal(page.localStorage.getItem(ACTIVE), "active");
  unsubscribe(); assert.equal(api.getAuthEasterEggSnapshot(), true);
  const subscribeAgain = api.subscribeAuthEasterEgg(() => notifications++); api.initializeAuthEasterEgg(); assert.equal(page.crypto.calls, 1); subscribeAgain();
  const reloaded = await fresh(); reloaded.initializeAuthEasterEgg(); assert.equal(reloaded.getAuthEasterEggSnapshot(), true); assert.equal(page.crypto.calls, 1);
});

test("active latch survives a new browser session without drawing again", async () => {
  const page = browser({ local: storage({ [ACTIVE]: "active" }) }); const api = await fresh(); api.initializeAuthEasterEgg();
  assert.equal(api.getAuthEasterEggSnapshot(), true); assert.equal(page.crypto.calls, 0); assert.equal(page.sessionStorage.getItem(SESSION), "drawn");
});

test("completed authentication removes latch and disallows a redraw this session", async () => {
  const page = browser({ crypto: random([0]) }); const api = await fresh(); api.initializeAuthEasterEgg(); api.completeAuthEasterEgg();
  assert.equal(api.getAuthEasterEggSnapshot(), false); assert.equal(page.localStorage.getItem(ACTIVE), null); assert.equal(page.sessionStorage.getItem(SESSION), "completed");
  api.initializeAuthEasterEgg(); const reloaded = await fresh(); reloaded.initializeAuthEasterEgg(); assert.equal(page.crypto.calls, 1); assert.equal(reloaded.getAuthEasterEggSnapshot(), false);
});

test("finished scare clears the latch without authentication and remains normal across remounts and reload", async () => {
  const page = browser({ crypto: random([0]) }); const api = await fresh(); let notifications = 0;
  const stop = api.subscribeAuthEasterEgg(() => notifications++);
  api.initializeAuthEasterEgg(); assert.equal(notifications, 1); assert.equal(api.getAuthEasterEggSnapshot(), true);
  api.finishAuthEasterEgg();
  assert.equal(notifications, 2); assert.equal(api.getAuthEasterEggSnapshot(), false);
  assert.equal(page.localStorage.getItem(ACTIVE), null); assert.equal(page.sessionStorage.getItem(SESSION), "completed");
  assert.equal(page.localStorage.getItem("token"), null, "finishing a cosmetic scene never creates an authenticated session");
  api.finishAuthEasterEgg(); api.completeAuthEasterEgg(); api.initializeAuthEasterEgg();
  assert.equal(notifications, 2, "duplicate completion does not emit a second scene reset");
  stop();
  const reloaded = await fresh(); reloaded.initializeAuthEasterEgg();
  assert.equal(reloaded.getAuthEasterEggSnapshot(), false); assert.equal(page.crypto.calls, 1);
});

test("finishing before initialization suppresses the draw for the rest of the session", async () => {
  const page = browser({ crypto: random([0]) }); const api = await fresh();
  api.finishAuthEasterEgg(); api.initializeAuthEasterEgg();
  assert.equal(page.crypto.calls, 0); assert.equal(api.getAuthEasterEggSnapshot(), false);
  assert.equal(page.sessionStorage.getItem(SESSION), "completed");
});

test("new session after scene completion is eligible for one new draw", async () => {
  const local = storage(); browser({ local, crypto: random([0]) }); const first = await fresh(); first.initializeAuthEasterEgg(); first.completeAuthEasterEgg();
  const page = browser({ local, session: storage(), crypto: random([332]) }); const next = await fresh(); next.initializeAuthEasterEgg();
  assert.equal(next.getAuthEasterEggSnapshot(), true); assert.equal(page.crypto.calls, 1);
});

test("another tab login or finished scare clears the event; token/profile/logout events do not", async () => {
  const page = browser({ local: storage({ [ACTIVE]: "active" }) }); const api = await fresh(); api.initializeAuthEasterEgg();
  let changed = 0; const stop = api.subscribeAuthEasterEgg(() => changed++);
  storageEvent(page, "token", null); storageEvent(page, "usuario", null); assert.equal(api.getAuthEasterEggSnapshot(), true);
  storageEvent(page, ACTIVE, null); assert.equal(api.getAuthEasterEggSnapshot(), false); assert.equal(changed, 1); assert.equal(page.sessionStorage.getItem(SESSION), "completed");
  stop(); storageEvent(page, ACTIVE, "active"); assert.equal(api.getAuthEasterEggSnapshot(), false);
});

test("another tab activation notifies subscribers without random draw", async () => {
  const page = browser(); const api = await fresh(); api.initializeAuthEasterEgg(); let changed = 0;
  const stop = api.subscribeAuthEasterEgg(() => changed++); storageEvent(page, ACTIVE, "active");
  assert.equal(api.getAuthEasterEggSnapshot(), true); assert.equal(changed, 1); assert.equal(page.crypto.calls, 1); stop();
});

test("blocked storage preserves in-memory once-only behavior and cannot break completion", async () => {
  const page = browser({ session: storage({}, true), local: storage({}, true), crypto: random([0]) }); const api = await fresh();
  assert.doesNotThrow(() => api.initializeAuthEasterEgg()); assert.equal(api.getAuthEasterEggSnapshot(), true);
  api.initializeAuthEasterEgg(); assert.equal(page.crypto.calls, 1); assert.doesNotThrow(() => api.completeAuthEasterEgg()); assert.equal(api.getAuthEasterEggSnapshot(), false);
});

test("blocked storage cannot prevent the finished scare from returning to normal in memory", async () => {
  const page = browser({ session: storage({}, true), local: storage({}, true), crypto: random([0]) }); const api = await fresh();
  api.initializeAuthEasterEgg(); assert.equal(api.getAuthEasterEggSnapshot(), true);
  assert.doesNotThrow(() => api.finishAuthEasterEgg()); assert.equal(api.getAuthEasterEggSnapshot(), false);
  api.initializeAuthEasterEgg(); assert.equal(page.crypto.calls, 1);
});

test("storage accessors and absent crypto may throw without breaking authentication helpers", async () => {
  const page = browser(); for (const property of ["localStorage", "sessionStorage", "crypto"]) Object.defineProperty(page, property, { get() { throw new Error("denied"); } });
  const api = await fresh(); assert.doesNotThrow(() => api.initializeAuthEasterEgg()); assert.equal(api.getAuthEasterEggSnapshot(), false); assert.doesNotThrow(() => api.finishAuthEasterEgg()); assert.doesNotThrow(() => api.completeAuthEasterEgg());
});

test("completed session suppresses a stale latch if its earlier removal was denied", async () => {
  browser({ session: storage({ [SESSION]: "completed" }), local: storage({ [ACTIVE]: "active" }, true) });
  const api = await fresh(); api.initializeAuthEasterEgg(); assert.equal(api.getAuthEasterEggSnapshot(), false);
});

test("among auth operations only saveAuthSession clears the event; profile edits, token refresh and logout do not", async () => {
  const page = browser({ crypto: random([0]) }); const api = await fresh(); api.initializeAuthEasterEgg();
  const auth = await hookModule(`${moduleUrl.href}?case=${instance}`);
  const user = { id: 1, nombre: "Prueba", correo: "prueba@example.invalid", rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0 };
  auth.saveAuthUser(user); assert.equal(api.getAuthEasterEggSnapshot(), true);
  auth.saveAuthToken("refreshed"); assert.equal(api.getAuthEasterEggSnapshot(), true);
  auth.clearAuthSession(); assert.equal(api.getAuthEasterEggSnapshot(), true);
  auth.saveAuthSession("validated-token", user); assert.equal(api.getAuthEasterEggSnapshot(), false);
  assert.equal(page.localStorage.getItem("token"), "validated-token"); assert.deepEqual(JSON.parse(page.localStorage.getItem("usuario")), user);
});

test("new cosmetic storage failures do not break saving validated credentials", async () => {
  const local = storage(); const originalSet = local.setItem;
  local.setItem = (key, value) => { if (key === ACTIVE) throw new Error("cosmetic storage denied"); originalSet(key, value); };
  local.removeItem = (key) => { if (key === ACTIVE) throw new Error("cosmetic removal denied"); local.items.delete(key); };
  browser({ session: storage({}, true), local, crypto: random([0]) }); const api = await fresh(); api.initializeAuthEasterEgg();
  const auth = await hookModule(`${moduleUrl.href}?case=${instance}`);
  assert.doesNotThrow(() => auth.saveAuthSession("valid", { id: 1 })); assert.equal(api.getAuthEasterEggSnapshot(), false); assert.equal(local.getItem("token"), "valid");
});
