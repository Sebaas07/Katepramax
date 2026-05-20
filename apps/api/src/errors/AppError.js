/**
 * Error personalizado para errores de negocio controlados.
 * Uso: throw new AppError("Mensaje", 400)
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

// Soporta ambas formas de importar:
//   const AppError = require("../errors/AppError")          ← default
//   const { AppError } = require("../errors/AppError")      ← named
module.exports = AppError;
module.exports.AppError = AppError;
