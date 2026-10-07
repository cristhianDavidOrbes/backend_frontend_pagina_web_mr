import assert from "node:assert/strict";
import { startVisibleRefresh } from "../src/lib/visible-refresh.ts";

const originalNow = Date.now;
const originalTimeout = globalThis.setTimeout;
const originalClear = globalThis.clearTimeout;
const timers = new Map();
let now = 10_000, timerId = 0, requests = 0;
globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
document.visibilityState = "visible";
Date.now = () => now;
globalThis.setTimeout = (callback, delay) => {
  timers.set(++timerId, { callback, due: now + delay });
  return timerId;
};
globalThis.clearTimeout = (id) => timers.delete(id);
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
async function advance(ms) {
  now += ms;
  for (const [id, timer] of [...timers]) if (timer.due <= now) {
    timers.delete(id); timer.callback();
  }
  await settle();
}
try {
  let finish;
  const stop = startVisibleRefresh(() => {
    requests++;
    return new Promise(resolve => { finish = resolve; });
  });
  assert.equal(requests, 1);
  window.dispatchEvent(new Event("focus"));
  window.dispatchEvent(new Event("online"));
  await advance(20_000);
  assert.equal(requests, 1, "Concurrent requests never overlap");
  finish(); await settle();
  await advance(15_000);
  assert.equal(requests, 2, "Visible page refreshes without navigation");
  finish(); await settle();
  document.visibilityState = "hidden";
  await advance(15_000);
  assert.equal(requests, 2, "Background tabs do not poll");
  document.visibilityState = "visible";
  document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(requests, 3, "Returning to the page refreshes saved progress");
  finish(); await settle();
  stop();
  window.dispatchEvent(new Event("online"));
  await advance(60_000);
  assert.equal(requests, 3, "Cleanup cancels polling and removes listeners");
  let failures = 0;
  const stopFailure = startVisibleRefresh(async () => { failures++; throw new Error("Offline simulation"); });
  await settle(); await advance(15_000);
  assert.equal(failures, 2, "Network failure does not permanently stop refresh");
  stopFailure();
  console.log("PASS: visible refresh, no overlap, background pause, resume, cleanup and retry after failure");
} finally {
  Date.now = originalNow;
  globalThis.setTimeout = originalTimeout;
  globalThis.clearTimeout = originalClear;
  delete globalThis.window;
  delete globalThis.document;
}
