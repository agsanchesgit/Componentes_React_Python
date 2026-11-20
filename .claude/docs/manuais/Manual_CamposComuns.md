# Manual: comportamento comum dos campos

Vale para `DataField`, `DataHoraField`, `CpfField`, `CnpjField`, `MmAaaaField` e `ComboField` (todos baseados em `CampoEntrada`). Cada manual de componente só descreve o que é próprio dele.

## Props comuns (`CampoBaseProps`)

| Prop | Tipo | Padrão | O que faz |
|---|---|---|---|
| `label` | `string` | — | Rótulo associado ao campo (`<label for>`) |
| `obrigatorio` | `boolean` | `false` | Mostra `*` e preenche `obrigatorioPendente`. **Nunca bloqueia a saída** |
| `enabled` | `"ENABLE" \| "DISABLED" \| "READONLY"` | `"ENABLE"` | Editável, desabilitado ou somente leitura (sem botão/F4) |
| `placeholder` | `string` | do componente | |
| `larguraCampo` | `number` | do componente | Largura em **caracteres** |
| `id` | `string` | gerado | Se omitido, a biblioteca gera um id estável |
| `className` | `string` | — | Classe extra no contêiner |

## Resultado (`CampoResultado<T>`)

`onChange` recebe `{ valor, vazio, valido, obrigatorioPendente }`.

- `valor` **nunca é `null`**: vazio é `MIN_DATE` (datas), `0` (CPF) ou `""` (demais).
- `valido: false` quando o texto digitado é inválido (o campo bloqueia a saída e `valor` vem vazio).
- `obrigatorioPendente = obrigatorio && vazio`. O consumidor trata no submit.

## Teclado e foco

- **Máscara ao digitar**; ao sair (Tab/clique fora) o texto é completado (zeros à esquerda etc.) e validado.
- **Texto inválido bloqueia a saída**: mostra a mensagem ao lado, o campo fica vermelho e o foco volta. **Vazio nunca bloqueia** (exceto `ComboField` sem `permiteVazio`).
- Ir para o botão do campo ou para dentro do painel (calendário/lista) **não** conta como sair.
- **Enter** e **↓** = Tab; **↑** = Shift+Tab; **F4** abre o painel (calendário/lista). Em CPF/CNPJ/competência, F4 não faz nada. **Esc** fecha o painel e devolve o foco ao campo.
- Os botões de painel ficam fora da ordem de Tab (`tabIndex=-1`): só mouse ou F4.

## Componente controlado

O campo mantém o texto em edição internamente e **acompanha o `value`** quando o consumidor o troca por fora. O `onChange` só é chamado quando há resolução (saída do campo, esvaziar o texto ou escolha no painel), não a cada tecla.

## Provider e estilos

Os campos **não** precisam do `ComponentesProvider` (não fazem chamada HTTP). Importe o CSS uma vez:

```tsx
import "@componentes/react/estilos.css";
```

Para mudar o tema, sobrescreva as variáveis `--cmp-*` (`--cmp-cor-fundo`, `--cmp-cor-texto`, `--cmp-cor-borda`, `--cmp-cor-foco`, `--cmp-cor-erro`, `--cmp-raio`, `--cmp-fonte`...). Tema escuro: `<html data-tema="escuro">`.

## Armadilhas

1. O `onChange` não dispara a cada tecla: o valor só chega ao consumidor ao sair do campo.
2. `valido: false` vem com `valor` vazio; não grave esse valor.
3. Para limpar o campo por fora, passe o valor vazio (`MIN_DATE`, `0` ou `""`) em `value`.
