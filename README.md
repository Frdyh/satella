# Satella — Sistema de Gestión para Operación Láctea

Satella es una aplicación web Full-Stack para gestionar la operación completa de una empresa de productos lácteos familiar: inventario, proveedores, clientes, pedidos y envíos. Proyecto académico de la materia de Estructuras de Datos.

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Endpoints REST](#endpoints-rest)
- [Vistas del frontend](#vistas-del-frontend)
- [Instalación y cómo ejecutar](#instalación-y-cómo-ejecutar)
- [Diseño visual](#diseño-visual)
- [Datos de ejemplo (seed)](#datos-de-ejemplo-seed)
- [Tests](#tests)
- [Seguridad: decisiones conocidas](#seguridad-decisiones-conocidas)
- [Cómo explicar la arquitectura](#cómo-explicar-la-arquitectura)

## Stack tecnológico

| Capa       | Tecnología            | Por qué                                                          |
|------------|-----------------------|-------------------------------------------------------------------|
| Backend    | Node.js + Express     | Simple, rápido de desarrollar, amplio ecosistema de npm          |
| ORM        | Prisma                | Schema-driven, migraciones automáticas, type-safe queries        |
| Base datos | MySQL                 | Robusto, confiable, ampliamente soportado en servidores locales  |
| PDF        | pdfkit                | Generación server-side de reportes sin dependencias externas     |
| Frontend   | Next.js (App Router)  | Routing basado en archivos, SSR/SSG, optimización automática     |
| Estilos    | Tailwind CSS          | Utility-first, replica fielmente el mockup sin librerías UI      |
| Fuentes    | Inter + Fraunces      | Tipografía definida en el mockup original                        |

## Arquitectura

El proyecto está dividido en dos partes: `satella-backend/` (API REST) y `satella-frontend/` (interfaz de usuario).

### Backend: patrón Model–Controller–Route

> Esta sección responde a una retroalimentación real: el proyecto funcionaba bien, pero al pedir explicar la arquitectura hubo dificultad para hacerlo con claridad — cada archivo de rutas mezclaba routing, validación y acceso a datos a la vez. Se migró a un patrón MVC adaptado para que la estructura se explique sola.

MVC clásico (Model–View–Controller) se pensó para apps con interfaz gráfica, donde la "Vista" es una pantalla. `satella-backend` es una **API REST que solo devuelve JSON** (o PDF, en reportes) — no tiene vistas HTML. Por eso se adaptó el patrón a sus tres capas reales:

| Capa MVC | En Satella | Responsabilidad |
|----------|-----------|------------------|
| **Model** | `prisma/schema.prisma` + `src/lib/prisma.js` | Define qué datos existen y cómo se relacionan. Prisma genera el cliente que usan los controllers. |
| **Controller** | `src/controllers/*.js` | Toda la lógica: validar el body, aplicar reglas de negocio, decidir qué le pide a la base de datos, armar la respuesta. |
| **Route** ("View" de la API) | `src/routes/*.js` | Solo conecta una URL + verbo HTTP con la función del controller que debe atenderla. |

Regla mental para explicarlo: si el archivo recibe `req, res, next` y responde al cliente → es un **controller** o una **route**. Si la función se puede probar sin un servidor HTTP (solo recibe datos y devuelve datos) → es **utils** o **model**.

**Flujo de una petición** — ejemplo real, `POST /api/envios`:

```mermaid
sequenceDiagram
    participant C as Cliente (frontend)
    participant R as routes/envios.js
    participant Ctrl as controllers/enviosController.js
    participant P as Prisma (Model)
    participant DB as MySQL

    C->>R: POST /api/envios { fechaProgramada, pedidoId, ... }
    R->>Ctrl: controller.create(req, res, next)
    Ctrl->>Ctrl: sanitize() + validateEnvio()
    Ctrl->>P: prisma.envio.create({ data })
    P->>DB: INSERT INTO Envio ...
    DB-->>P: registro creado
    P-->>Ctrl: objeto Envio
    Ctrl-->>C: res.status(201).json(envio)
```

Para peticiones con `:id` en la URL (ej. `GET /api/envios/5`), antes de llegar al controller pasan por `middleware/validateId.js`, que verifica que sea un entero positivo. Si no lo es, corta ahí con un 400.

**Mapa de `satella-backend/src/`:**

```
src/
├── index.js              Carga .env, verifica JWT_SECRET y pone la app a escuchar en el puerto
├── app.js                Crea la app de Express: middlewares globales y rutas (los tests la importan sin abrir puerto)
├── lib/prisma.js         Instancia única de PrismaClient
├── controllers/          ★ Lógica de negocio — el corazón del sistema
│   ├── authController.js     Login y "quién soy" (/api/auth)
│   ├── categoriasController.js
│   ├── clientesController.js
│   ├── enviosController.js
│   ├── pedidosController.js
│   ├── productosController.js
│   ├── proveedoresController.js
│   ├── reportesController.js
│   └── usuariosController.js
├── routes/                Endpoints delgados: URL + verbo → función del controller
│   └── (un archivo por entidad, igual nombre que su controller)
├── middleware/             Funciones que corren antes/después de cada petición
│   ├── errorHandler.js     Convierte errores (de Prisma o del código) en respuestas HTTP correctas
│   ├── logger.js           Registra cada petición en consola (oculta ?token=)
│   ├── requireAuth.js      Exige un token válido y deja el usuario en req.usuario
│   ├── requireRole.js      Deja pasar solo ciertos roles (ej. Administrador)
│   └── validateId.js       Valida el :id de la URL, reusado por las 8 rutas
├── services/                Lógica que cruza varias entidades o depende de un servicio externo
│   └── whatsappVerification.js
└── utils/                   Funciones auxiliares puras (sin req/res)
    ├── sanitize.js          Limpia/normaliza el body antes de guardarlo
    ├── validate.js          Reglas de validación reutilizables
    ├── pick.js               Filtra un objeto dejando solo los campos permitidos
    ├── password.js           Hash y verificación de contraseñas (scrypt)
    ├── token.js              Firma y verificación de tokens JWT
    └── paginate.js           Calcula skip/take a partir de ?page= y ?limit=
```

**Antes/después**, mismo endpoint (`POST /api/categorias`) — el código no cambió, cambió *dónde vive*:

```js
// Antes: routes/categorias.js hacía routing + validación + acceso a datos, 88 líneas
router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    const categoria = await prisma.categoria.create({ data });
    res.status(201).json(categoria);
  } catch (err) { next(err); }
});
```

```js
// Ahora: routes/categorias.js solo dice quién atiende (15 líneas en total)
router.post('/', controller.create);

// controllers/categoriasController.js tiene la lógica completa
async function create(req, res, next) {
  try {
    const data = pick(req.body, ALLOWED_FIELDS);
    const missing = missingFields(data, REQUIRED_FIELDS);
    if (missing.length) return res.status(400).json({ error: `Faltan campos requeridos: ${missing.join(', ')}` });
    const categoria = await prisma.categoria.create({ data });
    res.status(201).json(categoria);
  } catch (err) { next(err); }
}
```

**Caso especial — `POST /api/envios/:id/verificar`**: no sigue el CRUD estándar. Vive como función extra en `enviosController.js`, y delega en `services/whatsappVerification.js` porque esa lógica (marcar como verificado) también la necesitará `pedidos` más adelante. Por eso existe la capa `services/`: es lógica de negocio **compartida entre varios controllers**, distinta a la lógica CRUD de una sola entidad.

Otras decisiones del backend:
- **Middlewares separados** (`errorHandler`, `logger`, `validateId`) listos para agregar autenticación JWT sin reescribir rutas.
- **Servicio WhatsApp desacoplado**: por ahora es un marcador manual, pero la interfaz está diseñada para enchufar WhatsApp Business API o Twilio sin tocar el resto del sistema.
- **Envíos sin optimización de rutas**: el módulo es un CRUD puro de agendamiento; el modelo de datos queda abierto para añadir lógica de colas y rutas más adelante.

### Frontend: Next.js App Router

`satella-frontend` sigue la convención estándar de Next.js, que ya es fácil de explicar tal cual está — no requirió el mismo cambio que el backend:

```
satella-frontend/
├── app/                   Páginas y enrutamiento (App Router)
│   ├── page.js            Inicio (hub de navegación)
│   ├── dashboard/page.js
│   ├── envios/page.js
│   ├── datos/page.js      Gestión de datos (CRUD completo)
│   └── reportes/page.js
├── components/            Componentes React reutilizables
│   ├── layout/             Sidebar, Topbar, AppShell
│   ├── ui/                 Stars, ThemeToggle, StatusBadge
│   ├── dashboard/           StatsGrid, OrdersChart, HourlyOrdersChart,
│   │                        ShipmentsDonut, StockBreakdown, RecentActivity
│   ├── datos/               EntityTable, EntityForm, EntityFilterBar,
│   │                        RadialEntityMenu, EntityWheelModal
│   └── reportes/           ReportGrid, ReportHistory
├── context/                ThemeContext (modo oscuro)
├── lib/
│   ├── api.js               Cliente HTTP para la API
│   └── useDashboardData.js  Hook que centraliza el fetching del dashboard
└── tailwind.config.js       Tokens de color del mockup
```

Decisiones de diseño:
- **CSS variables + Tailwind theme**: los colores del mockup se definen una sola vez como CSS variables y se consumen como tokens de Tailwind. No hay clases sueltas con colores hardcodeados.
- **Componentes reutilizables**: `EntityTable`, `EntityForm` y `EntityFilterBar` sirven para las 7 entidades sin duplicar código.
- **Selector de módulo tipo rueda radial**: `RadialEntityMenu` (SVG, sectores tipo donut) se muestra bajo demanda dentro de `EntityWheelModal` (overlay con backdrop), en vez de ocupar una columna fija.
- **Fetch directo**: consumo de API con `fetch` nativo (sin React Query).

## Modelo de datos

Definido en Prisma (`satella-backend/prisma/schema.prisma`):

| Entidad     | Campos clave                                          | Relaciones                      |
|-------------|-------------------------------------------------------|----------------------------------|
| Categoria   | id, nombre, descripción                               | → Productos                     |
| Producto    | id, nombre, unidad, precio, stockActual, stockMinimo, lote, fechaVencimiento | → Categoria, Proveedor |
| Proveedor   | id, nombre, contacto, teléfono                        | → Productos                     |
| Cliente     | id, nombre, teléfono, dirección, ciudad               | → Pedidos                       |
| Usuario     | id, nombre, rol, email (único)                        | Tabla lista para auth futuro    |
| Pedido      | id, fecha, estado, whatsappVerificado, whatsappNotas  | → Cliente, Items, Envío         |
| PedidoItem  | id, cantidad, pedidoId, productoId                    | Tabla intermedia Pedido↔Producto|
| Envio       | id, fechaProgramada, ventanaHoraria, estado, notas    | → Pedido (1:1)                  |

**Estados:**
- **Pedido:** pendiente | confirmado | cancelado
- **Envío:** en cola | en ruta | entregado | retraso
- **WhatsApp:** booleano `whatsappVerificado` + campo libre `whatsappNotas`

## Endpoints REST

| Método  | Ruta                          | Descripción                     |
|---------|-------------------------------|-----------------------------------|
| GET     | `/api/health`                 | Health check (público)          |
| POST    | `/api/auth/login`             | Iniciar sesión → `{ token, usuario }` (público) |
| GET     | `/api/auth/me`                | Usuario de la sesión actual     |
| GET     | `/api/categorias`             | Listar categorías               |
| POST    | `/api/categorias`             | Crear categoría                 |
| PUT     | `/api/categorias/:id`         | Actualizar categoría            |
| DELETE  | `/api/categorias/:id`         | Eliminar categoría              |
| GET     | `/api/productos`              | Listar productos (con FKs)      |
| POST    | `/api/productos`              | Crear producto                  |
| PUT     | `/api/productos/:id`          | Actualizar producto             |
| DELETE  | `/api/productos/:id`          | Eliminar producto               |
| GET     | `/api/proveedores`            | Listar proveedores              |
| POST    | `/api/proveedores`            | Crear proveedor                 |
| PUT     | `/api/proveedores/:id`        | Actualizar proveedor            |
| DELETE  | `/api/proveedores/:id`        | Eliminar proveedor              |
| GET     | `/api/clientes`               | Listar clientes                 |
| POST    | `/api/clientes`               | Crear cliente                   |
| PUT     | `/api/clientes/:id`           | Actualizar cliente              |
| DELETE  | `/api/clientes/:id`           | Eliminar cliente                |
| GET     | `/api/usuarios`               | Listar usuarios                 |
| POST    | `/api/usuarios`               | Crear usuario                   |
| PUT     | `/api/usuarios/:id`           | Actualizar usuario              |
| DELETE  | `/api/usuarios/:id`           | Eliminar usuario                |
| GET     | `/api/pedidos`                | Listar pedidos (con items)      |
| POST    | `/api/pedidos`                | Crear pedido + items             |
| PUT     | `/api/pedidos/:id`            | Actualizar pedido               |
| DELETE  | `/api/pedidos/:id`            | Eliminar pedido                 |
| GET     | `/api/envios`                 | Listar envíos                   |
| POST    | `/api/envios`                 | Crear envío                     |
| PUT     | `/api/envios/:id`             | Actualizar envío                |
| DELETE  | `/api/envios/:id`             | Eliminar envío                  |
| POST    | `/api/envios/:id/verificar`   | Marcar verificado por WhatsApp  |
| GET     | `/api/reportes/ventas`        | PDF de ventas                   |
| GET     | `/api/reportes/inventario`    | PDF de inventario               |
| GET     | `/api/reportes/clientes`      | PDF de clientes                 |
| GET     | `/api/reportes/envios`        | PDF de envíos                   |

> **Autenticación:** salvo `/api/health` y `/api/auth/login`, todos los endpoints exigen el header `Authorization: Bearer <token>` (si falta o expiró responden `401`). Los PDF de reportes, que se abren en otra pestaña, aceptan el token como `?token=`. El login tiene un límite de 10 intentos cada 15 minutos por IP.
>
> En `/api/usuarios`, `POST` exige el campo `password` (mínimo 8 caracteres) y en `PUT` es opcional: si no se envía se conserva la contraseña actual. La API nunca devuelve el hash.
>
> **Permisos por rol en `/api/usuarios`** (responden `403` si no se cumplen):
>
> | Acción | Administrador | Operador / Despachador |
> |--------|---------------|------------------------|
> | Listar / ver | ✅ | ✅ |
> | Crear (`POST`) y eliminar (`DELETE`) | ✅ (no puede borrarse a sí mismo) | ❌ |
> | Editar (`PUT`) | ✅ a cualquiera, incluidos rol y contraseña (no puede quitarse su propio rol) | Solo su propia cuenta y sin cambiar su rol |

> Los endpoints `GET` de listado aceptan paginación opcional (`?page=1&limit=20`, responde con header `X-Total-Count`) y filtros como `?search=`, `?estado=`, `?categoriaId=`, `?proveedorId=`, `?clienteId=` según la entidad.

## Vistas del frontend

| Ruta          | Vista              | Descripción                                              |
|---------------|--------------------|------------------------------------------------------------|
| `/login`      | Iniciar sesión     | Formulario de correo y contraseña. Cualquier otra ruta redirige aquí si no hay sesión |
| `/`           | Inicio             | Hub central con accesos rápidos (estilo LLM)             |
| `/dashboard`  | Dashboard          | Stats, gráficos de pedidos/envíos/stock, actividad reciente |
| `/envios`     | Envíos             | Tabla con filtros por estado + búsqueda                  |
| `/datos`      | Gestión de datos   | Tabla CRUD a ancho completo, con selector de módulo tipo rueda radial (overlay), filtros y paginación |
| `/reportes`   | Reportes PDF       | Grid de tipos de reporte + historial de descargas        |

## Instalación y cómo ejecutar

### Requisitos previos
- **Node.js** >= 18.18 (el repo trae un `.nvmrc` con la versión 20; si usas `nvm`, corre `nvm use` dentro de la carpeta)
- **MySQL** 8+ corriendo localmente (o accesible por red)
- **npm** (viene con Node)

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPO>
cd satella
```

### 2. Crear la base de datos
```bash
mysql -u root -p -e "CREATE DATABASE satella_db;"
```

### 3. Backend
```bash
cd satella-backend
npm install
cp .env.example .env
```

Abre `satella-backend/.env` y ajusta `DATABASE_URL` con tu usuario/contraseña de MySQL:
```
DATABASE_URL="mysql://usuario:password@localhost:3306/satella_db"
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=un-valor-largo-y-aleatorio
JWT_EXPIRES_IN=8h
```

`JWT_SECRET` es obligatorio (el servidor no arranca sin él). Puedes generar uno con:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Aplica migraciones, carga datos de ejemplo y levanta el servidor:
```bash
npx prisma migrate dev
npm run db:seed
npm run dev                   # http://localhost:4000
```

### 4. Frontend
En otra terminal, desde la raíz del repo:
```bash
cd satella-frontend
npm install
cp .env.local.example .env.local
```

Por defecto `.env.local` ya apunta a `http://localhost:4000/api` — solo cámbialo si el backend corre en otro host/puerto.
```bash
npm run dev                   # http://localhost:3000
```

### 5. Atajo: levantar todo con un solo comando
Una vez configurados ambos `.env` (pasos 3 y 4) y corridas las migraciones, desde la raíz del repo:
```bash
npm install
npm run dev
```
Esto instala `concurrently` y levanta backend + frontend juntos en una sola terminal.

También hay accesos directos que hacen lo mismo con doble clic (instalan dependencias la primera vez y abren el navegador automáticamente), pero requieren que ya hayas creado la base de datos y corrido las migraciones (pasos 2 y 3):
- Windows: `start.bat`
- macOS/Linux: `start.command`

### Problemas comunes
- **`Error: P1001` / "can't reach database server"** — MySQL no está corriendo, o `DATABASE_URL` en `satella-backend/.env` tiene mal el usuario, contraseña o puerto.
- **El frontend carga pero las tablas quedan vacías o marcan error de red** — confirma que el backend esté corriendo y que `NEXT_PUBLIC_API_URL` en `satella-frontend/.env.local` apunte al puerto correcto.
- **`npx prisma migrate dev` pide crear la base de datos** — confirma que ya corriste el paso 2 y que el usuario de MySQL tiene permisos sobre `satella_db`.
- **Puertos 3000 o 4000 ocupados** — cambia `PORT` en `satella-backend/.env` (y `NEXT_PUBLIC_API_URL` en el frontend) o cierra el proceso que los esté usando.

## Tests

El backend tiene tests automáticos de autenticación y permisos (`satella-backend/tests/`), escritos con el runner que ya trae Node (`node:test`), sin dependencias extra. **No necesitan MySQL**: reemplazan Prisma por una base de datos en memoria.

```bash
cd satella-backend
npm test
```

Cubren: login (correcto, contraseña incorrecta, usuario inexistente, campos faltantes), `requireAuth` (sin token, token inválido, firmado con otro secreto, expirado, de un usuario borrado), límite de intentos de login, permisos por rol en `/api/usuarios` y que las contraseñas nunca se devuelvan ni se guarden en texto plano.

## Seguridad: decisiones conocidas

Estas son limitaciones asumidas a propósito para esta versión, no descuidos. Si el sistema pasa a manejar datos reales sensibles, conviene revisarlas.

- **Cerrar sesión no invalida el token en el servidor.** Los tokens JWT no se guardan en el backend: "cerrar sesión" borra el token del navegador, pero si alguien lo hubiera copiado antes seguiría funcionando hasta que expire (`JWT_EXPIRES_IN`, 8 horas por defecto). Lo mismo pasa al cambiar la contraseña: las sesiones abiertas siguen vivas hasta expirar. Para revocarlas habría que agregar, por ejemplo, un campo `tokenVersion` en `Usuario` que se incremente al cambiar la contraseña y se compare en `requireAuth`. Mientras tanto, bajar `JWT_EXPIRES_IN` reduce el riesgo.
- **El token se guarda en `localStorage`**, no en una cookie `httpOnly`. Es lo habitual en una SPA que llama a una API separada y evita tener que defenderse de CSRF, pero si algún día se inyectara JavaScript malicioso en la página (XSS) podría leer el token. React escapa el contenido por defecto, así que no se debe usar `dangerouslySetInnerHTML` con datos de usuarios.
- **No hay "olvidé mi contraseña".** Es un panel interno: si alguien olvida su contraseña, un Administrador se la cambia desde Gestión de datos → Usuarios. Cada usuario puede cambiar la suya editando su propia cuenta.
- **El token viaja en la URL de los PDF** (`?token=`) porque los enlaces que abren otra pestaña no pueden mandar headers. El backend lo oculta en sus logs, pero puede quedar en el historial del navegador.

## Diseño visual

El mockup original (`docs/satella_app.html`) es la fuente de verdad visual: todos los valores de color, tipografía, espaciados y comportamiento del frontend fueron extraídos de ahí y replicados fielmente (paleta clara/oscura, Inter + Fraunces, modo oscuro con textura de estrellas, todo en Tailwind puro sin librerías UI).

Para el detalle completo de tokens de color, tipografía y especificación pantalla por pantalla, ver [`docs/DESIGN.md`](./docs/DESIGN.md). Para la identidad y narrativa de marca de Satella, ver [`docs/identidad-visual.md`](./docs/identidad-visual.md).

## Datos de ejemplo (seed)

El seed (`satella-backend/prisma/seed.js`) incluye datos del rubro lácteo colombiano:
- **Categorías:** Leches, Quesos, Yogures, Untables
- **Productos:** Leche entera 1L, Queso campesino, Yogur natural, Kumis 500ml, Arequipe 250g, Mantequilla 200g
- **Proveedores:** Lácteos del Valle, Lechería Andina, Quesos de Montaña
- **Clientes:** 6 clientes de ciudades colombianas (Fusagasugá, Soacha, Bogotá, Girardot, Facatativá, Zipaquirá)
- **Pedidos:** 5 pedidos con items (algunos confirmados, otros pendientes)
- **Envíos:** 4 envíos en diferentes estados (en cola, en ruta, entregado)
- **Usuarios (para iniciar sesión):** `juan@satella.local` (Administrador), `maria@satella.local` (Operador), `carlos@satella.local` (Despachador) — contraseña `satella123` para los tres. Cámbialas antes de usar el sistema con datos reales.

## Cómo explicar la arquitectura

Si preguntan **"¿cómo está organizado el backend?"**:
> "Seguimos un patrón Model-Controller-Route: el modelo de datos está en `schema.prisma`, cada entidad tiene un controller con toda su lógica de negocio, y las rutas son solo un mapa de URL a función de controller. Para entender cualquier funcionalidad solo hay que mirar un archivo: su controller."

Si preguntan **"¿por qué no hay carpeta `views/`?"**:
> Porque esto es una API REST que devuelve JSON, no HTML — la "vista" la renderiza el frontend (Next.js), que consume la API vía `satella-frontend/lib/api.js`.

Si piden un caso concreto, usa el flujo de `POST /api/envios` de la sección [Arquitectura](#arquitectura) como ejemplo guiado.
