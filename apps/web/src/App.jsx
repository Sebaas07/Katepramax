// Versión lista para producción - Junio 2026
import { Suspense, lazy } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

// Lazy loading de rutas principales para optimización de carga
const AppRouter = lazy(() => import("@/routes/AppRouter"));

// Loading component global
const AppLoading = () => (
  <div className="auth-loading" style={{ minHeight: "100vh" }}>
    <div className="auth-loading__orb" aria-hidden="true" />
    <div>
      <strong>Katepramax</strong>
      <span>Cargando aplicación...</span>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense fallback={<AppLoading />}>
          <AppRouter />
        </Suspense>
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          containerClassName=""
          containerStyle={{}}
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--surface)",
              color: "var(--on-surface)",
              border: "1px solid var(--outline)",
            },
            success: {
              iconTheme: { primary: "var(--secondary)", secondary: "var(--on-secondary)" },
            },
            error: {
              iconTheme: { primary: "var(--error)", secondary: "var(--on-error)" },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;