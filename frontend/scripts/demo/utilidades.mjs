import net from "node:net";

export function puertoLibre(puerto, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const prueba = net.createServer();
    prueba.once("error", () => resolve(false));
    prueba.once("listening", () => prueba.close(() => resolve(true)));
    prueba.listen(puerto, host);
  });
}

export async function buscarPuerto(desde, host) {
  for (let puerto = desde; puerto < desde + 50; puerto++) {
    if (await puertoLibre(puerto, host)) return puerto;
  }
  throw new Error(`No hay puertos libres entre ${desde} y ${desde + 49}.`);
}

export async function esperarRespuesta(url, { intentos = 120, pausa = 1000 } = {}) {
  for (let i = 0; i < intentos; i++) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (respuesta.status < 500) return respuesta;
    } catch {
      /* el servidor aún no responde */
    }
    await new Promise((r) => setTimeout(r, pausa));
  }
  throw new Error(`${url} no respondió a tiempo.`);
}
