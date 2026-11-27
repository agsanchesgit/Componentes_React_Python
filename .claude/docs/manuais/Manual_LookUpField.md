# Manual: LookUpField

Campo **Código** + **Descrição** (somente leitura) + botão **...** que abre um modal de pesquisa. A configuração da consulta (banco, tabela ou SELECT, colunas, filtros) vem do **objeto em tela** (`definicao`) e é enviada ao backend a cada requisição: não há cadastro por consulta. Precisa do `ComponentesProvider` e do backend Python (`Manual_BackendLookup.md`).

---

## 1. Uso mínimo

```tsx
import { ComponentesProvider, LookUpField, type LookupCodigo, type LookupDefinicao } from "@componentes/react";
import "@componentes/react/estilos.css";

const definicaoPessoa: LookupDefinicao = {
  chave: "pessoa",
  banco: "POSTGRESQL",                       // ORACLE | SQL_SERVER | POSTGRESQL
  base: "TABELA",
  nomeTabela: "cadastro.pessoa",
  colunaRetorno: "cd_pessoa",
  tipoColunaRetorno: "NUMERO",
  colunaDescricao: "nm_pessoa",
  colunasBasePesquisa: ["nm_pessoa"],
  tipoConsulta: "POR_LIKE",
  colunasGrid: [
    { coluna: "cd_pessoa", cabecalho: "Código" },
    { coluna: "nm_pessoa", cabecalho: "Nome" },
  ],
  colunasOrderBy: ["nm_pessoa"],
};

const [pessoa, setPessoa] = useState<LookupCodigo>(0);

<ComponentesProvider api={minhaApi}>          {/* uma vez, no layout */}
  <LookUpField
    label="Pessoa"
    definicao={definicaoPessoa}
    value={pessoa}                            // número, texto ou Date; vazio = 0 / "" / MIN_DATE
    onChange={(r) => setPessoa(r.codigo)}
    tituloPesquisa="Pesquisar pessoa"
    tipoRefreshGrid="AUTOMATICA"
    obrigatorio
    mensagemNaoExistencia="Pessoa não cadastrada"
  />
</ComponentesProvider>
```

A instância HTTP (`minhaApi`) é a do seu projeto (axios etc.) e deve ter a `baseURL` apontando para onde o backend incluiu o roteador: com `prefix="/api/Lookup"`, use `baseURL: "/api/"` (as chamadas saem como `POST {baseURL}Lookup/pesquisa`). Para outro prefixo: `<ComponentesProvider caminhoLookup="v2/consulta">`.

## 2. Props

### Obrigatórias

| Prop | Descrição |
|---|---|
| `definicao` | `LookupDefinicao` (§3) |
| `value` / `onChange` | Controlado. `value`: número, texto ou `Date` (conforme `tipoColunaRetorno`); vazio = `0`, `""` ou `MIN_DATE`, **nunca null** |
| `tituloPesquisa` | Título do modal |
| `tipoRefreshGrid` | `AUTOMATICA` (pesquisa ao digitar, com debounce de 300 ms) ou `COM_BOTAO_PESQUISA` |
| `obrigatorio` | Mostra `*` e preenche `obrigatorioPendente`. **Nunca bloqueia vazio** |
| `mensagemNaoExistencia` | Texto mostrado no campo Descrição quando o código não existe |

### Opcionais

| Prop | Padrão | Descrição |
|---|---|---|
| `label`, `placeholder`, `id`, `className` | — | |
| `enabled` | `"ENABLE"` | `"ENABLE" \| "DISABLED" \| "READONLY"`. Fora de `ENABLE`, F4 e o botão não abrem o modal |
| `qtdMinimaCaracterBusca` | 3 | Mínimo para buscar **só por texto**. **Nunca abaixo de 3** (piso do backend). Sem efeito com `definicao.pesquisarAoAbrir` |
| `larguraCampo` | 9rem | Largura do Código, em caracteres |
| `larguraDescricaoPx` | resto da linha | Largura da Descrição, em pixels |
| `mascaraCodigo` | — | Máscara do `FNC_FORMATA` para o Código, aplicada **fora do foco** e com o código válido |
| `mascaraGrid` | — | `{ coluna: "máscara" }` ou `{ coluna: (linha) => máscara }` (ex.: CPF x CNPJ conforme o tipo) |
| `mapaValores` | — | Tradução de siglas por coluna: `{ tp_situacao: { A: "Ativo", I: "Inativo" } }` (vale antes da máscara) |
| `highlightDoTermoBuscado` | `false` | Marca no grid as palavras pesquisadas |
| `larguraGridPx` | 1000 | Largura do modal (limitada à tela) |
| `corFundoModal` | branco | Cor de fundo do modal |
| `criarCacheNoClient` | `false` | Cache em memória por instância (10 min) das consultas idênticas |
| `debugMode` | `false` | Chama `/validacao` uma vez (avisa inconsistências no `console.warn`) e loga cada chamada no `console.debug` |
| `onLoadingChange` | — | `(carregando) => void` |
| `onErro` | — | Erro de consulta (a mensagem já aparece no campo; isto é para o seu log/toast) |

### Resultado (`LookUpResultado`)

`onChange` recebe `{ codigo, descricao, jsonLinhaEscolhida, vazio, valido, obrigatorioPendente }`.

| Campo | Observação |
|---|---|
| `codigo` | Tipado como o `value`; vazio = `0` / `""` / `MIN_DATE` |
| `descricao` | Texto da `colunaDescricao` |
| `jsonLinhaEscolhida` | A linha inteira (`{coluna: valor}`, inclusive `colunasAdicionais`); `null` quando vazio ou inválido |
| `valido` | `false` quando o código digitado não existe (o campo bloqueia a saída) |
| `obrigatorioPendente` | `obrigatorio && vazio` |

## 3. `LookupDefinicao`

| Propriedade | Descrição |
|---|---|
| `chave?` | Identificação opcional (mensagens e log) |
| `banco` | `ORACLE`, `SQL_SERVER`, `POSTGRESQL` (`SQLITE` só para testes/exemplo) |
| `base` | `TABELA` (usa `nomeTabela`) ou `SELECT` (usa `select`, que vira sub-consulta) |
| `nomeTabela?`, `select?` | Conforme a `base` |
| `colunaRetorno` | Coluna do código; `tipoColunaRetorno`: `NUMERO`, `TEXTO` ou `DATA` |
| `colunaDescricao` | Coluna que preenche a Descrição |
| `colunasBasePesquisa[]` | Colunas pesquisadas pelo texto |
| `tipoConsulta` | `POR_LIKE` (cada palavra vira `LIKE %p%`) ou `POR_ORDEM_ALFABETICA` (`>=` o texto; só 1 coluna) |
| `operadorNaColuna?` / `operadorEntreColunas?` | `AND`/`OR` (padrões `AND` entre palavras da mesma coluna e `OR` entre colunas) |
| `colunasGrid[{coluna, cabecalho}]` | Colunas do grid do modal |
| `colunasOrderBy?[]` | `["NM_PESSOA", "DT_X DESC"]` |
| `colunasAdicionais?[]` | Colunas devolvidas sem aparecer no grid (úteis em `mascaraGrid` por função) |
| `colunaCpf?`, `colunaCnpj?`, `colunaDtNascto?` | Ligam os filtros extras do modal |
| `qtdeLinhas?` | 1 a 300 (padrão 100) |
| `pesquisarAoAbrir?` | O modal já abre listando (até `qtdeLinhas`) e o texto filtra sem mínimo de caracteres; precisa do gancho `permitir_pesquisa_ao_abrir` no backend (`Manual_BackendLookup.md`) |
| `filtro?` | SQL complementar, **só com `base: "TABELA"`**: `" and tp_situacao = 'A' "`. Vale na pesquisa e na busca por código |

O backend valida a definição a cada chamada e responde 400 com a lista completa de problemas (ver `Manual_BackendLookup.md` §7 para as regras de segurança).

## 4. Comportamento

### Campo Código

- Digitação: `NUMERO` só aceita dígitos; `TEXTO` vira maiúsculo; `DATA` ganha a máscara `DD/MM/AAAA` (e vai ao backend nesse formato).
- **Ao sair** (Tab, Enter, ↓, clique fora) o código é consultado (`/codigo`):
  - encontrado: mostra a descrição, emite `onChange` válido;
  - **inexistente**: a `mensagemNaoExistencia` aparece **no campo Descrição**, `onChange` vem com `valido: false` e `codigo` vazio, e o campo **não deixa sair** até ficar vazio ou receber um código válido;
  - **mais de um registro**: `RETORNOU MAIS DE UM REGISTRO`, mesmo bloqueio;
  - **erro de consulta** (rede, 400 do banco): a mensagem do backend aparece no campo, `onErro` é chamado e a saída **não** é bloqueada.
- **F4** e o botão **...** continuam livres mesmo com código inválido. O botão fica fora da ordem de Tab (só mouse ou F4).
- **Vazio nunca bloqueia**: esvaziar emite `{ vazio: true, valido: true }`.
- **Enter** e **↓** = Tab; **↑** = Shift+Tab.
- Valor inicial ou trocado por fora (ex.: reset do formulário): a descrição é refeita **sem** emitir `onChange` e sem bloquear.

### Modal de pesquisa

- Título, filtros extras (só os que a definição declara), campo **Pesquisar** (texto) com o mínimo de caracteres, grid, **Cancelar** e **Selecionar**. Cada abertura começa **em branco** (com `pesquisarAoAbrir`, os campos em branco e a lista já carregada; o campo Pesquisar mostra "Digite para filtrar"). O foco vai ao primeiro campo: data de nascimento → CPF → CNPJ → texto.
- **Texto**: convertido para **maiúsculas** na própria caixa. `AUTOMATICA` pesquisa 300 ms depois de parar de digitar; `COM_BOTAO_PESQUISA` pesquisa no botão **Pesquisar** ou no **Enter** do texto.
- **Filtros extras** (data de nascimento, CPF, CNPJ — são os campos `DataField`, `CpfField` e `CnpjField`): ao sair de um filtro **preenchido e válido**, pesquisa **na hora**, em qualquer `tipoRefreshGrid`, **sem exigir texto**. Combinam com o texto por AND. Filtro inválido não pesquisa (e não deixa sair). Filtro vazio não repesquisa. Os filtros **nunca** aceitam valor inválido.
- **Grid**: ↑/↓ mudam a linha, **Enter** escolhe (em `COM_BOTAO_PESQUISA`, o Enter no texto pesquisa, a menos que você já tenha navegado no grid), **duplo clique** escolhe, **Selecionar** escolhe a linha atual.
- Esc fecha (se um calendário estiver aberto, o Esc fecha só ele), clique no fundo escuro fecha, o Tab fica preso no modal. **Cancelar/Esc devolvem o foco ao Código sem alterar nada.**
- `limiteAtingido` mostra `Mostrando as primeiras N linhas. Refine a pesquisa.`; sem resultado, `Nenhum registro encontrado.`; erro de pesquisa aparece no modal.

## 5. Exemplos

**Siglas e máscara por linha** (SELECT com colunas adicionais):

```tsx
<LookUpField
  definicao={{
    ...base,
    colunasGrid: [{ coluna: "CD_PRESTADOR", cabecalho: "Código" }, { coluna: "NM_FANTASIA", cabecalho: "Nome" },
                  { coluna: "TP_SITUACAO", cabecalho: "Situação" }, { coluna: "NR_CPF_CGC", cabecalho: "CPF/CNPJ" }],
    colunasAdicionais: ["TP_PRESTADOR"],
    colunaCpf: "NR_CPF_CGC", colunaCnpj: "NR_CPF_CGC",
  }}
  mapaValores={{ TP_SITUACAO: { A: "Ativo", I: "Inativo", S: "Suspenso" } }}
  mascaraGrid={{ NR_CPF_CGC: (l) => (l.TP_PRESTADOR === "J" ? "ZZ.ZZZ.ZZZ/ZZZZ-ZZ" : "ZZZ.ZZZ.ZZZ-ZZ") }}
  ...
/>
```

**Filtro fixo**: `definicao={{ ...base, filtro: " and tp_situacao = 'A' " }}`.

**Obrigatório no submit**:

```tsx
const [resultado, setResultado] = useState<LookUpResultado | null>(null);
// no submit:
if (resultado?.obrigatorioPendente || resultado?.valido === false) { /* avisar o usuário */ }
```

## 6. Erros e toast global

Os componentes enviam `skipGlobalErrorToast: true` nas chamadas do Lookup. Se a sua instância HTTP tem um toast global de erro, faça-o respeitar essa opção para não duplicar a mensagem (o erro já aparece no campo e em `onErro`).

## 7. Armadilhas

1. **Backend e `baseURL`**: o 404 mais comum é prefixo errado. O front chama `{baseURL}Lookup/...` (ou `caminhoLookup`); o backend inclui o roteador com o `prefix` escolhido.
2. **`definicao` é enviada inteira a cada chamada** (inclusive o `select` e o `filtro`): trate-a como configuração do desenvolvedor, nunca monte-a com texto digitado pelo usuário.
3. **Troque o banco** na definição (`banco`) conforme o ambiente: ele define a sintaxe do SQL e qual conexão o backend abre.
4. `value` deve ter o **tipo da coluna de retorno** (número para `NUMERO`; `Date` para `DATA`). Um `0` num campo `TEXTO` não é vazio.
5. O bloqueio de saída com código inválido só vale para o **Tab/clique fora**; o usuário sempre pode esvaziar o campo, usar F4 ou o botão.
6. Colunas `CHAR(n)` do Oracle vêm com espaços à direita: use `TRIM()` no `select` ou na máscara.
7. Dois lookups abertos ao mesmo tempo não existem (o modal é único por vez); os ids internos do modal (`lk-*`) são fixos.

## 8. Como testar

```powershell
cd frontend
npm test                    # 163 testes (+ 7 de integração ignorados sem a API)
```

**Integração com a API Python real** (renderiza o campo contra o FastAPI + SQLite de exemplo):

```powershell
# terminal 1
cd backend
.venv\Scripts\python -m uvicorn exemplos.api_exemplo:app --port 8123
# terminal 2
cd frontend
$env:URL_BACK_EXEMPLO="http://localhost:8123"; npx vitest run src/lookup/LookUpField.integracao.test.tsx
```

**Exemplo manual no navegador** (`LookUpField` na página de exemplos):

```powershell
cd backend;  .venv\Scripts\python -m uvicorn exemplos.api_exemplo:app --port 8100
cd frontend; npm run exemplos        # o Vite encaminha /api para a porta 8100 (API_EXEMPLO muda o destino)
```
