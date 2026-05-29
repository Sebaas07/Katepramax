import { clienteApi } from "@/api/axiosConfig";

const usuariosService = {
  obtenerUsuarios: async () => {
    const r = await clienteApi.get("/usuarios");
    return r.data;
  },
  desactivarUsuario: async (id) => {
    const r = await clienteApi.patch(`/usuarios/${id}`);
    return r.data;
  },
  activarUsuario: async (id) => {
    const r = await clienteApi.patch(`/usuarios/${id}/activar`);
    return r.data;
  },
};
export default usuariosService;