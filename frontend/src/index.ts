// API pública: quem consome importa somente daqui ("@componentes/react").
import "./estilos.css";

export { ComponentesProvider, useComponentesApi } from "./provider";
export type { ComponentesProviderProps } from "./provider";
export type { ApiHttp, OpcoesRequisicao, RespostaHttp } from "./tipos";
export { FNC_FORMATA, MIN_DATE } from "./formata/formata";

export { DataField } from "./campos/DataField";
export { DataHoraField } from "./campos/DataHoraField";
export { CpfField } from "./campos/CpfField";
export { CnpjField } from "./campos/CnpjField";
export { MmAaaaField } from "./campos/MmAaaaField";
export { ComboField } from "./campos/ComboField";
export type {
  CampoBaseProps,
  CampoEnabled,
  CampoResultado,
  CnpjFieldProps,
  ComboFieldProps,
  ComboResultado,
  CompetenciaResultado,
  CpfFieldProps,
  DataFieldProps,
  DataHoraFieldProps,
  MmAaaaFieldProps,
} from "./campos/campos.types";

export { GridField } from "./grid/GridField";
export { GRID_MAX_LINHAS } from "./grid/grid";
export type { GridAcao, GridColuna, GridFieldProps, GridLinha, GridOrdem, GridTipo } from "./grid/grid.types";
