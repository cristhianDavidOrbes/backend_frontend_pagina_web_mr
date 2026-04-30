# Backend AlgoLab

Backend hecho con Spring Boot para manejar usuarios, autenticacion con JWT y descripciones de niveles.

## Resumen

El backend expone una API REST bajo `/api`. La autenticacion se hace con JWT:

```http
Authorization: Bearer <token>
```

El token solo se devuelve al iniciar sesion en:

```http
POST /api/usuarios/iniciar-sesion
```

El registro publico solo permite crear usuarios con rol `ESTUDIANTE`. Los usuarios `DOCENTE` y `ADMINISTRADOR` se crean desde el CRUD de usuarios usando una cuenta administradora.

Al arrancar la aplicacion se crea un administrador inicial si no existe:

```txt
Nombre: Cristhian David
Correo: cristhian.david@admin.com
Contrasena: Cdol1122@
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
| `POST` | `/api/usuarios/registrar` | Publico, solo crea `ESTUDIANTE` | Si |
| `GET` | `/api/usuarios/perfil` | Usuario autenticado | No |
| `GET` | `/api/usuarios` | `DOCENTE`, `ADMINISTRADOR` | No |
| `GET` | `/api/usuarios/{id}` | `DOCENTE`, `ADMINISTRADOR`, o el mismo usuario | No |
| `POST` | `/api/usuarios` | `ADMINISTRADOR` | Si |
| `PUT` | `/api/usuarios/{id}` | `ADMINISTRADOR`, o el mismo usuario | Si |
| `DELETE` | `/api/usuarios/{id}` | `ADMINISTRADOR`, excepto su propia cuenta | No |

Body para iniciar sesion:

```json
{
  "correo": "cristhian.david@admin.com",
  "contrasena": "Cdol1122@"
}
```

Respuesta exitosa de inicio de sesion:

```json
{
  "exitoso": true,
  "mensaje": "Inicio de sesion exitoso",
  "token": "jwt-generado",
  "usuario": {
    "id": 1,
    "nombre": "Cristhian David",
    "correo": "cristhian.david@admin.com",
    "rol": "ADMINISTRADOR"
  }
}
```

Body para registro publico:

```json
{
  "nombre": "Juan Perez",
  "correo": "juan@email.com",
  "rol": "ESTUDIANTE",
  "contrasena": "123456"
}
```

Nota: este endpoint no devuelve token. El usuario debe iniciar sesion despues de registrarse.

Body para crear usuario como administrador:

```json
{
  "nombre": "Maria Docente",
  "correo": "maria@email.com",
  "rol": "DOCENTE",
  "contrasena": "123456"
}
```

Body para actualizar usuario:

```json
{
  "nombre": "Maria Actualizada",
  "correo": "maria.actualizada@email.com",
  "rol": "ADMINISTRADOR"
}
```

Notas:

- `rol` solo lo puede cambiar un `ADMINISTRADOR`.
- Si un usuario no administrador manda `rol`, el backend no lo aplica.
- El administrador autenticado no puede cambiar su propio rol a `DOCENTE` o `ESTUDIANTE`.

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
ADMIN_CORREO=cristhian.david@admin.com
ADMIN_CONTRASENA=Cdol1122@
```

## Despliegue en Railway

El backend esta preparado para desplegarse como un servicio Java/Spring Boot en Railway.

Configuracion del servicio:

```txt
Root Directory: /backend/backend-werb-mr/backend-werb-mr
Config File: /backend/backend-werb-mr/backend-werb-mr/railway.json
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
ADMIN_CORREO=admin@correo.com
ADMIN_CONTRASENA=contrasena-segura
```

El backend tambien acepta las variables de PostgreSQL que Railway expone en el servicio de base de datos (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). Si prefieres configurarlo manualmente, puedes usar:

```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://host:puerto/base_de_datos
SPRING_DATASOURCE_USERNAME=usuario
SPRING_DATASOURCE_PASSWORD=contrasena
```

Si usas la base de datos PostgreSQL de Railway, agrega en las variables del servicio backend:

```properties
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Reemplaza `Postgres` por el nombre exacto del servicio de base de datos si Railway lo creo con otro nombre. El backend convierte automaticamente esa URL de Railway a formato JDBC.

Despues del despliegue, genera un dominio publico para el backend y usa esa URL en el frontend como `API_BASE_URL`.

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
