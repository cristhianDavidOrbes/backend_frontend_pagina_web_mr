import assert from "node:assert/strict";
import test from "node:test";
import { AuthRobotMotion, AUTH_ROBOT_SCENES } from "../src/lib/auth-robot-motion.ts";

const desktop = { home: { x: 720, y: 246 }, left: 490, right: 950, top: 220, bottom: 690, width: 1440, height: 1000 };
const mobile = { home: { x: 195, y: 246 }, left: 16, right: 374, top: 220, bottom: 670, width: 390, height: 940 };
const timestep = 1 / 60;
function create(geometry = desktop) { const motion = new AuthRobotMotion(); motion.setGeometry(structuredClone(geometry)); return motion; }
function assertFinite(frame) {
  for (const field of ["x", "y", "rotation"]) assert.ok(Number.isFinite(frame[field]), `${field} remains finite`);
  assert.ok([-1, 1].includes(frame.facing));
  assert.ok(["front", "behind"].includes(frame.layer));
  assert.ok(Number.isInteger(frame.picture));
}
function assertHome(motion) {
  assert.equal(motion.frame.pose, "sit");
  assert.equal(motion.frame.x, motion.geometry.home.x);
  assert.equal(motion.frame.y, motion.geometry.home.y);
  assert.equal(motion.frame.layer, "front");
  assert.equal(motion.frame.vehicle, null);
  assert.equal(motion.frame.carried, null);
  assert.equal(motion.frame.effect, null);
  assert.equal(motion.frame.rotation, 0);
}
function advance(motion, seconds, allowIdle = false) {
  for (let elapsed = 0; elapsed < seconds; elapsed += timestep) { motion.tick(timestep, allowIdle); assertFinite(motion.frame); }
}
function finish(motion, seconds = 24) {
  const frames = [{ ...motion.frame }];
  for (let elapsed = 0; elapsed < seconds && motion.frame.pose !== "sit"; elapsed += timestep) {
    motion.tick(timestep, false); assertFinite(motion.frame); frames.push({ ...motion.frame });
  }
  assertHome(motion);
  return frames;
}
function release(motion, point, edge) { motion.grab(); motion.drag(point); motion.drop(edge); }
function assertCentralEntry(frames, geometry) {
  const climbs = frames.filter(frame => frame.pose === "climb");
  assert.ok(climbs.length);
  for (const frame of climbs) { assert.equal(frame.x, geometry.home.x); assert.equal(frame.layer, "behind"); }
  assert.ok(frames.some(frame => frame.pose === "climb" && frame.y > geometry.bottom));
}
function assertSafeScenery(motion) {
  for (const item of motion.scenery) {
    const g = motion.geometry;
    assert.ok(item.x - item.size / 2 >= 0 && item.x + item.size / 2 <= g.width);
    assert.ok(item.y - item.size >= 0 && item.y <= g.height);
    const outside = item.x + item.size / 2 < g.left || item.x - item.size / 2 > g.right || item.y - item.size > g.bottom + 75;
    assert.ok(outside, `${item.kind} stays clear of form and footer`);
  }
}

test("unregistered or malformed geometry cannot corrupt the choreography", () => {
  const motion = new AuthRobotMotion(); const before = { ...motion.frame };
  motion.grab(); motion.drag({ x: 100, y: 100 }); motion.drop(); motion.returnHome(); motion.startActivity(); motion.tick(1e9); motion.home();
  motion.setGeometry({ ...desktop, width: NaN });
  assert.deepEqual(motion.frame, before); assert.equal(motion.geometry, null);
});

test("initial registration preserves the exact anchor without idle permission", () => { const motion = create(); advance(motion, 30); assertHome(motion); });

for (const [name, geometry] of [["desktop", desktop], ["mobile", mobile]]) {
  test(`${name}: release falls, bonks, tumbles, gets up, explores and uses central entrance`, () => {
    const motion = create(geometry); release(motion, { x: geometry.width * .3, y: geometry.height * .5 });
    const frames = finish(motion); const poses = new Set(frames.map(frame => frame.pose));
    for (const pose of ["fall", "bonk", "tumble", "dizzy", "getup", "look", "run", "wave", "walk", "jump", "climb", "sit"]) assert.ok(poses.has(pose), pose);
    assert.ok(frames.some(frame => frame.effect === "impact")); assert.ok(frames.some(frame => frame.effect === "stars"));
    assertCentralEntry(frames, geometry);
  });
}

for (const [edge, point] of [["left", { x: -80, y: 450 }], ["right", { x: desktop.width + 80, y: 450 }], ["top", { x: 500, y: -80 }], ["bottom", { x: 500, y: desktop.height + 80 }]]) {
  test(`offscreen ${edge}: car enters from SAME edge then adventures and returns centrally`, () => {
    const motion = create(); release(motion, point);
    assert.equal(motion.frame.pose, "drive"); assert.equal(motion.frame.vehicle, "car"); assert.equal(motion.frame.scene, `rescate-${edge}`);
    if (edge === "left") assert.ok(motion.frame.x < 0);
    if (edge === "right") assert.ok(motion.frame.x > desktop.width);
    if (edge === "top") { assert.ok(motion.frame.y < 0); assert.equal(motion.frame.rotation, 90); }
    if (edge === "bottom") { assert.ok(motion.frame.y > desktop.height); assert.equal(motion.frame.rotation, -90); }
    const frames = finish(motion); assert.ok(frames.some(frame => frame.pose === "look")); assertCentralEntry(frames, desktop);
  });
}

test("explicit pointer exit edge overrides feet position", () => {
  const motion = create(); release(motion, { x: 25, y: 70 }, "top"); assert.equal(motion.frame.scene, "rescate-top"); finish(motion);
});

test("six recovery adventures rotate before the robot returns", () => {
  const motion = create(); const variants = [];
  for (let index = 0; index < 6; index++) {
    release(motion, { x: 300, y: 400 }); const frames = finish(motion);
    const getupEnd = frames.findLastIndex(frame => frame.pose === "getup");
    variants.push(frames[getupEnd + 1].pose);
    assert.ok(frames.findIndex(frame => frame.pose === "climb") > getupEnd + 1);
  }
  assert.deepEqual(variants, ["look", "juggle", "tiptoe", "push", "carry", "dance"]);
});

test("tiny release settles; duplicate drops cannot restart the sequence", () => {
  const motion = create(); release(motion, { x: desktop.home.x + 5, y: desktop.home.y - 3 }); assertHome(motion);
  release(motion, { x: 350, y: 600 }); advance(motion, .1); const before = { ...motion.frame }; motion.drop(); assert.deepEqual(motion.frame, before); finish(motion);
});

test("held robot stays put, interrupting any scene removes transient props", () => {
  const motion = create(); motion.startActivity(); advance(motion, 2.5); motion.grab(); motion.drag({ x: 400, y: 500 });
  const before = { ...motion.frame }; advance(motion, 60, true); assert.deepEqual(motion.frame, before); assert.equal(motion.frame.carried, null); motion.drop(); finish(motion);
});

test("18 distinct scenes include 12 off-card trips to BOTH sides and four regions", () => {
  const motion = create(); const names = []; const zones = new Set(); const poses = new Set();
  for (let turn = 0; turn < 18; turn++) {
    motion.startActivity(); names.push(motion.frame.scene); const frames = finish(motion);
    for (const frame of frames) poses.add(frame.pose);
    if (turn < 12) {
      assertCentralEntry(frames, desktop);
      assert.ok(frames.some(frame => frame.x < 0 || frame.x > desktop.width));
      for (const frame of frames.filter(frame => frame.carried)) {
        if (frame.x < desktop.left || frame.x > desktop.right) zones.add(`${frame.x < desktop.left ? "left" : "right"}-${frame.y < desktop.height * .5 ? "upper" : "lower"}`);
      }
    }
    assertSafeScenery(motion);
  }
  assert.deepEqual(names, [...AUTH_ROBOT_SCENES]); assert.equal(new Set(names).size, 18); assert.equal(zones.size, 4);
  for (const pose of ["carry", "push", "pull", "drive", "juggle", "tiptoe", "tumble", "sleep", "dance", "wave", "bow"]) assert.ok(poses.has(pose), pose);
  assert.equal(motion.scenery.length, 10);
});

test("first excursion begins at eight seconds; typing resets idle and suppresses startup", () => {
  const motion = create(); advance(motion, 7.5, true); assertHome(motion); advance(motion, 30, false); assertHome(motion);
  advance(motion, 7.5, true); assertHome(motion); advance(motion, .6, true); assert.equal(motion.frame.scene, "bibliotecario"); finish(motion);
  advance(motion, 10.5, true); assertHome(motion); advance(motion, .6, true); assert.equal(motion.frame.scene, "jardinero"); finish(motion);
});

test("mobile also brings props, capped at four in the safe bottom strip", () => {
  const motion = create(mobile);
  for (let turn = 0; turn < 12; turn++) { motion.startActivity(); finish(motion); assertSafeScenery(motion); assert.ok(motion.scenery.length <= 4); }
  assert.equal(motion.scenery.length, 4);
});

test("scenery reference remains stable across ticks, and objects persist between scenes and route changes", () => {
  const motion = create(); motion.startActivity(); finish(motion); const previous = motion.scenery; advance(motion, 2); assert.equal(motion.scenery, previous);
  motion.grab(); motion.drag({ x: 300, y: 400 }); motion.drop(); finish(motion); assert.equal(motion.scenery, previous);
  const ids = motion.scenery.map(item => item.id); motion.setGeometry({ ...desktop, bottom: 760 }); assert.deepEqual(motion.scenery.map(item => item.id), ids); assertSafeScenery(motion);
});

test("scenery relayout preserves identities, bounds and mobile cap", () => {
  const motion = create(); for (let index = 0; index < 12; index++) { motion.startActivity(); finish(motion); }
  const ids = motion.scenery.slice(-4).map(item => item.id); motion.setGeometry(mobile);
  assert.equal(motion.scenery.length, 4); assert.deepEqual(motion.scenery.map(item => item.id), ids); assertSafeScenery(motion);
  motion.setGeometry(desktop); assertSafeScenery(motion);
});

test("route relayout followed by new deliveries never duplicates an occupied scenery slot", () => {
  const motion = create();
  for (let index = 0; index < 12; index++) { motion.startActivity(); finish(motion); }
  for (let index = 0; index < 24; index++) {
    motion.setGeometry({ ...desktop, bottom: index % 2 ? 690 : 730 });
    motion.startActivity(); finish(motion);
    const slots = motion.scenery.map(item => `${item.x}:${item.y}`);
    assert.equal(new Set(slots).size, slots.length, "each retained object owns a separate slot");
    assertSafeScenery(motion);
  }
});

test("wide screens with a wide card use the four-slot mobile rule consistently", () => {
  const motion = create({ ...desktop, left: 40, right: 1400 });
  for (let index = 0; index < 12; index++) {
    motion.startActivity(); finish(motion); assertSafeScenery(motion);
    assert.ok(motion.scenery.length <= 4);
    assert.equal(new Set(motion.scenery.map(item => `${item.x}:${item.y}`)).size, motion.scenery.length);
  }
});

test("resize during every excursion phase cancels stale placement and returns safely", () => {
  for (const seconds of [.4, 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2]) {
    const motion = create(); motion.startActivity(); advance(motion, seconds);
    motion.setGeometry(mobile); finish(motion); assertSafeScenery(motion);
    motion.startActivity(); finish(motion); assertSafeScenery(motion);
  }
});

test("short viewports do not force decor over forms and trips still finish", () => {
  const motion = create({ ...mobile, height: 390 });
  for (let turn = 0; turn < 18; turn++) { motion.startActivity(); finish(motion); }
  assert.equal(motion.scenery.length, 0);
});

test("temporarily short keyboard viewport hides but does not erase deposited objects", () => {
  const motion = create(mobile);
  for (let index = 0; index < 5; index++) { motion.startActivity(); finish(motion); }
  const ids = motion.scenery.map(item => item.id);
  motion.setGeometry({ ...mobile, height: 420 }); assert.equal(motion.scenery.length, 0);
  motion.setGeometry(mobile); assert.deepEqual(motion.scenery.map(item => item.id), ids); assertSafeScenery(motion);
});

test("layout changes do not steal a held robot and running recovery uses new anchor", () => {
  const motion = create(); motion.grab(); motion.drag({ x: 500, y: 500 }); const held = { ...motion.frame };
  motion.setGeometry(mobile); assert.deepEqual(motion.frame, held); motion.drop(); finish(motion);
  release(motion, { x: 100, y: 400 }); advance(motion, .8); motion.setGeometry({ ...desktop, home: { x: 720, y: 292 } }); finish(motion); assert.equal(motion.frame.y, 292);
});

test("reduced motion preserves dragging, avoids all trips and keeps deposited artwork", () => {
  const motion = create(); motion.startActivity(); finish(motion); const previous = motion.scenery;
  motion.setReducedMotion(true); motion.startActivity(); advance(motion, 60, true); assertHome(motion); assert.equal(motion.scenery, previous);
  motion.grab(); motion.drag({ x: -90, y: 500 }); assert.equal(motion.frame.pose, "held"); motion.drop(); assertHome(motion);
});

test("switching reduced motion settles travel but never cancels an active grab", () => {
  const motion = create(); release(motion, { x: 300, y: 400 }); motion.setReducedMotion(true); assertHome(motion);
  motion.setReducedMotion(false); motion.grab(); motion.drag({ x: 300, y: 400 }); motion.setReducedMotion(true); assert.equal(motion.frame.pose, "held"); motion.drop(); assertHome(motion);
});

test("suspension delta is capped and invalid delta or drag coordinates are harmless", () => {
  const large = create(); const ordinary = create(); for (const motion of [large, ordinary]) release(motion, { x: 400, y: 400 });
  large.tick(3600, false); ordinary.tick(.05, false); assert.deepEqual(large.frame, ordinary.frame);
  for (const invalid of [NaN, Infinity, -Infinity, -5]) { const before = { ...large.frame }; large.tick(invalid, false); assert.deepEqual(large.frame, before); }
  finish(large); large.grab(); for (const point of [{ x: NaN, y: 100 }, { x: 100, y: Infinity }]) { const before = { ...large.frame }; large.drag(point); assert.deepEqual(large.frame, before); }
  large.drag({ x: 1e12, y: -1e12 }); assert.ok(large.frame.x <= desktop.width + 220); large.drop(); finish(large);
});

test("196 viewport edge/interior drops finish in four screen sizes", () => {
  for (const geometry of [desktop, mobile, { ...mobile, width: 320, right: 304, home: { x: 160, y: 246 }, height: 568 }, { ...desktop, width: 844, left: 192, right: 652, home: { x: 422, y: 246 }, height: 390 }]) {
    for (const x of [-100, 0, 24, geometry.width / 2, geometry.width - 24, geometry.width, geometry.width + 100]) {
      for (const y of [-100, 0, 24, geometry.height / 2, geometry.height - 24, geometry.height, geometry.height + 100]) {
        const motion = create(geometry); release(motion, { x, y }); finish(motion);
      }
    }
  }
});
