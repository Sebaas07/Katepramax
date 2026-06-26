import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import ProveedorSelect from "@/components/common/ProveedorSelect/ProveedorSelect";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import { formatCOP } from "@/utils/formatters";
import "./ProductosPage.css";

const DEPARTAMENTOS = [
  "Abastecimiento",
  "Lácteos",
  "Abarrotes",
  "Congelados",
  "Limpieza",
  "Otros",
];

const INVENTARIO_ACTUALIZADO_EVENT = "katepramax:inventario-actualizado";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const obtenerStock = (producto, sedeId) => {
  const stockSedes = Array.isArray(producto.stockSedes)
    ? producto.stockSedes
    : [];
  const stockPorSede = stockSedes.find(
    (stock) => String(stock.sedeId) === String(sedeId),
  );

  if (stockPorSede) {
    return toNumber(stockPorSede.stockActual ?? stockPorSede.existencia, 0);
  }

  if (sedeId) {
    return toNumber(producto.existencia ?? producto.stockActual, 0);
  }

  if (stockSedes.length && producto.existencia == null) {
    return stockSedes.reduce(
      (total, stock) =>
        total + toNumber(stock.stockActual ?? stock.existencia, 0),
      0,
    );
  }

  return toNumber(producto.existencia ?? producto.stockActual, 0);
};

const normalizarProducto = (producto, sedeId, sedes = []) => {
  const stockSedes = Array.isArray(producto.stockSedes)
    ? producto.stockSedes
    : [];
  const stockSede = stockSedes.find(
    (stock) => String(stock.sedeId) === String(sedeId),
  );
  const existencia = obtenerStock(producto, sedeId);
  const stockMinimo = toNumber(
    producto.stockMinimo ?? producto.stockMinimoSede ?? producto.stockMin ?? 0,
    0,
  );
  const sedeNombre =
    stockSede?.sede?.nombre ||
    (sedeId
      ? sedes.find((s) => String(s.id) === String(sedeId))?.nombre
      : null) ||
    `Sede ${producto.sedeId || sedeId || ""}`.trim();

  const precioCosto = toNumber(
    producto.precioCosto ?? producto.precio_costo ?? 0,
    0,
  );
  const precioVenta = toNumber(
    producto.precioVenta ?? producto.precio_venta ?? 0,
    0,
  );
  const precioMayoreo =
    producto.precioMayoreo !== undefined && producto.precioMayoreo !== null
      ? toNumber(producto.precioMayoreo ?? producto.precio_mayoreo, 0)
      : undefined;
  const porcentajeGanancia = toNumber(
    producto.porcentajeGanancia ?? producto.porcentaje_ganancia ?? 0,
    0,
  );

  return {
    ...producto,
    id: producto.id ?? producto.codigo,
    codigo: producto.codigo,
    nombre: producto.descripcion || "Sin nombre",
    descripcion: producto.descripcion || producto.nombre || "",
    departamento: producto.departamento || producto.categoria || "Otros",
    precioCosto,
    precioMayoreo,
    porcentajeGanancia,
    precioDetal: precioVenta,
    precioVenta,
    existencia,
    stockMinimo,
    proveedor:
      producto.proveedor?.nombre ||
      producto.proveedorNombre ||
      (producto.proveedorId ? `Proveedor ${producto.proveedorId}` : "—"),
    proveedorId: producto.proveedor?.id || producto.proveedorId,
    sede: sedeNombre || "—",
    sedeId: stockSede?.sedeId || producto.sedeId || sedeId,
    activo: producto.activo ?? true,
    esStockBajo: stockMinimo > 0 && existencia <= stockMinimo,
  };
};

const Spinner = () => (
  <div className="prod-spinner-wrap">
    <div className="prod-spinner" aria-hidden="true" />
    <span>Cargando productos...</span>
  </div>
);

const ProductosPage = () => {
  const {
    esAdmin,
    esBodega,
    usuario,
    isAuthenticated,
    isSessionChecked,
    isLoading: authLoading,
  } = useAuth();
  const puedeEditar = esAdmin || esBodega;
  const sedeIdUsuario = usuario?.sedeId ?? null;

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [cargandoSedes, setCargandoSedes] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorProductos, setErrorProductos] = useState(null);
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [guardando, setGuardando] = useState(false);
const [form, setForm] = useState({
    descripcion: "",
    departamento: "",
    precioCosto: "",
    precioVenta: "",
    precioMayoreo: "",
    porcentajeGanancia: "",
    stockMinimo: "",
    stockInicial: "",
    proveedorId: "",
    activo: true,
    sedeId: "",
  });

  const sedeActivaId = esAdmin ? filtroSede : String(sedeIdUsuario ?? "");

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

  const cargarProductos = useCallback(async () => {
    setCargando(true);
    setErrorProductos(null);
    try {
      const data = await inventarioService.obtenerProductos({
        activo: "true",
        take: 200,
      });
      setProductos(Array.isArray(data) ? data : []);
    } catch (err) {
      const mensaje = err?.message || "Error al cargar productos";
      setErrorProductos(mensaje);
      setProductos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarMovimientos = useCallback(async () => {
    try {
      const data = await inventarioService.listarMovimientos({});
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(
        "Error al cargar movimientos: " + (err?.message || "desconocido"),
      );
    }
  }, []);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;

    const id = window.setTimeout(() => {
      void cargarProductos();
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargarProductos, isSessionChecked, isAuthenticated]);

  useEffect(() => {
    const recargar = () => {
      void cargarProductos();
      void cargarMovimientos();
    };

    window.addEventListener(INVENTARIO_ACTUALIZADO_EVENT, recargar);
    window.addEventListener("focus", recargar);

    return () => {
      window.removeEventListener(INVENTARIO_ACTUALIZADO_EVENT, recargar);
      window.removeEventListener("focus", recargar);
    };
  }, [cargarProductos, cargarMovimientos]);

  const handleCambioForm = useCallback((e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => {
      const next =
        type === "checkbox"
          ? { ...prev, [name]: checked }
          : { ...prev, [name]: value };

      if (name === "precioCosto" || name === "precioVenta") {
        const costo = toNumber(next.precioCosto, 0);
        const venta = toNumber(next.precioVenta, 0);
        if (costo > 0 && venta > 0) {
          next.porcentajeGanancia = Number(
            (((venta - costo) / costo) * 100).toFixed(2),
          ).toString();
        } else {
          next.porcentajeGanancia = "0";
        }
      }

      return next;
    });
  }, []);

  const porcentajeGanancia = useMemo(() => {
    const costo = toNumber(form.precioCosto, 0);
    const venta = toNumber(form.precioVenta, 0);
    if (costo > 0 && venta > 0) {
      return (((venta - costo) / costo) * 100).toFixed(2);
    }
    return "0";
  }, [form.precioCosto, form.precioVenta]);

const resetForm = useCallback(
    () => ({
      descripcion: "",
      departamento: "",
      precioCosto: "",
      precioVenta: "",
      precioMayoreo: "",
      porcentajeGanancia: "",
      stockMinimo: "",
      stockInicial: "",
      proveedorId: "",
      activo: true,
      sedeId: esAdmin ? "" : String(sedeIdUsuario ?? ""),
    }),
    [esAdmin, sedeIdUsuario],
  );

  const abrirModalNuevo = useCallback(() => {
    setForm(resetForm());
    setProductoSel(null);
    setModalNuevo(true);
  }, [resetForm]);

  const abrirModalEditar = useCallback(
    (prod) => {
      const producto = normalizarProducto(
        prod,
        prod.sedeId ?? sedeIdUsuario ?? "",
        sedes,
      );
      setProductoSel(producto);
      setForm({
        descripcion: producto.descripcion || producto.nombre,
        departamento: producto.departamento,
        precioCosto: producto.precioCosto ? String(producto.precioCosto) : "",
        precioVenta: producto.precioVenta ? String(producto.precioVenta) : "",
        precioMayoreo:
          producto.precioMayoreo !== undefined &&
          producto.precioMayoreo !== null
            ? String(producto.precioMayoreo)
            : "",
        porcentajeGanancia: producto.porcentajeGanancia
          ? String(producto.porcentajeGanancia)
          : "",
        stockMinimo: String(producto.stockMinimo || 0),
        proveedorId: producto.proveedorId ? String(producto.proveedorId) : "",
        activo: producto.activo ?? true,
        sedeId: producto.sedeId
          ? String(producto.sedeId)
          : String(sedeIdUsuario ?? ""),
      });
      setModalEditar(true);
    },
    [sedeIdUsuario, sedes],
  );

  const abrirHistorial = useCallback(
    async (prod) => {
      setProductoSel(normalizarProducto(prod, sedeActivaId, sedes));
      await cargarMovimientos();
      setModalHistorial(true);
    },
    [cargarMovimientos, sedeActivaId, sedes],
  );

const handleGuardar = useCallback(async () => {
    setGuardando(true);
    try {
      const payload = {
        descripcion: form.descripcion,
        departamento: form.departamento,
        precioCosto: form.precioCosto,
        precioVenta: form.precioVenta,
        precioMayoreo: form.precioMayoreo,
        porcentajeGanancia: form.porcentajeGanancia,
        stockMinimo: form.stockMinimo,
        stockInicial: form.stockInicial,
        proveedorId: form.proveedorId,
        activo: form.activo,
      };
      if (form.sedeId) {
        payload.sedeId = Number(form.sedeId);
      }

      await inventarioService.crearProducto(payload);
      toast.success("Producto creado correctamente.");
      setModalNuevo(false);
      setForm(resetForm())
      await cargarProductos();
    } catch (err) {
      toast.error(
        "Error al crear producto: " + (err?.message || "desconocido"),
      );
    } finally {
      setGuardando(false);
    }
  }, [cargarProductos, form, resetForm, sedeIdUsuario]);

  const handleActualizar = useCallback(async () => {
    setGuardando(true);
    try {
      await inventarioService.actualizarProducto(productoSel.codigo, {
        descripcion: form.descripcion,
        departamento: form.departamento,
        precioCosto: form.precioCosto,
        precioVenta: form.precioVenta,
        precioMayoreo: form.precioMayoreo,
        porcentajeGanancia,
        stockMinimo: form.stockMinimo,
        proveedorId: form.proveedorId,
        activo: form.activo,
      });
      toast.success("Producto actualizado correctamente.");
      setModalEditar(false);
      setForm(resetForm());
      await cargarProductos();
    } catch (err) {
      toast.error(
        "Error al actualizar producto: " + (err?.message || "desconocido"),
      );
    } finally {
      setGuardando(false);
    }
  }, [cargarProductos, form, productoSel, resetForm, porcentajeGanancia]);

  const handleDesactivar = useCallback(
    async (prod) => {
      if (!window.confirm(`¿Desactivar producto "${prod.nombre}"?`)) return;

      try {
        await inventarioService.desactivarProducto(prod.codigo);
        toast.success("Producto desactivado correctamente.");
        window.dispatchEvent(new Event(INVENTARIO_ACTUALIZADO_EVENT));
        await cargarProductos();
      } catch (err) {
        toast.error("Error al desactivar: " + (err?.message || "desconocido"));
      }
    },
    [cargarProductos],
  );

  const productosNormalizados = useMemo(() => {
    return productos.map((producto) =>
      normalizarProducto(producto, sedeActivaId, sedes),
    );
  }, [productos, sedeActivaId, sedes]);

  const departamentos = useMemo(() => {
    const unicos = [
      ...new Set(
        productosNormalizados.map((p) => p.departamento).filter(Boolean),
      ),
    ];
    return unicos.sort((a, b) => a.localeCompare(b));
  }, [productosNormalizados]);

  const productosFiltrados = useMemo(() => {
    if (!filtroDepto && !filtroStockBajo) return productosNormalizados;

    return productosNormalizados.filter((producto) => {
      if (filtroDepto && producto.departamento !== filtroDepto) return false;
      if (filtroStockBajo && !producto.esStockBajo) return false;
      return true;
    });
  }, [filtroDepto, filtroStockBajo, productosNormalizados]);

  const datosTabla = useMemo(
    () =>
      productosFiltrados.map((producto) => ({
        ...producto,
        porcentajeGanancia:
          producto.porcentajeGanancia != null
            ? `${producto.porcentajeGanancia}%`
            : "—",
        precioMayoreo: producto.precioMayoreo ?? "—",
        stockMinimo: producto.stockMinimo ?? "—",
        proveedor:
          typeof producto.proveedor === "string"
            ? producto.proveedor
            : (producto.proveedor?.nombre ?? "—"),
        stockTotal:
          Array.isArray(producto.stockSedes) && producto.stockSedes.length
            ? producto.stockSedes.reduce(
                (sum, s) => sum + (s.stockActual ?? 0),
                0,
              )
            : 0,
        sedes:
          Array.isArray(producto.stockSedes) && producto.stockSedes.length
            ? producto.stockSedes
                .map(
                  (s) =>
                    `${s.sede?.nombre ?? `Sede ${s.sedeId}`}: ${s.stockActual ?? 0}`,
                )
                .join(" | ")
            : "—",
      })),
    [productosFiltrados],
  );

  const totalProductos = productosNormalizados.length;
  const productosStockBajo = productosNormalizados.filter(
    (p) => p.esStockBajo,
  ).length;
  const valorInventario = productosNormalizados.reduce(
    (suma, producto) => suma + producto.precioDetal * producto.existencia,
    0,
  );

  const columnas = useMemo(
    () => [
      { campo: "codigo", label: "Código", tipo: "texto" },
      { campo: "nombre", label: "Nombre", tipo: "texto" },
      { campo: "precioCosto", label: "Precio Costo", tipo: "moneda" },
      { campo: "precioVenta", label: "Precio Venta", tipo: "moneda" },
      { campo: "precioMayoreo", label: "Precio Mayoreo", tipo: "moneda" },
      { campo: "porcentajeGanancia", label: "% Ganancia", tipo: "texto" },
      { campo: "stockTotal", label: "Stock Total", tipo: "texto" },
      { campo: "stockMinimo", label: "Mínimo", tipo: "texto" },
      { campo: "departamento", label: "Departamento", tipo: "texto" },
      { campo: "proveedor", label: "Proveedor", tipo: "texto" },
      { campo: "sedes", label: "Sedes", tipo: "texto" },
      { campo: "activo", label: "Estado", tipo: "booleano" },
      { campo: "creadoEn", label: "Creado", tipo: "fecha" },
      { campo: "actualizadoEn", label: "Actualizado", tipo: "fecha" },
    ],
    [],
  );

  const acciones = useCallback(
    (prod) => [
      { label: "Editar", icon: "edit", onClick: () => abrirModalEditar(prod) },
      {
        label: "Historial",
        icon: "history",
        onClick: () => abrirHistorial(prod),
      },
      ...(puedeEditar
        ? [
            {
              label: prod.activo ? "Desactivar" : "Activar",
              icon: prod.activo ? "delete" : "restore_from_trash",
              onClick: () => handleDesactivar(prod),
              variante: prod.activo ? "danger" : "success",
            },
          ]
        : []),
    ],
    [puedeEditar, abrirModalEditar, abrirHistorial, handleDesactivar],
  );

  const movimientosProducto = useMemo(
    () =>
      movimientos
        .filter(
          (movimiento) =>
            String(movimiento.productoId) === String(productoSel?.id) ||
            movimiento.producto?.codigo === productoSel?.codigo,
        )
        .map((movimiento) => ({
          ...movimiento,
          fecha: movimiento.fecha,
          tipo: movimiento.tipo,
          cantidad: movimiento.cantidad,
          nota: movimiento.nota || "—",
        })),
    [movimientos, productoSel],
  );

  return (
    <div className="productos-page">
      <div className="page-header">
        <div>
          <h1>Catálogo de Productos</h1>
          <p className="productos-subtitulo">
            Gestión completa de productos, precios, stock y proveedores
          </p>
        </div>

        {productosStockBajo > 0 && (
          <div className="stock-alerta" role="status">
            <span className="stock-alerta__icon" aria-hidden="true">
              <span className="material-symbols-outlined">warning</span>
            </span>
            <span className="stock-alerta__text">
              {productosStockBajo} producto{productosStockBajo > 1 ? "s" : ""}{" "}
              con stock bajo
            </span>
            <button
              className="stock-alerta__btn"
              onClick={() => setFiltroStockBajo(true)}
              type="button"
            >
              Ver alertas
            </button>
          </div>
        )}

        <div className="filters">
          {esAdmin && (
            <div className="filter-group">
              <label htmlFor="filtro-sede">Sede</label>
              <select
                id="filtro-sede"
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="filtro-depto">Departamento</label>
            <select
              id="filtro-depto"
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              {departamentos.map((depto) => (
                <option key={depto} value={depto}>
                  {depto}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group filter-group--checkbox">
            <label className="checkbox-label" htmlFor="filtro-stock-bajo">
              <input
                type="checkbox"
                id="filtro-stock-bajo"
                checked={filtroStockBajo}
                onChange={(e) => setFiltroStockBajo(e.target.checked)}
              />
              <span className="checkbox-text">
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: 16 }}
                >
                  warning
                </span>
                Solo stock bajo
              </span>
            </label>
          </div>

          {puedeEditar && (
            <button
              className="btn-primary"
              onClick={abrirModalNuevo}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="prod-stats" aria-label="Resumen del catálogo">
        <div className="prod-stat-card prod-stat-card--total">
          <div className="prod-stat-card__icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">
              inventory_2
            </span>
          </div>
          <div>
            <span className="prod-stat-valor">{totalProductos}</span>
            <span className="prod-stat-label">Total Productos</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--danger">
          <div className="prod-stat-card__icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">
              warning
            </span>
          </div>
          <div>
            <span className="prod-stat-valor">{productosStockBajo}</span>
            <span className="prod-stat-label">Stock Bajo</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--gold">
          <div className="prod-stat-card__icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">
              attach_money
            </span>
          </div>
          <div>
            <span className="prod-stat-valor">
              {formatCOP(valorInventario)}
            </span>
            <span className="prod-stat-label">Valor Inventario</span>
          </div>
        </div>
      </div>

      <div className="tab-content">
        {!isSessionChecked || authLoading ? (
          <Spinner />
        ) : cargando ? (
          <Spinner />
        ) : errorProductos ? (
          errorProductos.includes("401") ||
          errorProductos.includes("autorizado") ? (
            <EmptyState
              icono="login"
              titulo="Sesión requerida"
              detalle="Necesitas iniciar sesión para ver los productos."
            >
              <a href="/login" className="btn-primary">
                Ir a Login
              </a>
            </EmptyState>
          ) : (
            <EmptyState
              icono="sync_problem"
              titulo="Error al cargar productos"
              detalle={errorProductos}
            >
              <button
                className="btn-primary"
                onClick={cargarProductos}
                type="button"
              >
                Reintentar
              </button>
            </EmptyState>
          )
        ) : !productosNormalizados.length ? (
          <EmptyState
            icono="inventory_2"
            titulo="No hay productos"
            detalle="Ajusta los filtros o registra un nuevo producto."
          />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={datosTabla}
            filasPorPagina={15}
            mostrarBuscador
            buscarEnCampos={[
              "codigo",
              "nombre",
              "departamento",
              "proveedor",
              "sede",
            ]}
            paginacion
            renderAcciones={acciones}
          />
        )}
      </div>

      <Modal
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        titulo="Nuevo Producto"
        textoBotonConfirmar={guardando ? "Guardando..." : "Crear Producto"}
        onConfirmar={handleGuardar}
        mostrarCancelar
        disabled={guardando}
        className="modal-content--producto"
        maxWidth="680px"
      >
        <div className="modal-form modal-form--producto">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prod-depto">Departamento *</label>
              <select
                id="prod-depto"
                name="departamento"
                value={form.departamento}
                onChange={handleCambioForm}
                className="form-control"
              >
                <option value="">— Selecciona —</option>
                {DEPARTAMENTOS.map((depto) => (
                  <option key={depto} value={depto}>
                    {depto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prod-descripcion">Descripción *</label>
            <input
              id="prod-descripcion"
              name="descripcion"
              type="text"
              value={form.descripcion}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="Descripción del producto"
              autoComplete="off"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prod-precio-costo">Precio Costo *</label>
              <input
                id="prod-precio-costo"
                name="precioCosto"
                type="number"
                value={form.precioCosto}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-precio-venta">Precio Venta *</label>
              <input
                id="prod-precio-venta"
                name="precioVenta"
                type="number"
                value={form.precioVenta}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prod-precio-mayoreo">Precio Mayoreo</label>
              <input
                id="prod-precio-mayoreo"
                name="precioMayoreo"
                type="number"
                value={form.precioMayoreo}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-porcentaje-ganancia">% Ganancia</label>
              <input
                id="prod-porcentaje-ganancia"
                name="porcentajeGanancia"
                type="number"
                value={form.porcentajeGanancia}
                className="form-control form-control--readonly"
                readOnly
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prod-stock">Stock Mínimo *</label>
              <input
                id="prod-stock"
                name="stockMinimo"
                type="number"
                value={form.stockMinimo}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-stock-inicial">Stock Inicial</label>
              <input
                id="prod-stock-inicial"
                name="stockInicial"
                type="number"
                value={form.stockInicial}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>
          </div>

          {esAdmin && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prod-sede">Sede *</label>
                <select
                  id="prod-sede"
                  name="sedeId"
                  value={form.sedeId}
                  onChange={handleCambioForm}
                  className="form-control"
                >
                  <option value="">— Selecciona —</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prod-proveedor">Proveedor</label>
              <ProveedorSelect
                value={form.proveedorId}
                onChange={(proveedorId) =>
                  setForm((prev) => ({ ...prev, proveedorId }))
                }
                disabled={guardando}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label" htmlFor="prod-activo">
                <input
                  type="checkbox"
                  id="prod-activo"
                  name="activo"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      activo: e.target.checked,
                    }))
                  }
                />
                <span className="checkbox-text">Activo</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalEditar}
        onClose={() => setModalEditar(false)}
        titulo="Editar Producto"
        textoBotonConfirmar={guardando ? "Actualizando..." : "Actualizar"}
        onConfirmar={handleActualizar}
        mostrarCancelar
        disabled={guardando}
        className="modal-content--producto"
        maxWidth="680px"
      >
        <div className="modal-form modal-form--producto">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-depto">Departamento *</label>
              <select
                id="edit-depto"
                name="departamento"
                value={form.departamento}
                onChange={handleCambioForm}
                className="form-control"
              >
                <option value="">— Selecciona —</option>
                {DEPARTAMENTOS.map((depto) => (
                  <option key={depto} value={depto}>
                    {depto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-descripcion">Descripción *</label>
            <input
              id="edit-descripcion"
              name="descripcion"
              type="text"
              value={form.descripcion}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="Descripción del producto"
              autoComplete="off"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-precio-costo">Precio Costo *</label>
              <input
                id="edit-precio-costo"
                name="precioCosto"
                type="number"
                value={form.precioCosto}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-precio-venta">Precio Venta *</label>
              <input
                id="edit-precio-venta"
                name="precioVenta"
                type="number"
                value={form.precioVenta}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-precio-mayoreo">Precio Mayoreo</label>
              <input
                id="edit-precio-mayoreo"
                name="precioMayoreo"
                type="number"
                value={form.precioMayoreo}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-porcentaje-ganancia">% Ganancia</label>
              <input
                id="edit-porcentaje-ganancia"
                name="porcentajeGanancia"
                type="number"
                value={form.porcentajeGanancia}
                className="form-control form-control--readonly"
                readOnly
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-stock">Stock Mínimo *</label>
              <input
                id="edit-stock"
                name="stockMinimo"
                type="number"
                value={form.stockMinimo}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label" htmlFor="edit-activo">
                <input
                  type="checkbox"
                  id="edit-activo"
                  name="activo"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      activo: e.target.checked,
                    }))
                  }
                />
                <span className="checkbox-text">Activo</span>
              </label>
            </div>
          </div>

          <div className="form-row">
            {esAdmin && (
              <div className="form-group">
                <label htmlFor="edit-sede">Sede</label>
                <select
                  id="edit-sede"
                  name="sedeId"
                  value={form.sedeId}
                  onChange={handleCambioForm}
                  className="form-control"
                >
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="edit-proveedor">Proveedor</label>
              <ProveedorSelect
                value={form.proveedorId}
                onChange={(proveedorId) =>
                  setForm((prev) => ({ ...prev, proveedorId }))
                }
                disabled={guardando}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalHistorial}
        onClose={() => setModalHistorial(false)}
        titulo={`Historial: ${productoSel?.nombre || "Producto"}`}
        mostrarCancelar={false}
        textoBotonConfirmar="Cerrar"
        onConfirmar={() => setModalHistorial(false)}
        className="modal-content--producto"
        maxWidth="680px"
      >
        {productoSel && (
          <div className="historial-producto">
            <div className="historial-header">
              <span className="historial-codigo">{productoSel.codigo}</span>
              <span className="historial-meta">
                {productoSel.sede} · {productoSel.proveedor}
              </span>
            </div>

            <div className="historial-stats">
              <div className="historial-stat">
                <span>Stock actual</span>
                <strong>{productoSel.existencia}</strong>
              </div>
              <div className="historial-stat">
                <span>Mínimo</span>
                <strong>{productoSel.stockMinimo}</strong>
              </div>
              <div className="historial-stat">
                <span>Precio</span>
                <strong>{formatCOP(productoSel.precioDetal)}</strong>
              </div>
            </div>

            {movimientosProducto.length > 0 ? (
              <TablaGenerica
                columnas={[
                  { campo: "fecha", label: "Fecha", tipo: "fecha" },
                  { campo: "tipo", label: "Tipo", tipo: "estado" },
                  { campo: "cantidad", label: "Cantidad", tipo: "texto" },
                  { campo: "nota", label: "Nota", tipo: "texto" },
                ]}
                datos={movimientosProducto}
                filasPorPagina={10}
                mostrarBuscador={false}
                paginacion={false}
              />
            ) : (
              <div className="historial-empty">
                <span className="material-symbols-outlined" aria-hidden="true">
                  history
                </span>
                <span>No hay movimientos registrados para este producto.</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductosPage;
