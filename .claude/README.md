# Componentes React + Python

Biblioteca de componentes reutilizáveis para projetos com **frontend React/TypeScript** e **backend Python (FastAPI)**. É uma portagem dos componentes do Nexus, com o mesmo contrato público e HTTP.

- Especificação e plano em fases: `orientacoes_criar_componentes_reutilizaveis.md`
- Regras do projeto: `CLAUDE.md`
- Manuais: `docs/manuais/` · Decisões: `docs/decisoes/` · Entregas por fase: `docs/fases/`

## Estrutura

```text
frontend\   pacote npm "@componentes/react" (Vite, modo biblioteca)
  src\        código da biblioteca (API pública em src\index.ts)
  exemplos\   app Vite de demonstração
backend\    pacote Python "componentes_py" (FastAPI)
  src\componentes_py\
  tests\
```

## Comandos

Frontend (`cd frontend`):

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | testes (Vitest) |
| `npm run build` | gera `dist\` (ESM + `.d.ts` + `estilos.css`) |
| `npm run exemplos` | sobe o app de exemplos |

Exemplo completo (front + API Python de exemplo, com o `LookUpField`):

```powershell
cd backend;  .venv\Scripts\python -m uvicorn exemplos.api_exemplo:app --port 8100
cd frontend; npm run exemplos        # o Vite encaminha /api para a porta 8100
```

Backend (`cd backend`):

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m pytest
```

## Como levar a biblioteca a um novo projeto

(Será completado na Fase 6, junto com `docs/manuais/Manual_Instalacao.md`.)
