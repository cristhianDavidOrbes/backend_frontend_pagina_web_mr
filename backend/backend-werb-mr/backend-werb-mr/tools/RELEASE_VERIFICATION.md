# Verificación aislada del backend

Estas herramientas usan el backend Spring real y H2 en memoria. No contactan
Render ni PostgreSQL; tampoco envían correo/SMS ni llaman a un modelo de IA.

## Ejecutar

Con Java 21 configurado, desde la carpeta del backend:

```powershell
.\gradlew.bat test bootJar --console=plain
.\gradlew.bat --init-script tools/verification-server.init.gradle runReleaseVerification --console=plain
```

El segundo comando deja el servidor vivo en `127.0.0.1:18080`. Esperar el mensaje
`ALGOLAB_RELEASE_VERIFICATION_READY` y, en otra terminal, ejecutar:

```powershell
node tools/verify-real-http.mjs
```

El script tiene el destino loopback fijo. Genera 20 cuentas propias con dominio
`example.test`, prueba 10 recorridos simultáneos y guarda exclusivamente métricas
y resultados no secretos en `tools/real-http-results.json`. Los JWT nunca se
imprimen ni se guardan en el informe. Las tres fixtures de roles y su contraseña
son datos ficticios definidos en `ReleaseVerificationServer`; no son cuentas de
producción.

## Cobertura HTTP real

- Contraseña, emisión de JWT, 401, 403, roles actuales y revocación de permisos.
- Confirmación ordenada de los cuatro niveles, puntos, tiempo, perfil y ranking.
- Reintentos idempotentes junto a consultas concurrentes de informes.
- PUT de un informe sintético con versión confirmada, persistencia y rechazo 409
  de un informe obsoleto; esto comprueba el contrato, no la generación de IA.
- Separación de cuentas en progreso, informes y vista docente.
- Eliminación administrativa de una cuenta propia con relaciones, sin afectar
  otra cuenta.

Apagar el servidor al terminar descarta la base efímera. El lanzador auxiliar
está en `src/test`, por lo que no se incluye en el JAR publicado.

## Límites de la evidencia

Las latencias corresponden a la máquina local y a H2. No acreditan capacidad de
Render/PostgreSQL ni disponibilidad permanente de internet, Ollama, ElevenLabs
o las gafas. Los resultados no justifican una garantía de funcionamiento del
100 % ni sustituyen una prueba de despliegue y dispositivo reales.
