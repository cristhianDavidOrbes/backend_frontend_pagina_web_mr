# Rendimiento y verificación local — 18 de octubre de 2026

## Alcance

Optimización de carga y coste gráfico, sin rediseñar las pantallas ni sustituir
el robot 3D. Cambios locales: no se ha publicado ni reactivado Railway.
La verificación de usuarios utiliza exclusivamente el backend demo en memoria.

## Cambios

- `scripts/build-intro.mjs` agrupa, elimina código no utilizado y minifica la
  escena con esbuild. Motor, cargadores y código crítico resultante: 686.862
  bytes sin compresión. Antes, solo los dos módulos principales de Three.js
  ya sumaban 2.093.209 bytes sin compresión; no confundir esto con transferencia
  HTTP, que ya estaba comprimida.
- Modelo, imágenes, audio y JavaScript usan nombres derivados del contenido y
  caché inmutable. No se cambian las políticas de caché de APIs, sesiones ni HTML.
- Una precarga temprana adelanta motor y modelo a la hidratación de la página.
  Respeta «una vez», «nunca», ahorro de datos y movimiento reducido.
- El primer fotograma no espera la preparación del robot de la transición.
  Los materiales de planos posteriores se preparan por etapas en tiempo ocioso.
- La preparación del personaje compila únicamente sus mallas, no toda la escena.
  Los estados compartidos del renderizador se restauran antes de esperar una promesa.
- El agrupamiento de muebles estáticos ahorra 37 llamadas de dibujo por pasada.
  Planta animada, fragmentos, piso instanciado, límites del cuarto y objetos de la
  historia conservan sus movimientos. Se conservan las paredes extendidas y la
  carretera exclusivamente exterior.
- Los robots de autenticación y de respaldo limitan resolución y sombras según
  indicios opcionales del dispositivo; mantienen sus controles y recuperación 3D.
- Los estilos de Programar POO se cargan en sus rutas, no en todas las páginas.
- Next.js y su configuración de ESLint pasan de 16.3.6 a 16.3.8 para aplicar
  correcciones de seguridad sin migrar a otra versión menor.

## Medición

Edge automatizado, GPU por software, build de producción local. Perfil móvil:
390 × 844, CPU ralentizada 4 veces, 1,6 Mbps de bajada, 150 ms de latencia.
Son observaciones de laboratorio, no resultados de un teléfono físico ni datos
reales de Vercel. Se mide hasta el primer fotograma completo, no solo HTML visible.

| Perfil | Primera carga desde navegación | Con assets en caché | Espera de escena en primera carga |
| --- | ---: | ---: | ---: |
| Escritorio | 3.722 ms | 1.062 ms | 1.190 ms |
| Móvil / red lenta | 6.493 ms | 2.438 ms | 2.237 ms |

La observación inicial del perfil móvil comparable fue de aproximadamente
11,3 segundos. La mejora observada es cercana al 43%; no es una garantía ni
una distribución estadística. Otros ensayos concurrentes con navegadores
adicionales fueron más lentos: no deben usarse como benchmark aislado.

## Pruebas realizadas

- Compilación de producción y comprobación TypeScript: correctas (61 páginas).
- ESLint de fuentes y scripts: cero errores; permanecen 60 avisos previos.
- Intro y transición en navegador: 77 comprobaciones correctas, incluyendo
  identidad del robot, puntero, arrastre táctil, scroll, audio, preferencias,
  datos parcialmente almacenados y bloqueo de reproducción automática.
- Carga/caché en navegador: 43 comprobaciones correctas. En segunda visita,
  los assets de escena se reutilizan sin transferencia de red.
- Cuarto y encuadres: 263 comprobaciones; continuidad de objetos: 125.
- Programar POO en 1440, 768 y 390 px: 50 comprobaciones correctas.
- Demo de todos los roles y APIs: 50 comprobaciones, incluidas 100 peticiones
  simultáneas que conservan la identidad de cuatro sesiones. Esto no demuestra
  capacidad de 100 usuarios sobre el backend real.
- Movimiento, audio, evento raro y recuperación: 116 pruebas unitarias.
- Recuperación 3D y audio del evento raro: pruebas en navegador correctas con
  fallos de red/GPU simulados, conservación del formulario y sin audio solapado.
- Ejecutores Java/Python aislados; 19 diagnósticos Python, 9 Java y 16 soluciones
  oficiales verificados. Afinidad de backend: 16 comprobaciones sintéticas.
- Políticas de precarga, calidad gráfica y actualización visible: correctas.

## Seguridad y límites pendientes

`npm audit --omit=dev` devuelve cero vulnerabilidades conocidas. La auditoría
completa mantiene nueve avisos en la cadena de herramientas de desarrollo
(Tailwind 3, ESLint y dependencias de patrones/selectores). No se ejecutó
`npm audit fix --force`: propone migraciones incompatibles. Requiere una tarea
separada de actualización con comparación visual y pruebas.

Railway sigue apagado. No se han comprobado los datos ni las sesiones del
backend real, la aplicación de Quest ni dispositivos físicos. Ninguna red o
GPU puede garantizar arranque instantáneo en todos los dispositivos. El audio
automático sigue sujeto al permiso del navegador.

## Desarrollo y reproducción

`npm run dev`, `npm run build` y `npm run demo` generan los assets automáticamente.
`runtime/` y el manifiesto `src/generated/intro-assets.json` son generados y están
excluidos de Git. `scripts/intro-index.template.html` es la fuente del HTML de
la escena; no editar su salida generada. Si se modifica código de la escena
con el servidor ya abierto, ejecutar `npm run build:intro` y recargar.

Con una demo local funcionando:

```powershell
npm run test:intro-performance
node scripts/verify-landing-intro-browser.mjs
node scripts/verify-poo-learning-browser.mjs
node --experimental-strip-types --test scripts/verify-loading-policy.mjs
```

`TEST_BASE_URL` permite señalar otro servidor exclusivamente local. Para comparar
velocidad usar `npm run build` y `npm start`, no el servidor de desarrollo; no
ejecutar otros navegadores de pruebas al mismo tiempo.

## Segunda auditoría de entrada — 18 de octubre de 2026

Esta sección es diagnóstico y propuesta; no se aplicaron nuevos cambios de
producto durante esta revisión. Se utilizó la compilación local de producción
en el puerto 3102, no el servidor de desarrollo. Las peticiones `/api/*` se
bloquearon para no contactar los servidores reales. Railway sigue apagado.

### Mediciones repetidas

Edge automatizado con GPU por software. Dos contextos nuevos por perfil;
cada uno se midió sin caché HTTP y después con caché. El perfil móvil utiliza
390 × 844, CPU limitada a 4×, 1,6 Mbps de bajada y 150 ms de latencia.
La caché de shaders del proceso/GPU no equivale a la caché HTTP del contexto.

| Perfil | Sin caché HTTP: escena lista | Con caché: escena lista |
| --- | --- | --- |
| PC, 1365 × 768 | 3.719 ms / 1.092 ms | 1.001 ms / 1.143 ms |
| Móvil simulado | 6.551 ms / 6.513 ms | 2.360 ms / 2.398 ms |

El primer arranque del navegador presenta un coste adicional en PC: no debe
atribuirse toda esa diferencia al código ni anunciarse como una mejora.
En móvil el primer contenido aparece a los 1.860 / 1.896 ms sin caché y
372 / 372 ms con caché. «Contenido visible» no significa «animación lista».

### Hallazgos comprobados

1. **La escena aún espera el arranque React de la portada.** En móvil sin
   caché, sus assets empiezan alrededor de 1.100 ms, pero el iframe se solicita
   a los 4.200 ms. Hay descarga y ejecución de la aplicación compitiendo con
   el motor. No toda esa diferencia es trabajo de CPU: también hay espera de
   red. La escena puede prepararse antes de hidratar toda la portada.
2. **Fuentes:** se descargan tres WOFF2, 180.148 bytes en total. Los textos
   inspeccionados utilizan Nunito como primera familia. GeistSans y GeistMono
   suman 141.020 bytes y no necesitan precarga global para esta entrada.
   Se deben conservar disponibles en las rutas que sí los utilicen.
3. **JavaScript de aplicación:** se observan 723.856 bytes descomprimidos
   (aproximadamente 232 KB transferidos con gzip), aparte de los 686.862 bytes
   descomprimidos del motor de la intro. El analizador atribuye unos 145 KB
   descomprimidos a Framer Motion + motion-dom en el grafo cliente de la ruta.
   No todo módulo alcanzable se descarga inicialmente: el bloque de
   Three.js/React Three Fiber de autenticación ya es asíncrono, no debe
   contabilizarse como una descarga inicial adicional de la portada.
4. **CSS compartido:** los tres estilos iniciales suman 229.848 caracteres;
   la cobertura de reglas al primer fotograma registra 22.253 utilizados.
   Es una oportunidad para separar estilos por ruta, no una autorización para
   eliminar automáticamente el resto: se necesitan en otras pantallas/estados.
5. **Preparación gráfica:** aparecen tareas de unos 480–650 ms construyendo
   la escena y de unos 615–685 ms en el primer render en el perfil móvil.
   El perfil de CPU y la instrumentación WebGL localizan espera en programas
   gráficos. Los objetos de capítulos posteriores y cuatro texturas de
   diagramas de 1024 × 640 se crean antes de que sean necesarios.
6. **Audio:** el MP3 pesa 481.581 bytes para 20 segundos. Conviene probar una
   versión de menor bitrate sin cambiar su duración ni su sincronización.

### Experimento descartado

Se comparó `renderer.debug.checkShaderErrors = false` únicamente interceptando
el JavaScript en el navegador de prueba, sin modificar fuentes ni bundles.
En la prueba comparable, el primer fotograma fue 1.693 / 1.698 ms sin
comprobaciones y 1.693 ms con ellas. El primer ensayo de control, 3.504 ms,
tenía el coste de arranque en frío del navegador. Las esperas de consultas
de logs se desplazaron a otras consultas WebGL. No hay una aceleración
demostrada que justifique presentarlo como solución principal.

### Orden recomendado para una siguiente implementación

1. Dar prioridad real al bootstrap de la intro antes de hidratar toda la
   portada; conservar preferencias, SSR y la misma instancia del robot.
2. Limitar las fuentes precargadas a las necesarias y dividir CSS de
   autenticación/paneles fuera de la ruta pública, con comparación visual.
3. Reducir el límite cliente de la portada y usar LazyMotion/carga diferida
   de funcionalidades fuera de pantalla sin retirar animaciones.
4. Construir objetos posteriores por etapas antes de cada capítulo y preparar
   shaders/texturas durante las descargas existentes. `compileAsync` evita
   bloqueos innecesarios, pero no elimina el trabajo de compilación.
5. Probar compresión del audio y una copia optimizada del GLB con glTF Transform;
   elegir por tiempo total de descarga + decodificación, no solo por tamaño.
   No usar cuantización sobre el robot sin adaptar y verificar su articulación:
   actualmente se editan directamente los arrays de posiciones y normales.

No se recomienda migrar de motor a WebGPU, añadir un framework de animación,
un service worker global o convertir la intro a vídeo como primer paso.
Esas opciones amplían riesgos y no corrigen primero los costes observados.

Documentación primaria consultada:

- https://nextjs.org/docs/app/guides/package-bundling
- https://nextjs.org/docs/app/guides/lazy-loading
- https://nextjs.org/docs/app/api-reference/components/font
- https://motion.dev/docs/react-reduce-bundle-size
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- https://web.dev/articles/fetch-priority
- https://web.dev/articles/optimize-long-tasks
- https://gltf-transform.dev/modules/functions/functions/meshopt

Los resultados son de laboratorio local, no de un celular físico ni de Vercel.
No predicen un tiempo garantizado para todos los dispositivos y conexiones.

## Implementación de las prioridades 1 y 2

- Bootstrap mínimo en el HTML del encabezado. Precarga motor/modelo con
  prioridad alta y activa el iframe ya existente mientras se descarga React.
  No crea un segundo robot ni reemplaza el iframe al hidratar.
- La señal de escena preparada se conserva hasta que los controles toman el
  relevo. Un saludo autenticado por origen y ventana permite recuperar la
  señal si ya ocurrió, también en navegación cliente y en Strict Mode.
- El audio sigue esperando a la escena y al búfer necesario. Se eliminó la
  competencia entre el atributo `autoplay` y las llamadas explícitas a `play()`:
  ahora hay una sola ruta de reproducción que maneja el permiso del navegador.
- Si la preferencia cambia antes de hidratar, se cancela la escena preparada,
  se retira la capa y se descarga el documento del iframe para liberar su GPU.
- Solo se precarga Nunito. Geist Sans/Mono conservan los mismos archivos,
  variables y configuraciones, pero se descargan únicamente al usarse.
  La entrada evita así 141.020 bytes de fuentes adicionales.
- Los estilos del panel se importan desde AppShell y los de portada desde su
  página. No se eliminaron reglas heredadas sin comprobar todas sus rutas.
- No se añadieron dependencias ni se cambiaron duración, objetos o animaciones.

### Resultado observado, mismo perfil móvil de laboratorio

| Estado | Escena preparada, sin caché | Reproducción iniciada, sin caché | Reproducción con caché |
| --- | --- | --- | --- |
| Antes, auditoría | 6.513 / 6.551 ms | 6.560 / 6.580 ms | 2.404 / 2.440 ms |
| Arranque adelantado | 5.567 ms | 5.613 ms | 2.533 ms |
| Con prioridades explícitas | 5.667 ms | 5.723 ms | 2.488 ms |

La mejora observada en primera visita es de alrededor del 13–15 %. Las
prioridades explícitas por sí solas no muestran un beneficio aislado en esta
muestra; la mejora procede del conjunto (inicio adelantado, fuentes y CSS).
La segunda visita no presenta una mejora demostrada y sigue cerca de 2,4–2,5 s.
En PC persiste la variabilidad del arranque de navegador/GPU; no se atribuye una
mejora fiable a estos cambios. No son resultados de campo ni garantías.

Verificación de esta implementación:

- Compilación de producción: 61 rutas, TypeScript correcto.
- ESLint de los archivos cambiados: sin errores.
- Políticas y bootstrap: 3 pruebas unitarias.
- Bootstrap con JavaScript de Next retenido: 12 comprobaciones en navegador,
  incluida adopción sin recarga, cancelación de preferencia y fuente única.
- Intro completa: 77 comprobaciones, sonido/permisos, pausa, 20 segundos,
  identidad del robot, transformación final, scroll, puntero y arrastre táctil.
- Rendimiento y caché: 43 comprobaciones; se registra por separado el momento
  de escena preparada y el inicio efectivo de reproducción.
- Programar POO: 50 comprobaciones en 1440, 768 y 390 px tras separar CSS.

Reproducir el relevo antes de hidratación con `npm run test:intro-bootstrap`.
Los cambios permanecen locales, sin commit, push ni despliegue. Railway y la
base de datos no se han encendido; Render no se ha modificado.

## Apertura de marca solicitada

El mensaje visible de preparación se sustituye por dos paneles CSS beige de
distinto tono, ligeramente superpuestos y con esquinas redondeadas. El isotipo
original queda centrado en la pantalla, sin texto, y viaja con el panel superior.
El centro del icono coincide exactamente con el borde inferior del panel superior:
la mitad inferior del icono queda sobre el panel de abajo, como en el boceto.
Su recorrido de salida incluye el alto del icono para que no quede recortado
en el borde superior al terminar.

El bloqueo de scroll se aplica también antes de hidratar mediante el estado
del contenedor de escena. Así se elimina la franja de la barra nativa desde el
primer fotograma, sin dejar el documento bloqueado después de omitir o terminar.
La cobertura de viewport se comprueba en 1365 × 768, 390 × 844, 320 × 568 y
844 × 390, además de una carga con el JavaScript de Next retenido.
Mientras cargan los assets la marca permanece visible; cuando escena y audio
están preparados, los paneles se abren en direcciones opuestas durante 1 segundo
con `cubic-bezier(.87, 0, .13, 1)`. No se incorporan librerías ni recursos remotos.

Los paneles cubren la espera real de los assets. El reloj visual y el audio se
mantienen a cero durante la carga y arrancan juntos en `animationstart`, justo
cuando comienza la apertura de un segundo. La película dura 20 segundos, incluida
esa apertura; retirar los paneles no reinicia ni pausa la reproducción.
Omitir, fallos de carga, pausa, cambio de preferencias y movimiento reducido
mantienen su salida segura. Se retiran los paneles y sus capas de composición
al completar o cancelar la apertura.

`npm run test:intro-curtain` verifica ambos paneles, marca, duración, direcciones,
espera del sonido, comienzo de la película y salida limpia en PC y celular.
