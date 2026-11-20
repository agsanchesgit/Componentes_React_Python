import type { ApiHttp, OpcoesRequisicao } from "@componentes/react";

/**
 * Instância HTTP mínima baseada em `fetch` (sem axios), no formato que a biblioteca espera.
 * Em erro HTTP lança um erro no formato do axios (`error.response.data`), que a biblioteca sabe ler.
 * No seu projeto, entregue ao `ComponentesProvider` a sua própria instância (axios etc.).
 */
export function criarApiFetch(base: string): ApiHttp {
  async function prcChamar<T>(metodo: "GET" | "POST", url: string, corpo?: unknown, opcoes?: OpcoesRequisicao) {
    const wResposta = await fetch(base + url, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...opcoes?.headers },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: opcoes?.signal,
    });
    const wDados = (await wResposta.json().catch(() => null)) as T;
    if (!wResposta.ok) {
      throw Object.assign(new Error(`HTTP ${wResposta.status}`), { response: { status: wResposta.status, data: wDados } });
    }
    return { data: wDados };
  }

  return {
    post: (url, corpo, opcoes) => prcChamar("POST", url, corpo, opcoes),
    get: (url, opcoes) => prcChamar("GET", url, undefined, opcoes),
  };
}
