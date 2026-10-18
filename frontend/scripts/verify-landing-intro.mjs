import assert from "node:assert/strict";
import { test } from "node:test";
import { INTRO_PREFERENCE_KEY, INTRO_SEEN_KEY, readIntroState, shouldShowIntro } from "../src/lib/landing-intro.ts";

test("first visit is device-local, independent of login, and survives a film update", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null };
  const fresh = readIntroState(storage);
  assert.equal(shouldShowIntro({ ...fresh, reducedMotion: false }), true);
  values.set(INTRO_SEEN_KEY, "1");
  assert.equal(shouldShowIntro({ ...readIntroState(storage), reducedMotion: false }), false);
  values.set("token", "another-account");
  assert.equal(shouldShowIntro({ ...readIntroState(storage), reducedMotion: false }), false);
  assert.equal(INTRO_SEEN_KEY, "algolab:intro:seen");
});

test("always / never / preview preserve reduced-motion and data preferences", () => {
  const state = { preference: "always", seen: true, reducedMotion: false };
  assert.equal(shouldShowIntro(state), true);
  assert.equal(shouldShowIntro({ ...state, preference: "never" }), false);
  assert.equal(shouldShowIntro({ ...state, preference: "never", preview: true }), true);
  assert.equal(shouldShowIntro({ ...state, reducedMotion: true, preview: true }), false);
  assert.equal(shouldShowIntro({ ...state, saveData: true }), false);
  assert.equal(shouldShowIntro({ ...state, saveData: true, preview: true }), true);
});

test("invalid or inaccessible storage cannot trap the visitor in the intro", () => {
  const invalid = readIntroState({ getItem: () => "invalid" });
  assert.equal(invalid.preference, "once");
  const denied = readIntroState({ getItem() { throw new Error("SecurityError"); } });
  assert.equal(denied.available, false);
  assert.equal(shouldShowIntro({ ...denied, reducedMotion: false }), false);
  assert.equal(readIntroState({ getItem: key => key === INTRO_PREFERENCE_KEY ? "never" : "1" }).preference, "never");
});
