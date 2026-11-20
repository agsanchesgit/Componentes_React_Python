const FOCAVEIS = "a[href], button, input, select, textarea, [tabindex]";

/** Leva o foco ao próximo (+1) ou anterior (-1) elemento da ordem de Tab, como a tecla Tab faria. */
export function prcMoverFoco(atual: HTMLElement, direcao: 1 | -1): void {
  const wLista = Array.from(document.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
    (elemento) =>
      (elemento === atual || (elemento.tabIndex >= 0 && !(elemento as HTMLInputElement).disabled)) &&
      elemento.getClientRects().length > 0 &&
      !elemento.closest("[inert], [aria-hidden='true']"),
  );
  wLista[wLista.indexOf(atual) + direcao]?.focus();
}
