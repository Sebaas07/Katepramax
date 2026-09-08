const SedeForm = ({
  nombre,
  tipo,
  bodegaId,
  sedes,
  sedeSel,
  errorNombre,
  onNombreChange,
  onTipoChange,
  onBodegaChange,
}) => (
  <div className="modal-form modal-form--sede">
    <div className="form-group">
      <label htmlFor="sed-nombre">Nombre de la sede *</label>
      <input
        id="sed-nombre"
        name="nombre"
        type="text"
        value={nombre}
        onChange={onNombreChange}
        className="form-control"
        placeholder="Ej: Villavicencio Centro, Medellín..."
        autoComplete="off"
      />
      {errorNombre && <span className="form-error">{errorNombre}</span>}
    </div>

    <div className="form-group">
      <label htmlFor="sed-tipo">Tipo de sede *</label>
      <select
        id="sed-tipo"
        name="tipo"
        value={tipo}
        onChange={onTipoChange}
        className="form-control"
      >
        <option value="Bodega">Bodega</option>
        <option value="Oficina">Oficina</option>
      </select>
    </div>

    {tipo === "Oficina" && (
      <div className="form-group">
        <label htmlFor="sed-bodega">Bodega de la oficina</label>
        <select
          id="sed-bodega"
          name="bodegaId"
          value={bodegaId}
          onChange={onBodegaChange}
          className="form-control"
        >
          <option value="">Seleccione una bodega...</option>
          {sedes.flatMap((sede) =>
            sede.tipo === "Bodega" && sede.activo && sede.id !== sedeSel?.id
              ? [
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>,
                ]
              : [],
          )}
        </select>
        <span className="form-hint">
          La oficina verá y despachará los envíos de esta bodega.
        </span>
      </div>
    )}
  </div>
);

export default SedeForm;
