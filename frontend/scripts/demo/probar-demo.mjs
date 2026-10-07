import { CONTRASENA_DEMO } from "./servidor-demo.mjs";
import { iniciarDemo } from "./iniciar-demo.mjs";

const resultados = [];
const sesiones = [];
function comprobar(nombre, ok, detalle = "") {
  resultados.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
}

async function json(respuesta) {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto);
  } catch {
    return { texto: texto.slice(0, 120) };
  }
}

console.log("Levantando la demostración para probarla (la primera compilación puede tardar)…\n");
const demo = await iniciarDemo({ silencioso: true });
const { web } = demo;

try {
  for (const ruta of ["/", "/iniciar-sesion", "/registrarse"]) {
    const respuesta = await fetch(web + ruta);
    const html = await respuesta.text();
    comprobar(`Página ${ruta}`, respuesta.status === 200 && html.includes("AlgoLab"), `HTTP ${respuesta.status}`);
    const script = html.match(/\/_next\/static\/[^"']+\.js/)?.[0];
    if (ruta === "/iniciar-sesion" && script) {
      const js = await fetch(web + script);
      comprobar("El navegador puede descargar el JavaScript de la página", js.status === 200, `HTTP ${js.status}`);
    }
  }

  const mala = await fetch(`${web}/api/iniciar-sesion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: "admin.demo@campusucc.edu.co", contrasena: "incorrecta" }),
  });
  comprobar("Contraseña incorrecta se rechaza", mala.status === 401, `HTTP ${mala.status}`);

  const perfiles = [
    { correo: "estudiante.demo@campusucc.edu.co", rol: "ESTUDIANTE", api: ["/api/me", "/api/progreso", "/api/reportes", "/api/niveles", "/api/ranking", "/api/oop/progreso"], paginas: ["/estudiante", "/estudiante/reportes", "/estudiante/ranking", "/estudiante/codigo", "/estudiante/perfil", "/estudiante/configuracion"] },
    { correo: "nuevo.demo@campusucc.edu.co", rol: "ESTUDIANTE", api: ["/api/me"], paginas: ["/estudiante/bienvenida"] },
    { correo: "docente.demo@campusucc.edu.co", rol: "DOCENTE", api: ["/api/me", "/api/usuarios", "/api/reportes?todos=1", "/api/progreso?usuarioId=1", "/api/niveles"], paginas: ["/docente", "/docente/estudiantes", "/docente/reportes", "/docente/perfil"] },
    { correo: "admin.demo@campusucc.edu.co", rol: "ADMINISTRADOR", api: ["/api/me", "/api/usuarios", "/api/niveles", "/api/configuracion-tutor/niveles", "/api/configuracion-tutor/reglas-sistema"], paginas: ["/administrador", "/administrador/usuarios", "/administrador/niveles", "/administrador/tutor-ia", "/administrador/perfil"] },
  ];

  for (const perfil of perfiles) {
    console.log(`\n${perfil.correo}`);
    const login = await fetch(`${web}/api/iniciar-sesion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: perfil.correo, contrasena: CONTRASENA_DEMO }),
    });
    const sesion = await json(login);
    comprobar("Inicia sesión", login.ok && sesion.exitoso && Boolean(sesion.token), `HTTP ${login.status}`);
    comprobar(`Rol ${perfil.rol}`, sesion.usuario?.rol === perfil.rol, sesion.usuario?.rol ?? "sin usuario");
    sesiones.push(sesion);
    for (const ruta of perfil.api) {
      const respuesta = await fetch(web + ruta, { headers: { Authorization: `Bearer ${sesion.token}` } });
      comprobar(`Petición ${ruta}`, respuesta.ok, `HTTP ${respuesta.status}`);
    }
    for (const ruta of perfil.paginas) {
      const respuesta = await fetch(web + ruta);
      comprobar(`Página ${ruta}`, respuesta.status === 200, `HTTP ${respuesta.status}`);
    }
  }

  console.log("\nAislamiento de sesiones y errores a través del servidor Next local (backend simulado)");
  const paralelo = await Promise.all(Array.from({ length: 100 }, async (_, indice) => {
    const sesion = sesiones[indice % sesiones.length];
    const respuesta = await fetch(`${web}/api/me`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
    const perfil = await json(respuesta);
    return respuesta.ok && perfil.id === sesion.usuario.id && perfil.rol === sesion.usuario.rol;
  }));
  comprobar("100 peticiones simultáneas de cuatro sesiones conservan su identidad", paralelo.every(Boolean));

  const sinSesion = await fetch(`${web}/api/me`);
  comprobar("La API conserva HTTP 401 sin sesión", sinSesion.status === 401);
  const estudiante = sesiones.find((sesion) => sesion.usuario.rol === "ESTUDIANTE");
  for (const ruta of ["/api/usuarios", "/api/reportes?todos=1"]) {
    const respuesta = await fetch(web + ruta, { headers: { Authorization: `Bearer ${estudiante.token}` } });
    comprobar(`El proxy conserva HTTP 403 al estudiante en ${ruta}`, respuesta.status === 403);
  }
} catch (error) {
  comprobar("La prueba terminó sin errores inesperados", false, error.message);
} finally {
  await demo.cerrar();
}

const fallos = resultados.filter((ok) => !ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} comprobaciones correctas`);
process.exit(fallos ? 1 : 0);
