// CPF e CNPJ: formatação e dígito verificador. Lógica pura, sem DOM.

export function fncSomenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Aplica o padrão (`X` = um caractere) da esquerda para a direita; os literais só entram se houver caractere depois. */
export function fncAplicarPadrao(caracteres: string, padrao: string): string {
  let wSaida = "";
  let wIndice = 0;
  for (const c of padrao) {
    if (wIndice >= caracteres.length) {
      break;
    }
    wSaida += c === "X" ? caracteres[wIndice++] : c;
  }
  return wSaida;
}

export const PADRAO_CPF = "XXX.XXX.XXX-XX";
export const PADRAO_CNPJ = "XX.XXX.XXX/XXXX-XX";

// ---------------------------------------------------------------- CPF

/** Recebe os 11 dígitos. Todos iguais (111.111.111-11) é inválido. */
export function fncCpfValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  const fncDigitoVerificador = (qtd: number): number => {
    let wSoma = 0;
    for (let wIndice = 0; wIndice < qtd; wIndice++) {
      wSoma += Number(digitos[wIndice]) * (qtd + 1 - wIndice);
    }
    const wResto = (wSoma * 10) % 11;
    return wResto === 10 ? 0 : wResto;
  };
  return fncDigitoVerificador(9) === Number(digitos[9]) && fncDigitoVerificador(10) === Number(digitos[10]);
}

/** Digitação do CPF: só dígitos, até 11, com a máscara progressiva. */
export function fncMascararCpf(digitado: string): string {
  return fncAplicarPadrao(fncSomenteDigitos(digitado).slice(0, 11), PADRAO_CPF);
}

/** Ao sair do campo: completa com zeros à esquerda (11 dígitos). Vazio ou só zeros → "". */
export function fncCompletarCpf(texto: string): string {
  const wDigitos = fncSomenteDigitos(texto);
  if (wDigitos === "" || /^0+$/.test(wDigitos)) {
    return "";
  }
  return fncAplicarPadrao(wDigitos.padStart(11, "0"), PADRAO_CPF);
}

// ---------------------------------------------------------------- CNPJ (numérico e alfanumérico)

/** Os 12 primeiros caracteres aceitam letras e números; os 2 últimos (dígito verificador) só números. */
export function fncLimparCnpj(texto: string): string {
  const wCaracteres = texto.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14);
  return wCaracteres.slice(0, 12) + wCaracteres.slice(12).replace(/\D/g, "");
}

/** Valor do caractere no cálculo: código ASCII menos 48 (0–9 → 0–9, A → 17, B → 18...). */
function fncValorCnpj(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

/** Recebe os 14 caracteres sem máscara. Todos iguais é inválido. */
export function fncCnpjValido(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) {
    return false;
  }

  const fncDigitoVerificador = (qtd: number): number => {
    let wSoma = 0;
    let wPeso = 2;
    for (let wIndice = qtd - 1; wIndice >= 0; wIndice--) {
      wSoma += fncValorCnpj(cnpj[wIndice]) * wPeso;
      wPeso = wPeso === 9 ? 2 : wPeso + 1;
    }
    const wResto = wSoma % 11;
    return wResto < 2 ? 0 : 11 - wResto;
  };
  return fncDigitoVerificador(12) === Number(cnpj[12]) && fncDigitoVerificador(13) === Number(cnpj[13]);
}

export function fncMascararCnpj(digitado: string): string {
  return fncAplicarPadrao(fncLimparCnpj(digitado), PADRAO_CNPJ);
}

/** Ao sair do campo: completa com zeros à esquerda (14 caracteres). Vazio ou só zeros → "". */
export function fncCompletarCnpj(texto: string): string {
  const wCaracteres = fncLimparCnpj(texto);
  if (wCaracteres === "" || /^0+$/.test(wCaracteres)) {
    return "";
  }
  return fncAplicarPadrao(wCaracteres.padStart(14, "0"), PADRAO_CNPJ);
}
