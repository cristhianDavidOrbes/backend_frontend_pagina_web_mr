import { registerHooks } from "node:module";

// Los imports sin extensión son válidos con Next/TypeScript pero Node no los
// resuelve al ejecutar los tests directamente. Solo afecta al proceso de tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !/^\.\.?\//.test(specifier)) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
