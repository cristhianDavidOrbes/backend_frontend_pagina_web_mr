import assert from "node:assert/strict";
import test from "node:test";
import { renderQuality } from "../public/intro-scene/src/render-quality.js";

test("mobile screens cap density and shadow cost without changing the aspect ratio", () => {
  for (const [width, height] of [[390, 844], [844, 390], [320, 568], [1440, 2560]]) {
    const q = renderQuality({ width, height, pixelRatio: 3, coarse: true });
    assert.ok(q.ratio <= 1.25);
    assert.ok(width * height * q.ratio ** 2 <= q.pixels + 1);
    assert.equal(q.shadowSize, 1024);
  }
});

test("modest hardware gets a smaller GPU budget even with a high-density display", () => {
  for (const hints of [{ memory: 2 }, { cores: 4 }, { memory: 4, cores: 8 }]) {
    const q = renderQuality({ width: 390, height: 844, pixelRatio: 3, coarse: true, ...hints });
    assert.ok(q.ratio <= 1);
    assert.equal(q.pixels, 650000);
    assert.equal(q.shadowSize, 512);
    assert.equal(q.antialias, false);
  }
});

test("large desktop retains quality and unknown device hints remain safe", () => {
  const q = renderQuality({ width: 1920, height: 1080, pixelRatio: 2 });
  assert.equal(q.shadowSize, 2048);
  assert.ok(Number.isFinite(q.ratio) && q.ratio > 0 && q.ratio <= 1.5);
  assert.ok(1920 * 1080 * q.ratio ** 2 <= q.pixels + 1);
});
