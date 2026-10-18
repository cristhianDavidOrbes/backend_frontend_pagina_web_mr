import projections from "./landing-intro-projection.json";

/** Pixel anchors sampled from the same deterministic camera as each export. */
export function introProjection(time: number, portrait: boolean) {
  const frames = portrait ? projections.portrait : projections.landscape;
  const index = Math.max(0, frames.findIndex(frame => frame.time >= time));
  const after = time >= 20 ? frames[frames.length - 1] : frames[index];
  const before = frames[Math.max(0, index - 1)];
  const amount = Math.max(0, Math.min(1, (time - before.time) / Math.max(.001, after.time - before.time)));
  return {
    x: before.feet[0] + (after.feet[0] - before.feet[0]) * amount,
    y: before.feet[1] + (after.feet[1] - before.feet[1]) * amount,
    height: before.height + (after.height - before.height) * amount,
  };
}
