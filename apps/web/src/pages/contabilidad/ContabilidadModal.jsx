import Modal from "@/components/common/Modal/Modal";
import { formatCOP } from "@/utils/formatters";
import {
  esCampoNumerico,
  esCampoTexto,
  normalizarNumeroInput,
  sanitizarTexto,
} from "@/utils/contabilidadForm";
import { memo } from "react";

const HOY = new Date().toISOString().split("T")[0];

// Sugerencias para el autocompletar del campo "Concepto" de egresos. Es
// texto libre (el usuario puede escribir cualquier cosa), esto solo ayuda
// a que no queden 10 variantes distintas de "viáticos" por errores de tipeo.
const CONCEPTOS_EGRESO_SUGERIDOS = [
  "Viáticos",
  "Nómina",
  "Salarios",
  "Prestación de servicios",
  "Arriendo",
  "Servicios públicos",
  "Mantenimiento vehículos",
  "Combustible",
  "Transporte",
  "Papelería",
  "Publicidad",
  "Impuestos",
  "Seguridad social",
  "Dotación",
  "Otros gastos",
];

// Función pura hoisted fuera del componente — no usa estado local
const parseMaybeNumber = (valor) => {
  const numero = Number(
    String(valor ?? "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(numero) ? numero : 0;
};

const Label = memo(({ htmlFor, children, requerido = false }) => (
  <label className="cont-modal-label" htmlFor={htmlFor}>
    {children}
    {requerido && (
      <span style={{ color: "var(--aged-gold)", marginLeft: 4 }}>*</span>
    )}
  </label>
));

const ErrorField = memo(({ mensaje }) =>
  mensaje ? (
    <span className="cont-modal-error" role="alert">
      {mensaje}
    </span>
  ) : null,
);

const ContabilidadModal = memo(
  ({
    isOpen,
    onClose,
    onConfirmar,
    modalTipo,
    itemEditar,
    form,
    onFormChange,
    totalIngresoForm,
    esAdmin,
    sedes,
    proveedores,
    errores = {},
    cargando = false,
  }) => {
    const inputClase = "cont-input";
    const grupoClase = "cont-form-group";

    const titulo = (() => {
      if (itemEditar) {
        if (modalTipo === "ingreso") return "Editar Ingreso";
        if (modalTipo === "egreso") return "Editar Egreso";
        if (modalTipo === "cartera") return "Editar Saldo de Cartera";
        if (modalTipo === "abono") return "Editar Abono / Pago a Proveedor";
      }
      if (modalTipo === "ingreso") return "Registrar Ingreso";
      if (modalTipo === "egreso") return "Registrar Egreso";
      if (modalTipo === "cartera") return "Registrar Saldo de Cartera";
      if (modalTipo === "abono") return "Registrar Abono a Proveedor";
      return "";
    })();

    // Expresión barata — no necesita useMemo
    const textoBoton =
      modalTipo === "abono"
        ? "Registrar Abono"
        : itemEditar
          ? "Guardar cambios"
          : "Guardar";

    const nombreProveedor =
      proveedores.find(
        (p) => p.proveedorId === Number.parseInt(form.proveedorId, 10),
      )?.proveedor ??
      itemEditar?.proveedor ??
      "Proveedor general";

    const manejarCambio = (e) => {
      const { name, value } = e.target;
      // OJO: e.target es un nodo DOM real; sus propiedades (name, value...)
      // viven en el prototipo (accessors), no como propiedades "own"
      // enumerables. Por eso `{ ...e.target }` da un objeto vacío y no
      // conserva `name`. Hay que reconstruir el target a mano incluyendo
      // `name` explícitamente, o el padre no sabe qué campo actualizar.
      if (esCampoNumerico(name)) {
        onFormChange({
          target: { name, value: normalizarNumeroInput(value) },
        });
        return;
      }
      if (esCampoTexto(name)) {
        onFormChange({
          target: {
            name,
            value: sanitizarTexto(value, name === "concepto" ? 200 : 500),
          },
        });
        return;
      }
      onFormChange(e);
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        titulo={titulo}
        textoBotonConfirmar={textoBoton}
        onConfirmar={onConfirmar}
        mostrarCancelar
        disabled={cargando || Object.keys(errores).length > 0}
      >
        <div className="cont-modal-form">
          {!itemEditar && (
            <>
              <div className={grupoClase}>
                <Label htmlFor="cont-fecha" requerido>
                  Fecha
                </Label>
                <input
                  id="cont-fecha"
                  type="date"
                  name="fecha"
                  max={HOY}
                  value={form.fecha}
                  onChange={manejarCambio}
                  className={`${inputClase} ${errores.fecha ? "cont-input--error" : ""}`}
                  aria-invalid={Boolean(errores.fecha)}
                />
                <ErrorField mensaje={errores.fecha} />
              </div>
              {(modalTipo === "abono" || esAdmin) && (
                <div className={grupoClase}>
                  <Label htmlFor="cont-sede" requerido>
                    Sede
                  </Label>
                  <select
                    id="cont-sede"
                    name="sedeId"
                    value={form.sedeId}
                    onChange={manejarCambio}
                    className={`${inputClase} cont-select ${errores.sedeId ? "cont-input--error" : ""}`}
                    aria-invalid={Boolean(errores.sedeId)}
                  >
                    <option value="">— Selecciona —</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  <ErrorField mensaje={errores.sedeId} />
                </div>
              )}
            </>
          )}

          {modalTipo === "ingreso" && (
            <>
              <div className={grupoClase}>
                <Label htmlFor="cont-efectivo">Efectivo (COP)</Label>
                <input
                  id="cont-efectivo"
                  type="number"
                  name="efectivo"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.efectivo}
                  onChange={manejarCambio}
                  className={inputClase}
                />
              </div>
              <div className={grupoClase}>
                <Label htmlFor="cont-cuentas">
                  Cuentas / Transferencias (COP)
                </Label>
                <input
                  id="cont-cuentas"
                  type="number"
                  name="cuentas"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={form.cuentas}
                  onChange={manejarCambio}
                  className={inputClase}
                />
              </div>
              <div className="cont-total-display">
                <span>Total calculado</span>
                <span className="cont-total-valor">
                  {formatCOP(totalIngresoForm)}
                </span>
              </div>
              <div className={grupoClase}>
                <Label htmlFor="cont-observacion-ingreso">Observaciones</Label>
                <input
                  id="cont-observacion-ingreso"
                  type="text"
                  name="observacion"
                  placeholder="Ej: Ingreso dominical, cobro cartera..."
                  value={form.observacion}
                  onChange={manejarCambio}
                  className={inputClase}
                  maxLength={500}
                />
              </div>
            </>
          )}

          {modalTipo === "egreso" && (
            <>
              <div className={grupoClase}>
                <Label htmlFor="cont-concepto" requerido>
                  Concepto
                </Label>
                <input
                  id="cont-concepto"
                  type="text"
                  name="concepto"
                  placeholder="Gastos, Salarios, Arriendo..."
                  value={form.concepto}
                  onChange={manejarCambio}
                  className={`${inputClase} ${errores.concepto ? "cont-input--error" : ""}`}
                  maxLength={200}
                  aria-invalid={Boolean(errores.concepto)}
                  list="cont-conceptos-sugeridos"
                  autoComplete="off"
                />
                <datalist id="cont-conceptos-sugeridos">
                  {CONCEPTOS_EGRESO_SUGERIDOS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <ErrorField mensaje={errores.concepto} />
              </div>
              <div className={grupoClase}>
                <Label htmlFor="cont-total-egreso" requerido>
                  Total (COP)
                </Label>
                <input
                  id="cont-total-egreso"
                  type="number"
                  name="total"
                  min="1"
                  step="1000"
                  placeholder="0"
                  value={form.total}
                  onChange={manejarCambio}
                  className={`${inputClase} ${errores.total ? "cont-input--error" : ""}`}
                  aria-invalid={Boolean(errores.total)}
                />
                {form.total && (
                  <span className="cont-input-hint">
                    {formatCOP(parseMaybeNumber(form.total))}
                  </span>
                )}
                <ErrorField mensaje={errores.total} />
              </div>
              <div className={grupoClase}>
                <Label htmlFor="cont-observaciones-egreso">Observaciones</Label>
                <textarea
                  id="cont-observaciones-egreso"
                  name="observaciones"
                  rows={3}
                  placeholder="Ej: SUELDO POLLO Y PAGO NUNEZ, ARRIENDO..."
                  value={form.observaciones}
                  onChange={manejarCambio}
                  className={`${inputClase} cont-textarea`}
                  maxLength={500}
                />
              </div>
            </>
          )}

          {modalTipo === "cartera" && (
            <div className={grupoClase}>
              <Label htmlFor="cont-saldo-dia" requerido>
                Saldo del Dia (COP)
              </Label>
              <input
                id="cont-saldo-dia"
                type="number"
                name="saldoDia"
                min="1"
                step="1000"
                placeholder="0"
                value={form.saldoDia}
                onChange={manejarCambio}
                className={`${inputClase} ${errores.saldoDia ? "cont-input--error" : ""}`}
                aria-invalid={Boolean(errores.saldoDia)}
              />
              {form.saldoDia && (
                <span className="cont-input-hint">
                  {formatCOP(parseMaybeNumber(form.saldoDia))}
                </span>
              )}
              <ErrorField mensaje={errores.saldoDia} />
              <div className="cont-nota-info">
                <span className="material-symbols-outlined">info</span>
                <p>
                  Ingresa solo el saldo del día. La variación respecto al día
                  anterior se calcula automáticamente.
                </p>
              </div>
            </div>
          )}

          {modalTipo === "abono" && (
            <>
              <div className={grupoClase}>
                <Label htmlFor="cont-proveedor" requerido>
                  Proveedor
                </Label>
                {itemEditar ? (
                  <input
                    id="cont-proveedor"
                    type="text"
                    value={nombreProveedor}
                    className={`${inputClase} cont-input--readonly`}
                    readOnly
                    aria-label={`Proveedor seleccionado: ${nombreProveedor}`}
                  />
                ) : (
                  <select
                    id="cont-proveedor"
                    name="proveedorId"
                    value={form.proveedorId}
                    onChange={manejarCambio}
                    className={`${inputClase} cont-select ${errores.proveedorId ? "cont-input--error" : ""}`}
                    aria-invalid={Boolean(errores.proveedorId)}
                  >
                    <option value="">— Selecciona proveedor —</option>
                    {proveedores.map((p) => (
                      <option key={p.proveedorId} value={p.proveedorId}>
                        {p.proveedor}
                      </option>
                    ))}
                  </select>
                )}
                <ErrorField mensaje={errores.proveedorId} />
              </div>
              <div className={grupoClase}>
                <Label htmlFor="cont-valor-abono" requerido>
                  Valor del Abono (COP)
                </Label>
                <input
                  id="cont-valor-abono"
                  type="number"
                  name="valorAbono"
                  min="1"
                  step="1000"
                  placeholder="0"
                  value={form.valorAbono}
                  onChange={manejarCambio}
                  className={`${inputClase} ${errores.valorAbono ? "cont-input--error" : ""}`}
                  aria-invalid={Boolean(errores.valorAbono)}
                />
                {form.valorAbono && (
                  <span className="cont-input-hint">
                    {formatCOP(parseMaybeNumber(form.valorAbono))}
                  </span>
                )}
                <ErrorField mensaje={errores.valorAbono} />
              </div>
              <div className={grupoClase}>
                <Label htmlFor="cont-observacion-abono">Observación</Label>
                <input
                  id="cont-observacion-abono"
                  type="text"
                  name="observacion"
                  placeholder="Concepto del abono..."
                  value={form.observacion}
                  onChange={manejarCambio}
                  className={inputClase}
                  maxLength={500}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    );
  },
);

export default ContabilidadModal;
