import { describe, expect, it } from "vitest";

import { MIN_DATE } from "../formata/formata";
import { fncMensagemDoErro } from "./lookup.api";
import {
  fncAlinhamentoDaColuna,
  fncChaveDoValor,
  fncConverterCodigo,
  fncEhDataIso,
  fncEhVazio,
  fncMascararData,
  fncTextoDaCelula,
  fncTrechosComDestaque,
  fncValorParaTexto,
  fncValorVazio,
} from "./lookup.utils";

describe("valores vazios", () => {
  it("o vazio nunca é null: 0, '' ou MIN_DATE", () => {
    expect(fncValorVazio("NUMERO")).toBe(0);
    expect(fncValorVazio("TEXTO")).toBe("");
    expect(fncValorVazio("DATA")).toBe(MIN_DATE);
  });

  it("fncEhVazio por tipo", () => {
    expect(fncEhVazio(0, "NUMERO")).toBe(true);
    expect(fncEhVazio(5, "NUMERO")).toBe(false);
    expect(fncEhVazio("", "TEXTO")).toBe(true);
    expect(fncEhVazio("A", "TEXTO")).toBe(false);
    expect(fncEhVazio(MIN_DATE, "DATA")).toBe(true);
    expect(fncEhVazio(new Date(2026, 0, 1), "DATA")).toBe(false);
    expect(fncEhVazio(null, "TEXTO")).toBe(true);
    expect(fncEhVazio(undefined, "NUMERO")).toBe(true);
  });
});

describe("conversões do código", () => {
  it("valor para texto", () => {
    expect(fncValorParaTexto(0, "NUMERO")).toBe("");
    expect(fncValorParaTexto(123, "NUMERO")).toBe("123");
    expect(fncValorParaTexto("AB1", "TEXTO")).toBe("AB1");
    expect(fncValorParaTexto(new Date(2026, 4, 10), "DATA")).toBe("10/05/2026");
    expect(fncValorParaTexto(MIN_DATE, "DATA")).toBe("");
  });

  it("converte o que a API devolve para o tipo do consumidor", () => {
    expect(fncConverterCodigo("12", "NUMERO")).toBe(12);
    expect(fncConverterCodigo(null, "NUMERO")).toBe(0);
    expect(fncConverterCodigo("abc", "NUMERO")).toBe(0);
    expect(fncConverterCodigo(12, "TEXTO")).toBe("12");
    expect(fncConverterCodigo("", "TEXTO")).toBe("");
    expect(fncConverterCodigo("2026-05-10T00:00:00", "DATA")).toEqual(new Date(2026, 4, 10));
    expect(fncConverterCodigo("lixo", "DATA")).toBe(MIN_DATE);
    expect(fncConverterCodigo(undefined, "DATA")).toBe(MIN_DATE);
  });

  it("chave estável do valor (Date vira timestamp)", () => {
    expect(fncChaveDoValor(new Date(2026, 0, 1))).toBe(fncChaveDoValor(new Date(2026, 0, 1)));
    expect(fncChaveDoValor(1)).not.toBe(fncChaveDoValor("1x"));
    expect(fncChaveDoValor(1)).toBe(fncChaveDoValor("1"));
  });

  it("máscara progressiva de data", () => {
    expect(fncMascararData("1")).toBe("1");
    expect(fncMascararData("100")).toBe("10/0");
    expect(fncMascararData("10052026")).toBe("10/05/2026");
    expect(fncMascararData("10/05/2026999")).toBe("10/05/2026");
    expect(fncMascararData("ab")).toBe("");
  });
});

describe("texto da célula do grid", () => {
  const wLinha = { COD: 7, SIT: "A", DOC: "34567891200", NASC: "1980-05-10T00:00:00", HORA: "1980-05-10T14:05:00", NULO: null };

  it("sigla traduzida vem antes da máscara", () => {
    expect(fncTextoDaCelula(wLinha, "SIT", { SIT: "ZZ" }, { SIT: { A: "Ativo" } })).toBe("Ativo");
    expect(fncTextoDaCelula(wLinha, "SIT", undefined, { SIT: { I: "Inativo" } })).toBe("A"); // sem tradução: cru
  });

  it("máscara fixa ou função da linha", () => {
    expect(fncTextoDaCelula(wLinha, "DOC", { DOC: "ZZZ.ZZZ.ZZZ-ZZ" })).toBe("345.678.912-00");
    expect(fncTextoDaCelula(wLinha, "DOC", { DOC: (l) => (String(l.DOC).length > 11 ? "ZZ.ZZZ.ZZZ/ZZZZ-ZZ" : "ZZZ.ZZZ.ZZZ-ZZ") })).toBe(
      "345.678.912-00",
    );
  });

  it("data ISO sem máscara: só data, ou data e hora quando há hora", () => {
    expect(fncTextoDaCelula(wLinha, "NASC")).toBe("10/05/1980");
    expect(fncTextoDaCelula(wLinha, "HORA")).toBe("10/05/1980 14:05");
  });

  it("data com espaço no lugar do T (SQLite) também é reconhecida", () => {
    expect(fncTextoDaCelula({ D: "1963-02-11 00:00:00" }, "D")).toBe("11/02/1963");
    expect(fncTextoDaCelula({ D: "1963-02-11 08:30:00" }, "D")).toBe("11/02/1963 08:30");
    expect(fncEhDataIso("2026-05-10 14:05:00")).toBe(true);
  });

  it("nulo vira vazio; número vira texto", () => {
    expect(fncTextoDaCelula(wLinha, "NULO")).toBe("");
    expect(fncTextoDaCelula(wLinha, "COD")).toBe("7");
    expect(fncEhDataIso("2026-05-10")).toBe(true);
    expect(fncEhDataIso("10/05/2026")).toBe(false);
  });
});

describe("alinhamento e destaque", () => {
  it("número à direita, data ao centro, texto à esquerda, pelo 1º valor preenchido", () => {
    const wLinhas = [{ N: null, D: "", T: "x" }, { N: 5, D: "2026-05-10", T: "y" }];
    expect(fncAlinhamentoDaColuna(wLinhas, "N")).toBe("right");
    expect(fncAlinhamentoDaColuna(wLinhas, "D")).toBe("center");
    expect(fncAlinhamentoDaColuna(wLinhas, "T")).toBe("left");
    expect(fncAlinhamentoDaColuna([], "X")).toBe("left");
  });

  it("destaca as palavras do termo sem diferenciar caixa", () => {
    expect(fncTrechosComDestaque("Ana Maria Lima", "ana lima")).toEqual([
      { texto: "Ana", marcado: true },
      { texto: " Maria ", marcado: false },
      { texto: "Lima", marcado: true },
    ]);
  });

  it("termo vazio ou com caracteres de regex não quebra", () => {
    expect(fncTrechosComDestaque("abc", "")).toEqual([{ texto: "abc", marcado: false }]);
    expect(fncTrechosComDestaque("a.b (c)", "(c) .")).toEqual([
      { texto: "a", marcado: false },
      { texto: ".", marcado: true },
      { texto: "b ", marcado: false },
      { texto: "(c)", marcado: true },
    ]);
  });
});

describe("mensagem de erro da API", () => {
  it("usa error (em uma linha só) ou message, ou o texto padrão", () => {
    expect(fncMensagemDoErro({ response: { data: { error: "ORA-00942:\n  tabela\ninexistente" } } })).toBe("ORA-00942: tabela inexistente");
    expect(fncMensagemDoErro({ response: { data: { message: "outra" } } })).toBe("outra");
    expect(fncMensagemDoErro(new Error("rede"))).toBe("Não foi possível consultar. Tente novamente.");
    expect(fncMensagemDoErro(undefined)).toBe("Não foi possível consultar. Tente novamente.");
  });
});
