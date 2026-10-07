import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Deliberadamente no configurable a un host externo: nunca probar contra alumnos reales.
const BASE = new URL('http://127.0.0.1:18080');
assert.equal(BASE.hostname, '127.0.0.1');
assert.equal(BASE.port, '18080');
const syntheticPassword = 'VerificacionLocal2026!';
const runId = `e2e-${Date.now()}-${randomUUID().slice(0, 6)}`;
const participants = 20;
const concurrentActors = 10;
const measurements = [];
const failures = [];
const accountResults = [];
let checks = 0;
let inFlight = 0;
let maximumInFlight = 0;
const begun = performance.now();

function check(actual, expected, label) {
  checks++;
  assert.deepEqual(actual, expected, label);
}

async function http(method, path, token, payload, expectedStatus = 200) {
  assert.ok(path.startsWith('/api/'));
  const started = performance.now();
  inFlight++;
  maximumInFlight = Math.max(maximumInFlight, inFlight);
  try {
    const response = await fetch(new URL(path, BASE), {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    let data;
    if (text) {
      try { data = JSON.parse(text); } catch { throw new Error(`JSON inválido en ${method} ${path}`); }
    }
    measurements.push({ method, path: path.replace(/\/\d+(?=\/|$)/g, '/:id'),
      status: response.status, ms: performance.now() - started });
    check(response.status, expectedStatus, `${method} ${path}: estado inesperado`);
    return data;
  } catch (error) {
    failures.push({ method, path, message: error.message, ms: performance.now() - started });
    throw error;
  } finally {
    inFlight--;
  }
}

async function login(correo) {
  const respuesta = await http('POST', '/api/usuarios/iniciar-sesion', undefined,
    { correo, contrasena: syntheticPassword });
  check(respuesta.exitoso, true, 'Login real exitoso');
  check(typeof respuesta.token, 'string', 'JWT real emitido');
  check('contrasena' in respuesta.usuario, false, 'Hash no expuesto');
  return { token: respuesta.token, usuario: respuesta.usuario };
}

async function mapBounded(values, concurrency, operation) {
  let index = 0;
  const results = new Array(values.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (index < values.length) {
      const current = index++;
      results[current] = await operation(values[current], current);
    }
  }));
  return results;
}

function result(nivel, puntos, restante, jugado) {
  return { nivel, puntaje: puntos, tiempoRestante: restante, tiempoJugadoSegundos: jugado,
    intentos: 1, completado: true };
}

function grade(base, label) {
  return { puntajeBase: base.puntaje, tiempoRestanteBase: base.tiempoRestante,
    intentosBase: base.intentos, completadoBase: base.completado,
    dominio: Math.round(base.puntaje * 100 / 120),
    resumen: `Evaluación sintética de ${label}; no se llamó a un modelo de IA.`,
    fortalezas: [`Evidencia local exclusiva ${label}`], aspectosMejora: [],
    recomendaciones: ['Repasar el concepto en esta prueba aislada'],
    evidencias: [`Identidad sintética ${label}`], proximoEjercicio: 'Caso de prueba local' };
}

function verifyProgress(data, student, expectedPoints, expectedTime) {
  check(data.usuarioId, student.id, 'Progreso pertenece a la cuenta autenticada');
  check(data.puntajeTotal, expectedPoints, 'Suma correcta de puntos confirmados');
  check(data.tiempoJugadoSegundos, expectedTime, 'Tiempo confirmado sin retroceso');
  check(data.nivelActual, 4, 'Último nivel público');
  check(data.nivelesVrCompletados, 4, 'Cuatro prácticas completadas');
  check(data.totalNivelesVr, 4, 'Ruta VR de cuatro niveles');
  check(data.rutaVrCompletada, true, 'Ruta completa confirmada');
  check(data.niveles.length, 4, 'Sin progreso duplicado');
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0);
}

function latency(values) {
  const samples = values.map(value => value.ms);
  return { count: samples.length, medianMs: percentile(samples, .5), p95Ms: percentile(samples, .95),
    maximumMs: Math.round(Math.max(0, ...samples)) };
}

let passed = false;
try {
  console.log('E2E HTTP local: Java/H2 real, sin acceso a producción.');
  const [studentFixture, teacher, admin] = await Promise.all([
    login('estudiante.release@example.test'), login('docente.release@example.test'), login('admin.release@example.test'),
  ]);
  await http('GET', '/api/progreso/me', undefined, undefined, 401);
  await http('GET', '/api/progreso/me', 'jwt-invalido', undefined, 401);
  await http('POST', '/api/usuarios/iniciar-sesion', undefined,
    { correo: 'estudiante.release@example.test', contrasena: 'Incorrecta' }, 401);
  await http('GET', '/api/usuarios', studentFixture.token, undefined, 403);
  await http('GET', '/api/configuracion-tutor/niveles', teacher.token, undefined, 403);
  await http('GET', '/api/configuracion-tutor/niveles', admin.token);
  await http('POST', '/api/usuarios/registrar', undefined,
    { nombre: 'Registro protegido local', correo: `${runId}-admin@example.test`, rol: 'ADMINISTRADOR', contrasena: syntheticPassword }, 403);

  const labels = Array.from({ length: participants }, (_, i) => `participante-${String(i + 1).padStart(2, '0')}`);
  const students = await mapBounded(labels, 4, async (label, i) => {
    const correo = `${runId}-${label}@example.test`;
    const created = await http('POST', '/api/usuarios/registrar', undefined,
      { nombre: `${runId} ${label}`, correo, rol: 'ESTUDIANTE', contrasena: syntheticPassword }, 201);
    check(created.usuario.rol, 'ESTUDIANTE', 'Registro mantiene el rol público');
    const authenticated = await login(correo);
    check(authenticated.usuario.id, created.usuario.id, 'Login y registro apuntan a la misma fila');
    return { label, id: created.usuario.id, correo, token: authenticated.token, offset: i,
      firstPoints: 87 + i % 10, points: 617 + i % 10, played: 453 + i };
  });
  console.log(`Registradas ${students.length} cuentas sintéticas; comenzando ${concurrentActors} recorridos simultáneos.`);
  await mapBounded(students, concurrentActors, async (student) => {
    const offset = student.offset;
    const requests = [result(1, student.firstPoints, 97, 23 + offset), result(2, 190, 100, 163 + offset),
      result(3, 100, 60, 403 + offset), result(4, 240, 250, 453 + offset)];
    for (const request of requests) await http('POST', '/api/progreso', student.token, request);
    let progress = await http('GET', '/api/progreso/me', student.token);
    verifyProgress(progress, student, student.points, student.played);
    // Un reintento viejo no pierde puntos ni tiempo. Simultáneamente consultar
    // el informe ejercita el bloqueo GET/POST de la misma cuenta sobre HTTP real.
    await Promise.all([http('POST', '/api/progreso', student.token, requests[0]),
      http('GET', '/api/reportes-nivel/me', student.token)]);
    progress = await http('GET', '/api/progreso/me', student.token);
    verifyProgress(progress, student, student.points, student.played);
    const base = progress.niveles.find(nivel => nivel.nivel === 1);
    const enriched = await http('PUT', '/api/reportes-nivel/1/ia', student.token, grade(base, student.label));
    check(enriched.generadoPorIa, true, 'Contrato de informe enriquecido persistido');
    let reports = await http('GET', '/api/reportes-nivel/me', student.token);
    check(reports.length, 4, 'Informe disponible por cada nivel confirmado');
    check(reports.every(reporte => reporte.usuarioId === student.id), true, 'Ningún informe de otra identidad');
    check(reports[0].resumen.includes(student.label), true, 'Evidencia aislada de la cuenta');
    check(reports[0].generadoPorIa, true, 'Lectura no destruye informe enriquecido');
    const profile = await http('GET', '/api/usuarios/me', student.token);
    check(profile.puntaje, student.points, 'Perfil y progreso muestran el mismo score');
    check(profile.tiempoJugadoSegundos, student.played, 'Perfil y progreso muestran el mismo tiempo');
    accountResults.push({ label: student.label, usuarioId: student.id, puntaje: student.points,
      tiempoJugadoSegundos: student.played, niveles: 4, informes: reports.length });
  });

  const [first, second] = students;
  await http('GET', `/api/progreso/usuario/${second.id}`, first.token, undefined, 403);
  await http('GET', `/api/reportes-nivel/usuario/${second.id}`, first.token, undefined, 403);
  const teacherView = await http('GET', `/api/progreso/usuario/${first.id}`, teacher.token);
  verifyProgress(teacherView, first, first.points, first.played);
  const teacherReports = await http('GET', `/api/reportes-nivel/usuario/${first.id}`, teacher.token);
  check(teacherReports.every(reporte => reporte.usuarioId === first.id), true, 'Vista docente mantiene la cuenta solicitada');
  await http('POST', '/api/progreso', first.token, result(1, 121, 97, 23), 400);
  verifyProgress(await http('GET', '/api/progreso/me', first.token), first, first.points, first.played);
  const oldBase = (await http('GET', '/api/progreso/me', first.token)).niveles[0];
  await http('POST', '/api/progreso', first.token, { ...result(1, 110, 105, 500), intentos: 2 });
  await http('PUT', '/api/reportes-nivel/1/ia', first.token, grade(oldBase, first.label), 409);
  const improved = await http('GET', '/api/progreso/me', first.token);
  verifyProgress(improved, first, 640, 500);
  await http('PUT', '/api/reportes-nivel/1/ia', first.token, grade(improved.niveles[0], `${first.label}-mejorado`));
  const improvedReports = await http('GET', '/api/reportes-nivel/me', first.token);
  check(improvedReports[0].puntaje, 110, 'Informe enriquecido respeta el mejor resultado confirmado');
  check(improvedReports[0].resumen.includes(`${first.label}-mejorado`), true, 'Informe obsoleto no sobrescribe el nuevo');
  Object.assign(accountResults.find(account => account.label === first.label),
    { puntaje: 640, tiempoJugadoSegundos: 500, mejoradoDuranteVerificacion: true });

  const changeable = students.at(-1);
  await http('PUT', `/api/usuarios/${changeable.id}`, admin.token,
    { nombre: `${runId} ${changeable.label}`, correo: changeable.correo, rol: 'DOCENTE' });
  await http('GET', '/api/reportes-nivel', changeable.token);
  await http('PUT', `/api/usuarios/${changeable.id}`, admin.token,
    { nombre: `${runId} ${changeable.label}`, correo: changeable.correo, rol: 'ESTUDIANTE' });
  await http('GET', '/api/reportes-nivel', changeable.token, undefined, 403);
  verifyProgress(await http('GET', '/api/progreso/me', changeable.token), changeable, changeable.points, changeable.played);

  await http('DELETE', `/api/usuarios/${changeable.id}`, admin.token, undefined, 204);
  accountResults.find(account => account.label === changeable.label).eliminadoTrasVerificacion = true;
  await http('GET', '/api/progreso/me', changeable.token, undefined, 401);
  verifyProgress(await http('GET', '/api/progreso/me', second.token), second, second.points, second.played);
  const ranking = await http('GET', '/api/ranking');
  const rows = Array.isArray(ranking) ? ranking : ranking.estudiantes;
  check(Array.isArray(rows), true, 'Ranking devuelve colección documentada');
  check(rows.some(row => row.usuarioId === first.id && row.puntaje === 640), true, 'Ranking refleja mejora guardada');
  check(rows.some(row => row.usuarioId === changeable.id), false, 'Cuenta eliminada no sigue en ranking');
  passed = true;
} catch (error) {
  // El mensaje solo incluye rutas/estatus/asserts; nunca se vuelcan tokens ni cuerpos de autenticación.
  console.error(`FAIL E2E local: ${error.message}`);
}

const groups = {};
for (const sample of measurements) (groups[`${sample.method} ${sample.path}`] ??= []).push(sample);
const summary = {
  test: 'HTTP real Java/Spring/H2; datos sintéticos; no producción; no generación LLM',
  runId, passed, assertions: checks, participants, concurrentActors, maximumInFlight,
  persistedSyntheticAccounts: passed ? participants - 1 : null,
  requests: measurements.length, unexpectedErrors: failures.length,
  elapsedSeconds: Math.round((performance.now() - begun) / 1000 * 100) / 100,
  latency: latency(measurements),
  byRoute: Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, latency(values)])),
  statusCounts: measurements.reduce((counts, value) => ({ ...counts,
    [value.status]: (counts[value.status] ?? 0) + 1 }), {}),
  accounts: accountResults.sort((a, b) => a.label.localeCompare(b.label)), failures,
  limitations: ['H2 y hardware local no acreditan capacidad de PostgreSQL/Render.',
    'Los contenidos de informe son sintéticos: esta prueba no invoca Ollama ni ElevenLabs.',
    'No demuestra disponibilidad permanente de red ni experiencia en el dispositivo Quest.'],
};
const reportPath = fileURLToPath(new URL('./real-http-results.json', import.meta.url));
await writeFile(reportPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ passed, assertions: checks, participants, concurrentActors, maximumInFlight,
  requests: measurements.length, unexpectedErrors: failures.length, elapsedSeconds: summary.elapsedSeconds,
  latency: summary.latency, statusCounts: summary.statusCounts, report: reportPath }, null, 2));
if (!passed) process.exitCode = 1;
