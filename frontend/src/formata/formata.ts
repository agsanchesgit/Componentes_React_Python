/**
 * FNC_FORMATA – formata número, texto ou data/hora conforme uma máscara.
 *
 * Tokens da máscara:
 *   9            posição numérica, completa com branco
 *   Z            posição numérica, completa com zero
 *   A            posição alfanumérica
 *   DD MM AAAA HH MI SS   partes de data/hora
 *   outro        literal
 *   0            inválido (lança Error)
 *
 * Função pura: não altera o argumento nem guarda estado.
 * Porte de nexus-componentes/formata/formata.ts (mesmo comportamento e mesmos casos de teste).
 */

/** Equivalente ao `DateTime.MinValue` do .NET (0001-01-01T00:00:00). É o "vazio" de data. */
export const MIN_DATE: Date = (() => {
  const wData = new Date(2000, 0, 1, 0, 0, 0, 0);
  // Pegadinha: `new Date(1, 0, 1)` viraria 1901; o setFullYear mantém o ano 1.
  wData.setFullYear(1, 0, 1);
  return wData;
})();

type ParteData = "AAAA" | "DD" | "MM" | "HH" | "MI" | "SS";
type TokenData = { parte: ParteData } | { literal: string };

interface PartesData {
  ano?: number;
  mes?: number;
  dia?: number;
  hora?: number;
  min?: number;
  seg?: number;
}

const PARTES: ParteData[] = ["AAAA", "DD", "MM", "HH", "MI", "SS"];
const CAMPO_DA_PARTE: Record<ParteData, keyof PartesData> = {
  AAAA: "ano",
  DD: "dia",
  MM: "mes",
  HH: "hora",
  MI: "min",
  SS: "seg",
};

const ISO_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

export function FNC_FORMATA(
  variavel: number | string | Date | null | undefined,
  mascara: string,
): string {
  if (typeof mascara !== "string" || mascara === "" || mascara.includes("0")) {
    throw new Error(`FNC_FORMATA: máscara inválida "${mascara}" (vazia ou com o símbolo 0)`);
  }

  if (/DD|MM|HH|MI|SS/.test(mascara)) {
    return fncFormatarDataComMascara(variavel, mascara);
  }

  if (!/[9ZA]/.test(mascara)) {
    throw new Error(`FNC_FORMATA: a máscara "${mascara}" não tem nenhuma posição (9, Z ou A)`);
  }
  if (mascara.includes("A")) {
    return fncFormatarAlfanumerica(variavel, mascara);
  }
  return fncFormatarNumerica(variavel, mascara);
}

function fncComoTexto(valor: number | string | Date): string {
  return typeof valor === "string" ? valor : String(valor);
}

function fncSemLiterais(texto: string, mascara: string): string {
  const wLiterais = new Set([...mascara].filter((c) => c !== "9" && c !== "Z" && c !== "A"));
  return [...texto].filter((c) => !wLiterais.has(c)).join("");
}

// ---------------------------------------------------------------- numérica

function fncFormatarNumerica(
  valor: number | string | Date | null | undefined,
  mascara: string,
): string {
  if (valor === null || valor === undefined) {
    return fncMontarNumerica(mascara, null, "", false);
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      return String(valor);
    }
    return fncNumeroComoMascara(valor, mascara);
  }

  if (typeof valor === "string") {
    const wTexto = valor.trim();
    if (wTexto === "") {
      return fncMontarNumerica(mascara, null, "", false);
    }
    const wDigitos = fncSemLiterais(wTexto, mascara);
    if (!/^\d+$/.test(wDigitos)) {
      return valor;
    }

    const wQtdDecimais = fncCasasDecimais(mascara);
    const wPreenchido = wDigitos.padStart(wQtdDecimais, "0");
    const wInteiros = wPreenchido.slice(0, wPreenchido.length - wQtdDecimais);
    const wDecimais = wPreenchido.slice(wPreenchido.length - wQtdDecimais);
    if (wInteiros.length > fncQuantidadePosicoes(mascara) - wQtdDecimais) {
      return valor;
    }
    return fncMontarNumerica(mascara, wInteiros, wDecimais, false);
  }

  return String(valor);
}

function fncNumeroComoMascara(valor: number, mascara: string): string {
  const wQtdDecimais = fncCasasDecimais(mascara);
  const wNegativo = valor < 0;
  const wArredondado = fncArredondar(Math.abs(valor), wQtdDecimais);
  const wZero = wArredondado.inteiros === "" && !/[1-9]/.test(wArredondado.decimais);

  if (wArredondado.inteiros.length > fncQuantidadePosicoes(mascara) - wQtdDecimais) {
    return String(valor);
  }
  return fncMontarNumerica(mascara, wArredondado.inteiros, wArredondado.decimais, wNegativo && !wZero);
}

/** Arredonda (meio para cima) manipulando a representação decimal, sem erro binário. */
function fncArredondar(abs: number, qtdDecimais: number): { inteiros: string; decimais: string } {
  const wPartes = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(abs));
  if (!wPartes) {
    return { inteiros: "", decimais: "0".repeat(qtdDecimais) };
  }

  const wDigitos = wPartes[1] + (wPartes[2] ?? "");
  const wPonto = wPartes[1].length + (wPartes[3] ? Number(wPartes[3]) : 0);
  let wInteiros: string;
  let wFracao: string;
  if (wPonto <= 0) {
    wInteiros = "";
    wFracao = "0".repeat(-wPonto) + wDigitos;
  } else if (wPonto >= wDigitos.length) {
    wInteiros = wDigitos + "0".repeat(wPonto - wDigitos.length);
    wFracao = "";
  } else {
    wInteiros = wDigitos.slice(0, wPonto);
    wFracao = wDigitos.slice(wPonto);
  }

  wFracao = wFracao.padEnd(qtdDecimais + 1, "0");
  let wTodos = wInteiros + wFracao.slice(0, qtdDecimais);
  if (wFracao[qtdDecimais] >= "5") {
    wTodos = fncIncrementar(wTodos);
  }

  return {
    inteiros: wTodos.slice(0, wTodos.length - qtdDecimais).replace(/^0+/, ""),
    decimais: wTodos.slice(wTodos.length - qtdDecimais),
  };
}

function fncIncrementar(digitos: string): string {
  const wLista = [...digitos];
  for (let wIndice = wLista.length - 1; wIndice >= 0; wIndice--) {
    if (wLista[wIndice] === "9") {
      wLista[wIndice] = "0";
    } else {
      wLista[wIndice] = String(Number(wLista[wIndice]) + 1);
      return wLista.join("");
    }
  }
  return "1" + wLista.join("");
}

function fncPosicoesNumericas(mascara: string): number[] {
  const wResultado: number[] = [];
  [...mascara].forEach((c, i) => {
    if (c === "9" || c === "Z") {
      wResultado.push(i);
    }
  });
  return wResultado;
}

function fncQuantidadePosicoes(mascara: string): number {
  return fncPosicoesNumericas(mascara).length;
}

/** A última vírgula separa as casas decimais. */
function fncCasasDecimais(mascara: string): number {
  const wIndiceVirgula = mascara.lastIndexOf(",");
  if (wIndiceVirgula < 0) {
    return 0;
  }
  return fncPosicoesNumericas(mascara).filter((i) => i > wIndiceVirgula).length;
}

/**
 * `inteiros === null` é o vazio: 9 vira branco e Z vira zero.
 * Com valor, a posição das unidades mostra pelo menos 0 e as decimais são completadas com 0.
 */
function fncMontarNumerica(
  mascara: string,
  inteiros: string | null,
  decimais: string,
  negativo: boolean,
): string {
  const wCaracteres = [...mascara];
  const wIndiceVirgula = mascara.lastIndexOf(",");
  const wPosicoes = fncPosicoesNumericas(mascara);
  const wPosInteiras = wPosicoes.filter((i) => wIndiceVirgula < 0 || i < wIndiceVirgula);
  const wPosFracao = wPosicoes.filter((i) => wIndiceVirgula >= 0 && i > wIndiceVirgula);
  const wSaida: string[] = new Array(wCaracteres.length);
  const wVazio = inteiros === null;
  const wInteiros = inteiros ?? "";

  wPosInteiras.forEach((indice, k) => {
    const wDistancia = wPosInteiras.length - 1 - k; // 0 = unidades
    const wDigito = wInteiros[wInteiros.length - 1 - wDistancia];
    if (wDigito !== undefined) {
      wSaida[indice] = wDigito;
    } else if (!wVazio && wDistancia === 0) {
      wSaida[indice] = "0";
    } else {
      wSaida[indice] = wCaracteres[indice] === "Z" ? "0" : " ";
    }
  });
  wPosFracao.forEach((indice, k) => {
    const wDigito = decimais[k];
    if (wDigito !== undefined) {
      wSaida[indice] = wDigito;
    } else {
      wSaida[indice] = wCaracteres[indice] === "Z" ? "0" : " ";
    }
  });

  // Literal some (vira branco) quando o que vem antes dele ficou em branco.
  const wEhPosicao = new Set(wPosicoes);
  wCaracteres.forEach((c, i) => {
    if (wEhPosicao.has(i)) {
      return;
    }
    wSaida[i] = i > 0 && wSaida[i - 1] === " " ? " " : c;
  });

  if (negativo) {
    const wPrimeiro = wPosicoes.find((i) => wSaida[i] !== " ");
    if (wPrimeiro === undefined || wPrimeiro === 0) {
      return "-" + wSaida.join("");
    }
    wSaida[wPrimeiro - 1] = "-";
  }
  return wSaida.join("");
}

// ---------------------------------------------------------- alfanumérica

function fncFormatarAlfanumerica(
  valor: number | string | Date | null | undefined,
  mascara: string,
): string {
  if (valor === null || valor === undefined) {
    return "";
  }
  const wOriginal = fncComoTexto(valor);
  if (typeof valor === "object") {
    return wOriginal;
  }
  if (wOriginal.trim() === "") {
    return "";
  }

  const wCaracteres = [...mascara];
  const wPosicoes = wCaracteres.filter((c) => c === "A" || c === "9" || c === "Z");
  const wEntrada = [...fncSemLiterais(wOriginal, mascara)];
  if (wEntrada.length !== wPosicoes.length) {
    return wOriginal;
  }

  let wIndiceEntrada = 0;
  let wSaida = "";
  for (const c of wCaracteres) {
    if (c !== "A" && c !== "9" && c !== "Z") {
      wSaida += c;
      continue;
    }
    const wCaractere = wEntrada[wIndiceEntrada++];
    const wOk = c === "A" ? /^[0-9A-Za-z]$/.test(wCaractere) : /^[0-9]$/.test(wCaractere);
    if (!wOk) {
      return wOriginal;
    }
    wSaida += wCaractere;
  }
  return wSaida;
}

// --------------------------------------------------------------- data/hora

function fncTokenizarData(mascara: string): TokenData[] {
  const wTokens: TokenData[] = [];
  let wIndice = 0;
  while (wIndice < mascara.length) {
    const wParte = PARTES.find((p) => mascara.startsWith(p, wIndice));
    if (wParte) {
      wTokens.push({ parte: wParte });
      wIndice += wParte.length;
    } else {
      wTokens.push({ literal: mascara[wIndice] });
      wIndice++;
    }
  }
  return wTokens;
}

function fncFormatarDataComMascara(
  valor: number | string | Date | null | undefined,
  mascara: string,
): string {
  const wTokens = fncTokenizarData(mascara);
  const fncVazio = (): string =>
    wTokens.map((t) => ("parte" in t ? "_".repeat(t.parte.length) : t.literal)).join("");

  if (valor === null || valor === undefined) {
    return fncVazio();
  }
  const wOriginal = fncComoTexto(valor);
  const wPartesDaMascara = wTokens.flatMap((t) => ("parte" in t ? [t.parte] : []));
  const wTamanho = wPartesDaMascara.reduce((soma, p) => soma + p.length, 0);

  let wPartes: PartesData | null = null;

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      return wOriginal;
    }
    wPartes = {
      ano: valor.getFullYear(),
      mes: valor.getMonth() + 1,
      dia: valor.getDate(),
      hora: valor.getHours(),
      min: valor.getMinutes(),
      seg: valor.getSeconds(),
    };
  } else {
    let wDigitos: string | null = null;

    if (typeof valor === "number") {
      if (Number.isInteger(valor) && valor >= 0) {
        wDigitos = String(valor);
      }
    } else {
      const wTexto = valor.trim();
      if (wTexto === "") {
        return fncVazio();
      }
      const wIso = ISO_REGEX.exec(wTexto);
      if (wIso) {
        // Componentes lidos como escritos: evita o deslocamento de dia do `new Date("2026-05-10")` (UTC).
        wPartes = {
          ano: Number(wIso[1]),
          mes: Number(wIso[2]),
          dia: Number(wIso[3]),
          hora: Number(wIso[4] ?? 0),
          min: Number(wIso[5] ?? 0),
          seg: Number(wIso[6] ?? 0),
        };
      } else {
        const wSemLiterais = fncSemLiterais(wTexto, mascara);
        if (/^_+$/.test(wSemLiterais)) {
          return fncVazio(); // idempotência com o próprio vazio
        }
        if (/^\d+$/.test(wSemLiterais)) {
          wDigitos = wSemLiterais;
        }
      }
    }

    if (wPartes === null) {
      if (wDigitos === null || wDigitos.length > wTamanho) {
        return wOriginal;
      }
      // Lido na ordem dos tokens da máscara, completando com zero à esquerda.
      let wResto = wDigitos.padStart(wTamanho, "0");
      wPartes = {};
      for (const wParte of wPartesDaMascara) {
        wPartes[CAMPO_DA_PARTE[wParte]] = Number(wResto.slice(0, wParte.length));
        wResto = wResto.slice(wParte.length);
      }
    }
  }

  if (wPartes.ano === 1) {
    return fncVazio(); // MIN_DATE
  }
  if (!fncPartesValidas(wPartes)) {
    return wOriginal;
  }

  const wPartesFinais = wPartes;
  return wTokens
    .map((t) =>
      "parte" in t
        ? String(wPartesFinais[CAMPO_DA_PARTE[t.parte]]).padStart(t.parte.length, "0")
        : t.literal,
    )
    .join("");
}

function fncPartesValidas(partes: PartesData): boolean {
  if (partes.ano !== undefined && partes.ano < 1) {
    return false;
  }
  if (partes.mes !== undefined && (partes.mes < 1 || partes.mes > 12)) {
    return false;
  }
  if (partes.dia !== undefined) {
    const wAno = partes.ano ?? 2000;
    const wBissexto = wAno % 4 === 0 && (wAno % 100 !== 0 || wAno % 400 === 0);
    const wDias = [31, wBissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const wMaximo = partes.mes !== undefined ? wDias[partes.mes - 1] : 31;
    if (partes.dia < 1 || partes.dia > wMaximo) {
      return false;
    }
  }
  if (partes.hora !== undefined && partes.hora > 23) {
    return false;
  }
  if (partes.min !== undefined && partes.min > 59) {
    return false;
  }
  if (partes.seg !== undefined && partes.seg > 59) {
    return false;
  }
  return true;
}
