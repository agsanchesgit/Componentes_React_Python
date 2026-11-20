import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComponentesProvider, useComponentesApi } from "./provider";
import type { ApiHttp } from "./tipos";

function Sonda() {
  const wApi = useComponentesApi();
  return <span>{typeof wApi.post}</span>;
}

describe("ComponentesProvider", () => {
  it("entrega a api aos componentes filhos", () => {
    const wApi: ApiHttp = { post: vi.fn(), get: vi.fn() };
    render(
      <ComponentesProvider api={wApi}>
        <Sonda />
      </ComponentesProvider>,
    );
    expect(screen.getByText("function")).toBeTruthy();
  });

  it("lança erro claro sem o provider", () => {
    const wSilencio = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Sonda />)).toThrow("ComponentesProvider ausente: envolva a tela com o provider.");
    wSilencio.mockRestore();
  });
});
