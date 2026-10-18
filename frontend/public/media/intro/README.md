# AlgoLab — entrada de 20 segundos

- `algolab-intro-landscape.mp4`: 1280 × 720, H.264 + AAC, 20 segundos.
- `algolab-intro-portrait.mp4`: 720 × 1280, cámara vertical propia, no un recorte del horizontal.
- Los MP4 y JPG se conservan como exportaciones de referencia. La landing ya no los reproduce: usa la escena 3D persistente de `/intro-scene/index.html`.
- `algolab-soundtrack.mp3` contiene la música y los efectos. El reloj visual funciona aunque el navegador no permita reproducir audio automáticamente.
- El cierre conserva el montaje del video aprobado: se forma la interfaz real y el mismo personaje continúa en ella, sin sustituirlo por otro modelo ni encoger un recuadro.
- Música y efectos por objeto: piezas generadas previamente en ElevenLabs para esta demo.
- Modelo y marca: activos de AlgoLab aportados al proyecto.
- Paisaje de la ventana: **Cloudy Green Hills**, Ahmad_KH, CC0-1.0, https://opengameart.org/content/cloudy-green-hills (paleta adaptada mediante material en el render).

Origen editable de las exportaciones: proyecto local `algolab-corto-demo`. La implementación web actual y sus licencias están documentadas en `/intro-scene/README.md`. Los anclajes de la escena se calculan en tiempo real; el JSON de proyección de la integración anterior no se usa en el renderizado actual.

## Preferencias

`algolab:intro:seen` y `algolab:intro:preference` se guardan en localStorage del navegador. No contienen identificadores de dispositivo ni se sincronizan con la cuenta. El valor visto no se reinicia al cambiar de usuario ni al actualizar el video. Las preferencias son `once` (predeterminada), `always` y `never`. `/?intro=preview` permite una vista explícita sin cambiar la preferencia.

Se omite con reducción de movimiento, ahorro de datos o almacenamiento inaccesible; el ahorro de datos permite una vista explícita, la reducción de movimiento no. Errores de medios y esperas de carga prolongadas dejan accesible la página. El sonido comienza silenciado y requiere un gesto para activarse.

## Verificación local

```sh
node --experimental-strip-types --test scripts/verify-landing-intro.mjs
node scripts/verify-landing-intro-browser.mjs
```

La prueba de navegador espera el servidor de demostración en `http://127.0.0.1:3100` (o `TEST_BASE_URL`) y usa exclusivamente sus cuentas ficticias en memoria. No ejecutarla contra producción.
