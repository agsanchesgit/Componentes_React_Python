import { describe, expect, it } from "vitest";
import { FNC_FORMATA, MIN_DATE } from "./formata";

const wCasos: [string, Parameters<typeof FNC_FORMATA>[0], string, string][] = [
  ["01 oficial", 345678912, "ZZZ.ZZZ.ZZZ-ZZ", "003.456.789-12"],
  ["02 oficial", 10052026, "DD/MM/AAAA", "10/05/2026"],
  ["03 oficial", 1234567.89, "999.999.999,99", "  1.234.567,89"],
  ["04 oficial", "A123", "A.ZZZ", "A.123"],
  ["05 oficial", "A.456", "A.ZZZ", "A.456"],
  ["06 oficial", 28040481, "ZZ.ZZ.ZZZ-Z", "28.04.048-1"],
  ["07 oficial", 2849393000115, "ZZ.ZZZ.ZZZ/ZZZZ-ZZ", "02.849.393/0001-15"],
  ["08 separador em branco", 1234.5, "999.999.999,99", "      1.234,50"],
  ["09 unidade mínima", 0.5, "999.999,99", "      0,50"],
  ["10 negativo", -1234.5, "999.999,99", " -1.234,50"],
  ["11 arredondamento", 1.005, "9,99", "1,01"],
  ["12 estouro", 12345678, "ZZZ.ZZZ", "12345678"],
  ["13 string com zeros", "00345678912", "ZZZ.ZZZ.ZZZ-ZZ", "003.456.789-12"],
  ["14 idempotência", "003.456.789-12", "ZZZ.ZZZ.ZZZ-ZZ", "003.456.789-12"],
  ["15 vazio Z", null, "ZZZ.ZZZ-ZZ", "000.000-00"],
  ["16 vazio 9", null, "999.999,99", "          "],
  ["17 7 dígitos", 1052026, "DD/MM/AAAA", "01/05/2026"],
  ["18 Date", new Date(2026, 4, 10, 14, 5, 9), "DD/MM/AAAA HH:MI:SS", "10/05/2026 14:05:09"],
  ["19 ISO só data", "2026-05-10", "DD/MM/AAAA", "10/05/2026"],
  ["20 ISO com hora", "2026-05-10T14:05:00", "HH:MI", "14:05"],
  ["21 vazio data", null, "DD/MM/AAAA", "__/__/____"],
  ["22 MIN_DATE", MIN_DATE, "DD/MM/AAAA", "__/__/____"],
  ["23 MIN_DATE da API", "0001-01-01T00:00:00", "DD/MM/AAAA", "__/__/____"],
  ["24 data inválida", 32132026, "DD/MM/AAAA", "32132026"],
  ["25 vazio alfa", "", "A.ZZZ", ""],
  ["26 tamanho diferente", "A12", "A.ZZZ", "A12"],
];

describe("FNC_FORMATA", () => {
  for (const [wNome, wValor, wMascara, wEsperado] of wCasos) {
    it(wNome, () => {
      expect(FNC_FORMATA(wValor, wMascara)).toBe(wEsperado);
    });
  }

  it("27 máscara inválida lança Error", () => {
    expect(() => FNC_FORMATA(1, "0.000")).toThrow(Error);
    expect(() => FNC_FORMATA(1, "")).toThrow(Error);
  });

  it("complementares: vazio de data é idempotente, sinal sem branco, decimais de string", () => {
    expect(FNC_FORMATA("__/__/____", "DD/MM/AAAA")).toBe("__/__/____");
    expect(FNC_FORMATA(null, "HH:MI")).toBe("__:__");
    expect(FNC_FORMATA(-5, "ZZZ")).toBe("-005");
    expect(FNC_FORMATA(-0.001, "9,99")).toBe("0,00");
    expect(FNC_FORMATA("5", "999.999,99")).toBe("      0,05");
    expect(FNC_FORMATA("29/02/2025", "DD/MM/AAAA")).toBe("29/02/2025"); // devolve como veio (2025 não é bissexto)
    expect(FNC_FORMATA(20260510, "AAAA-MM-DD")).toBe("2026-05-10"); // lido na ordem da máscara
  });

  it("MIN_DATE é o ano 1 (não 1901)", () => {
    expect(MIN_DATE.getFullYear()).toBe(1);
    expect(MIN_DATE.getMonth()).toBe(0);
    expect(MIN_DATE.getDate()).toBe(1);
  });
});
