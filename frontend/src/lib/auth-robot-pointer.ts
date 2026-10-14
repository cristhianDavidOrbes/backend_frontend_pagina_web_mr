import type { Point } from "./auth-robot-motion";

/** Recent pointer samples only: pausing before release must not cause a fling. */
export class PointerVelocity {
  private samples: { x: number; y: number; time: number }[] = [];

  sample(x: number, y: number, time: number) {
    if (![x, y, time].every(Number.isFinite)) return;
    this.samples = [...this.samples.filter((point) => time - point.time <= 120), { x, y, time }].slice(-8);
  }

  value(): Point {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const seconds = first && last ? (last.time - first.time) / 1000 : 0;
    if (seconds < 0.008) return { x: 0, y: 0 };
    const x = (last.x - first.x) / seconds;
    const y = (last.y - first.y) / seconds;
    const scale = Math.min(1, 2600 / Math.hypot(x, y));
    return { x: x * scale, y: y * scale };
  }
}
