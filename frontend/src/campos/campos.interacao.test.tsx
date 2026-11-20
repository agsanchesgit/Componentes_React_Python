import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MIN_DATE } from "../formata/formata";
import { CnpjField } from "./CnpjField";
import { ComboField } from "./ComboField";
import { CpfField } from "./CpfField";
import { DataField } from "./DataField";
import { DataHoraField } from "./DataHoraField";
import { MmAaaaField } from "./MmAaaaField";

afterEach(() => {
  cleanup();
});

async function prcAguardarFoco(elemento: HTMLElement): Promise<void> {
  await waitFor(() => expect(document.activeElement).toBe(elemento));
}

describe("DataField", () => {
  it("máscara ao digitar, valor ao sair e dia da semana", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<DataField label="Nascimento" value={MIN_DATE} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("Nascimento") as HTMLInputElement;

    await wUsuario.type(wCampo, "10052026");
    expect(wCampo.value).toBe("10/05/2026");
    expect(screen.queryByText("(dom)")).toBeNull(); // sufixo só aparece fora do foco

    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith({
      valor: new Date(2026, 4, 10),
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
    expect(screen.getByText("(dom)")).toBeTruthy();
  });

  it("data inexistente bloqueia a saída e mostra a mensagem", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<DataField label="Data" value={MIN_DATE} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("Data");

    await wUsuario.type(wCampo, "30022026");
    await wUsuario.tab();

    expect(screen.getByRole("alert").textContent).toBe("Data inválida");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valido: false, vazio: true, valor: MIN_DATE }));
    await prcAguardarFoco(wCampo);
  });

  it("vazio nunca bloqueia; obrigatório só marca pendente", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(
      <>
        <DataField label="Data" obrigatorio value={MIN_DATE} onChange={wOnChange} />
        <input aria-label="outro" />
      </>,
    );
    await wUsuario.click(screen.getByLabelText(/Data/));
    await wUsuario.tab();
    // o Tab sai do campo (o primeiro foco seguinte é o próprio botão do calendário, fora da ordem de Tab)
    await prcAguardarFoco(screen.getByLabelText("outro"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("esvaziar o texto avisa o consumidor com MIN_DATE e obrigatorioPendente", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<DataField label="Data" obrigatorio value={new Date(2026, 0, 5)} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText(/Data/) as HTMLInputElement;
    expect(wCampo.value).toBe("05/01/2026");

    await wUsuario.clear(wCampo);
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: MIN_DATE, vazio: true, valido: true, obrigatorioPendente: true });
  });

  it("respeita menorData e maiorData", async () => {
    const wUsuario = userEvent.setup();
    render(
      <DataField
        label="Data"
        value={MIN_DATE}
        onChange={() => {}}
        menorData={new Date(2026, 0, 10)}
        maiorData={new Date(2026, 0, 20)}
      />,
    );
    await wUsuario.type(screen.getByLabelText("Data"), "05012026");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toMatch(/posterior a 10\/01\/2026/);
  });

  it("F4 abre o calendário e escolher um dia emite a data", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<DataField label="Data" value={new Date(2026, 4, 10)} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("Data");

    await wUsuario.click(wCampo);
    await wUsuario.keyboard("{F4}");
    const wPainel = screen.getByRole("dialog");
    await wUsuario.click(within(wPainel).getByRole("button", { name: "15" }));

    expect(wOnChange).toHaveBeenLastCalledWith({
      valor: new Date(2026, 4, 15),
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    await prcAguardarFoco(wCampo);
  });

  it("Esc fecha o calendário e devolve o foco ao campo", async () => {
    const wUsuario = userEvent.setup();
    render(<DataField label="Data" value={new Date(2026, 4, 10)} onChange={() => {}} />);
    const wCampo = screen.getByLabelText("Data");
    await wUsuario.click(wCampo);
    await wUsuario.keyboard("{F4}");
    expect(screen.getByRole("dialog")).toBeTruthy();

    await wUsuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await prcAguardarFoco(wCampo);
  });

  it("dias fora da faixa ficam desabilitados no calendário", async () => {
    const wUsuario = userEvent.setup();
    render(
      <DataField
        label="Data"
        value={new Date(2026, 4, 10)}
        onChange={() => {}}
        menorData={new Date(2026, 4, 8)}
        maiorData={new Date(2026, 4, 12)}
      />,
    );
    await wUsuario.click(screen.getByLabelText("Escolher data"));
    const wPainel = screen.getByRole("dialog");
    expect((within(wPainel).getByRole("button", { name: "7" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(wPainel).getByRole("button", { name: "9" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(wPainel).getByRole("button", { name: "13" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Enter e seta para baixo vão ao próximo campo; seta para cima volta", async () => {
    const wUsuario = userEvent.setup();
    render(
      <>
        <input aria-label="antes" />
        <DataField label="Data" value={MIN_DATE} onChange={() => {}} />
        <input aria-label="depois" />
      </>,
    );
    const wCampo = screen.getByLabelText("Data");
    await wUsuario.click(wCampo);
    await wUsuario.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByLabelText("depois"));

    await wUsuario.click(wCampo);
    await wUsuario.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(screen.getByLabelText("antes"));
  });

  it("DISABLED e READONLY não editam nem abrem o calendário", async () => {
    const wUsuario = userEvent.setup();
    const { rerender } = render(<DataField label="Data" enabled="DISABLED" value={MIN_DATE} onChange={() => {}} />);
    expect((screen.getByLabelText("Data") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Escolher data") as HTMLButtonElement).disabled).toBe(true);

    rerender(<DataField label="Data" enabled="READONLY" value={MIN_DATE} onChange={() => {}} />);
    const wCampo = screen.getByLabelText("Data") as HTMLInputElement;
    expect(wCampo.readOnly).toBe(true);
    await wUsuario.click(wCampo);
    await wUsuario.keyboard("{F4}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("acompanha o value do consumidor quando ele muda por fora", () => {
    const { rerender } = render(<DataField label="Data" value={new Date(2026, 0, 1)} onChange={() => {}} />);
    expect((screen.getByLabelText("Data") as HTMLInputElement).value).toBe("01/01/2026");
    rerender(<DataField label="Data" value={new Date(2027, 1, 3)} onChange={() => {}} />);
    expect((screen.getByLabelText("Data") as HTMLInputElement).value).toBe("03/02/2027");
    rerender(<DataField label="Data" value={MIN_DATE} onChange={() => {}} />);
    expect((screen.getByLabelText("Data") as HTMLInputElement).value).toBe("");
  });
});

describe("DataHoraField", () => {
  it("digita data e hora, sempre com segundos", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<DataHoraField label="Quando" value={MIN_DATE} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("Quando") as HTMLInputElement;

    await wUsuario.type(wCampo, "10052026140509");
    expect(wCampo.value).toBe("10/05/2026 14:05:09");
    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ valor: new Date(2026, 4, 10, 14, 5, 9), valido: true, vazio: false }),
    );
  });

  it("hora inválida bloqueia a saída", async () => {
    const wUsuario = userEvent.setup();
    render(<DataHoraField label="Quando" value={MIN_DATE} onChange={() => {}} />);
    const wCampo = screen.getByLabelText("Quando");
    await wUsuario.type(wCampo, "10052026250000");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toBe("Hora inválida");
    await prcAguardarFoco(wCampo);
  });

  it("painel: escolhe o dia, ajusta a hora e aplica", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<DataHoraField label="Quando" value={new Date(2026, 4, 10, 8, 0, 0)} onChange={wOnChange} />);
    await wUsuario.click(screen.getByLabelText("Escolher data e hora"));
    const wPainel = screen.getByRole("dialog");

    await wUsuario.click(within(wPainel).getByRole("button", { name: "20" }));
    const wHora = within(wPainel).getByLabelText("Hora");
    await wUsuario.clear(wHora);
    await wUsuario.type(wHora, "17");
    await wUsuario.click(within(wPainel).getByRole("button", { name: "Aplicar" }));

    expect(wOnChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ valor: new Date(2026, 4, 20, 17, 0, 0), valido: true }),
    );
  });

  it("painel: hora limitada a 23", async () => {
    const wUsuario = userEvent.setup();
    render(<DataHoraField label="Quando" value={new Date(2026, 4, 10, 8, 0, 0)} onChange={() => {}} />);
    await wUsuario.click(screen.getByLabelText("Escolher data e hora"));
    const wHora = within(screen.getByRole("dialog")).getByLabelText("Hora") as HTMLInputElement;
    await wUsuario.clear(wHora);
    await wUsuario.type(wHora, "99");
    expect(wHora.value).toBe("23");
  });

  it("painel: valor fora da faixa mostra o erro e não aplica", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(
      <DataHoraField
        label="Quando"
        value={new Date(2026, 4, 10, 8, 0, 0)}
        onChange={wOnChange}
        maiorData={new Date(2026, 4, 10, 12, 0, 0)}
      />,
    );
    await wUsuario.click(screen.getByLabelText("Escolher data e hora"));
    const wPainel = screen.getByRole("dialog");
    const wHora = within(wPainel).getByLabelText("Hora");
    await wUsuario.clear(wHora);
    await wUsuario.type(wHora, "15");
    await wUsuario.click(within(wPainel).getByRole("button", { name: "Aplicar" }));
    expect(within(wPainel).getByText(/anterior a/)).toBeTruthy();
    expect(wOnChange).not.toHaveBeenCalled();
  });
});

describe("CpfField", () => {
  it("completa com zeros ao sair e devolve número sem máscara", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<CpfField label="CPF" value={0} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("CPF") as HTMLInputElement;

    await wUsuario.type(wCampo, "191"); // CPF 000.000.001-91 é válido (confere o dígito)
    expect(wCampo.value).toBe("191");
    await wUsuario.tab();
    expect(wCampo.value).toBe("000.000.001-91");
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: 191, vazio: false, valido: true, obrigatorioPendente: false });
  });

  it("dígito verificador inválido bloqueia a saída", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<CpfField label="CPF" value={0} onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("CPF");
    await wUsuario.type(wCampo, "52998224724");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toBe("CPF com dígito inválido");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valido: false, valor: 0 }));
    await prcAguardarFoco(wCampo);
  });

  it("aceitaInvalido deixa sair com dígito errado", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<CpfField label="CPF" aceitaInvalido value={0} onChange={wOnChange} />);
    await wUsuario.type(screen.getByLabelText("CPF"), "52998224724");
    await wUsuario.tab();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valor: 52998224724, valido: true }));
  });

  it("mostra o value inicial formatado e F4 não faz nada", async () => {
    const wUsuario = userEvent.setup();
    render(<CpfField label="CPF" value={52998224725} onChange={() => {}} />);
    const wCampo = screen.getByLabelText("CPF") as HTMLInputElement;
    expect(wCampo.value).toBe("529.982.247-25");
    await wUsuario.click(wCampo);
    await wUsuario.keyboard("{F4}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignora letras na digitação", async () => {
    const wUsuario = userEvent.setup();
    render(<CpfField label="CPF" value={0} onChange={() => {}} />);
    const wCampo = screen.getByLabelText("CPF") as HTMLInputElement;
    await wUsuario.type(wCampo, "12ab3");
    expect(wCampo.value).toBe("123");
  });
});

describe("CnpjField", () => {
  it("aceita o CNPJ alfanumérico da Receita", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<CnpjField label="CNPJ" value="" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("CNPJ") as HTMLInputElement;

    await wUsuario.type(wCampo, "12abc34501de35");
    expect(wCampo.value).toBe("12.ABC.345/01DE-35");
    await wUsuario.tab();
    expect(wOnChange).toHaveBeenLastCalledWith({
      valor: "12ABC34501DE35",
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
  });

  it("completa com zeros à esquerda e valida o dígito", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<CnpjField label="CNPJ" value="" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("CNPJ") as HTMLInputElement;
    await wUsuario.type(wCampo, "191"); // 00.000.000/0001-91 é válido (confere o dígito)
    await wUsuario.tab();
    expect(wCampo.value).toBe("00.000.000/0001-91");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valor: "00000000000191", valido: true }));
  });

  it("dígito inválido bloqueia; aceitaInvalido libera", async () => {
    const wUsuario = userEvent.setup();
    const { unmount } = render(<CnpjField label="CNPJ" value="" onChange={() => {}} />);
    await wUsuario.type(screen.getByLabelText("CNPJ"), "11222333000180");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toBe("CNPJ com dígito inválido");
    unmount();

    render(<CnpjField label="CNPJ" aceitaInvalido value="" onChange={() => {}} />);
    await wUsuario.type(screen.getByLabelText("CNPJ"), "11222333000180");
    await wUsuario.tab();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("MmAaaaField", () => {
  it("completa o mês e devolve AAAAMM, AAAA e MM", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<MmAaaaField label="Competência" value="" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("Competência") as HTMLInputElement;

    await wUsuario.type(wCampo, "3/2026");
    await wUsuario.tab();
    expect(wCampo.value).toBe("03/2026");
    expect(wOnChange).toHaveBeenLastCalledWith({
      valor: "202603",
      AAAA: "2026",
      MM: "03",
      vazio: false,
      valido: true,
      obrigatorioPendente: false,
    });
  });

  it("mês inválido e fora da faixa bloqueiam", async () => {
    const wUsuario = userEvent.setup();
    render(<MmAaaaField label="Competência" value="" menorCompetencia="202001" maiorCompetencia="202612" onChange={() => {}} />);
    const wCampo = screen.getByLabelText("Competência");

    await wUsuario.type(wCampo, "132026");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toMatch(/Mês inválido/);
    await prcAguardarFoco(wCampo);

    await wUsuario.clear(wCampo);
    await wUsuario.type(wCampo, "012027");
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toMatch(/fora da faixa/);
  });

  it("mostra o value inicial como MM/AAAA", () => {
    render(<MmAaaaField label="Competência" value="202610" onChange={() => {}} />);
    expect((screen.getByLabelText("Competência") as HTMLInputElement).value).toBe("10/2026");
  });

  it("vazio devolve strings vazias", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<MmAaaaField label="Competência" obrigatorio value="202610" onChange={wOnChange} />);
    await wUsuario.clear(screen.getByLabelText(/Competência/));
    expect(wOnChange).toHaveBeenLastCalledWith({
      valor: "",
      AAAA: "",
      MM: "",
      vazio: true,
      valido: true,
      obrigatorioPendente: true,
    });
  });
});

describe("ComboField", () => {
  it("sem value válido e sem permiteVazio, emite o 1º item na montagem", async () => {
    const wOnChange = vi.fn();
    render(<ComboField label="UF" dominio="SP,RJ,MG" value="" onChange={wOnChange} />);
    await waitFor(() =>
      expect(wOnChange).toHaveBeenCalledWith({ valor: "SP", ordem: 1, vazio: false, valido: true, obrigatorioPendente: false }),
    );
    expect((screen.getByLabelText("UF") as HTMLInputElement).value).toBe("SP");
  });

  it("com permiteVazio não emite nada na montagem", () => {
    const wOnChange = vi.fn();
    render(<ComboField label="UF" permiteVazio dominio="SP,RJ,MG" value="" onChange={wOnChange} />);
    expect(wOnChange).not.toHaveBeenCalled();
    expect((screen.getByLabelText("UF") as HTMLInputElement).value).toBe("");
  });

  it("digitação restrita ao domínio e completa pelo começo ao sair", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<ComboField label="UF" permiteVazio dominio="SP,RJ,MG,MS" value="" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("UF") as HTMLInputElement;

    await wUsuario.type(wCampo, "mx");
    expect(wCampo.value).toBe("m"); // o "x" não existe no domínio
    await wUsuario.tab();
    expect(wCampo.value).toBe("MG");
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: "MG", ordem: 3, vazio: false, valido: true, obrigatorioPendente: false });
  });

  it("sem permiteVazio, esvaziar bloqueia a saída", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<ComboField label="UF" dominio="SP,RJ" value="RJ" onChange={wOnChange} />);
    const wCampo = screen.getByLabelText("UF");
    await wUsuario.clear(wCampo);
    await wUsuario.tab();
    expect(screen.getByRole("alert").textContent).toBe("Escolha um valor da lista");
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ vazio: true, valido: false, ordem: 0 }));
    await prcAguardarFoco(wCampo);
  });

  it("com permiteVazio, esvaziar libera e emite vazio", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<ComboField label="UF" permiteVazio dominio="SP,RJ" value="RJ" onChange={wOnChange} />);
    await wUsuario.clear(screen.getByLabelText("UF"));
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: "", ordem: 0, vazio: true, valido: true, obrigatorioPendente: false });
  });

  it("abre a lista por F4 e escolher um item emite valor e ordem", async () => {
    const wUsuario = userEvent.setup();
    const wOnChange = vi.fn();
    render(<ComboField label="UF" permiteVazio dominio={["SP", "RJ", "MG"]} value="SP" onChange={wOnChange} />);
    await wUsuario.click(screen.getByLabelText("UF"));
    await wUsuario.keyboard("{F4}");
    const wPainel = screen.getByRole("dialog");
    await wUsuario.click(within(wPainel).getByRole("button", { name: "RJ" }));
    expect(wOnChange).toHaveBeenLastCalledWith({ valor: "RJ", ordem: 2, vazio: false, valido: true, obrigatorioPendente: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a opção (vazio) só aparece com permiteVazio", async () => {
    const wUsuario = userEvent.setup();
    const { unmount } = render(<ComboField label="UF" dominio="SP,RJ" value="SP" onChange={() => {}} />);
    await wUsuario.click(screen.getByLabelText("Abrir lista"));
    expect(screen.queryByRole("button", { name: "(vazio)" })).toBeNull();
    unmount();

    const wOnChange = vi.fn();
    render(<ComboField label="UF" permiteVazio dominio="SP,RJ" value="SP" onChange={wOnChange} />);
    await wUsuario.click(screen.getByLabelText("Abrir lista"));
    await wUsuario.click(screen.getByRole("button", { name: "(vazio)" }));
    expect(wOnChange).toHaveBeenLastCalledWith(expect.objectContaining({ valor: "", ordem: 0, vazio: true }));
  });
});
