# Manual: TextNumericoField

Campo de valor numérico: inteiro, decimal, moeda ou percentual. Comportamento comum: ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<TextNumericoField
  label="Valor"
  mascara="999.999,99"           // 6 inteiros, 2 decimais, com ponto de milhar
  valorInicial={valor}           // number | null; null = vazio
  onChange={(r) => setValor(r.vazio ? null : r.valor)}   // CampoResultado<number>
  percentual={false}             // true: mostra % no fim do campo
/>
```

| Prop | Tipo | Observação |
|---|---|---|
| `valorInicial` | `number \| null` | `null`/omitido = vazio. Se o projeto trocar o valor, o campo acompanha |
| `onChange` | `(r: CampoResultado<number>) => void` | `valor` = número; vazio = `0` com `vazio: true` |
| `mascara` | `string` | Tokens do `FNC_FORMATA`: `9`/`Z` dígito; última vírgula = decimal; ponto antes dela = milhar |
| `percentual` | `boolean` | Padrão `false`. Mostra `%` dentro do campo, à direita; não faz parte do valor |
| demais | — | `CampoBaseProps`. Largura padrão = tamanho da máscara |

## Regras

- **Alinhado à direita.**
- Digita-se a **parte inteira**. `,` ou `.` passa para a **parte fracionária** (uma só vez; sem casas na máscara, são ignorados). Exemplo com `"99,99"`: `1`, `.`, `4`, `5` → `1,45`.
- Enquanto digita só aparecem dígitos e a vírgula (sem ponto de milhar), para a posição do cursor não saltar.
- Letras e dígitos além da máscara são ignorados.
- **Ao receber o foco, seleciona o valor todo**: o que se digita substitui o valor (para acrescentar, clique no meio do texto ou use as setas).
- **Ao sair**, completa as casas decimais e aplica o milhar: `1234,5` → `1.234,50`; só `,` vira `0,00`.
- `onChange` dispara ao sair do campo ou ao esvaziá-lo, como nos demais campos.
- `valido` é sempre `true`: a máscara já limita o que se digita.

## Armadilhas

1. **Vazio e zero são diferentes**, ao contrário dos outros campos numéricos da biblioteca. Use `r.vazio` e `valorInicial={null}`.
2. Máscara com o caractere `0` ou sem dígito antes da vírgula lança `Error` na montagem.
3. Valor maior que a máscara (`valorInicial` com mais dígitos) é mostrado inteiro; a próxima digitação o corta.
4. `FNC_FORMATA` é para exibição; este campo formata sozinho.
