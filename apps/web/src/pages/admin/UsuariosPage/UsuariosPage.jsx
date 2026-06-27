import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import usuarioService from "@/services/usuario.service";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import { formatFecha } from "@/utils/formatters";
import "./UsuariosPage.css";

const ROLES = [
  { value: "Admin", label: "Admin" },
  { value: "AdminBogota", label: "AdminBogota" },
  { value: "Bodega", label: "Bodega" },
  { value: "Entregador", label: "Entregador" },
];

const FORM_INICIAL = {
  nombreCompleto: "",
  usuario: "",
  contrasena: "",
  confirmarContrasena: "",
  rol: "Bodega",
  sedeId: "",
  activo: true,
};

const Spinner = () => (
  <div className="usr-spinner-wrap">
    <div className="usr-spinner" />
    <span>Cargando usuarios...</span>
  </div>
);

const RoleBadge = ({ rol }) => {
  const config = {
    Admin: {
      color: "#d8b4fe",
      bg: "rgba(216,180,254,0.14)",
      border: "rgba(216,180,254,0.35)",
    },
    AdminBogota: {
      color: "#fde68a",
      bg: "rgba(253,230,138,0.14)",
      border: "rgba(253,230,138,0.35)",
    },
    Bodega: {
      color: "#93c5fd",
      bg: "rgba(147,197,253,0.14)",
      border: "rgba(147,197,253,0.35)",
    },
    Entregador: {
      color: "#86efac",
      bg: "rgba(134,239,172,0.14)",
      border: "rgba(134,239,172,0.35)",
    },
  }[rol] ?? {
    color: "var(--on-surface-variant)",
    bg: "rgba(255,255,255,0.06)",
    border: "var(--outline-variant)",
  };

  return (
    <span className="usr-role-badge" style={config}>
      {rol || "—"}
    </span>
  );
};

const normalizeUsuario = (usuario) => ({
  ...usuario,
  id: usuario.id,
  nombreCompleto: usuario.nombreCompleto || "Sin nombre",
  usuario: usuario.usuario || "—",
  rol: usuario.rol || "—",
  sede: usuario.sede?.nombre || `Sede ${usuario.sedeId || ""}`.trim() || "—",
  sedeId: usuario.sedeId || "",
  activo: usuario.activo ?? false,
  creadoEn: usuario.creadoEn || usuario.createdAt || null,
});

const UsuariosPage = () => {
  const { esAdmin, isAuthenticated, isSessionChecked } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioSel, setUsuarioSel] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const data = await usuarioService.obtenerUsuarios();
      setUsuarios(Array.isArray(data) ? data.map(normalizeUsuario) : []);
    } catch (error) {
      toast.error(`Error al cargar usuarios: ${error.message}`);
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;

    const id = window.setTimeout(() => {
      void cargarUsuarios();
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargarUsuarios, isSessionChecked, isAuthenticated]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;

    const cargarSedes = async () => {
      setCargandoSedes(true);
      try {
        const data = await inventarioService.obtenerSedes();
        setSedes(Array.isArray(data) ? data : []);
      } catch (err) {
        setSedes([]);
      } finally {
        setCargandoSedes(false);
      }
    };

    void cargarSedes();
  }, [isSessionChecked, isAuthenticated]);

  const [filtroRol, setFiltroRol] = useState("");
  const [filtroSedeId, setFiltroSedeId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [sedes, setSedes] = useState([]);
  const [cargandoSedes, setCargandoSedes] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const pasaRol = !filtroRol || usuario.rol === filtroRol;
      const pasaSede = !filtroSedeId || String(usuario.sedeId) === String(filtroSedeId);
      const texto = `${usuario.nombreCompleto} ${usuario.usuario}`.toLowerCase();
      const pasaBusqueda = !termino || texto.includes(termino);

      return pasaRol && pasaSede && pasaBusqueda;
    });
  }, [usuarios, filtroRol, filtroSedeId, busqueda]);

  const totalActivos = usuarios.filter((usuario) => usuario.activo).length;
  const totalInactivos = usuarios.length - totalActivos;

  const resetForm = useCallback(() => {
    setForm(FORM_INICIAL);
    setErrores({});
  }, []);

  const abrirCrear = useCallback(() => {
    resetForm();
    setUsuarioSel(null);
    setModalAbierto(true);
  }, [resetForm]);

  const abrirEditar = useCallback((usuario) => {
    const seleccionado = normalizeUsuario(usuario);
    setUsuarioSel(seleccionado);
    setForm({
      nombreCompleto: seleccionado.nombreCompleto,
      usuario: seleccionado.usuario,
      contrasena: "",
      confirmarContrasena: "",
      rol: seleccionado.rol,
      sedeId: String(seleccionado.sedeId || ""),
      activo: seleccionado.activo,
    });
    setErrores({});
    setModalAbierto(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setModalAbierto(false);
    setUsuarioSel(null);
    resetForm();
  }, [resetForm]);

  const handleCambioForm = useCallback((event) => {
    const { name, type, value, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const validarFormulario = useCallback(() => {
    const nuevosErrores = {};
    const nombreCompleto = form.nombreCompleto.trim();
    const usuario = form.usuario.trim();

    if (!nombreCompleto) {
      nuevosErrores.nombreCompleto = "El nombre completo es obligatorio.";
    }

    if (!usuario) {
      nuevosErrores.usuario = "El nombre de usuario es obligatorio.";
    } else if (!/^[a-zA-Z0-9_]{5,50}$/.test(usuario)) {
      nuevosErrores.usuario = "Usa de 5 a 50 caracteres: letras, números y guión bajo.";
    }

    if (!form.rol) {
      nuevosErrores.rol = "Selecciona un rol.";
    }

    if (!form.sedeId) {
      nuevosErrores.sedeId = "Selecciona una sede.";
    }

    if (!usuarioSel) {
      if (!form.contrasena) {
        nuevosErrores.contrasena = "La contraseña es obligatoria.";
      } else if (form.contrasena.length < 6) {
        nuevosErrores.contrasena = "La contraseña debe tener al menos 6 caracteres.";
      }

      if (form.contrasena !== form.confirmarContrasena) {
        nuevosErrores.confirmarContrasena = "Las contraseñas no coinciden.";
      }
    }

    const usuarioDuplicado = usuarios.some(
      (item) =>
        item.id !== usuarioSel?.id &&
        String(item.usuario).toLowerCase() === usuario.toLowerCase()
    );

    if (usuarioDuplicado) {
      nuevosErrores.usuario = "Este nombre de usuario ya está registrado.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, [form, usuarios, usuarioSel]);

  const handleGuardar = useCallback(async () => {
    if (!validarFormulario()) return;

    setGuardando(true);
    try {
      if (usuarioSel) {
        await usuarioService.actualizarUsuario(usuarioSel.id, {
          nombreCompleto: form.nombreCompleto.trim(),
          usuario: form.usuario.trim(),
          rol: form.rol,
          sedeId: form.sedeId,
          activo: form.activo,
          ...(form.contrasena ? { contrasena: form.contrasena, confirmarContrasena: form.confirmarContrasena } : {}),
        });
        toast.success("Usuario actualizado correctamente.");
      } else {
        await usuarioService.crearUsuario({
          nombreCompleto: form.nombreCompleto.trim(),
          usuario: form.usuario.trim(),
          contrasena: form.contrasena,
          confirmarContrasena: form.confirmarContrasena,
          rol: form.rol,
          sedeId: form.sedeId,
          activo: form.activo,
        });
        toast.success("Usuario creado correctamente.");
      }

      cerrarModal();
      await cargarUsuarios();
    } catch (error) {
      toast.error(`Error al guardar usuario: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }, [validarFormulario, usuarioSel, form, cerrarModal, cargarUsuarios]);

  const cambiarEstado = useCallback(async (usuario) => {
    const seleccionado = normalizeUsuario(usuario);

    if (seleccionado.activo) {
      const confirmado = window.confirm(
        `¿Desactivar a "${seleccionado.nombreCompleto}"? No podrá iniciar sesión hasta que sea activado nuevamente.`
      );
      if (!confirmado) return;
    }

    setGuardando(true);
    try {
      if (seleccionado.activo) {
        await usuarioService.desactivarUsuario(seleccionado.id);
        toast.success(`${seleccionado.nombreCompleto} desactivado correctamente.`);
      } else {
        await usuarioService.activarUsuario(seleccionado.id);
        toast.success(`${seleccionado.nombreCompleto} activado correctamente.`);
      }

      await cargarUsuarios();
    } catch (error) {
      toast.error(`Error al cambiar estado: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }, [cargarUsuarios]);

  const columnas = useMemo(
    () => [
      { campo: "nombreCompleto", label: "Nombre Completo", tipo: "texto" },
      { campo: "usuario", label: "Usuario", tipo: "texto" },
      { campo: "rol", label: "Rol", tipo: "texto" },
      { campo: "sede", label: "Sede", tipo: "texto" },
      { campo: "activo", label: "Estado", tipo: "booleano" },
      { campo: "creadoEn", label: "Fecha de creación", tipo: "fecha" },
    ],
    []
  );

  const renderAcciones = useCallback(
    (usuario) => {
      const seleccionado = normalizeUsuario(usuario);
      const puedeCambiarEstado = seleccionado.id !== undefined;

      return [
        {
          label: "Editar",
          icon: "edit",
          onClick: () => abrirEditar(seleccionado),
        },
        ...(puedeCambiarEstado
          ? [
              {
                label: seleccionado.activo ? "Desactivar" : "Activar",
                icon: seleccionado.activo ? "person_off" : "person",
                onClick: () => cambiarEstado(seleccionado),
                variante: seleccionado.activo ? "danger" : "success",
              },
            ]
          : []),
      ];
    },
    [abrirEditar, cambiarEstado]
  );

  const renderCeldaCustom = useCallback((fila, columna) => {
    if (columna.campo === "rol") {
      return <RoleBadge rol={fila.rol} />;
    }

    if (columna.campo === "creadoEn") {
      return formatFecha(fila.creadoEn);
    }

    return null;
  }, []);

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="usr-subtitulo">CRUD exclusivo para administradores</p>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="usr-filtro-rol">Rol</label>
            <select
              id="usr-filtro-rol"
              value={filtroRol}
              onChange={(event) => setFiltroRol(event.target.value)}
              className="filter-select"
            >
              <option value="">Todos los roles</option>
              {ROLES.map((rol) => (
                <option key={rol.value} value={rol.value}>
                  {rol.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="usr-filtro-sede">Sede</label>
            <select
              id="usr-filtro-sede"
              value={filtroSedeId}
              onChange={(event) => setFiltroSedeId(event.target.value)}
              className="filter-select"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group filter-group--search">
            <label htmlFor="usr-busqueda">Búsqueda</label>
            <div className="search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                id="usr-busqueda"
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Nombre o usuario"
              />
            </div>
          </div>

          {esAdmin && (
            <button className="btn-primary" onClick={abrirCrear} type="button">
              <span className="material-symbols-outlined">person_add</span>
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      <div className="usr-stats">
        <div className="usr-stat-card">
          <span className="material-symbols-outlined">group</span>
          <div>
            <span className="usr-stat-valor">{usuarios.length}</span>
            <span className="usr-stat-label">Total usuarios</span>
          </div>
        </div>
        <div className="usr-stat-card usr-stat-card--activo">
          <span className="material-symbols-outlined">person</span>
          <div>
            <span className="usr-stat-valor">{totalActivos}</span>
            <span className="usr-stat-label">Activos</span>
          </div>
        </div>
        <div className="usr-stat-card usr-stat-card--inactivo">
          <span className="material-symbols-outlined">person_off</span>
          <div>
            <span className="usr-stat-valor">{totalInactivos}</span>
            <span className="usr-stat-label">Inactivos</span>
          </div>
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : usuarios.length === 0 ? (
          <EmptyState
            icono="group_add"
            titulo="No hay usuarios registrados"
            detalle="Crea el primer usuario para comenzar a administrar accesos."
          >
            {esAdmin && (
              <button className="btn-primary" onClick={abrirCrear} type="button">
                <span className="material-symbols-outlined">person_add</span>
                Nuevo Usuario
              </button>
            )}
          </EmptyState>
        ) : usuariosFiltrados.length === 0 ? (
          <EmptyState
            icono="search_off"
            titulo="Sin resultados"
            detalle="Ajusta los filtros para encontrar usuarios."
          >
            <button
              className="btn-outline-gold"
              onClick={() => {
                setFiltroRol("");
                setFiltroSedeId("");
                setBusqueda("");
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          </EmptyState>
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={usuariosFiltrados}
            filasPorPagina={10}
            mostrarBuscador={false}
            paginacion
            renderAcciones={renderAcciones}
            renderCeldaCustom={renderCeldaCustom}
          />
        )}
      </div>

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        titulo={usuarioSel ? "Editar Usuario" : "Nuevo Usuario"}
        textoBotonConfirmar={guardando ? "Guardando..." : usuarioSel ? "Actualizar" : "Crear Usuario"}
        onConfirmar={handleGuardar}
        mostrarCancelar
        disabled={guardando}
        className="modal-content--usuario"
        maxWidth="680px"
      >
        <div className="modal-form modal-form--usuario">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="usr-nombre-completo">Nombre completo *</label>
              <input
                id="usr-nombre-completo"
                name="nombreCompleto"
                type="text"
                value={form.nombreCompleto}
                onChange={handleCambioForm}
                className="form-control"
                placeholder="Nombre completo del usuario"
                autoComplete="off"
              />
              {errores.nombreCompleto && (
                <span className="form-error">{errores.nombreCompleto}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="usr-rol">Rol *</label>
              <select
                id="usr-rol"
                name="rol"
                value={form.rol}
                onChange={handleCambioForm}
                className="form-control"
              >
                {ROLES.map((rol) => (
                  <option key={rol.value} value={rol.value}>
                    {rol.label}
                  </option>
                ))}
              </select>
              {errores.rol && <span className="form-error">{errores.rol}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="usr-usuario">Nombre de usuario *</label>
              <input
                id="usr-usuario"
                name="usuario"
                type="text"
                value={form.usuario}
                onChange={handleCambioForm}
                className="form-control"
                placeholder="usuario_sistema"
                autoComplete="off"
              />
              {errores.usuario && <span className="form-error">{errores.usuario}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="usr-sede">Sede *</label>
              <select
                id="usr-sede"
                name="sedeId"
                value={form.sedeId}
                onChange={handleCambioForm}
                className="form-control"
              >
                <option value="">Selecciona una sede</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
              {errores.sedeId && <span className="form-error">{errores.sedeId}</span>}
            </div>
          </div>

          {!usuarioSel && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="usr-contrasena">Contraseña *</label>
                <input
                  id="usr-contrasena"
                  name="contrasena"
                  type="password"
                  value={form.contrasena}
                  onChange={handleCambioForm}
                  className="form-control"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
                {errores.contrasena && (
                  <span className="form-error">{errores.contrasena}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="usr-confirmar-contrasena">Confirmar contraseña *</label>
                <input
                  id="usr-confirmar-contrasena"
                  name="confirmarContrasena"
                  type="password"
                  value={form.confirmarContrasena}
                  onChange={handleCambioForm}
                  className="form-control"
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
                {errores.confirmarContrasena && (
                  <span className="form-error">{errores.confirmarContrasena}</span>
                )}
              </div>
            </div>
          )}

          <div className="form-row form-row--checkbox">
            <label className="checkbox-label" htmlFor="usr-activo">
              <input
                id="usr-activo"
                name="activo"
                type="checkbox"
                checked={form.activo}
                onChange={handleCambioForm}
              />
              <span className="checkbox-text">Usuario activo</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosPage;
