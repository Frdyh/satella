const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
    console.error(
      'Seed abortado: NODE_ENV=production borraría datos reales. ' +
      'Si de verdad quieres correrlo, ejecuta con FORCE_SEED=true.'
    );
    process.exit(1);
  }

  console.log('Limpiando datos existentes...');
  await prisma.pedidoItem.deleteMany();
  await prisma.envio.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('Creando categorías...');
  const catLeches = await prisma.categoria.create({
    data: { nombre: 'Leches', descripcion: 'Productos lácteos líquidos' },
  });
  const catQuesos = await prisma.categoria.create({
    data: { nombre: 'Quesos', descripcion: 'Quesos artesanales y procesados' },
  });
  const catYogures = await prisma.categoria.create({
    data: { nombre: 'Yogures', descripcion: 'Yogures naturales y saborizados' },
  });
  const catUntables = await prisma.categoria.create({
    data: { nombre: 'Untables', descripcion: 'Mantequilla, arequipe y similares' },
  });

  console.log('Creando proveedores...');
  const prov1 = await prisma.proveedor.create({
    data: { nombre: 'Lácteos del Valle', contacto: 'Carlos Mendoza', telefono: '310-555-0101' },
  });
  const prov2 = await prisma.proveedor.create({
    data: { nombre: 'Lechería Andina', contacto: 'María López', telefono: '315-555-0202' },
  });
  const prov3 = await prisma.proveedor.create({
    data: { nombre: 'Quesos de Montaña', contacto: 'Andrés Giraldo', telefono: '320-555-0303' },
  });

  console.log('Creando productos...');
  const prodLeche = await prisma.producto.create({
    data: {
      nombre: 'Leche entera 1L',
      unidad: 'litro',
      precio: 3800,
      stockActual: 120,
      stockMinimo: 30,
      lote: 'L-2026-0801',
      fechaVencimiento: new Date('2026-09-15'),
      categoriaId: catLeches.id,
      proveedorId: prov1.id,
    },
  });
  const prodQueso = await prisma.producto.create({
    data: {
      nombre: 'Queso campesino',
      unidad: 'kg',
      precio: 11900,
      stockActual: 18,
      stockMinimo: 10,
      lote: 'Q-2026-0810',
      fechaVencimiento: new Date('2026-09-01'),
      categoriaId: catQuesos.id,
      proveedorId: prov3.id,
    },
  });
  const prodYogur = await prisma.producto.create({
    data: {
      nombre: 'Yogur natural',
      unidad: 'unidad',
      precio: 4500,
      stockActual: 48,
      stockMinimo: 20,
      lote: 'Y-2026-0812',
      fechaVencimiento: new Date('2026-08-28'),
      categoriaId: catYogures.id,
      proveedorId: prov2.id,
    },
  });
  const prodKumis = await prisma.producto.create({
    data: {
      nombre: 'Kumis 500ml',
      unidad: 'unidad',
      precio: 5200,
      stockActual: 36,
      stockMinimo: 15,
      lote: 'K-2026-0805',
      fechaVencimiento: new Date('2026-09-10'),
      categoriaId: catYogures.id,
      proveedorId: prov2.id,
    },
  });
  const prodArequipe = await prisma.producto.create({
    data: {
      nombre: 'Arequipe 250g',
      unidad: 'unidad',
      precio: 7200,
      stockActual: 27,
      stockMinimo: 10,
      lote: 'A-2026-0808',
      fechaVencimiento: new Date('2026-12-01'),
      categoriaId: catUntables.id,
      proveedorId: prov1.id,
    },
  });
  const prodMantequilla = await prisma.producto.create({
    data: {
      nombre: 'Mantequilla 200g',
      unidad: 'unidad',
      precio: 6500,
      stockActual: 8,
      stockMinimo: 12,
      lote: 'M-2026-0803',
      fechaVencimiento: new Date('2026-09-20'),
      categoriaId: catUntables.id,
      proveedorId: prov1.id,
    },
  });

  console.log('Creando clientes...');
  const cli1 = await prisma.cliente.create({
    data: { nombre: 'Laura Gómez', telefono: '311-444-1001', direccion: 'Calle 12 #5-30', ciudad: 'Fusagasugá' },
  });
  const cli2 = await prisma.cliente.create({
    data: { nombre: 'Andrés Ruiz', telefono: '312-444-1002', direccion: 'Av. 1 de Mayo #8-14', ciudad: 'Soacha' },
  });
  const cli3 = await prisma.cliente.create({
    data: { nombre: 'Camila Torres', telefono: '313-444-1003', direccion: 'Carrera 7 #45-22', ciudad: 'Bogotá' },
  });
  const cli4 = await prisma.cliente.create({
    data: { nombre: 'Mateo Díaz', telefono: '314-444-1004', direccion: 'Calle 3 #10-55', ciudad: 'Girardot' },
  });
  const cli5 = await prisma.cliente.create({
    data: { nombre: 'Sofía Pérez', telefono: '315-444-1005', direccion: 'Av. Central #20-18', ciudad: 'Facatativá' },
  });
  const cli6 = await prisma.cliente.create({
    data: { nombre: 'Juan Camilo Rodríguez', telefono: '316-444-1006', direccion: 'Carrera 11 #7-89', ciudad: 'Zipaquirá' },
  });

  console.log('Creando usuarios...');
  await prisma.usuario.create({
    data: { nombre: 'Juan Valencia', rol: 'Administrador', email: 'juan@satella.local' },
  });
  await prisma.usuario.create({
    data: { nombre: 'María Fernanda López', rol: 'Operador', email: 'maria@satella.local' },
  });
  await prisma.usuario.create({
    data: { nombre: 'Carlos Pérez', rol: 'Despachador', email: 'carlos@satella.local' },
  });

  console.log('Creando pedidos...');
  const ped1 = await prisma.pedido.create({
    data: {
      estado: 'confirmado',
      whatsappVerificado: true,
      whatsappNotas: 'Confirmado por Laura vía WhatsApp',
      clienteId: cli1.id,
      items: {
        create: [
          { productoId: prodLeche.id, cantidad: 12 },
          { productoId: prodQueso.id, cantidad: 3 },
        ],
      },
    },
  });
  const ped2 = await prisma.pedido.create({
    data: {
      estado: 'confirmado',
      whatsappVerificado: true,
      whatsappNotas: 'Pedido regular semanal',
      clienteId: cli2.id,
      items: {
        create: [
          { productoId: prodYogur.id, cantidad: 24 },
          { productoId: prodKumis.id, cantidad: 12 },
        ],
      },
    },
  });
  const ped3 = await prisma.pedido.create({
    data: {
      estado: 'pendiente',
      whatsappVerificado: false,
      clienteId: cli3.id,
      items: {
        create: [
          { productoId: prodArequipe.id, cantidad: 8 },
          { productoId: prodMantequilla.id, cantidad: 10 },
        ],
      },
    },
  });
  const ped4 = await prisma.pedido.create({
    data: {
      estado: 'confirmado',
      whatsappVerificado: true,
      whatsappNotas: 'Entrega en tienda',
      clienteId: cli4.id,
      items: {
        create: [
          { productoId: prodLeche.id, cantidad: 30 },
        ],
      },
    },
  });
  const ped5 = await prisma.pedido.create({
    data: {
      estado: 'pendiente',
      whatsappVerificado: false,
      clienteId: cli5.id,
      items: {
        create: [
          { productoId: prodQueso.id, cantidad: 5 },
          { productoId: prodYogur.id, cantidad: 15 },
          { productoId: prodArequipe.id, cantidad: 6 },
        ],
      },
    },
  });

  console.log('Creando envíos...');
  await prisma.envio.create({
    data: {
      fechaProgramada: new Date('2026-08-25T10:30:00'),
      ventanaHoraria: '10:00 - 12:00',
      estado: 'en cola',
      pedidoId: ped1.id,
    },
  });
  await prisma.envio.create({
    data: {
      fechaProgramada: new Date('2026-08-25T09:00:00'),
      ventanaHoraria: '08:00 - 10:00',
      estado: 'en ruta',
      pedidoId: ped2.id,
    },
  });
  await prisma.envio.create({
    data: {
      fechaProgramada: new Date('2026-08-24T15:00:00'),
      ventanaHoraria: '14:00 - 16:00',
      estado: 'entregado',
      notas: 'Entregado sin novedad',
      pedidoId: ped4.id,
    },
  });
  await prisma.envio.create({
    data: {
      fechaProgramada: new Date('2026-08-26T08:00:00'),
      ventanaHoraria: '08:00 - 10:00',
      estado: 'en cola',
      pedidoId: ped5.id,
    },
  });

  console.log('Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
