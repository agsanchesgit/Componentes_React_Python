/** Converte o domínio ("SP,RJ,MG" ou array) em lista sem vazios nem repetidos (comparando sem diferenciar maiúscula). */
export function fncLerDominio(dominio: string | readonly string[]): string[] {
  const wBruto = typeof dominio === "string" ? dominio.split(",") : dominio;
  const wVistos = new Set<string>();
  const wLista: string[] = [];
  for (const wItem of wBruto) {
    const wValor = wItem.trim();
    const wChave = wValor.toUpperCase();
    if (wValor === "" || wVistos.has(wChave)) {
      continue;
    }
    wVistos.add(wChave);
    wLista.push(wValor);
  }
  return wLista;
}

/** Posição (base 1) do item na lista, sem diferenciar maiúscula; 0 se não existe. */
export function fncOrdemDoItem(lista: readonly string[], texto: string): number {
  const wTexto = texto.trim().toUpperCase();
  if (wTexto === "") {
    return 0;
  }
  return lista.findIndex((item) => item.toUpperCase() === wTexto) + 1;
}

/** Primeiro item que começa com o texto (sem diferenciar maiúscula); null se nenhum. */
export function fncItemPorPrefixo(lista: readonly string[], texto: string): string | null {
  const wTexto = texto.toUpperCase();
  if (wTexto === "") {
    return null;
  }
  return lista.find((item) => item.toUpperCase().startsWith(wTexto)) ?? null;
}

/** Máscara de digitação: corta o texto até o maior prefixo que ainda é começo de algum item (bloqueia o que está fora do domínio). */
export function fncRestringirAoDominio(lista: readonly string[], digitado: string): string {
  let wTexto = digitado.replace(/^\s+/, "");
  while (wTexto !== "" && fncItemPorPrefixo(lista, wTexto) === null) {
    wTexto = wTexto.slice(0, -1);
  }
  return wTexto;
}
