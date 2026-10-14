import assert from "node:assert/strict";
import test from "node:test";
import { AuthRobotMotion, ToyBox } from "../src/lib/auth-robot-motion.ts";
import { PointerVelocity } from "../src/lib/auth-robot-pointer.ts";

const geometry = { home: { x: 720, y: 246 }, left: 490, right: 950, top: 220, bottom: 690, width: 1440, height: 1000 };
const kinds = ["book", "books", "plant", "crate", "gear", "code", "car", "lamp", "ball", "trophy", "rocket", "picture"];
function create() { const motion = new AuthRobotMotion(); motion.setGeometry(structuredClone(geometry)); return motion; }
function advance(motion, seconds, idle = false) { for (let t = 0; t < seconds; t += 1 / 60) motion.tick(1 / 60, idle); }
function deposit(motion) { motion.startActivity(); advance(motion, 24); return motion.scenery[0]; }

test("recent pointer samples produce a capped throw; holding still produces no velocity", () => {
  const velocity = new PointerVelocity();
  velocity.sample(0, 0, 0); velocity.sample(100, 100, 20);
  assert.ok(Math.hypot(...Object.values(velocity.value())) <= 2600.000001);
  velocity.sample(100, 100, 240);
  assert.deepEqual(velocity.value(), { x: 0, y: 0 });
  velocity.sample(NaN, Infinity, NaN);
  assert.deepEqual(velocity.value(), { x: 0, y: 0 });
});

test("flicking the robot adds ballistic motion then completes its old recovery route", () => {
  const motion = create();
  motion.grab(); motion.drag({ x: 230, y: 400 }); motion.drop(undefined, { x: 1800, y: -900 });
  assert.equal(motion.frame.scene, "lanzamiento");
  advance(motion, 24);
  assert.equal(motion.frame.pose, "sit");
  assert.equal(motion.frame.x, geometry.home.x);
  assert.equal(motion.frame.squash, 1);
});

test("seven taps cycle through reactions and always return to the seat", () => {
  const motion = create(); const poses = new Set();
  for (let index = 0; index < 7; index++) { motion.poke(); poses.add(motion.frame.pose); advance(motion, 3); assert.equal(motion.frame.pose, "sit"); }
  assert.equal(poses.size, 7);
});

test("ball and crate have visibly different bounce behavior", () => {
  const box = new ToyBox(); box.setBounds(1440, 1000);
  box.add("ball", 1, 80, { x: 180, y: 400 }); box.add("crate", 2, 80, { x: 1080, y: 400 });
  box.throw(1, 0, 0); box.throw(2, 0, 0);
  for (let t = 0; t < 4; t += 1 / 60) box.step(1 / 60);
  assert.ok(box.get(1).bounces > box.get(2).bounces);
  assert.equal(box.get(2).state, "resting");
});

for (const kind of kinds) test(`${kind}: thrown prop is collected, restored once and robot returns`, () => {
  const motion = create(); const toy = motion.toys.add(kind, 0, 80, { x: 180, y: 400 });
  motion.throwToy(toy.id, 400, -800);
  for (let t = 0; t < 24 && (motion.toys.get(toy.id) || motion.frame.pose !== "sit"); t += 1 / 60) motion.tick(1 / 60, true);
  assert.equal(motion.frame.pose, "sit");
  assert.equal(motion.toys.toys.length, 0);
  assert.equal(motion.scenery.filter((item) => item.id === 0 && item.kind === kind).length, 1);
});

test("cancelling a drag restores the same reserved slot without leaving a held toy", () => {
  const motion = create(); const item = deposit(motion);
  assert.ok(motion.pickToy(item.id));
  motion.moveToy(item.id, { x: 500, y: 500 }); motion.cancelToy(item.id);
  advance(motion, 8);
  assert.equal(motion.toys.toys.length, 0);
  assert.deepEqual(motion.scenery[0], item);
  assert.equal(motion.frame.pose, "sit");
});

test("grabbing a carried prop is rejected; grabbing the robot drops it and recovery remains possible", () => {
  const motion = create(); const toy = motion.toys.add("book", 0, 80, { x: 180, y: 800 });
  motion.throwToy(toy.id, 0, 0);
  for (let t = 0; t < 12 && toy.state !== "carried"; t += 1 / 60) motion.tick(1 / 60, true);
  assert.equal(toy.state, "carried");
  assert.equal(motion.grabToy(0), null);
  motion.grab(); assert.equal(toy.state, "flying"); motion.drop();
  advance(motion, 35, true);
  assert.equal(motion.toys.toys.length, 0);
});

test("reduced motion restores a released toy without chase animations", () => {
  const motion = create(); const item = deposit(motion); motion.setReducedMotion(true);
  motion.pickToy(item.id); motion.moveToy(item.id, { x: 400, y: 400 }); motion.throwToy(item.id, 2000, -1500);
  assert.equal(motion.toys.toys.length, 0);
  assert.equal(motion.frame.pose, "sit");
  assert.deepEqual(motion.scenery[0], item);
});
