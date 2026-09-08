import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import proveedoresService from "@/services/proveedores.service";
import inventarioService from "@/services/inventario.service";
import ProveedoresListado from "./ProveedoresListado";
import ProveedoresModales from "./ProveedoresModales";
import "./ProveedoresPage.css";

const ProveedoresPage = () => {
  const { esAdmin, esBodega, esOficinista, isAuthenticated, isSessionChecked } = useAuth();
  const puedeCrear = esAdmin || esBodega || esOficinista;
  const puedeGestionar = esAdmin || esBodega;
  const puedeAbonar = esAdmin || esOficinista;
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [deudaProveedores, setDeudaProveedores] = useState([]);
  const [filtros, setFiltros] = useState({ activo: "" });
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [formProveedor, setFormProveedor] = useState({ nombre: "", activo: true });

  const recargarProveedores = useCallback(async () => {
    setCargando(true);
    try {
      const data = await proveedoresService.obtenerProveedores(filtros);
      setProveedores(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Error al cargar proveedores: " + error.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  const handleCambioFiltro = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCambioFormProveedor = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormProveedor((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const resetFormProveedor = useCallback(() => {
    setFormProveedor({ nombre: "", activo: true });
  }, []);

  const handleGuardarProveedor = useCallback(async () => {
    if (!formProveedor.nombre.trim()) {
      toast.error("Por favor ingrese el nombre del proveedor.");
      return;
    }
    setGuardando(true);
    try {
      const data = { nombre: formProveedor.nombre.trim(), activo: formProveedor.activo };
      if (proveedorSeleccionado) {
        await proveedoresService.actualizarProveedor(proveedorSeleccionado.id, data);
        toast.success("Proveedor actualizado exitosamente.");
      } else {
        await proveedoresService.crearProveedor(data);
        toast.success("Proveedor creado exitosamente.");
      }
      setModalProveedorAbierto(false);
      resetFormProveedor();
      await recargarProveedores();
    } catch (error) {
      toast.error("Error al guardar el proveedor: " + error.message);
    } finally {
      setGuardando(false);
    }
  }, [formProveedor, proveedorSeleccionado, recargarProveedores, resetFormProveedor]);

  const handleEliminarProveedor = useCallback(async () => {
    if (!proveedorSeleccionado) return;
    setGuardando(true);
    try {
      await proveedoresService.eliminarProveedor(proveedorSeleccionado.id);
      setModalEliminarAbierto(false);
      await recargarProveedores();
      toast.success("Proveedor desactivado exitosamente.");
    } catch (error) {
      toast.error("Error al desactivar el proveedor: " + error.message);
    } finally {
      setGuardando(false);
    }
  }, [proveedorSeleccionado, recargarProveedores]);

  const handleReactivarProveedor = useCallback(async (proveedor) => {
    try {
      await proveedoresService.actualizarProveedor(proveedor.id, { activo: true });
      await recargarProveedores();
      toast.success("Proveedor reactivado exitosamente.");
    } catch (error) {
      toast.error("Error al reactivar el proveedor: " + error.message);
    }
  }, [recargarProveedores]);

  const abrirNuevoProveedor = useCallback(() => {
    setProveedorSeleccionado(null);
    resetFormProveedor();
    setModalProveedorAbierto(true);
  }, [resetFormProveedor]);

  const abrirEditarProveedor = useCallback((proveedor) => {
    setProveedorSeleccionado(proveedor);
    setFormProveedor({ nombre: proveedor.nombre, activo: proveedor.activo });
    setModalProveedorAbierto(true);
  }, []);

  const abrirEliminarProveedor = useCallback((proveedor) => {
    setProveedorSeleccionado(proveedor);
    setModalEliminarAbierto(true);
  }, []);

  const columnasProveedores = useMemo(() => [
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "saldoDeuda", label: "Saldo deuda", tipo: "moneda" },
    { campo: "activo", label: "Estado", tipo: "booleano" },
  ], []);

  const acciones = useMemo(() => (proveedor) => {
    const base = [];
    if (!esBodega) {
      base.push({
        label: "Ver historial",
        icon: "history",
        onClick: () => navigate(`/proveedores/cartera/historial/${proveedor.id}`),
      });
    }
    // Admin y Bodega pueden editar
    if (puedeGestionar) {
      base.push({
        label: "Editar",
        icon: "edit",
        onClick: () => abrirEditarProveedor(proveedor),
      });
    }
    if (esAdmin && proveedor.activo) {
      base.push({
        label: "Desactivar",
        icon: "delete",
        variante: "danger",
        onClick: () => abrirEliminarProveedor(proveedor),
      });
    }
    if (esAdmin && !proveedor.activo) {
      base.push({
        label: "Reactivar",
        icon: "restore_from_trash",
        variante: "success",
        onClick: () => handleReactivarProveedor(proveedor),
      });
    }
    return base;
  }, [esAdmin, esBodega, puedeGestionar, navigate, abrirEditarProveedor, abrirEliminarProveedor, handleReactivarProveedor]);

  const cargarDeuda = useCallback(async () => {
    try {
      const data = await inventarioService.obtenerDeudaProveedores();
      setDeudaProveedores(Array.isArray(data) ? data : []);
    } catch {
      setDeudaProveedores([]);
    }
  }, []);

  // Fila por proveedor con su saldo de deuda
  const proveedoresConDeuda = useMemo(() => {
    if (deudaProveedores.length === 0) return proveedores;
    const saldoPorProveedor = new Map(
      deudaProveedores.map((d) => [Number(d.proveedorId), Number(d.saldoPendiente ?? 0)]),
    );
    return proveedores.map((p) => ({
      ...p,
      saldoDeuda: saldoPorProveedor.get(Number(p.id)) ?? 0,
    }));
  }, [proveedores, deudaProveedores]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => { void recargarProveedores(); }, 0);
    const idDeuda = window.setTimeout(() => { void cargarDeuda(); }, 0);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(idDeuda);
    };
  }, [recargarProveedores, cargarDeuda, isSessionChecked, isAuthenticated]);

  // Stats
  const totalActivos   = proveedores.filter((p) => p.activo).length;
  const totalInactivos = proveedores.filter((p) => !p.activo).length;

  return (
    <div className="proveedores-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Proveedores</h1>
          <p className="proveedores-subtitulo">
            Administra la red de proveedores activos e inactivos
          </p>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="activo-filter">Estado</label>
            <select
              id="activo-filter"
              value={filtros.activo}
              onChange={handleCambioFiltro}
              name="activo"
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {/* El alta también está disponible para Oficinista */}
          {puedeCrear && (
            <button className="btn-primary" onClick={abrirNuevoProveedor} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
              Nuevo Proveedor
            </button>
          )}

          {/* Carrera de proveedores: ver y abonar deuda */}
          {puedeAbonar && (
            <button
              className="btn-primary"
              onClick={() => navigate("/proveedores/cartera")}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
              Cartera Proveedores
            </button>
          )}
        </div>
      </div>

      <ProveedoresListado
        proveedores={proveedores}
        proveedoresConDeuda={proveedoresConDeuda}
        totalActivos={totalActivos}
        totalInactivos={totalInactivos}
        cargando={cargando}
        columnas={columnasProveedores}
        acciones={acciones}
        filtros={filtros}
      />

      <ProveedoresModales
        modalProveedorAbierto={modalProveedorAbierto}
        modalEliminarAbierto={modalEliminarAbierto}
        proveedorSeleccionado={proveedorSeleccionado}
        formProveedor={formProveedor}
        guardando={guardando}
        onCerrarProveedor={() => setModalProveedorAbierto(false)}
        onCerrarEliminar={() => setModalEliminarAbierto(false)}
        onGuardar={handleGuardarProveedor}
        onEliminar={handleEliminarProveedor}
        onCambioForm={handleCambioFormProveedor}
      />
    </div>
  );
};

export default ProveedoresPage;
