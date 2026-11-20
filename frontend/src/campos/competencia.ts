/** Competência no formato AAAAMM (string). Helpers do MmAaaaField. */

export const COMPETENCIA_MIN = "185001";
export const COMPETENCIA_MAX = "210012";

/** Aplica a máscara MM/AAAA enquanto digita. Aceita "/" digitado ("3/2026"); mês de 1 dígito > 1 já vira "0N/". */
export function fncMascararCompetencia(digitado: string): string {
  const wPosicaoBarra = digitado.indexOf("/");
  if (wPosicaoBarra >= 0) {
    const wMes = digitado.slice(0, wPosicaoBarra).replace(/\D/g, "").slice(0, 2);
    const wAno = digitado.slice(wPosicaoBarra + 1).replace(/\D/g, "").slice(0, 4);
    if (wMes === "") {
      return "";
    }
    return `${wMes}/${wAno}`;
  }
  const wDigitos = digitado.replace(/\D/g, "").slice(0, 6);
  if (wDigitos.length === 1 && wDigitos > "1") {
    return `0${wDigitos}/`;
  }
  if (wDigitos.length <= 2) {
    return wDigitos;
  }
  return `${wDigitos.slice(0, 2)}/${wDigitos.slice(2)}`;
}

/** Ao sair: mês de 1 dígito ganha o zero à esquerda ("3/2026" → "03/2026"). Demais textos ficam como estão. */
export function fncCompletarCompetencia(texto: string): string {
  const wTexto = texto.trim();
  if (wTexto === "") {
    return "";
  }
  const wPartes = /^(\d)\/(\d+)$/.exec(wTexto);
  return wPartes ? `0${wPartes[1]}/${wPartes[2]}` : wTexto;
}

/** "202610" → "10/2026"; qualquer coisa fora do formato → "". */
export function fncCompetenciaParaTexto(valor: string): string {
  return /^\d{6}$/.test(valor) ? `${valor.slice(4)}/${valor.slice(0, 4)}` : "";
}

/** "10/2026" → "202610" (só chamar com texto já validado). */
export function fncTextoParaCompetencia(texto: string): string {
  return `${texto.slice(3)}${texto.slice(0, 2)}`;
}

export function fncFormatarCompetencia(aaaamm: string): string {
  return fncCompetenciaParaTexto(aaaamm) || aaaamm;
}

/** Mensagem de erro do texto "MM/AAAA" completo, ou null se é válido e está na faixa. */
export function fncValidarCompetencia(texto: string, menor: string, maior: string): string | null {
  const wPartes = /^(\d{2})\/(\d{4})$/.exec(texto);
  if (!wPartes) {
    return "Competência inválida (use MM/AAAA)";
  }
  const wMes = Number(wPartes[1]);
  if (wMes < 1 || wMes > 12) {
    return "Mês inválido (01 a 12)";
  }
  const wAaaamm = `${wPartes[2]}${wPartes[1]}`;
  if (wAaaamm < menor || wAaaamm > maior) {
    return `Competência fora da faixa (${fncFormatarCompetencia(menor)} a ${fncFormatarCompetencia(maior)})`;
  }
  return null;
}
