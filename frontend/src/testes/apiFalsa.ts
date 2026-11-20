import { vi } from "vitest";

import type { ApiHttp } from "../tipos";
import type { LookupDefinicao, LookupLinha } from "../lookup/lookup.types";

export const PESSOAS: LookupLinha[] = [
  { cd_pessoa: 1, nm_pessoa: "ANA SOUZA", nr_cpf: "00000000191", nr_cnpj: null, dt_nascimento: "1980-05-10T00:00:00", tp_situacao: "A" },
  { cd_pessoa: 2, nm_pessoa: "BRUNO LIMA", nr_cpf: "52998224725", nr_cnpj: null, dt_nascimento: "1991-01-02T08:30:00", tp_situacao: "I" },
  { cd_pessoa: 3, nm_pessoa: "ANA MARIA LIMA", nr_cpf: null, nr_cnpj: "11222333000181", dt_nascimento: "1980-05-10T00:00:00", tp_situacao: "A" },
  { cd_pessoa: 4, nm_pessoa: "DAVI ROCHA", nr_cpf: null, nr_cnpj: null, dt_nascimento: "0001-01-01T00:00:00", tp_situacao: "S" },
];

export const DEFINICAO: LookupDefinicao = {
  chave: "pessoa",
  banco: "POSTGRESQL",
  base: "TABELA",
  nomeTabela: "pessoa",
  colunaRetorno: "cd_pessoa",
  tipoColunaRetorno: "NUMERO",
  colunaDescricao: "nm_pessoa",
  colunasBasePesquisa: ["nm_pessoa"],
  tipoConsulta: "POR_LIKE",
  colunasGrid: [
    { coluna: "cd_pessoa", cabecalho: "Código" },
    { coluna: "nm_pessoa", cabecalho: "Nome" },
    { coluna: "tp_situacao", cabecalho: "Situação" },
  ],
  qtdeLinhas: 100,
};

export interface ApiFalsa extends ApiHttp {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
}

interface Opcoes {
  /** Força um erro HTTP (formato axios) nas chamadas indicadas. */
  erroEm?: "codigo" | "pesquisa";
  mensagemErro?: string;
  limiteAtingido?: boolean;
  /** Atraso das respostas em ms. */
  atraso?: number;
  linhas?: LookupLinha[];
}

/** Backend falso em memória que respeita o contrato HTTP do Lookup (codigo, pesquisa, validacao). */
export function criarApiFalsa(opcoes: Opcoes = {}): ApiFalsa {
  const wLinhas = opcoes.linhas ?? PESSOAS;

  const fncResponder = async <T>(valor: T): Promise<{ data: T }> => {
    if (opcoes.atraso) {
      await new Promise((resolver) => setTimeout(resolver, opcoes.atraso));
    }
    return { data: valor };
  };

  const fncErro = (): Error =>
    Object.assign(new Error("Request failed"), {
      response: { status: 400, data: { error: opcoes.mensagemErro ?? "ORA-00942: tabela ou view\ninexistente" } },
    });

  const post = vi.fn(async (url: string, corpo: unknown) => {
    const wCorpo = corpo as Record<string, unknown> & { definicao?: LookupDefinicao };

    if (url.endsWith("/codigo")) {
      if (opcoes.erroEm === "codigo") {
        throw fncErro();
      }
      const wValor = String(wCorpo.valor ?? "");
      const wAchadas = wLinhas.filter((l) => String(l.cd_pessoa) === wValor || String(l.tp_situacao) === wValor);
      if (wAchadas.length === 0) {
        return fncResponder({ situacao: "NAO_ENCONTRADO", codigo: null, descricao: null, linha: null });
      }
      if (wAchadas.length > 1) {
        return fncResponder({ situacao: "MAIS_DE_UM", codigo: null, descricao: null, linha: null });
      }
      return fncResponder({
        situacao: "ENCONTRADO",
        codigo: wAchadas[0].cd_pessoa,
        descricao: wAchadas[0].nm_pessoa,
        linha: wAchadas[0],
      });
    }

    if (url.endsWith("/pesquisa")) {
      if (opcoes.erroEm === "pesquisa") {
        throw fncErro();
      }
      let wResultado = wLinhas;
      if (wCorpo.texto) {
        const wPalavras = String(wCorpo.texto).toUpperCase().split(/\s+/);
        wResultado = wResultado.filter((l) => wPalavras.every((p) => String(l.nm_pessoa).includes(p)));
      }
      if (wCorpo.cpf) {
        wResultado = wResultado.filter((l) => l.nr_cpf === wCorpo.cpf);
      }
      if (wCorpo.cnpj) {
        wResultado = wResultado.filter((l) => l.nr_cnpj === wCorpo.cnpj);
      }
      if (wCorpo.dtNascto) {
        wResultado = wResultado.filter((l) => String(l.dt_nascimento).startsWith(String(wCorpo.dtNascto)));
      }
      return fncResponder({ linhas: wResultado, limiteAtingido: opcoes.limiteAtingido ?? false });
    }

    if (url.endsWith("/validacao")) {
      return fncResponder({ ok: true, inconsistencias: [] });
    }
    throw new Error(`rota inesperada: ${url}`);
  });

  return { post, get: vi.fn() } as ApiFalsa;
}
