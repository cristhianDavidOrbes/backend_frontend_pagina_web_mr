import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLandingBehavior } from '../public/intro-scene/src/landing-behavior.js';

function advance(robot, start, duration, reduced = false) {
  let pose;
  for (let now = start + 16; now <= start + duration; now += 16) pose = robot.update(now, reduced);
  return pose;
}

test('the film final pose is continuous and pointer tracking is smooth, bounded and reversible', () => {
  const robot = createLandingBehavior(); robot.reset(1000);
  assert.equal(robot.update(1000).lookX, .5);
  robot.point({ active: true, x: -1, y: 1 });
  assert.ok(robot.update(1016).lookX > -.45, 'no abrupt head jump');
  const left = advance(robot, 1016, 800);
  assert.ok(left.lookX < -.44 && left.headPitch < -.12 && left.bodyYaw < -.11);
  robot.point({ active: true, x: 99, y: -99 });
  const right = advance(robot, 1816, 800);
  assert.ok(right.lookX > .44 && right.lookX <= .45 && right.headPitch > .12);
  robot.point({ active: false });
  const neutral = advance(robot, 2616, 1600);
  assert.ok(Math.abs(neutral.lookX) < .001 && Math.abs(neutral.bodyYaw) < .001);
  robot.point({ active: true, x: NaN, y: Infinity });
  assert.deepEqual(robot.diagnostics().pointer, { x: 0, y: 0 });
});

test('all original landing reactions animate and return to idle', () => {
  for (const kind of ['wave', 'attention', 'charge', 'cool', 'celebrate']) {
    const robot = createLandingBehavior(); robot.reset(1000); robot.react(kind, 1000);
    const p = advance(robot, 1000, 600);
    if (kind === 'wave') assert.ok(p.armL > 1.8);
    if (kind === 'attention') assert.ok(p.headPitch < -.06);
    if (kind === 'charge') assert.ok(p.glow > .35 && p.armL > .4);
    if (kind === 'cool') assert.ok(p.glow > .35 && p.glowColor === '#29c3e7');
    if (kind === 'celebrate') assert.ok(p.armL > 2 && p.armR < -2 && p.lift > .08);
    const idle = advance(robot, 1600, 3500);
    assert.ok(idle.glow < .001 && Math.abs(idle.armL) < .09 && Math.abs(idle.lift) < .03, kind);
  }
});

test('shutdown toggles, another reaction wakes it and reduced motion suppresses animation', () => {
  const robot = createLandingBehavior(); robot.reset(1000); robot.react('shutdown', 1000);
  assert.ok(advance(robot, 1000, 800).headPitch > .31);
  robot.react('shutdown', 1800); assert.equal(robot.diagnostics().shutdown, false);
  robot.react('shutdown', 1800); robot.react('wave', 1800);
  assert.equal(robot.diagnostics().shutdown, false);
  robot.point({ active: true, x: 1, y: 1 });
  const reduced = robot.update(1816, true);
  assert.equal(reduced.armL, .05); assert.equal(reduced.lookX, 0); assert.equal(reduced.lift, 0);
  robot.react('constructor', 2000); assert.equal(robot.diagnostics().kind, 'wave');
});
