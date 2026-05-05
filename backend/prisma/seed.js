// Asegurarse de requerir dotenv para leer las variables de entorno
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

// Instanciar el cliente pasándole la URL de la base de datos explícitamente
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  // Limpiar la tabla de usuarios antes de insertar el nuevo usuario
  await prisma.usuario.deleteMany();

  // Crear un usuario con contraseña hasheada
  const hashedPassword = await bcrypt.hash("Admin1234.", 10);
  const user = await prisma.usuario.create({
    data: {
      correo: "admin@example.com",
      clave: hashedPassword,
      nombre_completo: "Administrador General",
      usuario: "admin",
      rol: "Admin",
      telefono: "0000000000",
    },
  });

  console.log("Usuario creado:", user);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
