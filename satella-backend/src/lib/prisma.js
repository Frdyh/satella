const { PrismaClient } = require('@prisma/client');

// Instancia única compartida por toda la app — evita agotar el pool de
// conexiones de MySQL al crear un PrismaClient por cada archivo de ruta.
const prisma = new PrismaClient();

module.exports = prisma;
