import { describe, expect, it } from "vitest";
import {
  fncDiaDaSemana,
  fncDiasNoMes,
  fncEhBissexto,
  fncLerData,
  fncLerDataHora,
  fncLimiteOuNulo,
  fncVerificarFaixa,
} from "./datas";
import {
  fncCnpjValido,
  fncCompletarCnpj,
  fncCompletarCpf,
  fncCpfValido,
  fncMascararCnpj,
  fncMascararCpf,
} from "./documentos";
import {
  fncCompletarCompetencia,
  fncMascararCompetencia,
  fncTextoParaCompetencia,
  fncValidarCompetencia,
} from "./competencia";
import { fncItemPorPrefixo, fncLerDominio, fncOrdemDoItem, fncRestringirAoDominio } from "./combo";
import { MIN_DATE } from "../formata/formata";

describe("datas", () => {
  it("ano bissexto", () => {
    expect(fncEhBissexto(2024)).toBe(true);
    expect(fncEhBissexto(2000)).toBe(true);
    expect(fncEhBissexto(1900)).toBe(false);
    expect(fncEhBissexto(2026)).toBe(false);
    expect(fncDiasNoMes(2024, 2)).toBe(29);
    expect(fncDiasNoMes(2026, 2)).toBe(28);
  });

  it("fncLerData", () => {
    expect(fncLerData("29/02/2024").data?.getDate()).toBe(29);
    expect(fncLerData("29/02/2026").erro).toBe("Data inválida");
    expect(fncLerData("30/02/2026").erro).toBe("Data inválida");
    expect(fncLerData("31/04/2026").erro).toBe("Data inválida");
    expect(fncLerData("10/13/2026").erro).toBe("Data inválida");
    expect(fncLerData("10/05/26").erro).toBe("Data inválida");
    expect(fncLerData("10/05/1849").erro).toMatch(/1850/);
    expect(fncLerData("10/05/2101").erro).toMatch(/2100/);
    expect(fncLerData("10/05/1850").data).toBeTruthy();
    expect(fncLerData("31/12/2100").data).toBeTruthy();
  });

  it("fncLerDataHora", () => {
    const wData = fncLerDataHora("10/05/2026 14:05:09").data!;
    expect([wData.getHours(), wData.getMinutes(), wData.getSeconds()]).toEqual([14, 5, 9]);
    expect(fncLerDataHora("10/05/2026 24:00:00").erro).toBe("Hora inválida");
    expect(fncLerDataHora("10/05/2026 10:60:00").erro).toBe("Hora inválida");
    expect(fncLerDataHora("10/05/2026 10:00").erro).toBe("Data/hora inválida");
  });

  it("dia da semana", () => {
    expect(fncDiaDaSemana(new Date(2026, 9, 15))).toBe("qui");
    expect(fncDiaDaSemana(new Date(2026, 9, 18))).toBe("dom");
  });

  it("faixa de datas", () => {
    const wMinimo = new Date(2026, 0, 10);
    const wMaximo = new Date(2026, 0, 20);
    expect(fncVerificarFaixa(new Date(2026, 0, 15), wMinimo, wMaximo, false)).toBeNull();
    expect(fncVerificarFaixa(new Date(2026, 0, 10, 23, 0, 0), wMinimo, wMaximo, false)).toBeNull();
    expect(fncVerificarFaixa(new Date(2026, 0, 9), wMinimo, wMaximo, false)).toMatch(/posterior a 10\/01\/2026/);
    expect(fncVerificarFaixa(new Date(2026, 0, 21), wMinimo, wMaximo, false)).toMatch(/anterior a 20\/01\/2026/);
    expect(fncVerificarFaixa(new Date(2026, 0, 15), null, null, true)).toBeNull();
    // com hora, a comparação é pelo instante
    expect(fncVerificarFaixa(new Date(2026, 0, 20, 10), null, wMaximo, true)).toMatch(/anterior a/);
  });

  it("MIN_DATE e inválidos são 'sem limite'", () => {
    expect(fncLimiteOuNulo(MIN_DATE)).toBeNull();
    expect(fncLimiteOuNulo(undefined)).toBeNull();
    expect(fncLimiteOuNulo(new Date("x"))).toBeNull();
    const wData = new Date(2026, 0, 1);
    expect(fncLimiteOuNulo(wData)).toBe(wData);
  });
});

describe("documentos", () => {
  it("CPF", () => {
    expect(fncCpfValido("52998224725")).toBe(true);
    expect(fncCpfValido("11144477735")).toBe(true);
    expect(fncCpfValido("52998224724")).toBe(false);
    expect(fncCpfValido("11111111111")).toBe(false);
    expect(fncCpfValido("00000000000")).toBe(false);
    expect(fncCpfValido("5299822472")).toBe(false);
    expect(fncMascararCpf("1234")).toBe("123.4");
    expect(fncMascararCpf("12345678901234")).toBe("123.456.789-01");
    expect(fncCompletarCpf("374287813")).toBe("003.742.878-13");
    expect(fncCompletarCpf("000")).toBe("");
    expect(fncCompletarCpf("")).toBe("");
  });

  it("CNPJ numérico e alfanumérico", () => {
    expect(fncCnpjValido("11222333000181")).toBe(true);
    expect(fncCnpjValido("11222333000180")).toBe(false);
    expect(fncCnpjValido("11111111111111")).toBe(false);
    expect(fncCnpjValido("12ABC34501DE35")).toBe(true); // exemplo oficial da Receita
    expect(fncCnpjValido("12ABC34501DE36")).toBe(false);
    expect(fncCnpjValido("12ABC34501DEAB")).toBe(false);
    expect(fncMascararCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(fncMascararCnpj("12ABC34501DEAB")).toBe("12.ABC.345/01DE");
    expect(fncCompletarCnpj("2849393000145")).toBe("02.849.393/0001-45");
    expect(fncCompletarCnpj("0")).toBe("");
  });
});

describe("competência", () => {
  it("máscara e complemento", () => {
    expect(fncMascararCompetencia("3")).toBe("03/");
    expect(fncMascararCompetencia("1")).toBe("1");
    expect(fncMascararCompetencia("102026")).toBe("10/2026");
    expect(fncMascararCompetencia("3/2026")).toBe("3/2026");
    expect(fncMascararCompetencia("03//")).toBe("03/");
    expect(fncCompletarCompetencia("3/2026")).toBe("03/2026");
    expect(fncTextoParaCompetencia("03/2026")).toBe("202603");
  });

  it("validação e faixa", () => {
    const fncValidar = (texto: string) => fncValidarCompetencia(texto, "202001", "202612");
    expect(fncValidar("03/2026")).toBeNull();
    expect(fncValidar("13/2026")).toMatch(/Mês/);
    expect(fncValidar("00/2026")).toMatch(/Mês/);
    expect(fncValidar("03/26")).toMatch(/inválida/);
    expect(fncValidar("03")).toMatch(/inválida/);
    expect(fncValidar("12/2019")).toMatch(/faixa/);
    expect(fncValidar("01/2027")).toMatch(/faixa/);
    expect(fncValidar("01/2020")).toBeNull();
    expect(fncValidar("12/2026")).toBeNull();
  });
});

describe("combo", () => {
  it("domínio, ordem e digitação restrita", () => {
    const wLista = fncLerDominio("SP, RJ,MG,,sp,MS");
    expect(wLista).toEqual(["SP", "RJ", "MG", "MS"]);
    expect(fncOrdemDoItem(wLista, "mg")).toBe(3);
    expect(fncOrdemDoItem(wLista, "XX")).toBe(0);
    expect(fncOrdemDoItem(wLista, "")).toBe(0);
    expect(fncItemPorPrefixo(wLista, "m")).toBe("MG");
    expect(fncItemPorPrefixo(wLista, "x")).toBeNull();
    expect(fncRestringirAoDominio(wLista, "MSX")).toBe("MS");
    expect(fncRestringirAoDominio(wLista, "Z")).toBe("");
  });

  it("aceita o domínio como array", () => {
    expect(fncLerDominio(["A", " b ", "a"])).toEqual(["A", "b"]);
  });
});
