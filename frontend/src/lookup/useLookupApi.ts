import { useCallback, useMemo, useRef } from "react";

import { useComponentesApi, useComponentesCaminhoLookup } from "../provider";
import { lookupApi } from "./lookup.api";
import type {
  LookupCodigoResposta,
  LookupCriteriosEnvio,
  LookupDefinicao,
  LookupPesquisaResposta,
} from "./lookup.types";

const TTL_CACHE_MS = 10 * 60 * 1000;

interface Opcoes {
  cache?: boolean;
  debug?: boolean;
}

/** Chamadas ao backend, com cache por instância (TTL 10 min) e log de debug. */
export function useLookupApi(definicao: LookupDefinicao, { cache = false, debug = false }: Opcoes = {}) {
  const wApi = useComponentesApi();
  const wCaminho = useComponentesCaminhoLookup();
  const wCacheRef = useRef(new Map<string, { t: number; v: unknown }>());
  const wValidadoRef = useRef(false);

  // Estabiliza a identidade: o consumidor pode passar um objeto literal a cada render.
  const wChaveDefinicao = JSON.stringify(definicao);
  const wDefinicao = useMemo(() => JSON.parse(wChaveDefinicao) as LookupDefinicao, [wChaveDefinicao]);
  const wRotulo = `[LookUp:${wDefinicao.chave ?? wDefinicao.colunaRetorno}]`;

  const fncExecutar = useCallback(
    async <T,>(endpoint: string, requisicao: unknown, chamar: () => Promise<T>): Promise<T> => {
      const wChave = `${endpoint}|${JSON.stringify(requisicao)}`;
      if (cache) {
        const wAcerto = wCacheRef.current.get(wChave);
        if (wAcerto && Date.now() - wAcerto.t < TTL_CACHE_MS) {
          return wAcerto.v as T;
        }
      }

      const wInicio = performance.now();
      const wResposta = await chamar();
      if (debug) {
        console.debug(wRotulo, {
          endpoint,
          request: requisicao,
          response: wResposta,
          ms: Math.round(performance.now() - wInicio),
        });
      }
      if (cache) {
        wCacheRef.current.set(wChave, { t: Date.now(), v: wResposta });
      }
      return wResposta;
    },
    [cache, debug, wRotulo],
  );

  const prcValidarUmaVez = useCallback(async (): Promise<void> => {
    if (!debug || wValidadoRef.current) {
      return;
    }
    wValidadoRef.current = true;
    try {
      const wResultado = await lookupApi.validacao(wApi, wCaminho, wDefinicao);
      if (!wResultado.ok) {
        console.warn(wRotulo, "configuração inconsistente", wResultado.inconsistencias);
      }
    } catch {
      // a própria chamada de dados mostra o erro
    }
  }, [wApi, wCaminho, wDefinicao, debug, wRotulo]);

  const fncPesquisar = useCallback(
    (criterios: LookupCriteriosEnvio): Promise<LookupPesquisaResposta> => {
      void prcValidarUmaVez();
      return fncExecutar("pesquisa", criterios, () => lookupApi.pesquisa(wApi, wCaminho, wDefinicao, criterios));
    },
    [wApi, wCaminho, wDefinicao, fncExecutar, prcValidarUmaVez],
  );

  const fncBuscarCodigo = useCallback(
    (valor: string): Promise<LookupCodigoResposta> => {
      void prcValidarUmaVez();
      return fncExecutar("codigo", valor, () => lookupApi.codigo(wApi, wCaminho, wDefinicao, valor));
    },
    [wApi, wCaminho, wDefinicao, fncExecutar, prcValidarUmaVez],
  );

  return { pesquisar: fncPesquisar, buscarCodigo: fncBuscarCodigo };
}
