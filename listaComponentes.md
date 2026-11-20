# Lista de componentes e parâmetros

> **Para o Claude:** este arquivo é o catálogo da biblioteca de componentes reutilizáveis (React/TypeScript + Python/FastAPI). Leia-o inteiro para saber **quais componentes existem e quais parâmetros (props) cada um aceita**. Para **implementar** um componente num projeto, leia depois o `OrientarImplementacao.md` (seção do componente). Manuais detalhados: `.claude/docs/manuais/`.

- Pacote front: `@componentes/react` (importe **só** dele). Pacote back: `componentes_py` (só para o `LookUpField`).
- Valores **vazios nunca são `null`**: data = `MIN_DATE`, número = `0`, texto = `""`.
- Os nomes das props estão em português e são **exatos** (diferenciam maiúsculas).

## Índice

| # | Item | Tipo |
|---|---|---|
| 1 | `ComponentesProvider` | infraestrutura (1 vez no projeto) |
| 2 | `FNC_FORMATA` e `MIN_DATE` | função e constante |
| 3 | Props comuns dos campos (`CampoBaseProps`) e resultado (`CampoResultado`) | base de 2 a 8 |
| 4 | `DataField` | campo |
| 5 | `DataHoraField` | campo |
| 6 | `CpfField` | campo |
| 7 | `CnpjField` | campo |
| 8 | `MmAaaaField` | campo |
| 9 | `ComboField` | campo |
| 10 | `GridField` | grid de consulta |
| 11 | `LookUpField` + `LookupDefinicao` | campo de pesquisa (precisa do backend) |
| 12 | `Carregando` | tela de espera |
| 13 | Backend: `ConfiguracaoLookup` e `criar_roteador_lookup` | Python |

---

## 1. `ComponentesProvider`

Entrega à biblioteca a instância HTTP do projeto. Monte **uma vez**, no ponto de entrada/layout. Obrigatório para o `LookUpField`; os demais componentes não fazem chamada HTTP.

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `api` | `ApiHttp` | sim | — | Instância HTTP do projeto: qualquer objeto com `post(url, corpo, opcoes)` e `get(url, opcoes)` que devolvam `{ data }`. Uma instância **axios** serve direto. Token, refresh e toasts ficam nela, não na biblioteca |
| `caminhoLookup` | `string` | não | `"Lookup"` | Caminho das rotas do Lookup relativo à `baseURL` da instância. Chamadas: `POST {baseURL}{caminhoLookup}/pesquisa`, `/codigo`, `/validacao`. Mude se o backend incluiu o roteador com outro prefixo |
| `children` | `ReactNode` | — | — | A aplicação |

Também exporta os hooks `useComponentesApi()` e `useComponentesCaminhoLookup()` (uso interno/avançado).
CSS (uma vez): `import "@componentes/react/estilos.css";`

---

## 2. `FNC_FORMATA(variavel, mascara)` e `MIN_DATE`

`FNC_FORMATA` formata número, texto ou data/hora por máscara. Função pura, devolve `string`.

| Parâmetro | Tipo | Explicação |
|---|---|---|
| `variavel` | `number \| string \| Date \| null \| undefined` | Valor a formatar. `null`/`undefined` dão o "vazio" da máscara |
| `mascara` | `string` | Tokens: `9` dígito (falta = branco), `Z` dígito (falta = `0`), `A` letra ou dígito, `DD` `MM` `AAAA` `HH` `MI` `SS` data/hora, outro caractere = literal, **`0` é inválido** (lança `Error`). Em máscara numérica, **a última vírgula é o separador decimal** (`999.999,99`) |

Exemplos: `FNC_FORMATA(1234.5, "999.999,99")` → `'  1.234,50'` · `FNC_FORMATA(345678912, "ZZZ.ZZZ.ZZZ-ZZ")` → `'003.456.789-12'` · `FNC_FORMATA("2026-05-10", "DD/MM/AAAA")` → `'10/05/2026'` · `FNC_FORMATA(null, "DD/MM/AAAA")` → `'__/__/____'`.
Valor que não cabe na máscara volta sem formatação (sem erro).

`MIN_DATE` (`Date`): o "vazio" de data (0001-01-01). Nunca crie com `new Date(1, 0, 1)` (vira 1901). Data de ano 1 é tratada como vazia.

---

## 3. Base comum dos campos

### Props comuns (`CampoBaseProps`) — valem para os componentes 4 a 9

| Parâmetro | Tipo | Padrão | Explicação |
|---|---|---|---|
| `label` | `string` | — | Rótulo do campo |
| `obrigatorio` | `boolean` | `false` | Mostra `*` e preenche `obrigatorioPendente` no resultado. **Nunca bloqueia a saída do campo**: o projeto trata no submit |
| `enabled` | `"ENABLE" \| "DISABLED" \| "READONLY"` | `"ENABLE"` | Editável, desabilitado ou somente leitura (sem botão do painel nem F4) |
| `placeholder` | `string` | do componente | Texto de dica |
| `larguraCampo` | `number` | do componente | Largura do campo **em caracteres** |
| `id` | `string` | gerado | Id do `<input>` (a biblioteca gera um se omitido) |
| `className` | `string` | — | Classe CSS extra no contêiner |

### Resultado entregue ao `onChange` (`CampoResultado<T>`)

| Campo | Explicação |
|---|---|
| `valor` | O valor, do tipo do campo. **Nunca `null`** |
| `vazio` | `true` quando o campo está vazio |
| `valido` | `false` quando o texto digitado é inválido (o campo bloqueia a saída e `valor` vem vazio — não grave) |
| `obrigatorioPendente` | `obrigatorio && vazio` |

### Comportamento comum

Máscara ao digitar; ao sair completa e valida; **texto inválido bloqueia a saída** (mensagem ao lado, campo vermelho, foco volta); **vazio nunca bloqueia**. Enter e ↓ = Tab; ↑ = Shift+Tab; **F4** abre o painel (calendário/lista); Esc fecha. O `onChange` **não** dispara a cada tecla: só ao sair do campo, ao esvaziar o texto ou ao escolher no painel. O campo é controlado: acompanha o `value` quando o projeto o troca.

---

## 4. `DataField` — data `DD/MM/AAAA` com calendário

Props comuns +

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `value` | `Date` | sim | — | Valor. Vazio = `MIN_DATE` |
| `onChange` | `(r: CampoResultado<Date>) => void` | sim | — | `r.valor` é `MIN_DATE` quando vazio |
| `menorData` | `Date` | não | sem limite | Menor data aceita (compara só o **dia**). `MIN_DATE`/omitido = sem limite (piso real: 01/01/1850) |
| `maiorData` | `Date` | não | sem limite | Maior data aceita (só o dia). Teto real: 31/12/2100 |

Largura padrão 12; placeholder `DD/MM/AAAA`. Aceita 1850 a 2100, ano com 4 dígitos. Mostra o dia da semana `(dom)` dentro do campo depois de sair. F4/botão abre o calendário.

## 5. `DataHoraField` — data e hora `DD/MM/AAAA HH:MI:SS`

Mesmas props do `DataField` (`value: Date`, `onChange`, `menorData`, `maiorData`). Diferenças: largura padrão 19; **sempre com segundos**; `menorData`/`maiorData` comparam **data e hora completas**; o painel (F4/botão) tem calendário + hora/minuto/segundo + botão Aplicar.

## 6. `CpfField` — CPF

Props comuns +

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `value` | `number` | sim | — | CPF **numérico sem máscara** (`374287813`). Vazio = `0`. Zeros à esquerda e máscara são só de exibição |
| `onChange` | `(r: CampoResultado<number>) => void` | sim | — | `r.valor` numérico; vazio = `0` |
| `aceitaInvalido` | `boolean` | não | `false` | `true` deixa sair com dígito verificador inválido |

Largura padrão 12. Ao sair completa com zeros (11 dígitos). Dígito inválido: `CPF com dígito inválido` e bloqueia. F4 não faz nada.

## 7. `CnpjField` — CNPJ (numérico ou alfanumérico)

Props comuns +

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `value` | `string` | sim | — | **String de 14 caracteres sem máscara** (`"02849393000145"`). Vazio = `""`. Mantenha como string (aceita letras nas 12 primeiras posições) |
| `onChange` | `(r: CampoResultado<string>) => void` | sim | — | `r.valor` com 14 caracteres; vazio = `""` |
| `aceitaInvalido` | `boolean` | não | `false` | `true` deixa sair com dígito verificador inválido |

Largura padrão 16. Aceita o CNPJ alfanumérico da Receita. Ao sair completa com zeros (14). Dígito inválido: `CNPJ com dígito inválido`.

## 8. `MmAaaaField` — competência (mês/ano)

Props comuns +

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `value` | `string` | sim | — | Competência **`AAAAMM`** (`"202610"`). Vazio = `""`. A máscara `MM/AAAA` é só de exibição |
| `onChange` | `(r: CompetenciaResultado) => void` | sim | — | Além dos campos comuns, traz `AAAA` (ano, 4 dígitos) e `MM` (mês, 2 dígitos), strings; `""` se vazio |
| `menorCompetencia` | `string` | não | `"185001"` | Menor competência aceita (`AAAAMM`). Formato inválido = padrão |
| `maiorCompetencia` | `string` | não | `"210012"` | Maior competência aceita (`AAAAMM`) |

Largura padrão 7. Erros: `Competência inválida (use MM/AAAA)`, `Mês inválido (01 a 12)`, `Competência fora da faixa (...)`.

## 9. `ComboField` — lista de domínio

Props comuns +

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `value` | `string` | sim | — | Valor igual a um item do domínio (grafia da lista). Vazio = `""` |
| `onChange` | `(r: ComboResultado) => void` | sim | — | Além dos campos comuns, traz `ordem`: posição do item **base 1** (`0` = vazio) |
| `dominio` | `string \| readonly string[]` | sim | — | `"SP,RJ,MG"` ou array. Itens vazios e repetidos são ignorados. Se for array, passe referência estável |
| `permiteVazio` | `boolean` | não | `false` | `false`: sem `value` válido **emite o 1º item na montagem** e esvaziar o texto bloqueia a saída. `true`: pode ficar vazio (a lista mostra `(vazio)`) |

Largura padrão: o maior item. Digitação restrita ao domínio, casa pelo começo e completa ao sair. Seta (só mouse) ou F4 abre a lista.

---

## 10. `GridField` — grid de consulta (leitura)

Ordenação no cliente em várias colunas, paginação, detalhe expansível, ações e eventos de linha. Não é um campo (sem `value`/`onChange`).

### Props

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `colunas` | `GridColuna[]` | sim | — | Definição das colunas (tabela abaixo) |
| `cabecalhos` | `string[]` | sim | — | Títulos, **mesma ordem e tamanho** de `colunas` |
| `dados` | `GridLinha[]` | sim | — | Linhas: objetos `{ coluna: valor }`. Mantenha a referência estável (nova referência = "dados novos": reinicia ordem/página) |
| `linhasPorPagina` | `number` | **sim** | — | Inteiro > 0. Sem ela, o grid mostra um erro no lugar da tabela |
| `maxLinhas` | `number` | não | `3000` | Teto de linhas (máx. 3000); acima disso corta e avisa no rodapé |
| `ordenavel` | `boolean` | não | `true` | `false`: cabeçalho cinza e sem ordenar |
| `onLinhaAcionada` | `(linha) => void` | não | — | Duplo clique, Enter ou F4 na linha atual. Recebe uma **cópia** da linha |
| `onLinhaPosicionada` | `(linha \| null) => void` | não | — | A linha atual mudou (clique, setas, página, ordem, dados). Não repete a mesma linha; `null` se não há linhas. **Dispara também na 1ª carga** |
| `onLinhaContexto` | `(linha) => void` | não | — | Botão direito na linha (o menu do navegador não abre) |
| `posicionarEm` | `(linha) => boolean` | não | — | Ao trocar `dados`, põe o cursor na 1ª linha que satisfaz e vai à página dela; senão, 1ª linha |
| `manterOrdem` | `boolean` | não | `false` | `true`: trocar `dados` mantém ordenação e página |
| `detalhe` | `(linha) => ReactNode` | não | — | Conteúdo expansível abaixo da linha (botão `+`/`−` na 1ª coluna). Sem esta prop, não há botão |
| `temDetalhe` | `(linha) => boolean` | não | todas | Decide quais linhas têm detalhe (as demais ficam com o botão desabilitado) |
| `detalheAberto` | `boolean` | não | `false` | Abre (`true`) todos os detalhes ao carregar `dados` e ao mudar o valor |
| `acoes` | `GridAcao[]` | não | — | Botões no fim da linha, coluna "Ações" (não ordena, não entra no JSON dos eventos) |
| `corLinha` | `(linha) => string \| undefined` | não | — | Cor de fundo CSS da linha (`"#fde2e2"`) |
| `fonteRodape` | `string` | não | `0.75rem` | Tamanho da fonte do rodapé (contagem e paginação) |
| `corPrimeira` | `string` | não | `rgb(0,0,255)` | Cor do cabeçalho da 1ª coluna da ordem |
| `corDemais` | `string` | não | `rgb(0,0,225)` | Cor do cabeçalho das demais colunas da ordem |
| `corForaDaOrdem` | `string` | não | `rgb(0,0,200)` | Cor do cabeçalho de colunas fora da ordem |
| `corNaoOrdenavel` | `string` | não | `rgb(40,40,40)` | Cor do cabeçalho com `ordenavel=false` |
| `className` | `string` | não | — | Classe extra no contêiner |

### `GridColuna`

| Propriedade | Tipo | Obrig. | Explicação |
|---|---|---|---|
| `coluna` | `string` | sim | Nome da propriedade em cada linha (e no JSON dos eventos) |
| `tipo` | `"texto" \| "numero" \| "data" \| "dataHora" \| "competencia" \| "logico"` | sim | Define ordenação, alinhamento e formatação. `logico`: `true`/`"S"`/`"true"`/`1` mostram "Sim", o resto "Não" |
| `mascara` | `string \| (linha) => string \| undefined` | não | Máscara do `FNC_FORMATA` para exibir a célula; função permite variar por linha (CPF x CNPJ). `data`/`dataHora` já têm máscara padrão |
| `largura` | `number` | não | Largura mínima em caracteres |
| `larguraMax` | `number` | não | Corta o texto com "…" além deste tamanho (o texto completo aparece ao parar o mouse) |
| `colunaOrdenar` | `string` | não | Propriedade usada para ordenar no lugar da própria coluna (exibe `MM/AAAA`, ordena por `AAAAMM`) |
| `alinhamento` | `"esquerda" \| "centro" \| "direita"` | não | Padrão: número à direita; data/dataHora/competência/lógico ao centro; texto à esquerda |
| `aoClicar` | `(linha) => void` | não | A célula vira link; o clique chama a função (não aciona a linha). Célula vazia não vira link |

### `GridAcao`

| Propriedade | Tipo | Obrig. | Explicação |
|---|---|---|---|
| `rotulo` | `string` | sim | Tooltip e texto para leitor de tela (também a chave do botão: não repita) |
| `icone` | `ReactNode` | sim | Conteúdo do botão (SVG, emoji, ícone de outra biblioteca) |
| `aoClicar` | `(linha) => void` | sim | Chamado com uma cópia da linha; **não** aciona a linha (mas a posiciona) |
| `className` | `string` | não | Classe do botão |

Teclado (com o foco no grid): ↑/↓ linha, PageUp/PageDown página, Enter/F4 aciona, Espaço abre/fecha o detalhe. Cabeçalho: **clique** adiciona a coluna à ordem ou alterna asc/desc; **duplo clique** reinicia com a coluna.

---

## 11. `LookUpField` — pesquisa por código com modal (precisa do backend e do Provider)

Campo Código + Descrição (somente leitura) + botão `...`. A configuração da consulta vem do objeto `definicao`, enviado a cada requisição.

### Props

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `definicao` | `LookupDefinicao` | sim | — | Configuração da consulta (tabela abaixo) |
| `value` | `number \| string \| Date` | sim | — | Código atual, **do tipo da coluna de retorno** (`NUMERO` → number, `TEXTO` → string, `DATA` → Date). Vazio = `0` / `""` / `MIN_DATE`. Um `0` num campo `TEXTO` **não** é vazio |
| `onChange` | `(r: LookUpResultado) => void` | sim | — | Resultado (abaixo) |
| `tituloPesquisa` | `string` | sim | — | Título do modal |
| `tipoRefreshGrid` | `"AUTOMATICA" \| "COM_BOTAO_PESQUISA"` | sim | — | `AUTOMATICA`: pesquisa ao digitar (debounce 300 ms). `COM_BOTAO_PESQUISA`: botão Pesquisar ou Enter no texto |
| `obrigatorio` | `boolean` | sim | — | Mostra `*` e preenche `obrigatorioPendente`. Nunca bloqueia vazio |
| `mensagemNaoExistencia` | `string` | sim | — | Texto mostrado no campo Descrição quando o código não existe |
| `qtdMinimaCaracterBusca` | `number` | não | `3` | Mínimo de caracteres para buscar **só por texto**. Nunca abaixo de 3 (piso do backend) |
| `enabled` | `"ENABLE" \| "DISABLED" \| "READONLY"` | não | `"ENABLE"` | Fora de `ENABLE`, F4 e o botão não abrem o modal |
| `label` | `string` | não | — | Rótulo |
| `placeholder` | `string` | não | — | Dica do campo Código |
| `larguraCampo` | `number` | não | `9rem` | Largura do Código, em caracteres |
| `larguraDescricaoPx` | `number` | não | resto da linha | Largura da Descrição, em pixels |
| `mascaraCodigo` | `string` | não | — | Máscara do `FNC_FORMATA` do Código, aplicada **fora do foco** com o código válido |
| `mascaraGrid` | `Record<string, string \| (linha) => string \| undefined>` | não | — | Máscara por coluna do grid do modal; função permite variar por linha |
| `mapaValores` | `Record<string, Record<string, string>>` | não | — | Tradução de siglas por coluna: `{ tp_situacao: { A: "Ativo", I: "Inativo" } }` (vale antes da máscara) |
| `highlightDoTermoBuscado` | `boolean` | não | `false` | Marca no grid as palavras pesquisadas |
| `larguraGridPx` | `number` | não | `1000` | Largura do modal (limitada à tela) |
| `corFundoModal` | `string` | não | `rgb(255, 255, 255)` | Cor de fundo do modal |
| `criarCacheNoClient` | `boolean` | não | `false` | Cache em memória (10 min) das consultas idênticas |
| `debugMode` | `boolean` | não | `false` | Chama `/validacao` uma vez (avisa inconsistências no console) e loga cada chamada |
| `onLoadingChange` | `(carregando: boolean) => void` | não | — | Início/fim das consultas |
| `onErro` | `(erro: unknown) => void` | não | — | Erro de consulta (a mensagem já aparece no campo; use para log/toast) |
| `id`, `className` | `string` | não | — | Id do campo Código; classe extra |

### `LookUpResultado` (entregue ao `onChange`)

| Campo | Explicação |
|---|---|
| `codigo` | Código no tipo da coluna; vazio = `0`/`""`/`MIN_DATE` |
| `descricao` | Texto da `colunaDescricao` |
| `jsonLinhaEscolhida` | A linha inteira (`{coluna: valor}`, inclui `colunasAdicionais`); `null` se vazio/inválido |
| `vazio` | Campo vazio |
| `valido` | `false` quando o código digitado não existe (o campo bloqueia a saída; F4 e `...` continuam livres) |
| `obrigatorioPendente` | `obrigatorio && vazio` |

### `LookupDefinicao` (a propriedade `definicao`)

| Propriedade | Tipo | Obrig. | Explicação |
|---|---|---|---|
| `chave` | `string` | não | Identificação para mensagens e log |
| `banco` | `"ORACLE" \| "SQL_SERVER" \| "POSTGRESQL"` (`"SQLITE"` só testes/exemplo) | sim | Define a sintaxe do SQL e qual conexão o backend abre |
| `base` | `"TABELA" \| "SELECT"` | sim | `TABELA` usa `nomeTabela`; `SELECT` usa `select` (vira sub-consulta) |
| `nomeTabela` | `string` | com `TABELA` | Tabela (`schema.tabela` aceito) |
| `select` | `string` | com `SELECT` | Uma única instrução SELECT, sem `*`, sem `;`/comentários/DML |
| `colunaRetorno` | `string` | sim | Coluna do código |
| `tipoColunaRetorno` | `"NUMERO" \| "TEXTO" \| "DATA"` | sim | Tipo do código (define o tipo de `value`) |
| `colunaDescricao` | `string` | sim | Coluna que preenche a Descrição |
| `colunasBasePesquisa` | `string[]` | sim | Colunas pesquisadas pelo texto |
| `tipoConsulta` | `"POR_LIKE" \| "POR_ORDEM_ALFABETICA"` | sim | `POR_LIKE`: cada palavra vira `LIKE %p%`. `POR_ORDEM_ALFABETICA`: `>=` o texto, ordenado (só 1 coluna em `colunasBasePesquisa`) |
| `operadorNaColuna` | `"AND" \| "OR"` | não | Entre as palavras da mesma coluna (padrão `AND`) |
| `operadorEntreColunas` | `"AND" \| "OR"` | não | Entre as colunas (padrão `OR`) |
| `colunasGrid` | `{ coluna, cabecalho }[]` | sim | Colunas do grid do modal |
| `colunasOrderBy` | `string[]` | não | Ordenação, ex.: `["NM_PESSOA", "DT_X DESC"]` (não use com SELECT terminado em ORDER BY) |
| `colunasAdicionais` | `string[]` | não | Colunas devolvidas sem aparecer no grid (úteis em `mascaraGrid` por função) |
| `colunaCpf` / `colunaCnpj` / `colunaDtNascto` | `string` | não | Ligam os filtros extras CPF / CNPJ / data de nascimento no modal (pesquisam na hora ao sair do filtro) |
| `qtdeLinhas` | `number` | não | 1 a 300 (padrão 100) |
| `filtro` | `string` | não | SQL complementar `" and tp_situacao = 'A' "`, **só com `base: "TABELA"`**. Vale na pesquisa e na busca por código. Sem `;`, comentários, `@`, `:`, DML |

Comportamento-chave: código validado ao **sair** do campo; inexistente = `mensagemNaoExistencia` no campo Descrição + bloqueio de saída; erro de consulta **não** bloqueia; vazio nunca bloqueia; F4 ou `...` abrem o modal; modal começa em branco a cada abertura.

---

## 12. `Carregando` — tela de espera

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `mensagem` | `string` | não | `"Processando, aguarde..."` | Texto abaixo do indicador |
| `logo` | `ReactNode` | não | — | Marca do sistema acima do indicador (imagem/SVG, até 180 px) |
| `mostrarTempo` | `boolean` | não | `true` | Mostra os segundos decorridos |
| `className` | `string` | não | — | Classe extra na camada que cobre a tela |

Renderize só enquanto processa: `{salvando && <Carregando mensagem="Gravando..." />}`. Cobre a página e bloqueia cliques.

---

## 13. Backend Python (`componentes_py`) — só para o `LookUpField`

```python
from componentes_py import ConfiguracaoLookup, criar_roteador_lookup
app.include_router(criar_roteador_lookup(ConfiguracaoLookup(...)), prefix="/api/Lookup")
```

### `ConfiguracaoLookup`

| Parâmetro | Tipo | Obrig. | Padrão | Explicação |
|---|---|---|---|---|
| `obter_conexao` | `(banco: str) -> conexão DB-API` | sim | — | Devolve uma conexão do banco pedido (`"ORACLE"`, `"SQL_SERVER"`, `"POSTGRESQL"`). Chamada 1x por requisição; a biblioteca chama `close()` (com pool, devolva um proxy cujo `close()` devolve ao pool). A biblioteca não cria pool nem lê credenciais |
| `dependencia_autenticacao` | dependência do FastAPI | sim* | `None` | Exige usuário logado; o valor devolvido vai ao gancho `autorizar`. *Obrigatória, a menos que `permitir_anonimo=True` (senão `criar_roteador_lookup` lança `ValueError`) |
| `permitir_anonimo` | `bool` | não | `False` | Libera sem autenticação. **Só exemplos e testes** |
| `tabelas_permitidas` | `Collection[str]` | não | `None` | Lista de tabelas liberadas (sem diferenciar maiúsculas). `None` = sem restrição. Com lista, só `base=TABELA` com nome na lista passa; `base=SELECT` é recusado (403) |
| `autorizar` | `(definicao, usuario) -> bool` | não | `None` | Gancho: `False` recusa a consulta (403) |
| `tipos_erro_banco` | `tuple[type[BaseException], ...]` | não | `None` | Exceções que são erro do banco (viram 400 com a mensagem completa). `None`: detecta pela hierarquia DB-API de qualquer driver |

### Contrato HTTP (`POST {prefixo}/...`, JSON em camelCase)

| Rota | Corpo | Resposta |
|---|---|---|
| `/pesquisa` | `{ definicao, texto?, dtNascto? (yyyy-MM-dd), cpf?, cnpj? }` (ao menos um critério; texto sozinho exige 3+ caracteres) | `{ linhas, limiteAtingido }` |
| `/codigo` | `{ definicao, valor }` | sempre 200: `{ situacao: "ENCONTRADO" \| "NAO_ENCONTRADO" \| "MAIS_DE_UM", codigo, descricao, linha }` |
| `/validacao` | `definicao` | `{ ok, inconsistencias: [{ chave, propriedade, mensagem }] }` (não executa nada) |

Erros: negócio/definição inválida/corpo malformado/erro do banco = **400** `{ "error": "..." }`; recusa por `tabelas_permitidas`/`autorizar` = **403**; inesperado = **500** `{ "error", "errorId" }`.
Drivers (instalar o do banco usado): `oracledb`, `pyodbc`, `psycopg[binary]`. Instale também `uvicorn` para rodar.
