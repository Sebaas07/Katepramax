import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import usuarioService from "@/services/usuario.service";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import CampoPassword from "@/components/common/CampoPassword/CampoPassword";
import { formatFecha } from "@/utils/formatters";
import "./UsuariosPage.css";

// Contraseña: mínimo 5 caracteres, al menos un número y un símbolo
const REGEX_CONTRASENA = /^(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{5,}$/;

const ROLES = [
  { value: "Admin", label: "Admin" },
  { value: "AdminBogota", label: "AdminBogota" },
  { value: "Oficinista", label: "Oficinista" },
  { value: "Bodega", label: "Bodega" },
  { value: "Entregador", label: "Entregador" },
];

const FORM_INICIAL = {
  nombreCompleto: "",
  usuario: "",
  contrasena: "",
  confirmarContrasena: "",
  rol: "Bodega",
  sedeId: "",
  sedesIds: [],
  telefono: "",
  activo: true,
};

// Tipos de sede permitidos al crear/editar un usuario según su rol.
//   Admin / AdminBogota → bodegas y oficinas
//   Bodega              → solo bodegas (identifica a qué bodega pertenece)
//   Entregador          → solo bodegas (multi-bodega, sin sede principal)
//   Oficinista          → solo bodegas
const SEDES_POR_ROL = {
  Admin:       ["Bodega", "Oficina"],
  AdminBogota: ["Bodega", "Oficina"],
  Bodega:      ["Bodega"],
  Entregador:  ["Bodega"],
  Oficinista:  ["Bodega"],
};
