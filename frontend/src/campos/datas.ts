// Regras de data/hora dos campos DataField e DataHoraField. Lógica pura, sem DOM.

export const ANO_MINIMO = 1850;
export const ANO_MAXIMO = 2100;

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Divisível por 4, exceto os divisíveis por 100, salvo se também divisíveis por 400. */
export function fncEhBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** `mes` de 1 a 12. */
export function fncDiasNoMes(ano: number, mes: number): number {
  if (mes === 2) {
    return fncEhBissexto(ano) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

function fncDoisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function fncFormatarData(data: Date): string {
  return `${fncDoisDigitos(data.getDate())}/${fncDoisDigitos(data.getMonth() + 1)}/${String(data.getFullYear()).padStart(4, "0")}`;
}

export function fncFormatarDataHora(data: Date): string {
  return `${fncFormatarData(data)} ${fncDoisDigitos(data.getHours())}:${fncDoisDigitos(data.getMinutes())}:${fncDoisDigitos(data.getSeconds())}`;
}

export function fncDiaDaSemana(data: Date): string {
  return DIAS_SEMANA[data.getDay()];
}

export interface LeituraData {
  data?: Date;
  erro?: string;
}

function fncMontarData(
  dia: number,
  mes: number,
  ano: number,
  hora: number,
  minuto: number,
  segundo: number,
  rotulo: string,
): LeituraData {
  if (ano < ANO_MINIMO || ano > ANO_MAXIMO) {
    return { erro: `Ano deve estar entre ${ANO_MINIMO} e ${ANO_MAXIMO}` };
  }
  if (mes < 1 || mes > 12 || dia < 1 || dia > fncDiasNoMes(ano, mes)) {
    return { erro: `${rotulo} inválida` };
  }
  if (hora > 23 || minuto > 59 || segundo > 59) {
    return { erro: "Hora inválida" };
  }
  return { data: new Date(ano, mes - 1, dia, hora, minuto, segundo) };
}

/** `DD/MM/AAAA` (sempre 4 dígitos no ano). */
export function fncLerData(texto: string): LeituraData {
  const wPartes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!wPartes) {
    return { erro: "Data inválida" };
  }
  return fncMontarData(Number(wPartes[1]), Number(wPartes[2]), Number(wPartes[3]), 0, 0, 0, "Data");
}

/** `DD/MM/AAAA HH:MI:SS`. */
export function fncLerDataHora(texto: string): LeituraData {
  const wPartes = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(texto);
  if (!wPartes) {
    return { erro: "Data/hora inválida" };
  }
  return fncMontarData(
    Number(wPartes[1]),
    Number(wPartes[2]),
    Number(wPartes[3]),
    Number(wPartes[4]),
    Number(wPartes[5]),
    Number(wPartes[6]),
    "Data/hora",
  );
}

/** Zera a hora. */
export function fncSoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

/** O `MIN_DATE` (ano 1) e valores inválidos significam "não informado". */
export function fncLimiteOuNulo(data: Date | undefined | null): Date | null {
  return data instanceof Date && !Number.isNaN(data.getTime()) && data.getFullYear() > 1 ? data : null;
}

/** Mensagem se `data` estiver fora de [minimo, maximo]; null se estiver dentro. */
export function fncVerificarFaixa(
  data: Date,
  minimo: Date | null,
  maximo: Date | null,
  comHora: boolean,
): string | null {
  const wRotulo = comHora ? "Data/hora" : "Data";
  const fncFormato = comHora ? fncFormatarDataHora : fncFormatarData;
  const wValor = comHora ? data : fncSoDia(data);
  if (minimo && wValor < (comHora ? minimo : fncSoDia(minimo))) {
    return `${wRotulo} deve ser igual ou posterior a ${fncFormato(minimo)}`;
  }
  if (maximo && wValor > (comHora ? maximo : fncSoDia(maximo))) {
    return `${wRotulo} deve ser igual ou anterior a ${fncFormato(maximo)}`;
  }
  return null;
}
