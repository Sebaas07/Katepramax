require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando base de datos...");
  // El orden importa: primero hijos (usuarios), luego padres (sedes)
  await prisma.usuario.deleteMany();
  await prisma.sede.deleteMany();

  console.log("Creando sedes...");
  const sedes = await Promise.all([
    prisma.sede.create({ data: { nombre: "Bogotá" } }),
    prisma.sede.create({ data: { nombre: "Cartagena" } }),
    prisma.sede.create({ data: { nombre: "Villavicencio" } }),
  ]);

  console.log("Creando usuario administrador...");
  const hashedPassword = await bcrypt.hash("Admin1234.", 10);

  const user = await prisma.usuario.create({
    data: {
      correo: "admin@example.com",
      clave: hashedPassword,
      nombreCompleto: "Administrador General", // Uso camelCase como definiste en el schema
      usuario: "admin",
      rol: "Admin",
      telefono: "0000000000",
      // Conectamos con el ID de la primera sede creada (Bogotá)
      sedeId: sedes[0].id,
    },
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
