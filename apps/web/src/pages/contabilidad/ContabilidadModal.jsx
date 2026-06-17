import Modal from "@/components/common/Modal/Modal";
import { formatCOP } from "@/utils/formatters";
import { esCampoNumerico, esCampoTexto, normalizarNumeroInput, sanitizarTexto } from "@/utils/contabilidadForm";
import { memo, useMemo } from "react";

const HOY = new Date().toISOString().split("T")[0];

const Label = memo(({ children, requerido = false }) => (
  <label className="cont-modal-label">
    {children}
    {requerido && <span style={{ color: "var(--aged-gold)", marginLeft: 4 }}>*</span>}
  </label>
));

const ErrorField = memo(({ mensaje }) => 
  mensaje ? <span className="cont-modal-error" role="alert">{mensaje}</span> : null
);

const ContabilidadModal = memo(({
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
      if (modalTipo === "egreso")  return "Editar Egreso";
      if (modalTipo === "cartera") return "Editar Saldo de Cartera";
      if (modalTipo === "abono")   return "Editar Abono / Pago a Proveedor";
    }
    if (modalTipo === "ingreso") return "Registrar Ingreso";
    if (modalTipo === "egreso")  return "Registrar Egreso";
    if (modalTipo === "cartera") return "Registrar Saldo de Cartera";
    if (modalTipo === "abono")   return "Registrar Abono a Proveedor";
    return "";
  })();

  const textoBoton = useMemo(() => 
    modalTipo === "abono" ? "Registrar Abono" : itemEditar ? "Guardar cambios" : "Guardar",
  [modalTipo, itemEditar]);

  const nombreProveedor = useMemo(() =>
    proveedores.find((p) => p.proveedorId === Number.parseInt(form.proveedorId, 10))?.proveedor
      ?? itemEditar?.proveedor
      ?? "Proveedor general",
  [proveedores, form.proveedorId, itemEditar?.proveedor]);

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    if (esCampoNumerico(name)) {
      onFormChange({ ...e, target: { ...e.target, value: normalizarNumeroInput(value) } });
      return;
    }
    if (esCampoTexto(name)) {
      onFormChange({ ...e, target: { ...e.target, value: sanitizarTexto(value, name === "concepto" ? 200 : 500) } });
      return;
    }
    onFormChange(e);
  };

  const parseMaybeNumber = (valor) => {
    const numero = Number(String(valor ?? "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(numero) ? numero : 0;
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
              <Label requerido>Fecha</Label>
              <input
                type="date" name="fecha" max={HOY}
                value={form.fecha} onChange={manejarCambio}
                className={`${inputClase} ${errores.fecha ? "cont-input--error" : ""}`}
                aria-invalid={Boolean(errores.fecha)}
              />
              <ErrorField mensaje={errores.fecha} />
            </div>
            {(modalTipo === "abono" || esAdmin) && (
              <div className={grupoClase}>
                <Label requerido>Sede</Label>
                <select name="sedeId" value={form.sedeId} onChange={manejarCambio} className={`${inputClase} cont-select ${errores.sedeId ? "cont-input--error" : ""}`} aria-invalid={Boolean(errores.sedeId)}>
                  <option value="">— Selecciona —</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <ErrorField mensaje={errores.sedeId} />
              </div>
            )}
          </>
        )}

        {modalTipo === "ingreso" && (
          <>
            <div className={grupoClase}>
              <Label>Efectivo (COP)</Label>
              <input type="number" name="efectivo" min="0" step="1000" placeholder="0"
                value={form.efectivo} onChange={manejarCambio} className={inputClase} />
            </div>
            <div className={grupoClase}>
              <Label>Cuentas / Transferencias (COP)</Label>
              <input type="number" name="cuentas" min="0" step="1000" placeholder="0"
                value={form.cuentas} onChange={manejarCambio} className={inputClase} />
            </div>
            <div className="cont-total-display">
              <span>Total calculado</span>
              <span className="cont-total-valor">{formatCOP(totalIngresoForm)}</span>
            </div>
            <div className={grupoClase}>
              <Label>Observaciones</Label>
              <input type="text" name="observacion" placeholder="Ej: Ingreso dominical, cobro cartera..."
                value={form.observacion} onChange={manejarCambio} className={inputClase} maxLength={500} />
            </div>
          </>
        )}

        {modalTipo === "egreso" && (
          <>
            <div className={grupoClase}>
              <Label requerido>Concepto</Label>
              <input type="text" name="concepto" placeholder="Gastos, Salarios, Arriendo..."
                value={form.concepto} onChange={manejarCambio} className={`${inputClase} ${errores.concepto ? "cont-input--error" : ""}`} maxLength={200} aria-invalid={Boolean(errores.concepto)} />
              <ErrorField mensaje={errores.concepto} />
            </div>
            <div className={grupoClase}>
              <Label requerido>Total (COP)</Label>
              <input type="number" name="total" min="1" step="1000" placeholder="0"
                value={form.total} onChange={manejarCambio} className={`${inputClase} ${errores.total ? "cont-input--error" : ""}`} aria-invalid={Boolean(errores.total)} />
              {form.total && <span className="cont-input-hint">{formatCOP(parseMaybeNumber(form.total))}</span>}
              <ErrorField mensaje={errores.total} />
            </div>
            <div className={grupoClase}>
              <Label>Observaciones</Label>
              <textarea name="observaciones" rows={3} placeholder="Ej: SUELDO POLLO Y PAGO NUNEZ, ARRIENDO..."
                value={form.observaciones} onChange={manejarCambio} className={`${inputClase} cont-textarea`} maxLength={500} />
            </div>
          </>
        )}

        {modalTipo === "cartera" && (
          <div className={grupoClase}>
            <Label requerido>Saldo del Dia (COP)</Label>
            <input type="number" name="saldoDia" min="1" step="1000" placeholder="0"
              value={form.saldoDia} onChange={manejarCambio} className={`${inputClase} ${errores.saldoDia ? "cont-input--error" : ""}`} aria-invalid={Boolean(errores.saldoDia)} />
            {form.saldoDia && <span className="cont-input-hint">{formatCOP(parseMaybeNumber(form.saldoDia))}</span>}
            <ErrorField mensaje={errores.saldoDia} />
            <div className="cont-nota-info">
              <span className="material-symbols-outlined">info</span>
              <p>Ingresa solo el saldo del día. La variación respecto al día anterior se calcula automáticamente.</p>
            </div>
          </div>
        )}

        {modalTipo === "abono" && (
          <>
            <div className={grupoClase}>
              <Label requerido>Proveedor</Label>
              {itemEditar ? (
                <input type="text" value={nombreProveedor} className={`${inputClase} cont-input--readonly`} readOnly aria-label={`Proveedor seleccionado: ${nombreProveedor}`} />
              ) : (
                <select name="proveedorId" value={form.proveedorId} onChange={manejarCambio} className={`${inputClase} cont-select ${errores.proveedorId ? "cont-input--error" : ""}`} aria-invalid={Boolean(errores.proveedorId)}>
                  <option value="">— Selecciona proveedor —</option>
                  {proveedores.map((p) => (
                    <option key={p.proveedorId} value={p.proveedorId}>{p.proveedor}</option>
                  ))}
                </select>
              )}
              <ErrorField mensaje={errores.proveedorId} />
            </div>
            <div className={grupoClase}>
              <Label requerido>Valor del Abono (COP)</Label>
              <input type="number" name="valorAbono" min="1" step="1000" placeholder="0"
                value={form.valorAbono} onChange={manejarCambio} className={`${inputClase} ${errores.valorAbono ? "cont-input--error" : ""}`} aria-invalid={Boolean(errores.valorAbono)} />
              {form.valorAbono && <span className="cont-input-hint">{formatCOP(parseMaybeNumber(form.valorAbono))}</span>}
              <ErrorField mensaje={errores.valorAbono} />
            </div>
            <div className={grupoClase}>
              <Label>Observación</Label>
              <input type="text" name="observacion" placeholder="Concepto del abono..."
                value={form.observacion} onChange={manejarCambio} className={inputClase} maxLength={500} />
            </div>
          </>
        )}

      </div>
    </Modal>
  );
});

export default ContabilidadModal;
