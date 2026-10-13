# Robot interactivo del acceso

Base: `c39e23e` de `main`. La modificación está aislada en la rama
`codex/auth-robot-companion`; no modifica el backend ni publica un despliegue.

## Comportamiento

- El mismo robot/canvas persiste entre `/iniciar-sesion` y `/registrarse`.
- Ratón, tacto o teclado permiten agarrarlo. Al soltarlo cae, se golpea de forma
  cómica, rueda, se recupera y realiza una de seis pequeñas aventuras antes de
  volver al asiento: pasear, jugar con una pelota, bailar, empujar o cargar.
- Si sale de la ventana, vuelve conduciendo desde el mismo borde de salida
  (izquierda, derecha, arriba o abajo), aparca y hace otra actividad.
- Las salidas y regresos atraviesan el centro inferior, por detrás de la tarjeta.
  Una máscara oculta el mismo canvas sin desmontarlo ni modificar la tarjeta.
- Hay 18 escenas automáticas, incluidas 12 excursiones a ambos lados y distintas
  alturas. Comienza tras ocho segundos de inactividad; después espera entre diez
  y dieciséis segundos. No inicia escenas mientras se escribe en campos.
- Trae doce tipos de objetos SVG (libros, planta, caja, engranaje, monitor,
  carro, lámpara, pelota, trofeo, cohete y cuadro) y los deja en zonas seguras.
  Conserva hasta diez objetos, muestra hasta cuatro en móvil y los redistribuye
  al cambiar de ruta/tamaño. Si no caben, se ocultan sin perderlos.
- Escape, cancelación táctil y pérdida de captura o foco recuperan al robot.
  Al enfocarlo con Tab, vuelve a un lugar visible antes de interactuar.
- Con movimiento reducido se puede arrastrar, pero el regreso es inmediato y
  no se ejecutan recorridos automáticos. Hay una alternativa SVG si falla WebGL.
- El espacio original de la mascota y todos los estilos de la tarjeta se
  conservan. La capa decorativa no captura clics salvo sobre el propio robot.

## Evento raro (0,333 %)

- Sorteo de 333 entre 100 000 tickets equiprobables con `crypto.getRandomValues`
  y rechazo del resto sesgado. Se sortea una vez por sesión del navegador, no
  por render, recarga ni transición entre formularios.
- Un resultado activo se conserva en localStorage; la decisión de la sesión
  queda en sessionStorage. La portada no muestra la escena, pero volver al
  acceso/registro la restaura. Si el navegador bloquea almacenamiento, se
  conserva en memoria durante la visita sin interrumpir la autenticación.
- Completar el susto (audio completo + tres segundos de silencio) desactiva el
  evento y devuelve iluminación/robot normales sin borrar datos del formulario.
  También lo desactiva `saveAuthSession` tras un login validado, incluido el
  login automático exitoso tras registrarse. Un registro sin
  login exitoso, error de contraseña o logout no limpian el evento.
- El entorno y los colores del robot se oscurecen suavemente en 700 ms sin tocar
  tarjeta, encabezado ni enlaces. El robot gira desde su postura normal hasta
  quedar de pie y de espaldas; al terminar permanece quieto con WebGL en demanda.
- Solo un clic/toque sin arrastre o activación explícita con Enter/Espacio abre
  la imagen aportada por el usuario. Hover, foco y escritura nunca la disparan.
- El susto comienza pequeño y hace un único zoom de 120 ms hasta cubrir la
  pantalla, conservando la proporción de la imagen con recorte centrado. Después
  queda estático, sin destellos, dentro de un diálogo nativo. El grito
  femenino se reproduce completo (~8,174 s); el evento `ended` inicia tres
  segundos de silencio con la imagen fija. Después vuelve todo a la normalidad.
  Escape/botón permiten cancelar antes, sin completar el evento. Hay salidas
  de emergencia si imagen/audio fallan; no hay rutas/querys de depuración.
- El grito femenino CC0 de AderuMoro acompaña la imagen, con ganancia de 0,45 y sin
  repetición. Solo el clic/toque/teclado desbloquea Web Audio; la imagen cargada
  dispara el sonido. Si el audio falla o llega más de 250 ms tarde, se cancela
  el diálogo sin completar el evento.
  Cerrar, Escape, perder el foco, ocultar la pestaña, navegar o iniciar sesión
  cancelan reproducción y cargas pendientes. No cambia el volumen del sistema.
  Fuente y licencia: `public/algolab/AUDIO_CREDITS.md`.
- La preferencia de movimiento reducido elimina el giro, el fundido y el zoom;
  no cambia el requisito de clic explícito ni los tiempos de audio y silencio.

## Comprobaciones reproducibles

```sh
npm ci
npm run test:auth-robot
npm run test:auth-robot:easter-egg
npm run test:auth-robot:audio
npm run lint
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3100
```

En otra terminal, con Playwright disponible:

```sh
npm run test:auth-robot:browser
npm run test:auth-robot:easter-egg:browser
npm run test:auth-robot:audio:browser
npm run test:auth-robot:visual:browser
```

El script admite `PLAYWRIGHT_MODULE` (ruta a `playwright/index.mjs`),
`BROWSER_EXECUTABLE` y `TEST_BASE_URL`. Solo admite localhost; no envía
credenciales ni crea cuentas. Guarda capturas en un directorio temporal e
imprime su ruta. Incluye continuidad del canvas, navegación sin recarga,
posición de la tarjeta, golpe y actividades antes del regreso, ascenso central
en la capa oculta, carros desde ambos lados, objetos persistentes, teclado,
cancelación, móvil, orientación horizontal y alternativa sin GLB.

La prueba de movimiento usa Node 24 (soporte de TypeScript sin compilación).
Comprueba 27 casos, incluida una cuadrícula de 196 posiciones de caída, los cuatro
bordes, seis aventuras tras caída, 18 escenas y cambios de tamaño en ocho fases.
El lint completo tiene avisos preexistentes en
pruebas del compilador y en la página del editor de código; los archivos del
robot deben quedar sin errores ni avisos propios.

El evento raro tiene 18 pruebas unitarias para sorteo, almacenamiento,
persistencia y conexión con la autenticación. Su prueba de navegador realiza
38 comprobaciones, incluida una imagen retenida para simular una red lenta, y activa
el estado únicamente dentro de un contexto aislado de Playwright; intercepta
las respuestas de login y registro sin crear cuentas ni enviar credenciales a
un servidor real. La prueba normal fija una sesión ya sorteada para no tener
fallos aleatorios por el 0,333 %.

Las 40 pruebas unitarias de audio comprueban cancelaciones durante fetch/decode/resume,
reintentos tras errores, duración completa, volumen y ausencia de solapamientos.
Las 38 comprobaciones de navegador decodifican el MP3 real y observan fuentes Web Audio nativas
con la salida física silenciada. Comprueba imagen lista, clic/teclado, cierre,
cambio de ruta, foco, peticiones tardías y audio corrupto o ausente, sin contactar
un backend real ni servicios externos. Verifica además tres segundos reales de
silencio tras `ended` y la restauración normal sin reiniciar el evento en recargas.
