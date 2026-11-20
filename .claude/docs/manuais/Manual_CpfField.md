# Manual: CpfField

Campo de CPF. Comportamento comum: ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<CpfField
  label="CPF"
  value={cpf}                 // number sem máscara; vazio = 0
  onChange={(r) => setCpf(r.valor)}   // CampoResultado<number>
  aceitaInvalido={false}      // padrão
/>
```

| Prop | Tipo | Observação |
|---|---|---|
| `value` | `number` | `374287813` (zeros à esquerda e máscara são só de exibição). Vazio = `0` |
| `onChange` | `(r: CampoResultado<number>) => void` | `valor` = número sem máscara; vazio = `0` |
| `aceitaInvalido` | `boolean` | Padrão `false`. Se `true`, deixa sair com dígito verificador errado |
| demais | — | `CampoBaseProps`. Largura padrão **12** |

## Regras

- Digita só números (letras são ignoradas), até 11 dígitos, com a máscara `000.000.000-00` aparecendo enquanto digita.
- **Ao sair**, completa com zeros à esquerda: `191` → `000.000.001-91`. Só zeros ou vazio = campo vazio (`valor: 0`).
- Confere o **dígito verificador**. Inválido (ou todos os dígitos iguais, como `111.111.111-11`): `CPF com dígito inválido`, o campo fica vermelho e não deixa sair. Com `aceitaInvalido` passa.
- F4 não faz nada.

## Armadilhas

1. O valor é **número**: CPF com zeros à esquerda perde-os (`00000000191` vira `191`). Para exibir com 11 dígitos use o próprio campo ou `FNC_FORMATA(valor, "ZZZ.ZZZ.ZZZ-ZZ")`.
2. `vazio` é `valor === 0`. Um CPF `0` nunca é válido, então não há ambiguidade.
3. Número de CPF maior que `Number.MAX_SAFE_INTEGER` não ocorre (11 dígitos).
