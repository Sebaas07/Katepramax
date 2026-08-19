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
    "clientes",
    "stock_sedes",
    "inventarios",
    "productos",
    "proveedores",
    "abonos",
    "cartera",
    "egresos",
    "ingresos",
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
      console.warn(`⚠️  Tabla '${tabla}' no existe, se omite.`);
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
  ]);

  // La bodega de Villavicencio alimenta sus dos oficinas.
  await prisma.sede.update({
    where: { id: sedes[3].id },
    data: { bodegaId: sedes[2].id },
  });
  await prisma.sede.update({
    where: { id: sedes[4].id },
    data: { bodegaId: sedes[2].id },
  });

  console.log("Creando usuario administrador...");
  const hashedPassword = await bcrypt.hash("Admin1234.", 10);

  const user = await usuRepo.create({
    correo: "admin@example.com",
    clave: hashedPassword,
    nombreCompleto: "Administrador General",
    usuario: "admin",
    rol: "Admin",
    telefono: "0000000000",
    sedeId: sedes[0].id,
  });

  console.log("Seed finalizado con éxito. Usuario creado:", user.usuario);
}

main()
  .catch((e) => {
    console.error("Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
