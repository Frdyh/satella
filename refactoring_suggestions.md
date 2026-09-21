# Sugerencias de Refactorización y Mejoras (Code Review)

Tras analizar el código fuente del backend (específicamente las rutas como `envios.js` y `pedidos.js`), he identificado algunas áreas de mejora ("falencias") que podrían causar problemas a medida que la aplicación crezca o pase a un entorno de producción real.

## 1. Múltiples Instancias de PrismaClient (Crítico) — ✅ Resuelto

Se creó `src/lib/prisma.js` con una única instancia compartida y todas las rutas (incluyendo `reportes.js`) la importan en vez de instanciar su propio `PrismaClient`.

## 2. Falta de Paginación en Consultas GET (Rendimiento) — ✅ Resuelto (opt-in)

Se agregó `src/utils/paginate.js` y se aplicó a las 7 rutas de listado (`envios`, `pedidos`, `productos`, `clientes`, `categorias`, `proveedores`, `usuarios`). Si el cliente envía `?page=1&limit=50`, se aplica `skip`/`take` y se agrega el header `X-Total-Count` con el total real. Si no se envían esos parámetros, el endpoint se comporta exactamente igual que antes (array completo, sin límite).

**Por qué opt-in y no un límite por defecto:** el frontend actual (`datos/page.js`, `envios/page.js`) espera el array completo — usa `.length`, `.map` y `.filter` directamente sobre la respuesta. Forzar un límite por defecto habría cambiado la forma de la respuesta (`{data, total}`) y roto esas pantallas sin una UI de paginación que las acompañe. Cuando el proyecto tenga volumen real de datos, el siguiente paso es agregar controles de paginación en el frontend y, recién ahí, considerar bajar el límite por defecto.

## 3. Validación de Datos Débil (Seguridad/Estabilidad) — ✅ Resuelto

Se agregó `isValidEnum` en `src/utils/validate.js` y ahora se valida que `estado` sea uno de los valores permitidos (`pendiente`/`confirmado`/`cancelado` en pedidos; `en cola`/`en ruta`/`entregado`/`retraso` en envíos). Además, antes de crear/actualizar un registro se verifica que `clienteId` (pedidos), `pedidoId` (envíos) y `categoriaId`/`proveedorId` (productos) referencien un registro existente, devolviendo un mensaje específico (ej. `"Cliente no encontrado: 999"`) en vez de depender únicamente del error genérico `P2003` de Prisma.

Adoptar una librería como Zod/Joi sigue siendo una mejora de fondo razonable si el proyecto crece y las reglas de validación se vuelven más complejas, pero no es necesaria hoy.

## 4. Manejo de Errores de Prisma (Estabilidad) — ✅ Ya estaba resuelto

`errorHandler.js` ya mapea `P2025` (404), `P2003` (400) y `P2002` (409) a códigos HTTP adecuados. Adicionalmente ahora oculta el mensaje crudo de errores 500 cuando `NODE_ENV=production` (antes se devolvía siempre `err.message` tal cual al cliente).

## 5. Ausencia de Autenticación/Autorización (Seguridad)

**Problema:**
Cualquier persona que conozca la URL de la API puede crear, modificar o eliminar registros. El `README.md` menciona que la tabla `Usuario` está "lista para auth futuro", pero actualmente las rutas están desprotegidas.

**Solución:**
Implementar JSON Web Tokens (JWT) y crear un middleware `auth.js` que verifique el token en las rutas sensibles. Nota: el modelo `Usuario` hoy no tiene ni siquiera un campo de contraseña — esto es una funcionalidad nueva (migración + login + JWT + pantalla de login en el frontend), no un ajuste rápido.

## 6. Vulnerabilidades conocidas en Next.js 14.2.x (Seguridad)

**Problema:**
`npm audit` en `satella-frontend` reporta varias vulnerabilidades en el rango de versiones de Next.js usado (14.2.x), incluyendo una **crítica**: ejecución remota de código no autenticada en servidores hosteados en Windows, además de varios DoS y problemas de cache poisoning en App Router/Server Components.

**Por qué no se corrigió en este pase:**
El fix real requiere subir a Next 16, un cambio mayor de versión que puede romper rutas, componentes o el proceso de build, y necesitaría volver a probar todo el frontend. Se decidió dejarlo documentado en vez de aplicarlo a ciegas, dado que hoy el proyecto corre en local/desarrollo y no está expuesto a internet.

**Solución:**
Antes de desplegar esto en un servidor accesible desde internet (especialmente uno Windows), planear el upgrade a Next 16 como una tarea propia, con tiempo para volver a probar toda la app.
