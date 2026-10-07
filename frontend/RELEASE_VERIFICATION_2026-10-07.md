# Verificación del frontend — 7 de octubre de 2026

## Alcance

Frontend autoritativo de AlgoLab, con el diseño, los estilos, las animaciones y el robot existentes conservados. La historia comprobada es: resultados HTTP equivalentes a los que envía Unity → backend Java → base de datos efímera → handlers del frontend → datos para estudiante, docente y administrador. No se modificaron usuarios reales ni se realizaron pruebas de carga sobre Render.

## Correcciones

- Las respuestas tardías de una sesión anterior ya no cierran la sesión nueva ni incorporan datos del otro usuario.
- Los layouts validan el rol actual; no reutilizan los permisos de un perfil anterior.
- Progreso e informes se muestran únicamente para el usuario actual. La vista de docente conserva el estudiante seleccionado y comprueba la identidad del progreso recibido.
- Las peticiones al backend tienen cancelación y un límite de 85 segundos, inferior al límite del cliente de 90 segundos. Un cuerpo interrumpido o un HTTP 200 con HTML se convierte en error explícito, no en éxito vacío.
- Progreso, informes, usuarios, niveles y ranking se actualizan sin reiniciar el diseño. Los nuevos refrescos de docente, administrador y ranking usan intervalos de 30 segundos, pausa al ocultar la página, reanudación por foco/conectividad, limpieza y ausencia de solicitudes solapadas. Los errores conservan los últimos datos confirmados y los formularios sin guardar.
- Un fallo al cargar la configuración del tutor muestra el error y permite reintentar; ya no queda oculto por un indicador de carga infinito.
- Los identificadores de las rutas dinámicas de usuarios y niveles se validan antes de acceder al backend.
- La herramienta de diagnóstico de compiladores resuelve sus imports TypeScript en Node. La demostración local cierra y espera sus procesos secundarios, evitando servidores huérfanos y conflictos entre pruebas.

## Evidencias

| Prueba | Resultado observado | Límite de la evidencia |
| --- | --- | --- |
| Compilación de producción | Next 16.3.6, TypeScript y 59 rutas correctas | No sustituye una revisión visual en gafas/navegador |
| Instalación reproducible | `npm ci` correcto con el lockfile actualizado; compilación y regresiones repetidas después | Node local 24.21.0; no es comprobación del despliegue final |
| `test:release-api` | 265 comprobaciones correctas, incluidas 100 solicitudes concurrentes con identidades sintéticas distintas | Harness de handlers y componentes con mocks; no son 100 usuarios reales navegando |
| `verify-release-java-proxy.mjs --local-java-verification` | 75 comprobaciones correctas con NextResponse real y Java/H2 real; 40 lecturas concurrentes sin mezcla de JWT | Handlers importados en proceso; no se inició servidor Next ni navegador |
| Sincronización con Java local | Niveles 1–4 completados, 360 puntos, contador absoluto de 250 s y cuatro informes visibles para alumno/docente/administrador | Datos sintéticos, IA externa desactivada; no prueba generación real con un proveedor de IA |
| Permisos HTTP reales | 401 sin sesión, 403 para alumno que solicita datos de personal u otro alumno | Base de datos efímera aislada |
| Compiladores | 19 errores Python, 9 errores Java y 16 soluciones oficiales comprobados | Casos del motor de diagnóstico |
| `verify-1000-tests.mjs` | 1.143 casos correctos | Diagnóstico sintético, no cobertura completa del producto |
| Ejecución de código | Java/Python en workers aislados, sin acceso a sesión y con terminación dura | No se comparte memoria entre el ejecutor y la aplicación |
| Refresco visible | Pausa, reanudación, no solapamiento, limpieza y reintento comprobados | Prueba automatizada de la lógica del refresco |
| ESLint de fuentes modificadas | Cero errores; un aviso previo por variable no usada en la página de código | El lint completo incluye avisos previos de scripts sintéticos |
| `git diff --check` | Sin errores | No equivale a revisión visual |

La demostración HTTP local obtuvo 50/50 comprobaciones, incluidas 100 solicitudes simultáneas de cuatro sesiones, tanto antes como después del parche de dependencias y de `npm ci`. Cerró sus procesos al finalizar. Usa un backend simulado y no debe confundirse con el ensayo Java real.

Los dos scripts antiguos de un millón de pruebas pasaron antes del parche. Sus casos son variaciones sintéticas de diagnóstico; no se presentan como dos millones de escenarios independientes del juego o de la web.

## Dependencias y seguridad

Se fijaron Next y eslint-config-next en 16.3.6, sin migración de versión mayor. El lockfile actualiza sharp a 0.35.5, source-map-js a 1.2.2 y otras transitivas compatibles.

La auditoría de dependencias de producción pasó de cuatro paquetes vulnerables a **cero avisos**. La auditoría completa conserva **nueve paquetes señalados: siete altos y dos moderados**, todos en herramientas de desarrollo dependientes de `braces` y `postcss-selector-parser`. No se utilizó `npm audit fix --force` ni se migró Tailwind a la versión 4, lo que supondría un cambio mayor y podría alterar el diseño.

Fuentes primarias/revisadas:

- [Next ImageResponse, parche 16.3.6](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). El aviso requiere entrada atacante en generación SVG con next/og; no se encontró ese uso en el código de AlgoLab.
- [Next en servidores Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36) y [optimización AVIF](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).
- [sharp, parche 0.35.5](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
- [source-map-js, parche 1.2.2](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) y [baseline-browser-mapping](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv).
- [braces: aún sin parche oficial](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- [postcss-selector-parser: parche 7.1.6](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). El aviso distingue el procesamiento de selectores no confiables en solicitudes del uso normal durante compilación de fuentes confiables.

## Pendientes y límites

- El inicio de un servidor Next de producción fue rechazado por la política de ejecución. No se repitió con otro lanzador. La prueba completa navegador → servidor Next de producción → Java permanece pendiente; se verificó por separado Next HTTP con backend simulado y handlers → Java real.
- Render, PostgreSQL de producción, el proveedor real de IA, latencia de red y las gafas físicas deben tener su comprobación final de lanzamiento. Los tiempos locales de H2 no predicen la capacidad o latencia de Render.
- No hay una garantía técnica de funcionamiento en el 100 % de ocasiones. Las pruebas comprueban los casos descritos; no eliminan fallos de Internet, dispositivos, recursos del alojamiento o servicios externos.
- Este informe no acredita publicación o despliegue: los cambios del frontend deben publicarse y comprobarse en el entorno final por el responsable de la entrega.
