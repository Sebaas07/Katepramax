import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import proveedoresService from "@/services/proveedores.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./ProveedoresPage.css";

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="prov-spinner-wrap">
    <div className="prov-spinner" />
    <span>Cargando proveedores...</span>
  </div>
);

const FORM_INICIAL = { nombre: "", activo: true };

const ProveedoresPage = () => {
  const { esAdmin, esBodega } = useAuth();
  const puedeCrear      = esAdmin || esBodega;
  const puedeEditar     = esAdmin || esBodega;
  const puedeDesactivar = esAdmin;

  // ── Estado ────────────────────────────────────────────────
  const [proveedores,   setProveedores]   = useState([]);
  const [cargando,      setCargando]      = useState(false);
  const [guardando,     setGuardando]     = useState(false);
  const [filtroActivo,  setFiltroActivo]  = useState("");

  const [modalFormAbierto,    setModalFormAbierto]    = useState(false);
  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [proveedorSel,        setProveedorSel]        = useState(null);
  const [form,                setForm]                = useState(FORM_INICIAL);

  // ── Carga ─────────────────────────────────────────────────
  const cargarProveedores = async (filtro) => {
    try {
      const data = await proveedoresService.obtenerProveedores(filtro);
      setProveedores(data);
    } catch (err) {
      toast.error("Error al cargar proveedores: " + err.message);
    }
  };

  useEffect(() => {
    setCargando(true);
    const filtros = filtroActivo !== "" ? { activo: filtroActivo === "true" } : {};
    cargarProveedores(filtros).finally(() => setCargando(false));
  }, [filtroActivo]);

  // ── Handlers ──────────────────────────────────────────────
  const abrirNuevo = () => {
    setProveedorSel(null);
    setForm(FORM_INICIAL);
    setModalFormAbierto(true);
  };

  const abrirEditar = (prov) => {
    setProveedorSel(prov);
    setForm({ nombre: prov.nombre ?? "", activo: prov.activo ?? true });
    setModalFormAbierto(true);
  };

  const abrirDesactivar = (prov) => {
    setProveedorSel(prov);
    setModalConfirmAbierto(true);
  };

  const handleCambioForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ── Guardar ───────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!form.nombre.trim()) {
      toast("El nombre del proveedor es obligatorio.", { icon: "⚠️" });
      return;
    }
    setGuardando(true);
    try {
      if (proveedorSel) {
        await proveedoresService.actualizarProveedor(proveedorSel.id, {
          nombre: form.nombre.trim(),
          activo: form.activo,
        });
        toast.success("Proveedor actualizado.");
      } else {
        await proveedoresService.crearProveedor({
          nombre: form.nombre.trim(),
          activo: form.activo,
        });
        toast.success("Proveedor creado correctamente.");
      }
      setModalFormAbierto(false);
      await cargarProveedores();
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Desactivar / reactivar ────────────────────────────────
  const handleDesactivar = async () => {
    if (!proveedorSel) return;
    setGuardando(true);
    try {
      await proveedoresService.desactivarProveedor(proveedorSel.id);
      toast.success("Proveedor desactivado.");
      setModalConfirmAbierto(false);
      await cargarProveedores();
    } catch (err) {
      toast.error("Error al desactivar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleReactivar = async (prov) => {
    try {
      await proveedoresService.actualizarProveedor(prov.id, { activo: true });
      toast.success("Proveedor reactivado.");
      await cargarProveedores();
    } catch (err) {
      toast.error("Error al reactivar: " + err.message);
    }
  };

  // ── Columnas ──────────────────────────────────────────────
  const columnas = [
    { campo: "id",       label: "ID",       tipo: "texto"    },
    { campo: "nombre",   label: "Nombre",   tipo: "texto"    },
    { campo: "activo",   label: "Estado",   tipo: "booleano" },
    { campo: "creadoEn", label: "Registro", tipo: "fecha"    },
  ];

  const acciones = (prov) => {
    const lista = [];
    if (puedeEditar) {
      lista.push({ label: "Editar", icon: "edit", onClick: () => abrirEditar(prov) });
    }
    if (puedeDesactivar && prov.activo) {
      lista.push({
        label: "Desactivar",
        icon: "block",
        variante: "danger",
        onClick: () => abrirDesactivar(prov),
      });
    }
    if (puedeDesactivar && !prov.activo) {
      lista.push({
        label: "Reactivar",
        icon: "check_circle",
        variante: "success",
        onClick: () => handleReactivar(prov),
      });
    }
    return lista;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="proveedores-page">
      {/* Header */}
      <div className="page-header">
        <h1>Proveedores</h1>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="prov-filtro-activo">Estado</label>
            <select
              id="prov-filtro-activo"
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {puedeCrear && (
            <button className="btn-primary" onClick={abrirNuevo} type="button">
              <span className="material-symbols-outlined">add</span>
              Nuevo proveedor
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={proveedores}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["nombre"]}
            paginacion
            renderAcciones={acciones}
          />
        )}
      </div>

      {/* Modal — Crear / Editar */}
      <Modal
        isOpen={modalFormAbierto}
        onClose={() => setModalFormAbierto(false)}
        titulo={proveedorSel ? "Editar Proveedor" : "Nuevo Proveedor"}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardar}
        mostrarCancelar
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="prov-nombre">Nombre del proveedor *</label>
            <input
              id="prov-nombre"
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="Nombre o razón social"
              autoFocus
            />
          </div>

          {proveedorSel && (
            <div className="form-group form-group--check">
              <label htmlFor="prov-activo" className="prov-check-label">
                <input
                  id="prov-activo"
                  type="checkbox"
                  name="activo"
                  checked={form.activo}
                  onChange={handleCambioForm}
                  className="prov-checkbox"
                />
                Proveedor activo
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal — Confirmar desactivar */}
      <Modal
        isOpen={modalConfirmAbierto}
        onClose={() => setModalConfirmAbierto(false)}
        titulo="Desactivar Proveedor"
        textoBotonConfirmar={guardando ? "Desactivando..." : "Sí, desactivar"}
        onConfirmar={handleDesactivar}
        mostrarCancelar
      >
        <div className="prov-confirm-body">
          <span className="material-symbols-outlined prov-confirm-icon">warning</span>
          <p>
            ¿Estás seguro de desactivar a{" "}
            <strong>{proveedorSel?.nombre}</strong>?
          </p>
          <p className="prov-confirm-sub">
            Los productos asociados conservarán su vínculo pero el proveedor no
            aparecerá en nuevos registros.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ProveedoresPage;