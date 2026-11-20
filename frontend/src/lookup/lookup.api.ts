import type { ApiHttp, OpcoesRequisicao } from "../tipos";
import type {
  LookupCodigoResposta,
  LookupCriteriosEnvio,
  LookupDefinicao,
  LookupPesquisaResposta,
  LookupValidacaoResposta,
} from "./lookup.types";

// O erro do componente é tratado no próprio componente (mensagem no campo Descrição), não por toast global:
// a instância HTTP do consumidor deve respeitar `skipGlobalErrorToast` (convenção do Nexus).
const OPCOES: OpcoesRequisicao = { skipGlobalErrorToast: true };

export const lookupApi = {
  pesquisa: async (api: ApiHttp, caminho: string, definicao: LookupDefinicao, criterios: LookupCriteriosEnvio) =>
    (await api.post<LookupPesquisaResposta>(`${caminho}/pesquisa`, { definicao, ...criterios }, OPCOES)).data,

  codigo: async (api: ApiHttp, caminho: string, definicao: LookupDefinicao, valor: string) =>
    (await api.post<LookupCodigoResposta>(`${caminho}/codigo`, { definicao, valor }, OPCOES)).data,

  validacao: async (api: ApiHttp, caminho: string, definicao: LookupDefinicao) =>
    (await api.post<LookupValidacaoResposta>(`${caminho}/validacao`, definicao, OPCOES)).data,
};

/** Texto da mensagem de erro devolvida pela API (`{ error }`), ou um texto padrão. */
export function fncMensagemDoErro(erro: unknown): string {
  const wDados = (erro as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  const wMensagem = wDados?.error || wDados?.message;
  // Mensagens do banco vêm com quebra de linha (ORA-xxxxx + link): numa linha só, cabem no campo Descrição.
  return wMensagem ? wMensagem.replace(/\s+/g, " ").trim() : "Não foi possível consultar. Tente novamente.";
}
