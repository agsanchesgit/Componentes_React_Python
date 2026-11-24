/**
 * Regras do `TextNumericoField`: leitura da máscara numérica, máscara enquanto digita e formatação final.
 * A máscara usa os tokens do `FNC_FORMATA`: `9` ou `Z` = um dígito, a **última vírgula** é o separador decimal e o
 * ponto antes dela pede separador de milhar (`999.999,99`).
 */

export interface MascaraNumerica {
  /** Quantidade máxima de dígitos antes da vírgula. */
  inteiros: number;
  /** Quantidade de casas depois da vírgula (0 = valor inteiro). */
  decimais: number;
  /** Mostra ponto de milhar no texto final. */
  milhar: boolean;
}

function fncContarDigitos(wTrecho: string): number {
  return (wTrecho.match(/[9Z]/g) ?? []).length;
}

/** Lê a máscara (`"999.999,99"`). Máscara sem dígito, ou com o caractere `0` (inválido no `FNC_FORMATA`), lança `Error`. */
export function fncLerMascaraNumerica(wMascara: string): MascaraNumerica {
  if (wMascara.includes("0")) {
    throw new Error('Máscara numérica inválida: use "9" ou "Z" para dígito (o caractere "0" não é aceito).');
  }
  const wPosicaoVirgula = wMascara.lastIndexOf(",");
  const wParteInteira = wPosicaoVirgula < 0 ? wMascara : wMascara.slice(0, wPosicaoVirgula);
  const wParteDecimal = wPosicaoVirgula < 0 ? "" : wMascara.slice(wPosicaoVirgula + 1);
  const wInteiros = fncContarDigitos(wParteInteira);
  if (wInteiros === 0) {
    throw new Error('Máscara numérica inválida: informe ao menos um dígito antes da vírgula (ex.: "999,99").');
  }
  return {
    inteiros: wInteiros,
    decimais: fncContarDigitos(wParteDecimal),
    milhar: wParteInteira.includes("."),
  };
}

/**
 * Máscara aplicada a cada tecla. Digita-se a parte inteira; `,` ou `.` passa para a parte fracionária (só uma vez, e só
 * se a máscara tem casas decimais). Letras e excesso de dígitos são ignorados. Com vírgula no texto, os pontos que
 * restarem são de milhar (texto já formatado) e são descartados.
 */
export function fncMascararNumerico(wDigitado: string, wMascara: MascaraNumerica): string {
  let wTexto = wDigitado;
  if (wMascara.decimais > 0 && !wTexto.includes(",")) {
    const wPosicaoPonto = wTexto.indexOf(".");
    if (wPosicaoPonto >= 0) {
      wTexto = `${wTexto.slice(0, wPosicaoPonto)},${wTexto.slice(wPosicaoPonto + 1)}`;
    }
  }
  const wPosicaoVirgula = wMascara.decimais > 0 ? wTexto.indexOf(",") : -1;
  const wBrutoInteiro = (wPosicaoVirgula < 0 ? wTexto : wTexto.slice(0, wPosicaoVirgula)).replace(/\D/g, "");
  const wInteiro = wBrutoInteiro.replace(/^0+(?=\d)/, "").slice(0, wMascara.inteiros);
  if (wPosicaoVirgula < 0) {
    return wInteiro;
  }
  const wFracao = wTexto
    .slice(wPosicaoVirgula + 1)
    .replace(/\D/g, "")
    .slice(0, wMascara.decimais);
  return `${wInteiro === "" ? "0" : wInteiro},${wFracao}`;
}

/** Texto final do número na máscara: casas decimais fixas e, se a máscara pede, ponto de milhar (`1234.5` → `1.234,50`). */
export function fncFormatarNumero(wValor: number, wMascara: MascaraNumerica): string {
  const [wInteiro, wDecimal] = wValor.toFixed(wMascara.decimais).split(".");
  const wAgrupado = wMascara.milhar ? wInteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : wInteiro;
  return wMascara.decimais > 0 ? `${wAgrupado},${wDecimal}` : wAgrupado;
}

/** Número do texto exibido (`"1.234,50"` → `1234.5`). Texto sem dígito dá 0. */
export function fncNumeroDoTexto(wTexto: string): number {
  const wNumero = Number(wTexto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(wNumero) ? wNumero : 0;
}
