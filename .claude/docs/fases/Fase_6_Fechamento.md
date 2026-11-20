# Fase 6 — Fechamento

## Feito
| Item | Onde |
|---|---|
| `Carregando` neutro (marca por prop `logo`, tempo decorrido, acessível, respeita movimento reduzido) | `frontend/src/carregamento/Carregando.tsx` |
| Revisão da API pública + **trava** (`index.test.ts`) | `frontend/src/index.ts` |
| `npm pack` passa a construir antes (`prepack`) e `*.tgz` é ignorado no git | `frontend/package.json`, `.gitignore` |
| Manuais novos | `Manual_Carregando.md`, `Manual_Instalacao.md` |
| README final (com o parágrafo "como levar a um novo projeto") | `.claude/README.md` |
| Lista final de diferenças e melhorias | `.claude/docs/Diferencas_Nexus.md` |

## API pública revisada
Exporta: `ComponentesProvider`, `useComponentesApi`, `useComponentesCaminhoLookup`, `FNC_FORMATA`, `MIN_DATE`, os 6 campos, `GridField`, `GRID_MAX_LINHAS`, `LookUpField`, `Carregando` e **todos** os tipos públicos (props, resultados, `LookupDefinicao`, `ApiHttp`...). Os helpers internos (datas, documentos, competência, combo, foco, lógica do grid e do lookup) **não** são públicos. O `index.test.ts` falha se algum export sumir ou aparecer sem querer.

## Verificado (saída real)
- **Front**: `npm test` **170 passando** (+7 de integração ignorados sem a API, que passaram na Fase 5), `typecheck`, `lint` e `build` limpos (`index.js` 66 kB / 18,5 kB gzip; `estilos.css` 10 kB). `npm pack`: 35 arquivos, 33,7 kB, só `dist/` + `package.json`.
- **Back**: `pytest` **170 passando**, `ruff` limpo.
- **Teste de instalação em projeto limpo** (feito seguindo `Manual_Instalacao.md`, em um diretório temporário novo):
  - Front: projeto Vite + React 18 + TypeScript criado do zero; instalado **só** pelo `.tgz`; código escrito a partir dos trechos do manual usando todos os componentes e tipos. `tsc --noEmit` com `skipLibCheck: false` (tipos do pacote conferidos) e `vite build` passaram, com o CSS no bundle. Importar o pacote instalado em Node funciona (15 exports; `FNC_FORMATA` ok).
  - Back: venv novo; `pip install` da pasta `backend` (wheel não editável: `banco/` e `lookup/` presentes); `main.py` do manual rodando no `uvicorn`: **401** sem autenticação, `validacao` `{"ok":true,...}`, `codigo` `ENCONTRADO`, `pesquisa` com linhas; sem `dependencia_autenticacao` lança `ValueError`. O proxy do Vite do projeto limpo chegou ao back (200).
  - Os servidores de teste foram parados; o serviço da porta 8000 (outro projeto do usuário) não foi tocado.
- **Achado e corrigido**: o manual mandava rodar com `uvicorn` sem instruir a instalá-lo (o pacote não o traz). Corrigido no `Manual_Instalacao.md` (§2.1), junto com a nota sobre a porta.

## **Não verificado**
- Nada foi aberto em **navegador** (nem os exemplos da biblioteca, nem o projeto limpo): a interação na tela só foi coberta por testes em jsdom e pela execução real da API.
- **Oracle, SQL Server e PostgreSQL reais** (só SQLite). No manual, o exemplo de conexão com `psycopg` é ilustrativo: no teste limpo usei `sqlite3`.
- Publicação em registro (npm/PyPI): fora do escopo.

## Desvios
Nenhum novo em relação ao Nexus além dos listados em `docs/Diferencas_Nexus.md`. O `Carregando` é intencionalmente diferente (sem marca).

## Pendências
Ver `docs/Diferencas_Nexus.md` §3 e §4.
