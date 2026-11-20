// Lógica pura do GridField (sem DOM): validação, ordenação em várias colunas, corte, paginação e detalhe.
import type { GridColuna, GridLinha, GridOrdem, GridTipo } from "./grid.types";

export const GRID_MAX_LINHAS = 3000;

/** Valida as props obrigatórias; devolve a mensagem de erro de programação ou null. */
export function fncValidarGrid(
  colunas: readonly GridColuna[],
  cabecalhos: readonly string[],
  linhasPorPagina: number,
  maxLinhas: number = GRID_MAX_LINHAS,
): string | null {
  if (colunas.length === 0) {
    return "GridField: informe ao menos uma coluna.";
  }
  if (colunas.length !== cabecalhos.length) {
    return `GridField: colunas (${colunas.length}) e cabecalhos (${cabecalhos.length}) têm tamanhos diferentes.`;
  }
  if (!Number.isInteger(linhasPorPagina) || linhasPorPagina < 1) {
    return "GridField: linhasPorPagina é obrigatória e deve ser inteiro maior que zero.";
  }
  if (!Number.isInteger(maxLinhas) || maxLinhas < 1 || maxLinhas > GRID_MAX_LINHAS) {
    return `GridField: maxLinhas deve estar entre 1 e ${GRID_MAX_LINHAS}.`;
  }
  return null;
}

/** Corta nas primeiras `max` linhas. */
export function fncCortarLinhas<T>(linhas: readonly T[], max: number): { linhas: T[]; cortou: boolean } {
  if (linhas.length <= max) {
    return { linhas: [...linhas], cortou: false };
  }
  return { linhas: linhas.slice(0, max), cortou: true };
}

/** Duplo clique: zera a ordem; a coluna vira a 1ª, ascendente. */
export function fncOrdemDuploClique(coluna: string): GridOrdem[] {
  return [{ coluna, desc: false }];
}

/** Clique simples: fora da ordem entra no fim (asc); dentro mantém a posição e alterna asc/desc. */
export function fncOrdemClique(ordem: readonly GridOrdem[], coluna: string): GridOrdem[] {
  if (ordem.some((o) => o.coluna === coluna)) {
    return ordem.map((o) => (o.coluna === coluna ? { ...o, desc: !o.desc } : o));
  }
  return [...ordem, { coluna, desc: false }];
}

const VAZIO_DATA = /^0001-01-01/;

function fncEmVazio(valor: unknown): boolean {
  return valor === null || valor === undefined || valor === "";
}

/** Chave comparável conforme o tipo; vazio (null, "", 0, MIN_DATE) vira a menor chave. */
export function fncChaveDeOrdem(valor: unknown, tipo: GridTipo): number | string {
  switch (tipo) {
    case "numero": {
      if (fncEmVazio(valor)) {
        return Number.NEGATIVE_INFINITY;
      }
      const wNumero = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
      return Number.isNaN(wNumero) ? Number.NEGATIVE_INFINITY : wNumero;
    }
    case "data":
    case "dataHora": {
      if (fncEmVazio(valor)) {
        return Number.NEGATIVE_INFINITY;
      }
      if (typeof valor === "string" && VAZIO_DATA.test(valor)) {
        return Number.NEGATIVE_INFINITY;
      }
      const wTempo = valor instanceof Date ? valor.getTime() : Date.parse(String(valor));
      if (Number.isNaN(wTempo)) {
        return Number.NEGATIVE_INFINITY;
      }
      // MIN_DATE em qualquer fuso
      return wTempo < Date.parse("0001-01-03T00:00:00Z") ? Number.NEGATIVE_INFINITY : wTempo;
    }
    case "logico":
      return valor === true || valor === "S" || valor === "true" || valor === 1 ? 1 : 0;
    default:
      return fncEmVazio(valor) ? "" : String(valor).toLocaleUpperCase("pt-BR");
  }
}

function fncComparar(a: number | string, b: number | string): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b, "pt-BR");
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** Propriedade e tipo que valem na ordenação: `colunaOrdenar` (se informada) ou a própria coluna. */
function fncCriterioDaColuna(
  coluna: GridColuna,
  colunas: readonly GridColuna[],
  linhas: readonly GridLinha[],
): { propriedade: string; tipo: GridTipo } {
  const wAlvo = coluna.colunaOrdenar?.trim();
  if (!wAlvo || wAlvo === coluna.coluna) {
    return { propriedade: coluna.coluna, tipo: coluna.tipo };
  }
  const wDeclarada = colunas.find((c) => c.coluna === wAlvo);
  if (wDeclarada) {
    return { propriedade: wAlvo, tipo: wDeclarada.tipo };
  }
  // Coluna só de ordenação (não exibida): número vira número; o resto segue o tipo da coluna exibida.
  const wExemplo = linhas.find((l) => l[wAlvo] != null)?.[wAlvo];
  return { propriedade: wAlvo, tipo: typeof wExemplo === "number" ? "numero" : coluna.tipo };
}

/** Ordena uma cópia, de forma estável (empate mantém a ordem original). */
export function fncOrdenarLinhas(
  linhas: readonly GridLinha[],
  colunas: readonly GridColuna[],
  ordem: readonly GridOrdem[],
): GridLinha[] {
  if (ordem.length === 0) {
    return [...linhas];
  }
  const wPorNome = new Map(colunas.map((c) => [c.coluna, c]));
  const wCriterios = ordem
    .filter((o) => wPorNome.has(o.coluna))
    .map((o) => ({ ...o, ...fncCriterioDaColuna(wPorNome.get(o.coluna)!, colunas, linhas) }));
  const wItens = linhas.map((linha, indice) => ({
    linha,
    indice,
    chaves: wCriterios.map((o) => fncChaveDeOrdem(linha[o.propriedade], o.tipo)),
  }));
  wItens.sort((x, y) => {
    for (let wK = 0; wK < wCriterios.length; wK++) {
      const wResultado = fncComparar(x.chaves[wK], y.chaves[wK]);
      if (wResultado !== 0) {
        return wCriterios[wK].desc ? -wResultado : wResultado;
      }
    }
    return x.indice - y.indice;
  });
  return wItens.map((item) => item.linha);
}

export function fncTotalPaginas(totalLinhas: number, linhasPorPagina: number): number {
  return Math.max(1, Math.ceil(totalLinhas / linhasPorPagina));
}

export function fncPaginar<T>(linhas: readonly T[], pagina: number, linhasPorPagina: number): T[] {
  const wPagina = Math.min(Math.max(1, pagina), fncTotalPaginas(linhas.length, linhasPorPagina));
  return linhas.slice((wPagina - 1) * linhasPorPagina, wPagina * linhasPorPagina);
}

/** Posição (base 1) e sentido da coluna na ordem; 0 se fora. */
export function fncPosicaoNaOrdem(ordem: readonly GridOrdem[], coluna: string): { posicao: number; desc: boolean } {
  const wIndice = ordem.findIndex((o) => o.coluna === coluna);
  return wIndice < 0 ? { posicao: 0, desc: false } : { posicao: wIndice + 1, desc: ordem[wIndice].desc };
}

/** Abre ou fecha o detalhe de uma linha (identificada pela referência); devolve um novo conjunto. */
export function fncAlternarAberta(abertas: ReadonlySet<GridLinha>, linha: GridLinha): Set<GridLinha> {
  const wNovo = new Set(abertas);
  if (!wNovo.delete(linha)) {
    wNovo.add(linha);
  }
  return wNovo;
}

/** Conjunto inicial de linhas abertas: todas as que têm detalhe, ou nenhuma. */
export function fncAbertasIniciais(
  linhas: readonly GridLinha[],
  temDetalhe: ((linha: GridLinha) => boolean) | undefined,
  abrirTodas: boolean,
): Set<GridLinha> {
  if (!abrirTodas) {
    return new Set();
  }
  return new Set(linhas.filter((l) => !temDetalhe || temDetalhe(l)));
}
