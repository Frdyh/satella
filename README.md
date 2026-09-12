# Satella - Sistema de Gestión de Inventario y Pedidos

Satella es una aplicación web completa (Full-Stack) diseñada para la gestión de inventario, proveedores, clientes, pedidos y envíos.

## 🏗️ Arquitectura del Proyecto

El proyecto está dividido en dos partes principales:

*   **Frontend (`satella-frontend`)**: Desarrollado con **Next.js** (utilizando el App Router) y estilizado con **Tailwind CSS**.
*   **Backend (`satella-backend`)**: Desarrollado con **Node.js** y **Express.js**.
*   **Base de Datos**: **MySQL**, gestionada a través del ORM **Prisma**.

## 🗄️ Esquema de Base de Datos (Modelos)

El sistema se basa en los siguientes modelos principales definidos en Prisma (`satella-backend/prisma/schema.prisma`):

### Inventario
*   **`Categoria`**: Categorías para agrupar productos.
*   **`Proveedor`**: Proveedores de los productos.
*   **`Producto`**: Productos disponibles en el inventario. Relacionados con una `Categoria` y un `Proveedor`. Incluye control de stock (actual y mínimo), precio, lote y fecha de vencimiento.

### Ventas y Logística
*   **`Cliente`**: Información de los clientes (nombre, teléfono, dirección, ciudad).
*   **`Pedido`**: Órdenes de compra realizadas por los clientes. Tienen un estado (ej. "pendiente") y pueden tener verificación por WhatsApp.
*   **`PedidoItem`**: Los productos específicos y la cantidad solicitada dentro de un `Pedido`.
*   **`Envio`**: Programación de la entrega de un `Pedido`. Incluye fecha programada, ventana horaria y estado (ej. "en cola").

### Administración
*   **`Usuario`**: Usuarios del sistema (administradores, empleados, etc.) con control de roles.

## ⚙️ Estructura del Backend (`satella-backend`)

El backend expone una API RESTful. La lógica principal se encuentra en `src/`:

*   **`routes/`**: Define los endpoints de la API. Cada archivo maneja las operaciones CRUD para su respectiva entidad:
    *   `categorias.js`
    *   `clientes.js`
    *   `envios.js`
    *   `pedidos.js`
    *   `productos.js`
    *   `proveedores.js`
    *   `reportes.js` (Generación de reportes y estadísticas)
    *   `usuarios.js`
*   **`middleware/`**: Funciones intermedias para el manejo de peticiones:
    *   `errorHandler.js`: Manejo centralizado de errores.
    *   `logger.js`: Registro de actividad (logs).
    *   `sanitize.js`: Limpieza y validación de datos de entrada.
*   **`services/`**: Servicios externos o lógica de negocio compleja:
    *   `whatsappVerification.js`: Servicio para la verificación de pedidos/envíos vía WhatsApp.

## 💻 Estructura del Frontend (`satella-frontend`)

El frontend utiliza la estructura moderna de Next.js (App Router):

*   **`app/`**: Contiene las páginas y el enrutamiento de la aplicación.
*   **`components/`**: Componentes de React reutilizables (botones, formularios, tablas, etc.).
*   **`context/`**: Manejo del estado global de la aplicación usando React Context.
*   **`lib/`**: Funciones de utilidad y configuraciones compartidas.

## 🚀 Instalación

Requisitos, pasos de configuración y solución de problemas comunes están en la **[guía de instalación](./INSTALACION.md)**.

Para más detalle de arquitectura, modelo de datos y decisiones de diseño, ver [`docs/README.md`](./docs/README.md).
