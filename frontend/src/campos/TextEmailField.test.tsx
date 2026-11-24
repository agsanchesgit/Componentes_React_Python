import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TextEmailField } from "./TextEmailField";
import { fncEmailValido, fncMascararEmail } from "./emailTexto";

afterEach(() => {
  cleanup();
});

describe("fncMascararEmail", () => {
  it("minúsculas, sem espaços e sem caracteres proibidos", () => {
    expect(fncMascararEmail("Lucas.Cortes@Exemplo.COM")).toBe("lucas.cortes@exemplo.com");
    expect(fncMascararEmail(" lu cas@x.com ")).toBe("lucas@x.com");
    expect(fncMascararEmail("açaí(1)@x.com")).toBe("aa1@x.com");
  });

  it("só um @: os seguintes são descartados", () => {
    expect(fncMascararEmail("a@b@c.com")).toBe("a@bc.com");
  });

  it("limita o tamanho total a 254", () => {
    expect(fncMascararEmail("a".repeat(300)).length).toBe(254);
  });
});

describe("fncEmailValido", () => {
  it("aceita formatos comuns", () => {
    for (const wEmail of ["a@b.com", "nome.sobrenome@empresa.com.br", "x+tag@dominio.io", "a_b-c@d-e.org"]) {
      expect(fncEmailValido(wEmail)).toBe(true);
    }
  });

  it("recusa formatos errados", () => {
    for (const wEmail of ["", "semarroba", "@x.com", "a@", "a@b", "a@b.", "a@.com", "a..b@x.com", ".a@x.com", "a.@x.com", "a@-b.com"]) {
      expect(fncEmailValido(wEmail)).toBe(false);
    }
  });

  it("recusa parte local com mais de 64 caracteres", () => {
    expect(fncEmailValido(`${"a".repeat(65)}@x.com`)).toBe(false);
    expect(fncEmailValido(`${"a".repeat(64)}@x.com`)).toBe(true);
  });
});

describe("TextEmailField", () => {
  it("digitação em maiúsculas vira minúsculas e o valor sai ao sair do campo", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextEmailField label="E-mail" value="" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("E-mail") as HTMLInputElement;

    await wUsuario.type(wCampo, "Camila@Exemplo.COM");
    expect(wCampo.value).toBe("camila@exemplo.com");
    expect(wOnChange).not.toHaveBeenCalled();

    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith({
      valor: "camila@exemplo.com",
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
  });

  it("formato inválido bloqueia a saída, mostra a mensagem e devolve o foco", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextEmailField label="E-mail" value="" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("E-mail");

    await wUsuario.type(wCampo, "semdominio@");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toBe("E-mail inválido");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valido: false, vazio: true, valor: "" }));
    await waitFor(() => expect(document.activeElement).toBe(wCampo));
  });

  it("aceitaInvalido deixa sair com formato errado", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextEmailField label="E-mail" value="" aceitaInvalido onChange={wOnChange} />);
    await wUsuario.type(screen.getByLabelText("E-mail"), "legado");
    await wUsuario.tab();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valor: "legado", valido: true }));
  });

  it("vazio nunca bloqueia; obrigatório só marca pendente", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<TextEmailField label="E-mail" value="a@b.com" obrigatorio onChange={wOnChange} />);
    const wCampo = screen.getByLabelText(/E-mail/);
    await wUsuario.clear(wCampo);
    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: "", vazio: true, valido: true, obrigatorioPendente: true });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mostra em minúsculas um valor que veio em maiúsculas de fora", () => {
    render(<TextEmailField label="E-mail" value="LUCAS@EXEMPLO.COM" onChange={vi.fn()} />);
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("lucas@exemplo.com");
  });
});
