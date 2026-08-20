require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const usuarioRepository = require("../src/repositories/usuario.repository");

const prisma = new PrismaClient();

async function truncarTablas() {
  const tablas = [
    "historial_estados_pedido",
    "asignaciones_entrega",
    "pedido_detalles",
    "pedidos",
    "envio_detalles",
    "envios",
    "clientes",
    "stock_sedes",
    "inventarios",
    "productos",
    "proveedores",
    "abonos",
    "cartera",
    "egresos",
    "ingresos",
    "entregador_sedes",
    "sesiones",
    "logs",
    "error_logs",
    "usuarios",
    "sedes",
  ];

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");

  for (const tabla of tablas) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tabla};`);
    } catch (e) {
      console.warn(`Tabla '${tabla}' no existe, se omite.`);
    }
  }

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");
}

async function main() {
  const usuRepo = usuarioRepository(prisma);

  console.log("Limpiando base de datos...");
  await truncarTablas();

  console.log("Creando sedes...");
  const sedes = await Promise.all([
    prisma.sede.create({ data: { nombre: "Bogotá" } }),
    prisma.sede.create({ data: { nombre: "Cartagena" } }),
    prisma.sede.create({ data: { nombre: "Villavicencio", tipo: "Bodega" } }),
    prisma.sede.create({ data: { nombre: "Villavicencio Centro", tipo: "Oficina" } }),
    prisma.sede.create({ data: { nombre: "Villavicencio Norte", tipo: "Oficina" } }),
    prisma.sede.create({ data: { nombre: "Bogotá Centro", tipo: "Oficina" } }),
    prisma.sede.create({ data: { nombre: "Cartagena Centro", tipo: "Oficina" } }),
  ]);

  // Cada oficina pertenece a una bodega.
  await prisma.sede.update({ where: { id: sedes[3].id }, data: { bodegaId: sedes[2].id } });
  await prisma.sede.update({ where: { id: sedes[4].id }, data: { bodegaId: sedes[2].id } });
  await prisma.sede.update({ where: { id: sedes[5].id }, data: { bodegaId: sedes[0].id } });
  await prisma.sede.update({ where: { id: sedes[6].id }, data: { bodegaId: sedes[1].id } });

  console.log("Creando usuarios de prueba (todos los roles)...");
  // Una sola contraseña para probar todos los perfiles.
  const PASSWORD_PRUEBA = "Sergiogeien4.";
  const hashedPassword = await bcrypt.hash(PASSWORD_PRUEBA, 10);

  // Índices de `sedes` según el tipo exigido por cada rol:
  //   Admin/AdminBogota → cualquier sede
  //   Bodega            → oficina (tipo Oficina); opera sobre su bodega (bodegaId)
  //   Oficinista        → bodega (tipo Bodega)
  //   Entregador        → bodegas (multi-bodega)
  const usuarios = await Promise.all([
    usuRepo.create({
      correo: "admin@example.com",
      clave: hashedPassword,
      nombreCompleto: "Administrador General",
      usuario: "admin",
      rol: "Admin",
      telefono: "3000000001",
      sedeId: sedes[0].id, // Bogotá (bodega)
    }),
    usuRepo.create({
      correo: "adminbogota@example.com",
      clave: hashedPassword,
      nombreCompleto: "Admin Bogotá",
      usuario: "adminbogota",
      rol: "AdminBogota",
      telefono: "3000000002",
      sedeId: sedes[0].id, // Bogotá
    }),
    usuRepo.create({
      correo: "bodega@example.com",
      clave: hashedPassword,
      nombreCompleto: "Bodega Cartagena",
      usuario: "bodega",
      rol: "Bodega",
      telefono: "3000000003",
      sedeId: sedes[6].id, // Cartagena Centro (oficina) → bodega Cartagena
    }),
    usuRepo.create({
      correo: "oficinista@example.com",
      clave: hashedPassword,
      nombreCompleto: "Oficinista Villavicencio",
      usuario: "oficinista",
      rol: "Oficinista",
      telefono: "3000000004",
      sedeId: sedes[2].id, // Villavicencio (bodega)
    }),
    usuRepo.create({
      correo: "entregador@example.com",
      clave: hashedPassword,
      nombreCompleto: "Entregador Villavicencio",
      usuario: "entregador",
      rol: "Entregador",
      telefono: "3000000005",
      sedeId: sedes[2].id, // Villavicencio (bodega principal)
    }),
  ]);

  // El entregador queda asignado a todas las bodegas (multi-bodega) para
  // probar el filtro por bodega al asignar pedidos.
  const entregador = usuarios.find((u) => u.rol === "Entregador");
  const bodegasIds = [sedes[0].id, sedes[1].id, sedes[2].id];
  await prisma.entregadorSede.createMany({
    data: bodegasIds.map((sedeId) => ({
      entregadorId: entregador.id,
      sedeId,
    })),
  });

  console.log("Seed finalizado con éxito.");
  console.log("");
  console.log("Usuarios creados (contraseña para todos: " + PASSWORD_PRUEBA + "):");
  console.log("  admin        — Administrador General (Admin)");
  console.log("  adminbogota  — Admin Bogotá (AdminBogota)");
  console.log("  bodega       — Bodega Cartagena (Bodega)");
  console.log("  oficinista   — Oficinista Villavicencio (Oficinista)");
  console.log("  entregador   — Entregador Villavicencio (Entregador)");
}

main()
  .catch((e) => {
    console.error("Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });