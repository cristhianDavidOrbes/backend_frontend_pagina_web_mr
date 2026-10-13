import assert from "node:assert/strict";
import { test } from "node:test";
import { INITIAL_ROBOT_RENDERER, ROBOT_RENDERER_RETRY_DELAYS, robotRendererReducer as reduce } from "../src/lib/robot-renderer-recovery.ts";

const loading = () => reduce(INITIAL_ROBOT_RENDERER, { type: "initialize", reason: null });
const fail = (state, reason = "model") => reduce(state, { type: "failed", attempt: state.attempt, reason });
const retry = (state, resetBudget = false) => reduce(state, { type: "retry", attempt: state.attempt, resetBudget });

test("a supported browser starts loading 3D", () => {
  assert.deepEqual(loading(), { mode: "loading", attempt: 0, failures: 0, reason: null });
});

test("unsupported WebGL and data saving have an explicit fallback", () => {
  for (const reason of ["unsupported", "save-data"]) {
    const state = reduce(INITIAL_ROBOT_RENDERER, { type: "initialize", reason });
    assert.equal(state.mode, "fallback");
    assert.equal(state.reason, reason);
    assert.equal(state.failures, 0);
  }
});

test("late initialization cannot overwrite a loaded or failed renderer", () => {
  for (const state of [loading(), fail(loading())]) {
    assert.strictEqual(reduce(state, { type: "initialize", reason: null }), state);
  }
});

test("a failure is counted only once for each canvas", () => {
  const state = fail(loading());
  assert.equal(state.failures, 1);
  assert.strictEqual(fail(state, "context"), state);
});

test("a failed canvas cannot revive itself with a late onReady", () => {
  const state = fail(loading());
  assert.strictEqual(reduce(state, { type: "ready", attempt: 0 }), state);
});

test("automatic recovery is bounded and uses increasing delays", () => {
  let state = fail(loading());
  for (const delay of [1500, 5000, 15000]) {
    assert.equal(ROBOT_RENDERER_RETRY_DELAYS[state.failures - 1], delay);
    state = fail(retry(state));
  }
  assert.equal(state.attempt, 3);
  assert.equal(state.failures, 4);
  assert.equal(ROBOT_RENDERER_RETRY_DELAYS[state.failures - 1], undefined);
});

test("all callbacks from an old canvas are ignored after recovery", () => {
  const state = retry(fail(loading()));
  for (const action of [
    { type: "failed", reason: "context" },
    { type: "failed", reason: "model" },
    { type: "ready" },
    { type: "retry", resetBudget: true },
    { type: "unsupported" },
    { type: "stable" },
  ]) assert.strictEqual(reduce(state, { ...action, attempt: 0 }), state);
});

test("a recovered model becomes ready but does not immediately reset the budget", () => {
  const state = retry(fail(loading()));
  const ready = reduce(state, { type: "ready", attempt: 1 });
  assert.equal(ready.mode, "ready");
  assert.equal(ready.reason, null);
  assert.equal(ready.failures, 1);
  assert.equal(fail(ready, "context").failures, 2);
});

test("explicit navigation recovery starts a fresh bounded budget", () => {
  const state = { mode: "fallback", attempt: 3, failures: 4, reason: "model" };
  assert.deepEqual(retry(state, true), { mode: "loading", attempt: 4, failures: 0, reason: null });
});

test("healthy or already loading canvases are never remounted by recovery", () => {
  const state = loading();
  const ready = reduce(state, { type: "ready", attempt: 0 });
  assert.strictEqual(retry(state, true), state);
  assert.strictEqual(retry(ready, true), ready);
});

test("a stable renderer can recover its retry budget without a canvas remount", () => {
  const state = reduce(retry(fail(loading())), { type: "ready", attempt: 1 });
  const stable = reduce(state, { type: "stable", attempt: 1 });
  assert.equal(stable.failures, 0);
  assert.equal(stable.attempt, state.attempt);
  assert.equal(stable.mode, "ready");
  const failed = fail(stable);
  assert.strictEqual(reduce(failed, { type: "stable", attempt: 1 }), failed);
});

test("failed capability probes suspend automatic GPU retries", () => {
  const state = reduce(fail(loading()), { type: "unsupported", attempt: 0 });
  assert.equal(state.reason, "unsupported");
  assert.equal(state.mode, "fallback");
  assert.equal(retry(state, true).mode, "loading");
});
