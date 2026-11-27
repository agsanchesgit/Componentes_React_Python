# Manual: backend do Lookup (`componentes_py`)

Motor do `LookUpField` em Python/FastAPI. Recebe a configuração do objeto em tela **a cada requisição** (não há cadastro por consulta), valida, monta o SQL parametrizado para o banco pedido e devolve as linhas. Reproduz o `NexusApi.Componentes/Lookup` do Nexus, com o mesmo contrato HTTP.

---

## 1. Instalação

```powershell
# dentro do projeto consumidor (pacote local, ver também Manual_Instalacao.md na Fase 6)
pip install -e D:\Componentes_React_Python\backend

# drivers: instale só o do(s) banco(s) que usa (a biblioteca não importa nenhum)
pip install oracledb            # Oracle 12c+
pip install pyodbc              # SQL Server (precisa do ODBC Driver for SQL Server)
pip install "psycopg[binary]"   # PostgreSQL (psycopg 3)
```

Python 3.11+. Dependências da biblioteca: `fastapi`, `pydantic>=2`.

## 2. Uso mínimo

```python
from fastapi import FastAPI
from componentes_py import ConfiguracaoLookup, criar_roteador_lookup

def minha_conexao(banco: str):            # "ORACLE" | "SQL_SERVER" | "POSTGRESQL"
    if banco == "ORACLE":
        return oracledb.connect(user=..., password=..., dsn=...)
    if banco == "POSTGRESQL":
        return psycopg.connect(CONN_PG)
    return pyodbc.connect(CONN_SQLSERVER)

app = FastAPI()
app.include_router(
    criar_roteador_lookup(ConfiguracaoLookup(
        obter_conexao=minha_conexao,
        dependencia_autenticacao=meu_depends_auth,   # exige usuário logado
    )),
    prefix="/api/Lookup",
)
```

## 3. `ConfiguracaoLookup`

| Campo | Descrição |
|---|---|
| `obter_conexao(banco)` | **Obrigatório.** Devolve uma conexão DB-API do banco pedido. Chamada uma vez por requisição; a biblioteca chama `close()` ao terminar (com pool, devolva um objeto cujo `close()` devolve ao pool). A biblioteca **não** cria pool nem lê credenciais |
| `obter_conexao_do_usuario(banco, usuario, definicao)` | Opcional. Como `obter_conexao`, mas recebe o usuário autenticado e a `LookupDefinicao` da consulta (pesquisa e busca por código). Tem **precedência** sobre `obter_conexao`; com ela, `obter_conexao` pode ser omitida. Use para tabelas com RLS por tenant: defina o contexto do tenant na conexão (na mesma transação da consulta) e devolva-a; a biblioteca chama `close()` |
| `dependencia_autenticacao` | Dependência do FastAPI que exige usuário logado (equivale ao `[Authorize]` do Nexus). O valor que ela devolve vai ao gancho `autorizar` como `usuario`. **Obrigatória**, a menos que `permitir_anonimo=True` (sem nenhum dos dois, `criar_roteador_lookup` lança `ValueError`) |
| `permitir_anonimo` | Só para exemplos e testes |
| `tabelas_permitidas` | Conjunto opcional de tabelas liberadas (sem diferenciar maiúsculas). Padrão `None` = sem restrição (igual ao Nexus). Com lista, só `base = TABELA` com nome na lista passa; `base = SELECT` é recusado (403) |
| `autorizar(definicao, usuario) -> bool` | Gancho opcional: `False` recusa a consulta (403 `Acesso negado a esta consulta`) |
| `tipos_erro_banco` | Tupla de exceções que são erros do banco. Padrão `None`: detecta pela hierarquia DB-API (`Error`) de qualquer driver |

## 4. Contrato HTTP (idêntico ao do Nexus; JSON em camelCase)

| Rota | Corpo | Resposta |
|---|---|---|
| `POST {prefixo}/pesquisa` | `{ definicao, texto?, dtNascto? (yyyy-MM-dd), cpf?, cnpj? }` (ao menos um critério) | `{ linhas: [...], limiteAtingido }` |
| `POST {prefixo}/codigo` | `{ definicao, valor }` | **Sempre 200**: `{ situacao: "ENCONTRADO"\|"NAO_ENCONTRADO"\|"MAIS_DE_UM", codigo, descricao, linha }` (campos nulos continuam no JSON) |
| `POST {prefixo}/validacao` | `definicao` | `{ ok, inconsistencias: [{ chave, propriedade, mensagem }] }` (não executa nada) |

`definicao` (`LookupDefinicao`): `chave?`, `banco` (`ORACLE` \| `SQL_SERVER` \| `POSTGRESQL`), `base` (`TABELA` \| `SELECT`), `nomeTabela?`, `select?`, `colunaRetorno`, `tipoColunaRetorno` (`NUMERO` \| `TEXTO` \| `DATA`), `colunaDescricao`, `colunasBasePesquisa[]`, `tipoConsulta` (`POR_LIKE` \| `POR_ORDEM_ALFABETICA`), `operadorNaColuna?`, `operadorEntreColunas?` (`AND` \| `OR`), `colunasGrid[{coluna, cabecalho}]`, `colunasOrderBy?[]`, `colunasAdicionais?[]`, `colunaCnpj?`, `colunaCpf?`, `colunaDtNascto?`, `qtdeLinhas?` (1 a 300; padrão 100), `filtro?`.

As chaves de cada linha em `linhas` são **as colunas como foram configuradas** (o banco devolve maiúsculas no Oracle e minúsculas no PostgreSQL; a biblioteca restaura o nome configurado).

### Regras de negócio

- **Texto**: separado em palavras; cada palavra vira `UPPER(col) LIKE UPPER(:p) ESCAPE '\'` (com `%`, `_` e `\` digitados escapados). Palavras na mesma coluna combinam com `operadorNaColuna` (padrão AND); colunas combinam com `operadorEntreColunas` (padrão OR).
- **`POR_ORDEM_ALFABETICA`**: `UPPER(col) >= UPPER(:texto)`, ordenado pela coluna; só 1 coluna base.
- **Mínimo de 3 caracteres** quando a pesquisa é **só** por texto (piso do backend). Com CPF, CNPJ ou data, o texto pode ser menor.
- **Pesquisa ao abrir** (opcional): com `definicao.pesquisarAoAbrir` **e** `ConfiguracaoLookup.permitir_pesquisa_ao_abrir(definicao, usuario)` devolvendo `True`, a pesquisa aceita nenhum critério e texto de qualquer tamanho (o teto de linhas continua). A definição vem do front, por isso a liberação é do projeto. Ex.: `permitir_pesquisa_ao_abrir=lambda d, u: d.nome_tabela == "tomadores"`.
- **CPF/CNPJ** chegam com ou sem máscara e são completados com zeros (11/14). O CNPJ aceita letras (alfanumérico). A consulta aceita também o valor gravado sem zeros à esquerda (`col = :p OR col = :pSz`).
- **Data de nascimento**: faixa `[dia, dia+1)`, então pega registros com hora.
- **Código**: convertido para o tipo da coluna (`NUMERO` aceita `12` e `12.5`, não `1,5`; `DATA` aceita `yyyy-MM-dd` e `dd/MM/yyyy`); inválido = `NAO_ENCONTRADO`. Busca no máximo 2 linhas para detectar `MAIS_DE_UM`.
- **`qtdeLinhas`**: a consulta pede n+1 linhas; se vierem mais de n, devolve n com `limiteAtingido: true`.
- **`filtro`**: SQL complementar, **só com `base = TABELA`**; vira `AND (<filtro>)` na pesquisa e na busca por código (o `AND` inicial é opcional).

## 5. Bancos e dialetos

| Banco | Parâmetros | Limite de linhas | Driver |
|---|---|---|---|
| `ORACLE` | `:nome` (dicionário) | `FETCH FIRST n ROWS ONLY` (12c+) | `oracledb` |
| `SQL_SERVER` | `?` (lista, na ordem de uso) | `SELECT TOP n` | `pyodbc` |
| `POSTGRESQL` | `%(nome)s` (dicionário) | `LIMIT n` | `psycopg` 3 |
| `SQLITE` | `?` (lista) | `LIMIT n` | `sqlite3` — **só testes e exemplo**, fora do contrato do Nexus |

- No SQL Server (`?`), o mesmo valor é repetido a cada uso do parâmetro.
- No PostgreSQL, um `%` literal no `filtro` ou no `select` é dobrado (`%%`) automaticamente, porque o psycopg reserva o `%`.
- `[` é curinga de LIKE no SQL Server e é escapado (`\[`) só nele.
- Tipos devolvidos são normalizados para o JSON: `Decimal` vira `int` (se inteiro) ou `float`; `datetime`/`date` viram `yyyy-MM-ddTHH:mm:ss`; `bytes` vira texto.
- **Adicionar outro banco**: crie uma subclasse de `Dialeto` (`banco/dialetos.py`: placeholder, limite, escape do LIKE, proteção de SQL) e registre-a em `DIALETOS` e no enum `LookupBanco`.

## 6. Execução (abordagem única)

DB-API **síncrona**. As rotas são `def` (não `async def`), então o FastAPI as executa no threadpool e o driver bloqueante não trava o loop de eventos. Não há estado global: tudo vem da `ConfiguracaoLookup`.

## 7. Segurança

O `select` e o `filtro` são texto SQL vindo do front, **sem lista de liberação**. A barreira (`validador.py`) é:

- uma única instrução `SELECT` (sem `;` fora de literais), sem comentários (`--`, `/* */`), sem db link (`@`);
- sem DML/DDL/controle (`INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `EXEC`, `CALL`, `BEGIN`, `DECLARE`, `COMMIT`, `ROLLBACK`, `LOCK`, `INTO`, `FOR UPDATE`...), nem pacotes de sistema (`DBMS_`, `UTL_`, `OWA_`, `HTP_`, `APEX_`, `SYS_`, `SYS.`, `XP_`, `PG_`), nem `LO_*`, `DBLINK`, `COPY` e strings entre `$$` do PostgreSQL;
- no `filtro`, ainda: parênteses balanceados (para não "fechar" o parêntese em que o montador o coloca), aspas simples fechadas, sem `q'..'` (Oracle), sem `E'..'` (PostgreSQL) e sem parâmetros (`:`);
- nomes de tabela e coluna validados por padrão estrito (`[A-Za-z_][A-Za-z0-9_$#]*`, com um `schema.` opcional) antes de entrar no SQL;
- **todo valor do usuário** (texto, CPF, CNPJ, data, código) vai **sempre como parâmetro**, nunca concatenado;
- teto de 300 linhas por pesquisa e piso de 3 caracteres para texto.

> **Risco aceito (igual ao Nexus):** qualquer usuário autenticado consulta qualquer tabela/coluna visível ao usuário de banco da API. A validação **não é exaustiva**: o que o usuário do banco pode ler continua sendo definido pelos grants dele. **Use um usuário de banco só com SELECT nas tabelas necessárias** e, se quiser mais, `tabelas_permitidas` e `autorizar`.

Falsos positivos conhecidos: colunas cujo nome começa com `PG_`, `SYS_`, `LO_`... são recusadas no `select`/`filtro`.

## 8. Erros

| Situação | HTTP | Corpo |
|---|---|---|
| Regra de negócio / definição inválida / requisição malformada | 400 | `{ "error": "mensagem" }` (a validação do corpo também vem assim, `Requisição inválida: ...`, e não como 422) |
| Erro do **banco** (`ORA-xxxxx`, SQL Server, PostgreSQL) | 400 | `{ "error": "<mensagem completa do banco>" }` |
| Recusa por `tabelas_permitidas` / `autorizar` | 403 | `{ "error": "..." }` |
| Sem autenticação | 401/403 | o da sua dependência |
| Erro inesperado | 500 | `{ "error": "Erro inesperado ao processar a requisição.", "errorId": "<uuid>" }`; o detalhe vai ao log `ERRO [errorId]` (logger `componentes_py.lookup`) |

## 9. Rodar o exemplo e os testes

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
.venv\Scripts\python -m pytest                      # 170 testes
.venv\Scripts\python -m ruff check .
.venv\Scripts\python -m uvicorn exemplos.api_exemplo:app --port 8100
```

A API de exemplo (`exemplos/api_exemplo.py`) usa uma tabela fictícia `pessoa` em SQLite (`cd_pessoa`, `nm_pessoa`, `dt_nascimento`, `nr_cpf`, `nr_cnpj`, `tp_situacao`), com `permitir_anonimo=True`. Chame com `banco: "SQLITE"`.

```powershell
curl -X POST localhost:8100/api/Lookup/codigo -H "Content-Type: application/json" -d '{"definicao":{"banco":"SQLITE","base":"TABELA","nomeTabela":"pessoa","colunaRetorno":"cd_pessoa","tipoColunaRetorno":"NUMERO","colunaDescricao":"nm_pessoa","colunasBasePesquisa":["nm_pessoa"],"tipoConsulta":"POR_LIKE","colunasGrid":[{"coluna":"cd_pessoa","cabecalho":"Código"}]},"valor":"4"}'
```

## 10. Armadilhas

1. **Oracle `CHAR(n)`** devolve o texto com espaços à direita; faça `trim()` no front (ou `TRIM()` no `select`) ao comparar/mostrar códigos.
2. **Oracle `NUMBER`** vem como `int`/`Decimal`: a biblioteca normaliza para número no JSON.
3. **SQLite** guarda datas como texto: use `AAAA-MM-DD HH:MM:SS` para a faixa por dia funcionar. Os drivers reais devolvem `datetime`.
4. Esquecer de fechar/devolver a conexão em `obter_conexao`: a biblioteca chama `close()`, então com pool devolva um proxy cujo `close()` libera a conexão.
5. `pyodbc` + `?`: o ODBC Driver precisa estar instalado; para `pymssql` (`%s`) é preciso um dialeto novo.
