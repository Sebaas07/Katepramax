require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const usuarioRepository = require("../src/repositories/usuario.repository");

const prisma = new PrismaClient();

// Códigos de colores ANSI para la consola
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

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
      console.warn(`${colors.yellow}Tabla '${tabla}' no existe, se omite.${colors.reset}`);
    }
  }

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");
}

async function main() {
  const usuRepo = usuarioRepository(prisma);

  console.log(`${colors.cyan}Iniciando seed de desarrollo...${colors.reset}`);
  console.log(`${colors.blue}Limpiando base de datos...${colors.reset}`);
  await truncarTablas();

  console.log(`${colors.blue}Creando sedes...${colors.reset}`);
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

  console.log(`${colors.blue}Creando usuarios de prueba (todos los roles)...${colors.reset}`);
  // Una sola contraseña para probar todos los perfiles.
  const PASSWORD_PRUEBA = "Admin1234.";
  const hashedPassword = await bcrypt.hash(PASSWORD_PRUEBA, 10);

  // Índices de `sedes` según el tipo exigido por cada rol:
  //   Admin/AdminBogota → cualquier sede
  //   Bodega            → bodega (tipo Bodega); sus oficinas cuelgan de ella
  //   Oficinista        → oficina (tipo Oficina); su bodega es sede.bodegaId
  //   Entregador        → bodegas (multi-bodega)
  const usuarios = await Promise.all([
    usuRepo.create({
      clave: hashedPassword,
      nombreCompleto: "Administrador General",
      usuario: "admin",
      rol: "Admin",
      telefono: "3000000001",
      sedeId: sedes[0].id, // Bogotá (bodega)
    }),
    usuRepo.create({
      clave: hashedPassword,
      nombreCompleto: "Admin Bogotá",
      usuario: "adminbogota",
      rol: "AdminBogota",
      telefono: "3000000002",
      sedeId: sedes[0].id, // Bogotá
    }),
    usuRepo.create({
      clave: hashedPassword,
      nombreCompleto: "Bodega Cartagena",
      usuario: "bodega",
      rol: "Bodega",
      telefono: "3000000003",
      sedeId: sedes[1].id, // Cartagena (bodega)
    }),
    usuRepo.create({
      clave: hashedPassword,
      nombreCompleto: "Oficinista Villavicencio",
      usuario: "oficinista",
      rol: "Oficinista",
      telefono: "3000000004",
      sedeId: sedes[3].id, // Villavicencio Centro (oficina) → bodega Villavicencio
    }),
    usuRepo.create({
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

  console.log(`${colors.green}✨ Seed finalizado con éxito.${colors.reset}`);
  console.log("");
  console.log(`${colors.cyan}Usuarios creados (contraseña para todos: ${PASSWORD_PRUEBA}):${colors.reset}`);
  console.log(`  ${colors.yellow}admin${colors.reset}        — Administrador General (Admin)`);
  console.log(`  ${colors.yellow}adminbogota${colors.reset}  — Admin Bogotá (AdminBogota)`);
  console.log(`  ${colors.yellow}bodega${colors.reset}       — Bodega Cartagena (Bodega)`);
  console.log(`  ${colors.yellow}oficinista${colors.reset}   — Oficinista Villavicencio (Oficinista)`);
  console.log(`  ${colors.yellow}entregador${colors.reset}   — Entregador Villavicencio (Entregador)`);
}

main()
  .catch((e) => {
    console.error(`${colors.red}Error en el seed:${colors.reset}`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });