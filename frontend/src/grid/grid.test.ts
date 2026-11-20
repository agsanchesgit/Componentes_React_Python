import { describe, expect, it } from "vitest";
import {
  fncAbertasIniciais,
  fncAlternarAberta,
  fncChaveDeOrdem,
  fncCortarLinhas,
  fncOrdemClique,
  fncOrdemDuploClique,
  fncOrdenarLinhas,
  fncPaginar,
  fncPosicaoNaOrdem,
  fncTotalPaginas,
  fncValidarGrid,
} from "./grid";
import type { GridColuna } from "./grid.types";

const colunas: GridColuna[] = [
  { coluna: "NOME", tipo: "texto" },
  { coluna: "IDADE", tipo: "numero" },
  { coluna: "NASC", tipo: "data" },
];
const dados = [
  { NOME: "bia", IDADE: 10, NASC: "2000-05-01T00:00:00" },
  { NOME: "Ana", IDADE: 9, NASC: "0001-01-01T00:00:00" },
  { NOME: "Caio", IDADE: 10, NASC: "1990-01-01T00:00:00" },
  { NOME: "ana", IDADE: 100, NASC: null },
];

describe("grid (lógica pura)", () => {
  it("validação das props", () => {
    expect(fncValidarGrid(colunas, ["a", "b", "c"], 10)).toBeNull();
    expect(fncValidarGrid(colunas, ["a"], 10)).toMatch(/tamanhos diferentes/);
    expect(fncValidarGrid(colunas, ["a", "b", "c"], 0)).toMatch(/linhasPorPagina/);
    expect(fncValidarGrid(colunas, ["a", "b", "c"], 10, 3001)).toMatch(/maxLinhas/);
    expect(fncValidarGrid([], [], 10)).toMatch(/ao menos uma/);
  });

  it("duplo clique reinicia; clique entra e alterna", () => {
    let wOrdem = fncOrdemDuploClique("NOME");
    expect(wOrdem).toEqual([{ coluna: "NOME", desc: false }]);
    wOrdem = fncOrdemClique(wOrdem, "IDADE");
    wOrdem = fncOrdemClique(wOrdem, "NASC");
    expect(wOrdem.map((x) => x.coluna)).toEqual(["NOME", "IDADE", "NASC"]);
    wOrdem = fncOrdemClique(wOrdem, "IDADE");
    expect(wOrdem[1]).toEqual({ coluna: "IDADE", desc: true });
    expect(wOrdem.map((x) => x.coluna)).toEqual(["NOME", "IDADE", "NASC"]);
    wOrdem = fncOrdemClique(wOrdem, "IDADE");
    expect(wOrdem[1].desc).toBe(false);
    expect(fncOrdemDuploClique("NASC")).toEqual([{ coluna: "NASC", desc: false }]);
    expect(fncPosicaoNaOrdem(wOrdem, "NASC")).toEqual({ posicao: 3, desc: false });
    expect(fncPosicaoNaOrdem(wOrdem, "X").posicao).toBe(0);
  });

  it("número ordena como número e texto sem diferenciar maiúscula", () => {
    const wPorIdade = fncOrdenarLinhas(dados, colunas, [{ coluna: "IDADE", desc: false }]);
    expect(wPorIdade.map((l) => l.IDADE)).toEqual([9, 10, 10, 100]);
    const wPorNome = fncOrdenarLinhas(dados, colunas, [{ coluna: "NOME", desc: false }]);
    expect(wPorNome.map((l) => l.NOME)).toEqual(["Ana", "ana", "bia", "Caio"]); // estável no empate
  });

  it("várias colunas, descendente e vazio como menor", () => {
    const wOrdenadas = fncOrdenarLinhas(dados, colunas, [
      { coluna: "IDADE", desc: true },
      { coluna: "NOME", desc: false },
    ]);
    expect(wOrdenadas.map((l) => l.NOME)).toEqual(["ana", "bia", "Caio", "Ana"]);
    const wPorData = fncOrdenarLinhas(dados, colunas, [{ coluna: "NASC", desc: false }]);
    expect(wPorData.map((l) => l.NOME)).toEqual(["Ana", "ana", "Caio", "bia"]);
  });

  it("não altera o array de entrada e ignora coluna desconhecida", () => {
    const wCopia = JSON.stringify(dados);
    fncOrdenarLinhas(dados, colunas, [{ coluna: "IDADE", desc: true }]);
    expect(JSON.stringify(dados)).toBe(wCopia);
    expect(fncOrdenarLinhas(dados, colunas, [{ coluna: "X", desc: false }]).length).toBe(4);
  });

  it("chaves de vazio", () => {
    expect(fncChaveDeOrdem(null, "numero")).toBe(Number.NEGATIVE_INFINITY);
    expect(fncChaveDeOrdem("", "texto")).toBe("");
    expect(fncChaveDeOrdem("0001-01-01T00:00:00", "data")).toBe(Number.NEGATIVE_INFINITY);
    expect(fncChaveDeOrdem("S", "logico")).toBe(1);
  });

  it("corte e paginação", () => {
    expect(fncCortarLinhas([1, 2, 3, 4, 5], 3)).toEqual({ linhas: [1, 2, 3], cortou: true });
    expect(fncCortarLinhas([1, 2], 3).cortou).toBe(false);
    expect(fncTotalPaginas(0, 10)).toBe(1);
    expect(fncTotalPaginas(21, 10)).toBe(3);
    expect(fncPaginar([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(fncPaginar([1, 2, 3, 4, 5], 9, 2)).toEqual([5]); // página fora do limite
  });

  it("colunaOrdenar: exibe MM/AAAA e ordena por AAAAMM; vazia ordena pela própria coluna", () => {
    const wColunas: GridColuna[] = [
      { coluna: "COMP", tipo: "texto", colunaOrdenar: "COMP_ORD" },
      { coluna: "NOME", tipo: "texto", colunaOrdenar: "" },
    ];
    const wDados = [
      { COMP: "02/2026", COMP_ORD: "202602", NOME: "b" },
      { COMP: "11/2025", COMP_ORD: "202511", NOME: "a" },
      { COMP: "01/2026", COMP_ORD: "202601", NOME: "c" },
    ];
    const wAsc = fncOrdenarLinhas(wDados, wColunas, [{ coluna: "COMP", desc: false }]);
    expect(wAsc.map((l) => l.COMP)).toEqual(["11/2025", "01/2026", "02/2026"]); // por texto daria 01, 02, 11
    const wDesc = fncOrdenarLinhas(wDados, wColunas, [{ coluna: "COMP", desc: true }]);
    expect(wDesc.map((l) => l.COMP)).toEqual(["02/2026", "01/2026", "11/2025"]);
    expect(fncOrdenarLinhas(wDados, wColunas, [{ coluna: "NOME", desc: false }]).map((l) => l.NOME)).toEqual(["a", "b", "c"]);
  });

  it("colunaOrdenar numérica fora de colunas ordena como número", () => {
    const wColunas: GridColuna[] = [{ coluna: "TXT", tipo: "texto", colunaOrdenar: "N" }];
    const wDados = [
      { TXT: "x", N: 10 },
      { TXT: "y", N: 9 },
    ];
    expect(fncOrdenarLinhas(wDados, wColunas, [{ coluna: "TXT", desc: false }]).map((l) => l.TXT)).toEqual(["y", "x"]);
  });

  it("detalhe: alterna por referência e sobrevive à reordenação", () => {
    const wLinha1 = dados[0];
    let wAbertas = fncAlternarAberta(new Set(), wLinha1);
    expect(wAbertas.has(wLinha1)).toBe(true);
    const wOrdenadas = fncOrdenarLinhas(dados, colunas, [{ coluna: "NOME", desc: false }]);
    expect(wOrdenadas.some((l) => wAbertas.has(l))).toBe(true); // as linhas ordenadas são as mesmas referências
    wAbertas = fncAlternarAberta(wAbertas, wLinha1);
    expect(wAbertas.has(wLinha1)).toBe(false);
    expect(wAbertas.size).toBe(0);
  });

  it("detalhe: abertas iniciais só as que têm detalhe", () => {
    expect(fncAbertasIniciais(dados, undefined, false).size).toBe(0);
    expect(fncAbertasIniciais(dados, undefined, true).size).toBe(4);
    const wSo10 = fncAbertasIniciais(dados, (l) => l.IDADE === 10, true);
    expect([...wSo10].map((l) => l.NOME)).toEqual(["bia", "Caio"]);
  });
});
