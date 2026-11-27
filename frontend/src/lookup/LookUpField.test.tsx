import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

import { MIN_DATE } from "../formata/formata";
import { ComponentesProvider } from "../provider";
import { criarApiFalsa, DEFINICAO, PESSOAS, type ApiFalsa } from "../testes/apiFalsa";
import { LookUpField } from "./LookUpField";
import type { LookUpFieldProps } from "./lookup.types";

afterEach(() => {
  cleanup();
});

type PropsParciais = Partial<LookUpFieldProps>;

function fncPropsBase(sobrescrever: PropsParciais = {}): LookUpFieldProps {
  return {
    definicao: DEFINICAO,
    value: 0,
    onChange: () => {},
    tituloPesquisa: "Pesquisar pessoa",
    tipoRefreshGrid: "AUTOMATICA",
    obrigatorio: false,
    mensagemNaoExistencia: "Pessoa não existe",
    label: "Pessoa",
    ...sobrescrever,
  };
}

function fncRenderizar(api: ApiFalsa, sobrescrever: PropsParciais = {}, caminhoLookup?: string) {
  const fncElemento = (props: LookUpFieldProps): ReactElement => (
    <ComponentesProvider api={api} caminhoLookup={caminhoLookup}>
      <LookUpField {...props} />
    </ComponentesProvider>
  );
  const wResultado = render(fncElemento(fncPropsBase(sobrescrever)));
  return {
    ...wResultado,
    rerenderCom: (novas: PropsParciais) => wResultado.rerender(fncElemento(fncPropsBase({ ...sobrescrever, ...novas }))),
  };
}

const fncCodigo = () => screen.getByRole("textbox", { name: "Pessoa" }) as HTMLInputElement;
const fncDescricao = () => screen.getByLabelText("Pessoa (descrição)") as HTMLInputElement;
const fncModal = () => screen.getByRole("dialog", { name: "Pesquisar pessoa" });

async function prcAguardarFoco(elemento: HTMLElement): Promise<void> {
  await waitFor(() => expect(document.activeElement).toBe(elemento));
}

function fncChamadas(api: ApiFalsa, sufixo: string): unknown[][] {
  return api.post.mock.calls.filter((c) => String(c[0]).endsWith(sufixo));
}

describe("LookUpField: código", () => {
  it("valor inicial: consulta a descrição sem emitir onChange e sem bloquear", async () => {
    const wApi = criarApiFalsa();
    const wOnChange = vi.fn();
    fncRenderizar(wApi, { value: 2, onChange: wOnChange });

    expect(fncCodigo().value).toBe("2");
    await waitFor(() => expect(fncDescricao().value).toBe("BRUNO LIMA"));
    expect(wOnChange).not.toHaveBeenCalled();
    expect(wApi.post).toHaveBeenCalledWith("Lookup/codigo", { definicao: DEFINICAO, valor: "2" }, { skipGlobalErrorToast: true });
  });

  it("digitar o código e sair valida e emite o resultado", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { onChange: wOnChange });

    await wUsuario.type(fncCodigo(), "1");
    expect(wOnChange).not.toHaveBeenCalled(); // só valida ao sair
    await wUsuario.tab();

    await waitFor(() => expect(wOnChange).toHaveBeenCalledTimes(1));
    expect(wOnChange).toHaveBeenCalledWith({
      codigo: 1,
      descricao: "ANA SOUZA",
      jsonLinhaEscolhida: PESSOAS[0],
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
    expect(fncDescricao().value).toBe("ANA SOUZA");
  });

  it("NUMERO só aceita dígitos; TEXTO vira maiúsculo", async () => {
    const wUsuario = userEvent.setup();
    const { unmount } = fncRenderizar(criarApiFalsa());
    await wUsuario.type(fncCodigo(), "1a2-3");
    expect(fncCodigo().value).toBe("123");
    unmount();

    fncRenderizar(criarApiFalsa(), { definicao: { ...DEFINICAO, tipoColunaRetorno: "TEXTO" }, value: "" });
    await wUsuario.type(fncCodigo(), "ab1");
    expect(fncCodigo().value).toBe("AB1");
  });

  it("código inexistente mostra a mensagem, emite inválido e bloqueia a saída", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { onChange: wOnChange });

    await wUsuario.type(fncCodigo(), "999");
    await wUsuario.tab();

    await waitFor(() => expect(fncDescricao().value).toBe("Pessoa não existe"));
    expect(wOnChange).toHaveBeenLastCalledWith({
      codigo: 0,
      descricao: "",
      jsonLinhaEscolhida: null,
      vazio: true,
      valido: false,
      obrigatorioPendente: false,
    });
    await prcAguardarFoco(fncCodigo());
    expect(fncCodigo().getAttribute("aria-invalid")).toBe("true");
  });

  it("mais de um registro mostra a mensagem própria", async () => {
    const wUsuario = userEvent.setup();
    // "A" é a situação de duas pessoas: o backend falso devolve MAIS_DE_UM
    fncRenderizar(criarApiFalsa(), { definicao: { ...DEFINICAO, tipoColunaRetorno: "TEXTO" }, value: "" });
    await wUsuario.type(fncCodigo(), "a");
    await wUsuario.tab();
    await waitFor(() => expect(fncDescricao().value).toBe("RETORNOU MAIS DE UM REGISTRO"));
  });

  it("vazio nunca bloqueia: esvaziar emite vazio válido e marca obrigatorioPendente", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { obrigatorio: true, label: "Pessoa", onChange: wOnChange, value: 1 });

    const wCampo = screen.getByRole("textbox", { name: "Pessoa *" }) as HTMLInputElement;
    await wUsuario.clear(wCampo);
    expect(wOnChange).toHaveBeenLastCalledWith({
      codigo: 0,
      descricao: "",
      jsonLinhaEscolhida: null,
      vazio: true,
      valido: true,
      obrigatorioPendente: true,
    });
    await wUsuario.tab(); // sai livre
    expect(document.activeElement).not.toBe(wCampo);
  });

  it("erro de API vai para a mensagem e para onErro, sem bloquear a saída", async () => {
    const wUsuario = userEvent.setup();
    const wOnErro = vi.fn();
    const wOnChange = vi.fn();
    render(
      <>
        <ComponentesProvider api={criarApiFalsa({ erroEm: "codigo" })}>
          <LookUpField {...fncPropsBase({ onErro: wOnErro, onChange: wOnChange })} />
        </ComponentesProvider>
        <input aria-label="depois" />
      </>,
    );
    await wUsuario.type(fncCodigo(), "1");
    await wUsuario.tab();

    await waitFor(() => expect(fncDescricao().value).toBe("ORA-00942: tabela ou view inexistente"));
    expect(wOnErro).toHaveBeenCalledTimes(1);
    expect(wOnChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText("depois")); // não prendeu o usuário
  });

  it("onLoadingChange avisa o início e o fim da consulta", async () => {
    const wUsuario = userEvent.setup();
    const wCarregando = vi.fn();
    fncRenderizar(criarApiFalsa({ atraso: 20 }), { onLoadingChange: wCarregando });
    await wUsuario.type(fncCodigo(), "1");
    await wUsuario.tab();
    await waitFor(() => expect(wCarregando).toHaveBeenLastCalledWith(false));
    expect(wCarregando).toHaveBeenCalledWith(true);
  });

  it("mudança externa do value refaz a descrição sem emitir onChange", async () => {
    const wOnChange = vi.fn();
    const { rerenderCom } = fncRenderizar(criarApiFalsa(), { value: 1, onChange: wOnChange });
    await waitFor(() => expect(fncDescricao().value).toBe("ANA SOUZA"));

    rerenderCom({ value: 4 });
    await waitFor(() => expect(fncDescricao().value).toBe("DAVI ROCHA"));
    expect(fncCodigo().value).toBe("4");

    rerenderCom({ value: 0 }); // reset do formulário
    expect(fncCodigo().value).toBe("");
    expect(fncDescricao().value).toBe("");
    expect(wOnChange).not.toHaveBeenCalled();
  });

  it("mascaraCodigo só aparece fora do foco e com o código válido", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa(), { mascaraCodigo: "ZZZ.ZZZ" });
    await wUsuario.type(fncCodigo(), "1");
    expect(fncCodigo().value).toBe("1");
    await wUsuario.tab();
    await waitFor(() => expect(fncCodigo().value).toBe("000.001"));
    await wUsuario.click(fncCodigo());
    expect(fncCodigo().value).toBe("1");
  });

  it("tipo DATA: máscara ao digitar e envio como DD/MM/AAAA", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { definicao: { ...DEFINICAO, tipoColunaRetorno: "DATA" }, value: MIN_DATE });
    await wUsuario.type(fncCodigo(), "10051980");
    expect(fncCodigo().value).toBe("10/05/1980");
    await wUsuario.tab();
    await waitFor(() => expect(fncChamadas(wApi, "/codigo").length).toBe(1));
    expect((fncChamadas(wApi, "/codigo")[0][1] as { valor: string }).valor).toBe("10/05/1980");
  });

  it("DISABLED e READONLY não abrem o modal por F4 nem pelo botão", async () => {
    const wUsuario = userEvent.setup();
    const { rerenderCom } = fncRenderizar(criarApiFalsa(), { enabled: "READONLY" });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect((screen.getByRole("button", { name: "Pesquisar" }) as HTMLButtonElement).disabled).toBe(true);

    rerenderCom({ enabled: "DISABLED" });
    expect(fncCodigo().disabled).toBe(true);
  });

  it("debugMode valida a configuração uma vez e loga; criarCacheNoClient evita repetir a consulta", async () => {
    const wUsuario = userEvent.setup();
    const wDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { debugMode: true, criarCacheNoClient: true });

    for (const wVez of [1, 2]) {
      await wUsuario.clear(fncCodigo());
      await wUsuario.type(fncCodigo(), "1");
      await wUsuario.tab();
      await waitFor(() => expect(fncDescricao().value).toBe("ANA SOUZA"), { timeout: 2000 });
      expect(wVez).toBeGreaterThan(0);
    }
    expect(fncChamadas(wApi, "/codigo").length).toBe(1); // a 2ª veio do cache
    expect(fncChamadas(wApi, "/validacao").length).toBe(1);
    expect(wDebug).toHaveBeenCalled();
    wDebug.mockRestore();
  });

  it("usa o caminho configurado no provider", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, {}, "v2/consulta");
    await wUsuario.type(fncCodigo(), "1");
    await wUsuario.tab();
    await waitFor(() => expect(wApi.post).toHaveBeenCalled());
    expect(wApi.post.mock.calls[0][0]).toBe("v2/consulta/codigo");
  });

  it("sem o provider, lança o erro claro", () => {
    const wSilencio = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<LookUpField {...fncPropsBase()} />)).toThrow("ComponentesProvider ausente");
    wSilencio.mockRestore();
  });

  it("Enter e seta para baixo vão ao próximo campo", async () => {
    const wUsuario = userEvent.setup();
    render(
      <ComponentesProvider api={criarApiFalsa()}>
        <LookUpField {...fncPropsBase()} />
        <input aria-label="depois" />
      </ComponentesProvider>,
    );
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByLabelText("depois"));
  });
});

describe("LookUpField: modal de pesquisa", () => {
  it("F4 e o botão ... abrem o modal; o foco vai ao campo de texto", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa());
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    expect(fncModal()).toBeTruthy();
    await prcAguardarFoco(within(fncModal()).getByLabelText("Pesquisar"));

    await wUsuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    await wUsuario.click(screen.getByRole("button", { name: "Pesquisar" }));
    expect(fncModal()).toBeTruthy();
  });

  it("AUTOMATICA: pesquisa depois do debounce, em maiúsculas, e mostra o grid", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi);
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");

    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    expect(fncChamadas(wApi, "/pesquisa").length).toBe(0); // ainda no debounce

    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(1), { timeout: 2000 });
    expect(fncChamadas(wApi, "/pesquisa")[0][1]).toEqual({ definicao: DEFINICAO, texto: "ANA" });
    expect(within(fncModal()).getByText("ANA SOUZA")).toBeTruthy();
    expect(within(fncModal()).getByText("ANA MARIA LIMA")).toBeTruthy();
  });

  it("abaixo do mínimo de caracteres não pesquisa (piso 3, mesmo se pedirem menos)", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { qtdMinimaCaracterBusca: 1 });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wTexto = within(fncModal()).getByLabelText("Pesquisar");
    expect((wTexto as HTMLInputElement).placeholder).toBe("Mínimo de 3 caracteres");
    await wUsuario.type(wTexto, "an");
    await new Promise((r) => setTimeout(r, 450));
    expect(fncChamadas(wApi, "/pesquisa").length).toBe(0);
  });

  it("qtdMinimaCaracterBusca maior que 3 vale", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { qtdMinimaCaracterBusca: 5 });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await new Promise((r) => setTimeout(r, 450));
    expect(fncChamadas(wApi, "/pesquisa").length).toBe(0); // 3 caracteres: abaixo do mínimo de 5
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), " ma");
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(1), { timeout: 2000 });
  });

  it("pesquisarAoAbrir: o modal já abre listando e o texto filtra sem mínimo de caracteres", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    const wDefinicao = { ...DEFINICAO, pesquisarAoAbrir: true };
    fncRenderizar(wApi, { definicao: wDefinicao });
    expect(fncChamadas(wApi, "/pesquisa").length).toBe(0); // só ao abrir o modal
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");

    await waitFor(() => within(fncModal()).getByText("BRUNO LIMA"), { timeout: 2000 });
    expect(fncChamadas(wApi, "/pesquisa")[0][1]).toEqual({ definicao: wDefinicao });

    const wTexto = within(fncModal()).getByLabelText("Pesquisar") as HTMLInputElement;
    expect(wTexto.placeholder).toBe("Digite para filtrar");
    await wUsuario.type(wTexto, "an");
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").at(-1)?.[1]).toEqual({ definicao: wDefinicao, texto: "AN" }), {
      timeout: 2000,
    });
  });

  it("duplo clique na linha escolhe: fecha o modal, emite o resultado e devolve o foco", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { onChange: wOnChange });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "bruno");
    await waitFor(() => within(fncModal()).getByText("BRUNO LIMA"), { timeout: 2000 });

    await wUsuario.dblClick(within(fncModal()).getByText("BRUNO LIMA"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(wOnChange).toHaveBeenCalledWith({
      codigo: 2,
      descricao: "BRUNO LIMA",
      jsonLinhaEscolhida: PESSOAS[1],
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
    expect(fncCodigo().value).toBe("2");
    expect(fncDescricao().value).toBe("BRUNO LIMA");
    await prcAguardarFoco(fncCodigo());
  });

  it("COM_BOTAO_PESQUISA: digitar não pesquisa; o botão e o Enter pesquisam; ↓ + Enter escolhe", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    const wOnChange = vi.fn();
    fncRenderizar(wApi, { tipoRefreshGrid: "COM_BOTAO_PESQUISA", onChange: wOnChange });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wTexto = within(fncModal()).getByLabelText("Pesquisar");

    await wUsuario.type(wTexto, "ana");
    await new Promise((r) => setTimeout(r, 450));
    expect(fncChamadas(wApi, "/pesquisa").length).toBe(0);

    await wUsuario.click(within(fncModal()).getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(1));

    await wUsuario.click(wTexto);
    await wUsuario.keyboard("{Enter}"); // ainda não navegou no grid: pesquisa de novo
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(2));

    await wUsuario.keyboard("{ArrowDown}{Enter}"); // navegou: Enter escolhe a 2ª linha
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ codigo: 3, descricao: "ANA MARIA LIMA" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AUTOMATICA: ↓ e Enter escolhem a linha selecionada", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { onChange: wOnChange });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await waitFor(() => within(fncModal()).getByText("ANA MARIA LIMA"), { timeout: 2000 });

    await wUsuario.keyboard("{ArrowDown}{Enter}");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ codigo: 3 }));
  });

  it("Selecionar fica desabilitado sem linhas e escolhe a linha atual com linhas", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { onChange: wOnChange });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wBotao = within(fncModal()).getByRole("button", { name: "Selecionar" }) as HTMLButtonElement;
    expect(wBotao.disabled).toBe(true);

    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "davi");
    await waitFor(() => expect(wBotao.disabled).toBe(false), { timeout: 2000 });
    await wUsuario.click(wBotao);
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ codigo: 4 }));
  });

  it("Cancelar fecha, não altera o que estava digitado e devolve o foco ao código", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar(criarApiFalsa(), { onChange: wOnChange, value: 1 });
    await waitFor(() => expect(fncDescricao().value).toBe("ANA SOUZA"));
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.click(within(fncModal()).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(wOnChange).not.toHaveBeenCalled();
    expect(fncCodigo().value).toBe("1");
    await prcAguardarFoco(fncCodigo());
  });

  it("cada abertura do modal começa em branco", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa());
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await waitFor(() => within(fncModal()).getByText("ANA SOUZA"), { timeout: 2000 });
    await wUsuario.keyboard("{Escape}");

    await wUsuario.click(screen.getByRole("button", { name: "Pesquisar" }));
    expect((within(fncModal()).getByLabelText("Pesquisar") as HTMLInputElement).value).toBe("");
    expect(within(fncModal()).queryByText("ANA SOUZA")).toBeNull();
  });

  it("sem resultados, mostra 'Nenhum registro encontrado.'; com limite, avisa", async () => {
    const wUsuario = userEvent.setup();
    const { unmount } = fncRenderizar(criarApiFalsa());
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "zzz");
    await waitFor(() => within(fncModal()).getByText("Nenhum registro encontrado."), { timeout: 2000 });
    unmount();

    fncRenderizar(criarApiFalsa({ limiteAtingido: true }));
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await waitFor(() => within(fncModal()).getByText(/Mostrando as primeiras 2 linhas/), { timeout: 2000 });
  });

  it("erro na pesquisa aparece no modal e chama onErro", async () => {
    const wUsuario = userEvent.setup();
    const wOnErro = vi.fn();
    fncRenderizar(criarApiFalsa({ erroEm: "pesquisa", mensagemErro: "Configuração do Lookup inválida" }), { onErro: wOnErro });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await waitFor(() => within(fncModal()).getByText("Configuração do Lookup inválida"), { timeout: 2000 });
    expect(wOnErro).toHaveBeenCalledTimes(1);
  });

  it("mapaValores, mascaraGrid (string e função) e highlight", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa(), {
      mapaValores: { tp_situacao: { A: "Ativo", I: "Inativo" } },
      mascaraGrid: { cd_pessoa: (linha) => (linha.cd_pessoa === 1 ? "ZZZ" : "9999") },
      highlightDoTermoBuscado: true,
    });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await waitFor(() => expect(within(fncModal()).getAllByText("Ativo").length).toBe(2), { timeout: 2000 }); // sigla traduzida nas 2 linhas
    expect(within(fncModal()).getByText("001")).toBeTruthy(); // máscara ZZZ
    const wMarcas = fncModal().querySelectorAll("mark");
    expect(wMarcas.length).toBeGreaterThanOrEqual(2);
    expect(wMarcas[0].textContent).toBe("ANA");
  });

  it("larguraGridPx e corFundoModal vão para a caixa do modal", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa(), { larguraGridPx: 640, corFundoModal: "rgb(10, 20, 30)" });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wEstilo = (fncModal() as HTMLElement).style;
    expect(wEstilo.width).toBe("640px");
    expect(wEstilo.backgroundColor).toBe("rgb(10, 20, 30)");
  });

  it("clique no fundo escuro fecha o modal", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa());
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.pointer({ keys: "[MouseLeft]", target: fncModal().parentElement as HTMLElement });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o Tab fica preso dentro do modal", async () => {
    const wUsuario = userEvent.setup();
    render(
      <ComponentesProvider api={criarApiFalsa()}>
        <LookUpField {...fncPropsBase()} />
        <input aria-label="fora" />
      </ComponentesProvider>,
    );
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wModal = fncModal();
    for (let wVez = 0; wVez < 6; wVez++) {
      await wUsuario.tab();
      expect(wModal.contains(document.activeElement)).toBe(true);
    }
    for (let wVez = 0; wVez < 6; wVez++) {
      await wUsuario.tab({ shift: true });
      expect(wModal.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("LookUpField: filtros extras do modal", () => {
  const wDefinicaoComFiltros = { ...DEFINICAO, colunaCpf: "nr_cpf", colunaCnpj: "nr_cnpj", colunaDtNascto: "dt_nascimento" };

  it("só existem os filtros que a definição declara; o foco vai ao primeiro", async () => {
    const wUsuario = userEvent.setup();
    const { unmount } = fncRenderizar(criarApiFalsa(), { definicao: wDefinicaoComFiltros });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wModal = fncModal();
    expect(within(wModal).getByLabelText("Data de nascimento")).toBeTruthy();
    expect(within(wModal).getByLabelText("CPF")).toBeTruthy();
    expect(within(wModal).getByLabelText("CNPJ")).toBeTruthy();
    await prcAguardarFoco(within(wModal).getByLabelText("Data de nascimento"));
    unmount();

    fncRenderizar(criarApiFalsa(), { definicao: { ...DEFINICAO, colunaCnpj: "nr_cnpj" } });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    expect(within(fncModal()).queryByLabelText("CPF")).toBeNull();
    await prcAguardarFoco(within(fncModal()).getByLabelText("CNPJ"));
  });

  it("CPF válido pesquisa na hora, sem texto, com o CPF completo de 11 dígitos", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { definicao: wDefinicaoComFiltros, tipoRefreshGrid: "COM_BOTAO_PESQUISA" });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");

    await wUsuario.type(within(fncModal()).getByLabelText("CPF"), "191");
    await wUsuario.tab();

    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(1));
    expect(fncChamadas(wApi, "/pesquisa")[0][1]).toEqual({ definicao: wDefinicaoComFiltros, cpf: "00000000191" });
    await waitFor(() => within(fncModal()).getByText("ANA SOUZA"));
  });

  it("CPF com dígito inválido bloqueia a saída e não pesquisa", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { definicao: wDefinicaoComFiltros });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    const wCpf = within(fncModal()).getByLabelText("CPF");
    await wUsuario.type(wCpf, "52998224724");
    await wUsuario.tab();
    await new Promise((r) => setTimeout(r, 100));
    expect(within(fncModal()).getByRole("alert").textContent).toBe("CPF com dígito inválido");
    expect(fncChamadas(wApi, "/pesquisa").length).toBe(0);
  });

  it("CNPJ (inclusive alfanumérico) e data de nascimento pesquisam na hora", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { definicao: wDefinicaoComFiltros });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");

    await wUsuario.type(within(fncModal()).getByLabelText("CNPJ"), "11222333000181");
    await wUsuario.tab();
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(1));
    expect(fncChamadas(wApi, "/pesquisa")[0][1]).toEqual({ definicao: wDefinicaoComFiltros, cnpj: "11222333000181" });

    await wUsuario.type(within(fncModal()).getByLabelText("Data de nascimento"), "10051980");
    await wUsuario.tab();
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(2));
    // o filtro de CNPJ continua valendo: critérios combinam
    expect(fncChamadas(wApi, "/pesquisa")[1][1]).toEqual({
      definicao: wDefinicaoComFiltros,
      dtNascto: "1980-05-10",
      cnpj: "11222333000181",
    });
  });

  it("filtro extra combina com o texto (AND) e dispensa o mínimo de caracteres do texto", async () => {
    const wUsuario = userEvent.setup();
    const wApi = criarApiFalsa();
    fncRenderizar(wApi, { definicao: wDefinicaoComFiltros, tipoRefreshGrid: "COM_BOTAO_PESQUISA" });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "an"); // abaixo do mínimo: não entra
    await wUsuario.type(within(fncModal()).getByLabelText("CPF"), "191");
    await wUsuario.tab();
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(1));
    expect(fncChamadas(wApi, "/pesquisa")[0][1]).toEqual({ definicao: wDefinicaoComFiltros, cpf: "00000000191" });

    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "a");
    await wUsuario.click(within(fncModal()).getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(fncChamadas(wApi, "/pesquisa").length).toBe(2));
    expect(fncChamadas(wApi, "/pesquisa")[1][1]).toEqual({ definicao: wDefinicaoComFiltros, texto: "ANA", cpf: "00000000191" });
  });

  it("Esc dentro do calendário do filtro fecha só o calendário, não o modal", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar(criarApiFalsa(), { definicao: wDefinicaoComFiltros });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.click(within(fncModal()).getByLabelText("Escolher data"));
    expect(within(fncModal()).getAllByRole("dialog").length).toBe(1); // o painel do calendário
    await wUsuario.keyboard("{Escape}");
    expect(fncModal()).toBeTruthy(); // o modal continua aberto
    expect(within(fncModal()).queryAllByRole("dialog").length).toBe(0);
  });
});
