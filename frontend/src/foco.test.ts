import { afterEach, describe, expect, it } from "vitest";
import { prcMoverFoco } from "./foco";

// O jsdom não calcula layout: simula elementos visíveis.
function fncCriarCampo(id: string, desabilitado = false): HTMLInputElement {
  const wCampo = document.createElement("input");
  wCampo.id = id;
  wCampo.disabled = desabilitado;
  wCampo.getClientRects = () => [{}] as unknown as DOMRectList;
  document.body.appendChild(wCampo);
  return wCampo;
}

describe("prcMoverFoco", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("vai ao próximo e ao anterior, pulando desabilitados", () => {
    const wA = fncCriarCampo("a");
    fncCriarCampo("b", true);
    const wC = fncCriarCampo("c");

    prcMoverFoco(wA, 1);
    expect(document.activeElement).toBe(wC);

    prcMoverFoco(wC, -1);
    expect(document.activeElement).toBe(wA);
  });

  it("no limite da lista não faz nada", () => {
    const wA = fncCriarCampo("a");
    wA.focus();
    prcMoverFoco(wA, -1);
    expect(document.activeElement).toBe(wA);
  });
});
