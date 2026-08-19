import { useEffect, useId, useRef } from "react";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/flatpickr.min.css";
import "./DatePicker.css";

/**
 * DatePicker.jsx — envoltura de flatpickr para reemplazar los inputs nativos
 * de fecha (type="date") y fecha-hora (type="datetime-local").
 *
 * Mantiene la misma interfaz de un input normal: llama a onChange con
 * { target: { name, value } } y devuelve el valor en formato "YYYY-MM-DD"
 * (o "YYYY-MM-DDTHH:MM" cuando enableTime es true).
 */
const DatePicker = ({
  value = "",
  onChange,
  id,
  name,
  className = "form-control",
  min,
  max,
  enableTime = false,
  placeholder,
  disabled = false,
  ariaInvalid,
  style,
}) => {
  const inputRef = useRef(null);
  const fpRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const autoId = useId();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const dateFormat = enableTime ? "Y-m-d\\TH:i" : "Y-m-d";

  useEffect(() => {
    if (!inputRef.current) return;

    const fp = flatpickr(inputRef.current, {
      enableTime,
      dateFormat,
      parseFormat: dateFormat,
      time_24hr: true,
      locale: Spanish,
      allowInput: true,
      minDate: min || undefined,
      maxDate: max || undefined,
      defaultDate: value || undefined,
      onChange: (_selectedDates, dateStr) => {
        onChangeRef.current?.({ target: { name, value: dateStr } });
      },
    });

    fpRef.current = fp;
    return () => {
      fp.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableTime, min, max, dateFormat]);

  // Mantener el input sincronizado con el valor controlado por el padre
  useEffect(() => {
    if (fpRef.current) {
      fpRef.current.setDate(value || "", false);
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      id={id ?? autoId}
      name={name}
      type="text"
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      style={style}
    />
  );
};

export default DatePicker;