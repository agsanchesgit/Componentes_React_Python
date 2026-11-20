import { FNC_FORMATA, MIN_DATE } from "../formata/formata";
import type { LookupCodigo, LookupLinha, LookupMascaraGrid, LookupTipoValor } from "./lookup.types";

export const MINIMO_BACKEND = 3;

export function fncValorVazio(tipo: LookupTipoValor): LookupCodigo {
  if (tipo === "NUMERO") {
    return 0;
  }
  if (tipo === "DATA") {
    return MIN_DATE;
  }
  return "";
}

export function fncEhVazio(valor: LookupCodigo | null | undefined, tipo: LookupTipoValor): boolean {
  if (valor === null || valor === undefined) {
    return true;
  }
  if (tipo === "NUMERO") {
    return Number(valor) === 0;
  }
  if (tipo === "DATA") {
    return !(valor instanceof Date) || valor.getFullYear() <= 1;
  }
  return String(valor) === "";
}

/** Texto que aparece no campo Código para um valor vindo do consumidor. */
export function fncValorParaTexto(valor: LookupCodigo, tipo: LookupTipoValor): string {
  if (fncEhVazio(valor, tipo)) {
    return "";
  }
  if (tipo === "DATA") {
    return FNC_FORMATA(valor as Date, "DD/MM/AAAA");
  }
  return String(valor);
}

/** Chave estável para comparar o `value` entre renders (Date vira timestamp). */
export function fncChaveDoValor(valor: LookupCodigo): string {
  return valor instanceof Date ? `d:${valor.getTime()}` : `v:${String(valor)}`;
}

/** Converte o valor devolvido pela API (número, texto ou ISO) para o tipo do consumidor. */
export function fncConverterCodigo(bruto: unknown, tipo: LookupTipoValor): LookupCodigo {
  if (bruto === null || bruto === undefined || bruto === "") {
    return fncValorVazio(tipo);
  }
  if (tipo === "NUMERO") {
    const wNumero = Number(bruto);
    return Number.isFinite(wNumero) ? wNumero : 0;
  }
  if (tipo === "DATA") {
    const wPartes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(bruto));
    return wPartes ? new Date(Number(wPartes[1]), Number(wPartes[2]) - 1, Number(wPartes[3])) : MIN_DATE;
  }
  return String(bruto);
}

/** Máscara progressiva `DD/MM/AAAA` a partir de qualquer texto digitado. */
export function fncMascararData(texto: string): string {
  const wDigitos = texto.replace(/\D/g, "").slice(0, 8);
  if (wDigitos.length <= 2) {
    return wDigitos;
  }
  if (wDigitos.length <= 4) {
    return `${wDigitos.slice(0, 2)}/${wDigitos.slice(2)}`;
  }
  return `${wDigitos.slice(0, 2)}/${wDigitos.slice(2, 4)}/${wDigitos.slice(4)}`;
}

export function fncEhDataIso(valor: string): boolean {
  // "T" (ISO) ou espaço (o que alguns drivers/SQLite devolvem), igual ao FNC_FORMATA.
  return /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(valor);
}

/** Texto exibido numa célula do grid: tradução de sigla → máscara → valor cru. */
export function fncTextoDaCelula(
  linha: LookupLinha,
  coluna: string,
  mascaras?: Record<string, LookupMascaraGrid>,
  mapa?: Record<string, Record<string, string>>,
): string {
  const wBruto = linha[coluna];
  const wTraduzido = mapa?.[coluna]?.[String(wBruto ?? "")];
  if (wTraduzido !== undefined) {
    return wTraduzido;
  }

  const wMascaraBruta = mascaras?.[coluna];
  const wMascara = typeof wMascaraBruta === "function" ? wMascaraBruta(linha) : wMascaraBruta;
  if (wMascara) {
    return FNC_FORMATA(wBruto, wMascara);
  }

  // Data ISO sem máscara informada: DD/MM/AAAA (com hora, só quando houver).
  if (typeof wBruto === "string" && fncEhDataIso(wBruto)) {
    const wComHora = wBruto.length > 10 && !/[T ]00:00(:00)?(\.0+)?$/.test(wBruto);
    return FNC_FORMATA(wBruto, wComHora ? "DD/MM/AAAA HH:MI" : "DD/MM/AAAA");
  }

  return wBruto === null || wBruto === undefined ? "" : String(wBruto);
}

export type Alinhamento = "left" | "right" | "center";

/** Número → direita, data → centro, texto → esquerda (decidido pelo primeiro valor preenchido da coluna). */
export function fncAlinhamentoDaColuna(linhas: LookupLinha[], coluna: string): Alinhamento {
  for (const wLinha of linhas) {
    const wValor = wLinha[coluna];
    if (wValor === null || wValor === undefined || wValor === "") {
      continue;
    }
    if (typeof wValor === "number") {
      return "right";
    }
    return fncEhDataIso(String(wValor)) ? "center" : "left";
  }
  return "left";
}

function fncEscaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Quebra o texto em trechos, marcando os que casam com alguma palavra do termo (sem diferenciar caixa). */
export function fncTrechosComDestaque(texto: string, termo: string): { texto: string; marcado: boolean }[] {
  const wPalavras = termo.trim().split(/\s+/).filter(Boolean);
  if (wPalavras.length === 0 || !texto) {
    return [{ texto, marcado: false }];
  }

  const wRegex = new RegExp(`(${wPalavras.map(fncEscaparRegex).join("|")})`, "gi");
  // split com grupo de captura: os índices ímpares são os trechos que casaram
  return texto
    .split(wRegex)
    .map((trecho, indice) => ({ texto: trecho, marcado: indice % 2 === 1 }))
    .filter((trecho) => trecho.texto !== "");
}
