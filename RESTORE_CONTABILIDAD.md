# Restaurar ContabilidadPage + selector de semana

`ContabilidadPage.jsx` quedó incompleto por un límite de tamaño al subir el archivo (≈32 KB).

## Restaurar el archivo y aplicar el cambio de semana

```bash
git fetch origin
git checkout bf0295088fcfd39a8463cd8f42142de867545b1e -- apps/web/src/pages/contabilidad/ContabilidadPage/ContabilidadPage.jsx
```

Luego, en ese archivo, reemplaza **las dos** apariciones del `<select id="cont-semana">` (el que usa `Array.from({ length: 53 })`) por el mismo patrón de **Cierre Semanal**:

```jsx
<input
  id="cont-semana"
  type="number"
  min="1"
  max="53"
  value={filtroSemana}
  onChange={(e) => handleFiltroSemana(e.target.value)}
  className="filter-select filter-select--week"
  style={{ minWidth: 72 }}
  aria-label="Número de semana"
/>
```

Apariciones:
1. Filtro de movimientos (Ingresos / Egresos) cuando la vista es “Semana”
2. Filtro de Proveedores / Cartera

`handleFiltroSemana` + `normalizarSemana` ya existen y validan 1–53.

## Tests

Se ampliaron tests en `apps/api/test/cliente.service.test.js` (entregador, saldoDeuda, observación del abono).

```bash
cd apps/api && npm test
```
