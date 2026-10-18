/** Conservative initial GPU budgets; no device fingerprint or extra dependency. */
export function renderQuality({ width, height, pixelRatio = 1, coarse = false, memory, cores }) {
  const mobile = coarse || Math.min(width, height) < 700;
  const modest = (Number.isFinite(memory) && memory <= 4) || (Number.isFinite(cores) && cores <= 4);
  const pixels = modest ? 650000 : mobile ? 900000 : 2100000;
  const cap = modest ? 1 : mobile ? 1.25 : 1.5;
  const ratio = Math.min(Math.max(.1, pixelRatio), cap, Math.sqrt(pixels / Math.max(1, width * height)));
  return { ratio, pixels, shadowSize: modest ? 512 : mobile ? 1024 : 2048, mobile };
}
