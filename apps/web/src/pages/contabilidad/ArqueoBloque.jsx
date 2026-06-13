import { memo } from "react";

const ArqueoBloque = memo(({ numero, titulo, columnas, filas, totalFila }) => (
  <section className="arqueo-bloque">
    <h3 className="arqueo-bloque__titulo">
      <span className="arqueo-bloque__num">{numero}</span>
      {titulo}
    </h3>
    <div className="arqueo-bloque__tabla-wrap">
      <table className="arqueo-tabla">
        <thead>
          <tr>
            {columnas.map((col) => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={`${fila[0] ?? ""}-${i}`}>
              {fila.map((celda, j) => <td key={j}>{celda}</td>)}
            </tr>
          ))}
        </tbody>
        {totalFila && (
          <tfoot>
            <tr className="arqueo-tabla__total">
              {totalFila.map((celda, j) => <td key={j}><strong>{celda}</strong></td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </section>
));

export default ArqueoBloque;
