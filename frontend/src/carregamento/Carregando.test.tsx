import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import { Carregando } from "./Carregando";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Carregando", () => {
  it("é um status acessível com a mensagem padrão e 0s", () => {
    render(<Carregando />);
    const wStatus = screen.getByRole("status");
    expect(wStatus.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Processando, aguarde...")).toBeTruthy();
    expect(screen.getByText("0s")).toBeTruthy();
  });

  it("mensagem personalizada e contagem de segundos", () => {
    vi.useFakeTimers();
    render(<Carregando mensagem="Gerando relatório..." />);
    expect(screen.getByText("Gerando relatório...")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(screen.getByText("3s")).toBeTruthy();
  });

  it("mostrarTempo=false esconde o contador", () => {
    render(<Carregando mostrarTempo={false} />);
    expect(screen.queryByText("0s")).toBeNull();
  });

  it("a marca entra pela prop logo; sem ela não há nada do cliente", () => {
    const { container, rerender } = render(<Carregando />);
    expect(container.querySelector(".cmp-carregando-logo")).toBeNull();
    rerender(<Carregando logo={<img alt="Minha empresa" src="x.png" />} />);
    expect(screen.getByAltText("Minha empresa")).toBeTruthy();
  });

  it("para o temporizador ao desmontar", () => {
    vi.useFakeTimers();
    const wLimpar = vi.spyOn(window, "clearInterval");
    const { unmount } = render(<Carregando />);
    unmount();
    expect(wLimpar).toHaveBeenCalled();
    wLimpar.mockRestore();
  });
});
