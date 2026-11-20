/**
 * Integração front x back: renderiza o LookUpField contra a API de exemplo REAL (FastAPI + SQLite).
 * Só roda quando `URL_BACK_EXEMPLO` está definida (senão fica ignorado):
 *
 *   cd backend && .venv\Scripts\python -m uvicorn exemplos.api_exemplo:app --port 8123
 *   cd frontend && $env:URL_BACK_EXEMPLO="http://localhost:8123"; npx vitest run src/lookup/LookUpField.integracao.test.tsx
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { criarApiFetch } from "../../exemplos/src/apiFetch";
import { ComponentesProvider } from "../provider";
import { LookUpField } from "./LookUpField";
import type { LookupDefinicao, LookUpFieldProps } from "./lookup.types";

const URL_BACK = process.env.URL_BACK_EXEMPLO;

const DEFINICAO: LookupDefinicao = {
  chave: "pessoa",
  banco: "SQLITE",
  base: "TABELA",
  nomeTabela: "pessoa",
  colunaRetorno: "cd_pessoa",
  tipoColunaRetorno: "NUMERO",
  colunaDescricao: "nm_pessoa",
  colunasBasePesquisa: ["nm_pessoa"],
  tipoConsulta: "POR_LIKE",
  colunasGrid: [
    { coluna: "cd_pessoa", cabecalho: "Código" },
    { coluna: "nm_pessoa", cabecalho: "Nome" },
    { coluna: "dt_nascimento", cabecalho: "Nascimento" },
    { coluna: "tp_situacao", cabecalho: "Situação" },
  ],
  colunasOrderBy: ["nm_pessoa"],
  colunaCpf: "nr_cpf",
  colunaCnpj: "nr_cnpj",
  colunaDtNascto: "dt_nascimento",
  qtdeLinhas: 5,
};

afterEach(() => {
  cleanup();
});

function fncRenderizar(sobrescrever: Partial<LookUpFieldProps> = {}) {
  const wProps: LookUpFieldProps = {
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
  return render(
    <ComponentesProvider api={criarApiFetch(`${URL_BACK}/api/`)}>
      <LookUpField {...wProps} />
    </ComponentesProvider>,
  );
}

const fncCodigo = () => screen.getByRole("textbox", { name: "Pessoa" }) as HTMLInputElement;
const fncDescricao = () => screen.getByLabelText("Pessoa (descrição)") as HTMLInputElement;
const fncModal = () => screen.getByRole("dialog", { name: "Pesquisar pessoa" });

describe.skipIf(!URL_BACK)("LookUpField contra a API real de exemplo (FastAPI + SQLite)", () => {
  it("código existente: a descrição vem do banco", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar({ onChange: wOnChange });
    await wUsuario.type(fncCodigo(), "4");
    await wUsuario.tab();
    await waitFor(() => expect(fncDescricao().value).toBe("Davi Rocha"));
    expect(wOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ codigo: 4, descricao: "Davi Rocha", valido: true, vazio: false }),
    );
    expect(wOnChange.mock.calls[0][0].jsonLinhaEscolhida).toEqual({
      cd_pessoa: 4,
      nm_pessoa: "Davi Rocha",
      dt_nascimento: "1972-05-14 00:00:00",
      tp_situacao: "I",
    });
  });

  it("código inexistente: mensagem no campo descrição e bloqueio", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar();
    await wUsuario.type(fncCodigo(), "9999");
    await wUsuario.tab();
    await waitFor(() => expect(fncDescricao().value).toBe("Pessoa não existe"));
    await waitFor(() => expect(document.activeElement).toBe(fncCodigo()));
  });

  it("pesquisa por texto no modal e escolha da linha", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    fncRenderizar({ onChange: wOnChange });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "lima");

    await waitFor(() => within(fncModal()).getByText("Bruno Lima"), { timeout: 3000 });
    await wUsuario.dblClick(within(fncModal()).getByText("Bruno Lima"));
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ codigo: 2, descricao: "Bruno Lima" }));
    expect(fncDescricao().value).toBe("Bruno Lima");
  });

  it("filtro de CPF no modal pesquisa na hora (CPF do exemplo, validado pelo dígito)", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar();
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("CPF"), "10000791989");
    await wUsuario.tab();
    await waitFor(() => within(fncModal()).getByText("Ana Souza"), { timeout: 3000 });
  });

  it("filtro de data de nascimento: a faixa do dia acha o registro (data ISO exibida como DD/MM/AAAA)", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar();
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Data de nascimento"), "11021963");
    await wUsuario.tab();
    await waitFor(() => within(fncModal()).getByText("Ana Souza"), { timeout: 3000 });
    expect(within(fncModal()).getByText("11/02/1963")).toBeTruthy();
  });

  it("erro de negócio do backend (texto curto demais, 400) aparece no modal", async () => {
    const wUsuario = userEvent.setup();
    const wOnErro = vi.fn();
    // qtdMinimaCaracterBusca=3 é o piso do front; forçamos o 400 com uma definição inválida
    fncRenderizar({ definicao: { ...DEFINICAO, nomeTabela: "x; DROP TABLE pessoa" }, onErro: wOnErro });
    await wUsuario.click(fncCodigo());
    await wUsuario.keyboard("{F4}");
    await wUsuario.type(within(fncModal()).getByLabelText("Pesquisar"), "ana");
    await waitFor(() => within(fncModal()).getByText(/Configuração do Lookup inválida/), { timeout: 3000 });
    expect(wOnErro).toHaveBeenCalled();
  });

  it("erro do banco (tabela inexistente) volta inteiro como 400 e aparece no campo", async () => {
    const wUsuario = userEvent.setup();
    fncRenderizar({ definicao: { ...DEFINICAO, nomeTabela: "tabela_que_nao_existe" } });
    await wUsuario.type(fncCodigo(), "1");
    await wUsuario.tab();
    await waitFor(() => expect(fncDescricao().value).toMatch(/no such table: tabela_que_nao_existe/));
  });
});
