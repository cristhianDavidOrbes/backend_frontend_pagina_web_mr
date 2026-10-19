/** No GPU benchmarking/fingerprinting: use optional coarse device hints. */
export function robotGpuBudget({ memory, cores, coarse = false }: { memory?: number; cores?: number; coarse?: boolean } = {}) {
  const modest = (Number.isFinite(memory) && memory! <= 4) || (Number.isFinite(cores) && cores! <= 4);
  return {
    dpr: [0.75, modest ? 1 : coarse ? 1.25 : 1.6] as [number, number],
    antialias: !modest,
    shadowResolution: modest ? 128 : coarse ? 256 : 512,
  };
}
