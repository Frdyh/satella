# Satella — Design System & Screen Guide

Documento de diseño que describe la estética visual y las pantallas de **Satella**, un sistema web interno de gestión para una empresa de productos lácteos familiar. Este vocabulario sirve para reproducir la interfaz en herramientas de diseño por IA (Google Stitch) o documentar el sistema de diseño implementado.

---

## 1. Resumen del producto

- **Tipo de app:** Web dashboard administrativo (panel interno)
- **Plataforma:** Web (desktop-first, responsive hasta móvil)
- **Rubro:** Empresa de productos lácteos colombiana
- **Audiencia:** Operadores, despachadores y administradores internos
- **Tipos de pantallas:** Landing/hub, dashboard con métricas, tablas de datos con CRUD, generador de reportes PDF

---

## 2. Paleta de colores

### Modo claro (predeterminado)

| Token | Hex | Uso |
|-------|-----|-----|
| Primary | `#24305E` | Botones principales, acentos de marca, encabezados de gráfico |
| Primary strong | `#1A2347` | Fondo del sidebar |
| On primary | `#FFFFFF` | Texto/íconos sobre primary |
| Secondary | `#7E6FBF` | Etiquetas eyebrow, avatar, gradientes secundarios |
| Accent | `#C9A227` | Estrellas decorativas, puntos de actividad |
| Background | `#F7F5F2` | Fondo general de la app |
| Surface | `#FFFFFF` | Tarjetas, paneles, tablas |
| Surface 2 | `#EFEBE4` | Celdas de encabezado de tabla, elementos hover |
| Text primary | `#24243B` | Títulos y texto principal |
| Text secondary | `#6B6A80` | Descripciones y cuerpo |
| Text muted | `#9795A8` | Textos secundarios, breadcrumbs, avisos |
| Border | `#E4E1DA` | Bordes de tarjetas, tablas y controles |

### Modo oscuro

| Token | Hex | Uso |
|-------|-----|-----|
| Primary | `#A9B8F0` | Botones y acentos en tema oscuro |
| Primary strong | `#222657` | Fondo del sidebar |
| On primary | `#12142B` | Texto sobre primary |
| Secondary | `#B9A9E8` | Eyebrows, gradientes |
| Accent | `#E4C25E` | Estrellas, acentos |
| Background | `#12142B` | Fondo general |
| Surface | `#1B1E3D` | Tarjetas y paneles |
| Surface 2 | `#242850` | Encabezados de tabla, hover |
| Text primary | `#EDEBF7` | Texto principal |
| Text secondary | `#A6A4C0` | Cuerpo |
| Text muted | `#726F94` | Textos secundarios |
| Border | `#2E325C` | Bordes |

### Estados semánticos (badges)

| Estado | Claro (bg / texto) | Oscuro (bg / texto) |
|--------|--------------------|---------------------|
| En cola / Preparando / Pendiente | `#F7ECD0` / `#886817` | `#493D20` / `#E4C25E` |
| En ruta / En camino / Confirmado | `#E7E9FA` / `#5B5F9C` | `#30345D` / `#B9B9EF` |
| Entregado / Activo | `#E2F0E4` / `#547557` | `#263C2B` / `#9DCC9F` |
| Cancelado / Retraso | `#F0E2E2` / `#755454` | `#3C2626` / `#DC9D9D` |

---

## 3. Tipografía

- **Fuente de cuerpo:** `Inter` (400, 500, 600, 700)
- **Fuente de títulos (display):** `Fraunces` (500, 600)
- Títulos de página: `Fraunces`, 34px, semibold
- Título del brand: `Fraunces`, 17px, semibold
- Hero/landing: `Fraunces`, 4rem (64px), semibold
- Cuerpo: `Inter`, 14px
- Tablas: `Inter`, 12px
- Eyebrows (etiquetas): `Inter`, 11px, uppercase, letter-spacing 0.09em
- Encabezados de tabla: `Inter`, 10px, uppercase, bold, letter-spacing 0.06em

---

## 4. Espaciado y radios

- **Radio de tarjetas:** 12px
- **Radio de controles (inputs, botones, tabs):** 8px
- **Radio de botones primarios:** 9px
- **Radio de badges de estado:** 20px (píldora)
- **Sombra de tarjeta:** `0 4px 12px rgba(30, 24, 60, 0.05)` (claro) / ninguna (oscuro)
- **Gap de tarjetas en grillas:** 15px
- **Padding de página (module-shell):** 34px 38px
- **Contenido máx. ancho:** 1240px centrado

---

## 5. Textura y efectos

- **Textura de estrellas:** pequeñas partículas doradas (`#E4C25E`) distribuidas por el fondo, visibles **solo en modo oscuro** como un overlay sutil (opacidad ~0.55). Implementadas como gradientes radiales dispersos.
- **Modo oscuro:** toggle en la topbar con transición suave de colores (0.2s).
- **Animación de cambio de vista:** fade-in + leve desplazamiento vertical (5px).

---

## 6. Layout general

### Estructura de la app
```
┌──────────────┬──────────────────────────────┐
│   SIDEBAR    │          TOPBAR              │
│   (248px,    ├──────────────────────────────┤
│   colapsable)│                              │
│              │          CONTENIDO           │
│  · Brand     │      (máx 1240px)            │
│  · Navegación│                              │
│  · Footer    │                              │
│    usuario   │                              │
└──────────────┴──────────────────────────────┘
```

### Sidebar
- Fondo `primary-strong`, texto blanco
- Colapsable (botón hamburguesa en topbar) — se oculta con transición de 0.3s
- Icons lineales (stroke-width 2) de 18px, color blanco al 82% de opacidad
- Item activo: fondo blanco al 13%, texto sólido blanco
- Item hover: fondo blanco al 7%
- Etiquetas de sección: "MÓDULOS" en uppercase 11px, blanco 48% opacidad
- Footer: avatar circular 32px (fondo secondary) con iniciales + nombre + rol

### Topbar
- Altura 60px, fondo `surface`, borde inferior `border`
- Izquierda: botón hamburguesa circular (36px) + breadcrumb "Satella · Interfaz de Comandos"
- Derecha: toggle de modo oscuro circular (36px) + avatar pequeño (30px)

---

## 7. Pantallas

### Pantalla 1 — Inicio (hub estilo LLM)
- Centro vertical/horizontal, contenido alineado al centro
- Título gigante "Satella" en `Fraunces` 64px con **gradiente de texto** de primary→secondary (claro) o accent→blanco (oscuro)
- Subtítulo de una línea: "Elige un módulo para empezar a trabajar, o revisa el Dashboard para ver el estado general de la operación."
- **Accesos rápidos** (3 tarjetas): Envíos, Gestión de datos, Reportes PDF
  - Tarjeta: fondo `surface`, borde `border`, radio 16px, sombra
  - Ícono de 28px en color primary (o accent en oscuro)
  - Hover: elevación (-4px Y) + borde primary
- Pie: "También puedes navegar desde el menú lateral."
- Fondo con textura de estrellas (modo oscuro)

### Pantalla 2 — Dashboard
- **Encabezado de página:** eyebrow "SATELA · MÓDULOS", título "Dashboard" (34px Fraunces), subtítulo descriptivo, botón primario "＋ Nueva operación"
- **Grilla de 4 tarjetas de métricas** (13px gap):
  - "Pedidos hoy" / "48" / "↑ 12% vs. ayer"
  - "Ventas del mes" / "$8.4M" / "↑ 8.7% este mes"
  - "Productos activos" / "126" / "4 con stock bajo"
  - "Envíos pendientes" / "17" / "3 requieren atención"
  - Valor destacado en 27px, detalle en verde tenue `#7A8F72`
- **Gráfico de barras** "Actividad de pedidos · Últimos 7 días":
  - Barras verticales con gradiente primary→secondary, esquinas superiores redondeadas
  - 7 barras, etiquetas Lun–Dom
  - Botón secundario "Ver reporte"
- **Panel "Actividad reciente":** lista de items con título, detalle muted y punto accent

### Pantalla 3 — Envíos (tabla)
- Encabezado "SATELA · OPERACIONES" / "Envíos" + botón "＋ Crear envío"
- **Fila de filtros:** input de búsqueda (flex-1) + tabs de estado con contador (Todos/Preparando/En camino/Entregado)
- **Tabla** con columnas: Pedido / Cliente / Destino / Estado / Fecha
  - "Pedido": `#1048` en negrita
  - "Estado": badge de píldora colorido según estado
  - "Fecha": "23 ago · 10:30"
  - Menú "⋯" a la derecha
- Encabezados de columna: uppercase 10px, fondo `surface-2`, texto muted

### Pantalla 4 — Gestión de datos (CRUD)
- Encabezado "SATELA · BASE DE DATOS" / "Gestión de datos" + botón "＋ Nuevo registro"
- **Layout de una sola columna, ancho completo:** ya no hay sidebar de entidades fijo — el panel de tabla ocupa todo el ancho disponible.
- **Selector de módulo (rueda radial tipo "buy wheel"):** un botón compacto ("◆ Productos · 7 registros ▾") en el encabezado del panel abre un overlay centrado con la rueda: 7 sectores tipo donut (Productos, Clientes, Pedidos, Envíos, Usuarios, Categorías, Proveedores), hover/click con glow dorado, nombre + conteo en el centro. Se cierra al elegir un sector, con Escape, o clickeando el fondo oscurecido.
- **Barra de filtros:** input de búsqueda + selects contextuales por entidad (categoría/proveedor en Productos, estado en Pedidos/Envíos).
- **Panel de tabla:** tabla con columnas según entidad + paginación (`‹ Anterior` / `Siguiente ›`, "N registros · página X de Y").
- **Formularios** (al crear/editar): grid de 2 columnas, labels uppercase 10px muted, inputs con borde `border`, botones "Crear/Guardar cambios" primario + "Cancelar" secundario

### Pantalla 5 — Reportes PDF
- Encabezado "SATELA · INTELIGENCIA" / "Reportes PDF" + botón "＋ Crear reporte"
- **Grilla de 4 tarjetas de reporte:** Ventas, Inventario, Clientes, Envíos
  - Ícono de 38px en recuadro `surface-2` color accent
  - Título 15px, descripción 11px muted, enlace "Generar PDF →" en primary bold
- **Panel de historial:** filas con "reporte — período", metadato PDF muted, botón "Descargar"

---

## 8. Iconografía

Todos los íconos son **SVG inline de trazo lineal** (fill none, stroke currentColor, stroke-width 2), color heredado del contexto (blanco en sidebar, primary en accesos, etc.):

- **Inicio/Home:** `<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>`
- **Dashboard (layout):** rect 3,3 18x18 rx2 + `<path d="M3 9h18M9 21V9"/>`
- **Envíos (camión):** `<rect x="1" y="7" width="14" height="10" rx="1"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/>`
- **CRUD (base de datos):** `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`
- **Reportes (documento):** `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>`
- **Logo/brand (luna + estrella):** SVGs con fill accent (paquete con marca)
- **Hamburguesa:** 3 líneas horizontales
- **Luna (toggle):** `<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>`

---

## 9. Responsive

- **≤ 900px:** grillas de 4 columnas → 2; dashboard y CRUD pasan a 1 columna; padding de página se reduce
- **≤ 600px:** grillas → 1 columna; se oculta el breadcrumb; topbar padding se reduce

---

## 10. Cómo usar este documento en Google Stitch

Para que Stitch replique la estética de Satella:

1. **Sube screenshots** de las 5 vistas (modo claro y oscuro) como imágenes de referencia — Stitch procesa *una imagen a la vez*.
2. **Pega este texto como prompt complementario**, p. ej.:

```
Replica esta pantalla como un dashboard web responsive en modo claro y oscuro.
Usa la tipografía Inter para cuerpo y Fraunces para títulos.
Paleta: primary #24305E, secondary #7E6FBF, accent #C9A227,
fondo #F7F5F2, surface #FFFFFF, surface-2 #EFEBE4, border #E4E1DA.
Bordes de tarjeta 12px, controles 8px, sidebar de 248px colapsable.
En modo oscuro: fondo #12142B, surface #1B1E3D, accent #E4C25E.
Badges de estado como píldoras con los colores semánticos indicados.
Íconos lineales SVG stroke-width 2, sin librerías de UI.
```
