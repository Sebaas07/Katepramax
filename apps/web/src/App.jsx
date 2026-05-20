import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import AppRouter from "@/routes/AppRouter";
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;