import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { robotGpuBudget } from "../src/lib/robot-gpu-budget.ts";
import { introPreloadScript } from "../src/lib/intro-preload.ts";

test("shared robots cap GPU cost without removing 3D or pointer interaction", () => {
  for (const hints of [{ memory: 2 }, { cores: 4 }, { memory: 4, coarse: true }]) {
    const budget = robotGpuBudget(hints);
    assert.equal(budget.dpr[1], 1);
    assert.equal(budget.antialias, false);
    assert.equal(budget.shadowResolution, 128);
  }
  assert.equal(robotGpuBudget({ coarse: true, memory: 8, cores: 8 }).dpr[1], 1.25);
  assert.equal(robotGpuBudget().dpr[1], 1.6);
  assert.equal(robotGpuBudget({ memory: NaN, cores: Infinity }).shadowResolution, 512);
});

test("parser bootstrap starts one iframe, authenticates readiness and releases ownership", () => {
  const listeners = new Map(), links = [], attributes = new Map();
  const frame = { contentWindow: {}, parentElement: { setAttribute: (k, v) => attributes.set(k, v), removeAttribute: k => attributes.delete(k) } };
  let present = false, assigned = 0, observe, disconnected = false;
  Object.defineProperty(frame, "src", { set(value) { assert.equal(value, "/intro-scene/index.html?v=test"); assigned++; } });
  const sandbox = {
    location: { pathname: "/", search: "", origin: "https://algolab.test" }, URLSearchParams,
    matchMedia: () => ({ matches: false }), navigator: {}, localStorage: { getItem: () => null },
    setTimeout: () => 1, clearTimeout: () => {},
    MutationObserver: class { constructor(callback) { observe = callback; } observe() {} disconnect() { disconnected = true; } },
    document: { documentElement: {}, querySelector: selector => selector === "iframe[data-intro-scene]" ? present && frame : false, createElement: () => ({ dataset: {} }), head: { appendChild: e => links.push(e) } },
    window: { addEventListener: (k, v) => listeners.set(k, v), removeEventListener: k => listeners.delete(k) },
  };
  const assets = { modulePreloads: ["/film.js"], model: "/robot.glb", landscape: "/landscape.jpg", brand: "/brand.png", scene: "/intro-scene/index.html?v=test" };
  vm.runInNewContext(introPreloadScript(assets), sandbox);
  assert.equal(assigned, 0, "wait until parser creates the existing React-owned iframe");
  present = true; observe();
  assert.equal(assigned, 1); assert.equal(disconnected, true);
  assert.equal(attributes.has("data-playing"), true);
  const boot = sandbox.window.__algolabIntroBoot;
  listeners.get("message")({ origin: "https://evil.test", source: frame.contentWindow, data: { type: "algolab:ready" } });
  assert.equal(boot.ready, undefined);
  listeners.get("message")({ origin: sandbox.location.origin, source: {}, data: { type: "algolab:ready" } });
  assert.equal(boot.ready, undefined);
  listeners.get("message")({ origin: sandbox.location.origin, source: frame.contentWindow, data: { type: "algolab:ready" } });
  assert.equal(boot.ready.type, "algolab:ready");
  boot.release();
  assert.equal(sandbox.window.__algolabIntroBoot, undefined);
  assert.equal(listeners.size, 0);
});

test("early preload uses the same once / never / preview / accessibility policy", () => {
  const assets = { modulePreloads: ["/intro-scene/runtime/film-TEST.js"], model: "/robot.glb", brand: "/brand.png", landscape: "/landscape.jpg" };
  for (const [label, preference, seen, preview, reduced, saveData, count] of [
    ["new", null, null, false, false, false, 4],
    ["seen", null, "1", false, false, false, 0],
    ["always", "always", "1", false, false, false, 4],
    ["never", "never", null, false, false, false, 0],
    ["preview", "never", "1", true, false, true, 4],
    ["reduced", "always", null, true, true, false, 0],
    ["data-saving", "always", null, false, false, true, 0],
  ]) {
    const links = [];
    const sandbox = { location: { pathname: "/", search: preview ? "?intro=preview" : "" }, URLSearchParams,
      matchMedia: () => ({ matches: reduced }), navigator: { connection: { saveData } },
      localStorage: { getItem: key => key === "algolab:intro:preference" ? preference : seen },
      document: { querySelector: () => false, createElement: () => ({ dataset: {} }), head: { appendChild: element => links.push(element) } } };
    vm.runInNewContext(introPreloadScript(assets), sandbox);
    assert.equal(links.length, count, label);
    for (const link of links.filter(link => link.as !== "image")) {
      assert.equal(link.crossOrigin, "anonymous");
      assert.equal(link.fetchPriority, "high");
    }
    sandbox.location.pathname = "/iniciar-sesion";links.length = 0;
    vm.runInNewContext(introPreloadScript(assets), sandbox);
    assert.equal(links.length, 0, "other routes must not download intro assets");
  }
});
