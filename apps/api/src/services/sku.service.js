/**
 * sku.service.js
 *
 * Genera el código legible de producto (ej: ARR-001, LAC-014) tomando
 * automáticamente las 3 primeras letras de la descripción del producto
 * como prefijo. El número consecutivo se guarda en la tabla
 * `sku_contadores` (modelo SkuContador) y se incrementa de forma atómica
 * con upsert, para que dos creaciones simultáneas con el mismo prefijo
 * nunca generen el mismo código.
 *
 * Ej: "Arroz Diana 500g" -> prefijo "ARR" -> sku "ARR-001", "ARR-002"...
 */

const AppError = require("../errors/AppError");

/**
 * Quita tildes/diacríticos y deja solo letras A-Z en mayúscula.
 * Nota: con NFD, la "Ñ" también se descompone y termina como "N"
 * (mismo tratamiento que cualquier vocal acentuada).
 */
function soloLetras(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos (á -> a, é -> e, ñ -> n, etc.)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * @param {string} descripcion - descripción/nombre del producto
 * @returns {string} prefijo de 3 letras derivado de la descripción
 */
function derivarPrefijo(descripcion) {
  if (!descripcion || typeof descripcion !== "string") {
    throw new AppError("La descripción es obligatoria para generar el código.", 400);
  }

  const letras = soloLetras(descripcion);

  if (letras.length < 1) {
    throw new AppError(
      "La descripción debe contener al menos una letra para generar el código.",
      400,
    );
  }

  // Si la descripción tiene menos de 3 letras (ej: "Ron"), se usa lo
  // disponible; igual queda un prefijo válido y único por conteo.
  return letras.slice(0, 3);
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} descripcion - descripción del producto que se está creando
 * @returns {Promise<string>} el sku generado, ej: "ARR-001"
 */
async function generarSku(prisma, descripcion) {
  const prefijo = derivarPrefijo(descripcion);

  // upsert es atómico a nivel de fila en MySQL: si dos requests llegan al
  // mismo tiempo con el mismo prefijo, uno espera al otro y nunca se repite
  // el número.
  const contador = await prisma.skuContador.upsert({
    where: { prefijo },
    update: { ultimoNumero: { increment: 1 } },
    create: { prefijo, ultimoNumero: 1 },
  });

  const numero = String(contador.ultimoNumero).padStart(3, "0");
  return `${prefijo}-${numero}`;
}

module.exports = { generarSku, derivarPrefijo };
