# Fase 1 — Núcleo puro

## Feito (frontend/src)
| Arquivo | Conteúdo |
|---|---|
| `formata/formata.ts` | `FNC_FORMATA` + `MIN_DATE` (públicos no `index.ts`) |
| `campos/datas.ts` | `fncEhBissexto`, `fncDiasNoMes`, `fncLerData`, `fncLerDataHora`, `fncVerificarFaixa`, `fncLimiteOuNulo`, formatadores, `ANO_MINIMO`/`ANO_MAXIMO` |
| `campos/documentos.ts` | CPF e CNPJ (inclui o **CNPJ alfanumérico** da Receita), máscaras progressivas e `fncCompletarCpf/Cnpj` |
| `campos/competencia.ts` | máscara, validação e faixa de `AAAAMM` |
| `campos/combo.ts` | domínio, ordem, prefixo e digitação restrita |
| `foco.ts` | `prcMoverFoco` (Enter/↓ = Tab, ↑ = Shift+Tab) |
| `.claude/docs/manuais/Manual_FNC_FORMATA.md` | manual |

Lint configurado: ESLint (`typescript-eslint`) com `curly: all` (chaves obrigatórias) no front; `ruff` no back.

## Verificado (saída real)
- `npm test`: **45 testes passando** (formata 29, campos 12, foco 2, provider 2).
- `npm run typecheck`: sem erros. `npm run lint`: limpo (conferi que a regra `curly` realmente reprova `if (x) return;`). `npm run build`: ok.
- `ruff check` no backend: limpo.
- Exemplos do manual conferidos executando a função.

## Desvios do Nexus
1. **Nomes** seguem a regra do usuário: funções internas `fncXxx`, procedure `prcMoverFoco`, variáveis locais `wXxx`. Os nomes do contrato (`FNC_FORMATA`, `MIN_DATE`, constantes) ficaram como no Nexus.
2. Os helpers (`lerData`, `cpfValido`...) **não** são exportados no `index.ts`; ficam internos até os campos (Fase 2) precisarem. Se quiser expô-los, é só dizer.
3. Testes migraram de `node --test` para **Vitest** (mesmos casos, mesmos valores esperados). Acrescentei testes de `foco` (com `getClientRects` simulado, pois o jsdom não calcula layout), de `fncLimiteOuNulo`, `MIN_DATE` e domínio como array.
4. `foco.ts` ainda não é usado por nenhum componente (entra com `CampoEntrada`, Fase 2).

## Observações / melhorias sugeridas
- Os 45 testes também passam com `TZ=UTC` e `TZ=Asia/Tokyo` (não dependem do fuso da máquina).
- `npm audit` (dev tools) segue como na Fase 0, decisão pendente.
