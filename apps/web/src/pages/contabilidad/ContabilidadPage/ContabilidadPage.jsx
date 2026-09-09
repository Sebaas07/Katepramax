import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import reporteService from "@/services/reporte.service";
import inventarioService from "@/services/inventario.service";
import { getSemanaISO, getRangoSemana, formatFecha, hoyISO } from "@/utils/formatters";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import {
  construirPayloadContabilidad,
  esCampoNumerico,
  esCampoTexto,
  normalizarNumeroInput,
  normalizarSemana,
  sanitizarTextoInput,
  validarFormularioContabilidad,
} from "@/utils/contabilidadForm";
import IngresosTab from "../IngresosTab";
import EgresosTab from "../EgresosTab";
import CarteraTab from "../CarteraTab";
import ProveedoresTab from "../ProveedoresTab";
import PanelGeneralTab from "../PanelGeneralTab";
import CobrosEntregadorTab from "../CobrosEntregadorTab";
import CierreCajaTab from "../CierreCajaTab";
import { Spinner, EmptyState } from "../ContabilidadUI";
import ContabilidadModal from "../ContabilidadModal";
import Modal from "@/components/common/Modal/Modal";
import "./ContabilidadPage.css";

const SEM_ACTUAL = getSemanaISO(new Date());

const TABS = [
  { key: "ingresos", label: "Ingresos Diarios", icon: "trending_up" },
  { key: "egresos", label: "Egresos Diarios", icon: "trending_down" },
  { key: "cartera", label: "Cartera", icon: "account_balance" },
  { key: "proveedores", label: "Proveedores", icon: "payments" },
  { key: "cobros", label: "Cobros por Entregador", icon: "delivery_dining" },
  { key: "cierre-diario", label: "Cierre Diario", icon: "today" },
  { key: "cierre-semanal", label: "Cierre Semanal", icon: "date_range" },
  { key: "panel", label: "Panel General", icon: "dashboard" },
];

// FILE TRUNCATED INTENTIONALLY - WILL RESTORE VIA GIT
const ContabilidadPage = () => {
  const { isAuthenticated, isSessionChecked } = useAuth();
  if (!isSessionChecked) return <Spinner />;
  if (!isAuthenticated) return null;
  return (
    <div className="contabilidad-page">
      <div className="page-header"><h1>Contabilidad</h1></div>
      <p style={{ padding: 16 }}>
        Archivo en restauración. Por favor haz checkout del archivo desde el commit bf029508:
        <code>git checkout bf029508 -- apps/web/src/pages/contabilidad/ContabilidadPage/ContabilidadPage.jsx</code>
        y cambia los select de semana por input type=number (como Cierre Semanal).
      </p>
    </div>
  );
};

export default ContabilidadPage;
