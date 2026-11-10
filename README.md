# CRM Inmobiliaria

API REST para la gestión de contactos, propiedades y operaciones de una inmobiliaria. Está construida con Node.js, Express, Prisma y MySQL, e incluye autenticación JWT y validación de requests con Zod.

## Requisitos

- Node.js y npm
- MySQL

## Instalación y configuración

Desde la carpeta del proyecto:

```powershell
npm install
Copy-Item .env.example .env
```

Edita `.env` con la URL de tu base MySQL, un `JWT_SECRET` largo y único, y los datos `ADMIN_*` que se usarán para crear la cuenta inicial. No compartas ni subas `.env`.

Genera el cliente Prisma y sincroniza el esquema:

```powershell
npm run prisma:generate
npx prisma db push
```

Carga los perfiles, roles y el usuario administrador inicial:

```powershell
npx prisma db seed
```

El seed puede ejecutarse varias veces. Las variables `ADMIN_*` deben estar configuradas en `.env` antes de ejecutarlo.

## Ejecutar

```powershell
npm run dev
```

El servidor escucha por defecto en `http://localhost:3000`. Puedes cambiar el puerto con `PORT`.

## Frontend

El proyecto React/Vite está separado en `frontend/`. Configura `frontend/.env` a partir de `frontend/.env.example` y ajusta `VITE_API_URL` a la URL del backend. El frontend llama directamente a la API; configura CORS en el backend para permitir el origen de Vite.

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Vite muestra la URL local al iniciar (por defecto `http://localhost:5173`).

## Tests automatizados

Ejecuta la suite con:

```powershell
npm test
```

Los tests de integración hacen solicitudes HTTP a la app Express real, pasando por rutas, autenticación, validación y servicios. También hay tests unitarios de servicios para reglas de negocio y ramas de error. Prisma se simula para que no haga falta una base MySQL de pruebas. La suite exige al menos 60 % de cobertura de sentencias y líneas; los reportes se guardan en `coverage/`, excluida de Git.

La suite en `tests/api.integration.test.js` verifica:

1. `POST /auth/registro`: crea la cuenta y no expone la contraseña.
2. `POST /auth/login`: acepta credenciales válidas y devuelve un JWT.
3. `POST /auth/login`: devuelve `401` para credenciales inválidas.
4. `GET /contactos`: devuelve `401` si falta el token.
5. `POST /contactos`: devuelve `400` ante un cuerpo incompleto.
6. `GET /contactos`: lista los contactos asignados al agente autenticado.
7. `POST /contactos`: crea un contacto y lo asigna al agente autenticado.
8. `GET /contactos/:id`: devuelve `404` para un contacto inexistente.
9. `GET /contactos/:id`: impide que un agente vea el contacto de otro agente y responde `404`.
10. `PATCH /contactos/:id`: impide que un agente modifique el contacto de otro agente y no ejecuta actualizaciones.
11. `PATCH /contactos/:id`: permite actualizar el contacto propio del agente.

`tests/crm.services.test.js` cubre creación/listado de consultas y propiedades, ownership de recursos, operaciones, cambios de etapa y motivo de baja, ofertas, contratos y renovaciones, menú y catálogos. `tests/usuarios.services.test.js` cubre listados administrativos, asignación de perfiles y permisos, restricciones de autoedición y último administrador, programas inexistentes y conflictos de concurrencia.

## Autenticación

Inicia sesión con `POST /auth/login` y envía el token JWT en las rutas protegidas:

```http
Authorization: Bearer <token>
```

## Endpoints

Los endpoints protegidos requieren autenticación, salvo `POST /auth/registro` y `POST /auth/login`.

## Validación de solicitudes

Todos los endpoints `POST`, `PUT` y `PATCH` validan el body con esquemas Zod mediante el middleware reutilizable `validate` antes de ejecutar el controlador. Los filtros de consulta también se validan en los controladores correspondientes. Las fechas se comprueban como fechas de calendario válidas; ante datos inválidos, la API responde `400` con el mensaje `Datos inválidos` y errores en español.

| # | Método | Ruta | Descripción / acceso |
|---|---|---|---|
| 1 | POST | `/auth/registro` | Registra un usuario Agente. |
| 2 | POST | `/auth/login` | Inicia sesión y devuelve el JWT. |
| 3 | GET | `/contactos` | Lista contactos; admite filtros `tipoPersona` y `activo`. |
| 4 | POST | `/contactos` | Crea un contacto. |
| 5 | GET | `/contactos/:id` | Obtiene la ficha de un contacto accesible. |
| 6 | PATCH | `/contactos/:id` | Modifica un contacto accesible. |
| 7 | DELETE | `/contactos/:id` | Da de baja un contacto; Administrador o Corredor/Gerente. |
| 8 | POST | `/contactos/:id/interacciones` | Registra una interacción con el contacto. |
| 9 | GET | `/contactos/:id/interacciones` | Lista las interacciones del contacto. |
| 10 | POST | `/contactos/:id/busquedas` | Registra una búsqueda del contacto y sus características. |
| 11 | POST | `/consultas` | Registra una consulta. |
| 12 | GET | `/consultas` | Lista consultas; los Agentes ven las propias. |
| 13 | POST | `/propiedades` | Registra una propiedad, propietarios y características. |
| 14 | GET | `/propiedades` | Lista propiedades; los Agentes ven las propias. |
| 15 | GET | `/propiedades/:id` | Obtiene la ficha de una propiedad accesible. |
| 16 | PATCH | `/propiedades/:id` | Modifica una propiedad accesible. |
| 17 | POST | `/visitas` | Registra una visita. |
| 18 | POST | `/operaciones` | Abre una operación de venta o alquiler. |
| 19 | GET | `/operaciones` | Lista operaciones; los Agentes ven las propias. |
| 20 | PATCH | `/operaciones/:id/etapa` | Cambia la etapa; la etapa de baja requiere motivo. |
| 21 | POST | `/operaciones/:id/ofertas` | Registra una oferta para la operación. |
| 22 | POST | `/operaciones/:id/contratos` | Crea un contrato de alquiler o renovación. |
| 23 | GET | `/contratos` | Lista contratos; los Agentes ven los de sus operaciones. |
| 24 | GET | `/menu` | Devuelve menús y programas habilitados según el perfil. |
| 25 | GET | `/catalogos` | Devuelve etapas, canales, características, roles y motivos de baja. |
| 26 | GET | `/usuarios` | Lista usuarios; requiere perfil Administrador. |
| 27 | PUT | `/perfiles/:id/programas` | Define programas y permisos de un perfil; requiere Administrador. |

### Rutas administrativas adicionales

- `GET /perfiles` — lista perfiles; Administrador o Corredor/Gerente.
- `PUT /usuarios/:id/perfiles` — modifica los perfiles de un usuario; sujeto a las reglas de asignación de perfiles.

Los endpoints de recursos aplican controles de perfil y acceso a los registros según el usuario autenticado.
