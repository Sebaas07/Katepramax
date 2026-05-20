import { createContext, useContext } from "react";

// Creamos el contexto aquí adentro
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};

// Exportamos el contexto de forma nombrada para que el Provider pueda usarlo
export { AuthContext };
