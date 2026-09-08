import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { obtenerSesion } from "@/utils/sessionHelper";
import LoginBrand from "./LoginBrand";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const {
    login,
    isAuthenticated,
    isLoading: authLoading,
    isSessionChecked,
    error: authError,
  } = useAuth();

  // Leer localStorage una sola vez al inicializar
  const [form, setForm] = useState(() => {
    const usuarioRecordado = localStorage.getItem("usuario_recordado");
    return {
      usuario: usuarioRecordado ?? "",
      contrasena: "",
      _recordadoInicial: usuarioRecordado,
    };
  });

  const [errorLocal, setErrorLocal] = useState("");
  const [cargandoLocal, setCargandoLocal] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);
  // Reusar el valor ya leído en el estado del form — evita segunda lectura de localStorage
  const [recordar, setRecordar] = useState(form._recordadoInicial !== null);

  const error = authError || errorLocal;
  const cargando = authError ? false : authLoading || cargandoLocal;

  // Redirigir si ya está autenticado — usa obtenerSesion() en vez de leer localStorage directo
  useEffect(() => {
    if (isAuthenticated && isSessionChecked) {
      const sesion = obtenerSesion();
      const redirectPath =
        sesion?.rol === "Entregador" ? "/entregas" : "/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, isSessionChecked, navigate]);

  const manejarCambio = (e) => {
    setErrorLocal("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    if (!form.usuario.trim() || !form.contrasena.trim()) {
      setErrorLocal("Por favor ingresa tu usuario y contraseña.");
      return;
    }

    setCargandoLocal(true);
    setErrorLocal("");

    const exito = await login(form.usuario.trim(), form.contrasena);

    if (exito) {
      // Guardar o limpiar el usuario recordado según la preferencia
      if (recordar) {
        localStorage.setItem("usuario_recordado", form.usuario.trim());
      } else {
        localStorage.removeItem("usuario_recordado");
      }
    } else {
      setCargandoLocal(false);
    }
  };

  const handleRecordarChange = (e) => {
    const checked = e.target.checked;
    setRecordar(checked);
    if (!checked) {
      localStorage.removeItem("usuario_recordado");
    }
  };

  return (
    <div className="login">
      <LoginBrand />

      {/* ── Panel derecho — Formulario ── */}
      <section className="login__form-panel">
        <div className="login__form-inner">
          <div className="login__logo-mobile">
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="login__logo-mobile-name">KATEPRAMAX</span>
            <span className="login__logo-mobile-sub">ERP Distribution</span>
          </div>

          <div className="login__card">
            <div className="login__card-header">
              <h3 className="login__card-title">Iniciar Sesión</h3>
              <p className="login__card-subtitle">
                Acceda a su portal de administración corporativa.
              </p>
            </div>

            <form className="login__form" onSubmit={manejarSubmit} noValidate>
              {error && (
                <div className="login__error">
                  <span className="material-symbols-outlined">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Usuario */}
              <div className="login__field">
                <label className="login__field-label" htmlFor="usuario">
                  Usuario
                </label>
                <div className="login__field-wrap">
                  <span className="material-symbols-outlined login__field-icon">
                    person
                  </span>
                  <input
                    id="usuario"
                    name="usuario"
                    type="text"
                    className="login__field-input"
                    placeholder="Usuario o correo electrónico"
                    value={form.usuario}
                    onChange={manejarCambio}
                    autoComplete="username"
                    disabled={cargando}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="login__field">
                <label className="login__field-label" htmlFor="contrasena">
                  Contraseña
                </label>
                <div className="login__field-wrap">
                  <span className="material-symbols-outlined login__field-icon">
                    lock
                  </span>
                  <input
                    id="contrasena"
                    name="contrasena"
                    type={mostrarClave ? "text" : "password"}
                    className="login__field-input"
                    placeholder="••••••••"
                    value={form.contrasena}
                    onChange={manejarCambio}
                    autoComplete="current-password"
                    disabled={cargando}
                  />
                  <button
                    type="button"
                    className="login__field-toggle"
                    onClick={() => setMostrarClave((v) => !v)}
                    aria-label={
                      mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined">
                      {mostrarClave ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Recordarme */}
              <label className="login__remember">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={handleRecordarChange}
                />
                <span className="login__remember-text">Recordarme</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="login__btn-submit"
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <div className="login__spinner" /> Verificando...
                  </>
                ) : (
                  <>
                    Ingresar al Sistema
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          <span className="copyright">
            © {new Date().getFullYear()} Katepramax
          </span>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
