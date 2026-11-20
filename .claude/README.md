# Componentes React + Python

Biblioteca de componentes reutilizáveis para projetos com **frontend React/TypeScript** e **backend Python (FastAPI)**. É uma portagem dos componentes do Nexus, com o mesmo contrato público e HTTP.

| Componente | Manual |
|---|---|
| `FNC_FORMATA`, `MIN_DATE` | `docs/manuais/Manual_FNC_FORMATA.md` |
| `DataField`, `DataHoraField`, `CpfField`, `CnpjField`, `MmAaaaField`, `ComboField` | `Manual_DataField`, `Manual_DataHoraField`, `Manual_CpfField`, `Manual_CnpjField`, `Manual_MmAaaaField`, `Manual_ComboField` (+ `Manual_CamposComuns`) |
| `GridField` | `Manual_GridField.md` |
| `LookUpField` (+ backend) | `Manual_LookUpField.md`, `Manual_BackendLookup.md` |
| `Carregando` | `Manual_Carregando.md` |
| Instalar em outro projeto | **`Manual_Instalacao.md`** |

Mais: especificação e plano em `orientacoes_criar_componentes_reutilizaveis.md`, regras do projeto em `CLAUDE.md`, entregas por fase em `docs/fases/`, e a lista final de diferenças/pendências em `docs/Diferencas_Nexus.md`.

## Estrutura

```text
frontend\   pacote npm "@componentes/react" (Vite, modo biblioteca)
  src\        código da biblioteca (API pública em src\index.ts)
  exemplos\   app Vite de demonstração (inclui o LookUpField)
backend\    pacote Python "componentes_py" (FastAPI)
  src\componentes_py\   lookup\ (definição, validador, SQL, serviço, rotas), banco\ (dialetos)
  exemplos\   API de exemplo (SQLite em memória, dados fictícios)
  tests\
.claude\    todos os documentos .md
```

## Como levar a biblioteca a um novo projeto

São dois pacotes independentes. No **front**, gere o pacote com `npm pack` (pasta `frontend`) e instale o `.tgz` no projeto (`npm install ...tgz`); importe `@componentes/react/estilos.css` uma vez, monte o `ComponentesProvider` com a instância HTTP do seu projeto (axios ou o adaptador `fetch` do manual) e use os componentes. No **back** (só para o `LookUpField`), instale a pasta `backend` com `pip install`, instale o driver do seu banco (`oracledb`, `pyodbc` ou `psycopg`) e inclua `criar_roteador_lookup(ConfiguracaoLookup(obter_conexao=..., dependencia_autenticacao=...))` no seu FastAPI com o prefixo `/api/Lookup`. O passo a passo completo, com exemplos de código, proxy/CORS e problemas comuns, está em `docs/manuais/Manual_Instalacao.md` (validado em um projeto limpo Vite + FastAPI).

## Comandos

Frontend (`cd frontend`):

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (inclui a regra de chaves obrigatórias) |
| `npm test` | testes (Vitest) |
| `npm run build` | gera `dist\` (ESM + `.d.ts` + `estilos.css`) |
| `npm pack` | gera o `.tgz` instalável (roda o build antes) |
| `npm run exemplos` | sobe o app de exemplos |

Backend (`cd backend`):

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m pytest
.venv\Scripts\python -m ruff check .
```

Exemplo completo (front + API Python de exemplo, com o `LookUpField`):

```powershell
cd backend;  .venv\Scripts\python -m uvicorn exemplos.api_exemplo:app --port 8100
cd frontend; npm run exemplos        # o Vite encaminha /api para a porta 8100 (API_EXEMPLO muda o destino)
```

Integração front x back (renderiza o `LookUpField` contra a API real de exemplo): ver `Manual_LookUpField.md` §8.
