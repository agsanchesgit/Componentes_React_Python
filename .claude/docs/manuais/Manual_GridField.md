# Manual: GridField

Grid de **consulta** (leitura) com ordenação no cliente, paginação, detalhe expansível, ações e eventos de linha. Não é um campo: não tem `value`/`onChange`. Não precisa do `ComponentesProvider`.

## Assinatura

```tsx
import { GridField, type GridColuna } from "@componentes/react";

const colunas: GridColuna[] = [
  { coluna: "cd_pessoa", tipo: "numero" },
  { coluna: "nm_pessoa", tipo: "texto", larguraMax: 30 },
  { coluna: "dt_nascimento", tipo: "data" },
  { coluna: "nr_cpf", tipo: "texto", mascara: "ZZZ.ZZZ.ZZZ-ZZ" },
];

<GridField
  colunas={colunas}
  cabecalhos={["Código", "Nome", "Nascimento", "CPF"]}   // mesma ordem e tamanho de colunas
  dados={linhas}                                          // array de objetos { coluna: valor }
  linhasPorPagina={20}                                    // obrigatória
  onLinhaAcionada={(linha) => abrir(linha)}
/>
```

## Colunas (`GridColuna`)

| Propriedade | Descrição |
|---|---|
| `coluna` | Nome da propriedade em cada linha (e no JSON dos eventos) |
| `tipo` | `texto`, `numero`, `data`, `dataHora`, `competencia`, `logico` |
| `mascara` | Máscara do `FNC_FORMATA`, fixa ou **função da linha** (ex.: CPF x CNPJ). `data` e `dataHora` têm padrão (`DD/MM/AAAA`, `DD/MM/AAAA HH:MI:SS`) |
| `largura` | Largura mínima em caracteres |
| `larguraMax` | Corta o texto com "…" além desse tamanho; o texto completo aparece ao parar o mouse |
| `colunaOrdenar` | Propriedade usada para ordenar no lugar da própria coluna (exibe `MM/AAAA`, ordena por `AAAAMM`) |
| `alinhamento` | `esquerda`/`centro`/`direita`. Padrão: número à direita; data, dataHora, competência e lógico centralizados; texto à esquerda |
| `aoClicar` | A célula vira link; o clique chama a função com a linha (não aciona a linha). Célula vazia não vira link |

Tipo `logico`: `true`, `"S"`, `"true"` ou `1` mostram **Sim**; o resto, **Não**; `null` fica em branco.
Valores vazios de data (`null`, `""`, `0001-01-01...`, `MIN_DATE`) aparecem em branco/`__/__/____` conforme o `FNC_FORMATA`.

## Props do grid

| Prop | Padrão | Descrição |
|---|---|---|
| `linhasPorPagina` | **obrigatória** | Inteiro > 0. Sem ela (ou com colunas/cabeçalhos de tamanhos diferentes) o grid mostra um erro de programação no lugar da tabela |
| `maxLinhas` | 3000 (teto) | Acima disso corta e avisa no rodapé: `Mostrando as primeiras N de M linhas. Refine a consulta.` |
| `ordenavel` | `true` | `false`: cabeçalho cinza, sem ordenar |
| `manterOrdem` | `false` | Trocar `dados` mantém ordenação e página (padrão: reinicia) |
| `posicionarEm(linha)` | — | Ao trocar `dados`, põe o cursor na 1ª linha que satisfaz (na ordem atual) e vai à página dela; sem isso ou sem achar, 1ª linha |
| `corLinha(linha)` | — | Cor de fundo CSS da linha |
| `fonteRodape` | `0.75rem` | Tamanho da fonte do rodapé |
| `corPrimeira`, `corDemais`, `corForaDaOrdem`, `corNaoOrdenavel` | azuis / cinza | Cores do cabeçalho |
| `className` | — | Classe extra no contêiner |

## Ordenação

- **Clique** no cabeçalho: adiciona a coluna ao fim da ordem (ascendente); se já está na ordem, **alterna asc/desc** mantendo a posição.
- **Duplo clique**: zera a ordem; a coluna vira a primeira, ascendente.
- O cabeçalho mostra `▲`/`▼` e a posição (1, 2, 3...). Cores: 1ª coluna, demais, fora da ordem, não ordenável.
- Texto ordena sem diferenciar maiúscula (pt-BR); número como número; vazio é o menor valor; empate mantém a ordem original (estável). Ordenar não altera o array `dados`.

## Eventos

| Evento | Quando |
|---|---|
| `onLinhaAcionada(linha)` | Duplo clique, **Enter** ou **F4** na linha atual. Recebe uma **cópia** `{coluna: valor}` |
| `onLinhaPosicionada(linha \| null)` | A linha atual mudou (clique, setas, página, ordem ou `dados`). **Não repete** para a mesma linha. `null` quando não há linhas |
| `onLinhaContexto(linha)` | Botão direito (o menu do navegador não abre); também posiciona nela |

## Teclado (com o foco no grid)

`↑`/`↓` linha anterior/próxima · `PageUp`/`PageDown` página · `Enter`/`F4` aciona · `Espaço` abre/fecha o detalhe da linha atual (se houver `detalhe`). O grid é focável (`tabIndex=0`).

## Detalhe expansível

```tsx
<GridField
  ...
  detalhe={(linha) => <SubGrid pessoa={linha.cd_pessoa} />}
  temDetalhe={(linha) => linha.qtd_filhos > 0}   // opcional: desabilita o botão nas demais
  detalheAberto={false}                           // true abre todas ao carregar dados e ao mudar
/>
```

Botão `+`/`−` na primeira coluna; o conteúdo aparece abaixo da linha, identado. O estado aberto é guardado **por referência da linha**: sobrevive a ordenação e paginação. Teclas dentro do detalhe não afetam o grid externo.

## Ações

```tsx
acoes={[{ rotulo: "Editar", icone: <IconeLapis />, aoClicar: (linha) => editar(linha) }]}
```

Coluna **Ações** no fim: não ordena, não entra no JSON dos eventos, e o clique no botão **não** aciona a linha (mas a posiciona). `icone` aceita qualquer `ReactNode`.

## Estilo

Classes `cmp-grid-*` em `estilos.css`, com as variáveis `--cmp-*`. O cabeçalho usa as props `cor*` (não variáveis CSS).

## Armadilhas

1. **`linhasPorPagina` é obrigatória**; esquecer mostra o erro no lugar do grid.
2. O detalhe aberto é por **referência de objeto**: se você recriar os objetos de `dados` a cada render, o grid entende "dados novos" (reinicia ordem, página e linha atual). Memorize (`useMemo`/estado).
3. Com `manterOrdem=false` (padrão) toda troca de `dados` reinicia ordem e página.
4. `onLinhaPosicionada` dispara também na 1ª carga (com a 1ª linha). Trate isso se ele abrir telas.
5. Até 3000 linhas: ordenação é memorizada e só a página atual é renderizada; acima disso o grid corta.
6. Evite passar `colunas`/`cabecalhos` recriados a cada render (a ordenação é recalculada quando `colunas` muda de referência).
