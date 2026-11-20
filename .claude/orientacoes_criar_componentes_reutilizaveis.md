# Orientações para criar a biblioteca de componentes reutilizáveis React + Python

> **Leitor:** o Claude Sonnet (ou outro agente de código). Leia este documento inteiro antes de escrever qualquer código.
> **Projeto a construir:** `D:\Componentes_React_Python`
> **Fonte de referência (somente leitura):** `D:\nexus\NexusWebApp\src\nexus-componentes\` (front, TypeScript) e `D:\nexus\ApiNexus\NexusApi.Componentes\` (back, C#). **Não altere nada em `D:\nexus`.**

---

## 1. Objetivo

Criar, em `D:\Componentes_React_Python`, uma biblioteca de componentes que possa ser usada em **qualquer projeto que tenha frontend React/TypeScript e backend Python**. A biblioteca reproduz os componentes que já existem no projeto Nexus (Next.js + .NET), com o mesmo comportamento, as mesmas regras e o mesmo contrato HTTP, só que:

- o frontend é um **pacote npm** de React + TypeScript, sem depender de Next.js nem do código do Nexus;
- o backend é um **pacote Python** (FastAPI), sem depender de .NET nem do banco do Nexus;
- o projeto consumidor traz a sua própria instância HTTP, a sua autenticação e a sua conexão com o banco.

O Nexus continua como está. Esta biblioteca é uma **portagem** (port), não uma migração.

---

## 2. Como trabalhar (processo)

1. Leia os fontes de referência indicados na §6, componente por componente, **antes** de portar. Eles são a especificação: o comportamento descrito neste documento é um resumo; em caso de dúvida, o código e os testes do Nexus mandam.
2. Trabalhe **uma fase por vez** (§12). Ao fim de cada fase: testes passando, `tsc --noEmit` sem erro, lint limpo e um resumo curto ao usuário. Só avance com o "ok" do usuário.
3. Antes de decidir qualquer ponto ambíguo, escolha o padrão do Nexus. Pergunte ao usuário só quando houver duas opções razoáveis e a escolha mudar o resultado.
4. Portar os **testes** junto com o código: os testes do Nexus (`formata.test.ts`, `campos.test.ts`, `grid.test.ts` e os de backend do Lookup) viram a rede de segurança. Reescreva-os na ferramenta de teste da nova biblioteca.
5. Não invente funcionalidade que não existe no Nexus. Melhorias vão para uma lista no fim de cada fase, para o usuário decidir.
6. Documentação: **um manual por componente** em `docs/manuais/` (Markdown, em português). Ao mudar comportamento, atualize o manual.

---

## 3. Regras de código (do usuário, valem para TypeScript, Python, SQL e o que mais houver)

### 3.1 Chaves obrigatórias (TypeScript/JavaScript)

Sempre `{}` em `if`/`else`/`for`/`while`/`do`, mesmo com um só comando. Nunca `if (x) return;`; escreva:

```ts
if (x) {
  return;
}
```

Vale também para JavaScript dentro de HTML/templates.

### 3.2 Nomenclatura (todas as linguagens)

- Todo código novo tem **nomes em português (pt-br)**: variáveis, funções, métodos, classes, tabelas, colunas e props.
- **Variável local** (de memória/trabalho, criada dentro de função ou método) começa com `w` minúsculo + camelCase: `wNomeCliente`, `wValorTotal`, `wListaNotas`.
- **Procedure** (função/método que **não** retorna valor) começa com `prc` + PascalCase: `prcGravarNota`, `prcAbrirCalendario`.
- **Function** (função/método que **retorna** valor) começa com `fnc` + PascalCase: `fncObterSaldo`, `fncValidarCpf`.
- **Exceções** (mantêm o nome original): nomes exigidos por framework/biblioteca/contrato externo. Exemplos: componentes React (`DataField`, `GridField`: PascalCase, são classes/componentes), hooks (`useXxx`), handlers `onChange`/`onClick`, rotas e decorators do FastAPI, métodos dunder do Python (`__init__`), props que repetem o contrato do Nexus (veja §4.3), nomes de pacotes.
- Nomes de componentes e props públicas **já definidos neste documento** são os do Nexus e ficam como estão (`LookUpField`, `larguraCampo`, `obrigatorio`, `aceitaInvalido`, `FNC_FORMATA`, ...). Isso mantém o contrato idêntico e facilita levar telas do Nexus para o novo sistema.
- Em Python, a regra do usuário **prevalece** sobre o PEP 8 para nomes de funções e variáveis locais (`fncValidarCpf`, `wListaLinhas`). Classes seguem PascalCase. Módulos e pacotes ficam em `snake_case` minúsculo (exigência de importação).

### 3.3 Comentários

Em português. Comente o **porquê** (decisão, pegadinha), não o óbvio.

---

## 4. Arquitetura da biblioteca

### 4.1 Estrutura de pastas

```text
D:\Componentes_React_Python\
├── .claude\                       TODOS os documentos .md ficam aqui (regra do usuário)
│   ├── CLAUDE.md                  índice e regras do projeto
│   ├── orientacoes_criar_componentes_reutilizaveis.md   (este arquivo)
│   ├── README.md                  visão geral (Fase 0)
│   └── docs\
│       ├── manuais\               um .md por componente + manual do backend + guia de instalação
│       ├── decisoes\              decisões tomadas com o usuário
│       └── fases\                 resumo de entrega de cada fase
├── frontend\                      pacote npm  "@componentes/react"
│   ├── package.json
│   ├── tsconfig.json
│   ├── src\
│   │   ├── index.ts               API pública (única porta de entrada)
│   │   ├── provider.tsx           ComponentesProvider (injeta o cliente HTTP)
│   │   ├── foco.ts
│   │   ├── formata\               FNC_FORMATA + MIN_DATE
│   │   ├── campos\                CampoEntrada, DataField, DataHoraField, CpfField, CnpjField,
│   │   │                          MmAaaaField, ComboField, Calendario, lógica pura (*.ts) e testes
│   │   ├── grid\                  GridField, grid.ts (lógica pura), grid.types.ts, testes
│   │   ├── lookup\                LookUpField, LookUpModal, LookUpGrid, useLookupApi, tipos, utils
│   │   ├── ui\                    primitivos visuais próprios (§4.4)
│   │   └── carregamento\          indicador de carregamento genérico
│   └── exemplos\                  app Vite de demonstração/teste manual de cada componente
├── backend\                       pacote Python  "componentes_py"
│   ├── pyproject.toml
│   ├── src\componentes_py\
│   │   ├── __init__.py
│   │   ├── lookup\                definicao, validador, sql_builder, select_parser, servico, rotas
│   │   ├── banco\                 adaptadores de banco (§8.3)
│   │   └── erros.py
│   └── tests\
```

> **Regra do usuário:** nenhum `.md` fora de `.claude\`. Onde este documento diz `docs/manuais/` ou `README.md` na raiz, leia `.claude/docs/manuais/` e `.claude/README.md`.

### 4.2 Regras de dependência (frontend)

- Os componentes importam **somente** de dentro da própria biblioteca e de `react`/`react-dom`. **Nunca** importam telas, store, serviços ou configuração do app consumidor.
- A **instância HTTP** (axios ou equivalente) chega por `ComponentesProvider api={...}` (no Nexus: `NexusComponentesProvider`). O app consumidor monta o provider uma vez, no layout. Sem o provider, o componente que precisa de API lança erro claro: `"ComponentesProvider ausente: envolva a tela com o provider."`.
- Qualquer coisa do app (token, refresh, toasts globais) fica na instância HTTP que o app entrega, não na biblioteca.
- `index.ts` exporta componentes, `FNC_FORMATA`, `MIN_DATE` e **todos os tipos** públicos (props, resultados). Quem consome importa só de `@componentes/react`.

### 4.3 Contrato público: manter o do Nexus

Os nomes de props, tipos e do JSON trocado com o backend ficam **idênticos** aos do Nexus (leia `campos.types.ts`, `grid.types.ts`, `lookup.types.ts`). Motivo: um desenvolvedor que conhece o Nexus usa a nova biblioteca sem reaprender, e o mesmo manual vale para os dois.

### 4.4 Visual (Tailwind / shadcn / radix)

O Nexus usa Tailwind 4 + shadcn/radix (`@/components/ui`). Para a biblioteca servir qualquer projeto:

- **Não** dependa de `@/components/ui` do app consumidor.
- Crie primitivos mínimos em `src/ui/` (input, botão, modal/dialog, popover, tooltip, tabela) com **CSS próprio** (CSS Modules ou um único `componentes.css` com variáveis CSS `--cmp-*` para cores, bordas, raios e fontes). O consumidor muda o tema só sobrescrevendo as variáveis.
- Radix pode ser usado como dependência real do pacote (`@radix-ui/react-dialog`, `-popover`, `-tooltip`) para acessibilidade; evite dependências pesadas além disso.
- Não exigir Tailwind no projeto consumidor. (Se o usuário pedir, uma versão Tailwind pode vir depois.)
- Ícones: SVG inline próprios (poucos: calendário, lupa, seta, +/−, fechar). Sem pacote de ícones.
- Suporte a tema claro/escuro via variáveis CSS.

### 4.5 Stack sugerida

| Camada | Escolha | Observação |
|---|---|---|
| Build do pacote | Vite (library mode) ou tsup | Saída ESM + tipos `.d.ts`; `react` e `react-dom` como `peerDependencies` |
| Testes front | `node --test` (como no Nexus) para lógica pura; Vitest + Testing Library para componentes | A lógica pura (`formata.ts`, `datas.ts`, `documentos.ts`, `competencia.ts`, `combo.ts`, `grid.ts`, `lookup.utils.ts`) deve ser testável sem DOM |
| Exemplos | App Vite + React em `frontend/exemplos` | Uma página por componente (substitui as "telas de teste" do Nexus) |
| Back | Python 3.11+, FastAPI, Pydantic v2 | Rotas num `APIRouter` que o projeto consumidor inclui |
| Testes back | pytest (+ pytest-asyncio se async) | |

Se o usuário já tiver preferências diferentes (Next.js, CRA, Flask...), confirme antes da Fase 0. O núcleo (lógica pura + componentes) não deve depender de bundler nem de framework web.

---

## 5. Como o consumidor usa a biblioteca (alvo)

**Front:**

```tsx
import { ComponentesProvider, DataField, LookUpField, GridField, FNC_FORMATA, MIN_DATE } from "@componentes/react";
import "@componentes/react/estilos.css";
import { api } from "./minhaApi"; // axios do projeto, com token etc.

<ComponentesProvider api={api}>
  <App />
</ComponentesProvider>
```

**Back:**

```python
from fastapi import FastAPI
from componentes_py import criar_roteador_lookup, ConfiguracaoLookup

app = FastAPI()
app.include_router(
    criar_roteador_lookup(ConfiguracaoLookup(
        obter_conexao=minha_funcao_de_conexao,   # devolve conexão do banco pedido
        dependencia_autenticacao=meu_depends_auth,  # exige usuário logado (padrão do Nexus: [Authorize])
    )),
    prefix="/api/Lookup",
)
```

Instalação nos projetos: pacote npm local (`npm pack` / `file:` / workspace) e pacote Python local (`pip install -e` ou wheel). Documente ambos em `docs/manuais/Manual_Instalacao.md`. Publicar em registro público/privado fica como decisão do usuário.

---

## 6. Componentes a construir (frontend)

Para cada componente: leia o arquivo de referência e os testes, porte a lógica pura primeiro (com testes), depois o componente, depois o exemplo e o manual.

Caminho base de referência: `D:\nexus\NexusWebApp\src\nexus-componentes\`.

| # | Componente | Referência | Valor / vazio | Largura padrão |
|---|---|---|---|---|
| 1 | `FNC_FORMATA` + `MIN_DATE` | `formata\formata.ts` + `formata.test.ts` | função pura | n/a |
| 2 | `CampoEntrada` (base) | `campos\CampoEntrada.tsx`, `foco.ts` | n/a | n/a |
| 3 | `DataField` | `campos\DataField.tsx`, `datas.ts`, `Calendario.tsx` | `Date`; vazio = `MIN_DATE` | 12 |
| 4 | `DataHoraField` | `campos\DataHoraField.tsx` | `Date`; vazio = `MIN_DATE` | 19 |
| 5 | `CpfField` | `campos\CpfField.tsx`, `documentos.ts` | `number`; vazio = 0 | 12 |
| 6 | `CnpjField` | `campos\CnpjField.tsx`, `documentos.ts` | string de 14 posições sem máscara; vazio = "" | 16 |
| 7 | `MmAaaaField` | `campos\MmAaaaField.tsx`, `competencia.ts` | string `AAAAMM` (+ `AAAA` e `MM` no resultado); vazio = "" | 7 |
| 8 | `ComboField` | `campos\ComboField.tsx`, `combo.ts` | string do domínio (+ `ordem` base 1; 0 = vazio); vazio = "" só com `permiteVazio` | maior item |
| 9 | `GridField` | `grid\GridField.tsx`, `grid.ts`, `grid.types.ts`, `grid.test.ts` | n/a (grid, não é campo) | n/a |
| 10 | `LookUpField` | `lookup\*` | código (número ou texto); vazio = 0 / "" / `MIN_DATE`, **nunca null** | `larguraCampo` |
| 11 | `CarregandoBensaude` → `Carregando` | `carregamento\CarregandoBensaude.tsx` | indicador genérico | n/a |

> **O Nexus tem marca do cliente (Bensaúde)** no indicador de carregamento. Na biblioteca, `Carregando` deve ser neutro (spinner/barra com variáveis CSS); a marca, se houver, entra por prop `logo`. Não copie logos, textos ou nomes do cliente para a biblioteca.

### 6.1 `FNC_FORMATA(variavel, mascara)` e `MIN_DATE`

Leia o manual completo: `D:\nexus\NexusWebApp\docs\manuais\Manual_FNC_FORMATA.md` e porte **todos** os casos do `formata.test.ts`. Resumo:

- Função **pura**: `(number | string | Date | null | undefined, string) => string`. Não altera o argumento, não guarda estado.
- Tokens: `9` (dígito; falta = branco), `Z` (dígito; falta = `0`), `A` (letra ou dígito), `DD` `MM` `AAAA` `HH` `MI` `SS`, outro caractere = literal, `0` = **inválido** (lança `Error`).
- Classificação da máscara, nesta ordem: inválida (vazia ou com `0`) → data/hora (tem `DD`/`MM`/`HH`/`MI`/`SS`) → sem posição (erro) → alfanumérica (tem `A`) → numérica.
- Numérica: a **última vírgula é o separador decimal**; `999,999,999` vira `123,456,000` (use `999.999.999`). Arredonda meio para cima, completa decimais, negativo põe `-` no último branco antes do primeiro dígito. Estouro devolve `String(valor)`.
- Data/hora: lê `Date` pelos componentes locais; string ISO é lida **como escrita**, sem deslocar fuso (o `Z`/`±HH:MM` é ignorado).
- Vazio: numérica `9` → brancos, `Z` → zeros; alfa → `""`; data → `__/__/____`.
- `MIN_DATE` = 0001-01-01 00:00:00 (equivale ao `DateTime.MinValue` do .NET). Criar com `setFullYear(1, 0, 1)`, **nunca** `new Date(1, 0, 1)` (vira 1901). Qualquer `Date` de ano 1 é vazio em máscara de data.
- Valor que não cabe na máscara volta sem formatação, **sem erro**. Só máscara inválida lança erro.

### 6.2 `CampoEntrada` (base dos campos)

Comportamento comum, que cada campo herda:

- Máscara de exibição aplicada **fora do foco**; no foco, o usuário digita o valor "cru".
- Validação ao sair; **texto inválido bloqueia a saída** (o foco não sai do campo). Vazio **nunca** bloqueia: `obrigatorio` só marca `obrigatorioPendente` e o consumidor trata no submit.
- Sufixo e slot de ação (ex.: botão do calendário).
- **F4** abre o painel do campo (calendário, lista, modal). Em CPF/CNPJ, F4 não faz nada.
- Navegação (`foco.ts`): **Enter** e **↓** = Tab; **↑** = Shift+Tab.
- Props comuns (`CampoBaseProps`): `label`, `obrigatorio`, `enabled` (`"ENABLE" | "DISABLED" | "READONLY"`), `placeholder`, `larguraCampo` (em caracteres), `id`, `className`.
- `onChange` recebe `CampoResultado<T>`: `{ valor, vazio, valido, obrigatorioPendente }`. O `valor` **nunca é null**.

### 6.3 Datas, CPF, CNPJ, competência

- **Datas** (`DataField`, `DataHoraField`): anos de **1850 a 2100**, sempre 4 dígitos; `menorData` / `maiorData` (`MIN_DATE` ou omitido = sem limite); o **dia da semana aparece dentro do campo**; calendário por F4 ou botão. `DataHoraField` mostra sempre os segundos (`DD/MM/AAAA HH:MI:SS`).
- **CPF**: valor numérico sem máscara (zeros à esquerda e máscara são só de exibição); validação de dígito verificador; `aceitaInvalido` (padrão `false`).
- **CNPJ**: string de 14 posições, sem máscara; **aceita o CNPJ alfanumérico da Receita** (julho/2026): as 12 primeiras posições letras ou dígitos, as 2 últimas só dígitos; o dígito verificador usa `código ASCII − 48`; `aceitaInvalido` (padrão `false`).
- **`MmAaaaField`**: valor `AAAAMM`; máscara `MM/AAAA` só de exibição; `menorCompetencia` (padrão 185001) e `maiorCompetencia` (padrão 210012); resultado `CompetenciaResultado` com `AAAA` e `MM` como strings.

### 6.4 `ComboField`

- `dominio`: string `"SP,RJ,MG"` ou array; itens vazios e repetidos são ignorados.
- Digitação **restrita ao domínio**: casa pelo começo do texto, sem diferenciar maiúscula/minúscula, e completa ao sair. Seta ou F4 abre a lista (a seta só por mouse).
- `permiteVazio` (padrão `false`): sem `value` válido, **emite o 1º item na montagem**, e esvaziar o campo bloqueia a saída.
- Resultado `ComboResultado`: `{ valor, ordem, vazio, valido, obrigatorioPendente }` (`ordem` base 1; 0 = vazio). Lógica pura em `combo.ts`.

### 6.5 `GridField`

Grid de **leitura** com ordenação no cliente. Leia `grid.types.ts` (comentários explicam cada prop) e `grid.ts` (lógica pura, com testes). Essencial:

- Entrada: `colunas` (`{coluna, tipo, mascara?, largura?, larguraMax?, colunaOrdenar?, alinhamento?, aoClicar?}`; tipos `texto | numero | data | dataHora | competencia | logico`), `cabecalhos` (mesma ordem e tamanho), `dados`, `linhasPorPagina` (**obrigatória**), `maxLinhas` (padrão e teto **3000**; acima disso corta e avisa).
- **Ordenação em várias colunas**: **duplo clique** no cabeçalho define a 1ª coluna; **clique** adiciona as próximas ou alterna asc/desc. Cores do cabeçalho indicam 1ª, demais, fora da ordem e não ordenável (`corPrimeira`, `corDemais`, `corForaDaOrdem`, `corNaoOrdenavel`). `ordenavel=false` desliga.
- `colunaOrdenar`: quando o texto exibido não ordena certo (ex.: exibe MM/AAAA, ordena por AAAAMM).
- `larguraMax`: corta o texto com "…" (o texto completo aparece ao parar o mouse).
- Linha de **detalhe** expansível: `detalhe`, `temDetalhe`, `detalheAberto` (botão +/− na 1ª coluna).
- `acoes`: botões no fim da linha (coluna "Ações", não ordena, não entra no JSON do evento; o clique no botão não aciona a linha).
- Eventos: `onLinhaAcionada(json)` (duplo clique, Enter ou F4), `onLinhaPosicionada(linha|null)` (a linha atual mudou: clique, setas, página, ordem ou dados; não repete para a mesma linha), `onLinhaContexto` (botão direito).
- `posicionarEm(linha) => bool`: ao trocar `dados`, põe o cursor na 1ª linha que satisfaz (vai à página dela); sem isso, 1ª linha. `manterOrdem`: trocar `dados` mantém ordenação e página.
- Outros: `corLinha`, `fonteRodape`, rodapé com contagem e paginação, navegação por setas.
- A formatação das células usa `FNC_FORMATA` com as máscaras das colunas (data e dataHora têm máscara padrão).

### 6.6 `LookUpField`

O mais complexo. Leia **todos** os arquivos de `lookup\` e o manual `D:\nexus\Manutencao_RFP_001_2026_FASE3\LookUpField_e_Fnc_formata\manuais\MANUAL_LookUpField.md` (e `DECISOES.md` na mesma área, quando existir: prevalece sobre a especificação).

Comportamento:

- Dois campos: **Código** (com máscara) e **Descrição** (somente leitura). Botão `...` abre o modal de pesquisa (**só por mouse**); **F4** também abre.
- A **configuração vem do objeto em tela** (`definicao`) e é enviada **a cada requisição**; o backend **não** tem cadastro por consulta.
- Tipos de consulta: `POR_LIKE` e `POR_ORDEM_ALFABETICA`. Modos do grid: `AUTOMATICA` e `COM_BOTAO_PESQUISA`.
- Código inválido (inexistente) **bloqueia a saída**; F4 e `...` ficam livres. A mensagem (`mensagemNaoExistencia`) aparece **dentro do campo Descrição**.
- Valor: `LookupCodigo` = número, texto ou `Date`; vazio = 0 / "" / `MIN_DATE`, **nunca null**. Resultado `LookUpResultado`: `{ codigo, descricao, jsonLinhaEscolhida, vazio, valido, obrigatorioPendente }`.
- Mínimo de caracteres para buscar por texto: `qtdMinimaCaracterBusca`, **nunca abaixo de 3** (piso do backend), padrão 3.
- Props úteis: `larguraGridPx` (padrão 1000, limitada à tela), `corFundoModal` (padrão branco), `mapaValores` (tradução de siglas por coluna), `mascaraGrid` (string ou função da linha), `mascaraCodigo`, `highlightDoTermoBuscado`, `larguraDescricaoPx`, `criarCacheNoClient`, `debugMode` (chama `/validacao`).
- **Filtros do modal**: texto (convertido para maiúsculas na linha abaixo), Data de nascimento (`DataField`), CPF (`CpfField`), CNPJ (`CnpjField`). Esses filtros **nunca** usam `aceitaInvalido`; só se sai (Tab/Enter) com valor vazio ou válido, e ao sair não vazio pesquisa (vazio não repesquisa).
- `filtro` (SQL complementar) fica no objeto do front e vai ao backend; **só com `base: "TABELA"`**; o backend o transforma em `AND (<filtro>)` na pesquisa e na busca por código.

**Contrato HTTP** (idêntico ao do Nexus; JSON em camelCase):

| Método e rota | Corpo | Resposta |
|---|---|---|
| `POST api/Lookup/pesquisa` | `{ definicao, texto?, dtNascto? (yyyy-MM-dd), cpf?, cnpj? }` (ao menos um critério) | `{ linhas: [...], limiteAtingido }` |
| `POST api/Lookup/codigo` | `{ definicao, valor }` | **sempre 200**: `{ situacao: "ENCONTRADO" \| "NAO_ENCONTRADO" \| "MAIS_DE_UM", codigo?, descricao?, linha? }` |
| `POST api/Lookup/validacao` | `definicao` | `{ ok, inconsistencias: [{ chave, propriedade, mensagem }] }` |

`LookupDefinicao` (enviada em cada chamada): `chave?`, `banco` (`ORACLE` \| `SQL_SERVER`, ver §8.3), `base` (`TABELA` \| `SELECT`), `nomeTabela?`, `select?`, `colunaRetorno`, `tipoColunaRetorno` (`NUMERO` \| `TEXTO` \| `DATA`), `colunaDescricao`, `colunasBasePesquisa[]`, `tipoConsulta`, `operadorNaColuna?`, `operadorEntreColunas?` (`AND` \| `OR`), `colunasGrid[{coluna, cabecalho}]`, `colunasOrderBy?[]`, `colunasAdicionais?[]`, `colunaCnpj?`, `colunaCpf?`, `colunaDtNascto?`, `qtdeLinhas?` (teto 300; padrão do backend 100), `filtro?`.

---

## 7. Erros e tratamento (front)

- Erro de negócio do backend vem como HTTP 400 `{ "error": "mensagem" }`; erro inesperado, HTTP 500 genérico com `errorId`. O componente trata e chama `onErro`, sem derrubar a tela.
- Mensagens ao usuário em português.
- A instância HTTP do consumidor pode ter um toast global de erro; os componentes enviam `skipGlobalErrorToast` (opção do config do axios) nas chamadas do Lookup, como o Nexus, para evitar toast duplicado. Documente essa convenção no manual de instalação.

---

## 8. Backend Python (`componentes_py`)

Reproduz `ApiNexus\NexusApi.Componentes\Lookup\` (`LookupDtos.cs`, `LookupController.cs`, `LookupDefinicao.cs`, `LookupValidador.cs`, `LookupSqlBuilder.cs`, `LookupSelectParser.cs`, `LookupService.cs`, `DependencyInjection.cs`) e os **testes** equivalentes (no Nexus, o módulo tem dezenas de testes; porte todos os do Lookup).

### 8.1 Módulos

| Python | Origem C# | Papel |
|---|---|---|
| `lookup/definicao.py` | `LookupDefinicao` | modelo Pydantic (camelCase via alias) |
| `lookup/dtos.py` | `LookupDtos` | requests e responses |
| `lookup/validador.py` | `LookupValidador` | valida definição e `filtro` |
| `lookup/select_parser.py` | `LookupSelectParser` | analisa o SELECT quando `base="SELECT"` |
| `lookup/sql_builder.py` | `LookupSqlBuilder` | monta o SQL parametrizado por banco |
| `lookup/servico.py` | `LookupService` | pesquisa, busca por código, validação |
| `lookup/rotas.py` | `LookupController` | `criar_roteador_lookup(config)` |
| `erros.py` | `CustomException` | `ErroNegocio` → HTTP 400 `{ "error": ... }` |

### 8.2 Regras de segurança (portar **todas**)

- `ValidarFiltro` rejeita: `;`, comentários (`--`, `/* */`), `@`, `:` (parâmetros), DML/DDL (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `MERGE`...), `INTO`, `FOR UPDATE`, pacotes de sistema (ex.: `DBMS_`, `UTL_`), parênteses/aspas desbalanceados e literais `q'..'` do Oracle. Confira a lista exata no `LookupValidador.cs` e nos testes.
- Nomes de tabela e coluna são **validados por padrão estrito** (identificadores) antes de entrar no SQL; valores do usuário (texto, CPF, CNPJ, data, código) vão **sempre como parâmetros**, nunca concatenados.
- Teto de **300 linhas** por pesquisa; padrão 100; `limiteAtingido` informa o corte.
- Piso de **3 caracteres** para pesquisa por texto.
- **Risco aceito no Nexus** (registrar no manual do backend): qualquer usuário autenticado consulta qualquer tabela/coluna visível ao usuário de banco da API. O projeto consumidor deve poder **restringir** isso: ofereça, em `ConfiguracaoLookup`, uma lista opcional de tabelas/colunas permitidas (`tabelas_permitidas`) e um gancho `autorizar(definicao, usuario)`. Padrão: sem restrição (igual ao Nexus), mas documentado.
- Erro do banco no Lookup → HTTP 400 com a mensagem **completa** do banco (inclusive o código `ORA-xxxxx`), como o Nexus.
- Erros não previstos → HTTP 500 genérico `{ "error": "...", "errorId": "<guid>" }` e log `ERRO [errorId]` com o detalhe.
- A rota exige usuário autenticado (no Nexus, `[Authorize]`): o consumidor injeta a dependência de autenticação.

### 8.3 Bancos

No Nexus, `banco` aceita `ORACLE` e `SQL_SERVER`, e as conexões vêm de fábricas por nome. Na biblioteca:

- `ConfiguracaoLookup.obter_conexao(banco: str)` é injetado pelo projeto consumidor e devolve uma conexão DB-API (`oracledb`, `pyodbc`/`pymssql`...). A biblioteca **não** cria pool nem lê credenciais.
- O `sql_builder` gera a sintaxe por dialeto: limite de linhas (`FETCH FIRST n ROWS ONLY` / `OFFSET..FETCH` / `TOP`), parâmetros (`:1` no Oracle, `?` no pyodbc), `UPPER`/`LIKE`, conversão de datas.
- Começar por **Oracle e SQL Server** (iguais ao Nexus). Estruturar o `sql_builder` com uma interface de dialeto para o usuário poder acrescentar PostgreSQL/MySQL depois. Pergunte ao usuário se o novo sistema usa outro banco **antes** da Fase 5.
- Tipos devolvidos pelo driver: o Oracle devolve `NUMBER` como inteiro/`Decimal`; normalize para `int`/`float`/`str` no JSON (e `date`/`datetime` em ISO `yyyy-MM-ddTHH:mm:ss`). Datas vazias do contrato = `0001-01-01`.

### 8.4 Execução

- Preferir **async** (FastAPI) com driver assíncrono quando existir; se o driver for síncrono, executar em `run_in_threadpool`. Defina uma única abordagem e documente.
- Sem estado global: tudo pela `ConfiguracaoLookup` injetada.

---

## 9. Testes

- **Front, lógica pura**: portar `formata.test.ts` (28 casos), `campos.test.ts`, `grid.test.ts` e os testes de `lookup.utils`. No Nexus há 83 testes passando na biblioteca: a nova deve ter **no mínimo** os mesmos casos.
- **Front, componentes**: um teste de renderização/interação por componente (digitar, sair do campo, F4, Enter, bloqueio de saída com valor inválido, `onChange` com `CampoResultado` correto).
- **Back**: portar os testes do Lookup (validador do filtro, builder de SQL por banco, parser de SELECT, serviço com banco simulado). No Nexus são dezenas; cobrir todos os casos de rejeição do filtro.
- **Contrato**: um teste que sobe a API FastAPI de exemplo e chama as três rotas com o `LookupDefinicao` dos exemplos, garantindo que o JSON do front e do back **conversam** (nomes camelCase, enums em MAIÚSCULAS).
- Critério de pronto de cada fase: testes verdes, `tsc --noEmit` limpo, lint limpo, `pytest` verde, exemplo funcionando.

---

## 10. Documentação a produzir

Em `docs/manuais/` (Markdown, português, para programadores):

- `Manual_FNC_FORMATA.md`, `Manual_DataField.md`, `Manual_DataHoraField.md`, `Manual_CpfField.md`, `Manual_CnpjField.md`, `Manual_MmAaaaField.md`, `Manual_ComboField.md`, `Manual_GridField.md`, `Manual_LookUpField.md`: props, tipos, comportamento de teclado, exemplos em TSX, armadilhas.
- `Manual_BackendLookup.md`: instalação, `ConfiguracaoLookup`, bancos, segurança, erros, exemplo FastAPI completo.
- `Manual_Instalacao.md`: usar em outro projeto (npm local/`file:`/workspace; `pip install -e`), CSS, provider, instância HTTP.
- Use como **modelo de formato** os manuais do Nexus em `D:\nexus\NexusWebApp\docs\manuais\` (visão geral, assinatura, regras, exemplos, armadilhas, como testar).
- `README.md` na raiz: o que é, estrutura, como rodar exemplos e testes.

Ao mudar comportamento de um componente, atualize o manual dele (regra do usuário: um manual por componente).

---

## 11. O que **não** copiar do Nexus

- Nada específico do cliente: marca Bensaúde, logos, textos, nomes de tabelas de negócio (`DBAPS.PESSOA`, `nexus.*`), telas (Posição de NF, Retorno Banco, Carência Padrão).
- Nada de Next.js (`"use client"` só se o usuário pedir compatibilidade; por padrão, o pacote é agnóstico: componentes com hooks funcionam em qualquer React 18+).
- Nenhuma credencial, senha, string de conexão ou nome de usuário de banco.
- Nenhum arquivo de `D:\nexus\NexusWebApp\node_modules` (foi gerado por outra máquina/plataforma).
- Exemplos e testes usam dados **fictícios** (tabela de exemplo própria, p.ex. SQLite em memória para o back de exemplo, com colunas `cd_pessoa`, `nm_pessoa`, `dt_nascimento`, `nr_cpf`, `nr_cnpj`, `tp_situacao`).

---

## 12. Plano em fases (uma por vez; pare ao fim de cada uma)

| Fase | Entrega | Pronto quando |
|---|---|---|
| **0. Esqueleto** | Estrutura de pastas (§4.1), `package.json`/`tsconfig`/build do front, `pyproject.toml` do back, `ComponentesProvider`, estilos base (`--cmp-*`), app de exemplos vazio, README | `npm run build` e `pytest` rodam (mesmo sem testes) |
| **1. Núcleo puro** | `FNC_FORMATA` + `MIN_DATE`; `datas.ts`, `documentos.ts` (CPF/CNPJ com alfanumérico), `competencia.ts`, `combo.ts`, `foco.ts` com testes portados | Todos os testes de lógica pura verdes; manual `Manual_FNC_FORMATA.md` |
| **2. Campos** | `CampoEntrada`, `DataField`, `DataHoraField` (+ `Calendario`), `CpfField`, `CnpjField`, `MmAaaaField`, `ComboField` | Exemplos funcionando; manuais; testes de interação |
| **3. Grid** | `grid.ts` (lógica pura) e `GridField` completo | Testes do `grid.test.ts` portados; exemplo com ordenação, detalhe, ações, paginação; manual |
| **4. Backend Lookup** | Pacote Python completo (§8) com testes | `pytest` verde; API de exemplo (SQLite) responde as 3 rotas |
| **5. LookUpField** | `LookUpField`, `LookUpModal`, `LookUpGrid`, `useLookupApi`; integração com o back de exemplo | Fluxo completo: digitar código, F4, `...`, pesquisa, escolha, bloqueio de código inexistente; manual |
| **6. Fechamento** | `Carregando`, revisão da API pública (`index.ts`), manuais finais, `Manual_Instalacao.md`, teste de instalação em um projeto limpo | Um projeto novo (Vite + FastAPI) usa a biblioteca só pelos manuais |

Entre as fases, apresente ao usuário: o que foi feito, o que foi testado (com saída real, sem afirmar o que não rodou), desvios do Nexus e dúvidas. Se algo não puder ser verificado (ex.: sem banco Oracle disponível), diga explicitamente.

---

## 13. Pegadinhas conhecidas (aprendidas no Nexus)

1. **Máscara numérica**: a última vírgula é o decimal. `999,999,999` vira `123,456,000`; use `999.999.999`.
2. **`MIN_DATE`** com `setFullYear(1, 0, 1)`; `JSON.stringify(MIN_DATE)` pode sair com horário deslocado pelo fuso: definir uma convenção de envio de "data vazia" (a API recebe/devolve `0001-01-01T00:00:00`) e documentar.
3. **ISO sem deslocamento de fuso** no `FNC_FORMATA` (lê os componentes como escritos).
4. **Oracle devolve `NUMBER` como `Int16`/`Decimal`** (no .NET) ou `int`/`Decimal` (no Python): normalizar no JSON.
5. **Coluna `CHAR(n)`** no Oracle vem com espaços à direita: aplicar `TRIM` ao comparar/mostrar códigos.
6. **Upload com axios**: o `api` usa JSON por padrão; se a biblioteca vier a ter upload, exige `Content-Type: multipart/form-data`.
7. **`window.open`** só vale no clique direto do usuário (relevante se um exemplo abrir PDF/relatório).
8. **`WebUtility.HtmlEncode`/escapes**: se gerar HTML no back, use escape próprio que preserve acentos.
9. **Texto em maiúsculas** nos filtros do modal do Lookup: mostrado na linha abaixo, sem alterar o que o usuário digitou.
10. **Bloqueio de saída com erro** não pode prender o usuário: Esc/F4/botões continuam livres e o campo vazio sempre sai.
11. **Datas**: anos fora de 1850–2100 são rejeitados; sempre 4 dígitos.
12. **GridField com 3000 linhas**: ordenar e paginar sem travar a tela (memoizar a ordenação; renderizar só a página atual).

---

## 14. Entrega final esperada

- `D:\Componentes_React_Python` com front e back funcionando, testes verdes, manuais completos e exemplos.
- Um parágrafo no `README.md` explicando como levar a biblioteca a um novo projeto.
- Lista final de **diferenças em relação ao Nexus** e de **melhorias sugeridas**, para o usuário decidir.
- **Não** fazer `git init`, commit ou push sem o usuário pedir.
