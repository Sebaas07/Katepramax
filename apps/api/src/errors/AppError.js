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

module.exports = { AppError };
