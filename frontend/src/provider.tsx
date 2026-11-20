import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ApiHttp } from "./tipos";

interface ConfiguracaoComponentes {
  api: ApiHttp;
  /** Caminho do Lookup relativo à base da instância HTTP (padrão "Lookup", o do Nexus). */
  caminhoLookup: string;
}

const ContextoComponentes = createContext<ConfiguracaoComponentes | null>(null);

export interface ComponentesProviderProps {
  api: ApiHttp;
  /**
   * Caminho das rotas do Lookup, relativo à `baseURL` da sua instância HTTP. Padrão: "Lookup", ou seja,
   * `POST {baseURL}Lookup/pesquisa`. Ajuste se o seu backend incluiu o roteador com outro prefixo.
   */
  caminhoLookup?: string;
  children?: ReactNode;
}

// O app consumidor monta o provider uma vez, no layout, entregando a sua instância HTTP
// (com token, refresh, toasts globais etc.). A biblioteca nunca cria a instância.
export function ComponentesProvider({ api, caminhoLookup = "Lookup", children }: ComponentesProviderProps) {
  const wValor = useMemo(() => ({ api, caminhoLookup }), [api, caminhoLookup]);
  return <ContextoComponentes.Provider value={wValor}>{children}</ContextoComponentes.Provider>;
}

function useConfiguracaoComponentes(): ConfiguracaoComponentes {
  const wConfiguracao = useContext(ContextoComponentes);
  if (wConfiguracao === null) {
    throw new Error("ComponentesProvider ausente: envolva a tela com o provider.");
  }
  return wConfiguracao;
}

export function useComponentesApi(): ApiHttp {
  return useConfiguracaoComponentes().api;
}

/** Caminho configurado das rotas do Lookup (uso interno dos componentes). */
export function useComponentesCaminhoLookup(): string {
  return useConfiguracaoComponentes().caminhoLookup;
}
