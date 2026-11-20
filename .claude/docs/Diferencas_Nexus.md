# Diferenças em relação ao Nexus e melhorias sugeridas

Lista final para o usuário decidir (entrega da orientação §14). O comportamento e o contrato público foram mantidos; abaixo está só o que mudou, o que foi acrescentado e o que ficou pendente.

## 1. O que mudou (decisões técnicas)

| # | Tema | Nexus | Esta biblioteca |
|---|---|---|---|
| 1 | Visual | Tailwind 4 + shadcn/radix + lucide | CSS próprio (`estilos.css`, variáveis `--cmp-*`), SVG inline, **sem Tailwind**; tema escuro por `data-tema="escuro"` |
| 2 | Popover/Modal | Radix | `Popover` e `Dialogo` próprios (sem portal no popover; portal no modal) |
| 3 | HTTP | `AxiosInstance` e `NexusComponentesProvider` | `ApiHttp` (compatível com axios) e `ComponentesProvider`, com `caminhoLookup` configurável |
| 4 | Framework | Next.js (`"use client"`) | Agnóstico (React 18+); sem `"use client"` |
| 5 | Backend | C#/.NET (`NexusApi.Componentes`) | Python/FastAPI (`componentes_py`) |
| 6 | Bancos | Oracle, SQL Server | Oracle, SQL Server, **PostgreSQL** (+ SQLite só para testes/exemplo); um `Dialeto` por banco |
| 7 | Parâmetros SQL Server | `@p` (Dapper) | `?` posicional (pyodbc) |
| 8 | Execução | async (Dapper) | DB-API síncrona; rotas `def` rodam no threadpool do FastAPI |
| 9 | Autenticação | `[Authorize]` fixo | `dependencia_autenticacao` **obrigatória** (ou `permitir_anonimo=True` explícito) |
| 10 | Corpo malformado | 400 do ASP.NET | 400 `{error: "Requisição inválida: ..."}` (não o 422 do FastAPI) |
| 11 | Testes | `node --test` e xUnit | Vitest + Testing Library (front) e pytest (back) |
| 12 | Nomes | misto | Regra do usuário: `fnc`/`prc`/`w`, português; nomes do contrato (props, `FNC_FORMATA`, `MIN_DATE`, JSON) intactos |
| 13 | Carregando | `CarregandoBensaude` (marca do cliente) | `Carregando` neutro, marca por prop `logo` |
| 14 | `foco.ts`/helpers | exportados internamente | helpers de campos/grid/lookup **não** são públicos (só componentes, `FNC_FORMATA`, `MIN_DATE`, `GRID_MAX_LINHAS`, hooks do provider e tipos) |

## 2. O que foi acrescentado (não existia no Nexus)

- **PostgreSQL** (pedido do usuário) e o dialeto SQLite de teste.
- **Segurança extra no validador** para o PostgreSQL: bloqueia `PG_*`, `LO_*`, `DBLINK`, `COPY`, strings `$$..$$` e `E'..'`.
- **`tabelas_permitidas`** e **`autorizar(definicao, usuario)`** para restringir o "risco aceito" do Lookup (padrão continua sem restrição).
- `caminhoLookup` no provider; `tipos_erro_banco` na configuração.
- Teste de contrato HTTP (front x back) e **teste de integração** do `LookUpField` contra a API Python real.
- Trava da API pública (`index.test.ts`).
- `aria-describedby`/`useId` nos campos; `role="dialog"`/`aria-modal` no modal.

## 3. Pontos que não foram verificados (limites desta entrega)

1. **Bancos reais**: Oracle, SQL Server e PostgreSQL só foram verificados como SQL/parâmetros gerados; a execução real rodou apenas no SQLite. Conferir: sintaxe de limite com `ORDER BY` e sub-select `(...) B`, `ESCAPE '\'`, formato dos parâmetros de cada driver (`oracledb`, `pyodbc`, `psycopg`) e a detecção de erro de banco.
2. **Visual no navegador**: layout, z-index do calendário dentro do modal, cores, rolagem e truncamento só passaram por jsdom (sem layout).
3. **Desempenho do `GridField` com 3000 linhas**: não medido.
4. **Instalação em projeto limpo**: verificada por `tsc` + `vite build` (front) e execução real da API (back); a **interação na tela** do projeto limpo não foi aberta num navegador.

## 4. Melhorias sugeridas (decisão do usuário)

- Medir/testar com os três bancos reais antes de produção; criar um usuário de banco só com SELECT para a API.
- Navegação por teclado dentro do calendário (setas entre dias) e linhas do grid focáveis (acessibilidade); nenhum dos dois existe no Nexus.
- Popover com portal (se algum layout cortar o calendário/lista por `overflow`).
- Versão Tailwind dos estilos, se algum projeto consumidor preferir.
- Publicar `@componentes/react` e `componentes_py` em registro privado (npm/PyPI) em vez de arquivos locais.
- Lint de segurança: considerar restringir também colunas (hoje só tabelas) em `tabelas_permitidas`.
- Atualizar as ferramentas de desenvolvimento (`npm audit`: Vite 5/Vitest 2) — sem efeito no pacote publicado.
- Falsos positivos do validador (colunas com prefixo `PG_`, `SYS_`, `LO_`...): oferecer uma lista de exceções, se aparecer na prática.
