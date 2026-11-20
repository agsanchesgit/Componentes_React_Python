import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GridField } from "./GridField";
import type { GridColuna, GridLinha } from "./grid.types";

afterEach(() => {
  cleanup();
});

const colunas: GridColuna[] = [
  { coluna: "NOME", tipo: "texto" },
  { coluna: "IDADE", tipo: "numero" },
  { coluna: "NASC", tipo: "data" },
];
const cabecalhos = ["Nome", "Idade", "Nascimento"];
const dados: GridLinha[] = [
  { NOME: "bia", IDADE: 10, NASC: "2000-05-01T00:00:00" },
  { NOME: "Ana", IDADE: 9, NASC: "0001-01-01T00:00:00" },
  { NOME: "Caio", IDADE: 30, NASC: "1990-01-01T00:00:00" },
  { NOME: "Davi", IDADE: 20, NASC: null },
];

function fncNomesNaTela(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).queryAllByRole("cell")[0]?.textContent ?? "");
}

describe("GridField", () => {
  it("mostra cabeçalhos, formata data pela máscara padrão e vazio de data fica em branco", () => {
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} />);
    expect(screen.getByText("Nascimento")).toBeTruthy();
    expect(screen.getByText("01/05/2000")).toBeTruthy();
    expect(screen.getByText("4 linha(s)")).toBeTruthy();
    expect(fncNomesNaTela()).toEqual(["bia", "Ana", "Caio", "Davi"]);
  });

  it("props inválidas mostram erro de programação", () => {
    render(<GridField colunas={colunas} cabecalhos={["a"]} dados={dados} linhasPorPagina={10} />);
    expect(screen.getByRole("alert").textContent).toMatch(/tamanhos diferentes/);
  });

  it("clique ordena e alterna; duplo clique reinicia a ordem", async () => {
    const wUsuario = userEvent.setup();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} />);

    await wUsuario.click(screen.getByText("Nome"));
    expect(fncNomesNaTela()).toEqual(["Ana", "bia", "Caio", "Davi"]);
    await wUsuario.click(screen.getByText("Idade"));
    expect(screen.getByRole("columnheader", { name: /Idade/ }).getAttribute("aria-sort")).toBe("ascending");

    await wUsuario.click(screen.getByText("Nome")); // alterna para descendente, mantém a posição
    expect(screen.getByRole("columnheader", { name: /Nome/ }).getAttribute("aria-sort")).toBe("descending");
    expect(fncNomesNaTela()).toEqual(["Davi", "Caio", "bia", "Ana"]);

    await wUsuario.dblClick(screen.getByText("Idade")); // reinicia: só Idade, ascendente
    expect(screen.getByRole("columnheader", { name: /Nome/ }).getAttribute("aria-sort")).toBe("none");
    expect(fncNomesNaTela()).toEqual(["Ana", "bia", "Davi", "Caio"]);
  });

  it("ordenavel=false não ordena", async () => {
    const wUsuario = userEvent.setup();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} ordenavel={false} />);
    await wUsuario.click(screen.getByText("Nome"));
    expect(fncNomesNaTela()).toEqual(["bia", "Ana", "Caio", "Davi"]);
  });

  it("pagina, mostra 'Página X de Y' e os botões respeitam os limites", async () => {
    const wUsuario = userEvent.setup();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={3} />);
    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(true);

    await wUsuario.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByText("Página 2 de 2")).toBeTruthy();
    expect(fncNomesNaTela()).toEqual(["Davi"]);
    expect((screen.getByRole("button", { name: "Próxima" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("maxLinhas corta e avisa", () => {
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} maxLinhas={2} />);
    expect(screen.getByText("Mostrando as primeiras 2 de 4 linhas. Refine a consulta.")).toBeTruthy();
    expect(fncNomesNaTela()).toEqual(["bia", "Ana"]);
  });

  it("sem dados mostra 'Nenhum registro' e notifica linha nula", () => {
    const wPosicionada = vi.fn();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={[]} linhasPorPagina={10} onLinhaPosicionada={wPosicionada} />);
    expect(screen.getByText("Nenhum registro")).toBeTruthy();
    expect(wPosicionada).toHaveBeenCalledWith(null);
  });

  it("onLinhaPosicionada: 1ª linha ao carregar, depois clique e setas; não repete a mesma linha", async () => {
    const wUsuario = userEvent.setup();
    const wPosicionada = vi.fn();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} onLinhaPosicionada={wPosicionada} />);
    expect(wPosicionada).toHaveBeenCalledTimes(1);
    expect(wPosicionada).toHaveBeenLastCalledWith(dados[0]);

    await wUsuario.click(screen.getByText("Caio"));
    expect(wPosicionada).toHaveBeenLastCalledWith(dados[2]);
    await wUsuario.click(screen.getByText("Caio"));
    expect(wPosicionada).toHaveBeenCalledTimes(2); // mesma linha: não repete

    const wRolagem = screen.getByRole("table").parentElement as HTMLElement;
    wRolagem.focus();
    await wUsuario.keyboard("{ArrowDown}");
    expect(wPosicionada).toHaveBeenLastCalledWith(dados[3]);
    await wUsuario.keyboard("{ArrowUp}{ArrowUp}");
    expect(wPosicionada).toHaveBeenLastCalledWith(dados[1]);
  });

  it("onLinhaAcionada: duplo clique, Enter e F4 entregam uma cópia da linha", async () => {
    const wUsuario = userEvent.setup();
    const wAcionada = vi.fn();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} onLinhaAcionada={wAcionada} />);

    await wUsuario.dblClick(screen.getByText("Ana"));
    expect(wAcionada).toHaveBeenLastCalledWith(dados[1]);
    expect(wAcionada.mock.calls[0][0]).not.toBe(dados[1]); // cópia

    const wRolagem = screen.getByRole("table").parentElement as HTMLElement;
    wRolagem.focus();
    await wUsuario.keyboard("{Enter}");
    expect(wAcionada).toHaveBeenCalledTimes(2);
    await wUsuario.keyboard("{F4}");
    expect(wAcionada).toHaveBeenCalledTimes(3);
  });

  it("onLinhaContexto: botão direito entrega a linha e posiciona nela", async () => {
    const wUsuario = userEvent.setup();
    const wContexto = vi.fn();
    const wPosicionada = vi.fn();
    render(
      <GridField
        colunas={colunas}
        cabecalhos={cabecalhos}
        dados={dados}
        linhasPorPagina={10}
        onLinhaContexto={wContexto}
        onLinhaPosicionada={wPosicionada}
      />,
    );
    await wUsuario.pointer({ keys: "[MouseRight]", target: screen.getByText("Caio") });
    expect(wContexto).toHaveBeenCalledWith(dados[2]);
    expect(wPosicionada).toHaveBeenLastCalledWith(dados[2]);
  });

  it("posicionarEm: ao trocar dados vai à página da linha encontrada", () => {
    const wPosicionada = vi.fn();
    const wMuitos = Array.from({ length: 25 }, (_, i) => ({ NOME: `n${i}`, IDADE: i, NASC: null }));
    const { rerender } = render(
      <GridField colunas={colunas} cabecalhos={cabecalhos} dados={[]} linhasPorPagina={10} onLinhaPosicionada={wPosicionada} />,
    );
    rerender(
      <GridField
        colunas={colunas}
        cabecalhos={cabecalhos}
        dados={wMuitos}
        linhasPorPagina={10}
        posicionarEm={(l) => l.IDADE === 23}
        onLinhaPosicionada={wPosicionada}
      />,
    );
    expect(screen.getByText("Página 3 de 3")).toBeTruthy();
    expect(wPosicionada).toHaveBeenLastCalledWith(wMuitos[23]);
  });

  it("trocar dados reinicia a ordem, a menos que manterOrdem", async () => {
    const wUsuario = userEvent.setup();
    const wNovos = [...dados].reverse();
    const { rerender } = render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} />);
    await wUsuario.click(screen.getByText("Nome"));
    rerender(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={wNovos} linhasPorPagina={10} />);
    expect(fncNomesNaTela()).toEqual(["Davi", "Caio", "Ana", "bia"]); // ordem de origem

    cleanup();
    const wOutra = render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} manterOrdem />);
    await wUsuario.click(screen.getByText("Nome"));
    wOutra.rerender(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={wNovos} linhasPorPagina={10} manterOrdem />);
    expect(fncNomesNaTela()).toEqual(["Ana", "bia", "Caio", "Davi"]);
  });

  it("detalhe: botão +/− abre e fecha; temDetalhe desabilita; detalheAberto abre todos", async () => {
    const wUsuario = userEvent.setup();
    const wProps = {
      colunas,
      cabecalhos,
      dados,
      linhasPorPagina: 10,
      detalhe: (l: GridLinha) => <span>detalhe de {String(l.NOME)}</span>,
      temDetalhe: (l: GridLinha) => l.NOME !== "Ana",
    };
    const { rerender } = render(<GridField {...wProps} />);
    const wBotoes = screen.getAllByRole("button", { name: "Abrir detalhe" }) as HTMLButtonElement[];
    expect(wBotoes[1].disabled).toBe(true); // Ana

    await wUsuario.click(wBotoes[0]);
    expect(screen.getByText("detalhe de bia")).toBeTruthy();
    await wUsuario.click(screen.getByRole("button", { name: "Fechar detalhe" }));
    expect(screen.queryByText("detalhe de bia")).toBeNull();

    rerender(<GridField {...wProps} detalheAberto />);
    expect(screen.getAllByText(/^detalhe de/).length).toBe(3); // todas, menos Ana
  });

  it("espaço no grid alterna o detalhe da linha atual", async () => {
    const wUsuario = userEvent.setup();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} detalhe={(l) => <span>d {String(l.NOME)}</span>} />);
    (screen.getByRole("table").parentElement as HTMLElement).focus();
    await wUsuario.keyboard(" ");
    expect(screen.getByText("d bia")).toBeTruthy();
  });

  it("ações: clicam sem acionar a linha e não entram no JSON", async () => {
    const wUsuario = userEvent.setup();
    const wAcao = vi.fn();
    const wAcionada = vi.fn();
    render(
      <GridField
        colunas={colunas}
        cabecalhos={cabecalhos}
        dados={dados}
        linhasPorPagina={10}
        onLinhaAcionada={wAcionada}
        acoes={[{ rotulo: "Editar", icone: <b>E</b>, aoClicar: wAcao }]}
      />,
    );
    expect(screen.getByText("Ações")).toBeTruthy();
    await wUsuario.dblClick(screen.getAllByRole("button", { name: "Editar" })[2]);
    expect(wAcao).toHaveBeenCalledWith(dados[2]);
    expect(wAcionada).not.toHaveBeenCalled();
  });

  it("aoClicar da coluna vira link e não aciona a linha; célula vazia não vira link", async () => {
    const wUsuario = userEvent.setup();
    const wLink = vi.fn();
    const wCols: GridColuna[] = [{ coluna: "NOME", tipo: "texto", aoClicar: wLink }];
    render(<GridField colunas={wCols} cabecalhos={["Nome"]} dados={[{ NOME: "Ana" }, { NOME: "" }]} linhasPorPagina={10} />);
    expect(within(screen.getByRole("table")).getAllByRole("button").length).toBe(1);
    await wUsuario.click(screen.getByRole("button", { name: "Ana" }));
    expect(wLink).toHaveBeenCalledWith({ NOME: "Ana" });
  });

  it("máscara por função da linha, tipo lógico e larguraMax", () => {
    const wCols: GridColuna[] = [
      { coluna: "DOC", tipo: "texto", mascara: (l) => (String(l.DOC).length > 11 ? "ZZ.ZZZ.ZZZ/ZZZZ-ZZ" : "ZZZ.ZZZ.ZZZ-ZZ") },
      { coluna: "ATIVO", tipo: "logico" },
      { coluna: "OBS", tipo: "texto", larguraMax: 5 },
    ];
    render(
      <GridField
        colunas={wCols}
        cabecalhos={["Doc", "Ativo", "Obs"]}
        dados={[{ DOC: "34567891200", ATIVO: "S", OBS: "um texto bem comprido" }]}
        linhasPorPagina={10}
      />,
    );
    expect(screen.getByText("345.678.912-00")).toBeTruthy();
    expect(screen.getByText("Sim")).toBeTruthy();
    expect(screen.getByTitle("um texto bem comprido")).toBeTruthy();
  });

  it("corLinha pinta o fundo da linha", () => {
    render(
      <GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={10} corLinha={(l) => (l.NOME === "Ana" ? "#fde2e2" : undefined)} />,
    );
    const wLinha = screen.getByText("Ana").closest("tr") as HTMLElement;
    expect(wLinha.style.backgroundColor).toBe("rgb(253, 226, 226)");
  });

  it("PageDown e PageUp trocam de página", async () => {
    const wUsuario = userEvent.setup();
    render(<GridField colunas={colunas} cabecalhos={cabecalhos} dados={dados} linhasPorPagina={2} />);
    (screen.getByRole("table").parentElement as HTMLElement).focus();
    await wUsuario.keyboard("{PageDown}");
    expect(screen.getByText("Página 2 de 2")).toBeTruthy();
    await wUsuario.keyboard("{PageUp}");
    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
  });
});
