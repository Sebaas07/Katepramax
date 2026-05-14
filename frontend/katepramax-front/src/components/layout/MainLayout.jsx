import { Outlet } from "react-router-dom";
import MenuSuperior from "@/components/layout/MenuSuperior/MenuSuperior";
import "./MainLayout.css";

const MainLayout = () => {
  return (
    <div className="main-layout">
      <MenuSuperior />
      <main className="main-layout__contenido">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;