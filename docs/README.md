# Satella — Sistema de Gestión para Operación Láctea

Sistema web interno para gestionar la operación completa de una empresa de
productos lácteos familiar. Proyecto académico de la materia de Estructuras de Datos.

## Estructura del proyecto

```
satella/
├── docs/
│   ├── README.md              ← Este archivo
│   └── satella_app.html       ← Mockup estático original (HTML + CSS + JS)
├── satella-backend/           ← API REST
│   ├── prisma/
│   │   ├── schema.prisma      ← Modelo de datos (7 entidades)
│   │   ├── seed.js            ← Datos de ejemplo del rubro lácteo
│   │   └── migrations/
│   ├── src/
│   │   ├── index.js           ← Servidor Express
│   │   ├── middleware/        ← errorHandler, logger
│   │   ├── routes/            ← CRUD por entidad + reportes PDF
│   │   └── services/          ← Verificación WhatsApp (extensible)
│   └── .env
└── satella-frontend/          ← Interfaz de usuario
    ├── app/                   ← Páginas (App Router)
    │   ├── page.js            ← Inicio (hub de navegación)
    │   ├── dashboard/page.js
    │   ├── envios/page.js
    │   ├── datos/page.js      ← Gestión de datos (CRUD completo)
    │   └── reportes/page.js
    ├── components/            ← Componentes React
    │   ├── layout/            ← Sidebar, Topbar, AppShell
    │   ├── ui/                ← Stars, ThemeToggle, StatusBadge
    │   ├── dashboard/         ← StatsGrid, OrdersChart, RecentActivity
    │   ├── datos/             ← EntityTable, EntityForm, EntityFilterBar,
    │   │                        RadialEntityMenu, EntityWheelModal
    │   └── reportes/          ← ReportGrid, ReportHistory
    ├── context/               ← ThemeContext (modo oscuro)
    ├── lib/api.js             ← Cliente HTTP para la API
    └── tailwind.config.js     ← Tokens de color del mockup
```

## Stack tecnológico

| Capa       | Tecnología       | Por qué                                                          |
|------------|------------------|------------------------------------------------------------------|
| Backend    | Node.js + Express| Simple, rápido de desarrollar, amplio ecosistema de npm          |
| ORM        | Prisma           | Schema-driven, migraciones automáticas, type-safe queries        |
| Base datos | MySQL            | Robusto, confiable, ampliamente soportado en servidores locales  |
| PDF        | pdfkit           | Generación server-side de reportes sin dependencias externas      |
| Frontend   | Next.js (App Router) | Routing basado en archivos, SSR/SSG, optimización automática |
| Estilos    | Tailwind CSS     | Utility-first, replica fielmente el mockup sin librerías UI      |
| Fuentes    | Inter + Fraunces | Tipografía definida en el mockup original                        |

## Modelo de datos

### Entidades principales

| Entidad     | Campos clave                                          | Relaciones                      |
|-------------|-------------------------------------------------------|---------------------------------|
| Categoria   | id, nombre, descripción                               | → Productos                     |
| Producto    | id, nombre, unidad, precio, stockActual, stockMinimo, lote, fechaVencimiento | → Categoria, Proveedor |
| Proveedor   | id, nombre, contacto, teléfono                        | → Productos                     |
| Cliente     | id, nombre, teléfono, dirección, ciudad               | → Pedidos                       |
| Usuario     | id, nombre, rol, email (único)                        | Tabla lista para auth futuro    |
| Pedido      | id, fecha, estado, whatsappVerificado, whatsappNotas  | → Cliente, Items, Envío         |
| PedidoItem  | id, cantidad, pedidoId, productoId                    | Tabla intermedia Pedido↔Producto|
| Envio       | id, fechaProgramada, ventanaHoraria, estado, notas    | → Pedido (1:1)                  |

### Estados

- **Pedido:** pendiente | confirmado | cancelado
- **Envío:** en cola | en ruta | entregado | retraso
- **WhatsApp:** booleano `whatsappVerificado` + campo libre `whatsappNotas`

## Endpoints REST

| Método  | Ruta                          | Descripción                     |
|---------|-------------------------------|---------------------------------|
| GET     | `/api/health`                 | Health check                    |
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
| POST    | `/api/pedidos`                | Crear pedido + items            |
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

> Los endpoints `GET` de listado aceptan paginación opcional (`?page=1&limit=20`, responde con header `X-Total-Count`) y filtros como `?search=`, `?estado=`, `?categoriaId=`, `?proveedorId=`, `?clienteId=` según la entidad.

## Vistas del frontend

| Ruta          | Vista              | Descripción                                              |
|---------------|--------------------|----------------------------------------------------------|
| `/`           | Inicio             | Hub central con accesos rápidos (estilo LLM)             |
| `/dashboard`  | Dashboard          | Stats, gráfico de pedidos, actividad reciente            |
| `/envios`     | Envíos             | Tabla con filtros por estado + búsqueda                  |
| `/datos`      | Gestión de datos   | Tabla CRUD a ancho completo, con selector de módulo tipo rueda radial (overlay), filtros y paginación |
| `/reportes`   | Reportes PDF       | Grid de tipos de reporte + historial de descargas        |

## Cómo ejecutar

### Requisitos previos
- Node.js >= 18
- MySQL 8+ corriendo en `localhost:3306`
- npm

### 1. Base de datos
```bash
mysql -u root -p -e "CREATE DATABASE satella_db;"
```

### 2. Backend
```bash
cd satella-backend
npm install
# Editar .env con la contraseña de MySQL
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                   # http://localhost:4000
```

### 3. Frontend
```bash
cd satella-frontend
npm install
npm run dev                   # http://localhost:3000
```

## Diseño visual

El mockup original (`satella_app.html`) es la fuente de verdad visual. Todos los
valores de color, tipografía, espaciados y comportamiento del frontend fueron
extraídos de ahí y replicados fielmente:

- **Paleta clara:** fondo `#F7F5F2`, primario `#24305E`, acento `#C9A227`
- **Paleta oscura:** fondo `#12142B`, primario `#A9B8F0`, acento `#E4C25E`
- **Fuentes:** Inter (cuerpo), Fraunces (títulos)
- **Modo oscuro:** toggle con transición + textura de estrellas animadas
- **Sin librerías UI:** todo se implementa con Tailwind CSS puro + SVGs inline

## Decisiones de diseño

### Arquitectura backend
- **Middlewares separados** (errorHandler, logger) listos para agregar autenticación JWT sin reescribir rutas.
- **Servicio WhatsApp desacoplado** (`services/whatsappVerification.js`): por ahora es un marcador manual, pero la interfaz está diseñada para enchufar WhatsApp Business API o Twilio sin tocar el resto del sistema.
- **Envíos sin optimización de rutas**: el módulo de envíos es un CRUD puro de agendamiento. El modelo de datos está abierto para añadir lógica de colas y rutas más adelante.

### Arquitectura frontend
- **CSS variables + Tailwind theme**: los colores del mockup se definen una sola vez como CSS variables y se consumen como tokens de Tailwind. No hay clases sueltas con colores hardcodeados.
- **Componentes reutilizables**: `EntityTable`, `EntityForm` y `EntityFilterBar` sirven para las 7 entidades sin duplicar código.
- **Selector de módulo tipo rueda radial**: `RadialEntityMenu` (SVG, sectores tipo donut) se muestra bajo demanda dentro de `EntityWheelModal` (overlay con backdrop), en vez de ocupar una columna fija — así la tabla siempre tiene el ancho completo disponible.
- **Fetch directo**: consumo de API con `fetch` nativo (sin React Query) tal como se pidió.

## Seed de ejemplo

El seed incluye datos del rubro lácteo colombiano:
- **Categorías:** Leches, Quesos, Yogures, Untables
- **Productos:** Leche entera 1L, Queso campesino, Yogur natural, Kumis 500ml, Arequipe 250g, Mantequilla 200g
- **Proveedores:** Lácteos del Valle, Lechería Andina, Quesos de Montaña
- **Clientes:** 6 clientes de ciudades colombianas (Fusagasugá, Soacha, Bogotá, Girardot, Facatativá, Zipaquirá)
- **Pedidos:** 5 pedidos con items (algunos confirmados, otros pendientes)
- **Envíos:** 4 envíos en diferentes estados (en cola, en ruta, entregado)
