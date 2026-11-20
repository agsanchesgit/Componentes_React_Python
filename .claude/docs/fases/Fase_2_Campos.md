# Fase 2 — Campos

## Feito (frontend/src)
| Arquivo | Conteúdo |
|---|---|
| `campos/CampoEntrada.tsx` | base: máscara, validação ao sair, bloqueio de saída, F4, Enter/↓/↑ |
| `campos/DataField.tsx`, `DataHoraField.tsx` | datas com calendário (e painel de hora) |
| `campos/CpfField.tsx`, `CnpjField.tsx` | CPF e CNPJ (numérico e alfanumérico) |
| `campos/MmAaaaField.tsx`, `ComboField.tsx` | competência e combo |
| `campos/Calendario.tsx` | seletor de dia (mês/ano por lista, "Hoje", faixa) |
| `campos/campos.types.ts` | contrato público (idêntico ao do Nexus) |
| `ui/Popover.tsx`, `ui/icones.tsx` | primitivos próprios (sem Radix, sem pacote de ícones) |
| `estilos.css` | estilos dos campos via variáveis `--cmp-*` |
| `exemplos/src/App.tsx` | uma seção por componente, mostrando o resultado do `onChange` |
| `.claude/docs/manuais/` | `Manual_CamposComuns`, `Manual_DataField`, `_DataHoraField`, `_CpfField`, `_CnpjField`, `_MmAaaaField`, `_ComboField` |

`index.ts` agora exporta os 6 campos e todos os tipos públicos.

## Verificado (saída real)
- `npm test`: **80 testes passando** (45 anteriores + 35 de interação com Testing Library/user-event: digitar, sair do campo, F4, Esc, Enter/↑, bloqueio de saída, `onChange` com o resultado correto, faixa de datas, calendário, painel de hora, CPF/CNPJ alfanumérico, competência, combo).
- `npm run typecheck`, `npm run lint` (com `curly` e `react-hooks`) e `npm run build`: limpos. O build gera `dist/index.js` (31 kB, 8,9 kB gzip), `.d.ts` e `estilos.css` (3,9 kB).
- O servidor de exemplos sobe e responde HTTP 200.

## **Não verificado**
- **Visual no navegador**: não abri os exemplos num navegador. Layout, posicionamento do popover e o dia da semana dentro do campo foram escritos a partir do Nexus, mas só os testes em jsdom (que não calcula layout) rodaram. **Recomendo abrir `npm run exemplos` e conferir.**

## Desvios do Nexus
1. **Sem Radix/shadcn/Tailwind/lucide**: o `Popover` é próprio (abre abaixo do botão, fecha com Esc ou clique fora, sem portal) e os ícones são SVG inline. O atributo `data-slot="popover-content"` do Nexus virou `data-cmp-popover`.
2. Ao abrir o painel, o foco vai para o painel; ao escolher um dia/item, o foco volta ao campo (no Nexus isso vinha do Radix).
3. Nomes seguem a regra do usuário (`prc`/`fnc`/`w`); `useState` ficou como `[wX, prcDefinirX]`. Nomes públicos (props, `CampoResultado`...) idênticos ao Nexus.
4. Acrescentei `useId` para o `htmlFor`/`id` quando o consumidor não passa `id`, e `aria-describedby` na mensagem de erro.
5. Dados dos testes: os CPF/CNPJ de exemplo do Nexus (`374287813`, `02849393000145`) **não têm dígito verificador válido** (servem só para testar o preenchimento de zeros); nos testes de campo usei `191` (CPF `000.000.001-91` e CNPJ `00.000.000/0001-91`, ambos válidos).

## Pendências / sugestões
- Popover sem portal pode ser cortado por um ancestral com `overflow: hidden`; se isso aparecer em telas reais, trocar por portal.
- Navegação por teclado dentro do calendário (setas entre dias) não existe no Nexus; ficou igual.
- `npm audit` (ferramentas de desenvolvimento): decisão pendente desde a Fase 0.
