import { spawn } from "node:child_process";

import { CONTRASENA_DEMO, CUENTAS_DEMO, crearServidorDemo } from "./servidor-demo.mjs";

const PUERTO_API = Number(process.env.PUERTO_DEMO ?? 4010);
const PUERTO_WEB = Number(process.env.PORT ?? 3000);

const servidor = crearServidorDemo().listen(PUERTO_API, "127.0.0.1", () => {
  console.log("\nAlgoLab en modo demostración (sin backend real, los cambios se pierden al cerrar)\n");
  console.log(`  Web:         http://localhost:${PUERTO_WEB}`);
  console.log(`  Contraseña:  ${CONTRASENA_DEMO}\n`);
  for (const cuenta of CUENTAS_DEMO) console.log(`  ${cuenta.rol.padEnd(36)} ${cuenta.correo}`);
  console.log("");
});

const next = spawn("npx", ["next", "dev", "-p", String(PUERTO_WEB)], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${PUERTO_API}` },
});

function cerrar() {
  servidor.close();
  next.kill();
  process.exit(0);
}

next.on("exit", cerrar);
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
