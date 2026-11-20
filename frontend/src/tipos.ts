// Contrato mínimo da instância HTTP que o projeto consumidor entrega.
// É compatível com o axios (post devolve { data }), mas não depende dele.
export interface OpcoesRequisicao {
  // Convenção do Nexus: evita toast global de erro duplicado nas chamadas do Lookup.
  skipGlobalErrorToast?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface RespostaHttp<T> {
  data: T;
}

export interface ApiHttp {
  post<T = unknown>(url: string, corpo?: unknown, opcoes?: OpcoesRequisicao): Promise<RespostaHttp<T>>;
  get<T = unknown>(url: string, opcoes?: OpcoesRequisicao): Promise<RespostaHttp<T>>;
}
