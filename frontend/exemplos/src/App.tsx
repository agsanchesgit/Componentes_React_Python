import { useState } from "react";
import {
  CnpjField,
  ComboField,
  CpfField,
  DataField,
  DataHoraField,
  MIN_DATE,
  MmAaaaField,
  type CampoResultado,
} from "@componentes/react";

// Uma seção por componente. O resultado de cada onChange aparece ao lado, para conferir o contrato.
function Secao({ titulo, resultado, children }: { titulo: string; resultado: unknown; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--cmp-cor-borda)", borderRadius: 6 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{titulo}</h2>
      {children}
      <pre style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{JSON.stringify(resultado, null, 1)}</pre>
    </section>
  );
}

export function App() {
  const [wData, prcDefinirData] = useState<Date>(MIN_DATE);
  const [wDataHora, prcDefinirDataHora] = useState<Date>(MIN_DATE);
  const [wCpf, prcDefinirCpf] = useState(0);
  const [wCnpj, prcDefinirCnpj] = useState("");
  const [wCompetencia, prcDefinirCompetencia] = useState("");
  const [wUf, prcDefinirUf] = useState("");
  const [wUltimo, prcDefinirUltimo] = useState<Record<string, unknown>>({});

  function prcRegistrar(nome: string, resultado: unknown): void {
    prcDefinirUltimo((anterior) => ({ ...anterior, [nome]: resultado }));
  }

  return (
    <main style={{ fontFamily: "var(--cmp-fonte)", padding: 24, display: "grid", gap: 16, maxWidth: 720 }}>
      <h1 style={{ margin: 0 }}>Componentes React + Python</h1>
      <p style={{ margin: 0 }}>
        Campos (Fase 2). Teclas: <b>Enter/↓</b> próximo, <b>↑</b> anterior, <b>F4</b> abre o painel. Texto inválido bloqueia a saída.
      </p>

      <Secao titulo="DataField" resultado={wUltimo.data}>
        <DataField
          label="Data de nascimento"
          obrigatorio
          value={wData}
          onChange={(r: CampoResultado<Date>) => {
            prcDefinirData(r.valor);
            prcRegistrar("data", r);
          }}
        />
      </Secao>

      <Secao titulo="DataHoraField" resultado={wUltimo.dataHora}>
        <DataHoraField
          label="Data e hora"
          value={wDataHora}
          onChange={(r) => {
            prcDefinirDataHora(r.valor);
            prcRegistrar("dataHora", r);
          }}
        />
      </Secao>

      <Secao titulo="CpfField" resultado={wUltimo.cpf}>
        <CpfField
          label="CPF"
          value={wCpf}
          onChange={(r) => {
            prcDefinirCpf(r.valor);
            prcRegistrar("cpf", r);
          }}
        />
      </Secao>

      <Secao titulo="CnpjField (aceita alfanumérico)" resultado={wUltimo.cnpj}>
        <CnpjField
          label="CNPJ"
          value={wCnpj}
          onChange={(r) => {
            prcDefinirCnpj(r.valor);
            prcRegistrar("cnpj", r);
          }}
        />
      </Secao>

      <Secao titulo="MmAaaaField" resultado={wUltimo.competencia}>
        <MmAaaaField
          label="Competência"
          value={wCompetencia}
          menorCompetencia="202001"
          maiorCompetencia="202712"
          onChange={(r) => {
            prcDefinirCompetencia(r.valor);
            prcRegistrar("competencia", r);
          }}
        />
      </Secao>

      <Secao titulo="ComboField" resultado={wUltimo.uf}>
        <ComboField
          label="UF"
          dominio="SP,RJ,MG,MS"
          permiteVazio
          value={wUf}
          onChange={(r) => {
            prcDefinirUf(r.valor);
            prcRegistrar("uf", r);
          }}
        />
      </Secao>
    </main>
  );
}
