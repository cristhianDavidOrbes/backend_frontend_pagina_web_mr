import http from "node:http";

export const CONTRASENA_DEMO = "Demo1234";

export const CUENTAS_DEMO = [
  { correo: "estudiante.demo@campusucc.edu.co", rol: "Estudiante con progreso" },
  { correo: "nuevo.demo@campusucc.edu.co", rol: "Estudiante sin perfil (bienvenida)" },
  { correo: "docente.demo@campusucc.edu.co", rol: "Docente" },
  { correo: "admin.demo@campusucc.edu.co", rol: "Administrador" },
];

const ahora = Date.now();
const dias = (n) => new Date(ahora - n * 86_400_000).toISOString();

const usuarios = [
  { id: 1, nombre: "Valentina Rosero", correo: "estudiante.demo@campusucc.edu.co", rol: "ESTUDIANTE", nivelActual: 3, puntaje: 176, nombreUsuario: "vale.ro", institucion: "Universidad Cooperativa de Colombia", programa: "Ingeniería de Software", biografia: "Me gusta entender cómo funcionan las cosas.", avatar: "orbita", tiempoJugadoSegundos: 5420 },
  { id: 2, nombre: "Andrés Benavides", correo: "andres.demo@campusucc.edu.co", rol: "ESTUDIANTE", nivelActual: 2, puntaje: 48, nombreUsuario: "andresb", institucion: "Universidad Cooperativa de Colombia", programa: "Ingeniería de Sistemas", avatar: "codigo", tiempoJugadoSegundos: 2100 },
  { id: 3, nombre: "Camila Ortega", correo: "camila.demo@campusucc.edu.co", rol: "ESTUDIANTE", nivelActual: 5, puntaje: 362, nombreUsuario: "cami", institucion: "Universidad Cooperativa de Colombia", programa: "Ingeniería de Software", avatar: "nucleo", tiempoJugadoSegundos: 9800 },
  { id: 4, nombre: "Julián Muñoz", correo: "julian.demo@campusucc.edu.co", rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0, nombreUsuario: "jmunoz", institucion: "Universidad Cooperativa de Colombia", programa: "Ingeniería de Sistemas", avatar: "robot", tiempoJugadoSegundos: 0 },
  { id: 5, nombre: "Sara Guerrero", correo: "sara.demo@campusucc.edu.co", rol: "ESTUDIANTE", nivelActual: 4, puntaje: 230, nombreUsuario: "sarag", institucion: "Universidad Cooperativa de Colombia", programa: "Ingeniería de Software", avatar: "orbita", tiempoJugadoSegundos: 6300 },
  { id: 6, nombre: "Nuevo Estudiante", correo: "nuevo.demo@campusucc.edu.co", rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0, avatar: "orbita", tiempoJugadoSegundos: 0 },
  { id: 7, nombre: "Laura Delgado", correo: "docente.demo@campusucc.edu.co", rol: "DOCENTE", nivelActual: 1, puntaje: 0, nombreUsuario: "ldelgado", institucion: "Universidad Cooperativa de Colombia", programa: "Docente de POO", avatar: "codigo" },
  { id: 8, nombre: "Administración AlgoLab", correo: "admin.demo@campusucc.edu.co", rol: "ADMINISTRADOR", nivelActual: 1, puntaje: 0, nombreUsuario: "admin", avatar: "nucleo" },
];

const niveles = [
  [1, "Clases y objetos", "Una puerta muestra cómo una plantilla produce objetos con su propio estado."],
  [2, "Construcción de objetos", "En el garaje, cada elección inicial produce un vehículo distinto."],
  [3, "Encapsulamiento", "El robot solo cambia su estado mediante acciones permitidas."],
  [4, "Abstracción", "Libros y vinilos: se conserva solo la información útil para cada propósito."],
  [5, "Herencia", "Nivel en diseño."],
  [6, "Polimorfismo", "Nivel en diseño."],
].map(([nivel, nombre, descripcion]) => ({ id: nivel, nivel, nombre, descripcion, objetivo: nivel <= 4 ? `Comprender ${nombre.toLowerCase()} con objetos en realidad mixta.` : null, activo: nivel <= 4 }));

let siguienteReporte = 1;
function reporte(usuarioId, nivel, dominio, intentos, haceDias) {
  const usuario = usuarios.find((u) => u.id === usuarioId);
  const bajo = dominio < 60;
  return {
    id: siguienteReporte++,
    usuarioId,
    usuarioNombre: usuario.nombre,
    nivel,
    tituloNivel: niveles[nivel - 1].nombre,
    puntaje: dominio,
    tiempoRestante: 90,
    intentos,
    completado: !bajo,
    dominio,
    resumen: bajo
      ? "Todavía modifica el estado directamente y repite el mismo error en la práctica."
      : "Relacionó la acción física con el concepto y usó acciones permitidas para cambiar el estado.",
    fortalezas: bajo ? ["Explora todos los objetos del nivel"] : ["Usa acciones permitidas en lugar de modificar datos", "Explica la diferencia entre plantilla e instancia"],
    aspectosMejora: bajo ? ["Distinguir la clase del objeto", "Revisar el estado antes de actuar"] : ["Justificar los límites de cada acción"],
    recomendaciones: [bajo ? "Repite el tutorial y describe en voz alta qué cambió en cada objeto." : "Explica en voz alta por qué cada límite vive dentro del objeto."],
    evidencias: [`${intentos} intento${intentos === 1 ? "" : "s"} registrados en las gafas`],
    proximoEjercicio: nivel < 4 ? `Nivel ${nivel + 1}: ${niveles[nivel].nombre.toLowerCase()}.` : "Repasa la ruta completa para mejorar tu mejor puntaje.",
    generadoPorIa: true,
    fechaGeneracion: dias(haceDias),
  };
}

let reportes = [
  reporte(1, 1, 92, 1, 12), reporte(1, 2, 84, 2, 6),
  reporte(2, 1, 48, 3, 9), reporte(2, 1, 55, 4, 4),
  reporte(3, 1, 95, 1, 20), reporte(3, 2, 90, 1, 15), reporte(3, 3, 88, 2, 10), reporte(3, 4, 89, 1, 3),
  reporte(5, 1, 80, 2, 14), reporte(5, 2, 70, 2, 8), reporte(5, 3, 58, 3, 2),
];

const tutor = niveles.map((n) => ({
  id: n.id,
  nivel: n.nivel,
  nombreNivel: n.nombre,
  conceptoCentral: n.nombre,
  objetivoTutor: `Guiar al estudiante para que comprenda ${n.nombre.toLowerCase()} a partir de lo que hizo con los objetos.`,
  etapas: ["Tutorial", "Práctica", "Resultado"],
  accionesEsperadas: ["Usar las acciones permitidas del objeto"],
  erroresObservables: ["Intentar modificar el estado directamente"],
  objetosClave: ["Objeto principal del nivel"],
  dificultadesComunes: ["Confundir clase y objeto"],
  criteriosDominio: ["Explica el cambio que produjo su acción"],
  pistasTutor: ["Observa qué cambió en el objeto después de tu acción"],
  proximoEjercicio: "Siguiente nivel de la ruta",
  promptAdicional: "",
  puntajeMaximo: 100,
  tiempoObjetivoSegundos: 300,
  activo: n.nivel <= 4,
}));

const oop = new Map();

function progreso(usuario) {
  const ultimos = new Map();
  for (const r of reportes.filter((x) => x.usuarioId === usuario.id)) ultimos.set(r.nivel, r);
  return {
    usuarioId: usuario.id,
    nivelActual: usuario.nivelActual,
    puntajeTotal: usuario.puntaje,
    tiempoJugadoSegundos: usuario.tiempoJugadoSegundos ?? 0,
    niveles: [...ultimos.values()].map((r) => ({ nivel: r.nivel, completado: r.completado, puntaje: r.puntaje, tiempoRestante: 90, intentos: r.intentos })),
  };
}

function ranking() {
  const estudiantes = usuarios
    .filter((u) => u.rol === "ESTUDIANTE")
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((u, i) => ({ posicion: i + 1, usuarioId: u.id, nombre: u.nombre, nombreUsuario: u.nombreUsuario, nivelActual: u.nivelActual, puntaje: u.puntaje, avatar: u.avatar, avatarUrl: null }));
  return { total: estudiantes.length, estudiantes };
}

function responder(res, estado, datos) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  res.end(datos === undefined ? "" : JSON.stringify(datos));
}

function usuarioDeSesion(req) {
  const id = Number((req.headers.authorization ?? "").replace("Bearer demo-", ""));
  return usuarios.find((u) => u.id === id);
}

async function leerCuerpo(req) {
  let texto = "";
  for await (const parte of req) texto += parte;
  try {
    return texto ? JSON.parse(texto) : {};
  } catch {
    return {};
  }
}

export function crearServidorDemo() {
  return http.createServer(async (req, res) => {
    const ruta = new URL(req.url, "http://demo").pathname;
    const metodo = req.method;
    const cuerpo = metodo === "GET" || metodo === "DELETE" ? {} : await leerCuerpo(req);
    let m;

    if (ruta === "/api/usuarios/iniciar-sesion" && metodo === "POST") {
      const correo = String(cuerpo.correo ?? "").trim().toLowerCase();
      const usuario = usuarios.find((u) => u.correo === correo);
      if (!usuario || cuerpo.contrasena !== CONTRASENA_DEMO) {
        return responder(res, 401, { exitoso: false, mensaje: `Correo o contraseña incorrectos. En la demo la contraseña es ${CONTRASENA_DEMO}.` });
      }
      return responder(res, 200, { exitoso: true, token: `demo-${usuario.id}`, usuario });
    }

    if (ruta === "/api/usuarios/registrar" && metodo === "POST") {
      const correo = String(cuerpo.correo ?? "").trim().toLowerCase();
      if (usuarios.some((u) => u.correo === correo)) return responder(res, 409, { exitoso: false, mensaje: "Ese correo ya está registrado." });
      usuarios.push({ id: Math.max(...usuarios.map((u) => u.id)) + 1, nombre: cuerpo.nombre, correo, rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0, avatar: "orbita", tiempoJugadoSegundos: 0 });
      return responder(res, 200, { exitoso: true, mensaje: `Cuenta creada. En la demo inicia sesión con la contraseña ${CONTRASENA_DEMO}.` });
    }

    if (ruta === "/api/ranking") return responder(res, 200, ranking());

    const yo = usuarioDeSesion(req);
    if (!yo) return responder(res, 401, { mensaje: "Sesión no válida." });
    const esStaff = yo.rol !== "ESTUDIANTE";

    if (ruta === "/api/usuarios/me") return responder(res, 200, yo);
    if (ruta === "/api/usuarios/me/perfil") {
      if (metodo === "PUT") Object.assign(yo, { nombre: cuerpo.nombre, nombreUsuario: cuerpo.nombreUsuario, institucion: cuerpo.institucion, programa: cuerpo.programa, biografia: cuerpo.biografia, avatar: cuerpo.avatar ?? yo.avatar });
      return responder(res, 200, yo);
    }
    if (ruta === "/api/usuarios/me/avatar") {
      if (metodo === "DELETE") yo.avatarUrl = null;
      return responder(res, 200, { ...yo, avatarUrl: null });
    }
    if (ruta === "/api/usuarios/me/historial" && metodo === "DELETE") {
      reportes = reportes.filter((r) => r.usuarioId !== yo.id);
      return responder(res, 204);
    }
    if (ruta === "/api/usuarios/me/datos" && metodo === "DELETE") {
      reportes = reportes.filter((r) => r.usuarioId !== yo.id);
      usuarios.splice(usuarios.indexOf(yo), 1);
      return responder(res, 204);
    }
    if (ruta === "/api/progreso/me") return responder(res, 200, progreso(yo));
    if ((m = ruta.match(/^\/api\/progreso\/usuario\/(\d+)$/))) {
      const otro = usuarios.find((u) => u.id === Number(m[1]));
      return otro && esStaff ? responder(res, 200, progreso(otro)) : responder(res, 404, { mensaje: "No encontrado." });
    }
    if (ruta === "/api/reportes-nivel/me") return responder(res, 200, reportes.filter((r) => r.usuarioId === yo.id));
    if (ruta === "/api/reportes-nivel") return esStaff ? responder(res, 200, reportes) : responder(res, 403, { mensaje: "Solo docentes y administración." });
    if ((m = ruta.match(/^\/api\/reportes-nivel\/usuario\/(\d+)$/))) return responder(res, 200, reportes.filter((r) => r.usuarioId === Number(m[1])));
    if ((m = ruta.match(/^\/api\/usuarios\/(\d+)\/publico$/))) {
      const u = usuarios.find((x) => x.id === Number(m[1]));
      return u ? responder(res, 200, { id: u.id, nombre: u.nombre, nombreUsuario: u.nombreUsuario, nivelActual: u.nivelActual, puntaje: u.puntaje, avatar: u.avatar, avatarUrl: null }) : responder(res, 404, { mensaje: "No encontrado." });
    }
    if (ruta === "/api/usuarios") return esStaff ? responder(res, 200, usuarios) : responder(res, 403, { mensaje: "Sin permiso." });
    if ((m = ruta.match(/^\/api\/usuarios\/(\d+)$/))) {
      if (yo.rol !== "ADMINISTRADOR") return responder(res, 403, { mensaje: "Solo administración." });
      const i = usuarios.findIndex((u) => u.id === Number(m[1]));
      if (i < 0) return responder(res, 404, { mensaje: "Usuario no encontrado." });
      if (metodo === "DELETE") {
        reportes = reportes.filter((r) => r.usuarioId !== usuarios[i].id);
        usuarios.splice(i, 1);
        return responder(res, 204);
      }
      if (metodo === "PUT") Object.assign(usuarios[i], { nombre: cuerpo.nombre, correo: cuerpo.correo, rol: cuerpo.rol, nivelActual: cuerpo.nivelActual, puntaje: cuerpo.puntaje });
      return responder(res, 200, usuarios[i]);
    }
    if (ruta === "/api/niveles") {
      if (metodo === "POST") {
        const nuevo = { ...cuerpo, id: Math.max(0, ...niveles.map((n) => n.id)) + 1 };
        niveles.push(nuevo);
        return responder(res, 200, nuevo);
      }
      return responder(res, 200, niveles);
    }
    if ((m = ruta.match(/^\/api\/niveles\/(\d+)$/))) {
      const i = niveles.findIndex((n) => n.id === Number(m[1]));
      if (i < 0) return responder(res, 404, { mensaje: "Nivel no encontrado." });
      if (metodo === "DELETE") {
        niveles.splice(i, 1);
        return responder(res, 204);
      }
      if (metodo === "PUT") Object.assign(niveles[i], cuerpo);
      return responder(res, 200, niveles[i]);
    }
    if (ruta === "/api/oop/progreso/me" || ruta === "/api/oop/progreso") {
      const propio = oop.get(yo.id) ?? [];
      if (metodo === "POST") {
        const i = propio.findIndex((n) => n.nivel === cuerpo.nivel && n.lenguaje === cuerpo.lenguaje);
        const registro = { id: propio.length + 1, ...cuerpo };
        if (i >= 0) propio[i] = { ...propio[i], ...registro };
        else propio.push(registro);
        oop.set(yo.id, propio);
      }
      const total = propio.reduce((s, n) => s + (n.puntaje ?? 0), 0);
      return responder(res, 200, { usuarioId: yo.id, puntajeOopTotal: total, puntajeGlobalTotal: yo.puntaje + total, niveles: propio });
    }
    if (ruta === "/api/configuracion-tutor/reglas-sistema") {
      return responder(res, 200, { version: "demo", editable: false, reglas: ["Responde solo sobre programación orientada a objetos.", "No entrega la solución completa.", "Basa el diagnóstico en evidencia registrada."], seccionesReporte: ["loComprendido", "necesitaRefuerzo", "evidenciaObservada", "recomendacion", "proximoEjercicio"] });
    }
    if (ruta === "/api/configuracion-tutor/niveles") return responder(res, 200, tutor);
    if ((m = ruta.match(/^\/api\/configuracion-tutor\/niveles\/(\d+)$/))) {
      const i = tutor.findIndex((t) => t.nivel === Number(m[1]));
      if (i < 0) return responder(res, 404, { mensaje: "Nivel no encontrado." });
      if (metodo === "PUT") Object.assign(tutor[i], cuerpo);
      return responder(res, 200, tutor[i]);
    }

    return responder(res, 404, { mensaje: `La demo no simula ${metodo} ${ruta}.` });
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("servidor-demo.mjs")) {
  const puerto = Number(process.env.PUERTO_DEMO ?? 4010);
  crearServidorDemo().listen(puerto, () => console.log(`Backend de demostración en http://127.0.0.1:${puerto}`));
}
