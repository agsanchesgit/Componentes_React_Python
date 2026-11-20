import { useState } from "react";
import {
  CnpjField,
  ComboField,
  CpfField,
  DataField,
  DataHoraField,
  GridField,
  type GridColuna,
  type GridLinha,
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

const COLUNAS: GridColuna[] = [
  { coluna: "cd_pessoa", tipo: "numero", largura: 8 },
  { coluna: "nm_pessoa", tipo: "texto", larguraMax: 18 },
  { coluna: "dt_nascimento", tipo: "data" },
  { coluna: "nr_cpf", tipo: "texto", mascara: "ZZZ.ZZZ.ZZZ-ZZ" },
  { coluna: "ativo", tipo: "logico" },
];
const CABECALHOS = ["Código", "Nome", "Nascimento", "CPF", "Ativo"];
const NOMES = ["Ana Souza", "bruno Lima", "Carla Dias", "Davi Rocha", "Elisa Prado", "Fábio Nunes", "Gabriela Torres"];
const PESSOAS: GridLinha[] = Array.from({ length: 23 }, (_, i) => ({
  cd_pessoa: i + 1,
  nm_pessoa: `${NOMES[i % NOMES.length]} ${i + 1}`,
  dt_nascimento: i % 5 === 0 ? "0001-01-01T00:00:00" : `19${70 + (i % 30)}-0${(i % 9) + 1}-1${i % 9}T00:00:00`,
  nr_cpf: String(52998224725 - i),
  ativo: i % 3 === 0 ? "S" : "N",
}));

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
        Campos (Fase 2) e Grid (Fase 3). Teclas: <b>Enter/↓</b> próximo, <b>↑</b> anterior, <b>F4</b> abre o painel. Texto inválido bloqueia a saída.
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

      <Secao titulo="GridField" resultado={wUltimo.grid}>
        <GridField
          colunas={COLUNAS}
          cabecalhos={CABECALHOS}
          dados={PESSOAS}
          linhasPorPagina={8}
          onLinhaPosicionada={(l) => prcRegistrar("grid", { posicionada: l })}
          onLinhaAcionada={(l) => prcRegistrar("grid", { acionada: l })}
          onLinhaContexto={(l) => prcRegistrar("grid", { contexto: l })}
          corLinha={(l) => (l.ativo === "N" ? undefined : "rgb(220 252 231 / 0.6)")}
          detalhe={(l) => <span>Detalhe de {String(l.nm_pessoa)}</span>}
          acoes={[{ rotulo: "Editar", icone: "✎", aoClicar: (l) => prcRegistrar("grid", { acao: "Editar", linha: l }) }]}
        />
        <small>Clique no cabeçalho adiciona à ordem; duplo clique reinicia. Duplo clique/Enter/F4 na linha aciona.</small>
      </Secao>
    </main>
  );
}
