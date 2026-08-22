# Backend AlgoLab

Backend hecho con Spring Boot para manejar usuarios, autenticacion con JWT, descripciones de niveles y progreso de estudiantes.

## Resumen

El backend expone una API REST bajo `/api`. La autenticacion se hace con JWT:

```http
Authorization: Bearer <token>
```

El token solo se devuelve despues de verificar el segundo factor en:

```http
POST /api/usuarios/segundo-factor/verificar
```

Todas las cuentas deben usar un correo cuyo dominio sea exactamente
`@campusucc.edu.co`. El inicio de sesion crea un desafio de un solo uso y nunca
devuelve el JWT junto con la respuesta de credenciales.

El registro publico solo permite crear usuarios con rol `ESTUDIANTE`. Los usuarios `DOCENTE` y `ADMINISTRADOR` se crean desde el CRUD de usuarios usando una cuenta administradora.

El progreso del juego se guarda solo para usuarios autenticados. El modo invitado de Unity no usa endpoints del backend y no guarda progreso.

Al arrancar la aplicacion se crea un administrador inicial si no existe:

```txt
Nombre: Cristhian David
Correo: administrador@campusucc.edu.co
Contrasena: la definida localmente en `ADMIN_CONTRASENA`
Rol: ADMINISTRADOR
```

Estos valores se pueden cambiar con variables de entorno:

```properties
ADMIN_NOMBRE
ADMIN_CORREO
ADMIN_CONTRASENA
```

## Roles

Roles disponibles:

```txt
ESTUDIANTE
DOCENTE
ADMINISTRADOR
```

Reglas principales:

- `ESTUDIANTE`: puede consultar y actualizar solo su propio usuario.
- `DOCENTE`: puede listar y consultar usuarios. Tambien puede consultar niveles.
- `ADMINISTRADOR`: puede gestionar usuarios y niveles.
- Un administrador no puede eliminar su propia cuenta.
- Un administrador no puede quitarse a si mismo el rol `ADMINISTRADOR`.

## Endpoints

### Usuarios y autenticacion

| Metodo | Endpoint | Acceso | Body |
|---|---|---|---|
| `POST` | `/api/usuarios/iniciar-sesion` | Publico | Si |
| `POST` | `/api/usuarios/segundo-factor/verificar` | Publico | Si |
| `POST` | `/api/usuarios/segundo-factor/reenviar` | Publico | Si |
| `POST` | `/api/usuarios/registrar` | Publico, solo crea `ESTUDIANTE` | Si |
| `GET` | `/api/usuarios/me` | Usuario autenticado | No |
| `GET` | `/api/usuarios/perfil` | Usuario autenticado | No |
| `GET` | `/api/usuarios` | `DOCENTE`, `ADMINISTRADOR` | No |
| `GET` | `/api/usuarios/{id}` | `DOCENTE`, `ADMINISTRADOR`, o el mismo usuario | No |
| `POST` | `/api/usuarios` | `ADMINISTRADOR` | Si |
| `PUT` | `/api/usuarios/{id}` | `ADMINISTRADOR`, o el mismo usuario | Si |
| `PATCH` | `/api/usuarios/{id}` | `ADMINISTRADOR`, o el mismo usuario | Si |
| `DELETE` | `/api/usuarios/{id}` | `ADMINISTRADOR`, excepto su propia cuenta | No |

Body para iniciar sesion (correo institucional obligatorio):

```json
{
  "correo": "estudiante@campusucc.edu.co",
  "contrasena": "tu-contrasena-segura",
  "canal": "CORREO"
}
```

`canal` es opcional y por defecto usa `CORREO`. Puede ser `SMS` solamente si la
cuenta tiene un celular E.164 registrado y las credenciales reales de Twilio
estan configuradas. No existe un modo SMS simulado.

Respuesta `202 Accepted` (todavia sin JWT):

```json
{
  "exitoso": true,
  "requiereSegundoFactor": true,
  "mensaje": "Enviamos un codigo de acceso a tu correo institucional",
  "desafioId": "uuid-del-desafio",
  "canal": "CORREO",
  "destinoEnmascarado": "es***e@campusucc.edu.co",
  "expiraEnSegundos": 300,
  "reenvioDisponibleEnSegundos": 60
}
```

Verificar el codigo:

```http
POST /api/usuarios/segundo-factor/verificar
Content-Type: application/json
```

```json
{
  "desafioId": "uuid-del-desafio",
  "codigo": "123456"
}
```

Solo esta verificacion correcta devuelve el JWT:

```json
{
  "exitoso": true,
  "mensaje": "Inicio de sesion verificado correctamente",
  "token": "jwt-generado",
  "usuario": {
    "id": 1,
    "nombre": "Estudiante",
    "correo": "estudiante@campusucc.edu.co",
    "nombreUsuario": "estudiante",
    "rol": "ESTUDIANTE",
    "nivelActual": 1,
    "puntaje": 0
  }
}
```

El codigo se guarda solo como hash BCrypt, expira en cinco minutos, permite
cinco intentos, es de un solo uso e invalida desafios anteriores. Para reenviar:

```http
POST /api/usuarios/segundo-factor/reenviar
Content-Type: application/json
```

```json
{
  "desafioId": "uuid-del-desafio"
}
```

El reenvio tiene un cooldown predeterminado de 60 segundos, conserva el mismo
`desafioId` e invalida inmediatamente el codigo anterior.

Respuesta de usuario autenticado:

```http
GET /api/usuarios/me
Authorization: Bearer <token>
```

```json
{
  "id": 1,
  "nombre": "Cristhian David",
  "correo": "estudiante@campusucc.edu.co",
  "nombreUsuario": "cristhian.david",
  "rol": "ESTUDIANTE",
  "nivelActual": 1,
  "puntaje": 0
}
```

Body para registro publico:

```json
{
  "nombre": "Juan Perez",
  "correo": "juan@campusucc.edu.co",
  "rol": "ESTUDIANTE",
  "contrasena": "123456",
  "celular": "+573001234567"
}
```

Nota: este endpoint no devuelve token. El usuario debe iniciar sesion despues de registrarse.

`celular` es opcional, pero si se envia debe usar formato internacional E.164.
Al registrar usuarios nuevos, el backend genera `nombreUsuario` automaticamente a partir de la parte inicial del correo. Por ejemplo, `juan@campusucc.edu.co` genera `juan`. Si ya existe, agrega un numero al final para mantenerlo unico.

Body para crear usuario como administrador:

```json
{
  "nombre": "Maria Docente",
  "correo": "maria@campusucc.edu.co",
  "rol": "DOCENTE",
  "contrasena": "123456"
}
```

Body para actualizar usuario:

```json
{
  "nombre": "Maria Actualizada",
  "correo": "maria.actualizada@campusucc.edu.co",
  "rol": "ADMINISTRADOR",
  "nivelActual": 1,
  "puntaje": 0
}
```

Notas:

- `rol` solo lo puede cambiar un `ADMINISTRADOR`.
- Un usuario no administrador no puede cambiar su correo desde este endpoint
  legado; ese cambio requiere un flujo de verificacion dedicado.
- Si un usuario no administrador manda `rol`, el backend no lo aplica.
- El administrador autenticado no puede cambiar su propio rol a `DOCENTE` o `ESTUDIANTE`.
- `nivelActual` debe estar entre `1` y `5`.
- `puntaje` es un numero entero.

Body para actualizar solo progreso resumido del usuario:

```http
PATCH /api/usuarios/{id}
Authorization: Bearer <token>
```

```json
{
  "nivelActual": 2,
  "puntaje": 200
}
```

### Progreso del juego

Estos endpoints estan pensados para Unity. Siempre usan el usuario autenticado por JWT; no se debe enviar `usuarioId` en el body.

| Metodo | Endpoint | Acceso | Body |
|---|---|---|---|
| `GET` | `/api/progreso/me` | Usuario autenticado | No |
| `POST` | `/api/progreso` | Usuario autenticado | Si |

Consultar progreso:

```http
GET /api/progreso/me
Authorization: Bearer <token>
```

Respuesta cuando no hay progreso guardado:

```json
{
  "usuarioId": 1,
  "nivelActual": 1,
  "puntajeTotal": 0,
  "niveles": []
}
```

Respuesta con progreso:

```json
{
  "usuarioId": 1,
  "nivelActual": 2,
  "puntajeTotal": 100,
  "niveles": [
    {
      "nivel": 1,
      "completado": true,
      "puntaje": 100,
      "tiempoRestante": 80,
      "intentos": 1
    }
  ]
}
```

Guardar o actualizar progreso:

```http
POST /api/progreso
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nivel": 1,
  "completado": true,
  "puntaje": 100,
  "tiempoRestante": 80,
  "intentos": 1
}
```

Reglas:

- `nivel` debe ser mayor o igual a `1`.
- `puntaje`, `tiempoRestante` e `intentos` no pueden ser negativos.
- Si el progreso del nivel no existe, se crea.
- Si el progreso del nivel ya existe, se actualiza.
- Si el usuario repite un nivel, se conserva el mayor puntaje y el mayor tiempo restante.
- Si el usuario completa un nivel, se recalcula `puntajeTotal` sumando niveles completados.
- Si el usuario completa un nivel, `nivelActual` avanza al siguiente nivel sin pasar del ultimo nivel disponible.
- Sin token JWT, el backend responde como no autorizado.

### Niveles

| Metodo | Endpoint | Acceso | Body |
|---|---|---|---|
| `GET` | `/api/niveles` | `DOCENTE`, `ADMINISTRADOR` | No |
| `GET` | `/api/niveles/{id}` | `DOCENTE`, `ADMINISTRADOR` | No |
| `POST` | `/api/niveles` | `DOCENTE`, `ADMINISTRADOR` | Si |
| `PUT` | `/api/niveles/{id}` | `DOCENTE`, `ADMINISTRADOR` | Si |
| `DELETE` | `/api/niveles/{id}` | `DOCENTE`, `ADMINISTRADOR` | No |

Body para crear nivel:

```json
{
  "nombre": "Nivel Basico",
  "descripcion": "Descripcion del nivel basico",
  "nivel": 1,
  "objetivo": "Resolver ejercicios introductorios",
  "activo": true
}
```

Body para actualizar nivel:

```json
{
  "nombre": "Nivel Intermedio",
  "descripcion": "Descripcion actualizada del nivel",
  "nivel": 2,
  "objetivo": "Resolver problemas con mayor dificultad",
  "activo": true
}
```

Campos obligatorios:

```txt
nombre
descripcion
nivel
```

Campos opcionales:

```txt
objetivo
activo
```

## Dependencias principales

Dependencias de produccion:

- Java 21
- Spring Boot 4.0.5
- Spring Web MVC
- Spring Data JPA
- Spring Security
- Spring OAuth2 Resource Server
- Spring JSON
- Spring Mail
- Jackson Databind
- PostgreSQL Driver
- MapStruct 1.6.3
- Spring Boot DevTools

Dependencias de pruebas:

- JUnit Platform
- Spring Boot Data JPA Test
- Spring Boot Security Test
- Spring Boot Web MVC Test
- Spring Boot OAuth2 Resource Server Test

## Configuracion

Variables usadas por `application.properties`:

```properties
DB_URL=jdbc:postgresql://localhost:5432/postgres
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=clave-super-secreta-para-firmar-tokens-jwt-de-desarrollo
JWT_EXPIRACION_MS=86400000
ADMIN_NOMBRE=Cristhian David
ADMIN_CORREO=administrador@campusucc.edu.co
ADMIN_CONTRASENA=define-una-contrasena-segura
SMTP_HOST=smtp.proveedor.edu
SMTP_PORT=587
SMTP_USERNAME=usuario-smtp
SMTP_PASSWORD=contrasena-smtp
SMTP_FROM=algolab@campusucc.edu.co
SMTP_FROM_NAME=AlgoLab
DOS_FA_EXPIRATION_SECONDS=300
DOS_FA_RESEND_COOLDOWN_SECONDS=60
DOS_FA_MAX_ATTEMPTS=5
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

SMTP es obligatorio para usar el canal `CORREO`. Si falta la configuracion o el
proveedor falla, el backend responde `503 Service Unavailable`; nunca registra
ni incluye el codigo en la respuesta. Las tres variables Twilio son obligatorias
para habilitar `SMS`; si falta una, ese canal responde 503.

En Railway tambien se soporta `DATABASE_URL` con formato:

```txt
postgresql://usuario:contrasena@host:puerto/base_de_datos
```

Si `DATABASE_URL` existe, el backend la convierte internamente a `spring.datasource.url`, `spring.datasource.username` y `spring.datasource.password`. Esto evita que el despliegue use el valor local por defecto `localhost:5432`.

## Despliegue en Railway

El backend esta preparado para desplegarse como un servicio Java/Spring Boot en Railway.

Configuracion del servicio:

```txt
Root Directory: /backend/backend-werb-mr/backend-werb-mr
Config File: /backend/backend-werb-mr/backend-werb-mr/railway.json
```

El despliegue usa el `Dockerfile` del backend. Ese Dockerfile compila con Gradle, copia el JAR como `/app/app.jar` y arranca con:

```txt
java -Dserver.port=${PORT:-8080} -jar app.jar
```

Pasos:

1. Crear un proyecto en Railway.
2. Agregar una base de datos PostgreSQL al proyecto.
3. Crear un servicio desde el repositorio de GitHub.
4. Configurar el `Root Directory` con la ruta indicada arriba.
5. En el servicio del backend, agregar estas variables:

```properties
JWT_SECRET=valor-largo-y-seguro
ADMIN_NOMBRE=Nombre Admin
ADMIN_CORREO=administrador@campusucc.edu.co
ADMIN_CONTRASENA=contrasena-segura
SMTP_HOST=smtp.proveedor.edu
SMTP_PORT=587
SMTP_USERNAME=usuario-smtp
SMTP_PASSWORD=contrasena-smtp
SMTP_FROM=algolab@campusucc.edu.co
```

6. Asegurar que el servicio del backend tenga acceso a las variables de PostgreSQL.

Railway puede exponer `DATABASE_URL`. El backend tambien acepta las variables de PostgreSQL que Railway expone en el servicio de base de datos (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). Si prefieres configurarlo manualmente, puedes usar:

```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://host:puerto/base_de_datos
SPRING_DATASOURCE_USERNAME=usuario
SPRING_DATASOURCE_PASSWORD=contrasena
```

Importante: no dejes `DB_URL` o `SPRING_DATASOURCE_URL` apuntando a `localhost` en Railway. Si existe `DATABASE_URL`, el backend la prioriza cuando detecta valores locales.

Despues del despliegue, genera un dominio publico para el backend y usa esa URL en el frontend como `API_BASE_URL`.

### Pruebas post-despliegue

Usa la URL publica de Railway, por ejemplo:

```txt
https://backendfrontendpaginawebmr-production.up.railway.app
```

Login:

```http
POST /api/usuarios/iniciar-sesion
Content-Type: application/json
```

```json
{
  "correo": "administrador@campusucc.edu.co",
  "contrasena": "tu-contrasena-segura",
  "canal": "CORREO"
}
```

Con el `desafioId` recibido, verifica el codigo enviado. Usa el JWT retornado por
`/api/usuarios/segundo-factor/verificar` en las solicitudes siguientes:

```http
GET /api/usuarios/me
Authorization: Bearer <token>
```

```http
GET /api/progreso/me
Authorization: Bearer <token>
```

Guardar progreso:

```http
POST /api/progreso
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nivel": 1,
  "completado": true,
  "puntaje": 100,
  "tiempoRestante": 80,
  "intentos": 1
}
```

## Comandos

Ejecutar pruebas:

```bash
./gradlew test
```

En Windows:

```powershell
.\gradlew.bat test
```

Compilar:

```powershell
.\gradlew.bat build
```

Ejecutar backend:

```powershell
.\gradlew.bat bootRun
```

Por defecto el frontend espera el backend en:

```txt
http://localhost:8080
```
