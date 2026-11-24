import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TextNumericoField } from "./TextNumericoField";
import { fncFormatarNumero, fncLerMascaraNumerica, fncMascararNumerico, fncNumeroDoTexto } from "./numerico";

afterEach(() => {
  cleanup();
});

describe("fncLerMascaraNumerica", () => {
  it("lê inteiros, decimais e milhar da máscara", () => {
    expect(fncLerMascaraNumerica("999.999,99")).toEqual({ inteiros: 6, decimais: 2, milhar: true });
    expect(fncLerMascaraNumerica("ZZ9,9999")).toEqual({ inteiros: 3, decimais: 4, milhar: false });
    expect(fncLerMascaraNumerica("999")).toEqual({ inteiros: 3, decimais: 0, milhar: false });
  });

  it("máscara inválida lança erro", () => {
    expect(() => fncLerMascaraNumerica("000,00")).toThrow();
    expect(() => fncLerMascaraNumerica(",99")).toThrow();
  });
});

describe("fncMascararNumerico (a cada tecla)", () => {
  const wMascara = fncLerMascaraNumerica("999.999,99");

  it("digita a parte inteira e limita os dígitos", () => {
    expect(fncMascararNumerico("1234", wMascara)).toBe("1234");
    expect(fncMascararNumerico("1234567", wMascara)).toBe("123456");
    expect(fncMascararNumerico("12ab3", wMascara)).toBe("123");
  });

  it("vírgula ou ponto passa para a fração, uma só vez", () => {
    expect(fncMascararNumerico("12,", wMascara)).toBe("12,");
    expect(fncMascararNumerico("12.", wMascara)).toBe("12,");
    expect(fncMascararNumerico("12,3", wMascara)).toBe("12,3");
    expect(fncMascararNumerico("12,345", wMascara)).toBe("12,34");
    expect(fncMascararNumerico("12,3,4", wMascara)).toBe("12,34");
    expect(fncMascararNumerico(",5", wMascara)).toBe("0,5");
  });

  it("texto já formatado: os pontos de milhar são descartados", () => {
    expect(fncMascararNumerico("1.234,50", wMascara)).toBe("1234,50");
    expect(fncMascararNumerico("1.234,505", wMascara)).toBe("1234,50");
  });

  it("sem casas decimais, vírgula e ponto são ignorados", () => {
    const wInteiro = fncLerMascaraNumerica("999");
    expect(fncMascararNumerico("1,2.3", wInteiro)).toBe("123");
  });
});

describe("fncFormatarNumero e fncNumeroDoTexto", () => {
  it("completa as casas e põe o milhar", () => {
    expect(fncFormatarNumero(1234.5, fncLerMascaraNumerica("999.999,99"))).toBe("1.234,50");
    expect(fncFormatarNumero(0, fncLerMascaraNumerica("999,99"))).toBe("0,00");
    expect(fncFormatarNumero(1.45, fncLerMascaraNumerica("99,99"))).toBe("1,45");
    expect(fncFormatarNumero(7, fncLerMascaraNumerica("999"))).toBe("7");
  });

  it("lê o número do texto exibido", () => {
    expect(fncNumeroDoTexto("1.234,50")).toBe(1234.5);
    expect(fncNumeroDoTexto("0,5")).toBe(0.5);
    expect(fncNumeroDoTexto("")).toBe(0);
  });
});

describe("TextNumericoField", () => {
  it("digita a parte inteira, vírgula passa à fração e, ao sair, completa e avisa", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextNumericoField label="Valor" mascara="999.999,99" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("Valor") as HTMLInputElement;

    await wUsuario.type(wCampo, "1234,5");
    expect(wCampo.value).toBe("1234,5");
    expect(wOnChange).not.toHaveBeenCalled(); // só dispara ao sair

    await wUsuario.tab();
    expect(wCampo.value).toBe("1.234,50");
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: 1234.5, vazio: false, valido: true, obrigatorioPendente: false });
  });

  it("o ponto também passa para a parte fracionária (1.45 vira 1,45)", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextNumericoField label="ISS" mascara="99,99" percentual onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("ISS") as HTMLInputElement;

    await wUsuario.type(wCampo, "1.45");
    await wUsuario.tab();
    expect(wCampo.value).toBe("1,45");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valor: 1.45 }));
  });

  it("percentual mostra o % no fim do campo e o texto fica alinhado à direita", () => {
    render(<TextNumericoField label="Alíquota" mascara="99,99" percentual valorInicial={2.5} onChange={vi.fn()} />);
    const wCampo = screen.getByLabelText("Alíquota") as HTMLInputElement;
    expect(wCampo.value).toBe("2,50");
    expect(screen.getByText("%")).toBeTruthy();
    expect(wCampo.className).toContain("cmp-entrada-direita");
  });

  it("sem percentual não mostra o %", () => {
    render(<TextNumericoField label="Valor" mascara="999,99" onChange={vi.fn()} />);
    expect(screen.queryByText("%")).toBeNull();
  });

  it("vazio se distingue do zero: null é vazio; 0 digitado é zero", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextNumericoField label="Retido" mascara="999,99" valorInicial={null} obrigatorio onChange={wOnChange} />);
    const wCampo = screen.getByLabelText(/Retido/) as HTMLInputElement;
    expect(wCampo.value).toBe("");

    await wUsuario.click(wCampo);
    await wUsuario.tab();
    expect(wOnChange).not.toHaveBeenCalled(); // não mexeu: nada a avisar

    await wUsuario.type(wCampo, "0");
    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: 0, vazio: false, valido: true, obrigatorioPendente: false });
    expect(wCampo.value).toBe("0,00");

    await wUsuario.clear(wCampo);
    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: 0, vazio: true, valido: true, obrigatorioPendente: true });
  });

  it("acompanha o valorInicial quando o projeto o troca por fora", () => {
    function Tela() {
      const [wValor, prcDefinirValor] = useState<number | null>(1);
      return (
        <>
          <button type="button" onClick={() => prcDefinirValor(250.5)}>
            trocar
          </button>
          <TextNumericoField label="Total" mascara="999.999,99" valorInicial={wValor} onChange={vi.fn()} />
        </>
      );
    }
    render(<Tela />);
    const wCampo = screen.getByLabelText("Total") as HTMLInputElement;
    expect(wCampo.value).toBe("1,00");
    screen.getByText("trocar").click();
    return Promise.resolve().then(() => {
      expect((screen.getByLabelText("Total") as HTMLInputElement).value).toBe("250,50");
    });
  });

  it("Enter passa para o próximo campo, como nos demais campos da biblioteca", async () => {
    const wUsuario = userEvent.setup();
    render(
      <>
        <TextNumericoField label="A" mascara="999" onChange={vi.fn()} />
        <TextNumericoField label="B" mascara="999" onChange={vi.fn()} />
      </>,
    );
    await wUsuario.type(screen.getByLabelText("A"), "12{Enter}");
    expect(document.activeElement).toBe(screen.getByLabelText("B"));
  });

  it("ao receber o foco seleciona o valor todo, para o que se digita substituir", async () => {
    render(<TextNumericoField label="Valor" mascara="999.999,99" valorInicial={1234.5} onChange={vi.fn()} />);
    const wCampo = screen.getByLabelText("Valor") as HTMLInputElement;
    act(() => {
      wCampo.focus();
    });
    await waitFor(() => {
      expect(wCampo.selectionStart).toBe(0);
      expect(wCampo.selectionEnd).toBe(wCampo.value.length);
    });
  });

  it("somente leitura e desabilitado não aceitam digitação", () => {
    render(<TextNumericoField label="Lido" mascara="999" valorInicial={5} enabled="READONLY" onChange={vi.fn()} />);
    expect((screen.getByLabelText("Lido") as HTMLInputElement).readOnly).toBe(true);
  });
});
