import Modal from "@/components/common/Modal/Modal";
import { formatCOP } from "@/utils/formatters";

const HOY = new Date().toISOString().split("T")[0];

const ContabilidadModal = ({
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
  cargando = false,
}) => {
  const inputClase = "cont-input";
  const grupoClase = "cont-form-group";
  const labelClase = "cont-modal-label";

  const titulo = (() => {
    if (itemEditar) {
      if (modalTipo === "ingreso") return "Editar Ingreso";
      if (modalTipo === "egreso")  return "Editar Egreso";
      if (modalTipo === "abono")   return "Editar Abono / Pago a Proveedor";
    }
    if (modalTipo === "ingreso") return "Registrar Ingreso";
    if (modalTipo === "egreso")  return "Registrar Egreso";
    if (modalTipo === "cartera") return "Registrar Saldo de Cartera";
    if (modalTipo === "abono")   return "Registrar Abono a Proveedor";
    return "";
  })();

  const textoBoton = modalTipo === "abono" ? "Registrar Abono" : itemEditar ? "Guardar cambios" : "Guardar";

  const nombreProveedor =
    proveedores.find((p) => p.proveedorId === parseInt(form.proveedorId))?.proveedor
    ?? itemEditar?.proveedor
    ?? "Proveedor general";

  const Label = ({ hijos, requerido = false }) => (
    <label className={labelClase}>
      {hijos}
      {requerido && <span style={{ color: "var(--error)", marginLeft: 4 }}>*</span>}
    </label>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titulo={titulo}
      textoBotonConfirmar={textoBoton}
      onConfirmar={onConfirmar}
      mostrarCancelar
      disabled={cargando}
    >
      <div className="cont-modal-form">

        {!itemEditar && (
          <>
            <div className={grupoClase}>
              <Label requerido>Fecha</Label>
              <input
                type="date" name="fecha" max={HOY}
                value={form.fecha} onChange={onFormChange}
                className={inputClase}
              />
            </div>
            {(modalTipo === "abono" || esAdmin) && (
              <div className={grupoClase}>
                <Label requerido>Sede</Label>
                <select name="sedeId" value={form.sedeId} onChange={onFormChange} className={`${inputClase} cont-select`}>
                  <option value="">— Selecciona —</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        {modalTipo === "ingreso" && (
          <>
            <div className={grupoClase}>
              <Label>Efectivo (COP)</Label>
              <input type="number" name="efectivo" min="0" step="1000" placeholder="0"
                value={form.efectivo} onChange={onFormChange} className={inputClase} />
            </div>
            <div className={grupoClase}>
              <Label>Cuentas / Transferencias (COP)</Label>
              <input type="number" name="cuentas" min="0" step="1000" placeholder="0"
                value={form.cuentas} onChange={onFormChange} className={inputClase} />
            </div>
            <div className="cont-total-display">
              <span>Total calculado</span>
              <span className="cont-total-valor">{formatCOP(totalIngresoForm)}</span>
            </div>
            <div className={grupoClase}>
              <Label>Observaciones</Label>
              <input type="text" name="observacion" placeholder="Ej: Ingreso dominical, cobro cartera..."
                value={form.observacion} onChange={onFormChange} className={inputClase} />
            </div>
          </>
        )}

        {modalTipo === "egreso" && (
          <>
            <div className={grupoClase}>
              <Label requerido>Concepto</Label>
              <input type="text" name="concepto" placeholder="Gastos, Salarios, Arriendo..."
                value={form.concepto} onChange={onFormChange} className={inputClase} />
            </div>
            <div className={grupoClase}>
              <Label requerido>Total (COP)</Label>
              <input type="number" name="total" min="0" step="1000" placeholder="0"
                value={form.total} onChange={onFormChange} className={inputClase} />
              {form.total && <span className="cont-input-hint">{formatCOP(parseFloat(form.total) || 0)}</span>}
            </div>
            <div className={grupoClase}>
              <Label>Observaciones</Label>
              <textarea name="observaciones" rows={3} placeholder="Ej: SUELDO POLLO Y PAGO NUNEZ, ARRIENDO..."
                value={form.observaciones} onChange={onFormChange} className={`${inputClase} cont-textarea`} />
            </div>
          </>
        )}

        {modalTipo === "cartera" && (
          <div className={grupoClase}>
            <Label requerido>Saldo del Dia (COP)</Label>
            <input type="number" name="saldoDia" min="0" step="1000" placeholder="0"
              value={form.saldoDia} onChange={onFormChange} className={inputClase} />
            {form.saldoDia && <span className="cont-input-hint">{formatCOP(parseFloat(form.saldoDia) || 0)}</span>}
            <div className="cont-nota-info">
              <span className="material-symbols-outlined">info</span>
              <p>Ingresa solo el saldo del día. La variación respecto al día anterior se calcula automáticamente.</p>
            </div>
          </div>
        )}

        {modalTipo === "abono" && (
          <>
            <div className={grupoClase}>
              <Label>Proveedor</Label>
              <input type="text" value={nombreProveedor} className={`${inputClase} cont-input--readonly`} readOnly aria-label={`Proveedor seleccionado: ${nombreProveedor}`} />
            </div>
            <div className={grupoClase}>
              <Label requerido>Valor del Abono (COP)</Label>
              <input type="number" name="valorAbono" min="1" step="1000" placeholder="0"
                value={form.valorAbono} onChange={onFormChange} className={inputClase} />
              {form.valorAbono && <span className="cont-input-hint">{formatCOP(parseFloat(form.valorAbono) || 0)}</span>}
            </div>
            <div className={grupoClase}>
              <Label>Observacion</Label>
              <input type="text" name="observacion" placeholder="Concepto del abono..."
                value={form.observacion} onChange={onFormChange} className={inputClase} />
            </div>
          </>
        )}

      </div>
    </Modal>
  );
};

export default ContabilidadModal;
