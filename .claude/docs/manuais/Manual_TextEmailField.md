# Manual: TextEmailField

Campo de e-mail. Comportamento comum: ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<TextEmailField
  label="E-mail"
  value={email}                       // string; vazio = ""
  onChange={(r) => setEmail(r.valor)} // CampoResultado<string>
  aceitaInvalido={false}              // padrão
/>
```

| Prop | Tipo | Observação |
|---|---|---|
| `value` | `string` | Mostrado em minúsculas, mesmo que venha em maiúsculas |
| `onChange` | `(r: CampoResultado<string>) => void` | `valor` em minúsculas; vazio = `""` |
| `aceitaInvalido` | `boolean` | Padrão `false`. `true` deixa sair com formato errado (dado legado) |
| demais | — | `CampoBaseProps`. Largura padrão **40** |

## Regras (todas ficam no componente)

- Digitação: tudo em **minúsculas**, sem espaços, só caracteres permitidos em e-mail (letras sem acento, dígitos e `. ! # $ % & ' * + / = ? ^ _ \` { | } ~ -`), **um só `@`** (os seguintes são descartados), no máximo 254 caracteres.
- Ao sair: confere o formato `parte@dominio.ext` (parte local até 64 caracteres, sem ponto no início, no fim ou repetido; domínio com ao menos um ponto, rótulos sem hífen nas pontas).
- Inválido: `E-mail inválido`, campo vermelho, foco volta. Vazio nunca bloqueia.
- `onChange` dispara ao sair do campo ou ao esvaziá-lo.

## Armadilhas

1. E-mail com acento ou caractere fora da lista perde esses caracteres ao digitar/colar.
2. Dado antigo inválido trava o campo ao sair: use `aceitaInvalido` nesses casos.
3. Enter move o foco (não envia o formulário), como nos demais campos.
