// Tipos do LookUpField. A configuração (banco, tabela/SELECT, colunas...) vem do objeto em tela
// e é enviada em cada requisição. O backend não tem registro por consulta.
import type { CampoEnabled } from "../campos/campos.types";

// "SQLITE" existe só para testes e para o backend de exemplo; em produção use os três primeiros.
export type LookupBanco = "ORACLE" | "SQL_SERVER" | "POSTGRESQL" | "SQLITE";
export type LookupBase = "TABELA" | "SELECT";
export type LookupTipoConsulta = "POR_LIKE" | "POR_ORDEM_ALFABETICA";
export type LookupOperador = "AND" | "OR";
export type LookupTipoValor = "NUMERO" | "TEXTO" | "DATA";
export type LookupTipoRefreshGrid = "COM_BOTAO_PESQUISA" | "AUTOMATICA";
export type LookupEnabled = CampoEnabled;

export type LookupLinha = Record<string, string | number | null>;

/** Valor entregue ao consumidor. Nunca null: NUMERO → 0, TEXTO → "", DATA → MIN_DATE. */
export type LookupCodigo = number | string | Date;

export interface LookupColunaGrid {
  coluna: string;
  cabecalho: string;
}

/** Parte da configuração que é enviada ao backend (espelha `LookupDefinicao` do Python). */
export interface LookupDefinicao {
  /** Identificação opcional, só para mensagens e log. */
  chave?: string;
  banco: LookupBanco;
  base: LookupBase;
  nomeTabela?: string;
  select?: string;
  colunaRetorno: string;
  tipoColunaRetorno: LookupTipoValor;
  colunaDescricao: string;
  colunasBasePesquisa: string[];
  tipoConsulta: LookupTipoConsulta;
  operadorNaColuna?: LookupOperador;
  operadorEntreColunas?: LookupOperador;
  colunasGrid: LookupColunaGrid[];
  colunasOrderBy?: string[];
  /** Colunas devolvidas em cada linha sem aparecer no grid (ex.: usadas por máscara condicional). */
  colunasAdicionais?: string[];
  colunaCnpj?: string;
  colunaCpf?: string;
  colunaDtNascto?: string;
  /** Teto de 300. Padrão do backend: 100. */
  qtdeLinhas?: number;
  /**
   * O modal já abre listando (até `qtdeLinhas`) e o texto pesquisa com qualquer tamanho, inclusive vazio. O backend só
   * aceita se o projeto liberar a consulta em `ConfiguracaoLookup.permitir_pesquisa_ao_abrir`. Para tabelas pequenas
   * ou já restritas (ex.: cadastro de uma empresa). Padrão: desligado.
   */
  pesquisarAoAbrir?: boolean;
  /**
   * Condição fixa acrescentada ao WHERE da consulta, ex.: `" and tp_sexo = 'M' "`. Vale na pesquisa e na busca por
   * código. Só com `base: "TABELA"`; com `base: "SELECT"`, escreva a condição no próprio SELECT.
   * Vai como texto SQL (sem parâmetros): o backend recusa `;`, comentários, `@`, DML/DDL, `INTO` e parênteses sem par.
   */
  filtro?: string;
}

/** Máscara do grid: texto fixo ou função da linha (ex.: CPF x CNPJ conforme o tipo). */
export type LookupMascaraGrid = string | ((linha: LookupLinha) => string | undefined);

export interface LookUpResultado {
  codigo: LookupCodigo;
  descricao: string;
  /** readonly; null quando vazio ou em revalidação. */
  jsonLinhaEscolhida: LookupLinha | null;
  vazio: boolean;
  /** false enquanto o código digitado não foi validado, ou quando é inexistente. */
  valido: boolean;
  /** `obrigatorio && vazio`: o consumidor trata no submit (o campo nunca bloqueia vazio). */
  obrigatorioPendente: boolean;
}

export interface LookUpFieldProps {
  definicao: LookupDefinicao;
  value: LookupCodigo;
  onChange: (resultado: LookUpResultado) => void;

  tituloPesquisa: string;
  tipoRefreshGrid: LookupTipoRefreshGrid;
  obrigatorio: boolean;
  mensagemNaoExistencia: string;

  /** Mínimo para buscar por texto. Nunca abaixo de 3 (piso do backend). Padrão: 3. Sem efeito com `pesquisarAoAbrir`. */
  qtdMinimaCaracterBusca?: number;
  enabled?: LookupEnabled;
  placeholder?: string;
  /** Largura do campo Código em caracteres. Se omitida, usa a largura padrão (9rem). */
  larguraCampo?: number;
  /** Largura do campo Descrição em pixels. Se omitida, o campo ocupa o espaço restante. */
  larguraDescricaoPx?: number;
  label?: string;
  /** Máscara do campo Código (FNC_FORMATA), aplicada fora do foco. */
  mascaraCodigo?: string;
  mascaraGrid?: Record<string, LookupMascaraGrid>;
  /** Tradução de siglas por coluna: `{ TP_SITUACAO: { A: "Ativo", I: "Inativo" } }`. */
  mapaValores?: Record<string, Record<string, string>>;
  highlightDoTermoBuscado?: boolean;
  /** Largura do modal/grid em pixels (limitada à tela). Aumente para evitar rolagem horizontal. Padrão: 1000. */
  larguraGridPx?: number;
  /** Cor de fundo do modal (qualquer cor CSS). Padrão: branco, rgb(255,255,255). */
  corFundoModal?: string;
  criarCacheNoClient?: boolean;
  debugMode?: boolean;

  onLoadingChange?: (loading: boolean) => void;
  onErro?: (erro: unknown) => void;
  id?: string;
  className?: string;
}

// ---- contrato HTTP

export interface LookupCriteriosEnvio {
  texto?: string;
  /** yyyy-MM-dd */
  dtNascto?: string;
  cpf?: string;
  cnpj?: string;
}

export interface LookupPesquisaResposta {
  linhas: LookupLinha[];
  limiteAtingido: boolean;
}

export interface LookupCodigoResposta {
  situacao: "ENCONTRADO" | "NAO_ENCONTRADO" | "MAIS_DE_UM";
  codigo?: string | number | null;
  descricao?: string | null;
  linha?: LookupLinha | null;
}

export interface LookupValidacaoResposta {
  ok: boolean;
  inconsistencias: { chave: string; propriedade: string; mensagem: string }[];
}
