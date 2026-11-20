# Fase 3 — Grid

## Feito (frontend/src/grid)
| Arquivo | Conteúdo |
|---|---|
| `grid.types.ts` | contrato público (idêntico ao do Nexus): `GridColuna`, `GridAcao`, `GridOrdem`, `GridFieldProps`... |
| `grid.ts` | lógica pura: validação, ordenação em várias colunas (estável, `colunaOrdenar`), corte, paginação, detalhe |
| `GridField.tsx` | componente completo |
| `estilos.css` | classes `cmp-grid-*` com as variáveis `--cmp-*` |
| `exemplos/src/App.tsx` | seção do grid (23 linhas, ordenação, detalhe, ação, eventos) |
| `.claude/docs/manuais/Manual_GridField.md` | manual |

`index.ts` exporta `GridField`, `GRID_MAX_LINHAS` e os tipos do grid.

## Verificado (saída real)
- `npm test`: **110 testes passando** (91 anteriores + 19 de interação do `GridField`: ordenação por clique/duplo clique, `ordenavel=false`, paginação, `maxLinhas`, vazio, `onLinhaPosicionada` (sem repetir), `onLinhaAcionada` (duplo clique/Enter/F4, cópia da linha), contexto, `posicionarEm`, `manterOrdem`, detalhe (+/−, `temDetalhe`, `detalheAberto`, Espaço), ações, link por coluna, máscara por função, lógico, `larguraMax`, `corLinha`, PageUp/PageDown). Os 11 casos de `grid.test.ts` do Nexus foram portados.
- `typecheck`, `lint` e `build` limpos (`index.js` 45 kB / 12,5 kB gzip; `estilos.css` 6,8 kB).

## Não verificado
- **Visual no navegador** (layout da tabela, cores do cabeçalho, truncamento com "…", scroll da linha atual). Só jsdom, que não calcula layout.
- **Desempenho com 3000 linhas** não foi medido (a ordenação é memorizada e só a página atual é renderizada, como no Nexus).

## Desvios do Nexus
1. Sem shadcn/Tailwind: `<table>` nativa com classes `cmp-grid-*`; a cor da linha atual é uma variável CSS (no Nexus, `data-state=selected`). Quando `corLinha` define cor, a seleção continua visível pelo `data-selecionada`.
2. `GridAcao.icone` é qualquer `ReactNode` (o Nexus sugeria lucide-react).
3. Nomes seguem a regra (`fncXxx`/`prcXxx`/`wXxx`); nomes do contrato intactos. O Nexus já usava `w` em parte dos refs.
4. Removi do rodapé a classe `text-xs` (agora `font-size: 0.75rem` no CSS); `fonteRodape` continua sobrescrevendo.
5. Importações sem extensão `.ts` (o Nexus rodava `node --test`; aqui é Vitest).

## Sugestões
- Medir 3000 linhas no navegador antes de usar em telas pesadas.
- Navegação por teclado entre células/foco de linha acessível (`role="row"` selecionável) não existe no Nexus; ficou igual.
