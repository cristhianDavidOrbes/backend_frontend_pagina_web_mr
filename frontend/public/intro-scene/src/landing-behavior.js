// Landing-only acting: the film keeps its authored poses and the same GLB.
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const ease = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
const bell = n => Math.sin(clamp(n) * Math.PI);
const durations = { wave: 2.1, attention: .9, charge: 1.4, cool: 1.3, celebrate: 1.8 };

export function createLandingBehavior() {
  let pointer = { x: 0, y: 0 }, kind = '', started = 0, last = 0, shutdown = false;
  let state;
  function reset(now) {
    pointer = { x: 0, y: 0 }; kind = ''; shutdown = false; started = last = now;
    // The film ends looking slightly to the side; ease from that exact pose.
    state = { lookX: .5, headPitch: Math.sin(20 * 1.9) * .018, headTilt: Math.sin(20 * 1.3) * .018, armL: .05, armR: -.05, lift: 0, bodyYaw: 0, glow: 0, glowColor: '#38d6a2', shutdown: false };
  }
  reset(0);
  return {
    reset,
    point(data) {
      pointer = data.active && Number.isFinite(data.x) && Number.isFinite(data.y)
        ? { x: clamp(data.x, -1, 1), y: clamp(data.y, -1, 1) } : { x: 0, y: 0 };
    },
    react(next, now) {
      if (!Object.hasOwn(durations, next) && next !== 'shutdown') return;
      shutdown = next === 'shutdown' ? !shutdown : false;
      kind = next; started = now;
    },
    update(now, reduced = false) {
      const dt = clamp((now - last) / 1000, 0, .1), t = now / 1000, local = (now - started) / 1000;
      last = now;
      const idle = reduced ? 0 : 1;
      const target = { lookX: pointer.x * .45 * idle, headPitch: (Math.sin(t * .8) * .03 - pointer.y * .16) * idle, headTilt: 0, armL: .05 + Math.sin(t * 1.6) * .035 * idle, armR: -.05 - Math.sin(t * 1.6) * .035 * idle, lift: Math.sin(t * 1.6) * .025 * idle, bodyYaw: pointer.x * .12 * idle, glow: 0, glowColor: '#38d6a2', shutdown };
      if (shutdown) Object.assign(target, { headPitch: .32, lookX: target.lookX * .2, armL: .06, armR: -.06, lift: -.03 });
      else if (!reduced && local >= 0 && local < durations[kind]) {
        const p = local / durations[kind], b = bell(p);
        if (kind === 'wave') {
          const raise = ease(p * 3.2) * (1 - ease((p - .78) * 4.5));
          target.armL += raise * 2.35 + Math.sin(local * 11) * .28 * raise;
          target.headTilt = -.12 * raise; target.lookX += .15 * raise;
        } else if (kind === 'attention') { target.headPitch -= .18 * b; target.lift += .05 * b; }
        else if (kind === 'charge') { target.glow = .55 * b; target.lift += .12 * bell(p * 2); target.armL += .5 * b; target.armR -= .5 * b; }
        else if (kind === 'cool') { target.glow = .5 * b; target.glowColor = '#29c3e7'; target.headTilt += Math.sin(local * 48) * .02 * b; target.headPitch += .08 * b; }
        else if (kind === 'celebrate') { const up = ease(p * 4) * (1 - ease((p - .75) * 4)); target.lift += .28 * Math.abs(Math.sin(p * Math.PI * 2)) * (1 - ease((p - .6) * 2.5)); target.armL += 2.5 * up; target.armR -= 2.5 * up; target.glow = .25 * b; }
      }
      for (const key of ['lookX', 'headPitch', 'headTilt', 'armL', 'armR', 'lift', 'bodyYaw', 'glow']) state[key] += (target[key] - state[key]) * (reduced ? 1 : 1 - Math.exp(-dt * (key === 'bodyYaw' ? 5 : 12)));
      state.glowColor = target.glowColor; state.shutdown = shutdown;
      return { ...state };
    },
    diagnostics: () => ({ ...state, pointer: { ...pointer }, kind, shutdown }),
  };
}
