// API pública: quem consome importa somente daqui ("@componentes/react").
import "./estilos.css";

export { ComponentesProvider, useComponentesApi } from "./provider";
export type { ComponentesProviderProps } from "./provider";
export type { ApiHttp, OpcoesRequisicao, RespostaHttp } from "./tipos";
