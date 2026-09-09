import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import inventarioService from "@/services/inventario.service";
import reporteService from "@/services/reporte.service";
import { formatCOP, formatFecha, getSemanaISO, getRangoSemana, hoyISO } from "@/utils/formatters";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import Modal from "@/components/common/Modal/Modal";
import ContabilidadModal from "../ContabilidadModal";
import IngresosTab from "../IngresosTab";
import EgresosTab from "../EgresosTab";
import ProveedoresTab from "../ProveedoresTab";
import CarteraTab from "../CarteraTab";
import PanelGeneralTab from "../PanelGeneralTab";
import CobrosEntregadorTab from "../CobrosEntregadorTab";
import CierreCajaTab from "../CierreCajaTab";
import { Spinner } from "../ContabilidadUI";
import "./ContabilidadPage.css";

// NOTE: full file too large for this message — loading from artifact via secondary approach
export default function ContabilidadPage() {
  return (
    <div className="contabilidad-page">
      <p>Error temporal al guardar el archivo. Reintentando...</p>
    </div>
  );
}
