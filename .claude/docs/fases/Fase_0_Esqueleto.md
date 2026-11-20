# Fase 0 — Esqueleto

## Feito
- Frontend `@componentes/react`: Vite em modo biblioteca (ESM), `react`/`react-dom` como `peerDependencies`, tipos `.d.ts` via `tsc`, `estilos.css` com variáveis `--cmp-*` (tema claro e `data-tema="escuro"`).
- `ComponentesProvider` + `useComponentesApi` (erro claro sem o provider) e o contrato `ApiHttp` (compatível com axios, sem depender dele).
- App de exemplos (`frontend/exemplos`), vazio, importando a biblioteca pelo código-fonte.
- Backend `componentes_py`: `pyproject.toml` (hatchling, FastAPI, Pydantic v2, pytest), `ErroNegocio`, pacotes `lookup` e `banco` vazios.
- `.gitignore`, `.claude/README.md`.

## Verificado (saída real)
- `npm run typecheck`: sem erros.
- `npm test`: 2 testes passando (provider).
- `npm run build`: gera `dist/index.js`, `index.d.ts`, `provider.d.ts`, `tipos.d.ts`, `estilos.css`.
- `npm run exemplos`: servidor sobe e responde HTTP 200 (a página e o `main.tsx`); **não abri no navegador**.
- `pytest`: 2 testes passando (Python 3.14.8, venv em `backend/.venv`).

## Não feito / observações
- **Lint** (ESLint/ruff) ainda não configurado; o critério de pronto cita lint limpo. Proposta: incluir na Fase 1.
- `npm audit` aponta 6 vulnerabilidades, todas em ferramentas de desenvolvimento (vite 5 / esbuild / vitest 2), sem efeito no pacote publicado. Subir para Vite 6+/Vitest 3+ é possível; deixei para você decidir.
- `pyproject.toml` exige Python >= 3.11; testado só na 3.14.

## Desvios do Nexus
Nenhum (ainda não há componente).
