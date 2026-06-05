import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import usuariosService from "@/services/usuarios.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import { formatFecha } from "@/utils/formatters";
import "./UsuariosPage.css";

const Spinner = () => (
  <div className="usr-spinner-wrap">
    <div className="usr-spinner" />
    <span>Cargando usuarios...</span>
  </div>
);

const UsuariosPage = () => {
  const { usuario: usuarioActual } = useAuth();

  const [usuarios,     setUsuarios]     = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [guardando,    setGuardando]    = useState(false);
  const [filtroRol,    setFiltroRol]    = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");

  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [usuarioSel,          setUsuarioSel]          = useState(null);
  const [accionPendiente,     setAccionPendiente]      = useState("");

  // ── Carga ─────────────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const data = await usuariosService.obtenerUsuarios();
      setUsuarios(data);
    } catch (err) {
      toast.error("Error al cargar usuarios: " + err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);

  // ── Filtrado local ─────────────────────────────────────────
  const usuariosFiltrados = usuarios.filter((u) => {
    const pasaRol    = filtroRol    === "" || u.rol    === filtroRol;
    const pasaActivo = filtroActivo === "" ||
      String(u.activo) === filtroActivo;
    return pasaRol && pasaActivo;
  });

  // ── Stats ──────────────────────────────────────────────────
  const totalActivos   = usuarios.filter((u) => u.activo).length;
  const totalInactivos = usuarios.filter((u) => !u.activo).length;
  const roles = [...new Set(usuarios.map((u) => u.rol).filter(Boolean))];

  // ── Acciones ───────────────────────────────────────────────
  const abrirConfirm = (usr, accion) => {
    setUsuarioSel(usr);
    setAccionPendiente(accion);
    setModalConfirmAbierto(true);
  };

  const handleConfirmar = async () => {
    if (!usuarioSel) return;
    setGuardando(true);
    try {
      if (accionPendiente === "desactivar") {
        await usuariosService.desactivarUsuario(usuarioSel.id);
        toast.success(`${usuarioSel.nombreCompleto} desactivado.`);
      } else {
        await usuariosService.activarUsuario(usuarioSel.id);
        toast.success(`${usuarioSel.nombreCompleto} activado.`);
      }
      setModalConfirmAbierto(false);
      await cargarUsuarios();
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Columnas ───────────────────────────────────────────────
  const columnas = [
    { campo: "nombreCompleto", label: "Nombre",   tipo: "texto"    },
    { campo: "usuario",        label: "Usuario",  tipo: "texto"    },
    { campo: "rol",            label: "Rol",      tipo: "texto"    },
    { campo: "sede",           label: "Sede",     tipo: "texto"    },
    { campo: "activo",         label: "Estado",   tipo: "booleano" },
    { campo: "creadoEn",       label: "Registro", tipo: "fecha"    },
  ];

  const accionesFila = (usr) => {
    // No puede desactivarse a sí mismo
    if (usr.id === usuarioActual?.id) return [];
    if (usr.activo) {
      return [{
        label: "Desactivar", icon: "person_off", variante: "danger",
        onClick: () => abrirConfirm(usr, "desactivar"),
      }];
    }
    return [{
      label: "Activar", icon: "person", variante: "success",
      onClick: () => abrirConfirm(usr, "activar"),
    }];
  };

  // Mapear sede anidada
  const usuariosMapeados = usuariosFiltrados.map((u) => ({
    ...u,
    sede: u.sede?.nombre ?? u.sedeId ?? "—",
  }));

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="usuarios-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="usr-subtitulo">Solo visible para administradores</p>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="usr-rol">Rol</label>
            <select
              id="usr-rol"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos los roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="usr-activo">Estado</label>
            <select
              id="usr-activo"
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
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

      {/* Tabla */}
      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={usuariosMapeados}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["nombreCompleto", "usuario", "rol", "sede"]}
            paginacion
            renderAcciones={accionesFila}
          />
        )}
      </div>

      {/* Modal confirmacion */}
      <Modal
        isOpen={modalConfirmAbierto}
        onClose={() => setModalConfirmAbierto(false)}
        titulo={accionPendiente === "desactivar" ? "Desactivar Usuario" : "Activar Usuario"}
        textoBotonConfirmar={guardando ? "Procesando..." :
          accionPendiente === "desactivar" ? "Sí, desactivar" : "Sí, activar"}
        onConfirmar={handleConfirmar}
        mostrarCancelar
      >
        <div className="usr-confirm-body">
          <span className="material-symbols-outlined usr-confirm-icon"
            style={{ color: accionPendiente === "desactivar" ? "var(--error)" : "#4ade80" }}>
            {accionPendiente === "desactivar" ? "person_off" : "person"}
          </span>
          <p>
            {accionPendiente === "desactivar"
              ? <>Desactivar a <strong>{usuarioSel?.nombreCompleto}</strong>. No podrá iniciar sesión.</>
              : <>Activar a <strong>{usuarioSel?.nombreCompleto}</strong>. Podrá iniciar sesión nuevamente.</>
            }
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosPage;
