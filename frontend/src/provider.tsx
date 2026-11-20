import { createContext, useContext, type ReactNode } from "react";
import type { ApiHttp } from "./tipos";

const ContextoComponentes = createContext<ApiHttp | null>(null);

export interface ComponentesProviderProps {
  api: ApiHttp;
  children?: ReactNode;
}

// O app consumidor monta o provider uma vez, no layout, entregando a sua instância HTTP
// (com token, refresh, toasts globais etc.). A biblioteca nunca cria a instância.
export function ComponentesProvider({ api, children }: ComponentesProviderProps) {
  return <ContextoComponentes.Provider value={api}>{children}</ContextoComponentes.Provider>;
}

export function useComponentesApi(): ApiHttp {
  const wApi = useContext(ContextoComponentes);
  if (wApi === null) {
    throw new Error("ComponentesProvider ausente: envolva a tela com o provider.");
  }
  return wApi;
}
