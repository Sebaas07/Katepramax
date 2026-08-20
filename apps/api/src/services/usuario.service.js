const bcrypt = require("bcrypt");
const usuarioRepo = require("../repositories/usuario.repository");
const { registrarAccion } = require("../utils/logger");
const { AppError } = require("../errors/AppError");

// Tipo de sede exigido por rol al crear/editar un usuario.
//  - Bodega/Entregador → solo bodegas
//  - Oficinista        → solo oficinas
//  - Admin/AdminBogota → cualquier sede (bodega u oficina)
const TIPO_SEDE_POR_ROL = {
  Bodega: "Bodega",
  Entregador: "Bodega",
  Oficinista: "Oficina",
};

// Valida que una sede exista, esté activa y sea del tipo que exige el rol.
async function validarSede(app, sedeId, rol) {
  const id = parseInt(sedeId, 10);
  if (Number.isNaN(id)) throw new AppError("Selecciona una sede válida.", 400);

  const sede = await app.prisma.sede.findUnique({ where: { id } });
  if (!sede) throw new AppError("La sede seleccionada no existe.", 400);
  if (!sede.activo) throw new AppError("La sede seleccionada está inactiva.", 400);

  const tipoEsperado = TIPO_SEDE_POR_ROL[rol];
  if (tipoEsperado && sede.tipo !== tipoEsperado) {
    throw new AppError(
      rol === "Oficinista"
        ? "El rol Oficinista solo puede asignarse a oficinas."
        : `El rol ${rol} solo puede asignarse a bodegas.`,
      400,
    );
  }
  return id;
}

// Devuelve los ids de bodega de un entregador (su sede principal + las de la
// tabla puente). Valida que todas existan, estén activas y sean bodegas.
async function resolverBodegasEntregador(app, sedeId, sedesIds) {
  const ids = Array.isArray(sedesIds) && sedesIds.length > 0
    ? [...new Set(sedesIds.map((s) => parseInt(s, 10)))]
    : [];
  const primario = parseInt(sedeId, 10);
  if (Number.isNaN(primario)) throw new AppError("Selecciona al menos una bodega.", 400);
  if (!ids.includes(primario)) ids.unshift(primario);

  const bodegas = await app.prisma.sede.findMany({
    where: { id: { in: ids }, activo: true, tipo: "Bodega" },
    select: { id: true },
  });
  if (bodegas.length !== ids.length) {
    throw new AppError(
      "Una o más bodegas seleccionadas no existen, están inactivas o no son de tipo Bodega.",
      400,
    );
  }
  return ids;
}

const usuarioService = (app) => {
  const repo = usuarioRepo(app.prisma);

  return {
    getAll: () => repo.findAll(),

    // Usado por Bodega/Admin/AdminBogota/Oficinista para asignar pedidos a
    // entregadores. Solo se listan los entregadores de la bodega del usuario:
    //  - Bodega         → entregadores de su bodega (sedeId)
    //  - Oficinista     → entregadores de la bodega de su oficina (bodegaId)
    //  - Admin/AdminBogota → todos los entregadores (gestionan toda la ciudad)
    getEntregadores: async (usuario) => {
      const where = { rol: "Entregador", activo: true };

      if (usuario?.rol === "Bodega" || usuario?.rol === "Oficinista") {
        let bodegaId = usuario.sedeId;
        if (usuario.rol === "Oficinista" && usuario.bodegaId) {
          bodegaId = usuario.bodegaId;
        }
        if (bodegaId != null) {
          where.OR = [
            { sedeId: bodegaId },
            { entregadorSedes: { some: { sedeId: bodegaId } } },
          ];
        }
      }

      return app.prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nombreCompleto: true,
          telefono: true,
          sedeId: true,
          sede: { select: { nombre: true } },
          entregadorSedes: {
            select: { sede: { select: { id: true, nombre: true } } },
          },
        },
        orderBy: { nombreCompleto: "asc" },
      });
    },

    getById: async (id) => {
      const user = await repo.findById(id);
      if (!user) throw new AppError("Usuario no encontrado", 404);
      return user;
    },

    create: async (data, creadoPorId) => {
      const { nombreCompleto, usuario, correo, contrasena, rol, telefono, sedeId, sedesIds, activo } = data;

      const correoNormalizado = correo?.trim() || `${usuario}@katepramax.local`;
      const [existeUsuario, existeCorreo] = await Promise.all([
        repo.findByUsuario(usuario),
        repo.findByCorreo(correoNormalizado),
      ]);

      if (existeUsuario) throw new AppError("El nombre de usuario ya está en uso", 400);
      if (existeCorreo) throw new AppError("El correo ya está registrado", 400);

      // Sede principal validada según el rol.
      const sedeIdFinal = await validarSede(app, sedeId, rol);

      // Para entregador: puede estar asignado a varias bodegas.
      let bodegasEntregador = [];
      if (rol === "Entregador") {
        bodegasEntregador = await resolverBodegasEntregador(app, sedeIdFinal, sedesIds);
      }

      const clave = await bcrypt.hash(contrasena, 10);
      const nuevo = await repo.create({
        nombreCompleto,
        usuario,
        correo: correoNormalizado,
        clave,
        rol,
        telefono: telefono ?? "",
        sedeId: sedeIdFinal,
        activo: activo !== undefined ? Boolean(activo) : true,
      });

      if (rol === "Entregador" && bodegasEntregador.length > 0) {
        await app.prisma.entregadorSede.createMany({
          data: bodegasEntregador.map((sid) => ({
            entregadorId: nuevo.id,
            sedeId: sid,
          })),
        });
      }

      await registrarAccion(
        app,
        creadoPorId,
        "CREAR_USUARIO",
        `Usuario creado: ${nuevo.usuario} (${nuevo.rol})`,
      );
      return {
        id: nuevo.id,
        nombreCompleto: nuevo.nombreCompleto,
        usuario: nuevo.usuario,
        rol: nuevo.rol,
        sedeId: nuevo.sedeId,
      };
    },

    update: async (id, data, actualizadoPorId) => {
      const existe = await repo.findById(id);
      if (!existe) throw new AppError("Usuario no encontrado", 404);

      const campos = {};
      const permitidos = ["nombreCompleto", "usuario", "correo", "telefono", "rol", "sedeId", "activo"];
      permitidos.forEach((c) => {
        if (data[c] !== undefined) campos[c] = data[c];
      });

      if (campos.usuario && campos.usuario !== existe.usuario) {
        const usuarioExistente = await repo.findByUsuario(campos.usuario);
        if (usuarioExistente) throw new AppError("El nombre de usuario ya está en uso", 400);
      }

      if (campos.correo) {
        const correoExistente = await repo.findByCorreo(campos.correo);
        if (correoExistente && correoExistente.id !== id) {
          throw new AppError("El correo ya está registrado", 400);
        }
      }

      const rolFinal = campos.rol ?? existe.rol;
      const sedeFinal = campos.sedeId !== undefined ? parseInt(campos.sedeId, 10) : existe.sedeId;

      // Validar la sede principal según el rol final.
      await validarSede(app, sedeFinal, rolFinal);

      // Para entregador: validar sus bodegas antes de persistir.
      // Si no se envían sedesIds (ej: solo se cambia el nombre), se conservan
      // las bodegas actuales del entregador en lugar de resetearlas.
      let bodegasEntregador = null;
      if (rolFinal === "Entregador") {
        const sedesFuente =
          Array.isArray(data.sedesIds) && data.sedesIds.length > 0
            ? data.sedesIds
            : (existe.entregadorSedes ?? []).map((e) => e.sedeId);
        bodegasEntregador = await resolverBodegasEntregador(app, sedeFinal, sedesFuente);
      }

      if (campos.sedeId !== undefined) campos.sedeId = parseInt(campos.sedeId, 10);
      if (campos.activo !== undefined) campos.activo = Boolean(campos.activo);
      if (campos.telefono !== undefined) campos.telefono = campos.telefono ?? "";

      if (data.contrasena) {
        campos.clave = await bcrypt.hash(data.contrasena, 10);
      }

      const actualizado = await repo.update(id, campos);

      // Sincronizar la tabla puente de bodegas del entregador.
      await app.prisma.entregadorSede.deleteMany({ where: { entregadorId: id } });
      if (rolFinal === "Entregador" && bodegasEntregador.length > 0) {
        await app.prisma.entregadorSede.createMany({
          data: bodegasEntregador.map((sid) => ({ entregadorId: id, sedeId: sid })),
        });
      }

      await registrarAccion(
        app,
        actualizadoPorId,
        "ACTUALIZAR_USUARIO",
        `Usuario actualizado: ${actualizado.usuario}`,
      );
      return actualizado;
    },

    setActivo: async (id, activo, accionadoPorId) => {
      const existe = await repo.findById(id);
      if (!existe) throw new AppError("Usuario no encontrado", 404);
      const resultado = await repo.setActivo(id, activo);
      const accion = activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO";
      await registrarAccion(
        app,
        accionadoPorId,
        accion,
        `Usuario ${activo ? "activado" : "desactivado"}: ${resultado.usuario}`,
      );
      return resultado;
    },
  };
};

module.exports = usuarioService;
