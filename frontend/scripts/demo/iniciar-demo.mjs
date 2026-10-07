import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { CONTRASENA_DEMO, CUENTAS_DEMO, crearServidorDemo } from "./servidor-demo.mjs";
import { buscarPuerto, esperarRespuesta } from "./utilidades.mjs";

export async function iniciarDemo({ silencioso = false } = {}) {
  const puertoApi = await buscarPuerto(Number(process.env.PUERTO_DEMO ?? 4010));
  const puertoWeb = await buscarPuerto(Number(process.env.PORT ?? 3000), "0.0.0.0");
  const api = `http://127.0.0.1:${puertoApi}`;
  const web = `http://localhost:${puertoWeb}`;

  const servidor = crearServidorDemo();
  await new Promise((resolve, reject) => {
    servidor.once("error", reject);
    servidor.listen(puertoApi, "127.0.0.1", resolve);
  });

  const windows = process.platform === "win32";
  const nextCli = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const next = spawn(process.execPath, [nextCli, "dev", "-p", String(puertoWeb)], {
    stdio: silencioso ? "ignore" : "inherit",
    detached: !windows,
    env: { ...process.env, API_BASE_URL: api, NEXT_DIST_DIR: ".next/demo", NEXT_TELEMETRY_DISABLED: "1" },
  });

  let cierre;
  function cerrar() {
    cierre ??= (async () => {
      const cerrarServidor = new Promise((resolve) => servidor.close(resolve));
      servidor.closeAllConnections();
      if (next.pid) {
        if (windows) {
          await new Promise((resolve) => {
            const terminar = spawn("taskkill", ["/pid", String(next.pid), "/T", "/F"], { stdio: "ignore" });
            terminar.once("close", resolve);
            terminar.once("error", resolve);
          });
        } else {
          try {
            process.kill(-next.pid, "SIGTERM");
          } catch {
            next.kill("SIGTERM");
          }
        }
      }
      await cerrarServidor;
    })();
    return cierre;
  }

  const terminoAntes = new Promise((_, reject) =>
    next.once("exit", (codigo) => reject(new Error(`next dev se cerró antes de estar listo (código ${codigo}). Ejecuta npm install y vuelve a intentarlo.`))),
  );
  try {
    await esperarRespuesta(`${api}/api/ranking`);
    await Promise.race([esperarRespuesta(`${web}/iniciar-sesion`), terminoAntes]);
  } catch (error) {
    await cerrar();
    throw error;
  }
  terminoAntes.catch(() => {});
  return { api, web, next, cerrar };
}

const comoScript = process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/demo/iniciar-demo.mjs");

if (comoScript) {
  console.log("\nIniciando AlgoLab en modo demostración…");
  const demo = await iniciarDemo().catch((error) => {
    console.error(`\nNo se pudo iniciar la demostración: ${error.message}`);
    process.exit(1);
  });

  console.log("\nAlgoLab en modo demostración (sin backend real, los cambios se pierden al cerrar)\n");
  console.log(`  Abre:        ${demo.web}`);
  console.log(`  Backend:     ${demo.api}`);
  console.log(`  Contraseña:  ${CONTRASENA_DEMO}\n`);
  for (const cuenta of CUENTAS_DEMO) console.log(`  ${cuenta.rol.padEnd(36)} ${cuenta.correo}`);
  console.log("\n  Ctrl+C para salir.\n");

  const salir = async () => {
    await demo.cerrar();
    process.exit(0);
  };
  demo.next.on("exit", salir);
  process.on("SIGINT", salir);
  process.on("SIGTERM", salir);
}
