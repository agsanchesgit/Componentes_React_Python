# Fase 4 — Backend Lookup

## Decisão tomada com o usuário
Bancos suportados: **PostgreSQL, Oracle e SQL Server** (resposta à pergunta do plano antes da Fase 5).

## Feito (`backend/src/componentes_py`)
| Módulo | Origem C# | Papel |
|---|---|---|
| `lookup/definicao.py` | `LookupDefinicao` | modelos Pydantic, JSON em camelCase por alias |
| `lookup/dtos.py` | `LookupDtos` | requests e responses |
| `lookup/validador.py` | `LookupValidador` | valida definição, `select` e `filtro` (barreira de segurança) |
| `lookup/select_parser.py` | `LookupSelectParser` | colunas, `*` e ORDER BY final de um SELECT |
| `lookup/sql_builder.py` | `LookupSqlBuilder` | SQL parametrizado, independente de banco |
| `banco/dialetos.py` | (fábricas keyed) | `Dialeto` por banco: placeholder, limite, escape do LIKE, proteção de SQL |
| `banco/normalizacao.py` | — | Decimal/datas para JSON; detecção de erro de banco |
| `lookup/servico.py` | `LookupService` | pesquisa, código, validação, normalização de critérios |
| `lookup/rotas.py` | `LookupController` | `criar_roteador_lookup(config)` + erros 400/403/500 |
| `lookup/configuracao.py` | `DependencyInjection` | `ConfiguracaoLookup` |
| `erros.py` | `CustomException` | `ErroNegocio` (400) e `ErroAcessoNegado` (403) |
| `exemplos/api_exemplo.py` | — | API de exemplo (SQLite em memória, dados fictícios) |
| `.claude/docs/manuais/Manual_BackendLookup.md` | — | manual |

## Verificado (saída real)
- `pytest`: **170 testes passando**, `ruff check`: limpo.
  - Portados do Nexus: todos os de `LookupValidadorTests` (filtro válido/perigoso, V2–V8, SELECT perigoso, falsos positivos), `LookupSqlBuilderTests` e `LookupCriteriosTests`.
  - Novos: PostgreSQL (builder, `%%`, validador), parâmetros posicionais do SQL Server, normalização, dialetos, serviço ponta a ponta em SQLite (curingas, CPF sem zeros, data por faixa, filtro, SELECT, erros), `tabelas_permitidas`, `autorizar`, e o **contrato HTTP** (3 rotas, 400/403/500, auth).
- Subi a API de exemplo com `uvicorn` e chamei `pesquisa`, `codigo` e um caso de erro por HTTP real; as respostas bateram com o contrato. O servidor foi parado.

## **Não verificado**
- **Nenhum banco real**: não havia Oracle, SQL Server nem PostgreSQL disponíveis. As consultas desses três só foram verificadas como **texto SQL e parâmetros gerados** (testes de builder). A execução real só rodou no SQLite. Riscos a conferir com banco de verdade:
  - sintaxe exata de `FETCH FIRST`/`TOP`/`LIMIT` com `ORDER BY` e sub-select `(...) B` em cada banco;
  - `ESCAPE '\'` no SQL Server e no PostgreSQL;
  - parâmetros nomeados do `oracledb`/`psycopg` e posicionais do `pyodbc` com `Decimal` e `datetime`;
  - a detecção de erro de banco (`Error` na hierarquia) com os três drivers reais.
- Drivers (`oracledb`, `pyodbc`, `psycopg`) não foram instalados nem importados.

## Desvios do Nexus
1. **PostgreSQL** acrescentado (pedido do usuário) e **SQLITE** acrescentado ao enum só para testes/exemplo (fora do contrato; o front só precisa mandar os 3 reais).
2. Validador reforçado para PostgreSQL: bloqueia `PG_*`, `LO_*`, `DBLINK`, `COPY`, strings `$$..$$`/`$tag$` e `E'..'` (no filtro e no select). Falso positivo conhecido: colunas com esses prefixos.
3. **Autenticação obrigatória**: sem `dependencia_autenticacao` e sem `permitir_anonimo=True`, `criar_roteador_lookup` lança `ValueError` (no Nexus o `[Authorize]` era fixo).
4. `tabelas_permitidas` e `autorizar` (previstos na orientação §8.2) para restringir o risco aceito; padrão continua sem restrição.
5. Corpo malformado devolve **400** `{error}` (não o 422 padrão do FastAPI), para o front tratar tudo igual.
6. Parâmetros no SQL Server saem como `?` (pyodbc), não `@p`.
7. Nomes seguem a regra do usuário (`fncXxx`, `prcXxx`, `wXxx`); nomes do contrato e da API pública (`criar_roteador_lookup`, `ConfiguracaoLookup`, campos da config) ficaram como definidos na orientação.

## Pendências / sugestões
- **Testar com Oracle, SQL Server e PostgreSQL reais** antes de usar em produção (a lista acima).
- Atualizar o tipo `LookupBanco` do front na Fase 5 para incluir `POSTGRESQL` (e, opcionalmente, `SQLITE` só no exemplo).
