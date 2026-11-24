/**
 * Regras do `TextEmailField`: máscara enquanto digita e conferência do formato ao sair. Todas as regras de e-mail da
 * biblioteca ficam aqui: minúsculas, sem espaços, um só `@`, só caracteres permitidos e tamanhos máximos (RFC 5321).
 */

export const EMAIL_TAMANHO_MAXIMO = 254;
const EMAIL_LOCAL_MAXIMO = 64;

const CARACTERES_PERMITIDOS = /[^a-z0-9@.!#$%&'*+/=?^_`{|}~-]/g;

const FORMATO_EMAIL =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Máscara a cada tecla: minúsculas, sem espaços nem caracteres proibidos, um só `@` (os seguintes são descartados). */
export function fncMascararEmail(wDigitado: string): string {
  const wLimpo = wDigitado.toLowerCase().replace(CARACTERES_PERMITIDOS, "");
  const wPosicaoArroba = wLimpo.indexOf("@");
  const wTexto =
    wPosicaoArroba < 0
      ? wLimpo
      : `${wLimpo.slice(0, wPosicaoArroba + 1)}${wLimpo.slice(wPosicaoArroba + 1).replace(/@/g, "")}`;
  return wTexto.slice(0, EMAIL_TAMANHO_MAXIMO);
}

/** O texto (já em minúsculas) é um e-mail válido? Confere formato, ponto no domínio e tamanhos. */
export function fncEmailValido(wTexto: string): boolean {
  if (wTexto.length > EMAIL_TAMANHO_MAXIMO || !FORMATO_EMAIL.test(wTexto)) {
    return false;
  }
  return wTexto.slice(0, wTexto.indexOf("@")).length <= EMAIL_LOCAL_MAXIMO;
}
