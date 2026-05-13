require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const usuarioRepository = require("../src/repositories/usuario.repository");

const prisma = new PrismaClient();

async function main() {
  const usuRepo = usuarioRepository(prisma);

  console.log("Limpiando base de datos...");
  /** 
  // ELIMINAR TABLAS "HIJAS" (Las que tienen llaves foráneas a Usuario)
  // El orden es vital: primero lo que depende de otros
  await prisma.sesion.deleteMany();
  await prisma.log.deleteMany();
  await prisma.errorLog.deleteMany();

  // ELIMINAR TABLAS "PADRES"
  // Ahora que no hay dependencias, podemos borrar usuarios y sedes
  await prisma.usuario.deleteMany();
  await prisma.sede.deleteMany();
*/

  // Desactivar temporalmente la revisión de llaves foráneas para poder usar TRUNCATE
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");

  // Truncate resetea el contador de ID a 1
  await prisma.$executeRawUnsafe("TRUNCATE TABLE sesiones;");
  await prisma.$executeRawUnsafe("TRUNCATE TABLE logs;");
  await prisma.$executeRawUnsafe("TRUNCATE TABLE error_logs;");
  await prisma.$executeRawUnsafe("TRUNCATE TABLE usuarios;");
  await prisma.$executeRawUnsafe("TRUNCATE TABLE sedes;");

  // Volver a activar la revisión
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");
  
  console.log("Creando sedes...");
  const sedes = await Promise.all([
    prisma.sede.create({ data: { nombre: "Bogotá" } }),
    prisma.sede.create({ data: { nombre: "Cartagena" } }),
    prisma.sede.create({ data: { nombre: "Villavicencio" } }),
  ]);

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
