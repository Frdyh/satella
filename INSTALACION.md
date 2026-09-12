# Guía de instalación — Satella

Pasos para clonar el repositorio y dejar el proyecto (backend + frontend) corriendo en tu máquina.

## Requisitos previos

- **Node.js** >= 18.18 (el repo trae un `.nvmrc` con la versión 20; si usas `nvm`, corre `nvm use` dentro de la carpeta).
- **MySQL** 8+ corriendo localmente (o accesible por red).
- **npm** (viene con Node).

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd satella
```

## 2. Crear la base de datos

Con MySQL corriendo:

```bash
mysql -u root -p -e "CREATE DATABASE satella_db;"
```

## 3. Backend

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
```

Aplica las migraciones y carga datos de ejemplo:

```bash
npx prisma migrate dev
npm run db:seed
```

Levanta el servidor:

```bash
npm run dev
```

Backend corriendo en **http://localhost:4000**.

## 4. Frontend

En otra terminal, desde la raíz del repo:

```bash
cd satella-frontend
npm install
cp .env.local.example .env.local
```

Por defecto `.env.local` ya apunta a `http://localhost:4000/api` — solo cámbialo si el backend corre en otro host/puerto.

Levanta el servidor:

```bash
npm run dev
```

Frontend corriendo en **http://localhost:3000**.

## 5. Atajo: levantar todo con un solo comando

Una vez configurados ambos `.env` (pasos 3 y 4) y corridas las migraciones, desde la raíz del repo:

```bash
npm install
npm run dev
```

Esto instala `concurrently` y levanta backend + frontend juntos en una sola terminal.

También hay accesos directos que hacen lo mismo con doble clic (instalan dependencias la primera vez y abren el navegador automáticamente), pero requieren que ya hayas creado la base de datos y corrido las migraciones (pasos 2 y 3):

- Windows: `start.bat`
- macOS/Linux: `start.command`

## Problemas comunes

- **`Error: P1001` / "can't reach database server"** — MySQL no está corriendo, o `DATABASE_URL` en `satella-backend/.env` tiene mal el usuario, contraseña o puerto.
- **El frontend carga pero las tablas quedan vacías o marcan error de red** — confirma que el backend esté corriendo y que `NEXT_PUBLIC_API_URL` en `satella-frontend/.env.local` apunte al puerto correcto.
- **`npx prisma migrate dev` pide crear la base de datos** — confirma que ya corriste el paso 2 y que el usuario de MySQL tiene permisos sobre `satella_db`.
- **Puertos 3000 o 4000 ocupados** — cambia `PORT` en `satella-backend/.env` (y `NEXT_PUBLIC_API_URL` en el frontend) o cierra el proceso que los esté usando.

## Más allá de la instalación

Para arquitectura, modelo de datos y endpoints, ver [`docs/README.md`](./docs/README.md). Para la guía visual/de diseño, ver [`docs/DESIGN.md`](./docs/DESIGN.md).
