import assert from 'node:assert/strict';
import test from 'node:test';
import { carDeparture, exitRoute, EXIT_APPROACH, EXIT_ARC, EXIT_RADIUS } from '../public/intro-scene/src/prop-motion.js';

test('the car continues from the impact position without jumping', () => {
  assert.deepEqual(carDeparture(9.4), {x:1.5,z:-3.05,yaw:Math.PI/2,distance:0});
  const next=carDeparture(9.40001);
  assert.ok(Math.abs(next.z+3.05)<.001);
  assert.equal(next.x,1.5);
});

test('the rear clears the wall before the right-hand turn', () => {
  const turn=exitRoute(EXIT_APPROACH);
  assert.equal(turn.x,1.5);
  assert.ok(turn.z+1.35 < -4.4);
  assert.equal(turn.yaw,Math.PI/2);
});

test('the curved road and vehicle have continuous position and tangent at both joins', () => {
  for(const join of [EXIT_APPROACH,EXIT_APPROACH+EXIT_ARC]) {
    const a=exitRoute(join-.00001),b=exitRoute(join+.00001);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.00003);
    assert.ok(Math.abs(a.yaw-b.yaw)<.00002);
  }
  const end=exitRoute(EXIT_APPROACH+EXIT_ARC);
  assert.ok(Math.abs(end.x-(1.5+EXIT_RADIUS))<1e-10);
  assert.equal(end.z,-6.2-EXIT_RADIUS);
  assert.equal(end.yaw,0);
});

test('the car keeps driving right instead of disappearing on the old 10.35s cutoff', () => {
  let previous=carDeparture(9.4);
  for(let t=9.41;t<=20;t+=.01) {
    const next=carDeparture(t);
    assert.ok(next.distance>=previous.distance);
    assert.ok(next.x>=previous.x);
    assert.ok(next.z<=previous.z+1e-10);
    assert.ok(next.yaw>=0&&next.yaw<=Math.PI/2);
    assert.ok(Math.hypot(next.x-previous.x,next.z-previous.z)<.16);
    previous=next;
  }
  assert.ok(carDeparture(11.8).x>15);
  assert.deepEqual(carDeparture(20),carDeparture(12.5));
});
