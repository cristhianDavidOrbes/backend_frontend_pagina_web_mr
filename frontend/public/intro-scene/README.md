# Escena continua de AlgoLab

Esta escena conserva la animación aprobada de `algolab-corto-demo`: cuarto, puerta, carro, controles, libros y código. El cierre no usa un video ni una segunda mascota. El mismo objeto `robot.root`, sus geometrías y el mismo renderizador pasan a la landing y permanecen activos después de los 20 segundos.

`src/film.js` recibe un reloj visual desde la página principal y objetivos normalizados calculados a partir de `.hero-stage`. `src/landing-robot.js` mueve el mismo protagonista hacia esa posición, con la trayectoria y tiempos del cierre original. La cámara se adapta a la orientación sin recargar el documento ni el modelo. La capa del cuarto se desvanece; el resto del lienzo queda transparente.

La interfaz final se ensambla con nodos del DOM real a través de `src/lib/landing-assembly.ts` del frontend. Título, navegación y botones mantienen sus medidas y tipografía reales. En celular, el personaje termina arriba del texto. No se recorta una captura horizontal ni se encoje un recuadro de video.

El puente `postMessage` verifica origen y ventana de procedencia en ambos lados. No maneja cuentas, tokens ni datos académicos. La escena y la pista esperan su carga antes de arrancar juntas con sonido al 65 %; el audio marca el tiempo durante la reproducción. Si el navegador impide el audio automático, la escena continúa con reloj visual y ofrece activarlo con un toque. Al terminar, la misma escena pasa de capa fija a capa absoluta de la landing: el robot se desplaza con el documento, no se queda pegado a la pantalla al hacer scroll.

## Activos y licencias

- Robot y marca: activos de AlgoLab aportados por el proyecto.
- Three.js y cargadores: MIT, ver `assets/vendor/LICENSE`.
- Paisaje: **Cloudy Green Hills**, Ahmad_KH, CC0; procedencia en `assets/landscape/LICENSE.md`. El JPG está optimizado para la web y su paleta se ajusta en el material de la ventana.
- Música y efectos por objeto: generación existente en ElevenLabs, servida por separado en `/media/intro/algolab-soundtrack.mp3`.

El código del robot de autenticación no se modifica. Si no hay WebGL o falla la escena, la landing conserva su alternativa habitual y no bloquea el acceso.
