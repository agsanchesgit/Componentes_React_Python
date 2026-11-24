import { describe, expect, it } from "vitest";

import * as api from "./index";

// Trava a API pública: acrescentar é ok (atualize a lista); sumir algo por engano falha aqui.
describe("API pública (index.ts)", () => {
  it("exporta exatamente estes valores", () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        "Carregando",
        "CnpjField",
        "ComboField",
        "ComponentesProvider",
        "CpfField",
        "DataField",
        "DataHoraField",
        "FNC_FORMATA",
        "GRID_MAX_LINHAS",
        "GridField",
        "LookUpField",
        "MIN_DATE",
        "MmAaaaField",
        "TextEmailField",
        "TextNumericoField",
        "useComponentesApi",
        "useComponentesCaminhoLookup",
      ].sort(),
    );
  });

  it("os componentes são funções e as constantes têm o valor esperado", () => {
    for (const wNome of ["Carregando", "CnpjField", "ComboField", "CpfField", "DataField", "DataHoraField", "GridField", "LookUpField", "MmAaaaField", "TextEmailField", "TextNumericoField"] as const) {
      expect(typeof api[wNome]).toBe("function");
    }
    expect(api.GRID_MAX_LINHAS).toBe(3000);
    expect(api.MIN_DATE.getFullYear()).toBe(1);
    expect(api.FNC_FORMATA(1234.5, "999.999,99")).toBe("  1.234,50");
  });
});
