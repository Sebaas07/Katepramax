import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { iniciarSesion } from "@/services/auth.service";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm]               = useState({ usuario: "", clave: "" });
  const [error, setError]             = useState("");
  const [cargando, setCargando]       = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);

  const manejarCambio = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    if (!form.usuario.trim() || !form.clave.trim()) {
      setError("Por favor ingresa tu usuario y contraseña.");
      return;
    }

    setCargando(true);
    setError("");

    const resultado = await iniciarSesion(form.usuario.trim(), form.clave);

    if (resultado.exitoso) {
      // Redirigir según rol
      if (resultado.datos.rol === "Entregador") {
        navigate("/entregas", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } else {
      setError(resultado.mensaje);
      setCargando(false);
    }
  };

  return (
    <div className="login-wrapper">

      {/* Panel izquierdo — branding */}
      <div className="login-brand d-none d-lg-flex">
        <div className="login-brand__content">
          <div className="login-brand__logo">
            <i className="bi bi-shop-window"></i>
          </div>
          <h1 className="login-brand__title">Katepramax</h1>
          <p className="login-brand__subtitle">
            Sistema de gestión de pedidos, inventario y entregas
          </p>
          <div className="login-brand__features">
            {[
              { icon: "bi-box-seam",      label: "Control de inventario" },
              { icon: "bi-truck",         label: "Seguimiento de entregas" },
              { icon: "bi-graph-up",      label: "Reportes en tiempo real" },
              { icon: "bi-shield-check",  label: "Acceso por roles" },
            ].map(({ icon, label }) => (
              <div className="login-brand__feature" key={label}>
                <i className={`bi ${icon}`}></i>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="login-form-panel">
        <div className="login-form-panel__inner">

          {/* Logo mobile */}
          <div className="login-logo-mobile d-flex d-lg-none">
            <i className="bi bi-shop-window"></i>
            <span>Katepramax</span>
          </div>

          <div className="login-form-panel__header">
            <h2>Bienvenido</h2>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={manejarSubmit} noValidate>

            {/* Error */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
                <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                <span className="small">{error}</span>
              </div>
            )}

            {/* Usuario */}
            <div className="mb-3">
              <label htmlFor="usuario" className="form-label fw-medium">
                Usuario
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-person"></i>
                </span>
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  className={`form-control ${error ? "is-invalid" : ""}`}
                  placeholder="Ingresa tu usuario"
                  value={form.usuario}
                  onChange={manejarCambio}
                  autoComplete="username"
                  autoFocus
                  disabled={cargando}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="mb-4">
              <label htmlFor="clave" className="form-label fw-medium">
                Contraseña
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  id="clave"
                  name="clave"
                  type={mostrarClave ? "text" : "password"}
                  className={`form-control ${error ? "is-invalid" : ""}`}
                  placeholder="Ingresa tu contraseña"
                  value={form.clave}
                  onChange={manejarCambio}
                  autoComplete="current-password"
                  disabled={cargando}
                />
                <button
                  type="button"
                  className="input-group-text btn-toggle-clave"
                  onClick={() => setMostrarClave(!mostrarClave)}
                  tabIndex={-1}
                  aria-label={mostrarClave ? "Ocultar" : "Mostrar"}
                >
                  <i className={`bi ${mostrarClave ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary w-100 btn-login"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Verificando...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Ingresar
                </>
              )}
            </button>
          </form>

          <p className="login-form-panel__footer">
            ¿Problemas para ingresar?{" "}
            <span className="text-muted">Contacta al administrador.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;